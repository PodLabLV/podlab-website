import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { admin, resolveCaller } from '@/lib/portal-server';
import { loadStudioDay } from '@/lib/portal/studio-day-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — the caller's ELITE Studio Day: { eligible, booked, startAt, url }.
 * Nothing else from crm.* leaves the server.
 */
export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  try {
    return NextResponse.json(await loadStudioDay(db, caller.clientId));
  } catch (e) {
    reportError('[portal] studio-day: load failed', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ eligible: false, booked: false, startAt: null, url: null });
  }
}
