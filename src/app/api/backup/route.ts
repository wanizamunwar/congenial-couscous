import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { handler, requireSession, fail, v, ValidationError, nowIso } from '@/lib/server/api';
import {
  read,
  replaceAll,
  resetToSeed,
  ensureBackupDir,
  pruneBackups,
  BACKUP_DIR,
  UPLOAD_DIR,
  DB_FILE,
  hostInfo,
} from '@/lib/server/db';
import type { DBShape } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FORMAT = 'siteaxis.backup';
const FORMAT_VERSION = 1;

/* ------------------------------- export ---------------------------------- */

export const GET = handler(async (req: Request) => {
  const db = await requireSession();
  const url = new URL(req.url);
  const includeFiles = url.searchParams.get('files') === '1';

  // Never export credential material.
  const { passwordHash, passwordSalt, securityAnswerHash, securityAnswerSalt, recoveryToken, ...safeAccount } = db.account;

  const payload: Record<string, unknown> = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    exportedAt: nowIso(),
    exportedBy: db.account.displayName,
    includesFiles: includeFiles,
    data: { ...db, account: safeAccount },
  };

  if (includeFiles) {
    payload.files = await collectFiles();
  }

  void passwordHash;
  void passwordSalt;
  void securityAnswerHash;
  void securityAnswerSalt;
  void recoveryToken;

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="siteaxis-backup-${stamp}.json"`,
      'Cache-Control': 'no-store',
    },
  });
});

async function collectFiles(): Promise<{ storedName: string; base64: string }[]> {
  const out: { storedName: string; base64: string }[] = [];
  try {
    const names = await fs.readdir(UPLOAD_DIR);
    for (const name of names) {
      const buf = await fs.readFile(path.join(UPLOAD_DIR, name));
      out.push({ storedName: name, base64: buf.toString('base64') });
    }
  } catch {
    /* no upload directory yet */
  }
  return out;
}

/* ---------------------------- list local backups -------------------------- */

export const HEAD = handler(async () => new NextResponse(null, { status: 200 }));

/* ------------------------------- restore --------------------------------- */

export const POST = handler(async (req: Request) => {
  await requireSession();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail('The backup file could not be read as JSON', 400);
  }

  // Preserve a pre-restore snapshot so a bad restore is always reversible.
  await ensureBackupDir();
  const current = await read();
  const preStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  await fs.writeFile(
    path.join(BACKUP_DIR, `pre-restore-${preStamp}.json`),
    JSON.stringify(current, null, 1),
    'utf8',
  );
  await pruneBackups();

  if (body.action === 'reset') {
    const confirm = String(body.confirm ?? '');
    if (confirm !== 'RESET') {
      throw new ValidationError({ confirm: 'Type RESET to confirm erasing all project data' });
    }
    await resetToSeed();
    return NextResponse.json({
      ok: true,
      message: 'Database reset to the original sample data set.',
      host: await hostInfo(),
    });
  }

  const data = body.data as DBShape | undefined;
  if (!data || typeof data !== 'object') {
    throw new ValidationError({ file: 'This file does not contain a SiteAxis backup' });
  }
  if (body.format !== FORMAT) {
    throw new ValidationError({ file: `Unrecognised backup format "${String(body.format ?? 'none')}"` });
  }

  // Structural validation before we touch the live database.
  const required = ['projects', 'tasks', 'siteReports', 'materials', 'expenses', 'documents', 'settings', 'profile'];
  for (const key of required) {
    if (!(key in data)) {
      throw new ValidationError({ file: `Backup is incomplete — the "${key}" section is missing` });
    }
  }
  for (const key of ['projects', 'tasks', 'siteReports', 'materials', 'expenses', 'documents']) {
    if (!Array.isArray((data as Record<string, unknown>)[key])) {
      throw new ValidationError({ file: `Section "${key}" must be a list` });
    }
  }

  const projects = data.projects as { id: string }[];
  const projectIds = new Set(projects.map((p) => p.id));
  const orphans: string[] = [];
  for (const key of ['tasks', 'siteReports', 'materials', 'expenses', 'documents'] as const) {
    for (const row of data[key] as { projectId?: string }[]) {
      if (row.projectId && !projectIds.has(row.projectId)) orphans.push(row.projectId);
    }
  }

  // Credentials never travel in a backup: adopt the *current* account record.
  const account = { ...current.account, failedAttempts: 0, lockedUntil: 0, recoveryToken: '', recoveryExpiry: 0 };

  const next: DBShape = {
    version: v.num(data.version ?? FORMAT_VERSION, 'version', { min: 1, max: 999, int: true }),
    seededAt: nowIso(),
    account,
    profile: { ...current.profile, ...(data.profile ?? {}) },
    settings: { ...current.settings, ...(data.settings ?? {}) },
    projects,
    tasks: data.tasks as DBShape['tasks'],
    siteReports: data.siteReports as DBShape['siteReports'],
    materials: data.materials as DBShape['materials'],
    expenses: data.expenses as DBShape['expenses'],
    documents: data.documents as DBShape['documents'],
    activity: Array.isArray(data.activity) ? (data.activity as DBShape['activity']) : [],
  };

  // Restore any attached files.
  let filesRestored = 0;
  if (Array.isArray(body.files)) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    for (const f of body.files as { storedName?: string; base64?: string }[]) {
      if (!f.storedName || !f.base64) continue;
      const safe = path.basename(String(f.storedName));
      try {
        await fs.writeFile(path.join(UPLOAD_DIR, safe), Buffer.from(String(f.base64), 'base64'));
        filesRestored += 1;
      } catch {
        /* skip unreadable entries */
      }
    }
  }

  await replaceAll(next);

  return NextResponse.json({
    ok: true,
    message: 'Backup restored successfully.',
    counts: {
      projects: next.projects.length,
      tasks: next.tasks.length,
      siteReports: next.siteReports.length,
      materials: next.materials.length,
      expenses: next.expenses.length,
      documents: next.documents.length,
    },
    filesRestored,
    orphans: orphans.length,
    preRestoreBackup: `pre-restore-${preStamp}.json`,
    dbFile: DB_FILE,
  });
});

/** Verify a candidate backup without applying it. */
export const PUT = handler(async (req: Request) => {
  await requireSession();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail('The backup file could not be read as JSON', 400);
  }
  if (body.format !== FORMAT) {
    throw new ValidationError({ file: 'This is not a SiteAxis backup file' });
  }
  const data = body.data as Record<string, unknown> | undefined;
  if (!data) throw new ValidationError({ file: 'No data section found in the backup' });
  return NextResponse.json({
    ok: true,
    exportedAt: body.exportedAt ?? null,
    exportedBy: body.exportedBy ?? null,
    counts: {
      projects: Array.isArray(data.projects) ? data.projects.length : 0,
      tasks: Array.isArray(data.tasks) ? data.tasks.length : 0,
      siteReports: Array.isArray(data.siteReports) ? data.siteReports.length : 0,
      materials: Array.isArray(data.materials) ? data.materials.length : 0,
      expenses: Array.isArray(data.expenses) ? data.expenses.length : 0,
      documents: Array.isArray(data.documents) ? data.documents.length : 0,
    },
    hasFiles: Array.isArray(body.files),
  });
});


