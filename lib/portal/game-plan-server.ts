import type { SupabaseClient } from '@supabase/supabase-js';
import { logToCrm, notifySlack, type PortalCaller } from '@/lib/portal-server';
import { recordActivity } from '@/lib/portal/server';
import { paceStatus, PILLARS, type GamePlan, type Pillar, type PlanStatus } from '@/lib/portal/game-plan';

/** Server half of the Game Plan: reads and the two writes (set a plan, check in). */

interface Row {
  id: string;
  pillar: Pillar;
  outcome: string;
  metric: string | null;
  baseline: number | string | null;
  target: number | string | null;
  current: number | string | null;
  due_on: string | null;
  priorities: unknown;
  status: PlanStatus;
  last_check_in_at: string | null;
  last_check_in: string | null;
  created_at: string;
  updated_at: string;
}

const num = (v: number | string | null): number | null => (v === null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

function toPlan(r: Row): GamePlan {
  return {
    id: r.id,
    pillar: r.pillar,
    outcome: r.outcome,
    metric: r.metric,
    baseline: num(r.baseline),
    target: num(r.target),
    current: num(r.current),
    dueOn: r.due_on,
    priorities: Array.isArray(r.priorities) ? (r.priorities as unknown[]).map(String).slice(0, 5) : [],
    status: r.status,
    lastCheckInAt: r.last_check_in_at,
    lastCheckIn: r.last_check_in,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** `ready: false` means the migration hasn't run; pages say so instead of erroring. */
export async function loadPlans(db: SupabaseClient, clientId: string): Promise<{ ready: boolean; plans: GamePlan[] }> {
  const { data, error } = await db.from('portal_game_plans').select('*').eq('client_id', clientId);
  if (error) return { ready: false, plans: [] };
  const plans = ((data ?? []) as Row[]).map(toPlan);
  plans.sort((a, b) => PILLARS.indexOf(a.pillar) - PILLARS.indexOf(b.pillar));
  return { ready: true, plans };
}

export interface PlanInput {
  pillar: Pillar;
  outcome: string;
  metric?: string;
  baseline?: number;
  target?: number;
  due_on?: string;
  priorities: string[];
}

/** Set (or reset) a pillar's plan. Keeps the original start date so pace stays honest. */
export async function setPlan(db: SupabaseClient, caller: PortalCaller, p: PlanInput): Promise<GamePlan> {
  const now = new Date().toISOString();
  const { data: existing } = await db.from('portal_game_plans').select('id, current').eq('client_id', caller.clientId).eq('pillar', p.pillar).maybeSingle();
  const row = {
    client_id: caller.clientId,
    pillar: p.pillar,
    outcome: p.outcome,
    metric: p.metric || null,
    baseline: p.baseline ?? null,
    target: p.target ?? null,
    // A new plan starts at its baseline; resetting keeps the latest reading.
    current: existing ? (existing.current ?? p.baseline ?? null) : p.baseline ?? null,
    due_on: p.due_on || null,
    priorities: p.priorities.slice(0, 5),
    status: 'on track' as PlanStatus,
    updated_by: `${caller.displayName} (with TipTop)`,
    updated_at: now,
  };
  const { data, error } = await db.from('portal_game_plans').upsert(row, { onConflict: 'client_id,pillar' }).select('*').single();
  if (error || !data) throw new Error(`game plan save failed: ${error?.message}`);
  await Promise.all([
    recordActivity(db, caller.clientId, 'update', `${p.pillar} game plan ${existing ? 'updated' : 'set'}: ${p.outcome}`),
    logToCrm(db, caller, `${existing ? 'Updated' : 'Set'} their ${p.pillar} 90-day game plan with TipTop: ${p.outcome}`),
  ]);
  return toPlan(data as Row);
}

/** The weekly check-in: the latest number and one line on how it's going. Status follows pace. */
export async function checkIn(db: SupabaseClient, caller: PortalCaller, pillar: Pillar, current: number | null, note: string): Promise<GamePlan> {
  const { data: plan } = await db.from('portal_game_plans').select('*').eq('client_id', caller.clientId).eq('pillar', pillar).maybeSingle();
  if (!plan) throw new Error(`No ${pillar} plan yet.`);
  const p = toPlan(plan as Row);
  const next = { ...p, current: current ?? p.current };
  const status = paceStatus(next);
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('portal_game_plans')
    .update({ current: next.current, status, last_check_in_at: now, last_check_in: note.slice(0, 500), updated_at: now })
    .eq('id', p.id)
    .select('*')
    .single();
  if (error || !data) throw new Error(`check-in failed: ${error?.message}`);
  const moved = current !== null && p.current !== null ? ` (${p.current} → ${current})` : current !== null ? ` (${current})` : '';
  await Promise.all([
    logToCrm(db, caller, `Weekly check-in, ${pillar}: ${status}${moved}. ${note.slice(0, 200)}`),
    // The team hears when a plan slips, not every week it's fine.
    status === 'off track' || (status === 'at risk' && p.status === 'on track')
      ? notifySlack(`*Game plan ${status}* · ${caller.businessName} · ${pillar}: "${p.outcome}"${moved}\n> ${note.slice(0, 300)}`)
      : status === 'done'
        ? notifySlack(`*Game plan hit* · ${caller.businessName} · ${pillar}: "${p.outcome}"${moved}`)
        : Promise.resolve(),
  ]);
  return toPlan(data as Row);
}
