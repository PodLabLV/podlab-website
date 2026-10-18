// TipTop's weekly check-in, the I/O half (cron: /api/cron/tiptop-checkin).
//
// For each active client with a live Game Plan or open action items:
//   1. append an opening message from TipTop to their thread
//      (portal_tiptop_threads), once per ISO week (message id checkin-<week>);
//   2. write a 'waiting' notification (ref checkin:<week>) that the delivery
//      cron emails / texts, and close last week's if it's still open.
// The notification resolves when they reply to her (chat route) or log a
// check-in. dry: computes everything, writes nothing.

import type { SupabaseClient } from '@supabase/supabase-js';
import { reportError } from '@/lib/alerts';
import { loadPlans } from '@/lib/portal/game-plan-server';
import { notify } from '@/lib/portal/notify';
import { LIMITS } from './schema';
import { buildCheckin, localDate, wantsCheckin, weekKey, type CheckinItem } from './checkin';

export interface CheckinResult {
  clientId: string;
  businessName: string;
  outcome: 'seeded' | 'would-seed' | 'already' | 'nothing-to-check' | 'failed';
  title?: string;
  body?: string;
  message?: string;
  error?: string;
}

export const checkinRef = (week: string) => `checkin:${week}`;
export const checkinMessageId = (week: string) => `checkin-${week}`;

interface ClientRow {
  id: string;
  business_name: string;
  first_name: string | null;
  timezone: string | null;
}

export async function openItems(db: SupabaseClient, clientId: string): Promise<CheckinItem[]> {
  // select('*') so a missing due_on column reads as "no due date" rather than failing.
  const { data, error } = await db.from('portal_action_items').select('*').eq('client_id', clientId).order('sort_order');
  if (error) throw new Error(`action items: ${error.message}`);
  return ((data ?? []) as Array<{ id: string; title: string; status: string | null; due_on?: string | null }>)
    .filter((r) => (r.status ?? 'open') !== 'done')
    .map((r) => ({ id: r.id, title: r.title, dueOn: r.due_on ?? null }));
}

export async function runCheckin(
  db: SupabaseClient,
  opts: { dry?: boolean; clientId?: string; now?: number } = {},
): Promise<{ week: string; eligible: number; results: CheckinResult[] }> {
  const now = opts.now ?? Date.now();
  const week = weekKey(now);

  let q = db.from('portal_clients').select('id, business_name, first_name, timezone').eq('stage', 'active').not('user_id', 'is', null);
  if (opts.clientId) q = q.eq('id', opts.clientId);
  const { data, error } = await q;
  if (error) throw new Error(`clients: ${error.message}`);
  const clients = (data ?? []) as ClientRow[];

  const results: CheckinResult[] = [];
  for (const c of clients) {
    const base = { clientId: c.id, businessName: c.business_name };
    try {
      const [{ plans }, items] = await Promise.all([loadPlans(db, c.id), openItems(db, c.id)]);
      if (!wantsCheckin(plans, items)) {
        results.push({ ...base, outcome: 'nothing-to-check' });
        continue;
      }
      const ck = buildCheckin({ firstName: c.first_name, plans, openItems: items, today: localDate(now, c.timezone || undefined), now });

      const { data: thread, error: tErr } = await db.from('portal_tiptop_threads').select('messages').eq('client_id', c.id).maybeSingle();
      if (tErr) throw new Error(`thread: ${tErr.message}`);
      const messages = Array.isArray(thread?.messages) ? (thread.messages as Array<{ id?: string }>) : [];
      if (messages.some((m) => m?.id === checkinMessageId(week))) {
        results.push({ ...base, outcome: 'already', title: ck.title });
        continue;
      }
      if (opts.dry) {
        results.push({ ...base, outcome: 'would-seed', title: ck.title, body: ck.body, message: ck.message });
        continue;
      }

      const next = [...messages, { id: checkinMessageId(week), role: 'assistant', parts: [{ type: 'text', text: ck.message }] }].slice(-LIMITS.maxMessages);
      const { error: wErr } = await db
        .from('portal_tiptop_threads')
        .upsert({ client_id: c.id, messages: next, updated_at: new Date(now).toISOString() }, { onConflict: 'client_id' });
      if (wErr) throw new Error(`thread write: ${wErr.message}`);

      // Last week's check-in is stale now; this week's replaces it on the hot potato.
      await db
        .from('portal_notifications')
        .update({ resolved_at: new Date(now).toISOString() })
        .eq('client_id', c.id)
        .eq('kind', 'checkin')
        .neq('ref', checkinRef(week))
        .is('resolved_at', null);
      await notify(c.id, { kind: 'checkin', direction: 'waiting', title: ck.title, body: ck.body, link: '/portal/tiptop', ref: checkinRef(week) });
      results.push({ ...base, outcome: 'seeded', title: ck.title, body: ck.body });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      reportError('[tiptop-checkin] client failed', c.id, message);
      results.push({ ...base, outcome: 'failed', error: message });
    }
  }
  return { week, eligible: clients.length, results };
}
