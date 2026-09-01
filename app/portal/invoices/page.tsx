'use client';

/**
 * Billing.
 *
 * Rule from PORTAL-EXPERIENCE.md that governs this whole page: never theme a
 * dollar amount or a due date. Everywhere else in the portal a status may read
 * "Peer Review" or "Hypothesis" — here it reads Paid, Due, and Overdue, because
 * a client should never have to decode a metaphor to find out what they owe.
 *
 * We never take a card. "Pay now" is a link to Stripe's hosted invoice page.
 */

import { usePortal, formatMoney, formatDate } from '@/lib/portal-data';
import type { PortalInvoice } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState, StatCard } from '@/components/portal/Shared';

const OPEN_STATES = ['pending', 'due', 'overdue', 'open', 'unpaid'];

function isOpen(inv: PortalInvoice): boolean {
  return OPEN_STATES.includes((inv.status || '').toLowerCase());
}

function MoneyStatus({ status }: { status: string | null }) {
  const s = (status || 'pending').toLowerCase();
  const tone =
    s === 'paid'
      ? 'bg-[#2ADD1B]/10 text-[#2ADD1B] border-[#2ADD1B]/20'
      : s === 'overdue'
        ? 'bg-[#F0483E]/10 text-[#F0483E] border-[#F0483E]/20'
        : 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/20';
  return (
    <span
      className={`inline-block rounded-lg border px-2.5 py-1 font-display text-[10px] uppercase tracking-widest ${tone}`}
    >
      {status || 'Due'}
    </span>
  );
}

function PayButton({ href, label = 'Pay now' }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl bg-[#2ADD1B] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#85FF78]"
    >
      {label}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M7 17L17 7M17 7H8M17 7v9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

export default function InvoicesPage() {
  const { loading, client, invoices, subscriptions } = usePortal();

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-white/40">
        <span className="portal-stir inline-block h-4 w-4 rounded-full border border-white/10 border-t-[#2ADD1B]" />
        Loading...
      </div>
    );
  }

  if (!client || (invoices.length === 0 && subscriptions.length === 0)) {
    return (
      <>
        <PageHeader title="Billing" />
        <EmptyState
          title="Nothing on record"
          body="Your invoices and payment history appear here. There is nothing outstanding and nothing on file for your account right now."
          cta={{ label: 'Email PodLab', href: 'mailto:info@podlablv.com' }}
        />
      </>
    );
  }

  const open = invoices.filter(isOpen);
  const outstanding = open.reduce((sum, i) => sum + i.amount_cents, 0);
  const paid = invoices
    .filter((i) => (i.status || '').toLowerCase() === 'paid')
    .reduce((sum, i) => sum + (i.amount_paid_cents ?? i.amount_cents), 0);

  // Soonest due date across open invoices — what they should look at first.
  const nextDue = open
    .filter((i) => i.due_on)
    .sort((a, b) => (a.due_on || '').localeCompare(b.due_on || ''))[0];

  const retainer = subscriptions.find((s) => (s.status || '').toLowerCase() === 'active');
  const payable = open.find((i) => i.hosted_invoice_url);

  return (
    <>
      <PageHeader title="Billing" subtitle="Invoices, receipts, and what is due." />

      {/* What you owe, first and unmissable — or explicit confirmation you owe
          nothing, which is worth saying out loud rather than leaving blank. */}
      {outstanding > 0 ? (
        <Card className="mb-6 border-[#FFB020]/30 bg-[#FFB020]/[0.06] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-[10px] uppercase tracking-widest text-[#FFB020]">
                Outstanding
              </p>
              <p className="portal-num mt-2 text-3xl font-semibold text-white">
                {formatMoney(outstanding)}
              </p>
              <p className="mt-1 text-sm text-white/50">
                {open.length} {open.length === 1 ? 'invoice' : 'invoices'}
                {nextDue?.due_on ? ` · due ${formatDate(nextDue.due_on)}` : ''}
              </p>
            </div>
            {payable?.hosted_invoice_url && <PayButton href={payable.hosted_invoice_url} />}
          </div>
        </Card>
      ) : (
        <Card className="mb-6 border-[#2ADD1B]/20 bg-[#2ADD1B]/[0.05] p-5">
          <p className="text-sm text-white/80">
            You are all paid up. Nothing is outstanding.
          </p>
        </Card>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total Invested" value={formatMoney(paid)} />
        {retainer && (
          <StatCard
            label="Retainer"
            value={`${formatMoney(retainer.amount_cents)}/${retainer.interval ?? 'mo'}`}
            sub={
              retainer.current_period_end
                ? `Renews ${formatDate(retainer.current_period_end)}`
                : undefined
            }
          />
        )}
        <StatCard
          label="Next Payment"
          value={nextDue?.due_on ? formatDate(nextDue.due_on) : '—'}
          sub={nextDue ? formatMoney(nextDue.amount_cents) : 'Nothing scheduled'}
        />
      </div>

      <h2 className="mb-4 font-display text-sm uppercase tracking-wider text-white">History</h2>

      {/* Desktop */}
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {['Invoice', 'Date', 'Description', 'Amount', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left font-display text-[10px] uppercase tracking-widest text-white/40"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invoices.map((i) => (
              <tr key={i.id}>
                <td className="px-5 py-4 font-mono text-xs text-white/50">{i.invoice_no || '—'}</td>
                <td className="px-5 py-4 font-mono text-xs text-white/50 portal-num">
                  {formatDate(i.issued_on)}
                </td>
                <td className="px-5 py-4 text-white">{i.description}</td>
                <td className="portal-num px-5 py-4 font-semibold text-white">
                  {formatMoney(i.amount_cents)}
                </td>
                <td className="px-5 py-4">
                  <MoneyStatus status={i.status} />
                </td>
                <td className="px-5 py-4 text-right">
                  {isOpen(i) && i.hosted_invoice_url ? (
                    <a
                      href={i.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#2ADD1B] hover:underline"
                    >
                      Pay
                    </a>
                  ) : i.pdf_url || i.receipt_url ? (
                    <a
                      href={(i.pdf_url || i.receipt_url) as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/40 hover:text-white"
                    >
                      Receipt
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {invoices.map((i) => (
          <Card key={i.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white">{i.description}</p>
                <p className="mt-1 font-mono text-[10px] text-white/30 portal-num">
                  {i.invoice_no ? `${i.invoice_no} · ` : ''}
                  {formatDate(i.issued_on)}
                </p>
              </div>
              <MoneyStatus status={i.status} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="portal-num font-semibold text-white">{formatMoney(i.amount_cents)}</p>
              {isOpen(i) && i.hosted_invoice_url ? (
                <PayButton href={i.hosted_invoice_url} label="Pay" />
              ) : i.pdf_url || i.receipt_url ? (
                <a
                  href={(i.pdf_url || i.receipt_url) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/40"
                >
                  Receipt
                </a>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
