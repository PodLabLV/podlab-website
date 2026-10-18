import type { SupabaseClient } from '@supabase/supabase-js';
import { isStaff, viewAsId } from '@/lib/portal-server';
import { beakerLink } from '@/lib/beaker-ref';
import {
  HOW_YOU_EARN,
  MINIMUM_PAYOUT_CENTS,
  PAYOUT_TERMS_VERSION,
  earnedByLead,
  likeExact,
  moneyTotals,
  nextPayoutDate,
  payoutLine,
  personName,
  plainStatus,
  termsCurrent,
  type BeakerPayload,
  type LedgerRow,
  type PayoutRow,
  type W9Status,
} from '@/lib/portal/beaker-view';

/**
 * Portal v2 track E: who is a Beaker, and their numbers. Server-only (service role).
 *
 * A Beaker is an approved row in crm.affiliates (kind 'affiliate'; JV partners
 * are paid under their own agreement and stay in the CRM). The signed-in
 * portal user is matched to it, in order, by:
 *   1. crm.affiliates.profile_id = their auth user id. Approving a Beaker in
 *      the CRM creates (or reuses) this login, so it's the strong link;
 *   2. their login email, only once that email is confirmed;
 *   3. for an account owner, their portal_clients.email (how /portal/referrals
 *      has always matched clients who are Beakers).
 * The affiliate is never taken from the request: only from the token.
 *
 * A staff "view as client" preview resolves the viewed client's Beaker record,
 * read-only. A teammate (portal_client_members) only ever matches their own
 * login, never the owner's.
 */

export interface BeakerAffiliate {
  id: string;
  beaker_id: string;
  full_name: string;
  email: string;
  status: string;
  kind: string | null;
  profile_id: string | null;
  whop_user_id: string | null;
  whop_username: string | null;
  w9_status: string;
  terms_version: string | null;
  agreement_version: string | null;
  auto_payout: boolean | null;
}

export interface BeakerIdentity {
  affiliate: BeakerAffiliate;
  /** The portal client this person owns, if any: where their notifications go. */
  clientId: string | null;
  clientCrmLeadId: string | null;
  readOnly: boolean;
}

const AFF_COLS = 'id, beaker_id, full_name, email, status, kind, profile_id, whop_user_id, whop_username, w9_status, terms_version, agreement_version, auto_payout';


const isBeakerRow = (a: BeakerAffiliate | null | undefined): a is BeakerAffiliate => Boolean(a && a.status === 'approved' && a.kind !== 'jv_partner');

export async function findAffiliate(db: SupabaseClient, by: { userId?: string | null; emails?: string[] }): Promise<BeakerAffiliate | null> {
  const crm = db.schema('crm');
  if (by.userId) {
    const { data } = await crm.from('affiliates').select(AFF_COLS).eq('profile_id', by.userId).maybeSingle();
    if (isBeakerRow(data as BeakerAffiliate | null)) return data as BeakerAffiliate;
  }
  for (const e of [...new Set((by.emails ?? []).map((x) => x.trim().toLowerCase()).filter((x) => x.includes('@')))]) {
    const { data } = await crm.from('affiliates').select(AFF_COLS).ilike('email', likeExact(e)).limit(1).maybeSingle();
    if (isBeakerRow(data as BeakerAffiliate | null)) return data as BeakerAffiliate;
  }
  return null;
}

/** The signed-in Beaker, or null (not signed in, not a Beaker, or a write in a staff preview). */
export async function resolveBeaker(req: Request, db: SupabaseClient): Promise<BeakerIdentity | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data: u, error } = await db.auth.getUser(token);
  const user = u?.user;
  if (error || !user) return null;

  const viewAs = viewAsId(req);
  if (viewAs) {
    if (!['GET', 'HEAD'].includes(req.method) || !(await isStaff(db, user))) return null;
    const { data: c } = await db.from('portal_clients').select('id, email, user_id, crm_lead_id').eq('id', viewAs).maybeSingle();
    if (!c) return null;
    const affiliate = await findAffiliate(db, { userId: (c.user_id as string | null) ?? null, emails: [c.email as string] });
    return affiliate ? { affiliate, clientId: c.id as string, clientCrmLeadId: (c.crm_lead_id as string | null) ?? null, readOnly: true } : null;
  }

  const { data: owned } = await db.from('portal_clients').select('id, email, crm_lead_id').eq('user_id', user.id).maybeSingle();
  const emails = [user.email_confirmed_at ? user.email : null, owned?.email as string | undefined].filter((e): e is string => Boolean(e));
  const affiliate = await findAffiliate(db, { userId: user.id, emails });
  if (!affiliate) return null;
  return { affiliate, clientId: (owned?.id as string | undefined) ?? null, clientCrmLeadId: (owned?.crm_lead_id as string | null) ?? null, readOnly: false };
}

/** Everything the Beaker tab shows, read straight from the CRM tables and scoped to this affiliate. */
export async function loadBeaker(db: SupabaseClient, id: BeakerIdentity, now = new Date()): Promise<BeakerPayload> {
  const a = id.affiliate;
  const crm = db.schema('crm');
  const [ledgerRes, payoutRes, leadRes] = await Promise.all([
    crm
      .from('affiliate_commission_ledger')
      .select('id, lead_id, lead_name, kind, amount_cents, effective_status, hold_until, paid_at_source, payout_id, created_at')
      .eq('affiliate_id', a.id)
      .order('created_at', { ascending: false })
      .limit(500),
    crm.from('affiliate_payouts').select('id, amount_cents, period_label, method, sent_at').eq('affiliate_id', a.id).eq('status', 'sent').order('sent_at', { ascending: false }).limit(50),
    crm.from('leads').select('id, name, stage, created_at').eq('affiliate_id', a.id).order('created_at', { ascending: false }).limit(200),
  ]);
  for (const r of [ledgerRes, payoutRes, leadRes]) if (r.error) throw new Error(r.error.message);

  const ledger = (ledgerRes.data ?? []) as LedgerRow[];
  const payouts = (payoutRes.data ?? []) as PayoutRow[];
  const leads = (leadRes.data ?? []) as Array<{ id: string; name: string | null; stage: string | null; created_at: string }>;

  const totals = moneyTotals(ledger, payouts);
  const byLead = earnedByLead(ledger);
  const setup = {
    whopLinked: Boolean(a.whop_user_id),
    whopUsername: a.whop_username,
    termsCurrent: termsCurrent(a),
    termsVersion: PAYOUT_TERMS_VERSION,
    w9: (['missing', 'received', 'verified'].includes(a.w9_status) ? a.w9_status : 'missing') as W9Status,
  };
  const nextPayout = nextPayoutDate(now);

  return {
    beaker: true,
    readOnly: id.readOnly,
    affiliate: { beakerId: a.beaker_id, name: a.full_name },
    link: beakerLink(a.beaker_id) ?? `https://podlablv.com/?ref=${encodeURIComponent(a.beaker_id)}`,
    howYouEarn: HOW_YOU_EARN,
    referrals: leads.map((l) => {
      const earned = byLead.get(l.id) ?? 0;
      return { id: l.id, name: personName(l.name), status: plainStatus(l.stage, earned), since: l.created_at, earnedCents: earned };
    }),
    money: { ...totals, nextPayout, minimumCents: MINIMUM_PAYOUT_CENTS, line: payoutLine(totals, setup, nextPayout), autoPayout: Boolean(a.auto_payout) },
    setup,
    payouts: payouts.map((p) => ({
      id: p.id,
      amountCents: Number(p.amount_cents) || 0,
      label: p.method === 'credit' ? 'Turned into PodLab credit' : 'Paid to your Whop account',
      sentAt: p.sent_at,
      credit: p.method === 'credit',
    })),
    canUseAsCredit: Boolean(id.clientId && id.clientCrmLeadId && !id.readOnly),
  };
}
