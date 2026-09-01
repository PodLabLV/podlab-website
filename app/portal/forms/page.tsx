'use client';

/**
 * Form tracking — staff.
 *
 * The point of Phase 4: one screen answering "which form, which person, where
 * did they stop." Before this it was three queries across public.leads,
 * portal_intake_answers, and Monday, plus a guess.
 *
 * Staff-only. A client has no use for a list of everyone else's submissions,
 * and RLS would hide them anyway — this reads what the caller can see, so a
 * client landing here by URL sees only their own rows, not an error.
 */

import { useMemo, useState } from 'react';
import { usePortal, formatDate } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';

const STATUS_TONE: Record<string, string> = {
  sent: '#FFB020',
  opened: '#FFB020',
  'in progress': '#22D3EE',
  submitted: '#2ADD1B',
  reviewed: '#2ADD1B',
};

export default function FormsPage() {
  const { loading, forms, formSubmissions, isStaff } = usePortal();
  const [formFilter, setFormFilter] = useState('All');

  const byKey = useMemo(
    () => Object.fromEntries(forms.map((f) => [f.id, f])),
    [forms],
  );

  const shown = useMemo(
    () =>
      formFilter === 'All'
        ? formSubmissions
        : formSubmissions.filter((s) => byKey[s.form_id]?.form_key === formFilter),
    [formSubmissions, formFilter, byKey],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-white/40">
        <span className="portal-stir inline-block h-4 w-4 rounded-full border border-white/10 border-t-[#2ADD1B]" />
        Loading...
      </div>
    );
  }

  if (formSubmissions.length === 0) {
    return (
      <>
        <PageHeader title="Forms" />
        <EmptyState
          title="No submissions recorded yet"
          body={
            isStaff
              ? 'Every form on the site records here once the Phase 4 migration is applied. Existing captures are unaffected — this sits alongside them.'
              : 'Anything you have filled in for us shows up here.'
          }
        />
      </>
    );
  }

  // Counts per status, for the row of tiles.
  const counts = shown.reduce<Record<string, number>>((acc, s) => {
    const k = (s.status || 'in progress').toLowerCase();
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Forms"
        subtitle={isStaff ? 'Every form, every person, where each one stopped.' : 'What you have sent us.'}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {['in progress', 'submitted', 'opened', 'reviewed'].map((k) => (
          <Card key={k} className="p-4">
            <p className="font-display text-[10px] uppercase tracking-widest text-white/40">{k}</p>
            <p
              className="portal-num mt-2 text-2xl font-semibold"
              style={{ color: STATUS_TONE[k] ?? '#FFFFFF' }}
            >
              {counts[k] ?? 0}
            </p>
          </Card>
        ))}
      </div>

      {forms.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {['All', ...forms.map((f) => f.form_key)].map((k) => (
            <button
              key={k}
              onClick={() => setFormFilter(k)}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${
                formFilter === k
                  ? 'border-[#2ADD1B]/40 bg-[#2ADD1B]/10 text-[#2ADD1B]'
                  : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white/70'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="divide-y divide-white/5">
          {shown.map((s) => {
            const form = byKey[s.form_id];
            const hex = STATUS_TONE[(s.status || '').toLowerCase()] ?? '#FFFFFF40';
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{s.name || s.email || 'Anonymous'}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/30">
                    {[form?.title ?? 'Unknown form', s.email, formatDate(s.created_at)]
                      .filter(Boolean)
                      .join('  ·  ')}
                  </p>
                </div>
                <span
                  className="rounded-lg border px-2.5 py-1 font-display text-[10px] uppercase tracking-widest"
                  style={{ color: hex, borderColor: `${hex}33`, backgroundColor: `${hex}1A` }}
                >
                  {s.status || 'in progress'}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
