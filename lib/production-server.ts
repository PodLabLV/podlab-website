import type { SupabaseClient } from '@supabase/supabase-js';
import { notifySlack, logToCrm, type PortalCaller } from '@/lib/portal-server';
import { PORTAL_COMMENT_SUFFIX } from '@/lib/production';
import { parseChapters, tagNote } from '@/lib/chapters';
import { LOOKS_GOOD_NOTE } from '@/lib/portal/potato';

/**
 * A client's revision note on one of their videos, from the Production page or
 * from TipTop. One code path so both behave identically:
 *
 *  1. The note lands on the editor's CRM card, tagged "[0:42 · Hook] …".
 *  2. A note on a card that already passed review (Quality check / Approved)
 *     moves it back to Revising. The CRM won't let a card leave Revising until
 *     every comment is resolved, so the note cannot be skipped.
 *     Posted videos are not moved (they're live); the team is told instead.
 *  3. Slack (#revisions when configured) names the card's editor.
 */

const REOPEN_FROM = new Set(['pending quality control', 'quality control', 'qc', 'approved']);
const LIVE = new Set(['posted', 'published', 'live']);

export type NoteResult =
  | { ok: true; comment: { id: string; body: string; created_at: string }; title: string; reopened: boolean; postedAlready: boolean }
  | { ok: false; status: number; message: string };

export async function linkedBoardIds(db: SupabaseClient, clientId: string): Promise<string[] | null> {
  const { data, error } = await db.from('portal_client_boards').select('board_id').eq('client_id', clientId);
  if (error) return null;
  return (data ?? []).map((r: { board_id: string }) => r.board_id);
}

/**
 * Every card a client may see: the cards on their linked boards, plus cards
 * shared with them one by one (portal_client_cards: a podcast guest's clips on
 * the show's shared boards). Null when the board links can't be read.
 */
export interface CardScope {
  boardIds: string[];
  sharedIds: string[];
}

export async function clientCardScope(db: SupabaseClient, clientId: string): Promise<CardScope | null> {
  const boardIds = await linkedBoardIds(db, clientId);
  if (boardIds === null) return null;
  // Before the migration runs the table doesn't exist: no shared cards, nothing breaks.
  const { data } = await db.from('portal_client_cards').select('card_id').eq('client_id', clientId);
  return { boardIds, sharedIds: (data ?? []).map((r: { card_id: string }) => r.card_id) };
}

export function cardVisible(scope: CardScope, card: { id: string; board_id: string }): boolean {
  return scope.boardIds.includes(card.board_id) || scope.sharedIds.includes(card.id);
}

/**
 * The live cards in scope, with the given columns (must include id and
 * board_id). Two reads (by board, by id), merged, so a shared card that also
 * sits on a linked board appears once.
 */
export async function cardsInScope<T extends { id: string; board_id: string }>(
  db: SupabaseClient,
  scope: CardScope,
  columns: string,
): Promise<{ data: T[]; error: string | null }> {
  const crm = db.schema('crm');
  const [byBoard, byId] = await Promise.all([
    scope.boardIds.length
      ? crm.from('content_cards').select(columns).in('board_id', scope.boardIds).eq('archived', false).eq('is_template', false).order('sort')
      : Promise.resolve({ data: [] as T[], error: null }),
    scope.sharedIds.length
      ? crm.from('content_cards').select(columns).in('id', scope.sharedIds).eq('archived', false).order('sort')
      : Promise.resolve({ data: [] as T[], error: null }),
  ]);
  const error = byBoard.error?.message ?? byId.error?.message ?? null;
  const seen = new Set<string>();
  const data = [...((byBoard.data ?? []) as unknown as T[]), ...((byId.data ?? []) as unknown as T[])].filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  return { data, error };
}

/** Boards that hold any card in scope: the linked ones, plus the boards shared cards sit on. */
export function scopeBoardIds(scope: CardScope, cards: Array<{ board_id: string }>): string[] {
  return [...new Set([...scope.boardIds, ...cards.map((c) => c.board_id)])];
}

interface CardRef { id: string; board_id: string; list_id: string }

/** Sends a card that already passed review back to Revising. Posted cards stay put. */
export async function reopenIfPastReview(
  db: SupabaseClient,
  card: CardRef,
): Promise<{ reopened: boolean; postedAlready: boolean; column: string }> {
  const crm = db.schema('crm');
  const { data: lists } = await crm.from('content_lists').select('id, name').eq('board_id', card.board_id).eq('archived', false);
  const column = (lists ?? []).find((l: { id: string }) => l.id === card.list_id)?.name ?? '';
  const revising = (lists ?? []).find((l: { name: string }) => l.name.trim().toLowerCase() === 'revising');
  const key = column.trim().toLowerCase();
  let reopened = false;
  if (REOPEN_FROM.has(key) && revising) {
    const { error } = await crm.from('content_cards').update({ list_id: revising.id }).eq('id', card.id);
    if (error) console.error('[portal] reopen failed', error.message);
    else reopened = true;
  }
  return { reopened, postedAlready: LIVE.has(key), column };
}

function statusLine(r: { reopened: boolean; postedAlready: boolean; column: string }): string {
  if (r.reopened) return `Moved from ${r.column} back to *Revising*.`;
  if (r.postedAlready) return `:warning: This video is already *${r.column}*. It was not moved; decide whether to re-cut.`;
  return r.column ? `In *${r.column}*.` : '';
}

/**
 * Deliverable notes on a video tied to an editor's card (portal_assets.crm_card_id)
 * are copied onto that card when the client sends them, tagged with the cut's
 * chapters, so the editor works from one place.
 */
export async function mirrorNotesToCard(
  db: SupabaseClient,
  caller: PortalCaller,
  cardId: string,
  label: string,
  notes: Array<{ t: number | null; body: string }>,
  chapters: unknown,
): Promise<void> {
  if (!notes.length) return;
  const crm = db.schema('crm');
  const { data: card } = await crm.from('content_cards').select('id, title, board_id, list_id, editor, assignee_name').eq('id', cardId).maybeSingle();
  if (!card) return;
  const ch = parseChapters(chapters ?? []);
  const { error } = await crm.from('content_comments').insert(
    notes.map((n) => ({
      card_id: card.id,
      author_name: caller.displayName + PORTAL_COMMENT_SUFFIX,
      body: tagNote(`${n.body} (${label})`, n.t, ch),
    })),
  );
  if (error) {
    console.error('[portal] mirror to card failed', error.message);
    return;
  }
  const r = await reopenIfPastReview(db, card);
  const who = card.editor || card.assignee_name;
  const status = statusLine(r);
  await notifySlack(
    `*Client revision* — ${caller.businessName} on "${card.title}"${who ? ` · editor: *${who}*` : ''}\n${notes.length} note${notes.length === 1 ? '' : 's'} from ${label} added to the card.${status ? `\n${status}` : ''}`,
    'revisions',
  );
}

export async function postClientNote(
  db: SupabaseClient,
  caller: PortalCaller,
  cardId: string,
  note: string,
  seconds: number | null,
): Promise<NoteResult> {
  const crm = db.schema('crm');
  const { data: card } = await crm
    .from('content_cards')
    .select('id, title, board_id, list_id, description, editor, assignee_name')
    .eq('id', cardId)
    .maybeSingle();
  const scope = await clientCardScope(db, caller.clientId);
  if (scope === null) return { ok: false, status: 503, message: 'Video notes are not switched on for your account yet.' };
  // A guessed id from someone else's board is indistinguishable from a missing one.
  if (!card || !cardVisible(scope, card)) return { ok: false, status: 404, message: 'Not found' };

  const t = typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
  const { data: comment, error } = await crm
    .from('content_comments')
    .insert({ card_id: card.id, author_name: caller.displayName + PORTAL_COMMENT_SUFFIX, body: tagNote(note, t, parseChapters(card.description ?? '')) })
    .select('id, body, created_at')
    .single();
  if (error || !comment) {
    console.error('[portal] production note failed', error?.message);
    return { ok: false, status: 500, message: 'Could not send that.' };
  }

  const { reopened, postedAlready, column } = await reopenIfPastReview(db, card);

  const who = card.editor || card.assignee_name;
  const status = statusLine({ reopened, postedAlready, column });
  await Promise.all([
    notifySlack(
      `*Client revision* — ${caller.businessName} on "${card.title}"${who ? ` · editor: *${who}*` : ''}\n> ${comment.body.slice(0, 500)}${status ? `\n${status}` : ''}`,
      'revisions',
    ),
    logToCrm(db, caller, `Revision note on "${card.title}": ${comment.body.slice(0, 200)}${reopened ? ' (reopened to Revising)' : ''}`),
  ]);

  return { ok: true, comment, title: card.title, reopened, postedAlready };
}

/**
 * The client is happy with the cut. Leaves a resolved "Looks good" comment on the
 * editor's card (so it never blocks Revising) and pings the team to move it on.
 * This is what passes the Hot Potato back after a cut lands.
 */
export async function approveCut(
  db: SupabaseClient,
  caller: PortalCaller,
  cardId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const crm = db.schema('crm');
  const { data: card } = await crm.from('content_cards').select('id, title, board_id, video_url, editor, assignee_name').eq('id', cardId).maybeSingle();
  const scope = await clientCardScope(db, caller.clientId);
  if (scope === null) return { ok: false, status: 503, message: 'Video notes are not switched on for your account yet.' };
  if (!card || !cardVisible(scope, card)) return { ok: false, status: 404, message: 'Not found' };
  if (!card.video_url) return { ok: false, status: 400, message: 'There is no cut to approve yet.' };

  const { error } = await crm
    .from('content_comments')
    .insert({ card_id: card.id, author_name: caller.displayName + PORTAL_COMMENT_SUFFIX, body: LOOKS_GOOD_NOTE, resolved: true });
  if (error) {
    console.error('[portal] looks-good failed', error.message);
    return { ok: false, status: 500, message: 'Could not send that.' };
  }
  const who = card.editor || card.assignee_name;
  await Promise.all([
    notifySlack(`*Looks good* — ${caller.businessName} approved "${card.title}" in the portal${who ? ` · editor: *${who}*` : ''}. Move it to Approved.`, 'revisions'),
    logToCrm(db, caller, `Approved the cut of "${card.title}" in the portal.`),
  ]);
  return { ok: true };
}
