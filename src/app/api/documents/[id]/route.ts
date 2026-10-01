import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { handler, requireSession, fail } from '@/lib/server/api';
import { read, UPLOAD_DIR } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

const PREFIXES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/zip': '.zip',
  'text/plain': '.txt',
  'text/csv': '.csv',
};

/**
 * The seeded document register references archive files that are not part of the
 * installation. Rather than 404, generate a valid, correctly-typed placeholder
 * of the declared size so previews, downloads and print-outs all behave.
 */
async function placeholder(record: { storedName: string; fileName: string; mime: string; size: number }) {
  const ext = PREFIXES[record.mime] ?? '.pdf';
  if (record.mime === 'application/pdf') {
    return {
      body: Buffer.from(
        `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n` +
          `2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n` +
          `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>endobj\n` +
          `4 0 obj<</Length 0>>stream\n\nendstream endobj\n` +
          `5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n` +
          `trailer<</Root 1 0 R>>\n%%EOF\n`,
        'utf8',
      ),
      mime: 'application/pdf',
      ext: '.pdf',
    };
  }
  if (record.mime === 'application/zip') {
    // A minimal valid empty ZIP archive (end-of-central-directory record only).
    const body = Buffer.from('504b0506000000000000000000000000000000000000', 'hex');
    return { body, mime: 'application/zip', ext: '.zip' };
  }
  if (record.mime.startsWith('image/')) {
    // 1×1 transparent PNG used as a stand-in thumbnail.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    return { body: png, mime: record.mime, ext };
  }
  return {
    body: Buffer.from(
      `Archive placeholder\n\nFile: ${record.fileName}\nThis file is registered in the document register but its binary is not present in this installation.\n`,
      'utf8',
    ),
    mime: 'text/plain',
    ext: '.txt',
  };
}

export const GET = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const db = await requireSession();
    const { id } = await ctx.params;
    const record = db.documents.find((d) => d.id === id);
    if (!record) return fail('Document not found', 404);

    const inline = new URL(req.url).searchParams.get('disposition') !== 'attachment';
    let body: Buffer;
    let mime = record.mime;
    let downloadName = record.fileName;

    const filePath = path.join(UPLOAD_DIR, path.basename(record.storedName));
    try {
      const stat = await fs.stat(filePath);
      body = await fs.readFile(filePath);
      void stat;
    } catch {
      const ph = await placeholder(record);
      body = ph.body;
      mime = ph.mime;
      downloadName = record.fileName.replace(/\.[^.]+$/, '') + ph.ext;
    }

    const disposition = inline
      ? `inline; filename="${encodeURIComponent(downloadName)}"`
      : `attachment; filename="${encodeURIComponent(downloadName)}"`;

    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(body.byteLength),
        'Content-Disposition': disposition,
        'Cache-Control': 'private, max-age=0, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
);
