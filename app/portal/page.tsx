'use client';

import Link from 'next/link';
import { usePortal } from '@/lib/portal-data';
import { Card, StatCard, EmptyState } from '@/components/portal/Shared';
import PeriodicTable from '@/components/portal/PeriodicTable';
import LabNotebook from '@/components/portal/LabNotebook';
import ReactionRate from '@/components/portal/ReactionRate';
import { buildLabTable } from '@/lib/portal/labs-table';

const QUICK_LINKS = [
  { href: '/portal/document', label: 'Clarity Document', body: 'Read your strategy document and request changes.' },
  { href: '/portal/actions', label: 'Action Items', body: 'What to do first. Tick them off as you go.' },
  { href: '/portal/intake', label: 'Intake', body: 'What we need from you. Saves as you type.' },
  { href: '/portal/delivery', label: 'Delivery', body: 'Every phase of the build and where it stands.' },
  { href: '/portal/scripts', label: 'Scripts', body: 'Read, mark up, and validate before we shoot.' },
  { href: '/portal/deliverables', label: 'Deliverables', body: 'Every file we have produced for you.' },
  { href: '/portal/progress', label: 'Progress', body: 'Where each project stands right now.' },
  { href: '/portal/reports', label: 'Reports', body: 'Performance once campaigns are running.' },
  { href: '/portal/invoices', label: 'Invoices', body: 'Your billing history with PodLab.' },
];

export default function PortalDashboard() {
  const {
    loading, error, client, assets, projects, phases, events, actionItems,
    scripts, scriptVersions, scriptApprovals, isStaff,
  } = usePortal();

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-white/40 text-sm">
        <span className="portal-stir inline-block h-4 w-4 rounded-full border border-white/10 border-t-[#2ADD1B]" />
        Loading your portal...
      </div>
    );
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

      <PeriodicTable
        elements={buildLabTable({
          planLabel: client.plan_label,
          projects,
          assets,
          phases,
        })}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Deliverables Ready" value={String(ready.length)} />
        <StatCard label="Active Projects" value={String(active.length)} />
        <StatCard
          label="Projects Complete"
          value={String(projects.filter((p) => p.progress_pct >= 100).length)}
        />
        <StatCard
          label="Action Items Open"
          value={String(actionItems.filter((i) => i.status !== 'done').length)}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-white text-sm uppercase tracking-wider">
              Lab Notebook
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">
              Live
            </p>
          </div>
          <LabNotebook events={events} />
        </div>

        <div>
          {/* Staff-only until the number has been checked for fairness over one
              client cycle — PORTAL-EXPERIENCE.md open question 2. */}
          <div className="mb-6">
            <ReactionRate
              scripts={scripts}
              versions={scriptVersions}
              approvals={scriptApprovals}
              isStaff={isStaff}
            />
          </div>

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
