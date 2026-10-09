import { NextResponse } from 'next/server';
import { admin, resolveCaller, resolveStaff } from '@/lib/portal-server';
import {
  PORTAL_COMMENT_SUFFIX,
  isDoneColumn,
  stageFor,
  type ProductionBoard,
  type ProductionPayload,
  type VslTrack,
} from '@/lib/production';
import { driveFileId, parseChapters, readNote } from '@/lib/chapters';
import { driveConfigured, streamUrl } from '@/lib/portal/drive';
import { approveCut, linkedBoardIds, postClientNote } from '@/lib/production-server';
import { LOOKS_GOOD_NOTE } from '@/lib/portal/potato';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_NOTE = 4000;

interface CrmList { id: string; board_id: string; name: string; sort: number }
interface CrmCard {
  id: string;
  board_id: string;
  list_id: string;
  title: string;
  sort: number;
  due_on: string | null;
  video_url: string | null;
  description: string | null;
}
interface CrmComment { id: string; card_id: string; author_name: string | null; body: string; created_at: string; resolved: boolean | null }


/**
 * GET — the caller's boards, columns and cards, read from crm.* server-side.
 * crm.* has no client policies, so this route is the only way in, and it only
 * ever reads boards linked to the caller in portal_client_boards.
 */
export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const crm = db.schema('crm');
  const boardIds = (await linkedBoardIds(db, caller.clientId)) ?? [];

  const payload: ProductionPayload = { boards: [], vsl: null };

  if (boardIds.length > 0) {
    const [boards, lists, cards] = await Promise.all([
      crm.from('content_boards').select('id, name, board_type').in('id', boardIds).eq('archived', false),
      crm.from('content_lists').select('id, board_id, name, sort').in('board_id', boardIds).eq('archived', false).order('sort'),
      crm
        .from('content_cards')
        .select('id, board_id, list_id, title, sort, due_on, video_url, description')
        .in('board_id', boardIds)
        .eq('archived', false)
        .eq('is_template', false)
        .order('sort'),
    ]);
    if (boards.error || lists.error || cards.error) {
      console.error('[portal] production read failed', boards.error?.message, lists.error?.message, cards.error?.message);
      return NextResponse.json({ error: 'Could not load production.' }, { status: 500 });
    }

    const cardRows = (cards.data ?? []) as CrmCard[];
    const comments = cardRows.length
      ? await crm
          .from('content_comments')
          .select('id, card_id, author_name, body, created_at, resolved')
          .in('card_id', cardRows.map((c) => c.id))
          .order('created_at', { ascending: false })
      : { data: [] as CrmComment[] };

    const listRows = (lists.data ?? []) as CrmList[];
    const commentRows = (comments.data ?? []) as CrmComment[];

    payload.boards = (boards.data ?? []).map((b: { id: string; name: string; board_type: string }): ProductionBoard => {
      const cols = listRows.filter((l) => l.board_id === b.id);
      return {
        id: b.id,
        name: b.name,
        type: b.board_type,
        columns: cols.map((l) => l.name),
        cards: cardRows
          .filter((c) => c.board_id === b.id)
          .map((c) => {
            const col = cols.find((l) => l.id === c.list_id);
            const column = col?.name ?? '';
            return {
              id: c.id,
              title: c.title,
              column,
              stage: stageFor(column),
              step: Math.max(0, cols.findIndex((l) => l.id === c.list_id)),
              steps: cols.length,
              dueOn: c.due_on,
              videoUrl: c.video_url,
              streamUrl: driveConfigured() && driveFileId(c.video_url) ? streamUrl('card', c.id) : null,
              chapters: parseChapters(c.description ?? ''),
              done: isDoneColumn(column),
              comments: commentRows
                .filter((m) => m.card_id === c.id)
                .map((m) => ({
                  id: m.id,
                  author: (m.author_name ?? 'PodLab').replace(PORTAL_COMMENT_SUFFIX, ''),
                  ...(({ t, text }) => ({ t, body: text }))(readNote(m.body)),
                  createdAt: m.created_at,
                  fromClient: (m.author_name ?? '').endsWith(PORTAL_COMMENT_SUFFIX),
                  // An approval, not a fixed note.
                  resolved: Boolean(m.resolved) && m.body.trim() !== LOOKS_GOOD_NOTE,
                  approval: m.body.trim() === LOOKS_GOOD_NOTE,
                })),
            };
          }),
      };
    });
  }

  if (caller.crmLeadId) {
    const { data: lead } = await crm
      .from('leads')
      .select('pipeline, status, scripts_written, scripts_approved_at, filmed_at, footage_delivered_at, booked_for')
      .eq('id', caller.crmLeadId)
      .maybeSingle();
    if (lead && lead.pipeline === 'vsl') {
      const vsl: VslTrack = {
        status: lead.status,
        scriptsWritten: lead.scripts_written ?? 0,
        scriptsApprovedAt: lead.scripts_approved_at,
        filmedAt: lead.filmed_at,
        footageDeliveredAt: lead.footage_delivered_at,
        bookedFor: lead.booked_for,
      };
      payload.vsl = vsl;
    }
  }

  return NextResponse.json(payload);
}

/**
 * POST — a client's revision note on one of their videos. It lands as a comment
 * on the CRM card, where the editors already work, and pings Slack.
 */
export async function POST(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: { cardId?: string; body?: string; timeSeconds?: number | null; intent?: 'looks-good' };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // "Looks good": passes the potato back to the team without reopening the card.
  if (p.intent === 'looks-good') {
    if (!p.cardId) return NextResponse.json({ error: 'cardId required' }, { status: 400 });
    const res = await approveCut(db, caller, p.cardId);
    if (!res.ok) return NextResponse.json({ error: res.message }, { status: res.status });
    return NextResponse.json({ ok: true });
  }

  const body = (p.body ?? '').trim();
  if (!p.cardId || !body) return NextResponse.json({ error: 'Write a note first.' }, { status: 400 });
  if (body.length > MAX_NOTE) return NextResponse.json({ error: 'That note is too long.' }, { status: 400 });
  const t = typeof p.timeSeconds === 'number' && Number.isFinite(p.timeSeconds) && p.timeSeconds >= 0 ? p.timeSeconds : null;

  const res = await postClientNote(db, caller, p.cardId, body, t);
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: res.status });
  const comment = res.comment;

  return NextResponse.json({
    comment: {
      id: comment.id,
      author: caller.displayName,
      ...(({ t: at, text }) => ({ t: at, body: text }))(readNote(comment.body)),
      createdAt: comment.created_at,
      fromClient: true,
      resolved: false,
    },
    reopened: res.reopened,
  });
}

/** PATCH — staff only. Link or unlink a CRM board: { clientId, boardId, remove? }. */
export async function PATCH(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: { clientId?: string; boardId?: string; remove?: boolean };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!p.clientId || !p.boardId) return NextResponse.json({ error: 'clientId and boardId required' }, { status: 400 });

  const { error } = p.remove
    ? await db.from('portal_client_boards').delete().eq('client_id', p.clientId).eq('board_id', p.boardId)
    : await db
        .from('portal_client_boards')
        .upsert({ client_id: p.clientId, board_id: p.boardId, linked_by: staff.email }, { onConflict: 'client_id,board_id', ignoreDuplicates: true });
  if (error) {
    console.error('[portal] production link failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
