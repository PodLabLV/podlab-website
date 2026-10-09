import type { SupabaseClient } from '@supabase/supabase-js';
import { logToCrm, notifySlack, type PortalCaller } from '@/lib/portal-server';
import { recordActivity } from '@/lib/portal/server';
import { SITE_URL } from '@/lib/portal-email';
import type { ContentItem, ContentStatus, Format, Job } from '@/lib/portal/content-plan';

/** Server half of the content plan: reads, TipTop's writes, and staff's "send to editors". */

interface Row {
  id: string;
  publish_on: string;
  pillar: string;
  format: Format;
  title: string;
  hook: string | null;
  job: Job;
  cta: string | null;
  status: ContentStatus;
  script_id: string | null;
  crm_card_id: string | null;
  notes: string | null;
  updated_at: string;
}

const toItem = (r: Row): ContentItem => ({
  id: r.id,
  publishOn: r.publish_on,
  pillar: r.pillar,
  format: r.format,
  title: r.title,
  hook: r.hook,
  job: r.job,
  cta: r.cta,
  status: r.status,
  scriptId: r.script_id,
  crmCardId: r.crm_card_id,
  notes: r.notes,
  updatedAt: r.updated_at,
});

/** `ready: false` = migration not run. `from` trims to what's still relevant (default: last 14 days on). */
export async function loadContentPlan(db: SupabaseClient, clientId: string, from?: string): Promise<{ ready: boolean; items: ContentItem[] }> {
  const since = from ?? new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db.from('portal_content_plan').select('*').eq('client_id', clientId).gte('publish_on', since).order('publish_on').limit(300);
  if (error) return { ready: false, items: [] };
  return { ready: true, items: ((data ?? []) as Row[]).map(toItem) };
}

export interface NewItem {
  publish_on: string;
  pillar: string;
  format: Format;
  title: string;
  hook?: string;
  job: Job;
  cta?: string;
  /** Already shot: the production card this piece posts from. */
  card_id?: string;
}

export async function addContentItems(db: SupabaseClient, caller: PortalCaller, items: NewItem[]): Promise<{ created: number }> {
  const rows = items.map((i) => ({
    client_id: caller.clientId,
    publish_on: i.publish_on,
    pillar: i.pillar.slice(0, 80),
    format: i.format,
    title: i.title.slice(0, 200),
    hook: i.hook?.slice(0, 300) || null,
    job: i.job,
    cta: i.cta?.slice(0, 200) || null,
    // Already shot and with the editors: it posts from that cut, nothing to record.
    ...(i.card_id ? { crm_card_id: i.card_id, status: 'in edit' } : {}),
    created_by: `${caller.displayName} (with TipTop)`,
  }));
  const { error } = await db.from('portal_content_plan').insert(rows);
  if (error) throw new Error(`content plan insert failed: ${error.message}`);
  const first = [...rows].sort((a, b) => a.publish_on.localeCompare(b.publish_on))[0]?.publish_on;
  const last = [...rows].sort((a, b) => b.publish_on.localeCompare(a.publish_on))[0]?.publish_on;
  await Promise.all([
    recordActivity(db, caller.clientId, 'update', `Content plan: ${rows.length} piece${rows.length === 1 ? '' : 's'} planned (${first} to ${last})`),
    logToCrm(db, caller, `Planned ${rows.length} content pieces with TipTop, ${first} to ${last}.`),
  ]);
  return { created: rows.length };
}

/** Which of these production card ids are on this client's linked boards. */
export async function ownedCards(db: SupabaseClient, clientId: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { data: links } = await db.from('portal_client_boards').select('board_id').eq('client_id', clientId);
  const boards = (links ?? []).map((l: { board_id: string }) => l.board_id);
  if (!boards.length) return new Set();
  const { data } = await db.schema('crm').from('content_cards').select('id').in('id', ids).in('board_id', boards);
  return new Set((data ?? []).map((r: { id: string }) => r.id));
}

/** The ids that belong to this client. */
export async function ownedItems(db: SupabaseClient, clientId: string, ids: string[]): Promise<Map<string, ContentItem>> {
  if (!ids.length) return new Map();
  const { data } = await db.from('portal_content_plan').select('*').eq('client_id', clientId).in('id', ids);
  return new Map(((data ?? []) as Row[]).map((r) => [r.id, toItem(r)]));
}

export interface ItemPatch {
  id: string;
  status?: ContentStatus;
  publish_on?: string;
  title?: string;
  hook?: string;
  notes?: string;
}

export async function updateContentItems(db: SupabaseClient, caller: PortalCaller, patches: ItemPatch[]): Promise<{ updated: number }> {
  const owned = await ownedItems(db, caller.clientId, patches.map((p) => p.id));
  let n = 0;
  for (const p of patches) {
    if (!owned.has(p.id)) continue;
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (p.status) row.status = p.status;
    if (p.publish_on) row.publish_on = p.publish_on;
    if (p.title) row.title = p.title.slice(0, 200);
    if (p.hook !== undefined) row.hook = p.hook.slice(0, 300) || null;
    if (p.notes !== undefined) row.notes = p.notes.slice(0, 1000) || null;
    const { error } = await db.from('portal_content_plan').update(row).eq('id', p.id).eq('client_id', caller.clientId);
    if (!error) n++;
  }
  // Recorded pieces wait on the team to send them to the editors.
  const recorded = patches.filter((p) => p.status === 'recorded' && owned.has(p.id));
  if (recorded.length) {
    await notifySlack(
      `*Recorded* · ${caller.businessName}: ${recorded.map((p) => `"${owned.get(p.id)!.title}"`).join(', ')}. Send to the editors: ${SITE_URL}/portal/content?client=${caller.clientId}`,
    );
  }
  return { updated: n };
}

/** A script TipTop drafted for a planned piece: link it and move the piece to scripted. */
export async function linkScript(db: SupabaseClient, clientId: string, itemId: string, scriptId: string): Promise<void> {
  await db.from('portal_content_plan').update({ script_id: scriptId, status: 'scripted', updated_at: new Date().toISOString() }).eq('id', itemId).eq('client_id', clientId).eq('status', 'planned');
}

/**
 * Staff: turn a recorded piece into editing work. Creates a card on the client's
 * linked general board, in its Editing column (else the first column), with the
 * hook, the job and the script in the description, then marks the piece in edit.
 */
export async function sendToEditors(db: SupabaseClient, itemId: string, by: string): Promise<{ ok: true; cardId: string; board: string } | { ok: false; message: string }> {
  const { data: row } = await db.from('portal_content_plan').select('*, portal_clients(business_name)').eq('id', itemId).maybeSingle();
  if (!row) return { ok: false, message: 'Not found' };
  if (row.crm_card_id) return { ok: false, message: 'Already with the editors.' };
  const item = toItem(row as Row);
  const business = (row as { portal_clients?: { business_name?: string } }).portal_clients?.business_name ?? 'Client';

  const { data: links } = await db.from('portal_client_boards').select('board_id').eq('client_id', row.client_id);
  const ids = (links ?? []).map((l: { board_id: string }) => l.board_id);
  if (!ids.length) return { ok: false, message: 'Link a production board to this client first (Manage → Production boards).' };
  const crm = db.schema('crm');
  // General boards only: clips boards need an episode, podcast boards run their own gates.
  const { data: boards } = await crm.from('content_boards').select('id, name, board_type').in('id', ids).eq('archived', false);
  const board = (boards ?? []).find((b: { board_type: string }) => b.board_type === 'general');
  if (!board) return { ok: false, message: 'This client has no general board linked; add the card in the CRM by hand.' };
  const { data: lists } = await crm.from('content_lists').select('id, name, sort').eq('board_id', board.id).eq('archived', false).order('sort');
  const list = (lists ?? []).find((l: { name: string }) => /edit/i.test(l.name)) ?? (lists ?? [])[0];
  if (!list) return { ok: false, message: 'That board has no columns.' };

  let script = '';
  if (item.scriptId) {
    const { data: s } = await db.from('portal_scripts').select('current_version').eq('id', item.scriptId).maybeSingle();
    if (s) {
      const { data: v } = await db.from('portal_script_versions').select('body').eq('script_id', item.scriptId).eq('version_no', s.current_version).maybeSingle();
      script = v?.body ?? '';
    }
  }
  const { data: last } = await crm.from('content_cards').select('sort').eq('list_id', list.id).order('sort', { ascending: false }).limit(1).maybeSingle();
  const description = [
    `Format: ${item.format} · Job: ${item.job} · Goes out ${item.publishOn}`,
    item.hook ? `Hook: ${item.hook}` : null,
    item.cta ? `CTA: ${item.cta}` : null,
    script ? `\n---\nScript\n${script}` : null,
    `\n---\nFrom the client's content plan (portal).`,
  ]
    .filter(Boolean)
    .join('\n');
  const { data: card, error } = await crm
    .from('content_cards')
    .insert({ board_id: board.id, list_id: list.id, title: `${business} - ${item.title}`.slice(0, 200), sort: (last?.sort ?? 0) + 1000, created_by: by, description, due_on: item.publishOn })
    .select('id')
    .single();
  if (error || !card) return { ok: false, message: `Could not create the card: ${error?.message ?? 'unknown'}` };
  await db.from('portal_content_plan').update({ crm_card_id: card.id, status: 'in edit', updated_at: new Date().toISOString() }).eq('id', itemId);
  await recordActivity(db, row.client_id, 'update', `In the edit: ${item.title}`);
  return { ok: true, cardId: card.id, board: board.name };
}
