import type { SupabaseClient } from '@supabase/supabase-js';
import { driveFileId } from '@/lib/chapters';
import { isDoneColumn, PORTAL_COMMENT_SUFFIX } from '@/lib/production';
import { brandGaps } from '@/lib/portal/brand';
import { loadBrand } from '@/lib/portal/brand-server';
import { driveConfigured, modifiedTimes } from '@/lib/portal/drive';
import { LOOKS_GOOD_NOTE, POTATO_EPOCH, byHeat, cutHolder, makePotato, type Potato } from '@/lib/portal/potato';

/**
 * Every potato for one client, both sides: what's waiting on them and what's
 * waiting on PodLab. Each source degrades on its own; a table that isn't there
 * just contributes nothing. "Since" comes from the best timestamp each source
 * has (version created, notes sent, the cut's Drive file changing).
 */
export async function potatoesFor(db: SupabaseClient, clientId: string, now = Date.now()): Promise<Potato[]> {
  const { data: client } = await db.from('portal_clients').select('id, business_name, first_name, created_at').eq('id', clientId).maybeSingle();
  if (!client) return [];
  const you = client.first_name || 'You';
  const out: Potato[] = [];
  const add = (p: Omit<Potato, 'days' | 'heat' | 'clientId' | 'clientName'>) =>
    out.push(makePotato({ ...p, clientId, clientName: client.business_name }, now));

  await Promise.all([
    scripts(db, clientId, you, add).catch(warn('scripts')),
    deliverables(db, clientId, you, add).catch(warn('deliverables')),
    intake(db, clientId, you, add).catch(warn('intake')),
    actionItem(db, clientId, you, add).catch(warn('action items')),
    brand(db, clientId, you, client.created_at, add).catch(warn('brand')),
    cuts(db, clientId, you, now, add).catch(warn('production')),
  ]);
  return out.sort(byHeat);
}

type Add = (p: Omit<Potato, 'days' | 'heat' | 'clientId' | 'clientName'>) => void;
const warn = (what: string) => (err: unknown) => console.error(`[potato] ${what} failed`, err instanceof Error ? err.message : err);

async function scripts(db: SupabaseClient, id: string, you: string, add: Add) {
  const [s, v] = await Promise.all([
    db.from('portal_scripts').select('id, title, status, current_version, changes_requested_at').eq('client_id', id),
    db.from('portal_script_versions').select('script_id, version_no, created_at').eq('client_id', id),
  ]);
  if (s.error) return;
  for (const sc of s.data ?? []) {
    const st = (sc.status ?? '').toLowerCase();
    const ver = (v.data ?? []).find((x) => x.script_id === sc.id && x.version_no === sc.current_version);
    if (st === 'in review') add({ key: `script:${sc.id}:client`, holder: 'client', who: you, title: sc.title, why: 'Review the script: notes or approve', since: ver?.created_at ?? sc.changes_requested_at ?? new Date().toISOString(), href: `/portal/scripts/${sc.id}` });
    if (st === 'changes requested' && sc.changes_requested_at) add({ key: `script:${sc.id}:team`, holder: 'team', who: 'PodLab', title: sc.title, why: 'Rewriting with your notes', since: sc.changes_requested_at, href: `/portal/scripts/${sc.id}` });
  }
}

async function deliverables(db: SupabaseClient, id: string, you: string, add: Add) {
  const [a, v] = await Promise.all([
    db.from('portal_assets').select('id, title, status, current_version, changes_requested_at').eq('client_id', id),
    db.from('portal_asset_versions').select('asset_id, version_no, created_at').eq('client_id', id),
  ]);
  if (a.error) return;
  for (const as of a.data ?? []) {
    if (!as.current_version) continue; // legacy rows have nothing to sign off on
    const st = (as.status ?? '').toLowerCase();
    const ver = (v.data ?? []).find((x) => x.asset_id === as.id && x.version_no === as.current_version);
    if (st === 'in review' && ver) add({ key: `asset:${as.id}:client`, holder: 'client', who: you, title: as.title, why: 'Review it: notes or approve', since: ver.created_at, href: '/portal/deliverables' });
    if (st === 'changes requested' && as.changes_requested_at) add({ key: `asset:${as.id}:team`, holder: 'team', who: 'PodLab', title: as.title, why: 'Making your changes', since: as.changes_requested_at, href: '/portal/deliverables' });
  }
}

async function intake(db: SupabaseClient, id: string, you: string, add: Add) {
  const [items, kickoff] = await Promise.all([
    db.from('portal_intake_items').select('created_at').eq('client_id', id).order('created_at').limit(1),
    db.from('portal_delivery_phases').select('status').eq('client_id', id).eq('sort_order', 1).maybeSingle(),
  ]);
  const first = items.data?.[0];
  if (first && kickoff.data?.status !== 'done') add({ key: `intake:${id}:client`, holder: 'client', who: you, title: 'Your intake', why: 'Answer and submit it', since: first.created_at, href: '/portal/intake' });
}

/** One action item at a time: the top open one is the potato, not the whole list. */
async function actionItem(db: SupabaseClient, id: string, you: string, add: Add) {
  const { data } = await db.from('portal_action_items').select('id, title, created_at, status').eq('client_id', id).order('sort_order').limit(50);
  const top = (data ?? []).find((r) => (r.status ?? 'open') !== 'done');
  if (top) add({ key: `action:${top.id}:client`, holder: 'client', who: you, title: top.title, why: 'Your next action item', since: top.created_at, href: '/portal/actions' });
}

async function brand(db: SupabaseClient, id: string, you: string, createdAt: string, add: Add) {
  const b = await loadBrand(db, id, { sign: false });
  if (!b.ready) return;
  const gap = brandGaps(b)[0];
  if (gap) add({ key: `brand:${id}:client`, holder: 'client', who: you, title: gap, why: 'Your editors need it to brand your videos', since: createdAt, href: '/portal/brand' });
}

async function cuts(db: SupabaseClient, id: string, you: string, now: number, add: Add) {
  const { data: links } = await db.from('portal_client_boards').select('board_id').eq('client_id', id);
  const boardIds = (links ?? []).map((l: { board_id: string }) => l.board_id);
  if (!boardIds.length) return;
  const crm = db.schema('crm');
  const [lists, cards] = await Promise.all([
    crm.from('content_lists').select('id, name').in('board_id', boardIds),
    crm
      .from('content_cards')
      .select('id, title, list_id, video_url, due_on, editor, assignee_name, started_on, created_at')
      .in('board_id', boardIds)
      .eq('archived', false)
      .eq('is_template', false)
      .limit(300),
  ]);
  const column = new Map((lists.data ?? []).map((l: { id: string; name: string }) => [l.id, l.name]));
  const live = (cards.data ?? []).filter((c) => !isDoneColumn(column.get(c.list_id) ?? '') && !/scrap/i.test(column.get(c.list_id) ?? ''));
  if (!live.length) return;

  const [comments, times] = await Promise.all([
    crm.from('content_comments').select('card_id, author_name, body, created_at, resolved').in('card_id', live.map((c) => c.id)),
    driveConfigured() ? modifiedTimes(live.map((c) => driveFileId(c.video_url)).filter((x): x is string => Boolean(x))) : Promise.resolve(new Map<string, number>()),
  ]);
  // The client gets one potato for all their cuts ("6 cuts to watch"), not a
  // wall of them. Cuts that landed well before launch were handled outside
  // the portal and don't count.
  const toWatch: Array<{ title: string; since: number }> = [];
  const legacy = POTATO_EPOCH - 14 * 86_400_000;
  for (const c of live) {
    const notes = (comments.data ?? [])
      .filter((n) => n.card_id === c.id && (n.author_name ?? '').endsWith(PORTAL_COMMENT_SUFFIX))
      .map((n) => ({ at: Date.parse(n.created_at), resolved: Boolean(n.resolved), looksGood: (n.body ?? '').trim() === LOOKS_GOOD_NOTE }));
    const fileId = driveFileId(c.video_url);
    // The cut's Drive file time is when it landed; without it, when work started.
    const cutAt = (fileId && times.get(fileId)) || Date.parse(c.started_on ?? c.created_at) || null;
    const h = cutHolder({ hasCut: Boolean(c.video_url), cutAt, dueOn: c.due_on, clientNotes: notes, now });
    if (!h) continue;
    if (h.holder === 'client') {
      if (h.since >= legacy) toWatch.push({ title: c.title, since: h.since });
      continue;
    }
    add({
      key: `card:${c.id}:${h.holder}`,
      holder: h.holder,
      who: c.editor || c.assignee_name || 'Your editor',
      title: c.title,
      why: h.why,
      since: new Date(h.since).toISOString(),
      href: '/portal/production',
    });
  }
  if (toWatch.length) {
    const oldest = toWatch.reduce((m, x) => (x.since < m.since ? x : m));
    add({
      key: `cuts:${id}:client`,
      holder: 'client',
      who: you,
      title: toWatch.length === 1 ? oldest.title : `${toWatch.length} cuts to watch`,
      why: 'Watch, then leave notes or hit "Looks good"',
      since: new Date(oldest.since).toISOString(),
      href: '/portal/production',
    });
  }
}

/** Every client's potatoes, for the staff board and the Slack scoreboard. */
export async function allPotatoes(db: SupabaseClient, now = Date.now()): Promise<Potato[]> {
  const { data } = await db.from('portal_clients').select('id');
  const lists = await Promise.all((data ?? []).map((c: { id: string }) => potatoesFor(db, c.id, now).catch(() => [] as Potato[])));
  return lists.flat().sort(byHeat);
}
