/**
 * Beaker affiliate program — commercial terms, single source of truth.
 *
 * Everything that states a rate, a price, or a deadline to an affiliate reads
 * from here: the /affiliate marketing page, Exhibit A inside the signed
 * agreement, and the executed PDF. Before this file existed the marketing page
 * promised volume tiers the contract never mentioned, and the contract quoted a
 * flat 10% the marketing page contradicted. One table, one truth.
 *
 * Changing a number here changes what NEW affiliates sign. It does not touch
 * anyone already signed — their executed PDF is frozen at the version stamped
 * on it, which is why AGREEMENT_VERSION must be bumped alongside any edit.
 */

/** Bump on ANY change to terms or agreement text. Stamped into every PDF. */
export const AGREEMENT_VERSION = 'v2026.10.02b';

export const COMPANY = {
  legalName: 'PodLab LV LLC',
  shortName: 'PodLab',
  address: 'Las Vegas, Nevada',
  email: 'info@podlablv.com',
  signatory: 'Hiram Andino',
  signatoryTitle: 'CEO',
} as const;

/* ── Rates ─────────────────────────────────────────────────────────── */

/** Standard commission on Net Revenue of a Qualified Sale. */
export const BASE_RATE = 0.1;

// v2026.10.02: the first-sale 2× bonus is retired. Every sale pays the
// affiliate's rate on every offering. v2026.10.02b: one fixed 10%, no volume
// tiers — the affiliate's 10% is a fixed slice of every sale (Hiram 2026-10-02).

/**
 * A recurring offering pays commission on each monthly payment for at most
 * this many months, or until the client cancels, whichever comes first.
 */
export const RECURRING_MAX_MONTHS = 12;

/** Days after PodLab receives payment before a commission is payable. */
export const HOLD_PERIOD_DAYS = 45;

/** Payouts clear within this many days after month end. */
export const PAYOUT_DAYS_AFTER_MONTH_END = 15;

/** Balance below this may roll to the next payout run. */
export const MINIMUM_PAYOUT_USD = 100;

/** Window to dispute a commission statement before it is waived. */
export const DISPUTE_WINDOW_DAYS = 30;

// v2026.09.28: commissions are paid only through Whop, as a transfer to the
// affiliate's own Whop account (§4.7). Apple Pay / Zelle / wire were retired
// with it, and PodLab no longer collects bank details.
export const PAYOUT_METHODS = ['Whop'] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

/* ── What each Lab pays ────────────────────────────────────────────── */

export interface LabCommission {
  lab: string;
  /** Display price, e.g. "$1,500" or "$3,000/mo". */
  price: string;
  /** Numeric contract value used to compute commission. */
  value: number;
  /** True when `value` recurs monthly rather than being a one-time fee. */
  recurring?: boolean;
}

// Current list prices (Offers & Pricing, 2026-10-01). The first recurring row
// is the one the agreement and the page quote as the recurring example.
export const LAB_COMMISSIONS: LabCommission[] = [
  { lab: 'AssetsLab', price: '$1,500', value: 1500 },
  { lab: 'BrandLab', price: '$3,500', value: 3500 },
  { lab: 'SiteLab', price: '$3,500', value: 3500 },
  { lab: 'VideoSalesLab', price: '$10,000', value: 10000 },
  { lab: 'EssentialsLab', price: '$3,000', value: 3000 },
  { lab: 'EssentialsLab ELITE', price: '$5,000', value: 5000 },
  { lab: 'Business Growth System', price: '$18,500', value: 18500 },
  { lab: 'ExpansionLab', price: '$3,000/mo', value: 3000, recurring: true },
  { lab: 'ExpansionLab ELITE', price: '$5,000/mo', value: 5000, recurring: true },
  { lab: 'Social posting add-on', price: '$1,000/mo', value: 1000, recurring: true },
  { lab: 'Meta ads add-on', price: '$1,000/mo', value: 1000, recurring: true },
];

/* ── Formatting ────────────────────────────────────────────────────── */

export function usd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function pct(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

/** Commission on one sale of `lab` at `rate`, suffixed "/mo" when recurring. */
export function commissionFor(lab: LabCommission, rate: number): string {
  const amount = usd(Math.round(lab.value * rate));
  return lab.recurring ? `${amount}/mo` : amount;
}

/**
 * The most one referred client can pay out at `rate`: the commission itself
 * on a one-time offering, and RECURRING_MAX_MONTHS monthly payments on a
 * recurring one (less if the client cancels sooner). Stated explicitly so the
 * cap is never a surprise.
 */
export function maxPerClientFor(lab: LabCommission, rate: number): string {
  if (!lab.recurring) return usd(Math.round(lab.value * rate));
  return `${usd(Math.round(lab.value * rate * RECURRING_MAX_MONTHS))} over ${RECURRING_MAX_MONTHS} mo`;
}
