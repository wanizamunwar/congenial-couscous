import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { handler, requireSession, fail, HttpError, ValidationError, nowIso } from '@/lib/server/api';
import { mutate, UPLOAD_DIR } from '@/lib/server/db';
import { validateDocMeta } from '@/lib/server/schemas';
import { DOC_CATEGORIES } from '@/lib/types';
import type { DocRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/zip': '.zip',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/dwg': '.dwg',
  'application/octet-stream': '.bin',
};

const ALLOWED = new Set(Object.keys(EXT_BY_MIME));

function safeName(name: string): string {
  // Strip any path components and dangerous characters.
  const base = path.basename(name).replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 120);
  return base || 'file';
}

export const POST = handler(async (req: Request) => {
  const db = await requireSession();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('Upload must be sent as multipart form data', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    throw new ValidationError({ file: 'Select a file to upload' });
  }
  if (file.size === 0) {
    throw new ValidationError({ file: 'The selected file is empty' });
  }
  if (file.size > MAX_BYTES) {
    throw new ValidationError({ file: 'The file exceeds the 25 MB limit' });
  }
  if (!ALLOWED.has(file.type)) {
    throw new ValidationError({
      file: `File type "${file.type || 'unknown'}" is not permitted. Use PDF, image, Office, ZIP, CSV or DWG.`,
    });
  }

  const projectId = String(form.get('projectId') ?? '');
  if (!db.projects.some((p) => p.id === projectId)) {
    throw new ValidationError({ projectId: 'Select the project this document belongs to' });
  }

  const ext = EXT_BY_MIME[file.type] ?? '.bin';
  const storedName = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const fileName = safeName(file.name);

  const meta = validateDocMeta(
    {
      projectId,
      name: String(form.get('name') ?? '') || fileName.replace(/\.[^.]+$/, ''),
      category: String(form.get('category') ?? ''),
      description: String(form.get('description') ?? ''),
      rev: String(form.get('rev') ?? ''),
      fileName,
      storedName,
    },
    undefined,
    { name: fileName, type: file.type, size: file.size },
  );

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  await mutate((d) => {
    (d.documents as DocRecord[]).unshift(meta);
    d.activity.unshift({
      id: `act_${crypto.randomBytes(6).toString('hex')}`,
      at: nowIso(),
      kind: 'document',
      action: 'create',
      entityId: meta.id,
      summary: `Document uploaded — ${meta.name}`,
      projectId,
      actor: d.account.displayName,
    });
    d.activity = d.activity.slice(0, 400);
  });

  return NextResponse.json({ document: meta }, { status: 201 });
});

/* ------------------------- metadata-only updates ------------------------ */

export const PATCH = handler(async (req: Request) => {
  await requireSession();
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return fail('Invalid request body', 400);
  }
  const id = String(raw.id ?? '');
  const document = await mutate((d) => {
    const doc = d.documents.find((x) => x.id === id);
    if (!doc) throw new HttpError('Document not found', 404);
    if ('name' in raw) doc.name = String(raw.name).trim().slice(0, 160);
    if ('category' in raw) {
      const cat = String(raw.category);
      if (!DOC_CATEGORIES.includes(cat as never)) {
        throw new ValidationError({ category: 'Select a valid category' });
      }
      doc.category = cat as DocRecord['category'];
    }
    if ('rev' in raw) doc.rev = String(raw.rev).trim().slice(0, 20);
    if ('description' in raw) doc.description = String(raw.description).trim().slice(0, 2000);
    return doc;
  });
  return NextResponse.json({ document });
});

/* --------------------------------- delete -------------------------------- */

export const DELETE = handler(async (req: Request) => {
  await requireSession();
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const doc = await mutate((d) => {
    const i = d.documents.findIndex((x) => x.id === id);
    if (i < 0) throw new HttpError('Document not found', 404);
    const [removed] = d.documents.splice(i, 1);
    d.activity.unshift({
      id: `act_${crypto.randomBytes(6).toString('hex')}`,
      at: nowIso(),
      kind: 'document',
      action: 'delete',
      entityId: removed.id,
      summary: `Document deleted — ${removed.name}`,
      projectId: removed.projectId,
      actor: d.account.displayName,
    });
    d.activity = d.activity.slice(0, 400);
    return removed;
  });
  await fs.unlink(path.join(UPLOAD_DIR, path.basename(doc.storedName))).catch(() => undefined);
  return NextResponse.json({ ok: true, id });
});
