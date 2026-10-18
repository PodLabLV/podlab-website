import { NextResponse } from 'next/server';
import { admin, resolveStaff } from '@/lib/portal-server';
import { inviteMember, listMembers, MEMBERS_MISSING, removeMember, type TeamMember } from '@/lib/portal/members';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StaffMember = TeamMember;

/** GET ?clientId= — staff only. The client's teammates (extra logins). */
export async function GET(req: Request) {
  const db = admin();
  if (!(await resolveStaff(req, db))) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const clientId = new URL(req.url).searchParams.get('clientId') ?? '';
  if (!ID.test(clientId)) return NextResponse.json({ error: 'clientId required' }, { status: 400 });
  const members = await listMembers(db, clientId);
  if (!members) return NextResponse.json({ error: MEMBERS_MISSING }, { status: 503 });
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
    const r = await removeMember(db, p.clientId, p.memberId);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
    return NextResponse.json({ removed: r.email });
  }

  const r = await inviteMember(db, { clientId: p.clientId, email: p.email, firstName: p.firstName, lastName: p.lastName, role: p.role, invitedBy: staff.email });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ emailed: r.emailed, kind: r.kind, link: r.link, email: r.email });
}
