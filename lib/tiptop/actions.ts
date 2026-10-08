import type { SupabaseClient } from '@supabase/supabase-js';
import { parseChapters, tagNote } from '@/lib/chapters';
import { notifySlack, logToCrm, type PortalCaller } from '@/lib/portal-server';
import { PORTAL_COMMENT_SUFFIX } from '@/lib/production';
import { recordActivity, trimTo, MAX_NOTE } from '@/lib/portal/server';
import { clock, reanchor, toBlocks, unsentClientNotes } from '@/lib/portal/scripts';

/**
 * TipTop's writes on behalf of the signed-in client. Each one mirrors an
 * existing portal route line for line (cited above each function), so a note
 * sent through TipTop lands in the same table, with the same signature, and
 * pings Slack and the CRM timeline the same way as one sent from the page.
 *
 * The routes themselves are untouched. Every function takes the caller
 * resolved from the bearer token; nothing here accepts a client id.
 */

export type ActionResult<T = Record<string, unknown>> = ({ ok: true } & T) | { ok: false; message: string };

function missingTable(err: { code?: string; message?: string } | null): boolean {
  return Boolean(err && (err.code === 'PGRST205' || err.code === '42P01' || /schema cache|does not exist/i.test(err.message ?? '')));
}

/** "[0:42] note" when a time is given, like the production page writes it. */
export function withTimestamp(note: string, seconds: number | null | undefined): string {
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0 ? `[${clock(seconds)}] ${note}` : note;
}

// ── production video (mirrors POST /api/portal/production) ──────────────

export async function sendVideoNote(
  db: SupabaseClient,
  caller: PortalCaller,
  cardId: string,
  note: string,
  seconds?: number | null,
): Promise<ActionResult<{ title: string; body: string }>> {
  if (!note.trim()) return { ok: false, message: 'Write a note first.' };
  if (note.trim().length > MAX_NOTE) return { ok: false, message: 'That note is too long.' };

  const { data: links, error: linkErr } = await db.from('portal_client_boards').select('board_id').eq('client_id', caller.clientId);
  if (missingTable(linkErr)) return { ok: false, message: 'Video notes are not switched on for your account yet.' };
  const boardIds = (links ?? []).map((r: { board_id: string }) => r.board_id);

  const crm = db.schema('crm');
  const { data: card } = await crm.from('content_cards').select('id, title, board_id, description').eq('id', cardId).maybeSingle();
  if (!card || !boardIds.includes(card.board_id)) return { ok: false, message: 'I could not find that video on your boards.' };

  // Same tag the Production page writes: "[0:42 · Hook] note", chapter from the card description.
  const t = typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
  const body = tagNote(note.trim(), t, parseChapters(card.description ?? ''));

  const { error } = await crm
    .from('content_comments')
    .insert({ card_id: card.id, author_name: caller.displayName + PORTAL_COMMENT_SUFFIX, body });
  if (error) {
    console.error('[tiptop] production note failed', error.message);
    return { ok: false, message: 'Could not send that.' };
  }

  await Promise.all([
    notifySlack(`*Revision note* — ${caller.businessName} on "${card.title}"\n> ${body.slice(0, 500)}`),
    logToCrm(db, caller, `Revision note on "${card.title}": ${body.slice(0, 200)}`),
  ]);
  return { ok: true, title: card.title, body };
}

// ── script (mirrors POST /api/portal/scripts/comments + /scripts/changes) ─

export async function sendScriptRevision(
  db: SupabaseClient,
  caller: PortalCaller,
  scriptId: string,
  note: string,
  quote?: string | null,
): Promise<ActionResult<{ title: string; version: number; sent: number }>> {
  const text = note.trim();
  if (!text) return { ok: false, message: 'Write a note first.' };
  if (text.length > MAX_NOTE) return { ok: false, message: `Keep it under ${MAX_NOTE} characters.` };

  const { data: script, error: sErr } = await db
    .from('portal_scripts')
    .select('id, client_id, title, status, current_version, changes_requested_at')
    .eq('id', scriptId)
    .maybeSingle();
  if (missingTable(sErr)) return { ok: false, message: 'Scripts are not switched on for your account yet.' };
  if (!script || script.client_id !== caller.clientId) return { ok: false, message: 'I could not find that script.' };
  if (['approved', 'shot', 'published'].includes((script.status || '').toLowerCase())) {
    return { ok: false, message: 'That script is approved and locked. Email info@podlablv.com to reopen it.' };
  }

  const { data: version } = await db
    .from('portal_script_versions')
    .select('id, version_no, body')
    .eq('script_id', script.id)
    .eq('version_no', script.current_version)
    .maybeSingle();
  if (!version) return { ok: false, message: 'I could not find the current version of that script.' };

  // A line note: the quote must really be in this version, and anchors to its block.
  let blockIndex: number | null = null;
  let quoted: string | null = quote?.trim() ? quote.trim().slice(0, 240) : null;
  if (quoted) {
    if (!version.body.includes(quoted)) quoted = null;
    else blockIndex = reanchor(quoted, toBlocks(version.body));
    if (blockIndex === null) quoted = null;
  }

  const { error: cErr } = await db.from('portal_script_comments').insert({
    version_id: version.id,
    script_id: script.id,
    client_id: script.client_id,
    block_index: blockIndex,
    quoted_text: quoted,
    body: text,
    author_name: caller.displayName,
    author_kind: 'client',
  });
  if (cErr) {
    console.error('[tiptop] script note failed', cErr.message);
    return { ok: false, message: 'Could not save that note.' };
  }

  // Then "Send notes to PodLab": every unsent note on this version, one brief.
  const { data: notes } = await db
    .from('portal_script_comments')
    .select('id, quoted_text, body, author_kind, status, created_at, parent_id')
    .eq('version_id', version.id)
    .order('created_at');
  const unsent = unsentClientNotes(((notes ?? []) as Array<{ parent_id: string | null; quoted_text: string | null; body: string; author_kind: string; status: string; created_at: string }>).filter((n) => !n.parent_id), script.changes_requested_at);

  const now = new Date().toISOString();
  const { error } = await db
    .from('portal_scripts')
    .update({ status: 'changes requested', changes_requested_at: now, updated_at: now })
    .eq('id', script.id);
  if (error) {
    console.error('[tiptop] script changes update failed', error.message);
    return { ok: false, message: 'Your note is saved on the script, but I could not send it. Press "Send notes to PodLab" on the script page.' };
  }

  const lines = unsent.map((n) => (n.quoted_text ? `On "${trimTo(n.quoted_text, 80)}": ${trimTo(n.body, 300)}` : trimTo(n.body, 300)));
  const count = Math.max(1, unsent.length);
  const label = `${script.title} v${version.version_no}`;
  const shown = lines.slice(0, 12).map((l) => `• ${l}`).join('\n');
  const more = lines.length > 12 ? `\n…and ${lines.length - 12} more in the portal.` : '';

  await Promise.all([
    notifySlack(`*Script revision requested* — ${caller.businessName} (via TipTop)\n*${label}* · ${count} note${count === 1 ? '' : 's'}\n${shown}${more}`),
    logToCrm(db, caller, `Requested script changes in portal on ${label} (${count} note${count === 1 ? '' : 's'}, via TipTop): ${trimTo(lines.join(' | '), 1500)}`),
    recordActivity(db, caller.clientId, 'update', `You sent ${count} note${count === 1 ? '' : 's'} on ${label}`),
  ]);
  return { ok: true, title: script.title, version: version.version_no, sent: count };
}

// ── deliverable (mirrors POST /deliverables/comments + PATCH /deliverables) ─

export async function sendDeliverableRevision(
  db: SupabaseClient,
  caller: PortalCaller,
  assetId: string,
  note: string,
  seconds?: number | null,
): Promise<ActionResult<{ title: string; version: number; sent: number }>> {
  const text = note.trim();
  if (!text) return { ok: false, message: 'Write a note first.' };
  if (text.length > MAX_NOTE) return { ok: false, message: `Keep it under ${MAX_NOTE} characters.` };

  const { data: asset, error: aErr } = await db
    .from('portal_assets')
    .select('id, client_id, title, status, current_version, changes_requested_at')
    .eq('id', assetId)
    .maybeSingle();
  if (aErr && /current_version|changes_requested_at/.test(aErr.message)) {
    return { ok: false, message: 'Deliverable reviews are not switched on yet. I can flag your note for the team instead.' };
  }
  if (!asset || asset.client_id !== caller.clientId) return { ok: false, message: 'I could not find that deliverable.' };
  if ((asset.status || '').toLowerCase() === 'approved') {
    return { ok: false, message: 'That deliverable is approved. Email info@podlablv.com to reopen it.' };
  }

  const { data: version } = await db
    .from('portal_asset_versions')
    .select('id, version_no')
    .eq('asset_id', asset.id)
    .eq('version_no', asset.current_version)
    .maybeSingle();
  if (!version) return { ok: false, message: 'That file has no version to review. I can flag your note for the team instead.' };

  const time = typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 10) / 10 : null;
  const { error: cErr } = await db.from('portal_asset_comments').insert({
    version_id: version.id,
    asset_id: asset.id,
    client_id: asset.client_id,
    time_seconds: time,
    body: text,
    author_name: caller.displayName,
    author_kind: 'client',
  });
  if (cErr) {
    console.error('[tiptop] asset note failed', cErr.message);
    return { ok: false, message: 'Could not save that note.' };
  }

  const { data: notes } = await db
    .from('portal_asset_comments')
    .select('id, time_seconds, body, author_kind, status, created_at')
    .eq('version_id', version.id)
    .order('time_seconds', { ascending: true, nullsFirst: true });
  const unsent = unsentClientNotes((notes ?? []) as Array<{ time_seconds: number | null; body: string; author_kind: string; status: string; created_at: string }>, asset.changes_requested_at);

  const now = new Date().toISOString();
  const { error } = await db
    .from('portal_assets')
    .update({ status: 'changes requested', changes_requested_at: now, updated_at: now })
    .eq('id', asset.id);
  if (error) {
    console.error('[tiptop] asset changes failed', error.message);
    return { ok: false, message: 'Your note is saved, but I could not send it. Press "Send notes" on the deliverable.' };
  }

  const label = `${asset.title} v${version.version_no}`;
  const lines = unsent.map((n) => (n.time_seconds !== null ? `At ${clock(Number(n.time_seconds))}: ` : '') + trimTo(n.body, 300));
  const count = Math.max(1, lines.length);
  const shown = lines.slice(0, 12).map((l) => `• ${l}`).join('\n');
  const more = lines.length > 12 ? `\n…and ${lines.length - 12} more in the portal.` : '';

  await Promise.all([
    notifySlack(`*Deliverable revision requested* — ${caller.businessName} (via TipTop)\n*${label}* · ${count} note${count === 1 ? '' : 's'}\n${shown}${more}`),
    logToCrm(db, caller, `Requested changes in portal on ${label} (${count} note${count === 1 ? '' : 's'}, via TipTop): ${trimTo(lines.join(' | '), 1500)}`),
    recordActivity(db, caller.clientId, 'deliverable', `You sent ${count} note${count === 1 ? '' : 's'} on ${label}`),
  ]);
  return { ok: true, title: asset.title, version: version.version_no, sent: count };
}

// ── action items (mirrors PATCH /api/portal/action-items) ───────────────

export async function setActionItem(
  db: SupabaseClient,
  caller: PortalCaller,
  id: string,
  done: boolean,
): Promise<ActionResult<{ title: string; done: boolean }>> {
  const { data, error } = await db
    .from('portal_action_items')
    .update({ status: done ? 'done' : 'open', completed_at: done ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('client_id', caller.clientId)
    .select('id, title, status')
    .maybeSingle();
  if (error) {
    console.error('[tiptop] action item update failed', error.message);
    return { ok: false, message: 'Could not save that.' };
  }
  if (!data) return { ok: false, message: 'I could not find that action item.' };
  if (done) {
    await Promise.all([
      notifySlack(`*Action item completed* — ${caller.businessName}\n${data.title}`),
      logToCrm(db, caller, `Completed action item: ${data.title}`),
    ]);
  }
  return { ok: true, title: data.title, done };
}

// ── flag for the team ────────────────────────────────────────────────

export async function flagForTeam(
  db: SupabaseClient,
  caller: PortalCaller,
  summary: string,
  urgency: 'normal' | 'high',
): Promise<ActionResult> {
  const text = summary.trim().slice(0, 1500);
  if (!text) return { ok: false, message: 'Nothing to flag.' };
  await Promise.all([
    notifySlack(`*${urgency === 'high' ? 'URGENT · ' : ''}TipTop flag* — ${caller.businessName} (${caller.displayName}, ${caller.email})\n${text}`),
    logToCrm(db, caller, `TipTop flagged for the team${urgency === 'high' ? ' (urgent)' : ''}: ${text}`),
  ]);
  return { ok: true };
}

// ── profile change announcement (shared with /api/portal/profile) ───────

export async function announceProfileChange(
  db: SupabaseClient,
  caller: PortalCaller,
  lines: string,
  pending: string[],
  via: string,
): Promise<void> {
  const tail = pending.length ? `\nNot saved yet (migration pending), please update by hand: ${pending.join(', ')}` : '';
  await Promise.all([
    notifySlack(`*Profile updated ${via}* — ${caller.businessName}\n${lines}${tail}`),
    logToCrm(db, caller, `Profile updated ${via}: ${lines.replace(/\n/g, '; ')}${tail.replace(/\n/g, ' ')}`),
  ]);
}
