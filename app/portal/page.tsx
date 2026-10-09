'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortal, formatDate, type PortalPhase } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState, StatusBadge } from '@/components/portal/Shared';
import { chainStatus } from '@/lib/growth-chain';
import DeliveredList from '@/components/portal/DeliveredList';
import { loadScriptIndex } from '@/lib/portal/browser';
import { isWaitingOnClient } from '@/lib/portal/scripts';
import type { ProductionPayload } from '@/lib/production';
import { brandGaps, type BrandPayload } from '@/lib/portal/brand';

interface NextStep {
  href: string;
  kicker: string;
  title: string;
  detail?: string;
}

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/**
 * What is waiting on the client elsewhere in the portal: scripts to approve,
 * cuts to watch, and gaps in their brand kit. Both are best-effort; a module that isn't live yet adds nothing.
 */
function useWaitingOnClient(clientId: string | undefined, token: string | null): NextStep[] {
  const [steps, setSteps] = useState<NextStep[]>([]);
  useEffect(() => {
    if (!clientId || !token) return;
    let cancelled = false;
    (async () => {
      const found: NextStep[] = [];
      try {
        const { scripts } = await loadScriptIndex();
        for (const sc of scripts.filter((x) => isWaitingOnClient(x.status)).slice(0, 2)) {
          found.push({ href: `/portal/scripts/${sc.id}`, kicker: 'Waiting on your approval', title: sc.title, detail: 'Read it, leave notes, or approve it so we can shoot.' });
        }
      } catch {
        // Scripts not live yet.
      }
      try {
        const res = await fetch('/api/portal/production', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as ProductionPayload;
          const ready = data.boards.flatMap((b) => b.cards).filter((c) => c.videoUrl && !c.done);
          if (ready.length) {
            found.push({
              href: '/portal/production',
              kicker: 'Ready to watch',
              title: ready.length === 1 ? ready[0].title : `${ready.length} cuts are ready to watch`,
              detail: 'Pause on any moment to leave a timestamped note for the editor.',
            });
          }
        }
      } catch {
        // Production not linked yet.
      }
      try {
        const res = await fetch('/api/portal/brand', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (res.ok) {
          const { brand } = (await res.json()) as { brand: BrandPayload };
          const gaps = brand.ready ? brandGaps(brand) : [];
          if (gaps.length) {
            found.push({ href: '/portal/brand', kicker: 'Your brand', title: gaps[0], detail: 'Your editors need your logo, colors and fonts to brand your videos.' });
          }
        }
      } catch {
        // Brand page not live yet.
      }
      if (!cancelled) setSteps(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, token]);
  return steps;
}

/** The phase being worked now: the first in progress, else the first not started. */
function currentPhase(phases: PortalPhase[]): PortalPhase | undefined {
  return phases.find((p) => p.status === 'in progress') ?? phases.find((p) => p.status === 'not started');
}

export default function PortalDashboard() {
  const { loading, error, client, assets, activity, actionItems, phases, intakeItems, answers, viewerEmail, products, elementRows, isStaff, accessToken } =
    usePortal();
  const waiting = useWaitingOnClient(client?.id, accessToken);

  if (loading) {
    return <p className="portal-label !text-[9px] text-p-ink/40">Loading your portal</p>;
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
    // Team members land here when they sign in on the client door by mistake.
    if (isStaff || viewerEmail?.toLowerCase().endsWith('@podlablv.com')) {
      return (
        <>
          <PageHeader eyebrow="PodLab team" title="This is the" accent="client side." />
          <EmptyState
            title="No client record on this account"
            body="The PodLab Portal is what clients see. Your pipeline, deals and referrals live in the CRM."
            cta={{ label: 'Open the CRM', href: 'https://crm.podlablv.com' }}
          />
          {isStaff && (
            <a
              href="/portal/clients"
              className="portal-label mt-6 inline-flex items-center gap-3 border border-p-line px-5 py-3 !text-[10px] text-p-ink/70 transition hover:border-p-brandink hover:text-p-brandink"
            >
              Invite clients to the portal →
            </a>
          )}
        </>
      );
    }
    return (
      <>
        <PageHeader eyebrow="PodLab Portal" title="Your portal is" accent="being set up." />
        <EmptyState
          title="Almost ready"
          body="Your account is active but we have not finished loading your workspace. This usually takes less than a day. Reach out if you were expecting to see something here."
          cta={{ label: 'Email PodLab', href: 'mailto:info@podlablv.com' }}
        />
      </>
    );
  }

  const firstName = client.first_name || client.business_name;
  const ready = assets.filter((a) => (a.status || '').toLowerCase() === 'ready');
  const openActions = actionItems.filter((i) => i.status !== 'done');
  const phasesDone = phases.filter((p) => p.status === 'done').length;
  const answered = intakeItems.filter((i) => (answers[i.id] ?? '').trim() !== '').length;
  const now = currentPhase(phases);

  const chain = chainStatus(products.map((p) => p.product), elementRows, phases);
  const constraint = chain.elements.find((e) => e.key === chain.constraint);

  // What the client should do next, most important first.
  const steps: NextStep[] = [...waiting];
  for (const a of assets.filter((x) => (x.status || '').toLowerCase() === 'in review').slice(0, 2)) {
    steps.push({ href: '/portal/deliverables', kicker: 'Ready for your review', title: a.title, detail: 'Approve it, or leave notes on what should change.' });
  }
  if (chain.answered === 0) {
    steps.push({
      href: '/portal/growth',
      kicker: 'Two minutes',
      title: 'Score your Growth Chain',
      detail: 'Eight questions. Find the one element holding the rest back.',
    });
  } else if (constraint) {
    steps.push({
      href: '/portal/growth',
      kicker: 'Your constraint',
      title: constraint.element.name,
      detail: constraint.element.without,
    });
  }
  if (intakeItems.length > 0 && answered < intakeItems.length) {
    steps.push({
      href: '/portal/intake',
      kicker: 'From you',
      title: answered === 0 ? 'Start your intake' : 'Finish your intake',
      detail: `${answered} of ${intakeItems.length} answered. It saves as you type.`,
    });
  }
  if (client.document_url) {
    steps.push({
      href: '/portal/document',
      kicker: 'Ready to read',
      title: 'Your Clarity Document',
      detail: 'Read it and flag anything you want changed.',
    });
  }
  if (openActions[0]) {
    steps.push({
      href: '/portal/actions',
      kicker: 'Action item',
      title: openActions[0].title,
      detail: openActions.length > 1 ? `${openActions.length - 1} more after this one.` : undefined,
    });
  }
  if (now) {
    steps.push({
      href: '/portal/delivery',
      kicker: now.status === 'in progress' ? 'We are building' : 'Up next on our side',
      title: now.title,
      detail: [now.owner, now.due_label].filter(Boolean).join(' · ') || undefined,
    });
  }

  const stats = [
    { label: 'Phases complete', value: phases.length ? `${phasesDone}/${phases.length}` : '—' },
    { label: 'Deliverables ready', value: String(ready.length) },
    { label: 'Action items open', value: String(openActions.length) },
    { label: 'Intake answered', value: intakeItems.length ? `${Math.round((answered / intakeItems.length) * 100)}%` : '—' },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={[client.business_name, client.plan_label].filter(Boolean).join(' · ')}
        title="Welcome back,"
        accent={`${firstName}.`}
      />

      {client.welcome_note && (
        <p className="-mt-4 mb-10 max-w-3xl border-l-2 border-p-brandink pl-5 text-base leading-relaxed text-p-ink/80">
          {client.welcome_note}
        </p>
      )}

      {/* Stat strip: hairline-ruled cells, the site's grid language. */}
      <div className="grid grid-cols-2 gap-px border border-p-line bg-p-line lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-p-paper p-5 md:p-6">
            <p className="portal-label !text-[9px] text-p-ink/40">{s.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-p-ink md:text-4xl">{s.value}</p>
          </div>
        ))}
      </div>

      {/* The chain at a glance: one square per element, in order. */}
      <Link href="/portal/growth" className="group mt-px flex flex-wrap items-center gap-x-6 gap-y-3 border border-t-0 border-p-line bg-p-card px-5 py-4 transition hover:bg-p-ink/[0.03]">
        <span className="portal-label !text-[9px] text-p-ink/40">Growth Chain</span>
        <span className="flex gap-1.5" aria-label={`${chain.unlocked} of 8 elements unlocked`}>
          {chain.elements.map((e) => (
            <span
              key={e.key}
              title={`${e.element.name}: ${e.state}`}
              className={`flex h-7 w-7 items-center justify-center border text-[10px] font-bold ${
                e.state === 'unlocked'
                  ? 'border-p-brandink bg-p-brand text-black'
                  : e.state === 'building'
                    ? 'border-p-brandink/60 text-p-brandink'
                    : 'border-p-ink/15 text-p-ink/30'
              }`}
            >
              {e.element.symbol}
            </span>
          ))}
        </span>
        <span className="text-sm text-p-ink/60 transition group-hover:text-p-brandink">
          {chain.unlocked} of 8 unlocked{constraint ? ` · constraint: ${constraint.element.name}` : ''}
        </span>
      </Link>

      {steps.length > 0 && (
        <section className="mt-12">
          <span className="portal-label block text-p-brandink">Next up</span>
          <ul className="mt-4 divide-y divide-p-line border-y border-p-line">
            {steps.map((s, i) => (
              <li key={s.href + s.title}>
                <Link href={s.href} className="group flex items-center gap-5 py-5 transition hover:bg-p-ink/[0.02]">
                  <span className="portal-label w-6 shrink-0 !text-[10px] text-p-ink/25">{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1">
                    <span className="portal-label block !text-[9px] text-p-ink/40">{s.kicker}</span>
                    <span className="mt-1.5 block text-lg font-semibold text-p-ink transition group-hover:text-p-brandink">{s.title}</span>
                    {s.detail && <span className="mt-1 block text-sm text-p-ink/50">{s.detail}</span>}
                  </span>
                  <span className="shrink-0 text-p-ink/30 transition group-hover:translate-x-1 group-hover:text-p-brandink">
                    <Arrow />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-12 grid gap-10 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="flex items-end justify-between gap-4">
            <span className="portal-label block text-p-brandink">Your build</span>
            {phases.length > 0 && (
              <Link href="/portal/delivery" className="portal-label !text-[9px] text-p-ink/40 transition hover:text-p-brandink">
                All phases
              </Link>
            )}
          </div>
          {phases.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No build in flight"
                body="Once a Lab is underway, every phase shows here with who owns it and where it stands."
              />
            </div>
          ) : (
            <Card className="mt-4">
              <div className="border-b border-p-line p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm text-p-ink">{client.plan_label ?? 'Your build'}</p>
                  <p className="portal-label !text-[9px] text-p-ink/40">
                    {Math.round((phasesDone / phases.length) * 100)}% complete
                  </p>
                </div>
                <div className="mt-3 h-px bg-p-line">
                  <div className="h-px bg-p-brand transition-[width] duration-500" style={{ width: `${(phasesDone / phases.length) * 100}%` }} />
                </div>
              </div>
              <ol className="divide-y divide-p-line">
                {phases.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center gap-4 px-5 py-4">
                    <span
                      className={`h-2 w-2 shrink-0 ${
                        p.status === 'done'
                          ? 'bg-p-brand'
                          : p.status === 'in progress'
                            ? 'border border-p-brandink bg-p-brand/30'
                            : p.status === 'blocked'
                              ? 'bg-p-bad'
                              : 'border border-p-ink/25'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${p.status === 'done' ? 'text-p-ink/50' : 'text-p-ink'}`}>{p.title}</span>
                      {(p.owner || p.due_label) && (
                        <span className="mt-0.5 block truncate text-xs text-p-ink/35">
                          {[p.owner, p.due_label].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </section>

        <section className="lg:col-span-2">
          <span className="portal-label block text-p-brandink">Delivered</span>
          <div className="mt-4">
            <DeliveredList limit={5} />
          </div>
          <span className="portal-label mt-10 block text-p-brandink">Recent activity</span>
          {activity.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Nothing logged yet"
                body="Activity shows up here as we deliver files, publish reports, and complete milestones."
              />
            </div>
          ) : (
            <ol className="mt-4 border-l border-p-line">
              {activity.slice(0, 6).map((a) => (
                <li key={a.id} className="relative pb-6 pl-6 last:pb-0">
                  <span className="absolute -left-[3px] top-1.5 h-[5px] w-[5px] bg-p-brand" aria-hidden="true" />
                  <p className="text-sm text-p-ink">{a.title}</p>
                  <p className="portal-label mt-1.5 !text-[8.5px] text-p-ink/35">
                    {[a.kind, a.happened_at ? formatDate(a.happened_at) : ''].filter(Boolean).join(' · ')}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
