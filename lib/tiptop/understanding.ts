// TipTop's understanding of the business: the short, structured picture she
// builds by asking one question at a time (portal_tiptop_profile). It is shown
// to the client on the TipTop tab, so they always see what she is working
// from, and fed back to her in every snapshot.
//
// The keys are pure and shared with the page; the load/save are server only.

import type { SupabaseClient } from '@supabase/supabase-js';

export const FACT_KEYS = ['business', 'offer', 'audience', 'numbers', 'goal', 'constraint', 'team', 'channels', 'proof', 'voice'] as const;
export type FactKey = (typeof FACT_KEYS)[number];

export const FACT_LABELS: Record<FactKey, string> = {
  business: 'What they do',
  offer: 'Core offer and price',
  audience: 'Who they serve',
  numbers: 'Where the numbers are',
  goal: '90-day goal',
  constraint: "What's holding it back",
  team: 'Team',
  channels: 'Where clients come from',
  proof: 'Proof and results',
  voice: 'How they talk',
};

/** The order she asks in when a fact is missing: the money questions first. */
export const ASK_ORDER: FactKey[] = ['business', 'offer', 'audience', 'numbers', 'goal', 'constraint', 'channels', 'team', 'proof', 'voice'];

export interface Fact {
  value: string;
  at: string;
}
export type Facts = Partial<Record<FactKey, Fact>>;

export function isFactKey(k: string): k is FactKey {
  return (FACT_KEYS as readonly string[]).includes(k);
}

/** Parse whatever is stored, dropping unknown keys and empty values. Pure. */
export function parseFacts(raw: unknown): Facts {
  const out: Facts = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isFactKey(k) || !v || typeof v !== 'object') continue;
    const value = String((v as { value?: unknown }).value ?? '').trim();
    if (!value) continue;
    out[k] = { value: value.slice(0, 600), at: String((v as { at?: unknown }).at ?? '') };
  }
  return out;
}

/** Merge new answers in; an empty string clears a fact. Pure. */
export function mergeFacts(base: Facts, patch: Partial<Record<FactKey, string>>, at: string): Facts {
  const out: Facts = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (!isFactKey(k) || v === undefined) continue;
    const value = v.trim().slice(0, 600);
    if (value) out[k] = { value, at };
    else delete out[k];
  }
  return out;
}

/** The first missing fact, in ASK_ORDER. Null once the picture is complete. */
export function nextQuestion(f: Facts): FactKey | null {
  return ASK_ORDER.find((k) => !f[k]) ?? null;
}

export function renderFacts(f: Facts): string {
  const known = FACT_KEYS.filter((k) => f[k]);
  const missing = ASK_ORDER.filter((k) => !f[k]);
  const lines = known.map((k) => `  - ${k} (${FACT_LABELS[k]}): ${f[k]!.value}`);
  return `What you know about the business (your notes; the client sees them on the TipTop tab):\n${lines.length ? lines.join('\n') : '  (nothing yet)'}${
    missing.length ? `\n  Still unknown, ask in this order, one at a time: ${missing.join(', ')}.` : '\n  Picture complete; keep it current.'
  }`;
}

// ── server ───────────────────────────────────────────────────────────────

export async function loadFacts(db: SupabaseClient, clientId: string): Promise<{ ready: boolean; facts: Facts; updatedAt: string | null }> {
  const { data, error } = await db.from('portal_tiptop_profile').select('facts, updated_at').eq('client_id', clientId).maybeSingle();
  if (error) return { ready: false, facts: {}, updatedAt: null };
  return { ready: true, facts: parseFacts(data?.facts), updatedAt: data?.updated_at ?? null };
}

export async function saveFacts(db: SupabaseClient, clientId: string, patch: Partial<Record<FactKey, string>>, by: string): Promise<{ ok: true; facts: Facts } | { ok: false; message: string }> {
  const cur = await loadFacts(db, clientId);
  if (!cur.ready) return { ok: false, message: 'Notes are not switched on yet (migration 20261018_portal_v2_d).' };
  const now = new Date().toISOString();
  const facts = mergeFacts(cur.facts, patch, now);
  const { error } = await db.from('portal_tiptop_profile').upsert({ client_id: clientId, facts, updated_by: by, updated_at: now }, { onConflict: 'client_id' });
  if (error) return { ok: false, message: `save failed: ${error.message}` };
  return { ok: true, facts };
}
