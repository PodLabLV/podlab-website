import { NextResponse } from 'next/server';
import { admin, resolveCaller, resolveStaff } from '@/lib/portal-server';
import { loadContentPlan, sendToEditors } from '@/lib/portal/content-plan-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — the content calendar (from two weeks back). Client: their own.
 * Staff: ?clientId=. TipTop writes the plan; clients change it through her.
 */
export async function GET(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  const clientId = staff ? new URL(req.url).searchParams.get('clientId') : (await resolveCaller(req, db))?.clientId ?? null;
  if (!clientId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const { ready, items } = await loadContentPlan(db, clientId);
  return NextResponse.json({ ready, items, staff: Boolean(staff) }, { headers: { 'Cache-Control': 'no-store' } });
}

/** POST { itemId } — staff: send a recorded piece to the editors as a CRM card. */
export async function POST(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  let p: { itemId?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!p.itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });
  const res = await sendToEditors(db, p.itemId, staff.name);
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: 400 });
  return NextResponse.json(res);
}
