'use client';

import { useState } from 'react';
import { usePortal, formatDate } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState, StatusBadge } from '@/components/portal/Shared';

const STATUSES = ['not started', 'in progress', 'blocked', 'done'];

export default function DeliveryPage() {
  const { loading, client, phases, assets, isStaff, setPhaseStatus, accessToken } = usePortal();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <p className="text-white/40 text-sm">Loading...</p>;

  if (!client || phases.length === 0) {
    return (
      <>
        <PageHeader title="Delivery" />
        <EmptyState
          title="No build in flight"
          body="Once a Lab is underway, every phase appears here with its status, who owns it, and what has shipped."
          cta={{ label: 'Book a call', href: 'https://calendly.com/podlablv/app-hiram' }}
        />
      </>
    );
  }

  async function update(id: string, status: string) {
    const previous = phases.find((p) => p.id === id)?.status ?? 'not started';
    setBusy(id);
    setError(null);
    setPhaseStatus(id, status);
    try {
      const res = await fetch('/api/portal/delivery', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken ?? ''}`,
        },
        body: JSON.stringify({ kind: 'phase', id, status }),
      });
      if (!res.ok) throw new Error('update failed');
    } catch {
      setPhaseStatus(id, previous);
      setError('Could not save that. The status has been put back.');
    } finally {
      setBusy(null);
    }
  }

  const done = phases.filter((p) => p.status === 'done').length;
  const blocked = phases.filter((p) => p.status === 'blocked');

  return (
    <>
      <PageHeader
        title="Delivery"
        subtitle={`${client.plan_label ?? 'Your build'}. Every phase, who owns it, and where it stands.`}
      />

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-white">
            {done} of {phases.length} phases complete
          </p>
          {isStaff && (
            <span className="rounded-full border border-[#2ADD1B]/40 px-3 py-1 font-display text-[9.5px] uppercase tracking-[0.2em] text-[#2ADD1B]">
              Staff view
            </span>
          )}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-[#2ADD1B] transition-[width] duration-500"
            style={{ width: `${(done / phases.length) * 100}%` }}
          />
        </div>
      </Card>

      {blocked.length > 0 && (
        <Card className="mb-6 border-red-500/25 bg-red-500/[0.06] p-5">
          <p className="text-sm text-white">
            {blocked.length === 1 ? 'One phase is blocked' : `${blocked.length} phases are blocked`}
          </p>
          <p className="mt-1.5 text-[13px] text-white/55">
            {blocked.map((b) => b.title).join(', ')}. We will be in touch about what we need.
          </p>
        </Card>
      )}

      {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

      <div className="space-y-4">
        {phases.map((phase, i) => (
          <Card
            key={phase.id}
            className={`p-5 ${phase.status === 'done' ? 'opacity-70' : ''}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-[10px] uppercase tracking-widest text-[#2ADD1B]">
                    Phase {String(i + 1).padStart(2, '0')}
                  </span>
                  {phase.owner && (
                    <span className="font-display text-[10px] uppercase tracking-widest text-white/30">
                      {phase.owner}
                    </span>
                  )}
                  {phase.due_label && (
                    <span className="font-display text-[10px] uppercase tracking-widest text-white/30">
                      {phase.due_label}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[15px] font-semibold text-white">{phase.title}</p>
                {phase.detail && (
                  <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/55">
                    {phase.detail}
                  </p>
                )}
              </div>
              <StatusBadge status={phase.status} />
            </div>

            {isStaff && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => update(phase.id, s)}
                    disabled={busy === phase.id || phase.status === s}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] capitalize transition disabled:opacity-40 ${
                      phase.status === s
                        ? 'border-[#2ADD1B]/40 bg-[#2ADD1B]/10 text-[#2ADD1B]'
                        : 'border-white/15 text-white/50 hover:border-white/35 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
                {phase.updated_at && (
                  <span className="ml-auto self-center text-[11px] text-white/25">
                    updated {formatDate(phase.updated_at)}
                  </span>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      <h2 className="font-display mb-4 mt-10 text-sm uppercase tracking-wider text-white">
        Delivered assets
      </h2>
      {assets.length === 0 ? (
        <EmptyState
          title="Nothing shipped yet"
          body="Files land here as each phase closes."
        />
      ) : (
        <Card className="divide-y divide-white/5">
          {assets.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-[14px] text-white">{a.title}</p>
                {a.lab && (
                  <p className="font-display mt-1 text-[10px] uppercase tracking-widest text-white/30">
                    {a.lab}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={a.status} />
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-[#2ADD1B] hover:underline"
                  >
                    Open
                  </a>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
