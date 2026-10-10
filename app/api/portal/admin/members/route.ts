import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { admin, resolveStaff } from '@/lib/portal-server';
import { createAccessLink, sendAccessEmail } from '@/lib/portal-invite';
import { recordActivity } from '@/lib/portal/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MISSING = 'Run migration 20261017 first.';

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: string;
  invitedAt: string | null;
  access: 'active' | 'invited';
}

/** GET ?clientId= — staff only. The client's teammates (extra logins). */
export async function GET(req: Request) {
  const db = admin();
  if (!(await resolveStaff(req, db))) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const clientId = new URL(req.url).searchParams.get('clientId') ?? '';
  if (!ID.test(clientId)) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const { data, error } = await db.from('portal_client_members').select('*').eq('client_id', clientId).order('created_at');
  if (error) return NextResponse.json({ error: MISSING }, { status: 503 });
  const members: StaffMember[] = await Promise.all(
    (data ?? []).map(async (m) => {
      const { data: u } = await db.auth.admin.getUserById(m.user_id);
      return {
        id: m.id,
        email: m.email,
        name: [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email,
        role: m.role,
        invitedAt: m.invited_at,
        access: u?.user?.last_sign_in_at ? 'active' : 'invited',
      };
    }),
  );
  return NextResponse.json({ members });
}

/**
 * POST { clientId, email, firstName, lastName?, role? } invites a teammate (or
 * re-sends their link); { clientId, memberId, remove: true } takes access away.
 * Staff only. A login opens exactly one portal, owner or member.
 */
export async function POST(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  let p: { clientId?: string; email?: string; firstName?: string; lastName?: string; role?: string; memberId?: string; remove?: boolean };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!p.clientId || !ID.test(p.clientId)) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  if (p.remove) {
    if (!p.memberId || !ID.test(p.memberId)) return NextResponse.json({ error: 'memberId required' }, { status: 400 });
    const { data: gone, error } = await db.from('portal_client_members').delete().eq('id', p.memberId).eq('client_id', p.clientId).select('email').maybeSingle();
    if (error) return NextResponse.json({ error: 'Could not remove that.' }, { status: 500 });
    // Their login stays, but opens nothing now; any open session loses access on its next request.
    return NextResponse.json({ removed: gone?.email ?? null });
  }

  const email = (p.email ?? '').trim().toLowerCase();
  const firstName = (p.firstName ?? '').trim().slice(0, 60);
  const lastName = (p.lastName ?? '').trim().slice(0, 60);
  const role = (p.role ?? '').trim().slice(0, 40) || 'Assistant';
  if (!EMAIL_OK.test(email)) return NextResponse.json({ error: 'Enter a real email address.' }, { status: 400 });
  if (!firstName) return NextResponse.json({ error: 'First name required: it labels their notes.' }, { status: 400 });

  const { data: client } = await db.from('portal_clients').select('id, business_name, email').eq('id', p.clientId).maybeSingle();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  if ((client.email ?? '').toLowerCase() === email) return NextResponse.json({ error: 'That is the owner’s email. Use Invite on the client instead.' }, { status: 409 });

  const { data: existing } = await db.from('portal_client_members').select('id, user_id, client_id').eq('email', email).maybeSingle();
  if (existing && existing.client_id !== client.id) return NextResponse.json({ error: 'That email is already a teammate on another client.' }, { status: 409 });

  const link = await createAccessLink(db, { email, firstName, lastName, forceRecovery: Boolean(existing) });
  if (!link) return NextResponse.json({ error: 'Could not create the sign-in link.' }, { status: 500 });

  // One login, one portal: refuse a login that already owns a client.
  const { data: owner } = await db.from('portal_clients').select('business_name').eq('user_id', link.userId).maybeSingle();
  if (owner) return NextResponse.json({ error: `That login already opens ${owner.business_name}'s portal.` }, { status: 409 });

  const row = { client_id: client.id, user_id: link.userId, email, first_name: firstName, last_name: lastName || null, role, invited_at: new Date().toISOString(), invited_by: staff.email };
  const { error } = await db.from('portal_client_members').upsert(row, { onConflict: 'user_id' });
  if (error) {
    reportError('[portal] member invite failed', error.message);
    return NextResponse.json({ error: /portal_client_members/.test(error.message) ? MISSING : 'Could not save the invite.' }, { status: 500 });
  }
  if (!existing) await recordActivity(db, client.id, 'update', `${firstName} (${role}) now has access to this portal`);

  const emailed = await sendAccessEmail(link.kind, email, link.url, firstName, client.business_name);
  return NextResponse.json({ emailed, kind: link.kind, link: link.url, email });
}
