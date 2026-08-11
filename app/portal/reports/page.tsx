'use client';

import { usePortal } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState, StatCard } from '@/components/portal/Shared';

export default function ReportsPage() {
  const { loading, client, metrics } = usePortal();

  if (loading) return <p className="text-white/40 text-sm">Loading...</p>;

  if (!client || metrics.length === 0) {
    return (
      <>
        <PageHeader title="Reports" />
        <EmptyState
          title="No reporting yet"
          body="Performance reporting — pipeline attributed, cost per acquisition, funnel conversion, and content scoreboard — begins once campaigns are live under ExpansionLab. Nothing here is a placeholder; there is simply nothing running to measure yet."
          cta={{ label: 'Book a call', href: 'https://calendly.com/podlablv/app-hiram' }}
        />
      </>
    );
  }

  const periods = Array.from(new Set(metrics.map((m) => m.period_label)));

  return (
    <>
      <PageHeader title="Reports" subtitle="What the work produced, by period." />
      {periods.map((period) => (
        <div key={period} className="mb-8">
          <h2 className="font-display text-white text-sm uppercase tracking-wider mb-4">
            {period}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics
              .filter((m) => m.period_label === period)
              .map((m) => (
                <StatCard key={m.id} label={m.label} value={m.value} sub={m.sub ?? undefined} />
              ))}
          </div>
        </div>
      ))}
      <Card className="p-5">
        <p className="text-white/40 text-sm leading-relaxed">
          Questions on any number here? Bring them to your next call and we will walk
          through the underlying data together.
        </p>
      </Card>
    </>
  );
}
