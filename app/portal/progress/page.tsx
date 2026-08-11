'use client';

import { usePortal, formatDate } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';

const STAGES = ['Discovery', 'Strategy', 'Production', 'Review', 'Delivered'];

export default function ProgressPage() {
  const { loading, client, projects } = usePortal();

  if (loading) return <p className="text-white/40 text-sm">Loading...</p>;

  if (!client || projects.length === 0) {
    return (
      <>
        <PageHeader title="Progress" />
        <EmptyState
          title="No projects in flight"
          body="Once a Lab is underway you will see it here, stage by stage, with who owns it and when it lands."
          cta={{ label: 'Book a call', href: 'https://calendly.com/podlablv/app-hiram' }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Progress"
        subtitle="Where every project stands. Updated as each stage closes."
      />

      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6">
        {STAGES.map((s, i) => (
          <span key={s} className="font-display text-[10px] uppercase tracking-widest text-white/30">
            {String(i + 1).padStart(2, '0')} {s}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        {projects.map((p) => {
          const total = p.total_stages || STAGES.length;
          const done = p.progress_pct >= 100;
          return (
            <Card key={p.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-semibold">{p.name}</p>
                  {p.lab && (
                    <p className="font-display text-[10px] uppercase tracking-widest text-[#2ADD1B] mt-1.5">
                      {p.lab}
                    </p>
                  )}
                </div>
                <span
                  className={`font-display text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                    done
                      ? 'bg-[#2ADD1B]/10 text-[#2ADD1B] border-[#2ADD1B]/20'
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}
                >
                  {done ? 'Delivered' : `${p.progress_pct}%`}
                </span>
              </div>

              <div className="flex gap-1.5 mt-5">
                {Array.from({ length: total }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < p.stage_index ? 'bg-[#2ADD1B]' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-xs text-white/40">
                {p.started_on && <span>Started {formatDate(p.started_on)}</span>}
                {p.eta && <span>{done ? 'Completed' : 'Target'} {p.eta}</span>}
                {p.owner && <span>Lead: {p.owner}</span>}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
