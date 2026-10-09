// TipTop's portal tools. Server only.
//
// Scoping: every tool closes over the caller the route resolved from the bearer
// token. No tool takes a client id, and every lookup by a row id re-checks that
// the row belongs to that caller, so a model (or a doctored history) naming
// someone else's script, card or action item gets "not found".
//
// Writes: every tool in WRITE_TOOLS goes through AI SDK tool approval. The
// approval function runs first, server-side: it validates the input and
// resolves the real target, and either denies with a reason (the model sees it
// and asks again) or asks the client with a server-written description. The
// approval is HMAC-signed by the route, so a doctored history can't approve.

import { cardVisible, clientCardScope } from '@/lib/production-server';
import { tool, type ToolApprovalStatus } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PortalCaller } from '@/lib/portal-server';
import { productByKey, productCta } from '@/lib/growth-chain';
import { parseClock } from '@/lib/portal/scripts';
import { validateProfilePatch, saveProfile, describeChange, FIELD_LABELS, type ProfileField } from '@/lib/portal/profile';
import { currentDocument, listVersions, saveVersion, restoreVersion, announceDocChange } from '@/lib/portal/documents';
import { applyEdits, diffSummary, findSnippets, outline, plainText, sectionSource } from './doc-edit';
import { buildOverview, renderOverview } from './overview';
import { sendVideoNote, sendScriptRevision, sendDeliverableRevision, setActionItem, flagForTeam, announceProfileChange } from './actions';
import {
  CLARITY_CALL_URL,
  PAGES,
  STRATEGY_CALL_URL,
  bookingInput,
  completeActionItemInput,
  documentHistoryInput,
  editDocumentInput,
  flagInput,
  getOverviewInput,
  goToInput,
  readDocumentInput,
  recommendInput,
  restoreVersionInput,
  sendRevisionInput,
  updateProfileInput,
  readIntakeInput,
  saveIntakeAnswersInput,
  updateBrandKitInput,
  createActionItemsInput,
  draftScriptInput,
  readScriptInput,
  readClientFileInput,
  setGamePlanInput,
  checkInGamePlanInput,
  planContentInput,
  updateContentInput,
  type WriteTool,
} from './schema';
import { addContentItems, linkScript, loadContentPlan, ownedCards, ownedItems, updateContentItems } from '@/lib/portal/content-plan-server';
import { loadPlans, setPlan, checkIn } from '@/lib/portal/game-plan-server';
import { fmtNumber, paceStatus } from '@/lib/portal/game-plan';
import { createActionItems, draftScript, nextBrandKit, ownedQuestions, readClientFile, readIntake, readScript, saveBrandKit, saveIntakeAnswers } from './guide';
import type { z } from 'zod';

export interface ToolContext {
  db: SupabaseClient;
  caller: PortalCaller;
  /** recommend_product outputs already shown in this conversation (read off the history). */
  priorRecommendations: number;
}

/** Calendly with name and email prefilled. Pure; unit-tested. */
export function bookingUrl(call: 'strategy' | 'clarity', name?: string, email?: string): string {
  const u = new URL(call === 'clarity' ? CLARITY_CALL_URL : STRATEGY_CALL_URL);
  u.searchParams.set('utm_source', 'tiptop-portal');
  if (name) u.searchParams.set('name', name);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && !email.endsWith('.invalid')) u.searchParams.set('email', email);
  return u.toString();
}

const SEND_LABEL = { video: 'the editors', script: 'the script writer', deliverable: 'the team' } as const;

// ── target resolution, shared by approval and execution ─────────────────

async function resolveRevisionTarget(
  ctx: ToolContext,
  input: z.infer<typeof sendRevisionInput>,
): Promise<{ ok: true; title: string; where: string } | { ok: false; reason: string }> {
  const { db, caller } = ctx;
  if (input.timestamp && parseClock(input.timestamp) === null) return { ok: false, reason: `"${input.timestamp}" is not a time. Use a form like 0:42.` };
  if (input.target === 'video') {
    const scope = await clientCardScope(db, caller.clientId);
    const { data: card } = await db.schema('crm').from('content_cards').select('id, title, board_id').eq('id', input.id).maybeSingle();
    if (!card || !scope || !cardVisible(scope, card)) return { ok: false, reason: 'No video with that id on this client\'s boards. Check the overview.' };
    return { ok: true, title: card.title, where: 'Production' };
  }
  if (input.target === 'script') {
    const { data: s } = await db.from('portal_scripts').select('title, status, client_id').eq('id', input.id).maybeSingle();
    if (!s || s.client_id !== caller.clientId) return { ok: false, reason: 'No script with that id for this client. Check the overview.' };
    if (['approved', 'shot', 'published'].includes((s.status || '').toLowerCase())) return { ok: false, reason: 'That script is approved and locked; reopening goes through info@podlablv.com.' };
    return { ok: true, title: s.title, where: 'Scripts' };
  }
  const { data: a } = await db.from('portal_assets').select('title, status, client_id').eq('id', input.id).maybeSingle();
  if (!a || a.client_id !== caller.clientId) return { ok: false, reason: 'No deliverable with that id for this client. Check the overview.' };
  if ((a.status || '').toLowerCase() === 'approved') return { ok: false, reason: 'That deliverable is approved; reopening goes through info@podlablv.com.' };
  return { ok: true, title: a.title, where: 'Deliverables' };
}

/**
 * The approval policy. Runs on the server before any write: bad input is
 * denied automatically with a reason for the model; good input becomes a
 * confirm card whose description is written here, from the real rows.
 */
export function approvalPolicy(ctx: ToolContext) {
  return {
    edit_document: async (input: z.infer<typeof editDocumentInput>): Promise<ToolApprovalStatus> => {
      const doc = await currentDocument(ctx.db, ctx.caller.clientId);
      if (!doc) return { type: 'denied', reason: 'This client has no editable document (none published, or it is hosted elsewhere). Offer to flag the change for the team.' };
      if (!doc.ready) return { type: 'denied', reason: 'Document editing is not switched on yet (history table missing). Flag the change for the team instead.' };
      const res = applyEdits(doc.html, input.edits);
      if (!res.ok) {
        const near = 'near' in res && res.near.length ? ` Source near it:\n${res.near.map((n) => `---\n${n}`).join('\n')}` : '';
        return { type: 'denied', reason: `${res.message}${near}` };
      }
      return { type: 'user-approval', reason: `Change the Clarity Document: ${input.summary}` };
    },

    restore_document_version: async (input: z.infer<typeof restoreVersionInput>): Promise<ToolApprovalStatus> => {
      const { ready, versions } = await listVersions(ctx.db, ctx.caller.clientId);
      if (!ready) return { type: 'denied', reason: 'Document history is not switched on yet.' };
      const v = versions.find((x) => x.version_no === input.version_no);
      if (!v) return { type: 'denied', reason: `There is no version ${input.version_no}. Versions: ${versions.map((x) => x.version_no).join(', ') || 'none'}.` };
      if (versions[0]?.version_no === input.version_no) return { type: 'denied', reason: `Version ${input.version_no} is already current.` };
      return { type: 'user-approval', reason: `Bring back version ${v.version_no} of the Clarity Document (${v.note ?? 'no note'}). It becomes a new version; nothing is deleted.` };
    },

    update_profile: async (input: z.infer<typeof updateProfileInput>): Promise<ToolApprovalStatus> => {
      const check = validateProfilePatch(input);
      if (!check.ok) return { type: 'denied', reason: Object.entries(check.errors).map(([k, v]) => `${k}: ${v}`).join(' ') };
      const lines = Object.entries(check.patch).map(([k, v]) => `${FIELD_LABELS[k as ProfileField]} → ${v ?? '(cleared)'}`);
      return { type: 'user-approval', reason: `Update your profile: ${lines.join('; ')}` };
    },

    send_revision: async (input: z.infer<typeof sendRevisionInput>): Promise<ToolApprovalStatus> => {
      const t = await resolveRevisionTarget(ctx, input);
      if (!t.ok) return { type: 'denied', reason: t.reason };
      const at = input.timestamp ? ` at ${input.timestamp}` : '';
      return { type: 'user-approval', reason: `Send this note to ${SEND_LABEL[input.target]} on "${t.title}" (${t.where})${at}.` };
    },

    complete_action_item: async (input: z.infer<typeof completeActionItemInput>): Promise<ToolApprovalStatus> => {
      const { data } = await ctx.db.from('portal_action_items').select('title, status').eq('id', input.id).eq('client_id', ctx.caller.clientId).maybeSingle();
      if (!data) return { type: 'denied', reason: 'No action item with that id for this client.' };
      const done = input.done !== false;
      if ((data.status === 'done') === done) return { type: 'denied', reason: `"${data.title}" is already ${done ? 'done' : 'open'}.` };
      return { type: 'user-approval', reason: `${done ? 'Mark done' : 'Reopen'}: "${data.title}"` };
    },

    save_intake_answers: async (input: z.infer<typeof saveIntakeAnswersInput>): Promise<ToolApprovalStatus> => {
      const owned = await ownedQuestions(ctx.db, ctx.caller.clientId, input.answers.map((a) => a.item_id));
      const unknown = input.answers.filter((a) => !owned.has(a.item_id));
      if (unknown.length) return { type: 'denied', reason: `Not this client's question ids: ${unknown.map((a) => a.item_id).join(', ')}. Call read_intake for the right ids.` };
      if (input.submit) {
        const { questions } = await readIntake(ctx.db, ctx.caller.clientId);
        const filled = new Set([...questions.filter((q) => q.answer.trim()).map((q) => q.id), ...input.answers.map((a) => a.item_id)]);
        const left = questions.filter((q) => q.required && !filled.has(q.id));
        if (left.length) return { type: 'denied', reason: `Can't submit yet: ${left.length} required question(s) still empty: ${left.map((q) => q.prompt).slice(0, 4).join(' | ')}. Save without submit, then work through those.` };
      }
      const n = input.answers.length;
      return { type: 'user-approval', reason: `Save ${n} answer${n === 1 ? '' : 's'} to your intake${input.submit ? ' and submit it to PodLab' : ''}. You can edit any of them on the Intake page afterwards.` };
    },

    update_brand_kit: async (input: z.infer<typeof updateBrandKitInput>): Promise<ToolApprovalStatus> => {
      if (!input.colors && !input.fonts && input.notes === undefined) return { type: 'denied', reason: 'Nothing to change: pass colors, fonts or notes.' };
      const next = await nextBrandKit(ctx.db, ctx.caller.clientId, input);
      if ('error' in next) return { type: 'denied', reason: next.error };
      const parts = [
        input.colors ? `colors → ${next.kit.colors.map((c) => c.hex).join(', ') || 'none'}` : null,
        input.fonts ? `fonts → ${next.kit.fonts.map((f) => f.name).join(', ') || 'none'}` : null,
        input.notes !== undefined ? 'brand notes' : null,
      ].filter(Boolean);
      return { type: 'user-approval', reason: `Update your brand kit (${input.mode === 'replace' ? 'replace' : 'add to'}): ${parts.join('; ')}. Your editors see it straight away.` };
    },

    create_action_items: async (input: z.infer<typeof createActionItemsInput>): Promise<ToolApprovalStatus> => {
      const { count } = await ctx.db.from('portal_action_items').select('id', { count: 'exact', head: true }).eq('client_id', ctx.caller.clientId).neq('status', 'done');
      if ((count ?? 0) + input.items.length > 25) return { type: 'denied', reason: `They already have ${count} open action items. Don't pile on: close or merge some first, or add fewer.` };
      return { type: 'user-approval', reason: `Add ${input.items.length} ${input.pillar} action item${input.items.length === 1 ? '' : 's'} to your game plan (Action Items page).` };
    },

    draft_script: async (input: z.infer<typeof draftScriptInput>): Promise<ToolApprovalStatus> => {
      const { count } = await ctx.db.from('portal_scripts').select('id', { count: 'exact', head: true }).eq('client_id', ctx.caller.clientId).eq('status', 'draft').eq('source', 'tiptop');
      if ((count ?? 0) >= 10) return { type: 'denied', reason: 'There are already 10 TipTop drafts waiting on PodLab review. Tell the client they will be reviewed first.' };
      return { type: 'user-approval', reason: `Save "${input.title}" as a draft in Scripts. PodLab reviews it before it comes back to you to approve; nothing gets shot without that.` };
    },

    set_game_plan: async (input: z.infer<typeof setGamePlanInput>): Promise<ToolApprovalStatus> => {
      const { ready, plans } = await loadPlans(ctx.db, ctx.caller.clientId);
      if (!ready) return { type: 'denied', reason: 'The Game Plan is not switched on yet (migration). Put the actions on their list with create_action_items instead.' };
      if (input.target !== undefined && input.baseline !== undefined && input.target === input.baseline) return { type: 'denied', reason: 'Target equals baseline: there is nothing to move. Pick a real target.' };
      const was = plans.find((p) => p.pillar === input.pillar);
      return {
        type: 'user-approval',
        reason: was ? `Replace your ${input.pillar} plan ("${was.outcome}") with: ${input.outcome}.` : `Set your ${input.pillar} plan for the next 90 days: ${input.outcome}.`,
      };
    },

    check_in_game_plan: async (input: z.infer<typeof checkInGamePlanInput>): Promise<ToolApprovalStatus> => {
      const { ready, plans } = await loadPlans(ctx.db, ctx.caller.clientId);
      const p = plans.find((x) => x.pillar === input.pillar);
      if (!ready || !p) return { type: 'denied', reason: `There is no ${input.pillar} plan yet. Offer to set one with set_game_plan.` };
      const status = paceStatus({ ...p, current: input.current ?? p.current });
      const num = input.current !== null ? `${fmtNumber(input.current)}${p.metric ? ` ${p.metric}` : ''} of ${fmtNumber(p.target)}` : 'no new number';
      return { type: 'user-approval', reason: `Log this week's ${input.pillar} check-in: ${num}. On pace, that reads as "${status}".` };
    },

    plan_content: async (input: z.infer<typeof planContentInput>): Promise<ToolApprovalStatus> => {
      const { ready, items } = await loadContentPlan(ctx.db, ctx.caller.clientId);
      if (!ready) return { type: 'denied', reason: 'The content plan is not switched on yet (migration). Give them the plan in chat and offer to flag it for the team.' };
      const today = new Date().toISOString().slice(0, 10);
      const past = input.items.filter((i) => i.publish_on < today);
      if (past.length) return { type: 'denied', reason: `These dates are in the past: ${past.map((i) => i.publish_on).join(', ')}. Today is ${today}.` };
      const planned = items.filter((i) => i.status === 'planned' && i.publishOn >= today).length;
      if (planned + input.items.length > 60) return { type: 'denied', reason: `They already have ${planned} planned pieces ahead. Don't overplan: finish or skip some first.` };
      const cardIds = input.items.map((i) => i.card_id).filter((x): x is string => Boolean(x));
      const mine = await ownedCards(ctx.db, ctx.caller.clientId, cardIds);
      const bad = cardIds.filter((c) => !mine.has(c));
      if (bad.length) return { type: 'denied', reason: `Not this client's Production videos: ${bad.join(', ')}. Use video ids from the snapshot, or leave card_id off for new pieces.` };
      const taken = new Set(items.map((i) => i.crmCardId).filter(Boolean));
      const dup = cardIds.filter((c) => taken.has(c));
      if (dup.length) return { type: 'denied', reason: `Already scheduled in the plan: ${dup.join(', ')}. Don't schedule the same cut twice.` };
      const dates = input.items.map((i) => i.publish_on).sort();
      const shot = cardIds.length;
      return {
        type: 'user-approval',
        reason: `Add ${input.items.length} piece${input.items.length === 1 ? '' : 's'} to your content plan, ${dates[0]} to ${dates[dates.length - 1]}${shot ? `: ${shot} already shot (they post from your editors' cuts), ${input.items.length - shot} new to record` : ''}.`,
      };
    },

    update_content: async (input: z.infer<typeof updateContentInput>): Promise<ToolApprovalStatus> => {
      const owned = await ownedItems(ctx.db, ctx.caller.clientId, input.changes.map((c) => c.id));
      const unknown = input.changes.filter((c) => !owned.has(c.id));
      if (unknown.length) return { type: 'denied', reason: 'Some ids are not in this client\'s content plan. Use ids from the snapshot.' };
      const lines = input.changes.map((c) => {
        const it = owned.get(c.id)!;
        const bits = [c.status ? `→ ${c.status}` : null, c.publish_on ? `moved to ${c.publish_on}` : null, c.title ? 'retitled' : null, c.hook !== undefined ? 'new hook' : null].filter(Boolean);
        return `"${it.title}" ${bits.join(', ') || 'updated'}`;
      });
      return { type: 'user-approval', reason: `Update your content plan: ${lines.join('; ')}.` };
    },
  } satisfies Record<WriteTool, unknown>;
}

export function makeTools(ctx: ToolContext) {
  const { db, caller } = ctx;
  const fullName = caller.displayName !== caller.businessName ? caller.displayName : undefined;

  return {
    get_overview: tool({
      description: "Fresh snapshot of this client's account: Growth Chain, delivery phases, videos, scripts, deliverables, action items, intake, invoices, document. Use after a change, or when the snapshot in your instructions might be stale.",
      inputSchema: getOverviewInput,
      execute: async () => ({ overview: renderOverview(await buildOverview(db, caller)) }),
    }),

    go_to: tool({
      description: 'Show a button that takes the client to a portal page. Use whenever you point them somewhere.',
      inputSchema: goToInput,
      execute: async ({ page, script_id, label }) => {
        const p = PAGES[page];
        const href = page === 'scripts' && script_id ? `${p.href}/${script_id}` : p.href;
        return { kind: 'link' as const, href, label: label || `Open ${p.label}` };
      },
    }),

    booking_link: tool({
      description: 'Show a Calendly button, prefilled with their name and email. Strategy call with Hiram by default; the EssentialsLab clarity call when that is what they are booking.',
      inputSchema: bookingInput,
      execute: async ({ call }) => ({
        kind: 'booking' as const,
        href: bookingUrl(call, fullName, caller.email),
        label: call === 'clarity' ? 'Book your clarity call' : 'Book a strategy call',
      }),
    }),

    read_document: tool({
      description: 'Read the Clarity Document SOURCE so you can quote it or edit it. No arguments: the outline. heading: the raw HTML of that section. search: raw HTML snippets around a phrase. Always read before edit_document; copy find strings from what this returns.',
      inputSchema: readDocumentInput,
      execute: async ({ heading, search }) => {
        const doc = await currentDocument(db, caller.clientId);
        if (!doc) return { available: false, message: 'No editable document for this client (not published yet, or hosted elsewhere).' };
        const base = { available: true, version: doc.versionNo ?? 'as delivered', editable: doc.ready };
        if (heading) {
          const src = sectionSource(doc.html, heading);
          return src ? { ...base, heading, source: src } : { ...base, message: `No heading matching "${heading}".`, outline: outline(doc.html) };
        }
        if (search) {
          const hits = findSnippets(doc.html, search, 5);
          return hits.length ? { ...base, search, snippets: hits } : { ...base, message: `"${search}" does not appear in the document.` };
        }
        return { ...base, outline: outline(doc.html), characters: doc.html.length };
      },
    }),

    document_history: tool({
      description: 'List saved versions of the Clarity Document (newest first).',
      inputSchema: documentHistoryInput,
      execute: async () => {
        const { ready, versions } = await listVersions(db, caller.clientId);
        if (!ready) return { available: false, message: 'Version history is not switched on yet.' };
        return {
          available: true,
          versions: versions.slice(0, 20).map((v) => ({ version: v.version_no, by: v.author_name ?? v.author_kind, kind: v.author_kind, note: v.note, at: v.created_at })),
        };
      },
    }),

    edit_document: tool({
      description: "Change the client's Clarity Document directly: exact find/replace on the HTML source. Each find must occur exactly once. The client confirms on a card first; the change is saved as a new version they can restore from. Text only.",
      inputSchema: editDocumentInput,
      execute: async ({ edits, summary }) => {
        const doc = await currentDocument(db, caller.clientId);
        if (!doc || !doc.ready) return { saved: false, message: 'Document editing is not available for this account.' };
        // Re-applied against the document as it is now, in case it changed since the card was shown.
        const res = applyEdits(doc.html, edits);
        if (!res.ok) return { saved: false, message: res.message };
        const saved = await saveVersion(db, caller.clientId, res.html, { kind: 'ai', name: `TipTop for ${caller.displayName}` }, summary);
        if (!saved.ok) return { saved: false, message: saved.message };
        const diff = diffSummary(res.changes);
        await announceDocChange(db, caller, `edited by TipTop (v${saved.versionNo})`, `${summary}\n${diff}`);
        return {
          saved: true,
          version: saved.versionNo,
          changes: res.changes,
          page: PAGES.document.href,
        };
      },
    }),

    restore_document_version: tool({
      description: 'Bring back an earlier version of the Clarity Document. Creates a new version; nothing is deleted. The client confirms first.',
      inputSchema: restoreVersionInput,
      execute: async ({ version_no }) => {
        const res = await restoreVersion(db, caller.clientId, version_no, { kind: 'ai', name: `TipTop for ${caller.displayName}` });
        if (!res.ok) return { saved: false, message: res.message };
        await announceDocChange(db, caller, `restored to v${version_no} by TipTop`, `Saved as v${res.versionNo}.`);
        return { saved: true, version: res.versionNo, restoredFrom: version_no, page: PAGES.document.href };
      },
    }),

    update_profile: tool({
      description: 'Update their profile: first/last name, phone, business name, website, timezone. Only include fields they asked to change. The login email cannot be changed here.',
      inputSchema: updateProfileInput,
      execute: async (input) => {
        const check = validateProfilePatch(input);
        if (!check.ok) return { saved: false, errors: check.errors };
        const res = await saveProfile(db, caller.clientId, check.patch);
        if (!res.ok) return { saved: false, message: res.message };
        const all = [...res.saved, ...res.pending];
        if (all.length) {
          const lines = describeChange(check.patch, res.before, all);
          await announceProfileChange(db, caller, lines, res.pending, 'via TipTop');
        }
        return { saved: true, updated: res.saved, pendingForTeam: res.pending, unchanged: all.length === 0 };
      },
    }),

    send_revision: tool({
      description: 'Send a revision note to the team on one video (Production card), script or deliverable. Confirm the exact target and wording with the client in your message first; the client then confirms on a card.',
      inputSchema: sendRevisionInput,
      execute: async (input) => {
        const seconds = input.timestamp ? parseClock(input.timestamp) : null;
        const res =
          input.target === 'video'
            ? await sendVideoNote(db, caller, input.id, input.note, seconds)
            : input.target === 'script'
              ? await sendScriptRevision(db, caller, input.id, input.note, input.quote)
              : await sendDeliverableRevision(db, caller, input.id, input.note, seconds);
        if (!res.ok) return { sent: false, message: res.message };
        return { sent: true, ...res, page: PAGES[input.target === 'video' ? 'production' : input.target === 'script' ? 'scripts' : 'deliverables'].href };
      },
    }),

    complete_action_item: tool({
      description: 'Mark one of their action items done (or reopen it). The client confirms first.',
      inputSchema: completeActionItemInput,
      execute: async ({ id, done }) => {
        const res = await setActionItem(db, caller, id, done !== false);
        return res.ok ? { saved: true, title: res.title, done: res.done } : { saved: false, message: res.message };
      },
    }),

    recommend_product: tool({
      description: "Show ONE product button when it honestly fits: it unlocks a locked Growth Chain element they need (their constraint first), or they asked what would get them results. Once per conversation unless they ask. Never for something they already own.",
      inputSchema: recommendInput,
      execute: async ({ product, why, client_asked }) => {
        if (ctx.priorRecommendations > 0 && !client_asked) {
          return { shown: false, message: 'You already suggested something in this conversation. Do not push; answer what they ask.' };
        }
        const p = productByKey(product);
        if (!p) return { shown: false, message: 'Unknown product.' };
        const { data: owned } = await db.from('portal_client_products').select('product').eq('client_id', caller.clientId);
        if ((owned ?? []).some((r: { product: string }) => r.product === product)) {
          return { shown: false, message: `They already own ${p.name}.` };
        }
        const cta = productCta(p);
        return {
          shown: true,
          kind: p.buyOffer ? ('checkout' as const) : ('call' as const),
          product: p.name,
          price: p.price ?? null,
          why,
          href: p.buyOffer ? cta.href : bookingUrl('strategy', fullName, caller.email),
          label: cta.label,
        };
      },
    }),

    read_intake: tool({
      description: "The client's intake questionnaire: every question (id, section, required) with their current answer, and whether it's submitted. Read before drafting answers with save_intake_answers.",
      inputSchema: readIntakeInput,
      execute: async ({ section }) => readIntake(db, caller.clientId, section),
    }),

    read_client_file: tool({
      description: "Everything they've told PodLab: application and studio intake answers, portal intake answers, brand kit, what they bought, and their scripts list. Read before coaching, planning content, drafting answers or writing scripts, so you build from their real words and numbers.",
      inputSchema: readClientFileInput,
      execute: async () => ({ file: await readClientFile(db, caller) }),
    }),

    read_script: tool({
      description: 'The full current text of one of their scripts, by id. Use to answer questions about it, or as a reference for tone when drafting new ones.',
      inputSchema: readScriptInput,
      execute: async ({ id }) => (await readScript(db, caller.clientId, id)) ?? { error: 'No script with that id for this client.' },
    }),

    save_intake_answers: tool({
      description: 'Save answers to their intake questions (and optionally submit it). Section co-pilot: interview them one question at a time, draft each answer from what they say plus their file, read it back, then save a batch. The client confirms on a card first.',
      inputSchema: saveIntakeAnswersInput,
      execute: async ({ answers, submit }) => {
        const res = await saveIntakeAnswers(db, caller, answers, Boolean(submit));
        return { saved: true, answersSaved: res.saved, submitted: res.submitted, requiredLeft: res.requiredLeft, page: PAGES.intake.href };
      },
    }),

    update_brand_kit: tool({
      description: 'Set their brand colors (hex), fonts (name + what it is used for) and brand notes on the Brand page. Merge by default. Only use colors and fonts they gave you or that are in their file; never guess hex codes. The client confirms first.',
      inputSchema: updateBrandKitInput,
      execute: async (input) => ({ saved: true, ...(await saveBrandKit(db, caller, input)), page: PAGES.brand.href }),
    }),

    create_action_items: tool({
      description: 'Put the game plan into their Action Items: up to 8 finishable, verb-first actions under one pillar (People, Operations, Sales, Marketing, Content), each with effort and an agreed due date. Agree the list with them in chat first; the client confirms on a card.',
      inputSchema: createActionItemsInput,
      execute: async ({ pillar, items, coaching }) => ({ saved: true, ...(await createActionItems(db, caller, pillar, items, coaching)), page: PAGES.actions.href }),
    }),

    set_game_plan: tool({
      description: 'Set (or reset) one pillar of their 90-day Game Plan: the outcome as a number, what is counted, baseline, target, finish line, and three priorities in order, plus the coaching shown on the card. Then put this week\'s moves on their list with create_action_items. The client confirms first.',
      inputSchema: setGamePlanInput,
      execute: async ({ coaching: _coaching, ...plan }) => ({ saved: true, plan: await setPlan(db, caller, plan), page: PAGES.plan.href }),
    }),

    check_in_game_plan: tool({
      description: "The weekly check-in on one pillar: the number now and one or two lines on what moved. Status (on track / at risk / off track / done) follows pace automatically. Ask for the number first; never invent it. The client confirms first.",
      inputSchema: checkInGamePlanInput,
      execute: async ({ pillar, current, note }) => ({ saved: true, plan: await checkIn(db, caller, pillar, current, note), page: PAGES.plan.href }),
    }),

    plan_content: tool({
      description: 'Lay out their content calendar: up to 24 pieces, each with a date, one of their pillars, a format, a title, the hook (first line), its job (attract / educate / convert / retain) and a CTA, plus coaching shown on the card. Agree the pillars and a cadence they can keep first. The client confirms.',
      inputSchema: planContentInput,
      execute: async ({ items }) => ({ saved: true, ...(await addContentItems(db, caller, items)), page: PAGES.content.href }),
    }),

    update_content: tool({
      description: 'Change pieces in their content plan: mark recorded (the team then sends it to the editors), posted or skipped, move a date, retitle, or rewrite the hook. Scripted and in-edit are set by the system. The client confirms.',
      inputSchema: updateContentInput,
      execute: async ({ changes }) => ({ saved: true, ...(await updateContentItems(db, caller, changes)), page: PAGES.content.href }),
    }),

    draft_script: tool({
      description: 'Save a script you wrote with them (hook, FAQ, short, social, ad, VSL, email, founder story) as a DRAFT in Scripts. PodLab reviews it before it goes to them for approval. Build it from their file and their words; follow the voice rules. The client confirms first.',
      inputSchema: draftScriptInput,
      execute: async ({ content_item_id, ...input }) => {
        const res = await draftScript(db, caller, input);
        if (content_item_id) await linkScript(db, caller.clientId, content_item_id, res.scriptId);
        return { saved: true, ...res, page: PAGES.scripts.href };
      },
    }),

    flag_for_team: tool({
      description: "Post a note to the PodLab team in Slack (and the CRM timeline) for anything you can't answer or do: a delivery date, a question about billing, a change to an externally hosted document, a login email change, a complaint. Tell the client you flagged it.",
      inputSchema: flagInput,
      execute: async ({ summary, urgency }) => {
        const res = await flagForTeam(db, caller, summary, urgency ?? 'normal');
        return res.ok ? { flagged: true } : { flagged: false, message: res.message };
      },
    }),
  };
}

export type TipTopTools = ReturnType<typeof makeTools>;

/** Plain-text summary of an edit for the confirm card (no markup shown to a client). */
export function editPreview(edits: Array<{ find: string; replace: string }>): Array<{ before: string; after: string }> {
  return edits.map((e) => ({ before: plainText(e.find, 240), after: plainText(e.replace, 240) }));
}
