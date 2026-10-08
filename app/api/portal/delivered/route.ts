import { NextResponse } from 'next/server';
import { admin, resolveCaller } from '@/lib/portal-server';
import { deliveredFor } from '@/lib/delivered-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET — everything delivered to the signed-in client, newest first. */
export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  return NextResponse.json({ items: await deliveredFor(db, caller.clientId) });
}
