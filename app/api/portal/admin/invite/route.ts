import { NextResponse } from 'next/server';
import { admin, resolveStaff } from '@/lib/portal-server';
import { createAccessLink, sendAccessEmail } from '@/lib/portal-invite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST { clientId, email? } — staff only. Creates (or reuses) the client's login,
 * emails them a branded access link from info@, and returns the link too, so
 * staff can text it if the email doesn't arrive.
 */
export async function POST(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: { clientId?: string; email?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!p.clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const { data: client } = await db
    .from('portal_clients')
    .select('id, email, first_name, last_name, business_name, user_id')
    .eq('id', p.clientId)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const email = (p.email ?? client.email ?? '').trim().toLowerCase();
  if (!EMAIL_OK.test(email) || email.endsWith('.invalid')) {
    return NextResponse.json({ error: 'That client needs a real email address first.' }, { status: 400 });
  }

  // Changing the address: it must not belong to another client.
  if (email !== (client.email ?? '').toLowerCase()) {
    const { data: taken } = await db.from('portal_clients').select('id').eq('email', email).neq('id', client.id).maybeSingle();
    if (taken) return NextResponse.json({ error: 'Another client already uses that email.' }, { status: 409 });
  }

  const link = await createAccessLink(db, {
    email,
    firstName: client.first_name,
    lastName: client.last_name,
    forceRecovery: Boolean(client.user_id),
  });
  if (!link) return NextResponse.json({ error: 'Could not create the sign-in link.' }, { status: 500 });

  // One login, one client: refuse to attach a login that already opens someone else's portal.
  const { data: owner } = await db.from('portal_clients').select('id, business_name').eq('user_id', link.userId).neq('id', client.id).maybeSingle();
  if (owner) {
    return NextResponse.json({ error: `That login already opens ${owner.business_name}'s portal.` }, { status: 409 });
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { email, user_id: link.userId };
  let { error } = await db.from('portal_clients').update({ ...update, invited_at: now, invited_by: staff.email }).eq('id', client.id);
  if (error && /invited_/.test(error.message)) {
    // 20261008d not applied yet: still link the login.
    ({ error } = await db.from('portal_clients').update(update).eq('id', client.id));
  }
  if (error) {
    console.error('[portal] invite link-up failed', error.message);
    return NextResponse.json({ error: 'Could not save the invite.' }, { status: 500 });
  }

  const emailed = await sendAccessEmail(link.kind, email, link.url, client.first_name);
  return NextResponse.json({ emailed, kind: link.kind, link: link.url, email });
}
