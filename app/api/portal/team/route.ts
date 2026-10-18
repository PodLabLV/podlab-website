import { NextResponse } from 'next/server';
import { admin, resolveCaller } from '@/lib/portal-server';
import { inviteMember, listMembers, MEMBERS_MISSING, removeMember } from '@/lib/portal/members';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Profile → Team, the client's own side of team logins.
 * GET  → { members, canManage }. Everyone on the account can see who has access.
 * POST { email, firstName, lastName?, role? } invites (or re-sends a link);
 *      { memberId, remove: true } removes. Owner only: a teammate can't add or
 *      remove people, and a staff preview can't either (resolveCaller refuses
 *      any POST in view-as).
 */
export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const members = await listMembers(db, caller.clientId);
  if (!members) return NextResponse.json({ error: MEMBERS_MISSING }, { status: 503 });
  return NextResponse.json({ members, canManage: !caller.member }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  if (caller.member) return NextResponse.json({ error: 'Only the account owner can change who has access.' }, { status: 403 });
  let p: { email?: string; firstName?: string; lastName?: string; role?: string; memberId?: string; remove?: boolean };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (p.remove) {
    if (!p.memberId || !ID.test(p.memberId)) return NextResponse.json({ error: 'memberId required' }, { status: 400 });
    const r = await removeMember(db, caller.clientId, p.memberId);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
    return NextResponse.json({ removed: r.email });
  }

  const r = await inviteMember(db, {
    clientId: caller.clientId,
    email: p.email,
    firstName: p.firstName,
    lastName: p.lastName,
    role: p.role,
    invitedBy: `${caller.displayName} (owner)`,
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  // The link only goes back when the email failed AND it's a brand-new login
  // this invite just created. A recovery link would let the owner set the
  // password on someone's existing account, so that one only ever goes by email.
  return NextResponse.json({ emailed: r.emailed, email: r.email, link: !r.emailed && r.kind === 'invite' ? r.link : undefined });
}
