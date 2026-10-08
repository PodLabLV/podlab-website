import { NextResponse } from 'next/server';
import { admin, resolveCaller, resolveStaff, type PortalCaller } from '@/lib/portal-server';
import { describeChange, loadProfile, saveProfile, validateProfilePatch } from '@/lib/portal/profile';
import { announceProfileChange } from '@/lib/tiptop/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Profile.
 *
 * GET   the caller's own profile; staff may pass ?clientId= to read any client.
 * PATCH { first_name?, last_name?, phone?, business_name?, website?, timezone? }
 *       on the caller's own row; staff may include clientId to edit any client.
 *
 * Staff is decided server-side (portal_staff), never by the browser, and a
 * client can only ever reach their own row: the id comes from the token.
 * The login email is not editable here.
 */

async function who(req: Request, db: ReturnType<typeof admin>, clientIdParam: string | null) {
  const staff = await resolveStaff(req, db);
  if (staff && clientIdParam) {
    const { data } = await db
      .from('portal_clients')
      .select('id, business_name, crm_lead_id, email')
      .eq('id', clientIdParam)
      .maybeSingle();
    if (!data) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
    const caller: PortalCaller = {
      clientId: data.id,
      businessName: data.business_name,
      displayName: staff.name,
      crmLeadId: data.crm_lead_id ?? null,
      email: data.email,
      isStaff: true,
    };
    return { caller, via: `by ${staff.name} (staff)` };
  }
  const caller = await resolveCaller(req, db);
  if (!caller) return { error: NextResponse.json({ error: 'Not authorized' }, { status: 401 }) };
  return { caller, via: 'in portal' };
}

export async function GET(req: Request) {
  const db = admin();
  const r = await who(req, db, new URL(req.url).searchParams.get('clientId'));
  if ('error' in r) return r.error;
  const profile = await loadProfile(db, r.caller.clientId);
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ profile }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request) {
  const db = admin();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const r = await who(req, db, typeof body.clientId === 'string' ? body.clientId : null);
  if ('error' in r) return r.error;

  const { clientId: _ignored, ...fields } = body;
  void _ignored;
  const check = validateProfilePatch(fields);
  if (!check.ok) return NextResponse.json({ error: 'Check the highlighted fields.', errors: check.errors }, { status: 400 });

  const res = await saveProfile(db, r.caller.clientId, check.patch);
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: 500 });

  const changed = [...res.saved, ...res.pending];
  if (changed.length) {
    await announceProfileChange(db, r.caller, describeChange(check.patch, res.before, changed), res.pending, r.via);
  }
  return NextResponse.json({ profile: await loadProfile(db, r.caller.clientId), saved: res.saved, pending: res.pending });
}
