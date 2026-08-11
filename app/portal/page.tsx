'use client';

import Link from 'next/link';
import { usePortal, formatDate } from '@/lib/portal-data';
import { Card, StatCard, EmptyState } from '@/components/portal/Shared';

const QUICK_LINKS = [
  { href: '/portal/deliverables', label: 'Deliverables', body: 'Every file we have produced for you.' },
  { href: '/portal/progress', label: 'Progress', body: 'Where each project stands right now.' },
  { href: '/portal/reports', label: 'Reports', body: 'Performance once campaigns are running.' },
  { href: '/portal/invoices', label: 'Invoices', body: 'Your billing history with PodLab.' },
];

export default function PortalDashboard() {
  const { loading, error, client, assets, projects, activity } = usePortal();

  if (loading) {
    return <p className="text-white/40 text-sm">Loading your portal...</p>;
  }

  if (error) {
    return (
      <EmptyState
        title="Something went wrong"
        body={`We could not load your portal. ${error}`}
        cta={{ label: 'Email PodLab', href: 'mailto:info@podlablv.com' }}
      />
    );
  }

  if (!client) {
    return (
      <EmptyState
        title="Your portal is being set up"
        body="Your account is active but we have not finished loading your workspace. This usually takes less than a day. Reach out if you were expecting to see something here."
        cta={{ label: 'Email PodLab', href: 'mailto:info@podlablv.com' }}
      />
    );
  }

  const ready = assets.filter((a) => (a.status || '').toLowerCase() === 'ready');
  const active = projects.filter((p) => p.progress_pct < 100);
  const firstName = client.first_name || client.business_name;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-white text-lg sm:text-xl uppercase tracking-wider">
          Welcome back, {firstName}
        </h1>
        <p className="text-white/40 text-sm mt-2">
          {client.business_name}
          {client.plan_label ? ` — ${client.plan_label}` : ''}
        </p>
      </div>

      {client.welcome_note && (
        <Card className="p-5 mb-6 border-[#2ADD1B]/20 bg-[#2ADD1B]/5">
          <p className="text-white/80 text-sm leading-relaxed">{client.welcome_note}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Deliverables Ready" value={String(ready.length)} />
        <StatCard label="Active Projects" value={String(active.length)} />
        <StatCard
          label="Projects Complete"
          value={String(projects.filter((p) => p.progress_pct >= 100).length)}
        />
        <StatCard label="Stage" value={client.stage === 'active' ? 'Active Client' : 'Onboarding'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="font-display text-white text-sm uppercase tracking-wider mb-4">
            Recent Activity
          </h2>
          {activity.length === 0 ? (
            <EmptyState
              title="Nothing logged yet"
              body="Activity shows up here as we deliver files, publish reports, and complete milestones."
            />
          ) : (
            <Card className="divide-y divide-white/5">
              {activity.slice(0, 6).map((a) => (
                <div key={a.id} className="p-4 flex items-start gap-4">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#2ADD1B] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{a.title}</p>
                    <p className="text-white/30 text-xs mt-1">
                      {a.kind ? `${a.kind} · ` : ''}
                      {a.happened_at ? formatDate(a.happened_at) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div>
          <h2 className="font-display text-white text-sm uppercase tracking-wider mb-4">
            Jump To
          </h2>
          <div className="space-y-3">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-[#2ADD1B]/30 transition"
              >
                <p className="font-display text-white text-xs uppercase tracking-wider">
                  {l.label}
                </p>
                <p className="text-white/40 text-xs mt-1.5 leading-relaxed">{l.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
