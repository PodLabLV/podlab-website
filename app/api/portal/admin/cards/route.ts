import { NextResponse } from 'next/server';
import { admin, resolveStaff } from '@/lib/portal-server';
import { recordActivity } from '@/lib/portal/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface StaffCard {
  id: string;
  title: string;
  board: string;
  column: string;
  hasCut: boolean;
  shared: boolean;
  /** On a board already linked to this client (sharing it would be redundant). */
  onLinkedBoard: boolean;
}

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function describe(db: ReturnType<typeof admin>, clientId: string, rows: Array<{ id: string; title: string; board_id: string; list_id: string; video_url: string | null }>): Promise<StaffCard[]> {
  if (!rows.length) return [];
  const crm = db.schema('crm');
  const [boards, lists, shared, links] = await Promise.all([
    crm.from('content_boards').select('id, name').in('id', [...new Set(rows.map((r) => r.board_id))]),
    crm.from('content_lists').select('id, name').in('id', [...new Set(rows.map((r) => r.list_id))]),
    db.from('portal_client_cards').select('card_id').eq('client_id', clientId),
    db.from('portal_client_boards').select('board_id').eq('client_id', clientId),
  ]);
  const board = new Map((boards.data ?? []).map((b: { id: string; name: string }) => [b.id, b.name]));
  const list = new Map((lists.data ?? []).map((l: { id: string; name: string }) => [l.id, l.name]));
  const sharedIds = new Set((shared.data ?? []).map((s: { card_id: string }) => s.card_id));
  const linked = new Set((links.data ?? []).map((l: { board_id: string }) => l.board_id));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    board: board.get(r.board_id) ?? 'Board',
    column: list.get(r.list_id) ?? '',
    hasCut: Boolean(r.video_url),
    shared: sharedIds.has(r.id),
    onLinkedBoard: linked.has(r.board_id),
  }));
}

/**
 * GET ?clientId=&q= — staff only. The cards shared with this client one by
 * one, plus (with q) cards on any live board whose title matches, to share.
 */
export async function GET(req: Request) {
  const db = admin();
  if (!(await resolveStaff(req, db))) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const u = new URL(req.url);
  const clientId = u.searchParams.get('clientId') ?? '';
  if (!ID.test(clientId)) return NextResponse.json({ error: 'clientId required' }, { status: 400 });
  const q = (u.searchParams.get('q') ?? '').trim().slice(0, 80);

  const { data: sharedRows, error } = await db.from('portal_client_cards').select('card_id').eq('client_id', clientId);
  if (error) return NextResponse.json({ error: /portal_client_cards/.test(error.message) ? 'Run migration 20261016 first.' : 'Could not load that.' }, { status: 503 });
  const crm = db.schema('crm');
  const cols = 'id, title, board_id, list_id, video_url';
  const sharedIds = (sharedRows ?? []).map((r: { card_id: string }) => r.card_id);
  const [shared, found] = await Promise.all([
    sharedIds.length ? crm.from('content_cards').select(cols).in('id', sharedIds) : Promise.resolve({ data: [] }),
    q.length >= 2
      ? crm.from('content_cards').select(cols).ilike('title', `%${q.replace(/[%_]/g, '')}%`).eq('archived', false).eq('is_template', false).order('created_at', { ascending: false }).limit(40)
      : Promise.resolve({ data: [] }),
  ]);
  type Row = { id: string; title: string; board_id: string; list_id: string; video_url: string | null };
  return NextResponse.json({
    shared: await describe(db, clientId, (shared.data ?? []) as Row[]),
    results: await describe(db, clientId, (found.data ?? []) as Row[]),
  });
}

/** POST { clientId, cardIds } shares; { clientId, cardIds, remove: true } unshares. Staff only. */
export async function POST(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  let p: { clientId?: string; cardIds?: string[]; remove?: boolean };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const ids = (p.cardIds ?? []).filter((c) => ID.test(c)).slice(0, 100);
  if (!p.clientId || !ID.test(p.clientId) || !ids.length) return NextResponse.json({ error: 'clientId and cardIds required' }, { status: 400 });

  if (p.remove) {
    const { error } = await db.from('portal_client_cards').delete().eq('client_id', p.clientId).in('card_id', ids);
    if (error) return NextResponse.json({ error: 'Could not remove that.' }, { status: 500 });
    return NextResponse.json({ removed: ids.length });
  }
  // Only real, live cards.
  const { data: real } = await db.schema('crm').from('content_cards').select('id').in('id', ids).eq('archived', false);
  const rows = (real ?? []).map((r: { id: string }) => ({ client_id: p.clientId, card_id: r.id, linked_by: staff.email }));
  if (!rows.length) return NextResponse.json({ error: 'No live cards with those ids.' }, { status: 400 });
  const { error } = await db.from('portal_client_cards').upsert(rows, { onConflict: 'client_id,card_id', ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: /portal_client_cards/.test(error.message) ? 'Run migration 20261016 first.' : 'Could not share that.' }, { status: 500 });
  await recordActivity(db, p.clientId, 'update', `${rows.length} video${rows.length === 1 ? '' : 's'} added to Your Videos`);
  return NextResponse.json({ shared: rows.length });
}
