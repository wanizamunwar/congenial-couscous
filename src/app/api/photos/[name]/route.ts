import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { handler, requireSession, fail } from '@/lib/server/api';
import { UPLOAD_DIR } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export const GET = handler(
  async (req: Request, ctx: { params: Promise<{ name: string }> }) => {
    await requireSession();
    const { name } = await ctx.params;
    const safe = path.basename(name);
    if (!safe || safe !== name) return fail('Invalid file name', 400);

    const filePath = path.join(UPLOAD_DIR, safe);
    try {
      const buf = await fs.readFile(filePath);
      const ext = path.extname(safe).toLowerCase();
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': TYPES[ext] ?? 'application/octet-stream',
          'Content-Length': String(buf.byteLength),
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch {
      return fail('File not found', 404);
    }
  },
);
