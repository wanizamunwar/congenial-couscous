import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { handler, requireSession, fail, ValidationError } from '@/lib/server/api';
import { mutate, UPLOAD_DIR } from '@/lib/server/db';
import type { SiteReport, PhotoMeta } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_PHOTO = 8 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/* --------------------------------- upload -------------------------------- */

export const POST = handler(async (req: Request) => {
  const db = await requireSession();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('Upload must be sent as multipart form data', 400);
  }

  const reportId = String(form.get('reportId') ?? '');
  const report = db.siteReports.find((r) => r.id === reportId);
  if (!report) {
    throw new ValidationError({ reportId: 'The daily report could not be found' });
  }

  const files = form.getAll('photos').filter((f): f is File => f instanceof File);
  if (!files.length) {
    throw new ValidationError({ photos: 'Select at least one photograph' });
  }

  const added: PhotoMeta[] = [];
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  for (const file of files) {
    const ext = ALLOWED[file.type];
    if (!ext) {
      throw new ValidationError({
        photos: `"${file.name}" is not a supported image. Use JPEG, PNG, WebP or GIF.`,
      });
    }
    if (file.size > MAX_PHOTO) {
      throw new ValidationError({ photos: `"${file.name}" exceeds the 8 MB limit` });
    }
    const storedName = `${reportId}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, storedName), Buffer.from(await file.arrayBuffer()));
    added.push({
      id: `ph_${crypto.randomBytes(6).toString('hex')}`,
      name: file.name.slice(0, 120),
      file: storedName,
      mime: file.type,
      size: file.size,
      caption: '',
    });
  }

  const photos = await mutate((d) => {
    const r = d.siteReports.find((x) => x.id === reportId) as SiteReport;
    r.photos = [...(r.photos ?? []), ...added];
    r.updatedAt = new Date().toISOString();
    return r.photos;
  });

  return NextResponse.json({ photos }, { status: 201 });
});

/* -------------------------- caption / delete photo ---------------------- */

export const PATCH = handler(async (req: Request) => {
  const db = await requireSession();
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return fail('Invalid request body', 400);
  }
  const reportId = String(raw.reportId ?? '');
  const photoId = String(raw.photoId ?? '');
  const photos = await mutate((d) => {
    const r = d.siteReports.find((x) => x.id === reportId);
    if (!r) throw new ValidationError({ report: 'The daily report could not be found' });
    const p = (r.photos ?? []).find((x) => x.id === photoId);
    if (!p) throw new ValidationError({ photo: 'The photograph could not be found' });
    p.caption = String(raw.caption ?? '').slice(0, 200);
    r.updatedAt = new Date().toISOString();
    return r.photos;
  });
  return NextResponse.json({ photos });
});

export const DELETE = handler(async (req: Request) => {
  await requireSession();
  const url = new URL(req.url);
  const reportId = url.searchParams.get('reportId') ?? '';
  const photoId = url.searchParams.get('photoId') ?? '';

  const removed = await mutate((d) => {
    const r = d.siteReports.find((x) => x.id === reportId);
    if (!r) throw new ValidationError({ report: 'The daily report could not be found' });
    const i = (r.photos ?? []).findIndex((x) => x.id === photoId);
    if (i < 0) throw new ValidationError({ photo: 'The photograph could not be found' });
    const [p] = (r.photos ?? []).splice(i, 1);
    r.updatedAt = new Date().toISOString();
    return p;
  });

  await fs.unlink(path.join(UPLOAD_DIR, path.basename(removed.file))).catch(() => undefined);
  return NextResponse.json({ ok: true, photoId });
});
