import { NextResponse } from 'next/server';
import { admin, resolveCaller, resolveStaff } from '@/lib/portal-server';
import { allPotatoes, potatoesFor } from '@/lib/portal/potato-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — Hot Potato.
 * Client: their own potatoes, both sides (what's on them, what's on PodLab).
 * Staff: ?clientId= for one client, or every client's potatoes.
 */
export async function GET(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (staff) {
    const clientId = new URL(req.url).searchParams.get('clientId');
    const potatoes = clientId ? await potatoesFor(db, clientId) : await allPotatoes(db);
    return NextResponse.json({ potatoes, staff: true }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const potatoes = await potatoesFor(db, caller.clientId);
  return NextResponse.json({ potatoes, staff: false }, { headers: { 'Cache-Control': 'no-store' } });
}
