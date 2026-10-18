import { reportError } from '@/lib/alerts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CREDIT_PACKS, reasonLabel, walletState, type LedgerRow, type PackKey } from '@/lib/portal/credits';

/**
 * The client's credit wallet, read with the service role (the ledger has no
 * client read policy: every read goes through a route that resolved the
 * caller first).
 */

export interface WalletHistoryRow {
  id: string;
  delta: number;
  label: string;
  reason: string;
  at: string;
  expiresOn: string | null;
}

export interface WalletPack {
  key: PackKey;
  label: string;
  credits: number;
  price: number;
  perCredit: number;
  kind: 'one_time' | 'monthly';
  blurb: string;
  /** Whop checkout; null until scripts/whop-credit-links.mjs has been run and the env var set. */
  checkoutUrl: string | null;
}

export interface Wallet {
  ready: boolean;
  balance: number;
  nextExpiry: { on: string; credits: number } | null;
  history: WalletHistoryRow[];
  packs: WalletPack[];
  /** False until at least one pack has a checkout link. */
  canBuy: boolean;
}

export function packsWithLinks(): WalletPack[] {
  return CREDIT_PACKS.map((p) => {
    const url = (process.env[p.env] ?? '').trim();
    return {
      key: p.key,
      label: p.label,
      credits: p.credits,
      price: p.price,
      perCredit: p.perCredit,
      kind: p.kind,
      blurb: p.blurb,
      checkoutUrl: /^https:\/\//.test(url) ? url : null,
    };
  });
}

export async function ledgerRows(db: SupabaseClient, clientId: string): Promise<LedgerRow[] | null> {
  const { data, error } = await db
    .from('portal_credit_ledger')
    .select('id, delta, reason, ref, expires_on, note, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(2000);
  if (error) {
    reportError('[portal] credit ledger read failed', error.message);
    return null;
  }
  return (data ?? []) as LedgerRow[];
}

export async function loadWallet(db: SupabaseClient, clientId: string): Promise<Wallet> {
  const packs = packsWithLinks();
  const canBuy = packs.some((p) => p.checkoutUrl);
  const rows = await ledgerRows(db, clientId);
  if (!rows) return { ready: false, balance: 0, nextExpiry: null, history: [], packs, canBuy };
  const state = walletState(rows);
  // Lapsed lots read as already expired, even before their 'expired' row is written.
  const pending: WalletHistoryRow[] = state.pendingExpiry.map((e) => ({
    id: e.ref,
    delta: e.delta,
    label: 'Credits expired',
    reason: 'expired',
    at: `${e.expires_on}T23:59:59Z`,
    expiresOn: null,
  }));
  const history = [
    ...rows.map((r) => ({ id: r.id, delta: r.delta, label: reasonLabel(r), reason: r.reason, at: r.created_at, expiresOn: r.delta > 0 ? r.expires_on : null })),
    ...pending,
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 50);
  return { ready: true, balance: state.balance, nextExpiry: state.nextExpiry, history, packs, canBuy };
}

/**
 * Write the 'expired' rows for lots that ran out their clock, so a plain
 * sum(delta) (what portal_credit_spend checks) is the spendable balance.
 * Idempotent: each row's ref is "expire:<lot id>", unique in the ledger.
 */
export async function settleExpiry(db: SupabaseClient, clientId: string): Promise<boolean> {
  const rows = await ledgerRows(db, clientId);
  if (!rows) return false;
  const { pendingExpiry } = walletState(rows);
  if (!pendingExpiry.length) return true;
  const { error } = await db.from('portal_credit_ledger').upsert(
    pendingExpiry.map((e) => ({
      client_id: clientId,
      delta: e.delta,
      reason: 'expired',
      ref: e.ref,
      note: `Expired ${e.expires_on}`,
      created_by: 'portal (expiry)',
    })),
    { onConflict: 'ref', ignoreDuplicates: true },
  );
  if (error) {
    reportError('[portal] credit expiry write failed', error.message);
    return false;
  }
  return true;
}
