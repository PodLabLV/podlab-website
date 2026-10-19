import { NextResponse } from 'next/server';
import { reportError } from '@/lib/alerts';
import { admin, resolveCaller } from '@/lib/portal-server';
import { loadFeed, type FeedOwner } from '@/lib/portal/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The hot potato (top-right notifications).
 * GET  → { ready, done, earlier, waiting, count }
 *        done    = unread "what we did" rows
 *        earlier = "what we did" rows read in the last 7 days
 *        waiting = open "waiting on you" rows (stay until resolved)
 *        count   = done + waiting, the number on the button
 * POST { action: 'read', ids?: string[] } marks rows read (all unread when ids is omitted).
 */
/**
 * Whose bell this is: the client account, or — for a login with no client
 * record (a Beaker who only refers) — the login itself. Never a staff preview
 * of someone else for writes (resolveCaller refuses those).
 */
async function feedOwner(req: Request, db: ReturnType<typeof admin>): Promise<FeedOwner | null> {
  const caller = await resolveCaller(req, db);
  if (caller) return { column: 'client_id', id: caller.clientId };
  if (req.headers.get('x-portal-view-as')) return null;
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data?.user ? { column: 'user_id', id: data.user.id } : null;
}

export async function GET(req: Request) {
  const db = admin();
  const owner = await feedOwner(req, db);
  if (!owner) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const feed = await loadFeed(db, owner);
  return NextResponse.json(
    { ...feed, count: feed.done.length + feed.waiting.length },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: Request) {
  const db = admin();
  // resolveCaller refuses any POST in a staff "view as client" preview, so a preview never marks a client's rows read.
  const owner = await feedOwner(req, db);
  if (!owner) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  let p: { action?: string; ids?: unknown };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (p.action !== 'read') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  const ids = Array.isArray(p.ids) ? p.ids.filter((x): x is string => typeof x === 'string' && ID.test(x)).slice(0, 100) : null;

  let q = db.from('portal_notifications').update({ read_at: new Date().toISOString() }).eq(owner.column, owner.id).is('read_at', null);
  if (ids) {
    if (!ids.length) return NextResponse.json({ ok: true, read: 0 });
    q = q.in('id', ids);
  }
  const { data, error } = await q.select('id');
  if (error) {
    reportError('[portal] notifications mark-read failed', error.message);
    return NextResponse.json({ error: 'Could not update that.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, read: (data ?? []).length });
}
