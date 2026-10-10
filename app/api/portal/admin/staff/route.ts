import { NextResponse } from 'next/server';
import { admin, resolveStaff } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Who is PodLab staff in the portal (portal_staff). Staff see every client,
 * Manage pages, View as client and the Hot Potato board. They sign in with
 * the same login as the CRM. Staff only.
 *
 * GET → list. POST { email, name } adds; POST { email, remove: true } removes
 * (never yourself, never the last one).
 */
export async function GET(req: Request) {
  const db = admin();
  const me = await resolveStaff(req, db);
  if (!me) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const { data } = await db.from('portal_staff').select('email, name, created_at').order('created_at');
  return NextResponse.json({ staff: data ?? [], me: me.email.toLowerCase() });
}

export async function POST(req: Request) {
  const db = admin();
  const me = await resolveStaff(req, db);
  if (!me) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  let p: { email?: string; name?: string; remove?: boolean };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const email = (p.email ?? '').trim().toLowerCase();
  if (!EMAIL_OK.test(email)) return NextResponse.json({ error: 'Enter a real email address.' }, { status: 400 });

  if (p.remove) {
    if (email === me.email.toLowerCase()) return NextResponse.json({ error: "You can't remove yourself." }, { status: 400 });
    const { count } = await db.from('portal_staff').select('email', { count: 'exact', head: true });
    if ((count ?? 0) <= 1) return NextResponse.json({ error: 'The portal needs at least one staff member.' }, { status: 400 });
    const { error } = await db.from('portal_staff').delete().eq('email', email);
    if (error) return NextResponse.json({ error: 'Could not remove that.' }, { status: 500 });
    return NextResponse.json({ removed: email });
  }

  // A client's login must never become staff: staff see every client.
  const { data: client } = await db.from('portal_clients').select('business_name').ilike('email', email.replace(/[%_]/g, '')).maybeSingle();
  if (client) return NextResponse.json({ error: `That email is ${client.business_name}'s client login.` }, { status: 409 });
  const { error } = await db.from('portal_staff').upsert({ email, name: (p.name ?? '').trim().slice(0, 80) || null }, { onConflict: 'email' });
  if (error) return NextResponse.json({ error: 'Could not add that.' }, { status: 500 });
  return NextResponse.json({ added: email });
}
