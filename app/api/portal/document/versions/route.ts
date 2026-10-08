import { NextResponse } from 'next/server';
import { admin, resolveCaller, resolveStaff, type PortalCaller } from '@/lib/portal-server';
import { announceDocChange, listVersions, restoreVersion } from '@/lib/portal/documents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Clarity Document version history.
 *
 * GET   versions, newest first (metadata only, never the HTML).
 * POST  { versionNo } restore: copies that version forward as a new one.
 *       Nothing is ever deleted, so a restore can itself be undone.
 *
 * The client acts on their own document; staff may pass clientId.
 */

async function who(req: Request, db: ReturnType<typeof admin>, clientIdParam: string | null) {
  const staff = await resolveStaff(req, db);
  if (staff && clientIdParam) {
    const { data } = await db.from('portal_clients').select('id, business_name, crm_lead_id, email').eq('id', clientIdParam).maybeSingle();
    if (!data) return null;
    const caller: PortalCaller = {
      clientId: data.id,
      businessName: data.business_name,
      displayName: staff.name,
      crmLeadId: data.crm_lead_id ?? null,
      email: data.email,
      isStaff: true,
    };
    return { caller, kind: 'staff' as const };
  }
  const caller = await resolveCaller(req, db);
  return caller ? { caller, kind: 'client' as const } : null;
}

export async function GET(req: Request) {
  const db = admin();
  const r = await who(req, db, new URL(req.url).searchParams.get('clientId'));
  if (!r) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const res = await listVersions(db, r.caller.clientId);
  return NextResponse.json(res, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const db = admin();
  let p: { versionNo?: unknown; clientId?: unknown };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const r = await who(req, db, typeof p.clientId === 'string' ? p.clientId : null);
  if (!r) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const versionNo = Number(p.versionNo);
  if (!Number.isInteger(versionNo) || versionNo < 1) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const res = await restoreVersion(db, r.caller.clientId, versionNo, { kind: r.kind, name: r.caller.displayName });
  if (!res.ok) {
    return NextResponse.json({ error: res.message }, { status: res.reason === 'not_ready' ? 409 : res.reason === 'error' ? 400 : 500 });
  }
  await announceDocChange(db, r.caller, `restored to v${versionNo}`, `By ${r.caller.displayName}${r.kind === 'staff' ? ' (staff)' : ''}. Saved as v${res.versionNo}.`);
  return NextResponse.json({ versionNo: res.versionNo, restoredFrom: versionNo, ...(await listVersions(db, r.caller.clientId)) });
}
