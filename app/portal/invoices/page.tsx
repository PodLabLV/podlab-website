'use client';

import { usePortal, formatMoney, formatDate } from '@/lib/portal-data';
import {
  PageHeader,
  Card,
  EmptyState,
  StatCard,
  StatusBadge,
} from '@/components/portal/Shared';

export default function InvoicesPage() {
  const { loading, client, invoices } = usePortal();

  if (loading) return <p className="text-white/40 text-sm">Loading...</p>;

  if (!client || invoices.length === 0) {
    return (
      <>
        <PageHeader title="Invoices" />
        <EmptyState
          title="No invoices on file"
          body="Your billing history with PodLab appears here. There is nothing outstanding and nothing on record for your account right now."
          cta={{ label: 'Email PodLab', href: 'mailto:info@podlablv.com' }}
        />
      </>
    );
  }

  const paid = invoices
    .filter((i) => (i.status || '').toLowerCase() === 'paid')
    .reduce((sum, i) => sum + i.amount_cents, 0);
  const outstanding = invoices
    .filter((i) => (i.status || '').toLowerCase() !== 'paid')
    .reduce((sum, i) => sum + i.amount_cents, 0);

  return (
    <>
      <PageHeader title="Invoices" subtitle="Your billing history with PodLab." />

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Total Invested" value={formatMoney(paid)} />
        <StatCard label="Outstanding" value={formatMoney(outstanding)} />
      </div>

      {/* Desktop */}
      <Card className="hidden md:block overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {['Invoice', 'Date', 'Description', 'Amount', 'Status'].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 font-display text-[10px] uppercase tracking-widest text-white/40"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invoices.map((i) => (
              <tr key={i.id}>
                <td className="px-5 py-4 text-white/60">{i.invoice_no || '—'}</td>
                <td className="px-5 py-4 text-white/60">{formatDate(i.issued_on)}</td>
                <td className="px-5 py-4 text-white">{i.description}</td>
                <td className="px-5 py-4 text-white font-semibold">
                  {formatMoney(i.amount_cents)}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={i.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {invoices.map((i) => (
          <Card key={i.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white text-sm">{i.description}</p>
                <p className="text-white/30 text-xs mt-1">
                  {i.invoice_no ? `${i.invoice_no} · ` : ''}
                  {formatDate(i.issued_on)}
                </p>
              </div>
              <StatusBadge status={i.status} />
            </div>
            <p className="text-white font-semibold mt-3">{formatMoney(i.amount_cents)}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
