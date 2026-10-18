import type { SupabaseClient } from '@supabase/supabase-js';
import { reportError } from '@/lib/alerts';
import { logToCrm, notifySlack, type PortalCaller } from '@/lib/portal-server';
import { recordActivity } from '@/lib/portal/server';
import { SITE_URL } from '@/lib/portal-email';
import { notify } from '@/lib/portal/notify';
import {
  LEDGER_REF,
  MAX_EXTRA_ROUNDS,
  PACK_EXPIRY_DAYS,
  RUSH_HOURS,
  dueDate,
  editCost,
  editTypeFor,
  type EditType,
} from '@/lib/portal/credits';
import { settleExpiry } from '@/lib/portal/wallet-server';
import { createFolder, driveConfigured, driveFolderUrl, folderIdFromUrl, footageFolder, listFiles } from '@/lib/portal/drive';
import { formatBytes } from '@/lib/portal/brand';

/**
 * "Submit footage for editing" (Projects tab). The order of the writes is the
 * point of this file:
 *
 *   1. claim the submission (draft → submitted), so a double click can't run twice
 *   2. debit the credits (portal_credit_spend: locked balance check + ledger row,
 *      ref "submission:<id>"; insufficient → back to draft, nothing spent)
 *   3. card on their CRM content board, in Editing (board created and linked if
 *      they have none, the same way the CRM's "New board" does)
 *   4. tell the team (Slack + CRM timeline) and the client (a 'done' notification)
 *
 * If 3 fails after 2, a reversing ledger row (ref "refund:submission:<id>")
 * returns the credits and the submission is marked failed. Step 4 is best
 * effort and never refunds: the edit is on the board.
 */

export const MAX_LINKS = 10;
export const MAX_TITLE = 120;
export const MAX_NOTES = 4000;

export interface SubmitInput {
  submissionId?: string | null;
  editType?: string;
  rush?: boolean;
  extraRounds?: number;
  title?: string;
  notes?: string;
  links?: unknown;
}

export type SubmitResult =
  | { ok: true; submissionId: string; cost: number; balance: number | null; cardId: string | null; already?: boolean }
  | { ok: false; status: number; message: string; code?: 'insufficient' | 'invalid' | 'failed' };

/** https links only, deduped, at most MAX_LINKS. Null when any of them isn't a link. */
export function cleanLinks(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(/\s+/);
  const out: string[] = [];
  for (const v of list) {
    const s = String(v ?? '').trim();
    if (!s) continue;
    let u: URL;
    try {
      u = new URL(s);
    } catch {
      return null;
    }
    if (u.protocol !== 'https:') return null;
    if (!out.includes(u.toString())) out.push(u.toString());
  }
  return out.length > MAX_LINKS ? null : out;
}

/** The client's PodLab OS folder, when Drive uploads are on and the folder is linked. */
export async function driveRootOf(db: SupabaseClient, clientId: string): Promise<string | null> {
  if (!driveConfigured()) return null;
  const { data } = await db.from('portal_clients').select('drive_folder_url').eq('id', clientId).maybeSingle();
  return folderIdFromUrl(data?.drive_folder_url);
}

export async function walletSum(db: SupabaseClient, clientId: string): Promise<number> {
  const { data } = await db.from('portal_credit_balance').select('balance').eq('client_id', clientId).maybeSingle();
  return (data as { balance?: number } | null)?.balance ?? 0;
}

/**
 * A draft submission with its own Drive folder, so uploads have somewhere to
 * land before the client presses Submit. Refuses up front when the wallet
 * can't cover the edit, so nobody uploads 4 GB for nothing.
 */
export async function createDraft(
  db: SupabaseClient,
  caller: PortalCaller,
  p: { title?: string; cost?: number | null; withFolder: boolean },
): Promise<{ ok: true; id: string; uploads: boolean } | { ok: false; status: number; message: string }> {
  if (p.cost) {
    await settleExpiry(db, caller.clientId);
    const balance = await walletSum(db, caller.clientId);
    if (balance < p.cost) return { ok: false, status: 402, message: `This edit is ${p.cost} credit${p.cost === 1 ? '' : 's'} and you have ${balance}. Buy credits first.` };
  }
  const title = (p.title ?? '').trim().slice(0, MAX_TITLE) || null;
  let folderId: string | null = null;
  if (p.withFolder) {
    const root = await driveRootOf(db, caller.clientId);
    if (root) {
      try {
        const parent = await footageFolder(root);
        const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ').replace(':', '.');
        folderId = await createFolder(parent, `${stamp} ${title ?? 'Footage for editing'}`);
      } catch (err) {
        reportError('[portal] footage folder failed', err instanceof Error ? err.message : err);
      }
    }
  }
  const { data, error } = await db
    .from('portal_submissions')
    .insert({ client_id: caller.clientId, status: 'draft', title, drive_folder_id: folderId, submitted_by: caller.displayName })
    .select('id')
    .single();
  if (error || !data) {
    reportError('[portal] submission draft failed', error?.message);
    return { ok: false, status: /portal_submissions/.test(error?.message ?? '') ? 503 : 500, message: 'Could not start that. Try again.' };
  }
  return { ok: true, id: data.id, uploads: Boolean(folderId) };
}

/** The draft's Drive folder, if it belongs to this client and is still a draft. */
export async function draftFolder(db: SupabaseClient, clientId: string, submissionId: string): Promise<string | null> {
  const { data } = await db
    .from('portal_submissions')
    .select('drive_folder_id, status')
    .eq('id', submissionId)
    .eq('client_id', clientId)
    .maybeSingle();
  return data && data.status === 'draft' ? data.drive_folder_id : null;
}

interface Board { id: string; name: string; board_type: string; archived: boolean }

/**
 * The board new edits go on: their linked general board (the newest), else a
 * new one made with crm.content_board_create (the CRM's own "New board" path,
 * which seeds the columns in one transaction), tied to their deal and linked
 * to their portal.
 */
export async function editingBoard(db: SupabaseClient, caller: PortalCaller): Promise<{ boardId: string; listId: string; created: boolean }> {
  const crm = db.schema('crm');
  const { data: links, error: lErr } = await db.from('portal_client_boards').select('board_id, created_at').eq('client_id', caller.clientId);
  if (lErr) throw new Error(`board links: ${lErr.message}`);
  let boardId: string | null = null;
  let created = false;
  if (links?.length) {
    const { data: boards } = await crm.from('content_boards').select('id, name, board_type, archived').in('id', links.map((l: { board_id: string }) => l.board_id));
    const live = ((boards ?? []) as Board[]).filter((b) => !b.archived);
    const order = new Map(links.map((l: { board_id: string; created_at: string | null }) => [l.board_id, l.created_at ?? '']));
    const pick = live
      .filter((b) => b.board_type === 'general' || b.board_type === 'video')
      .sort((a, b) => (order.get(b.id) ?? '').localeCompare(order.get(a.id) ?? ''))[0];
    boardId = pick?.id ?? null;
  }
  if (!boardId) {
    const { data: id, error } = await crm.rpc('content_board_create', { p_name: caller.businessName.slice(0, 80) || 'Client edits', p_cover: 'slate', p_by: 'Portal (footage submission)' });
    if (error || typeof id !== 'string') throw new Error(`board create: ${error?.message ?? 'no id'}`);
    boardId = id;
    created = true;
    if (caller.crmLeadId) {
      const { error: pErr } = await crm
        .from('content_boards')
        .update({ lead_id: caller.crmLeadId, stage: 'editing', stage_changed_at: new Date().toISOString(), stage_changed_by: 'Portal (footage submission)' })
        .eq('id', boardId);
      if (pErr) reportError('[portal] new board lead link failed', pErr.message);
    }
    const { error: linkErr } = await db
      .from('portal_client_boards')
      .upsert({ client_id: caller.clientId, board_id: boardId, linked_by: 'portal (footage submission)' }, { onConflict: 'client_id,board_id', ignoreDuplicates: true });
    if (linkErr) throw new Error(`board link: ${linkErr.message}`);
  }
  const { data: lists, error: listErr } = await crm.from('content_lists').select('id, name, sort, role').eq('board_id', boardId).eq('archived', false).order('sort');
  if (listErr) throw new Error(`lists: ${listErr.message}`);
  const steps = ((lists ?? []) as Array<{ id: string; name: string; role: string | null }>).filter((l) => (l.role ?? 'step') === 'step');
  const editing = steps.find((l) => /^editing$/i.test(l.name.trim())) ?? steps.find((l) => /edit/i.test(l.name)) ?? steps[0];
  if (!editing) throw new Error('board has no columns');
  return { boardId, listId: editing.id, created };
}

export function cardDescription(p: {
  by: string;
  business: string;
  typeLabel: string;
  cost: number;
  rush: boolean;
  extraRounds: number;
  due: string | null;
  folderUrl: string | null;
  files: Array<{ name: string; size: number | null }>;
  links: string[];
  notes: string;
  submissionId: string;
}): string {
  // Lines start with words, so the portal never reads them as video chapters.
  const extras = [p.rush ? `Rush (${RUSH_HOURS}h)` : null, p.extraRounds ? `+${p.extraRounds} revision round${p.extraRounds === 1 ? '' : 's'}` : null].filter(Boolean);
  const out = [
    `Submitted in the client portal by ${p.by} (${p.business}).`,
    `Edit: ${p.typeLabel}${extras.length ? ` · ${extras.join(' · ')}` : ''} · ${p.cost} credit${p.cost === 1 ? '' : 's'} paid`,
    p.due ? `Due: ${p.due}` : null,
    p.folderUrl ? `Footage folder: ${p.folderUrl}` : null,
    ...p.files.slice(0, 30).map((f) => `File: ${f.name}${f.size ? ` (${formatBytes(f.size)})` : ''}`),
    ...p.links.map((l) => `Footage link: ${l}`),
    p.notes ? 'Client notes:' : null,
    ...(p.notes ? p.notes.split(/\r?\n/).map((l) => `- ${l}`) : []),
    `Portal submission: ${p.submissionId}`,
  ];
  return out.filter((l): l is string => l !== null).join('\n');
}

export async function refundSubmission(db: SupabaseClient, clientId: string, submissionId: string, cost: number, why: string): Promise<void> {
  const exp = new Date();
  exp.setUTCDate(exp.getUTCDate() + PACK_EXPIRY_DAYS);
  const { error } = await db.from('portal_credit_ledger').upsert(
    {
      client_id: clientId,
      delta: cost,
      reason: 'refund',
      ref: LEDGER_REF.refund(submissionId),
      expires_on: exp.toISOString().slice(0, 10),
      note: 'Credits returned: the edit could not be started',
      created_by: 'portal (auto refund)',
    },
    { onConflict: 'ref', ignoreDuplicates: true },
  );
  if (error) reportError('[portal] CREDIT REFUND FAILED — fix by hand', submissionId, cost, error.message);
  await db.from('portal_submissions').update({ status: 'failed', error: why.slice(0, 500), updated_at: new Date().toISOString() }).eq('id', submissionId);
}

export async function submitFootage(db: SupabaseClient, caller: PortalCaller, p: SubmitInput): Promise<SubmitResult> {
  // ── validate
  const type = editTypeFor(p.editType);
  const extraRounds = Math.trunc(Number(p.extraRounds ?? 0));
  const rush = p.rush === true;
  const cost = type ? editCost({ type: type.key as EditType, rush, extraRounds }) : null;
  if (!type || cost === null) return { ok: false, status: 400, code: 'invalid', message: `Pick an edit type (and at most ${MAX_EXTRA_ROUNDS} extra rounds).` };
  const title = (p.title ?? '').trim().slice(0, MAX_TITLE);
  if (!title) return { ok: false, status: 400, code: 'invalid', message: 'Give this edit a name, like "October podcast clip".' };
  const notes = (p.notes ?? '').trim();
  if (notes.length > MAX_NOTES) return { ok: false, status: 400, code: 'invalid', message: 'Those notes are too long.' };
  const links = cleanLinks(p.links);
  if (links === null) return { ok: false, status: 400, code: 'invalid', message: `Paste full links starting with https:// (up to ${MAX_LINKS}).` };

  // ── the submission row (a draft from the upload step, or a new one for link-only)
  let submissionId = p.submissionId ?? null;
  if (submissionId) {
    const { data: row } = await db.from('portal_submissions').select('id, status, cost, card_id').eq('id', submissionId).eq('client_id', caller.clientId).maybeSingle();
    if (!row) return { ok: false, status: 404, code: 'invalid', message: 'Not found' };
    if (row.status === 'submitted') return { ok: true, submissionId, cost: row.cost ?? cost, balance: null, cardId: row.card_id, already: true };
    if (row.status === 'failed') return { ok: false, status: 409, code: 'failed', message: 'That submission already failed and your credits were returned. Start a new one.' };
  } else {
    const d = await createDraft(db, caller, { title, withFolder: false });
    if (!d.ok) return { ok: false, status: d.status, message: d.message };
    submissionId = d.id;
  }

  // What actually landed in their Drive folder.
  const { data: sub } = await db.from('portal_submissions').select('drive_folder_id').eq('id', submissionId).maybeSingle();
  const folderId = sub?.drive_folder_id ?? null;
  let files: Array<{ id: string; name: string; size: number | null }> = [];
  if (folderId) {
    try {
      files = (await listFiles(folderId)).map((f) => ({ id: f.id, name: f.name, size: f.size ? Number(f.size) : null }));
    } catch (err) {
      reportError('[portal] footage list failed', err instanceof Error ? err.message : err);
    }
  }
  if (!files.length && !links.length) return { ok: false, status: 400, code: 'invalid', message: 'Upload your footage or paste a link to it first.' };

  const due = dueDate({ type: type.key, rush });
  // ── 1. claim it: only one request gets past here
  const { data: claimed, error: claimErr } = await db
    .from('portal_submissions')
    .update({
      status: 'submitted',
      title,
      notes: notes || null,
      edit_type: type.key,
      rush,
      extra_rounds: extraRounds,
      cost,
      links,
      files,
      due_on: due,
      submitted_by: caller.displayName,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .eq('client_id', caller.clientId)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  if (claimErr) {
    reportError('[portal] submission claim failed', claimErr.message);
    return { ok: false, status: 500, code: 'failed', message: 'Could not send that. Nothing was charged.' };
  }
  if (!claimed) return { ok: true, submissionId, cost, balance: null, cardId: null, already: true };

  // ── 2. debit
  await settleExpiry(db, caller.clientId);
  const { data: balance, error: spendErr } = await db.rpc('portal_credit_spend', {
    p_client: caller.clientId,
    p_cost: cost,
    p_ref: LEDGER_REF.submission(submissionId),
    p_note: `${type.label}: ${title}`,
    p_by: caller.displayName,
  });
  if (spendErr) {
    await db.from('portal_submissions').update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', submissionId);
    if (/insufficient_credits/.test(spendErr.message)) {
      const have = await walletSum(db, caller.clientId);
      return { ok: false, status: 402, code: 'insufficient', message: `This edit is ${cost} credit${cost === 1 ? '' : 's'} and you have ${have}. Buy credits, then send it again.` };
    }
    reportError('[portal] credit spend failed', spendErr.message);
    return { ok: false, status: 500, code: 'failed', message: 'Could not send that. Nothing was charged.' };
  }

  // ── 3. the editor's card
  let cardId: string | null = null;
  let boardId: string | null = null;
  try {
    const target = await editingBoard(db, caller);
    boardId = target.boardId;
    const crm = db.schema('crm');
    const { data: last } = await crm.from('content_cards').select('sort').eq('list_id', target.listId).order('sort', { ascending: false }).limit(1).maybeSingle();
    const { data: card, error: cardErr } = await crm
      .from('content_cards')
      .insert({
        board_id: target.boardId,
        list_id: target.listId,
        title: `${title}${rush ? ' (RUSH)' : ''}`.slice(0, 200),
        description: cardDescription({
          by: caller.displayName,
          business: caller.businessName,
          typeLabel: type.label,
          cost,
          rush,
          extraRounds,
          due,
          folderUrl: folderId ? driveFolderUrl(folderId) : null,
          files,
          links,
          notes,
          submissionId,
        }),
        due_on: due,
        sort: ((last as { sort?: number } | null)?.sort ?? 0) + 1000,
        created_by: `${caller.displayName} (client, via portal)`,
      })
      .select('id')
      .single();
    if (cardErr || !card) throw new Error(`card insert: ${cardErr?.message ?? 'no row'}`);
    cardId = card.id;
    const { error: upErr } = await db.from('portal_submissions').update({ board_id: boardId, card_id: cardId, updated_at: new Date().toISOString() }).eq('id', submissionId);
    if (upErr) reportError('[portal] submission card link failed', upErr.message);
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    reportError('[portal] footage card failed; refunding', why);
    await refundSubmission(db, caller.clientId, submissionId, cost, why);
    return { ok: false, status: 500, code: 'failed', message: 'We could not start that edit. Your credits are back in your wallet; try again or email info@podlablv.com.' };
  }

  // ── 4. tell everyone (best effort)
  const extras = [rush ? 'RUSH 48h' : null, extraRounds ? `+${extraRounds} round${extraRounds === 1 ? '' : 's'}` : null].filter(Boolean).join(', ');
  const what = `${type.label}${extras ? ` (${extras})` : ''}, ${cost} credit${cost === 1 ? '' : 's'}`;
  const footage = [files.length ? `${files.length} file${files.length === 1 ? '' : 's'}${folderId ? `: ${driveFolderUrl(folderId)}` : ''}` : null, links.length ? `${links.length} link${links.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' + ');
  await Promise.all([
    notifySlack(`*New edit from the portal* · ${caller.displayName} (${caller.businessName}): "${title}" — ${what}. Due ${due ?? 'n/a'}. Footage: ${footage}. Card is in *Editing*. ${SITE_URL}/portal/clients/${caller.clientId}`),
    logToCrm(db, caller, `Sent footage for editing: "${title}" (${what}).`),
    recordActivity(db, caller.clientId, 'update', `You sent "${title}" for editing (${cost} credit${cost === 1 ? '' : 's'})`),
    notify(caller.clientId, {
      kind: 'credits',
      direction: 'done',
      title: `Footage received: ${title}`,
      body: `${what}. It's with the editors; due ${due}. You'll get a note when the cut is ready to watch.`,
      link: '/portal/projects',
      ref: `submission:${submissionId}`,
    }),
  ]).catch((err) => reportError('[portal] submission notices failed', err));

  return { ok: true, submissionId, cost, balance: typeof balance === 'number' ? balance : null, cardId };
}
