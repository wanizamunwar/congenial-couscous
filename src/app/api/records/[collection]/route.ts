import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { handler, requireSession, fail, nowIso, HttpError } from '@/lib/server/api';
import { mutate, getRecord, remove, UPLOAD_DIR, ensureBackupDir } from '@/lib/server/db';
import {
  validateProject,
  validateTask,
  validateSiteReport,
  validateMaterial,
  validateExpense,
} from '@/lib/server/schemas';
import type {
  Project,
  Task,
  SiteReport,
  Material,
  Expense,
  DBShape,
  ActivityEntry,
} from '@/lib/types';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

const COLLECTION = 'records';

type Kind = 'projects' | 'tasks' | 'site-reports' | 'materials' | 'expenses';

function kindOf(name: string): Kind {
  switch (name) {
    case 'projects':
      return 'projects';
    case 'tasks':
      return 'tasks';
    case 'site-reports':
      return 'site-reports';
    case 'materials':
      return 'materials';
    case 'expenses':
      return 'expenses';
    default:
      throw new HttpError(`Unknown collection "${name}"`, 404);
  }
}

function storeKey(kind: Kind): keyof DBShape {
  return kind === 'site-reports' ? 'siteReports' : (kind as keyof DBShape);
}

/* ------------------------------- list/create ---------------------------- */

export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ collection: string }> }) => {
    const db = await requireSession();
    const { collection } = await ctx.params;
    const kind = kindOf(collection);

    let raw: Record<string, unknown>;
    try {
      raw = await req.json();
    } catch {
      return fail('Invalid request body', 400);
    }

    const record = await mutate((d) => {
      switch (kind) {
        case 'projects': {
          const p = validateProject(raw);
          const dup = d.projects.find((x) => x.code.toLowerCase() === p.code.toLowerCase());
          if (dup) {
            throw new HttpError(`Project ID "${p.code}" is already used by "${dup.name}"`, 409);
          }
          (d.projects as unknown as { id: string }[]).push(p);
          return p;
        }
        case 'tasks': {
          const t = validateTask(raw);
          if (!d.projects.some((p) => p.id === t.projectId)) {
            throw new HttpError('The selected project no longer exists', 422);
          }
          (d.tasks as unknown as { id: string }[]).push(t);
          return t;
        }
        case 'site-reports': {
          const r = validateSiteReport(raw);
          if (!d.projects.some((p) => p.id === r.projectId)) {
            throw new HttpError('The selected project no longer exists', 422);
          }
          (d.siteReports as unknown as { id: string }[]).push(r);
          return r;
        }
        case 'materials': {
          const m = validateMaterial(raw);
          if (!d.projects.some((p) => p.id === m.projectId)) {
            throw new HttpError('The selected project no longer exists', 422);
          }
          (d.materials as unknown as { id: string }[]).push(m);
          return m;
        }
        case 'expenses': {
          const e = validateExpense(raw);
          if (!d.projects.some((p) => p.id === e.projectId)) {
            throw new HttpError('The selected project no longer exists', 422);
          }
          (d.expenses as unknown as { id: string }[]).push(e);
          return e;
        }
        default:
          throw new HttpError('Unsupported collection', 400);
      }
    });

    await logActivity(kind, 'create', record.id, describe(kind, record), projectOf(kind, record));
    return NextResponse.json({ record }, { status: 201 });
  },
);

/* ---------------------------------- read -------------------------------- */

export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ collection: string; id: string }> }) => {
    await requireSession();
    const { collection, id } = await ctx.params;
    const kind = kindOf(collection);
    const record = await getRecord(storeKey(kind) as never, id);
    if (!record) return fail('Record not found', 404);
    return NextResponse.json({ record });
  },
);

/* --------------------------------- update ------------------------------- */

export const PATCH = handler(
  async (req: Request, ctx: { params: Promise<{ collection: string; id: string }> }) => {
    await requireSession();
    const { collection, id } = await ctx.params;
    const kind = kindOf(collection);

    let raw: Record<string, unknown>;
    try {
      raw = await req.json();
    } catch {
      return fail('Invalid request body', 400);
    }

    const existing = (await getRecord(storeKey(kind) as never, id)) as
      | Project
      | Task
      | SiteReport
      | Material
      | Expense
      | null;
    if (!existing) return fail('Record not found', 404);

    // Merge so a partial PATCH never clears untouched fields.
    const merged = { ...(existing as unknown as Record<string, unknown>), ...raw };

    const record = await mutate((d) => {
      let next: Project | Task | SiteReport | Material | Expense;
      switch (kind) {
        case 'projects': {
          const p = validateProject(merged, existing as Project);
          const dup = d.projects.find(
            (x) => x.id !== p.id && x.code.toLowerCase() === p.code.toLowerCase(),
          );
          if (dup) {
            throw new HttpError(`Project ID "${p.code}" is already used by "${dup.name}"`, 409);
          }
          next = p;
          break;
        }
        case 'tasks':
          next = validateTask(merged, existing as Task);
          break;
        case 'site-reports':
          next = validateSiteReport(merged, existing as SiteReport);
          break;
        case 'materials':
          next = validateMaterial(merged, existing as Material);
          break;
        case 'expenses':
          next = validateExpense(merged, existing as Expense);
          break;
        default:
          throw new HttpError('Unsupported', 400);
      }
      const list = d[storeKey(kind)] as unknown as { id: string }[];
      const i = list.findIndex((r) => r.id === next.id);
      if (i >= 0) list[i] = next;
      return next;
    });

    await logActivity(kind, 'update', id, describe(kind, record), projectOf(kind, record));
    return NextResponse.json({ record });
  },
);

/* --------------------------------- delete ------------------------------- */

export const DELETE = handler(
  async (_req: Request, ctx: { params: Promise<{ collection: string; id: string }> }) => {
    await requireSession();
    const { collection, id } = await ctx.params;
    const kind = kindOf(collection);

    const existing = (await getRecord(storeKey(kind) as never, id)) as
      | Project
      | Task
      | SiteReport
      | Material
      | Expense
      | null;
    if (!existing) return fail('Record not found', 404);

    // Referential integrity: a project with children cannot be deleted outright.
    if (kind === 'projects') {
      const db = await requireSession();
      const dependents = [
        ...db.tasks.filter((t) => t.projectId === id).map(() => 'task'),
        ...db.siteReports.filter((r) => r.projectId === id).map(() => 'daily site report'),
        ...db.materials.filter((m) => m.projectId === id).map(() => 'material'),
        ...db.expenses.filter((e) => e.projectId === id).map(() => 'expense'),
        ...db.documents.filter((d) => d.projectId === id).map(() => 'document'),
      ];
      if (dependents.length > 0) {
        return fail(
          `This project still has ${dependents.length} linked record${dependents.length === 1 ? '' : 's'} (${summaryOf(dependents)}). Remove or reassign them first, or mark the project as Cancelled instead.`,
          409,
          { dependents: dependents.length },
        );
      }
    }

    // Remove the files belonging to a deleted site report.
    if (kind === 'site-reports') {
      const rep = existing as SiteReport;
      for (const photo of rep.photos ?? []) {
        await fs
          .unlink(path.join(UPLOAD_DIR, path.basename(photo.file)))
          .catch(() => undefined);
      }
    }

    const done = await remove(storeKey(kind) as never, id);
    if (!done) return fail('Record not found', 404);

    await logActivity(kind, 'delete', id, describe(kind, existing), projectOf(kind, existing));
    return NextResponse.json({ ok: true, id });
  },
);

/* -------------------------------- helpers ------------------------------- */

function summaryOf(items: string[]): string {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts.entries()].map(([k, n]) => `${n} ${k}${n === 1 ? '' : 's'}`).join(', ');
}

function projectOf(kind: Kind, rec: unknown): string | null {
  void kind;
  const p = (rec as { projectId?: string }).projectId;
  return p ?? null;
}

function describe(kind: Kind, rec: unknown): string {
  const r = rec as Record<string, string>;
  switch (kind) {
    case 'projects':
      return `Project “${r.name}” (${r.code})`;
    case 'tasks':
      return `Task “${r.name}”`;
    case 'site-reports':
      return `Daily Site Report ${r.refNo}`;
    case 'materials':
      return `Material “${r.name}”`;
    case 'expenses':
      return `Expense “${r.description}”`;
    default:
      return 'Record';
  }
}

async function logActivity(
  kind: ActivityEntry['kind'],
  action: ActivityEntry['action'],
  entityId: string,
  summary: string,
  projectId: string | null,
) {
  await mutate((d) => {
    d.activity.unshift({
      id: `act_${crypto.randomBytes(6).toString('hex')}`,
      at: nowIso(),
      kind,
      action,
      entityId,
      summary,
      projectId,
      actor: d.account.displayName,
    });
    d.activity = d.activity.slice(0, 400);
  });
  void ensureBackupDir;
}
