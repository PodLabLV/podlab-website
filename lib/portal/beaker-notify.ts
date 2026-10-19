import type { SupabaseClient } from '@supabase/supabase-js';
import { notify, notifyUser, type NotifyInput } from '@/lib/portal/notify';
import { likeExact, personName, plainStatus, shortDate, usd, type PlainStatus } from '@/lib/portal/beaker-view';

/**
 * Portal v2 track E: Beaker notifications. The events happen in the CRM (a
 * deal moves, the Whop webhook writes a commission, a payout run sends), which
 * this repo can't hook, so a cron reads what changed in the last few days and
 * writes one portal_notifications row per event. Every row has a ref
 * (`beaker:…`), and notify() upserts on (client_id, ref), so running it again,
 * or over an overlapping window, never notifies twice.
 *
 * Beakers with a client record get client rows; Beakers who only refer get rows on their login (user_id).
 * client_id is NOT NULL. Beakers with no client record are the documented gap
 * (docs/PORTAL-V2.md, "Track E as built").
 */

export interface LeadRow {
  id: string;
  name: string | null;
  stage: string | null;
  attributed_at: string | null;
}
export interface StageEvent {
  lead_id: string;
  to_stage: string | null;
  created_at: string;
}
export interface CommissionRow {
  id: string;
  lead_id: string | null;
  lead_name: string | null;
  kind: string;
  amount_cents: number;
  hold_until: string | null;
  created_at: string;
}
export interface SentPayout {
  id: string;
  amount_cents: number;
  method: string | null;
  sent_at: string | null;
}

const LEAD_TITLES: Record<Exclude<PlainStatus, 'submitted'>, (n: string) => string> = {
  talking: (n) => `${n} is talking with PodLab`,
  bought: (n) => `${n} became a PodLab client`,
  not_fit: (n) => `${n} didn't go ahead`,
};
const LEAD_BODY: Record<Exclude<PlainStatus, 'submitted'>, string> = {
  talking: "Your referral moved forward. Nothing for you to do; you'll hear when it changes again.",
  bought: 'You earn on what they pay. Each payment shows in Money once PodLab receives it.',
  not_fit: "It didn't go ahead this time. Thank you for sending them.",
};

/** The notifications a window of CRM activity should produce for one Beaker. Pure. */
export function planBeakerNotifications(input: {
  since: string;
  leads: LeadRow[];
  events: StageEvent[];
  commissions: CommissionRow[];
  payouts: SentPayout[];
}): NotifyInput[] {
  const out: NotifyInput[] = [];
  const names = new Map(input.leads.map((l) => [l.id, personName(l.name)]));
  const after = (t: string | null) => Boolean(t && t >= input.since);

  // Credited by their link (not the form, which notifies on submit).
  for (const l of input.leads) {
    if (!after(l.attributed_at)) continue;
    out.push({ kind: 'referral', direction: 'done', title: `New referral credited to you: ${personName(l.name)}`, body: 'They came in through your link. PodLab takes it from here.', link: '/portal/beaker#referrals', ref: `beaker:lead:${l.id}:credited` });
  }

  // Stage moves, by plain status: one row per lead per status, ever.
  const seen = new Set<string>();
  for (const e of [...input.events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!after(e.created_at) || !names.has(e.lead_id)) continue;
    const s = plainStatus(e.to_stage);
    if (s === 'submitted') continue;
    const ref = `beaker:lead:${e.lead_id}:${s}`;
    if (seen.has(ref)) continue;
    seen.add(ref);
    out.push({ kind: 'referral', direction: 'done', title: LEAD_TITLES[s](names.get(e.lead_id)!), body: LEAD_BODY[s], link: '/portal/beaker#referrals', ref });
  }

  for (const c of input.commissions) {
    if (!after(c.created_at) || !c.amount_cents) continue;
    const who = personName(c.lead_name ?? (c.lead_id ? names.get(c.lead_id) : null));
    if (c.amount_cents > 0) {
      out.push({
        kind: 'payment',
        direction: 'done',
        title: `You earned ${usd(c.amount_cents)} from ${who}`,
        body: c.hold_until ? `It clears the 45-day hold on ${shortDate(c.hold_until, 'America/Los_Angeles')}, then goes out on the next payout.` : 'It shows in Money on your Beaker tab.',
        link: '/portal/beaker#money',
        ref: `beaker:comm:${c.id}`,
      });
    } else {
      out.push({ kind: 'payment', direction: 'done', title: `A refund took ${usd(-c.amount_cents)} off your Beaker earnings`, body: `${who} was refunded, so that part of the commission comes off a later payout.`, link: '/portal/beaker#money', ref: `beaker:comm:${c.id}` });
    }
  }

  for (const p of input.payouts) {
    if (!after(p.sent_at) || p.amount_cents <= 0) continue;
    const credit = p.method === 'credit';
    out.push({
      kind: 'payment',
      direction: 'done',
      title: credit ? `${usd(p.amount_cents)} of Beaker earnings is now PodLab credit` : `${usd(p.amount_cents)} paid to your Whop account`,
      body: credit ? 'It comes off your next PodLab invoice.' : 'Withdraw it to your bank from Whop whenever you like. PodLab emails you the statement.',
      link: '/portal/beaker#money',
      ref: `beaker:payout:${p.id}`,
    });
  }
  return out;
}

export interface BeakerNotifyResult {
  since: string;
  dry: boolean;
  affiliates: number;
  /** Beakers with nobody to notify (no portal client record): the schema gap. */
  noPortalIdentity: string[];
  planned: Array<{ beakerId: string; clientId: string; rows: NotifyInput[] }>;
  written: number;
}

/** One pass over every approved Beaker. `dry` plans and writes nothing. */
export async function runBeakerNotify(db: SupabaseClient, opts: { dry: boolean; days?: number; now?: Date } = { dry: true }): Promise<BeakerNotifyResult> {
  const now = opts.now ?? new Date();
  const since = new Date(now.getTime() - (opts.days ?? 3) * 86_400_000).toISOString();
  const crm = db.schema('crm');
  const { data: affs, error } = await crm.from('affiliates').select('id, beaker_id, email, profile_id').eq('status', 'approved').neq('kind', 'jv_partner');
  if (error) throw new Error(error.message);

  const result: BeakerNotifyResult = { since, dry: opts.dry, affiliates: affs?.length ?? 0, noPortalIdentity: [], planned: [], written: 0 };
  for (const a of (affs ?? []) as Array<{ id: string; beaker_id: string; email: string; profile_id: string | null }>) {
    // Their own client account: the login the CRM gave them, else the client email they're under.
    const byLogin = a.profile_id ? await db.from('portal_clients').select('id').eq('user_id', a.profile_id).limit(1) : { data: [] };
    const byEmail = byLogin.data?.length ? byLogin : await db.from('portal_clients').select('id').ilike('email', likeExact(a.email)).limit(1);
    const clientId = (byEmail.data?.[0]?.id as string | undefined) ?? null;
    // No client record: their own login gets the rows instead (20261019 user notifications).
    const userId = !clientId && a.profile_id ? String(a.profile_id) : null;
    if (!clientId && !userId) {
      result.noPortalIdentity.push(a.beaker_id);
      continue;
    }

    const [leads, commissions, payouts] = await Promise.all([
      crm.from('leads').select('id, name, stage, attributed_at').eq('affiliate_id', a.id).limit(500),
      crm.from('affiliate_commission_ledger').select('id, lead_id, lead_name, kind, amount_cents, hold_until, created_at').eq('affiliate_id', a.id).gte('created_at', since),
      crm.from('affiliate_payouts').select('id, amount_cents, method, sent_at').eq('affiliate_id', a.id).eq('status', 'sent').gte('sent_at', since),
    ]);
    const leadRows = (leads.data ?? []) as LeadRow[];
    const ids = leadRows.map((l) => l.id);
    const events = ids.length ? await crm.from('pipeline_events').select('lead_id, to_stage, created_at').in('lead_id', ids).gte('created_at', since) : { data: [] };

    const rows = planBeakerNotifications({
      since,
      leads: leadRows,
      events: (events.data ?? []) as StageEvent[],
      commissions: (commissions.data ?? []) as CommissionRow[],
      payouts: (payouts.data ?? []) as SentPayout[],
    });
    if (!rows.length) continue;
    result.planned.push({ beakerId: a.beaker_id, clientId: clientId || `user:${userId}`, rows });
    if (!opts.dry) {
      for (const r of rows) {
        const ok = clientId ? await notify(clientId, r, db) : await notifyUser(userId!, r, db);
        if (ok) result.written += 1;
      }
    }
  }
  return result;
}
