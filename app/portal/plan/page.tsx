'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePortal, formatDate } from '@/lib/portal-data';
import { PageHeader, EmptyState } from '@/components/portal/Shared';
import { checkInDue, elapsed, fmtNumber, PILLAR_BLURB, PILLAR_STARTER, PILLARS, progress, type GamePlan, type Pillar, type PlanStatus } from '@/lib/portal/game-plan';
import type { PlanActionItem } from '@/app/api/portal/game-plan/route';

const STATUS_TONE: Record<PlanStatus, string> = {
  'on track': 'border-[#2add1b]/60 text-[#2add1b]',
  'at risk': 'border-yellow-300/60 text-yellow-300',
  'off track': 'border-[#ff8a1f]/70 text-[#ff8a1f]',
  done: 'border-[#2add1b] bg-[#2add1b] text-black',
};

const askTipTop = (prompt: string) => window.dispatchEvent(new CustomEvent('tiptop:open', { detail: { prompt } }));

function ProgressBar({ plan }: { plan: GamePlan }) {
  const prog = progress(plan);
  const time = elapsed(plan);
  return (
    <div>
      <div className="relative h-2 bg-[#1a1a1a]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={prog === null ? undefined : Math.round(prog * 100)} aria-label="Progress to target">
        <div className={`h-full ${plan.status === 'off track' ? 'bg-[#ff8a1f]' : plan.status === 'at risk' ? 'bg-yellow-300' : 'bg-[#2add1b]'}`} style={{ width: `${Math.max(2, Math.round((prog ?? 0) * 100))}%` }} />
        {/* Where the clock is: the number should be at or past this line. */}
        {time !== null && <span className="absolute -top-1 h-4 w-px bg-[#eeeeee]/60" style={{ left: `${Math.round(time * 100)}%` }} title="Where the clock is" />}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-[#eeeeee]/45">
        <span>
          {fmtNumber(plan.current ?? plan.baseline)} of {fmtNumber(plan.target)}
          {plan.metric ? ` ${plan.metric}` : ''}
        </span>
        <span>{time !== null ? `${Math.round(time * 100)}% of the clock` : plan.dueOn ? '' : 'no finish line set'}</span>
      </div>
    </div>
  );
}

function PillarCard({ pillar, plan, actions, readOnly }: { pillar: Pillar; plan: GamePlan | undefined; actions: PlanActionItem[]; readOnly: boolean }) {
  const open = actions.filter((a) => !a.done);
  const done = actions.length - open.length;

  if (!plan) {
    return (
      <div className="flex flex-col border border-dashed border-[#eeeeee]/15 bg-black p-6">
        <p className="portal-label !text-[9px] text-[#eeeeee]/45">{pillar}</p>
        <p className="mt-3 text-sm text-[#eeeeee]/55">{PILLAR_BLURB[pillar]}</p>
        {!readOnly && (
          <button onClick={() => askTipTop(PILLAR_STARTER[pillar])} className="portal-label mt-5 self-start border border-[#2add1b]/50 px-4 py-2.5 !text-[9.5px] text-[#2add1b] transition hover:bg-[#2add1b] hover:text-black">
            Build it with TipTop
          </button>
        )}
      </div>
    );
  }

  const due = checkInDue(plan);
  return (
    <div className="flex flex-col border border-[#1a1a1a] bg-[#0a0a0a] p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="portal-label !text-[9px] text-[#2add1b]">{pillar}</p>
        <span className={`portal-label shrink-0 border px-2 py-1 !text-[8.5px] ${STATUS_TONE[plan.status]}`}>{plan.status}</span>
      </div>
      <h2 className="mt-3 text-xl font-bold leading-snug text-[#eeeeee]">{plan.outcome}</h2>
      <p className="mt-1 text-xs text-[#eeeeee]/40">{plan.dueOn ? `By ${formatDate(plan.dueOn)}` : 'No finish line yet'}</p>

      <div className="mt-5">
        <ProgressBar plan={plan} />
      </div>

      {plan.priorities.length > 0 && (
        <div className="mt-6">
          <p className="portal-label !text-[8.5px] text-[#eeeeee]/40">Priorities</p>
          <ol className="mt-2 space-y-1.5">
            {plan.priorities.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-[#eeeeee]/85">
                <span className="portal-label mt-0.5 !text-[9px] text-[#2add1b]">{String(i + 1).padStart(2, '0')}</span>
                {p}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-6">
        <p className="portal-label !text-[8.5px] text-[#eeeeee]/40">
          This week · {open.length} open{done ? `, ${done} done` : ''}
        </p>
        {open.length ? (
          <ul className="mt-2 space-y-1.5">
            {open.slice(0, 4).map((a) => (
              <li key={a.id} className="text-sm text-[#eeeeee]/75">
                <span className="mr-2 inline-block h-2.5 w-2.5 border border-[#eeeeee]/30 align-middle" />
                {a.title}
                {a.effort ? <span className="ml-2 text-xs text-[#eeeeee]/35">{a.effort}</span> : null}
              </li>
            ))}
            {open.length > 4 && <li className="text-xs text-[#eeeeee]/40">and {open.length - 4} more</li>}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[#eeeeee]/45">{done ? 'All clear. Ask TipTop for next week’s moves.' : 'No actions yet.'}</p>
        )}
      </div>

      <div className="mt-auto pt-6">
        {plan.lastCheckIn && (
          <p className="mb-3 border-l-2 border-[#1a1a1a] pl-3 text-xs text-[#eeeeee]/50">
            {formatDate(plan.lastCheckInAt)}: {plan.lastCheckIn}
          </p>
        )}
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => askTipTop(`Weekly check-in for my ${pillar} plan.`)}
              className={`portal-label px-4 py-2.5 !text-[9.5px] transition ${due ? 'bg-[#2add1b] text-black hover:bg-[#eeeeee]' : 'border border-[#1a1a1a] text-[#eeeeee]/70 hover:border-[#2add1b] hover:text-[#2add1b]'}`}
            >
              {due ? 'Check-in due' : 'Check in'}
            </button>
            <Link href="/portal/actions" className="portal-label border border-[#1a1a1a] px-4 py-2.5 !text-[9.5px] text-[#eeeeee]/70 transition hover:border-[#2add1b] hover:text-[#2add1b]">
              Action items
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanPageInner() {
  const { loading, client, accessToken, isStaff } = usePortal();
  const params = useSearchParams();
  const staffClient = isStaff ? params.get('client') : null;
  const [data, setData] = useState<{ ready: boolean; plans: GamePlan[]; actions: PlanActionItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!accessToken) return;
    const qs = staffClient ? `?clientId=${encodeURIComponent(staffClient)}` : '';
    fetch(`/api/portal/game-plan${qs}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Could not load your game plan.');
        setData(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your game plan.'));
  }, [accessToken, staffClient]);

  useEffect(() => {
    if (isStaff && !staffClient) return;
    load();
  }, [load, isStaff, staffClient]);
  // TipTop just set a plan or checked in.
  useEffect(() => {
    window.addEventListener('portal:refresh', load);
    return () => window.removeEventListener('portal:refresh', load);
  }, [load]);

  if (loading) return <p className="text-sm text-[#eeeeee]/40">Loading...</p>;
  if (isStaff && !staffClient) return <EmptyState title="Pick a client" body="Open a client from Clients · staff to see their game plan." />;
  if (!client && !staffClient) return <EmptyState title="Account not set up yet" body="Once PodLab sets up your portal, your game plan lives here." />;
  if (error) return <EmptyState title="Could not load your game plan" body={error} />;
  if (!data) return <p className="portal-label !text-[9px] text-[#eeeeee]/40">Loading your game plan</p>;
  if (!data.ready) return <EmptyState title="Almost ready" body="The Game Plan is being switched on for your account. Check back shortly." />;

  const byPillar = new Map(data.plans.map((p) => [p.pillar, p]));
  const set = data.plans.length;
  return (
    <div>
      <PageHeader
        eyebrow="Game Plan"
        title="The next 90 days,"
        accent="on one page."
        subtitle="A number to hit and three priorities for each part of the business, with this week's moves underneath. TipTop builds it with you and checks in every week."
      />
      {set === 0 && !staffClient && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-l-2 border-[#2add1b] bg-[#2add1b]/5 px-5 py-4">
          <p className="text-sm text-[#eeeeee]/80">Start with the part of the business that&apos;s holding the rest back. TipTop will ask a few questions, do the math, and put the first moves on your list.</p>
          <button onClick={() => askTipTop("Help me build my 90-day game plan. Where should I start?")} className="portal-label bg-[#2add1b] px-5 py-3 !text-[10px] text-black transition hover:bg-[#eeeeee]">
            Build my game plan
          </button>
        </div>
      )}
      <div className="grid gap-px border border-[#1a1a1a] bg-[#1a1a1a] lg:grid-cols-2">
        {PILLARS.map((p) => (
          <PillarCard key={p} pillar={p} plan={byPillar.get(p)} actions={data.actions.filter((a) => a.pillar === p)} readOnly={Boolean(staffClient)} />
        ))}
      </div>
    </div>
  );
}

export default function GamePlanPage() {
  return (
    <Suspense fallback={<p className="portal-label !text-[9px] text-[#eeeeee]/40">Loading your game plan</p>}>
      <PlanPageInner />
    </Suspense>
  );
}
