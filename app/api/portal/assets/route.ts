import { NextResponse } from 'next/server';
import { admin, resolveCaller, resolveStaff } from '@/lib/portal-server';
import { loadLibrary } from '@/lib/portal/assets-library';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET — the Assets tab: profile summary, approved docs, approved scripts, finished videos. Staff: ?clientId=. */
export async function GET(req: Request) {
  const db = admin();
  const staffClient = new URL(req.url).searchParams.get('clientId');
  if (staffClient) {
    if (!(await resolveStaff(req, db))) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    const { data: c } = await db.from('portal_clients').select('id, crm_lead_id').eq('id', staffClient).maybeSingle();
    if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ library: await loadLibrary(db, c.id, c.crm_lead_id ?? null) });
  }
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  return NextResponse.json({ library: await loadLibrary(db, caller.clientId, caller.crmLeadId) });
}
