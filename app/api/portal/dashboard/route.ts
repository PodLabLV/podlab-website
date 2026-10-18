import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { reportError } from '@/lib/alerts';
import { admin, resolveCaller, viewAsId, type PortalCaller } from '@/lib/portal-server';
import { loadPlans } from '@/lib/portal/game-plan-server';
import { loadFeed } from '@/lib/portal/notify';
import { beakerEmails, isBeaker } from '@/lib/portal/beaker';
import { beakerLink } from '@/lib/beaker-ref';
import { BASE_RATE, RECURRING_MAX_MONTHS } from '@/lib/affiliate-terms';
import { summarizeInvoices, type DashboardBoard, type DashboardInvoice, type DashboardPayload, type ReferralCard } from '@/lib/portal/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Portal v2 Dashboard: the server-side reads the browser can't do through RLS
 * (CRM boards, the credit wallet, notifications, the Beaker record), in one
 * call. Phases, report metrics and action items still come from usePortal().
 * Every section is best-effort: one failing read empties that card, never the page.
 */

async function boards(db: SupabaseClient, clientId: string): Promise<DashboardBoard[]> {
  const { data: links } = await db.from('portal_client_boards').select('board_id').eq('client_id', clientId);
  const ids = (links ?? []).map((l: { board_id: string }) => l.board_id);
  if (!ids.length) return [];
  const { data, error } = await db
    .schema('crm')
    .from('content_boards')
    .select('id, name, stage, stage_changed_at, archived, sort')
    .in('id', ids)
    .eq('archived', false)
    .order('sort');
  if (error) {
    reportError('[portal] dashboard boards read failed', error.message);
    return [];
  }
  return (data ?? []).map((b: { id: string; name: string; stage: string | null; stage_changed_at: string | null }) => ({
    id: b.id,
    name: b.name,
    stage: b.stage,
    stageChangedAt: b.stage_changed_at,
  }));
}

async function credits(db: SupabaseClient, clientId: string): Promise<DashboardPayload['credits']> {
  const { data, error } = await db.from('portal_credit_balance').select('balance').eq('client_id', clientId).maybeSingle();
  if (error) return { ready: false, balance: 0 };
  return { ready: true, balance: Number(data?.balance ?? 0) };
}

async function invoices(db: SupabaseClient, clientId: string): Promise<DashboardInvoice[]> {
  const { data, error } = await db
    .from('portal_invoices')
    .select('id, invoice_no, description, amount_cents, status, issued_on, due_on, paid_at, hosted_invoice_url, receipt_url, sort_order')
    .eq('client_id', clientId)
    .order('issued_on', { ascending: false, nullsFirst: false });
  if (error) return [];
  return (data ?? [])
    .filter((i: { status: string | null }) => !/^void/i.test(i.status ?? ''))
    .map((i: Record<string, unknown>) => ({
      id: String(i.id),
      invoiceNo: (i.invoice_no as string | null) ?? null,
      description: (i.description as string | null) ?? null,
      amountCents: Number(i.amount_cents ?? 0),
      status: String(i.status ?? 'Open'),
      issuedOn: (i.issued_on as string | null) ?? null,
      dueOn: (i.due_on as string | null) ?? null,
      paidAt: (i.paid_at as string | null) ?? null,
      payUrl: (i.hosted_invoice_url as string | null) ?? null,
      receiptUrl: (i.receipt_url as string | null) ?? null,
    }));
}

async function referral(db: SupabaseClient, caller: PortalCaller, viewAs: boolean): Promise<ReferralCard> {
  const ratePct = Math.round(BASE_RATE * 100);
  // A teammate's login isn't the Beaker; referrals belong to the owner.
  if (caller.member) return { state: 'member' };
  const email = await isBeaker(db, await beakerEmails(db, caller, viewAs));
  if (!email) return { state: 'join', ratePct, recurringMonths: RECURRING_MAX_MONTHS };
  const { data: aff } = await db
    .schema('crm')
    .from('affiliates')
    .select('id, beaker_id, custom_rate')
    .ilike('email', email.replace(/[%_]/g, ''))
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle();
  const link = aff?.beaker_id ? beakerLink(aff.beaker_id) : null;
  if (!aff || !link) return { state: 'join', ratePct, recurringMonths: RECURRING_MAX_MONTHS };
  const { data: rows } = await db
    .schema('crm')
    .from('affiliate_commissions')
    .select('amount_cents, status, hold_until, lead_id')
    .eq('affiliate_id', aff.id)
    .neq('status', 'void');
  const now = Date.now();
  const list = (rows ?? []) as Array<{ amount_cents: number | null; hold_until: string | null; lead_id: string | null }>;
  const rate = Number(aff.custom_rate);
  return {
    state: 'beaker',
    beakerId: aff.beaker_id,
    link,
    ratePct: Number.isFinite(rate) && rate > 0 ? Math.round((rate <= 1 ? rate * 100 : rate) * 10) / 10 : ratePct,
    recurringMonths: RECURRING_MAX_MONTHS,
    earnedCents: list.reduce((s, r) => s + Number(r.amount_cents ?? 0), 0),
    onHoldCents: list.filter((r) => r.hold_until && new Date(r.hold_until).getTime() > now).reduce((s, r) => s + Number(r.amount_cents ?? 0), 0),
    referrals: new Set(list.map((r) => r.lead_id).filter(Boolean)).size,
  };
}

export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const safe = async <T,>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      reportError(`[portal] dashboard ${label} failed`, err instanceof Error ? err.message : err);
      return fallback;
    }
  };

  const [b, c, feed, plans, inv, ref] = await Promise.all([
    safe('boards', () => boards(db, caller.clientId), []),
    safe('credits', () => credits(db, caller.clientId), { ready: false, balance: 0 }),
    safe('notifications', () => loadFeed(db, caller.clientId), { ready: false, done: [], earlier: [], waiting: [] }),
    safe('plans', () => loadPlans(db, caller.clientId), { ready: false, plans: [] }),
    safe('invoices', () => invoices(db, caller.clientId), []),
    safe<ReferralCard>('referral', () => referral(db, caller, Boolean(viewAsId(req))), { state: 'member' }),
  ]);

  const payload: DashboardPayload = {
    boards: b,
    credits: c,
    waiting: feed.waiting,
    plans: plans.plans,
    invoices: inv,
    invoiceSummary: summarizeInvoices(inv),
    referral: ref,
  };
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
