import { NextResponse } from 'next/server';
import { handler, requireSession, fail } from '@/lib/server/api';
import { snapshot, maybeBackup } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

/** Full application snapshot — one round trip powers the whole client store. */
export const GET = handler(async () => {
  await requireSession();
  await maybeBackup();
  const data = await snapshot();
  return NextResponse.json(data);
});

export const HEAD = handler(async () => new NextResponse(null, { status: 405 }));
