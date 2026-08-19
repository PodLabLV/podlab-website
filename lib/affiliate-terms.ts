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
export const AGREEMENT_VERSION = 'v2026.08.19';

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

/** First Qualified Sale pays 2× base. Marketed as "20% first sale". */
export const FIRST_SALE_MULTIPLIER = 2;

/** Days after PodLab receives payment before a commission is payable. */
export const HOLD_PERIOD_DAYS = 45;

/** Payouts clear within this many days after month end. */
export const PAYOUT_DAYS_AFTER_MONTH_END = 15;

/** Balance below this may roll to the next payout run. */
export const MINIMUM_PAYOUT_USD = 100;

/** Window to dispute a commission statement before it is waived. */
export const DISPUTE_WINDOW_DAYS = 30;

export const PAYOUT_METHODS = ['Apple Pay', 'Zelle', 'Wire Transfer'] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

/* ── What each Lab pays ────────────────────────────────────────────── */

export interface LabCommission {
  lab: string;
  /** Display price, e.g. "$1,500" or "$5,000/mo". */
  price: string;
  /** Numeric contract value used to compute commission. */
  value: number;
  /** True when `value` recurs monthly rather than being a one-time fee. */
  recurring?: boolean;
}

export const LAB_COMMISSIONS: LabCommission[] = [
  { lab: 'AssetsLab', price: '$1,500', value: 1500 },
  { lab: 'BrandLab', price: '$3,500', value: 3500 },
  { lab: 'SiteLab', price: '$3,500', value: 3500 },
  { lab: 'VideoSalesLab', price: '$10,000', value: 10000 },
  { lab: 'ExpansionLab', price: '$5,000/mo', value: 5000, recurring: true },
  { lab: 'Full Suite', price: '$18,500', value: 18500 },
];

/* ── Volume tiers ──────────────────────────────────────────────────── */

export interface VolumeTier {
  /** Qualified Sales needed to reach this tier. */
  threshold: number;
  /** Rate once the tier is reached; null = negotiated separately. */
  rate: number | null;
  label: string;
}

export const VOLUME_TIERS: VolumeTier[] = [
  { threshold: 0, rate: 0.1, label: 'Standard' },
  { threshold: 5, rate: 0.12, label: '5+ Qualified Sales' },
  { threshold: 10, rate: 0.15, label: '10+ Qualified Sales' },
  { threshold: 20, rate: null, label: '20+ Qualified Sales' },
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
 * First-sale payout. A recurring Lab pays the bonus on month one only — the
 * multiplier applies to the first month's commission, then it reverts to base.
 * Stated explicitly because "2× on the first sale" is ambiguous on a retainer,
 * and an ambiguous comp term is the one an affiliate disputes.
 */
export function firstSaleFor(lab: LabCommission, rate: number): string {
  const amount = usd(Math.round(lab.value * rate * FIRST_SALE_MULTIPLIER));
  return lab.recurring ? `${amount} first month` : amount;
}

/** The rate an affiliate has earned at a given lifetime Qualified Sale count. */
export function rateForVolume(qualifiedSales: number): number {
  let rate = BASE_RATE;
  for (const tier of VOLUME_TIERS) {
    if (qualifiedSales >= tier.threshold && tier.rate !== null) rate = tier.rate;
  }
  return rate;
}
