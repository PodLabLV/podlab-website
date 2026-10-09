// TipTop as business guide: the reads that let her work from the client's real
// file, and the writes behind the section co-pilot, the game plan and script
// drafts. Server only. Every function is scoped to the caller the route
// resolved; ids from the model are re-checked against that client.

import type { SupabaseClient } from '@supabase/supabase-js';
import { notifySlack, logToCrm, type PortalCaller } from '@/lib/portal-server';
import { recordActivity } from '@/lib/portal/server';
import { SITE_URL } from '@/lib/portal-email';
import { runtimeSeconds, wordCount } from '@/lib/portal/scripts';
import { validateKit, type BrandColor, type BrandFont } from '@/lib/portal/brand';
import { loadBrand } from '@/lib/portal/brand-server';

// ── intake ───────────────────────────────────────────────────────────────

export interface IntakeQuestion {
  id: string;
  section: string;
  prompt: string;
  required: boolean;
  answer: string;
}

export async function readIntake(db: SupabaseClient, clientId: string, section?: string): Promise<{ submitted: boolean; questions: IntakeQuestion[] }> {
  const [items, answers, kickoff] = await Promise.all([
    db.from('portal_intake_items').select('id, section, prompt, required, sort_order').eq('client_id', clientId).order('sort_order'),
    db.from('portal_intake_answers').select('item_id, value').eq('client_id', clientId),
    db.from('portal_delivery_phases').select('status').eq('client_id', clientId).eq('sort_order', 1).maybeSingle(),
  ]);
  const byItem = new Map((answers.data ?? []).map((a: { item_id: string; value: string | null }) => [a.item_id, a.value ?? '']));
  const questions = ((items.data ?? []) as Array<{ id: string; section: string | null; prompt: string; required: boolean | null }>)
    .map((i) => ({ id: i.id, section: i.section ?? 'General', prompt: i.prompt, required: Boolean(i.required), answer: byItem.get(i.id) ?? '' }))
    .filter((q) => !section || q.section.toLowerCase() === section.toLowerCase());
  return { submitted: kickoff.data?.status === 'done', questions };
}

/** Which of these ids are this client's questions. Used by the approval and the save. */
export async function ownedQuestions(db: SupabaseClient, clientId: string, ids: string[]): Promise<Map<string, string>> {
  const { data } = await db.from('portal_intake_items').select('id, prompt').eq('client_id', clientId).in('id', ids);
  return new Map((data ?? []).map((r: { id: string; prompt: string }) => [r.id, r.prompt]));
}

export async function saveIntakeAnswers(
  db: SupabaseClient,
  caller: PortalCaller,
  answers: Array<{ item_id: string; value: string }>,
  submit: boolean,
): Promise<{ saved: number; submitted: boolean; requiredLeft: number }> {
  const owned = await ownedQuestions(db, caller.clientId, answers.map((a) => a.item_id));
  const rows = answers
    .filter((a) => owned.has(a.item_id))
    .map((a) => ({ client_id: caller.clientId, item_id: a.item_id, value: a.value.slice(0, 8000), updated_at: new Date().toISOString() }));
  if (rows.length) {
    const { error } = await db.from('portal_intake_answers').upsert(rows, { onConflict: 'item_id' });
    if (error) throw new Error(`intake save failed: ${error.message}`);
  }
  const after = await readIntake(db, caller.clientId);
  const requiredLeft = after.questions.filter((q) => q.required && !q.answer.trim()).length;
  let submitted = after.submitted;
  if (submit && !submitted && requiredLeft === 0) {
    await db.from('portal_delivery_phases').update({ status: 'done', updated_at: new Date().toISOString() }).eq('client_id', caller.clientId).eq('sort_order', 1);
    submitted = true;
    const answered = after.questions.filter((q) => q.answer.trim()).length;
    await Promise.all([
      notifySlack(`*Intake submitted* - ${caller.businessName} (with TipTop)\n${answered} answers. Kickoff phase closed.`),
      logToCrm(db, caller, `Submitted the portal intake with TipTop (${answered} answers).`),
    ]);
  } else if (rows.length) {
    await logToCrm(db, caller, `TipTop saved ${rows.length} intake answer${rows.length === 1 ? '' : 's'} with them.`);
  }
  return { saved: rows.length, submitted, requiredLeft };
}

// ── the client's file ────────────────────────────────────────────────────

const LEAD_FIELDS: Array<[string, string]> = [
  ['business_name', 'Business'],
  ['business_description', 'What they do'],
  ['services_offered', 'Services'],
  ['location', 'Location'],
  ['years_in_business', 'Years in business'],
  ['annual_revenue', 'Annual revenue'],
  ['top_3_goals', 'Top three goals'],
  ['marketing_gap', 'Biggest marketing gap'],
  ['target_6mo', 'Where they want to be in six months'],
  ['biggest_blocker', 'Biggest blocker'],
  ['tried_already', 'Already tried'],
];

/** Everything they've told us, compact: application, intake answers, brand kit, scripts list. */
export async function readClientFile(db: SupabaseClient, caller: PortalCaller): Promise<string> {
  const L: string[] = [];
  if (caller.crmLeadId) {
    const { data: lead } = await db.schema('crm').from('leads').select('*').eq('id', caller.crmLeadId).maybeSingle();
    if (lead) {
      const lines = LEAD_FIELDS.map(([k, label]) => [label, lead[k]] as const)
        .filter(([, v]) => v !== null && v !== undefined && String(v).trim())
        .map(([label, v]) => `- ${label}: ${String(Array.isArray(v) ? v.join(', ') : v).slice(0, 600)}`);
      if (lines.length) L.push(`Application and studio intake:\n${lines.join('\n')}`);
    }
  }
  const intake = await readIntake(db, caller.clientId);
  const answered = intake.questions.filter((q) => q.answer.trim());
  if (answered.length) L.push(`Portal intake answers (${answered.length}/${intake.questions.length}):\n${answered.map((q) => `- ${q.prompt}: ${q.answer.slice(0, 500)}`).join('\n')}`);

  const brand = await loadBrand(db, caller.clientId, { sign: false });
  if (brand.ready) {
    L.push(
      `Brand kit: colors ${brand.kit.colors.map((c) => `${c.hex}${c.name ? ` ${c.name}` : ''}`).join(', ') || 'none'}; fonts ${brand.kit.fonts.map((f) => `${f.name}${f.use ? ` (${f.use})` : ''}`).join(', ') || 'none'}${brand.kit.notes ? `; notes: ${brand.kit.notes.slice(0, 600)}` : ''}.`,
    );
  }

  const { data: scripts } = await db.from('portal_scripts').select('id, title, kind, status').eq('client_id', caller.clientId).order('sort_order').limit(40);
  if (scripts?.length) L.push(`Scripts (read one with read_script):\n${scripts.map((s) => `- id=${s.id} "${s.title}" (${s.kind ?? 'script'}, ${s.status})`).join('\n')}`);

  const { data: products } = await db.from('portal_client_products').select('product').eq('client_id', caller.clientId);
  if (products?.length) L.push(`Bought: ${products.map((p: { product: string }) => p.product).join(', ')}.`);
  return L.join('\n\n') || 'Nothing on file yet beyond the overview.';
}

export async function readScript(db: SupabaseClient, clientId: string, id: string): Promise<{ title: string; kind: string | null; status: string; version: number; body: string } | null> {
  const { data: s } = await db.from('portal_scripts').select('id, title, kind, status, current_version, client_id').eq('id', id).maybeSingle();
  if (!s || s.client_id !== clientId) return null;
  const { data: v } = await db.from('portal_script_versions').select('body').eq('script_id', id).eq('version_no', s.current_version).maybeSingle();
  return { title: s.title, kind: s.kind, status: s.status, version: s.current_version, body: (v?.body ?? '').slice(0, 14000) };
}

// ── brand kit ────────────────────────────────────────────────────────────

export interface BrandKitPatch {
  colors?: BrandColor[];
  fonts?: BrandFont[];
  notes?: string;
  mode: 'merge' | 'replace';
}

/** The kit after applying the patch, validated. Pure apart from the read. */
export async function nextBrandKit(db: SupabaseClient, clientId: string, p: BrandKitPatch) {
  const current = await loadBrand(db, clientId, { sign: false });
  if (!current.ready) return { error: 'The Brand page is not switched on yet.' } as const;
  const merge = <T,>(base: T[], add: T[] | undefined, key: (x: T) => string): T[] => {
    if (!add) return base;
    if (p.mode === 'replace') return add;
    const out = [...base];
    for (const a of add) {
      const i = out.findIndex((b) => key(b) === key(a));
      if (i >= 0) out[i] = a;
      else out.push(a);
    }
    return out;
  };
  const res = validateKit({
    colors: merge(current.kit.colors, p.colors, (c) => c.hex.replace('#', '').toUpperCase()),
    fonts: merge(current.kit.fonts, p.fonts, (f) => f.name.toLowerCase()),
    notes: p.notes !== undefined ? (p.mode === 'merge' && current.kit.notes ? `${current.kit.notes}\n${p.notes}` : p.notes) : current.kit.notes,
  });
  return res.kit ? ({ kit: res.kit } as const) : ({ error: res.error ?? 'That kit is not valid.' } as const);
}

export async function saveBrandKit(db: SupabaseClient, caller: PortalCaller, p: BrandKitPatch): Promise<{ colors: number; fonts: number }> {
  const next = await nextBrandKit(db, caller.clientId, p);
  if ('error' in next) throw new Error(next.error);
  const { error } = await db
    .from('portal_brand_kits')
    .upsert({ client_id: caller.clientId, ...next.kit, notes: next.kit.notes || null, updated_by: `${caller.displayName} (with TipTop)`, updated_at: new Date().toISOString() }, { onConflict: 'client_id' });
  if (error) throw new Error(`brand kit save failed: ${error.message}`);
  await logToCrm(db, caller, 'Updated their brand colors, fonts and notes with TipTop.');
  return { colors: next.kit.colors.length, fonts: next.kit.fonts.length };
}

// ── game plan → action items ─────────────────────────────────────────────

export function dueLabel(due?: string): string {
  if (!due) return '';
  const d = new Date(`${due}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : `due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
}

export async function createActionItems(
  db: SupabaseClient,
  caller: PortalCaller,
  pillar: string,
  items: Array<{ title: string; detail: string; effort: string; due?: string }>,
  coaching = '',
): Promise<{ created: number }> {
  const { data: last } = await db.from('portal_action_items').select('sort_order').eq('client_id', caller.clientId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
  let sort = (last?.sort_order ?? 0) + 1;
  const rows = items.map((i) => ({
    client_id: caller.clientId,
    title: i.title,
    detail: i.detail || null,
    effort: [i.effort, dueLabel(i.due)].filter(Boolean).join(' · ') || null,
    source: `Game Plan · ${pillar}`,
    status: 'open',
    sort_order: sort++,
  }));
  const { error } = await db.from('portal_action_items').insert(rows);
  if (error) throw new Error(`action items failed: ${error.message}`);
  await Promise.all([
    recordActivity(db, caller.clientId, 'update', `Game plan (${pillar}): ${rows.length} new action item${rows.length === 1 ? '' : 's'}`),
    logToCrm(db, caller, `Built a ${pillar} game plan with TipTop${coaching ? ` (${coaching.replace(/\s+/g, ' ').slice(0, 240)})` : ''}: ${rows.map((r) => r.title).join('; ').slice(0, 400)}`),
  ]);
  return { created: rows.length };
}

// ── script drafts ────────────────────────────────────────────────────────

/**
 * A draft lands in Scripts as "Draft · Being written" (the team's turn) and
 * never goes to the client for approval until PodLab sends it from the client's
 * Manage page. Nothing TipTop writes gets shot without a human in between.
 */
export async function draftScript(
  db: SupabaseClient,
  caller: PortalCaller,
  d: { title: string; kind: string; body: string; note: string },
): Promise<{ scriptId: string }> {
  const { data: script, error } = await db
    .from('portal_scripts')
    .insert({ client_id: caller.clientId, title: d.title, kind: d.kind, source: 'tiptop', status: 'draft', current_version: 1 })
    .select('id')
    .single();
  if (error || !script) throw new Error(`script insert failed: ${error?.message}`);
  const { error: vErr } = await db.from('portal_script_versions').insert({
    script_id: script.id,
    client_id: caller.clientId,
    version_no: 1,
    body: d.body,
    word_count: wordCount(d.body),
    runtime_seconds: runtimeSeconds(d.body),
    author_name: 'TipTop',
    author_kind: 'ai',
    note: d.note || null,
  });
  if (vErr) {
    await db.from('portal_scripts').delete().eq('id', script.id);
    throw new Error(`script version failed: ${vErr.message}`);
  }
  await Promise.all([
    notifySlack(`*TipTop drafted a script* for ${caller.businessName}: "${d.title}" (${d.kind}, ${wordCount(d.body)} words)${d.note ? `\n> ${d.note}` : ''}\nReview and send it: ${SITE_URL}/portal/clients/${caller.clientId}`),
    logToCrm(db, caller, `TipTop drafted a ${d.kind} script with them: "${d.title}". Waiting on PodLab review.`),
  ]);
  return { scriptId: script.id };
}
