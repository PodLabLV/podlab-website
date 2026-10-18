/**
 * Portal v2 track E: the Beaker tab's plain-language layer. Pure, so the page,
 * the API, the notification cron and the tests agree on every word and number.
 *
 * Every rate, hold and limit comes from lib/affiliate-terms.ts (what Beakers
 * signed) or mirrors the CRM, which owns the money:
 *   - payout runs on the 1st and the 14th, Pacific   (podlab-crm src/app/api/beaker/portal nextRun, phase111)
 *   - $100 minimum, Whop only, W-9 first             (podlab-crm src/lib/payouts.ts §4.6–4.8)
 *   - payout terms version v2026.09.28               (podlab-crm PAYOUT_TERMS_VERSION)
 *   - 1099-NEC threshold $2,000 for 2026             (podlab-crm src/app/api/beaker/1099)
 */

import { BASE_RATE, HOLD_PERIOD_DAYS, MINIMUM_PAYOUT_USD, RECURRING_MAX_MONTHS } from '@/lib/affiliate-terms';

/** = podlab-crm src/lib/payouts.ts PAYOUT_TERMS_VERSION. */
export const PAYOUT_TERMS_VERSION = 'v2026.09.28';
export const MINIMUM_PAYOUT_CENTS = MINIMUM_PAYOUT_USD * 100;
/** 1099-NEC reporting threshold for payments made in 2026 (podlab-crm /api/beaker/1099). */
export const TAX_FORM_THRESHOLD_USD = 2000;

// ── referral status, in plain words ──────────────────────────────────────

export type PlainStatus = 'submitted' | 'talking' | 'bought' | 'not_fit';

export const STATUS_STEPS: Array<{ key: PlainStatus; label: string; means: string }> = [
  { key: 'submitted', label: 'Submitted', means: 'PodLab has them and reaches out next.' },
  { key: 'talking', label: 'Talking', means: 'PodLab is in conversation with them.' },
  { key: 'bought', label: 'Bought', means: 'They became a client. You earn on what they pay.' },
  { key: 'not_fit', label: 'Not a fit', means: "It didn't go ahead this time." },
];

export const STATUS_LABEL: Record<PlainStatus, string> = Object.fromEntries(STATUS_STEPS.map((s) => [s.key, s.label])) as Record<PlainStatus, string>;

// CRM stage keys (crm.pipeline_stages: role 'won' / 'dead', plus the entry and
// off-board stages). Matched upper-case; anything unknown and open reads as Talking.
const WON = new Set(['CLOSED WON', 'CLOSED-WON']);
const DEAD = new Set(['CLOSED LOST', 'CLOSED-LOST', 'DISQUALIFIED', 'DECLINED', 'NO-SHOW', 'EXPIRED']);
const NEW = new Set(['', 'NEW LEAD', 'PROSPECT', 'DATABASE ONLY', 'VSL-INVITED', 'S0-APPLIED']);

/** A CRM stage as a Beaker would say it. Money earned always reads as Bought. */
export function plainStatus(stage: string | null | undefined, earnedCents = 0): PlainStatus {
  const s = (stage ?? '').trim().toUpperCase();
  if (earnedCents > 0 || WON.has(s)) return 'bought';
  if (DEAD.has(s)) return 'not_fit';
  if (NEW.has(s)) return 'submitted';
  return 'talking';
}

// ── money ────────────────────────────────────────────────────────────────

export type LedgerStatus = 'held' | 'payable' | 'paid' | 'void' | 'disputed';

export interface LedgerRow {
  id: string;
  lead_id: string | null;
  lead_name: string | null;
  kind: string;
  amount_cents: number;
  effective_status: LedgerStatus | string;
  hold_until: string | null;
  paid_at_source: string | null;
  payout_id: string | null;
  created_at: string;
}

export interface PayoutRow {
  id: string;
  amount_cents: number;
  period_label: string | null;
  method: string | null;
  sent_at: string | null;
}

export interface MoneyTotals {
  /** Everything credited to you, minus refunds (void rows excluded). */
  earnedCents: number;
  /** Inside the 45-day hold (or held for a dispute). */
  onHoldCents: number;
  /** Cleared and not yet in a payout: goes out on the next run once setup is done. */
  readyCents: number;
  /** Sent to you: Whop transfers and earnings you turned into PodLab credit. */
  paidCents: number;
  /** When the next held payment clears, if any. */
  nextClearsOn: string | null;
}

export function moneyTotals(ledger: LedgerRow[], payouts: PayoutRow[]): MoneyTotals {
  const live = ledger.filter((r) => r.effective_status !== 'void');
  const sum = (rows: LedgerRow[]) => rows.reduce((t, r) => t + (Number(r.amount_cents) || 0), 0);
  const held = live.filter((r) => r.effective_status === 'held' || r.effective_status === 'disputed');
  const clears = held
    .map((r) => r.hold_until)
    .filter((d): d is string => Boolean(d))
    .sort();
  return {
    earnedCents: sum(live),
    onHoldCents: sum(held),
    readyCents: sum(live.filter((r) => r.effective_status === 'payable' && !r.payout_id)),
    paidCents: payouts.reduce((t, p) => t + (Number(p.amount_cents) || 0), 0),
    nextClearsOn: clears[0] ?? null,
  };
}

/** What each referral has earned so far (void rows excluded), by CRM lead id. */
export function earnedByLead(ledger: LedgerRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of ledger) {
    if (!r.lead_id || r.effective_status === 'void') continue;
    out.set(r.lead_id, (out.get(r.lead_id) ?? 0) + (Number(r.amount_cents) || 0));
  }
  return out;
}

/** The next payout run: the 1st or the 14th, whichever is next, Pacific time (same rule as the CRM bridge). */
export function nextPayoutDate(now = new Date()): string {
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const d = pt.getDate();
  const y = pt.getFullYear();
  const m = pt.getMonth();
  const [ny, nm, nd] = d < 14 ? [y, m, 14] : m === 11 ? [y + 1, 0, 1] : [y, m + 1, 1];
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

export function termsCurrent(a: { terms_version: string | null; agreement_version: string | null }): boolean {
  return (a.terms_version || a.agreement_version || '') >= PAYOUT_TERMS_VERSION;
}

export type W9Status = 'missing' | 'received' | 'verified';

export interface PayoutSetup {
  whopLinked: boolean;
  whopUsername: string | null;
  termsCurrent: boolean;
  termsVersion: string;
  w9: W9Status;
}

/** What still stands between this Beaker and a payout, in the order they'd fix it. Empty = all set. */
export function setupSteps(s: PayoutSetup): Array<'whop' | 'terms' | 'w9'> {
  const out: Array<'whop' | 'terms' | 'w9'> = [];
  if (!s.whopLinked) out.push('whop');
  if (!s.termsCurrent) out.push('terms');
  if (s.w9 === 'missing') out.push('w9');
  return out;
}

/** One sentence about the next payout: what goes out when, or the one thing holding it. */
export function payoutLine(m: MoneyTotals, s: PayoutSetup, nextRun: string): string {
  const day = shortDate(nextRun);
  const missing = setupSteps(s);
  if (m.readyCents <= 0) {
    if (m.onHoldCents > 0 && m.nextClearsOn) return `Nothing ready yet. ${usd(m.onHoldCents)} is on its 45-day hold; the next part clears ${shortDate(m.nextClearsOn, 'America/Los_Angeles')}.`;
    return 'Nothing to pay out yet. Your first payout comes 45 days after someone you sent pays PodLab.';
  }
  if (missing.length) return `${usd(m.readyCents)} is ready, but it can't be sent until you finish payout setup below.`;
  if (m.readyCents < MINIMUM_PAYOUT_CENTS) return `${usd(m.readyCents)} is ready. Payouts start at ${usd(MINIMUM_PAYOUT_CENTS)}, so it rolls into a later run.`;
  return `${usd(m.readyCents)} goes to your Whop account (@${s.whopUsername ?? 'you'}) on the ${day} run.`;
}

// ── words ────────────────────────────────────────────────────────────────

export const RATE_PCT = Math.round(BASE_RATE * 100);

/** The one-line "how you earn", straight from the signed terms. */
export const HOW_YOU_EARN = `You earn ${RATE_PCT}% of what each client you send pays PodLab (after payment fees), including each monthly payment for up to ${RECURRING_MAX_MONTHS} months. Each payment clears after a ${HOLD_PERIOD_DAYS}-day hold, then it's paid to your Whop account.`;

export const TAX_NOTE = `PodLab needs your W-9 before your first payout. If PodLab pays you $${TAX_FORM_THRESHOLD_USD.toLocaleString('en-US')} or more in a year (the 2026 threshold), it's reported on a 1099-NEC and you get a copy early the next year. Earnings you turn into PodLab credit count too.`;

export const GOOD_REFERRAL = [
  'A founder or owner of a service business doing about $250K a year or more.',
  "They're the bottleneck: they sell, they're the face, and there isn't enough of them to go around.",
  'Someone you actually know, who would take your call.',
];

/** The short rules, each tied to the Beaker agreement section it comes from. */
export const DONT = [
  { text: "Don't promise results, earnings, timelines or guarantees. Say what PodLab does, not what it will do for them.", ref: '§6.1' },
  { text: "Always say you may earn a commission. The copy below already does.", ref: '§7.1' },
  { text: 'No spam: only message people you know, and never text or email a list.', ref: '§6.2' },
  { text: "Don't offer your commission back as a discount or gift unless PodLab agrees in writing.", ref: '§6.5' },
  { text: "Don't run ads on PodLab's name or pose as PodLab.", ref: '§6.3' },
  { text: "Someone already in PodLab's system can't be credited to you, and you can't refer yourself.", ref: '§2.4' },
];

export interface Toolkit {
  text: string;
  emailSubject: string;
  email: string;
  social: string;
}

/** Ready-to-send copy with their link in it. Every version carries the FTC disclosure (§7.1). */
export function toolkit(link: string, yourName: string): Toolkit {
  const me = yourName.trim() || '[Your name]';
  return {
    text: `Hey [Name], thought of you. PodLab in Las Vegas turns a founder's know-how into video that sells for them, so you're not the one in every sales conversation. Worth a look: ${link}\n\n(Heads up: I'm a PodLab Beaker, so I may earn a commission if you work with them.)`,
    emailSubject: 'Thought of you: PodLab',
    email: `Hi [Name],\n\nYou came to mind. PodLab works with service-business founders who are the bottleneck in their own company. They capture how you sell and explain what you do on video, so those videos do the explaining and you get your time back.\n\nThey start with a short call to see if it's a fit. Here's the link: ${link}\n\nHappy to introduce you directly if that's easier.\n\n${me}\n\nP.S. I'm part of PodLab's referral program, so I may earn a commission if you work with them.`,
    social: `If you run a service business and you're still the one closing every deal, look at what PodLab does. They turn a founder's know-how into video that sells while you're busy doing the work.\n\n${link}\n\n#ad I'm a PodLab Beaker and may earn a commission.`,
  };
}

// ── formatting ───────────────────────────────────────────────────────────

export function usd(cents: number): string {
  const v = cents / 100;
  return `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** "Nov 1" from a date or timestamp; a bare date is read as written (no timezone shift). */
export function shortDate(d: string, timeZone?: string): string {
  const bare = d.length === 10;
  const t = new Date(bare ? `${d}T12:00:00Z` : d);
  if (Number.isNaN(t.getTime())) return d;
  const tz = bare ? 'UTC' : timeZone;
  return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(tz ? { timeZone: tz } : {}) });
}

/** "Jane Doe — Acme" → "Jane Doe": the CRM appends the business after an em dash. */
export function personName(name: string | null | undefined): string {
  return (name ?? '').split('—')[0].trim() || 'Your referral';
}

/** Escape LIKE wildcards so an address with _ or % is matched literally (case-insensitive). */
export const likeExact = (s: string) => s.trim().toLowerCase().replace(/[\\%_]/g, (m) => `\\${m}`);

/** "email or phone" from one field: an email if it has an @, else a phone. */
export function splitContact(v: string): { email: string; phone: string } {
  const s = v.trim();
  if (!s) return { email: '', phone: '' };
  if (s.includes('@')) return { email: s.toLowerCase(), phone: '' };
  return { email: '', phone: s };
}

export function contactLooksValid(v: string): boolean {
  const { email, phone } = splitContact(v);
  if (email) return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  return phone.replace(/\D/g, '').length >= 7;
}

// ── the payload the page renders ─────────────────────────────────────────

export interface BeakerReferral {
  id: string;
  name: string;
  status: PlainStatus;
  since: string;
  earnedCents: number;
}

export interface BeakerPayload {
  beaker: true;
  readOnly: boolean;
  affiliate: { beakerId: string; name: string };
  link: string;
  howYouEarn: string;
  referrals: BeakerReferral[];
  money: MoneyTotals & { nextPayout: string; minimumCents: number; line: string; autoPayout: boolean };
  setup: PayoutSetup;
  payouts: Array<{ id: string; amountCents: number; label: string; sentAt: string | null; credit: boolean }>;
  /** Clients only: earnings can also become PodLab credit (the older Referrals page does it). */
  canUseAsCredit: boolean;
}
