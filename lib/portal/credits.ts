/**
 * Edit credits — the one place pricing lives (docs/PORTAL-V2.md, "Credits").
 *
 * Pure: no database, no fetch. The wallet route, the submission route, the
 * Buy credits panel, the Whop link script (scripts/whop-credit-links.mjs) and
 * the CRM's Whop webhook all read these numbers, so a price change is one edit
 * here (plus re-running the link script, which makes new Whop plans).
 *
 * The ledger (public.portal_credit_ledger) is append-only: balance = sum(delta).
 * Purchases add a lot that expires; spending takes from the lot that expires
 * first (FIFO by expiry); a lot that runs out its clock gets an 'expired' row
 * (ref "expire:<lot id>") so the plain sum stays the truth.
 */

// ── packs ────────────────────────────────────────────────────────────────

export type PackKey = 'credits-1' | 'credits-3' | 'credits-8' | 'credits-monthly-10';

export interface CreditPack {
  key: PackKey;
  label: string;
  credits: number;
  /** Dollars charged (per month for the monthly plan). */
  price: number;
  perCredit: number;
  kind: 'one_time' | 'monthly';
  /** How long each grant lasts. Monthly: this month plus one month of rollover. */
  expiresAfter: { days: number } | { months: number };
  blurb: string;
  /** Env var holding this pack's Whop checkout URL (made by scripts/whop-credit-links.mjs). */
  env: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { key: 'credits-1', label: '1 credit', credits: 1, price: 250, perCredit: 250, kind: 'one_time', expiresAfter: { days: 90 }, blurb: 'One short-form edit.', env: 'WHOP_CREDITS_1_URL' },
  { key: 'credits-3', label: '3 credits', credits: 3, price: 600, perCredit: 200, kind: 'one_time', expiresAfter: { days: 90 }, blurb: 'Three shorts, or a VSL plus a short.', env: 'WHOP_CREDITS_3_URL' },
  { key: 'credits-8', label: '8 credits', credits: 8, price: 1400, perCredit: 175, kind: 'one_time', expiresAfter: { days: 90 }, blurb: 'A month of content, or two premium edits.', env: 'WHOP_CREDITS_8_URL' },
  { key: 'credits-monthly-10', label: '10 credits / month', credits: 10, price: 1500, perCredit: 150, kind: 'monthly', expiresAfter: { months: 2 }, blurb: 'Every month. Unused credits roll over one month.', env: 'WHOP_CREDITS_MONTHLY_URL' },
];

export const PACK_EXPIRY_DAYS = 90;

export function packFor(key: string | null | undefined): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.key === key) ?? null;
}

/** The date a grant made on `from` stops counting (YYYY-MM-DD). */
export function expiryFor(pack: CreditPack, from: Date = new Date()): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  if ('days' in pack.expiresAfter) d.setUTCDate(d.getUTCDate() + pack.expiresAfter.days);
  else d.setUTCMonth(d.getUTCMonth() + pack.expiresAfter.months);
  return d.toISOString().slice(0, 10);
}

// ── what an edit costs ───────────────────────────────────────────────────

export type EditType = 'short' | 'long' | 'premium';

export interface EditTypeInfo {
  key: EditType;
  label: string;
  credits: number;
  detail: string;
  /** Business days from submission, standard turnaround. */
  turnaroundDays: number;
}

export const EDIT_TYPES: EditTypeInfo[] = [
  { key: 'short', label: 'Short-form edit', credits: 1, detail: 'Up to 90 seconds, vertical, captions, 2 revision rounds.', turnaroundDays: 5 },
  { key: 'long', label: 'Long-form or VSL edit', credits: 2, detail: 'A VSL, a YouTube video or a long talk, 2 revision rounds.', turnaroundDays: 5 },
  { key: 'premium', label: 'Premium edit + FAQs', credits: 4, detail: 'Premium hero edit plus 3 FAQ videos, 2 revision rounds.', turnaroundDays: 7 },
];

export const RUSH_CREDITS = 1;
export const EXTRA_ROUND_CREDITS = 1;
export const RUSH_HOURS = 48;
export const MAX_EXTRA_ROUNDS = 3;

export function editTypeFor(key: string | null | undefined): EditTypeInfo | null {
  return EDIT_TYPES.find((t) => t.key === key) ?? null;
}

export interface EditOrder {
  type: EditType;
  rush?: boolean;
  extraRounds?: number;
}

/** Credits for one submission; null when the order is not one we sell. */
export function editCost(o: EditOrder): number | null {
  const t = editTypeFor(o.type);
  if (!t) return null;
  const extra = Math.trunc(o.extraRounds ?? 0);
  if (!Number.isFinite(extra) || extra < 0 || extra > MAX_EXTRA_ROUNDS) return null;
  return t.credits + (o.rush ? RUSH_CREDITS : 0) + extra * EXTRA_ROUND_CREDITS;
}

/** When the edit is due: rush is 48 hours, else the type's business days. YYYY-MM-DD. */
export function dueDate(o: EditOrder, from: Date = new Date()): string | null {
  const t = editTypeFor(o.type);
  if (!t) return null;
  const d = new Date(from.getTime());
  if (o.rush) {
    d.setTime(d.getTime() + RUSH_HOURS * 3_600_000);
    return d.toISOString().slice(0, 10);
  }
  let left = t.turnaroundDays;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

// ── the ledger ───────────────────────────────────────────────────────────

export interface LedgerRow {
  id: string;
  delta: number;
  reason: string;
  ref: string | null;
  expires_on: string | null;
  note: string | null;
  created_at: string;
}

export interface Lot {
  id: string;
  granted: number;
  remaining: number;
  expires_on: string | null;
  created_at: string;
}

export interface WalletState {
  /** sum(delta) of the rows as written. */
  ledgerBalance: number;
  /** What can be spent today: the ledger balance minus lots that ran out and have no 'expired' row yet. */
  balance: number;
  lots: Lot[];
  /** 'expired' rows to write so the sum matches: one per lapsed lot with credits left. */
  pendingExpiry: Array<{ lotId: string; delta: number; ref: string; expires_on: string }>;
  /** The soonest expiry among lots with credits left (today or later). */
  nextExpiry: { on: string; credits: number } | null;
}

export const EXPIRE_REF = (lotId: string) => `expire:${lotId}`;

const day = (iso: string) => iso.slice(0, 10);

/**
 * Replay the ledger: positive rows are lots; an 'expire:<lot>' row closes that
 * lot; every other negative row (a spend, a staff correction) takes from the
 * live lot that expires first. A spend never takes from a lot that had already
 * expired on the day it happened. `today` is YYYY-MM-DD (UTC).
 */
export function walletState(rows: LedgerRow[], today: string = new Date().toISOString().slice(0, 10)): WalletState {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const lots: Lot[] = [];
  let ledgerBalance = 0;
  let debt = 0; // spent beyond what the lots held (a staff correction); comes out of the next lot

  for (const r of sorted) {
    ledgerBalance += r.delta;
    if (r.delta > 0) {
      const lot: Lot = { id: r.id, granted: r.delta, remaining: r.delta, expires_on: r.expires_on, created_at: r.created_at };
      const pay = Math.min(debt, lot.remaining);
      lot.remaining -= pay;
      debt -= pay;
      lots.push(lot);
      continue;
    }
    const expireOf = r.ref?.startsWith('expire:') ? r.ref.slice('expire:'.length) : null;
    if (expireOf) {
      const lot = lots.find((l) => l.id === expireOf);
      if (lot) lot.remaining = Math.max(0, lot.remaining + r.delta);
      continue;
    }
    let need = -r.delta;
    const on = day(r.created_at);
    const live = lots
      .filter((l) => l.remaining > 0 && (!l.expires_on || l.expires_on >= on))
      .sort((a, b) => (a.expires_on ?? '9999-12-31').localeCompare(b.expires_on ?? '9999-12-31') || a.created_at.localeCompare(b.created_at));
    for (const l of live) {
      if (!need) break;
      const take = Math.min(need, l.remaining);
      l.remaining -= take;
      need -= take;
    }
    debt += need;
  }

  const closed = new Set(sorted.filter((r) => r.ref?.startsWith('expire:')).map((r) => r.ref!.slice('expire:'.length)));
  const pendingExpiry = lots
    .filter((l) => l.remaining > 0 && l.expires_on && l.expires_on < today && !closed.has(l.id))
    .map((l) => ({ lotId: l.id, delta: -l.remaining, ref: EXPIRE_REF(l.id), expires_on: l.expires_on! }));
  const lapsed = pendingExpiry.reduce((t, e) => t - e.delta, 0);

  const upcoming = lots.filter((l) => l.remaining > 0 && l.expires_on && l.expires_on >= today).sort((a, b) => a.expires_on!.localeCompare(b.expires_on!));
  const nextExpiry = upcoming.length
    ? { on: upcoming[0].expires_on!, credits: upcoming.filter((l) => l.expires_on === upcoming[0].expires_on).reduce((t, l) => t + l.remaining, 0) }
    : null;

  return { ledgerBalance, balance: Math.max(0, ledgerBalance - lapsed), lots, pendingExpiry, nextExpiry };
}

/** Client-facing words for a ledger row. */
export function reasonLabel(r: Pick<LedgerRow, 'reason' | 'note'>): string {
  switch (r.reason) {
    case 'purchase':
      return r.note || 'Credits purchased';
    case 'submission':
      return r.note || 'Footage sent for editing';
    case 'refund':
      return r.note || 'Credits returned';
    case 'expired':
      return 'Credits expired';
    case 'adjustment':
      return r.note || 'Adjusted by PodLab';
    default:
      return r.note || r.reason;
  }
}

/** The ledger ref for each kind of event: one row per real event, enforced by the unique index. */
export const LEDGER_REF = {
  purchase: (paymentId: string) => `whop:${paymentId}`,
  submission: (submissionId: string) => `submission:${submissionId}`,
  refund: (submissionId: string) => `refund:submission:${submissionId}`,
} as const;
