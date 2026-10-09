import type { SupabaseClient } from '@supabase/supabase-js';
import type { PortalCaller } from '@/lib/portal-server';
import { chainStatus, productByKey, type ElementRow, type PhaseRow } from '@/lib/growth-chain';
import { isDoneColumn, stageFor, PORTAL_COMMENT_SUFFIX } from '@/lib/production';
import { isWaitingOnClient, unsentClientNotes, vocab } from '@/lib/portal/scripts';
import { loadProfile } from '@/lib/portal/profile';
import { clientDocumentInfo, listVersions } from '@/lib/portal/documents';
import { brandGaps } from '@/lib/portal/brand';
import { loadBrand } from '@/lib/portal/brand-server';
import { gameFor } from '@/lib/portal/game';
import { potatoesFor } from '@/lib/portal/potato-server';
import { HEAT_LABEL, type Potato } from '@/lib/portal/potato';
import { loadPlans } from '@/lib/portal/game-plan-server';
import { checkInDue, fmtNumber, type GamePlan } from '@/lib/portal/game-plan';
import { loadContentPlan } from '@/lib/portal/content-plan-server';
import { jobMix, needsScript, type ContentItem } from '@/lib/portal/content-plan';

/**
 * Everything TipTop knows about one client, read server-side with the service
 * role and scoped to caller.clientId on every query. Each block degrades on its
 * own: a table that doesn't exist yet (Growth Chain, Scripts, Production before
 * their migrations run) reads as `available: false`, never as an error.
 *
 * Staff-only fields (delivery task internals, comment resolutions written for
 * the team, CRM lead fields) are not selected here, so they can't leak.
 */

export interface Overview {
  client: {
    firstName: string | null;
    lastName: string | null;
    businessName: string;
    email: string;
    phone: string | null;
    website: string | null;
    timezone: string | null;
    plan: string | null;
    stage: string | null;
  };
  chain: {
    available: boolean;
    answered: number;
    unlocked: number;
    constraint: { key: string; name: string; state: string } | null;
    elements: Array<{ key: string; name: string; state: string; score: number | null; unlockers: string[] }>;
    foundation: string;
    owned: string[];
  };
  phases: Array<{ title: string; status: string; owner: string | null; due: string | null }>;
  production: {
    available: boolean;
    videos: Array<{ id: string; title: string; board: string; stage: string; done: boolean; dueOn: string | null; hasVideo: boolean; lastNoteByYou: boolean }>;
  };
  scripts: {
    available: boolean;
    items: Array<{ id: string; title: string; status: string; label: string; version: number; waitingOnYou: boolean; unsentNotes: number }>;
  };
  deliverables: {
    available: boolean;
    items: Array<{ id: string; title: string; status: string; version: number; waitingOnYou: boolean; unsentNotes: number }>;
  };
  actionItems: { open: Array<{ id: string; title: string; effort: string | null; source: string | null }>; done: number };
  intake: { total: number; answered: number; requiredLeft: number; submitted: boolean };
  invoices: { open: Array<{ no: string | null; description: string | null; amount: string; status: string | null; issued: string | null }>; paidCount: number };
  document: { has: boolean; editable: boolean; historyReady: boolean; versions: number };
  brand: {
    available: boolean;
    logos: string[];
    colors: string[];
    fonts: string[];
    guide: boolean;
    broll: { files: number; links: number };
    gaps: string[];
  };
  /** Hot Potato: who holds each open item and how long (both sides). */
  potatoes: Potato[];
  /** The 90-day Game Plan, one per pillar. */
  plans: { available: boolean; items: GamePlan[] };
  /** The content calendar from two weeks back. */
  content: { available: boolean; items: ContentItem[] };
  /** Nudges, most important first. */
  accountability: string[];
}

const money = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-US')}`;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error('[tiptop] overview block failed', err instanceof Error ? err.message : err);
    return fallback;
  }
}

export async function buildOverview(db: SupabaseClient, caller: PortalCaller): Promise<Overview> {
  const id = caller.clientId;

  const [profile, chain, phases, production, scripts, deliverables, actionItems, intake, invoices, document, brand, potatoes, plans, content] = await Promise.all([
    safe(() => loadProfile(db, id), null),
    safe(() => chainBlock(db, id), emptyChain()),
    safe(() => phasesBlock(db, id), []),
    safe(() => productionBlock(db, id), { available: false, videos: [] }),
    safe(() => scriptsBlock(db, id), { available: false, items: [] }),
    safe(() => deliverablesBlock(db, id), { available: false, items: [] }),
    safe(() => actionsBlock(db, id), { open: [], done: 0 }),
    safe(() => intakeBlock(db, id), { total: 0, answered: 0, requiredLeft: 0, submitted: false }),
    safe(() => invoicesBlock(db, id), { open: [], paidCount: 0 }),
    safe(() => documentBlock(db, id), { has: false, editable: false, historyReady: false, versions: 0 }),
    safe(() => brandBlock(db, id), emptyBrand()),
    safe(() => potatoesFor(db, id), [] as Potato[]),
    safe(async () => {
      const r = await loadPlans(db, id);
      return { available: r.ready, items: r.plans };
    }, { available: false, items: [] as GamePlan[] }),
    safe(async () => {
      const r = await loadContentPlan(db, id);
      return { available: r.ready, items: r.items };
    }, { available: false, items: [] as ContentItem[] }),
  ]);

  const o: Overview = {
    client: {
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      businessName: profile?.business_name ?? caller.businessName,
      email: caller.email,
      phone: profile?.phone ?? null,
      website: profile?.website ?? null,
      timezone: profile?.timezone ?? null,
      plan: null,
      stage: null,
    },
    chain,
    phases,
    production,
    scripts,
    deliverables,
    actionItems,
    intake,
    invoices,
    document,
    brand,
    potatoes,
    plans,
    content,
    accountability: [],
  };

  const { data: row } = await db.from('portal_clients').select('plan_label, stage').eq('id', id).maybeSingle();
  o.client.plan = row?.plan_label ?? null;
  o.client.stage = row?.stage ?? null;

  o.accountability = nudges(o);
  return o;
}

function nudges(o: Overview): string[] {
  const out: string[] = [];
  // The hottest potato on them leads: it's the oldest thing waiting on them.
  const hot = o.potatoes.find((p) => p.holder === 'client' && p.days >= 2);
  if (hot) out.push(`Hot potato, ${HEAT_LABEL[hot.heat].toLowerCase()} (day ${hot.days}): "${hot.title}". ${hot.why}.`);
  const waitingScripts = o.scripts.items.filter((s) => s.waitingOnYou);
  if (waitingScripts.length) out.push(`${waitingScripts.length} script${waitingScripts.length === 1 ? '' : 's'} waiting on your review: ${waitingScripts.map((s) => s.title).join(', ')}`);
  const unsentS = o.scripts.items.filter((s) => s.unsentNotes > 0);
  if (unsentS.length) out.push(`Notes written but not sent on: ${unsentS.map((s) => s.title).join(', ')}`);
  const waitingD = o.deliverables.items.filter((d) => d.waitingOnYou);
  if (waitingD.length) out.push(`${waitingD.length} deliverable${waitingD.length === 1 ? '' : 's'} waiting on your review: ${waitingD.map((d) => d.title).join(', ')}`);
  const unsentD = o.deliverables.items.filter((d) => d.unsentNotes > 0);
  if (unsentD.length) out.push(`Deliverable notes not sent yet on: ${unsentD.map((d) => d.title).join(', ')}`);
  if (o.intake.total > 0 && !o.intake.submitted) {
    out.push(
      o.intake.requiredLeft > 0
        ? `Intake: ${o.intake.requiredLeft} required question${o.intake.requiredLeft === 1 ? '' : 's'} unanswered (${o.intake.answered}/${o.intake.total} done)`
        : `Intake answered (${o.intake.answered}/${o.intake.total}) but not submitted`,
    );
  }
  // Only the first brand gap: it is a nudge, not a checklist.
  if (o.brand.available && o.brand.gaps.length) out.push(`Brand page: ${o.brand.gaps[0].toLowerCase()} (editors need it to brand their videos)`);
  const dueCheckIns = o.plans.items.filter((p) => checkInDue(p));
  if (dueCheckIns.length) out.push(`Weekly Game Plan check-in due: ${dueCheckIns.map((p) => p.pillar).join(', ')} (ask for the number, then check_in_game_plan)`);
  const slipping = o.plans.items.filter((p) => p.status === 'off track' || p.status === 'at risk');
  if (slipping.length) out.push(`Game Plan ${slipping.map((p) => `${p.pillar} is ${p.status}`).join('; ')}: help them pick the one move that gets it back on pace`);
  const unscripted = o.content.items.filter((i) => needsScript(i));
  if (unscripted.length) out.push(`${unscripted.length} content piece${unscripted.length === 1 ? '' : 's'} go out within 5 days with no script: ${unscripted.map((i) => `"${i.title}" (${i.publishOn})`).join(', ')}. Offer to write ${unscripted.length === 1 ? 'it' : 'them'} (draft_script with content_item_id)`);
  if (o.plans.available && o.plans.items.length === 0) out.push('No Game Plan yet: offer to build the 90-day plan for the pillar holding the rest back');
  if (o.actionItems.open.length) out.push(`${o.actionItems.open.length} open action item${o.actionItems.open.length === 1 ? '' : 's'}`);
  if (o.chain.available && o.chain.answered < 8) out.push(o.chain.answered === 0 ? 'Growth Chain check not taken yet (eight questions, about four minutes)' : `Growth Chain check part-done (${o.chain.answered}/8)`);
  const blocked = o.phases.filter((p) => p.status === 'blocked');
  if (blocked.length) out.push(`Blocked delivery phase${blocked.length === 1 ? '' : 's'}: ${blocked.map((p) => p.title).join(', ')}`);
  const overdue = o.invoices.open.filter((i) => (i.status ?? '').toLowerCase() === 'overdue');
  if (overdue.length) out.push(`${overdue.length} overdue invoice${overdue.length === 1 ? '' : 's'}`);
  return out;
}

// ── blocks ───────────────────────────────────────────────────────────

function emptyChain(): Overview['chain'] {
  return { available: false, answered: 0, unlocked: 0, constraint: null, elements: [], foundation: 'locked', owned: [] };
}

async function chainBlock(db: SupabaseClient, id: string): Promise<Overview['chain']> {
  const [products, rows, phases] = await Promise.all([
    db.from('portal_client_products').select('product').eq('client_id', id),
    db.from('portal_client_elements').select('element, score, delivered_at, state_override').eq('client_id', id),
    db.from('portal_delivery_phases').select('status, elements').eq('client_id', id),
  ]);
  if (products.error || rows.error) return emptyChain();
  const owned = (products.data ?? []).map((p: { product: string }) => p.product);
  const status = chainStatus(owned, (rows.data ?? []) as ElementRow[], ((phases.data ?? []) as PhaseRow[]));
  const constraint = status.constraint ? status.elements.find((e) => e.key === status.constraint)! : null;
  return {
    available: true,
    answered: status.answered,
    unlocked: status.unlocked,
    constraint: constraint ? { key: constraint.key, name: constraint.element.name, state: constraint.state } : null,
    elements: status.elements.map((e) => ({
      key: e.key,
      name: e.element.name,
      state: e.state,
      score: e.score,
      unlockers: e.unlockers.filter((p) => !owned.includes(p.key)).map((p) => p.key),
    })),
    foundation: status.foundation.state,
    owned: owned.map((k) => productByKey(k)?.name ?? k),
  };
}

async function phasesBlock(db: SupabaseClient, id: string): Promise<Overview['phases']> {
  const { data } = await db
    .from('portal_delivery_phases')
    .select('title, status, owner, due_label, sort_order')
    .eq('client_id', id)
    .order('sort_order');
  return (data ?? []).map((p: { title: string; status: string; owner: string | null; due_label: string | null }) => ({
    title: p.title,
    status: p.status,
    owner: p.owner,
    due: p.due_label,
  }));
}

/** Same reads as GET /api/portal/production, trimmed to what a guide needs. */
async function productionBlock(db: SupabaseClient, id: string): Promise<Overview['production']> {
  const { data: links, error } = await db.from('portal_client_boards').select('board_id').eq('client_id', id);
  if (error) return { available: false, videos: [] };
  const boardIds = (links ?? []).map((r: { board_id: string }) => r.board_id);
  if (!boardIds.length) return { available: true, videos: [] };

  const crm = db.schema('crm');
  const [boards, lists, cards] = await Promise.all([
    crm.from('content_boards').select('id, name').in('id', boardIds).eq('archived', false),
    crm.from('content_lists').select('id, board_id, name').in('board_id', boardIds).eq('archived', false),
    crm
      .from('content_cards')
      .select('id, board_id, list_id, title, due_on, video_url')
      .in('board_id', boardIds)
      .eq('archived', false)
      .eq('is_template', false)
      .order('sort')
      .limit(60),
  ]);
  if (boards.error || lists.error || cards.error) return { available: false, videos: [] };

  const cardRows = (cards.data ?? []) as Array<{ id: string; board_id: string; list_id: string; title: string; due_on: string | null; video_url: string | null }>;
  const lastNote = new Map<string, boolean>();
  if (cardRows.length) {
    const { data: comments } = await crm
      .from('content_comments')
      .select('card_id, author_name, created_at')
      .in('card_id', cardRows.map((c) => c.id))
      .order('created_at', { ascending: false });
    for (const c of (comments ?? []) as Array<{ card_id: string; author_name: string | null }>) {
      if (!lastNote.has(c.card_id)) lastNote.set(c.card_id, (c.author_name ?? '').endsWith(PORTAL_COMMENT_SUFFIX));
    }
  }
  const listName = new Map((lists.data ?? []).map((l: { id: string; name: string }) => [l.id, l.name]));
  const boardName = new Map((boards.data ?? []).map((b: { id: string; name: string }) => [b.id, b.name]));

  return {
    available: true,
    videos: cardRows
      .filter((c) => boardName.has(c.board_id))
      .map((c) => {
        const column = listName.get(c.list_id) ?? '';
        return {
          id: c.id,
          title: c.title,
          board: boardName.get(c.board_id) ?? '',
          stage: stageFor(column),
          done: isDoneColumn(column),
          dueOn: c.due_on,
          hasVideo: Boolean(c.video_url),
          lastNoteByYou: lastNote.get(c.id) ?? false,
        };
      }),
  };
}

async function scriptsBlock(db: SupabaseClient, id: string): Promise<Overview['scripts']> {
  const { data, error } = await db
    .from('portal_scripts')
    .select('id, title, status, current_version, changes_requested_at')
    .eq('client_id', id)
    .order('sort_order')
    .limit(40);
  if (error) return { available: false, items: [] };
  const scripts = (data ?? []) as Array<{ id: string; title: string; status: string | null; current_version: number; changes_requested_at: string | null }>;
  if (!scripts.length) return { available: true, items: [] };

  const { data: versions } = await db
    .from('portal_script_versions')
    .select('id, script_id, version_no')
    .eq('client_id', id);
  const currentVersionId = new Map<string, string>();
  for (const v of (versions ?? []) as Array<{ id: string; script_id: string; version_no: number }>) {
    const s = scripts.find((x) => x.id === v.script_id);
    if (s && s.current_version === v.version_no) currentVersionId.set(s.id, v.id);
  }
  const ids = [...currentVersionId.values()];
  const { data: notes } = ids.length
    ? await db
        .from('portal_script_comments')
        .select('version_id, author_kind, status, created_at, parent_id')
        .in('version_id', ids)
    : { data: [] };

  return {
    available: true,
    items: scripts.map((s) => {
      const vid = currentVersionId.get(s.id);
      const mine = ((notes ?? []) as Array<{ version_id: string; author_kind: string; status: string; created_at: string; parent_id: string | null }>).filter(
        (n) => n.version_id === vid && !n.parent_id,
      );
      return {
        id: s.id,
        title: s.title,
        status: s.status ?? 'draft',
        label: vocab(s.status).label,
        version: s.current_version,
        waitingOnYou: isWaitingOnClient(s.status),
        unsentNotes: isWaitingOnClient(s.status) ? unsentClientNotes(mine, s.changes_requested_at).length : 0,
      };
    }),
  };
}

async function deliverablesBlock(db: SupabaseClient, id: string): Promise<Overview['deliverables']> {
  const { data, error } = await db
    .from('portal_assets')
    .select('*')
    .eq('client_id', id)
    .order('sort_order')
    .limit(60);
  if (error) return { available: false, items: [] };
  const assets = (data ?? []) as Array<{ id: string; title: string; status: string | null; current_version?: number | null; changes_requested_at?: string | null }>;
  const versioned = assets.filter((a) => (a.current_version ?? 0) > 0);

  let notes: Array<{ asset_id: string; version_id: string; author_kind: string; status: string; created_at: string }> = [];
  let versionIds = new Map<string, string>();
  if (versioned.length) {
    const { data: versions } = await db.from('portal_asset_versions').select('id, asset_id, version_no').eq('client_id', id);
    versionIds = new Map(
      ((versions ?? []) as Array<{ id: string; asset_id: string; version_no: number }>)
        .filter((v) => versioned.some((a) => a.id === v.asset_id && a.current_version === v.version_no))
        .map((v) => [v.asset_id, v.id]),
    );
    const ids = [...versionIds.values()];
    if (ids.length) {
      const { data: n } = await db.from('portal_asset_comments').select('asset_id, version_id, author_kind, status, created_at').in('version_id', ids);
      notes = (n ?? []) as typeof notes;
    }
  }

  return {
    available: true,
    items: assets.map((a) => {
      const st = (a.status ?? '').toLowerCase();
      const hasVersion = (a.current_version ?? 0) > 0;
      const waiting = hasVersion && st === 'in review';
      const vid = versionIds.get(a.id);
      return {
        id: a.id,
        title: a.title,
        status: a.status ?? 'Ready',
        version: a.current_version ?? 0,
        waitingOnYou: waiting,
        unsentNotes: waiting ? unsentClientNotes(notes.filter((n) => n.version_id === vid), a.changes_requested_at).length : 0,
      };
    }),
  };
}

async function actionsBlock(db: SupabaseClient, id: string): Promise<Overview['actionItems']> {
  const { data } = await db
    .from('portal_action_items')
    .select('id, title, effort, source, status')
    .eq('client_id', id)
    .order('sort_order');
  const rows = (data ?? []) as Array<{ id: string; title: string; effort: string | null; source: string | null; status: string | null }>;
  return {
    open: rows.filter((r) => (r.status ?? 'open') !== 'done').map(({ id: rid, title, effort, source }) => ({ id: rid, title, effort, source })),
    done: rows.filter((r) => r.status === 'done').length,
  };
}

async function intakeBlock(db: SupabaseClient, id: string): Promise<Overview['intake']> {
  const [items, answers, kickoff] = await Promise.all([
    db.from('portal_intake_items').select('id, required').eq('client_id', id),
    db.from('portal_intake_answers').select('item_id, value').eq('client_id', id),
    db.from('portal_delivery_phases').select('status').eq('client_id', id).eq('sort_order', 1).maybeSingle(),
  ]);
  const filled = new Set(
    ((answers.data ?? []) as Array<{ item_id: string; value: string | null }>).filter((a) => (a.value ?? '').trim()).map((a) => a.item_id),
  );
  const list = (items.data ?? []) as Array<{ id: string; required: boolean }>;
  return {
    total: list.length,
    answered: list.filter((i) => filled.has(i.id)).length,
    requiredLeft: list.filter((i) => i.required && !filled.has(i.id)).length,
    submitted: kickoff.data?.status === 'done',
  };
}

async function invoicesBlock(db: SupabaseClient, id: string): Promise<Overview['invoices']> {
  const { data } = await db
    .from('portal_invoices')
    .select('invoice_no, issued_on, description, amount_cents, status')
    .eq('client_id', id)
    .order('sort_order');
  const rows = ((data ?? []) as Array<{ invoice_no: string | null; issued_on: string | null; description: string | null; amount_cents: number; status: string | null }>).filter(
    (r) => !/^void/i.test(r.status ?? ''),
  );
  const paid = rows.filter((r) => (r.status ?? '').toLowerCase() === 'paid');
  return {
    open: rows
      .filter((r) => (r.status ?? '').toLowerCase() !== 'paid')
      .map((r) => ({ no: r.invoice_no, description: r.description, amount: money(r.amount_cents), status: r.status, issued: r.issued_on })),
    paidCount: paid.length,
  };
}

async function documentBlock(db: SupabaseClient, id: string): Promise<Overview['document']> {
  const [{ slug, external }, history] = await Promise.all([clientDocumentInfo(db, id), listVersions(db, id)]);
  return {
    has: Boolean(slug || external || history.versions.length),
    editable: Boolean(slug || history.versions.length) && history.ready,
    historyReady: history.ready,
    versions: history.versions.length,
  };
}

function emptyBrand(): Overview['brand'] {
  return { available: false, logos: [], colors: [], fonts: [], guide: false, broll: { files: 0, links: 0 }, gaps: [] };
}

async function brandBlock(db: SupabaseClient, id: string): Promise<Overview['brand']> {
  const b = await loadBrand(db, id, { sign: false });
  if (!b.ready) return emptyBrand();
  const broll = b.assets.filter((a) => a.kind === 'broll');
  return {
    available: true,
    logos: b.assets.filter((a) => a.kind === 'logo').map((a) => a.variant ?? 'other'),
    colors: b.kit.colors.map((c) => `${c.hex}${c.name ? ` ${c.name}` : ''}`),
    fonts: b.kit.fonts.map((f) => `${f.name}${f.use ? ` (${f.use})` : ''}`),
    guide: b.assets.some((a) => a.kind === 'guide'),
    broll: { files: broll.filter((a) => !a.externalUrl).length, links: broll.filter((a) => a.externalUrl).length },
    gaps: brandGaps(b),
  };
}

/** Compact, model-facing rendering of the overview. IDs are included so tools can target them. */
export function renderOverview(o: Overview): string {
  const L: string[] = [];
  const c = o.client;
  L.push(`Client: ${[c.firstName, c.lastName].filter(Boolean).join(' ') || '(no name)'} — ${c.businessName}. Login email ${c.email}. Phone ${c.phone ?? 'not set'}. Website ${c.website ?? 'not set'}. Timezone ${c.timezone ?? 'not set'}. Plan: ${c.plan ?? 'not set'}.`);

  if (o.chain.available) {
    L.push(`Growth Chain: owns ${o.chain.owned.join(', ') || 'nothing recorded yet'}. ${o.chain.unlocked}/8 unlocked, check answered ${o.chain.answered}/8. Brand foundation: ${o.chain.foundation}. Constraint: ${o.chain.constraint ? `${o.chain.constraint.name} (${o.chain.constraint.state})` : 'none'}.`);
    L.push(
      '  ' +
        o.chain.elements
          .map((e) => `${e.name} ${e.state}${e.score !== null ? ` score ${e.score}` : ''}${e.state === 'locked' && e.unlockers.length ? ` [unlocked by: ${e.unlockers.slice(0, 3).join(', ')}]` : ''}`)
          .join('; '),
    );
  } else {
    L.push('Growth Chain: not switched on for this account yet.');
  }

  L.push(o.phases.length ? `Delivery phases: ${o.phases.map((p) => `${p.title} [${p.status}${p.owner ? `, ${p.owner}` : ''}${p.due ? `, ${p.due}` : ''}]`).join('; ')}` : 'Delivery phases: none set up.');

  if (!o.production.available) L.push('Production (videos): not switched on yet.');
  else if (!o.production.videos.length) L.push('Production (videos): no video boards linked yet.');
  else
    L.push(
      `Production videos:\n${o.production.videos
        .slice(0, 30)
        .map((v) => `  - id=${v.id} "${v.title}" (${v.board}) stage ${v.stage}${v.done ? ' [done]' : ''}${v.dueOn ? ` due ${v.dueOn}` : ''}${v.hasVideo ? ' [cut available]' : ''}${v.lastNoteByYou ? ' [your note is the latest]' : ''}`)
        .join('\n')}`,
    );

  if (!o.scripts.available) L.push('Scripts: not switched on yet.');
  else if (!o.scripts.items.length) L.push('Scripts: none published yet.');
  else L.push(`Scripts:\n${o.scripts.items.map((s) => `  - id=${s.id} "${s.title}" v${s.version} ${s.label}${s.waitingOnYou ? ' [WAITING ON CLIENT]' : ''}${s.unsentNotes ? ` [${s.unsentNotes} unsent notes]` : ''}`).join('\n')}`);

  if (!o.deliverables.available) L.push('Deliverables: none.');
  else if (!o.deliverables.items.length) L.push('Deliverables: none yet.');
  else L.push(`Deliverables:\n${o.deliverables.items.map((d) => `  - id=${d.id} "${d.title}" ${d.status}${d.version ? ` v${d.version}` : ''}${d.waitingOnYou ? ' [WAITING ON CLIENT]' : ''}${d.unsentNotes ? ` [${d.unsentNotes} unsent notes]` : ''}`).join('\n')}`);

  L.push(o.actionItems.open.length ? `Open action items (${o.actionItems.done} done):\n${o.actionItems.open.map((a) => `  - id=${a.id} "${a.title}"${a.effort ? ` (${a.effort})` : ''}`).join('\n')}` : `Action items: none open (${o.actionItems.done} done).`);
  L.push(o.intake.total ? `Intake: ${o.intake.answered}/${o.intake.total} answered, ${o.intake.requiredLeft} required left, ${o.intake.submitted ? 'submitted' : 'NOT submitted'}.` : 'Intake: none assigned.');
  L.push(o.invoices.open.length ? `Unpaid invoices: ${o.invoices.open.map((i) => `${i.no ?? 'invoice'} ${i.amount} ${i.status ?? ''}${i.description ? ` (${i.description})` : ''}`).join('; ')}. Paid: ${o.invoices.paidCount}.` : `Invoices: nothing outstanding (${o.invoices.paidCount} paid).`);
  L.push(`Clarity Document: ${o.document.has ? 'published' : 'not published yet'}${o.document.has ? (o.document.editable ? `, you can edit it (${o.document.versions} saved versions)` : o.document.historyReady ? ', hosted externally, so you cannot edit it' : ', editing not switched on yet') : ''}.`);
  if (!o.brand.available) L.push('Brand page: not switched on yet.');
  else
    L.push(
      `Brand page (/portal/brand: logos, colors, fonts, guide, b-roll; they upload there themselves): logos ${o.brand.logos.length ? o.brand.logos.join(', ') : 'none'}; colors ${o.brand.colors.join(', ') || 'none'}; fonts ${o.brand.fonts.join(', ') || 'none'}; brand guide ${o.brand.guide ? 'uploaded' : 'not uploaded'}; b-roll ${o.brand.broll.files} files, ${o.brand.broll.links} links.${o.brand.gaps.length ? ` Missing: ${o.brand.gaps.join('; ')}.` : ' Kit complete.'}`,
    );
  const mine = o.potatoes.filter((p) => p.holder === 'client');
  const ours = o.potatoes.filter((p) => p.holder === 'team');
  L.push(
    `Hot Potato (whoever's turn it is holds it; it heats daily: warm, getting hot day 2, on fire day 4, day 7 smokes out their portal until they act). On them: ${
      mine.length ? mine.map((p) => `"${p.title}" (${p.why}; day ${p.days}, ${p.heat})`).join('; ') : 'nothing'
    }. On PodLab: ${ours.length ? ours.map((p) => `"${p.title}" with ${p.who} (${p.why}; day ${p.days}, ${p.heat})`).join('; ') : 'nothing'}.`,
  );
  if (o.plans.available) {
    L.push(
      o.plans.items.length
        ? `Game Plan (/portal/plan; 90 days per pillar):\n${o.plans.items
            .map((p) => `  - ${p.pillar}: "${p.outcome}" — ${fmtNumber(p.current ?? p.baseline)} of ${fmtNumber(p.target)}${p.metric ? ` ${p.metric}` : ''}${p.dueOn ? ` by ${p.dueOn}` : ''}, ${p.status}${checkInDue(p) ? ' [CHECK-IN DUE]' : ''}. Priorities: ${p.priorities.join('; ')}${p.lastCheckIn ? `. Last check-in ${p.lastCheckInAt?.slice(0, 10)}: ${p.lastCheckIn}` : ''}`)
            .join('\n')}`
        : 'Game Plan: none set yet (pillars: People, Operations, Sales, Marketing, Content).',
    );
  }
  if (o.content.available) {
    const today = new Date().toISOString().slice(0, 10);
    const ahead = o.content.items.filter((i) => i.publishOn >= today && i.status !== 'skipped');
    const mix = jobMix(ahead);
    L.push(
      ahead.length
        ? `Content plan (/portal/content), ${ahead.length} ahead (mix: ${Object.entries(mix).map(([k, v]) => `${k} ${v}`).join(', ')}):\n${ahead
            .slice(0, 20)
            .map((i) => `  - id=${i.id} ${i.publishOn} ${i.format}/${i.job} "${i.title}" [${i.status}]${i.pillar ? ` pillar: ${i.pillar}` : ''}`)
            .join('\n')}${ahead.length > 20 ? `\n  …and ${ahead.length - 20} more` : ''}`
        : 'Content plan: nothing planned ahead.',
    );
  }
  const g = gameFor(o);
  L.push(`Build level (sidebar game; points come from their inputs and approvals): Level ${g.level.n} ${g.level.name}, ${g.score} pts${g.level.next !== null ? `, ${g.level.next - g.score} to level ${g.level.n + 1}` : ''}. Next mission: ${g.nextMission ? `${g.nextMission.title} (+${g.nextMission.points})` : 'none, nothing waiting on them'}.`);
  L.push(o.accountability.length ? `Open loops (bring up the top one or two when it fits):\n${o.accountability.map((a) => `  - ${a}`).join('\n')}` : 'Open loops: none. They are on top of everything.');
  return L.join('\n');
}
