'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortal, formatDate, formatMoney, type PortalMetric, type PortalPhase } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState, StatusBadge } from '@/components/portal/Shared';
import { usePotatoes, PotatoIcon } from '@/components/portal/HotPotato';
import { chainStatus } from '@/lib/growth-chain';
import { fmtNumber, paceStatus, progress, type GamePlan, type PlanStatus } from '@/lib/portal/game-plan';
import { BOARD_STAGES, boardStageIndex, boardStageLabel, type DashboardPayload, type ReferralCard } from '@/lib/portal/dashboard';
import type { Heat } from '@/lib/portal/potato';

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function Section({ title, action, children, className = '' }: { title: string; action?: { label: string; href: string }; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="flex items-end justify-between gap-4">
        <span className="portal-label block text-p-brandink">{title}</span>
        {action && (
          <Link href={action.href} className="portal-label !text-[12px] text-p-ink/70 transition hover:text-p-brandink">
            {action.label}
          </Link>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function useDashboard(token: string | null, clientId: string | undefined) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    if (!token || !clientId) return;
    try {
      const r = await fetch('/api/portal/dashboard', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      setData((await r.json()) as DashboardPayload);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [token, clientId]);
  useEffect(() => {
    load();
    window.addEventListener('portal:refresh', load);
    return () => window.removeEventListener('portal:refresh', load);
  }, [load]);
  return { data, failed };
}

// ── waiting on you ───────────────────────────────────────────────────────

interface WaitingItem {
  key: string;
  href: string;
  kicker: string;
  title: string;
  detail?: string | null;
  heat?: Heat;
}

function WaitingList({ items }: { items: WaitingItem[] }) {
  if (!items.length) {
    return (
      <Card className="p-6">
        <p className="text-base text-p-ink">Nothing is waiting on you.</p>
        <p className="mt-1 text-sm text-p-ink/70">The potato is in our hands. We&apos;ll tell you the moment something needs you.</p>
      </Card>
    );
  }
  return (
    <ul className="divide-y divide-p-line border-y border-p-line">
      {items.map((s) => (
        <li key={s.key}>
          <Link href={s.href} className="group flex items-center gap-4 py-4 transition hover:bg-p-ink/[0.02]">
            <span className="flex w-6 shrink-0 justify-center">
              {s.heat ? <PotatoIcon heat={s.heat} size={20} /> : <span className="h-2 w-2 bg-p-brand" aria-hidden="true" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="portal-label block !text-[11px] text-p-ink/65">{s.kicker}</span>
              <span className="mt-1 block break-words text-lg font-semibold text-p-ink transition group-hover:text-p-brandink">{s.title}</span>
              {s.detail && <span className="mt-0.5 block break-words text-sm text-p-ink/70">{s.detail}</span>}
            </span>
            <span className="shrink-0 text-p-ink/60 transition group-hover:translate-x-1 group-hover:text-p-brandink">
              <Arrow />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ── project progress ─────────────────────────────────────────────────────

function PhaseDot({ status }: { status: string }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 ${
        status === 'done' ? 'bg-p-brand' : status === 'in progress' ? 'border border-p-brandink bg-p-brand/30' : status === 'blocked' ? 'bg-p-bad' : 'border border-p-ink/25'
      }`}
      aria-hidden="true"
    />
  );
}

function StageLadder({ stage }: { stage: string | null }) {
  const at = boardStageIndex(stage);
  return (
    <div className="mt-2 flex gap-1" aria-hidden="true">
      {BOARD_STAGES.map((s, i) => (
        <span key={s.key} title={s.label} className={`h-1.5 flex-1 ${i < at ? 'bg-p-brand/60' : i === at ? 'bg-p-brand' : 'bg-p-ink/10'}`} />
      ))}
    </div>
  );
}

function ProjectProgress({ phases, boards, planLabel }: { phases: PortalPhase[]; boards: DashboardPayload['boards']; planLabel: string | null }) {
  const done = phases.filter((p) => p.status === 'done').length;
  if (!phases.length && !boards.length) {
    return <EmptyState title="No build in flight" body="Once a Lab is underway, every phase and every video project shows here with where it stands." />;
  }
  return (
    <Card>
      {phases.length > 0 && (
        <>
          <div className="border-b border-p-line p-5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-base text-p-ink">{planLabel ?? 'Your build'}</p>
              <p className="portal-label !text-[12px] text-p-ink/70">
                {done} of {phases.length} phases · {Math.round((done / phases.length) * 100)}%
              </p>
            </div>
            <div className="mt-3 h-1 bg-p-line">
              <div className="h-1 bg-p-brand transition-[width] duration-500" style={{ width: `${(done / phases.length) * 100}%` }} />
            </div>
          </div>
          <ol className="divide-y divide-p-line">
            {phases.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                <PhaseDot status={p.status} />
                <span className="min-w-0 flex-1">
                  <span className={`block break-words text-base ${p.status === 'done' ? 'text-p-ink/70' : 'text-p-ink'}`}>{p.title}</span>
                  {(p.owner || p.due_label) && <span className="mt-0.5 block break-words text-sm text-p-ink/60">{[p.owner, p.due_label].filter(Boolean).join(' · ')}</span>}
                </span>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ol>
        </>
      )}
      {boards.length > 0 && (
        <div className={phases.length ? 'border-t border-p-line' : ''}>
          <p className="portal-label px-5 pt-4 !text-[11px] text-p-ink/65">Video projects</p>
          <ul className="divide-y divide-p-line">
            {boards.map((b) => (
              <li key={b.id} className="px-5 py-4">
                <Link href="/portal/projects" className="group block">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="break-words text-base text-p-ink transition group-hover:text-p-brandink">{b.name}</span>
                    <span className={`portal-label !text-[11px] ${b.stage === 'client_review' ? 'text-p-warn' : 'text-p-ink/70'}`}>{boardStageLabel(b.stage)}</span>
                  </span>
                  <StageLadder stage={b.stage} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

// ── KPIs & targets ───────────────────────────────────────────────────────

const PACE_TONE: Record<PlanStatus, string> = {
  done: 'text-p-brandink border-p-brandink/40',
  'on track': 'text-p-brandink border-p-brandink/40',
  'at risk': 'text-p-warn border-p-warn/40',
  'off track': 'text-p-bad border-p-bad/40',
};

function PlanCard({ plan }: { plan: GamePlan }) {
  const status = plan.status === 'done' ? 'done' : paceStatus(plan);
  const prog = progress(plan);
  return (
    <div className="border border-p-line bg-p-card p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="portal-label !text-[11px] text-p-ink/65">{plan.pillar}</span>
        <span className={`portal-label border px-2 py-0.5 !text-[10px] ${PACE_TONE[status]}`}>{status}</span>
      </div>
      <p className="mt-2 break-words text-base font-semibold leading-snug text-p-ink">{plan.outcome}</p>
      {plan.metric && <p className="mt-1 break-words text-sm text-p-ink/65">{plan.metric}</p>}
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-p-ink">{fmtNumber(plan.current ?? plan.baseline)}</span>
        <span className="text-sm text-p-ink/65">of {fmtNumber(plan.target)}</span>
      </div>
      <div className="mt-2 h-1 bg-p-line">
        <div className="h-1 bg-p-brand" style={{ width: `${Math.round((prog ?? 0) * 100)}%` }} />
      </div>
      <p className="mt-2 text-sm text-p-ink/60">
        Started at {fmtNumber(plan.baseline)}
        {plan.dueOn ? ` · by ${formatDate(plan.dueOn)}` : ''}
      </p>
    </div>
  );
}

function Kpis({ plans, metrics }: { plans: GamePlan[]; metrics: PortalMetric[] }) {
  const period = metrics[0]?.period_label;
  const latest = period ? metrics.filter((m) => m.period_label === period) : [];
  if (!plans.length && !latest.length) {
    return (
      <EmptyState
        title="No targets set yet"
        body="Your 90-day targets live here: the number, where you started, and whether you're on pace. TipTop sets them with you in a few minutes."
        cta={{ label: 'Set targets with TipTop', href: '/portal/tiptop' }}
      />
    );
  }
  return (
    <div className="space-y-6">
      {plans.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      )}
      {latest.length > 0 && (
        <div>
          <p className="portal-label !text-[11px] text-p-ink/65">{period}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {latest.slice(0, 8).map((m) => (
              <div key={m.id} className="border border-p-line bg-p-card p-5">
                <p className="portal-label !text-[11px] text-p-ink/65">{m.label}</p>
                <p className="mt-2 break-words text-2xl font-bold tracking-tight text-p-ink">{m.value}</p>
                {m.sub && <p className="mt-1 break-words text-sm text-p-ink/60">{m.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── payments, credits, referrals ─────────────────────────────────────────

function Payments({ data }: { data: DashboardPayload }) {
  const { invoiceSummary: s, invoices } = data;
  if (!invoices.length) {
    return (
      <Card className="p-5">
        <p className="text-base text-p-ink">No invoices yet.</p>
        <p className="mt-1 text-sm text-p-ink/70">Every payment shows here with its receipt.</p>
      </Card>
    );
  }
  const next = s.next;
  const overdue = next && /overdue/i.test(next.status);
  return (
    <Card>
      <div className="grid grid-cols-2 gap-px bg-p-line">
        <div className="bg-p-card p-5">
          <p className="portal-label !text-[11px] text-p-ink/65">Paid</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-p-ink">{formatMoney(s.paidCents)}</p>
        </div>
        <div className="bg-p-card p-5">
          <p className="portal-label !text-[11px] text-p-ink/65">Open</p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${s.openCents ? (overdue ? 'text-p-bad' : 'text-p-ink') : 'text-p-ink/60'}`}>{formatMoney(s.openCents)}</p>
        </div>
      </div>
      <div className="border-t border-p-line p-5">
        {next ? (
          <>
            <p className="portal-label !text-[11px] text-p-ink/65">{overdue ? 'Overdue' : 'Next due'}</p>
            <p className="mt-1.5 break-words text-base text-p-ink">
              {formatMoney(next.amountCents)} · {next.description || next.invoiceNo || 'Invoice'}
            </p>
            <p className="mt-0.5 text-sm text-p-ink/65">{next.dueOn ? `Due ${formatDate(next.dueOn)}` : next.issuedOn ? `Issued ${formatDate(next.issuedOn)}` : ''}</p>
            {next.payUrl && (
              <a href={next.payUrl} target="_blank" rel="noopener noreferrer" className="portal-label mt-3 inline-flex bg-p-brand px-4 py-2.5 !text-[12px] text-black transition hover:bg-p-pop">
                Pay now
              </a>
            )}
          </>
        ) : (
          <p className="text-base text-p-ink/80">You&apos;re all paid up.</p>
        )}
      </div>
      <Link href="/portal/profile#payments" className="portal-label block border-t border-p-line px-5 py-3 !text-[12px] text-p-ink/70 transition hover:text-p-brandink">
        All payments
      </Link>
    </Card>
  );
}

function Credits({ credits }: { credits: DashboardPayload['credits'] }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="portal-label !text-[11px] text-p-ink/65">Edit credits</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-p-ink">{credits.ready ? credits.balance : '–'}</p>
          <p className="mt-1 text-sm text-p-ink/65">1 credit = a short-form edit. Long-form and VSL edits take 2.</p>
        </div>
        <Link href="/portal/projects?buy=1" className="portal-label shrink-0 bg-p-brand px-4 py-2.5 !text-[12px] text-black transition hover:bg-p-pop">
          Buy credits
        </Link>
      </div>
      <Link href="/portal/profile#credits" className="portal-label mt-4 inline-block !text-[11px] text-p-ink/65 transition hover:text-p-brandink">
        Credit history
      </Link>
    </Card>
  );
}

function Referral({ card }: { card: ReferralCard }) {
  const [copied, setCopied] = useState(false);
  if (card.state === 'member') return null;
  const earn = `${card.ratePct}% of every sale you refer, plus ${card.ratePct}% of each monthly payment for up to ${card.recurringMonths} months on recurring work.`;
  if (card.state === 'join') {
    return (
      <Card className="p-5">
        <p className="portal-label !text-[11px] text-p-brandink">Refer a founder</p>
        <p className="mt-2 text-lg font-semibold leading-snug text-p-ink">Get paid for the founders you send us.</p>
        <p className="mt-1.5 text-sm leading-relaxed text-p-ink/75">As a PodLab Beaker you earn {earn}</p>
        <a href="/affiliate" className="portal-label mt-4 inline-flex border border-p-brandink/60 px-4 py-2.5 !text-[12px] text-p-brandink transition hover:border-p-brandink hover:bg-p-brand/10">
          Join the Beaker program
        </a>
      </Card>
    );
  }
  const copy = () => {
    navigator.clipboard?.writeText(card.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Card className="p-5">
      <p className="portal-label !text-[11px] text-p-brandink">Your referral link</p>
      <div className="mt-3 flex items-stretch gap-2">
        <code className="min-w-0 flex-1 truncate border border-p-line bg-p-paper px-3 py-2.5 text-sm text-p-ink">{card.link}</code>
        <button type="button" onClick={copy} className="portal-label shrink-0 bg-p-brand px-4 !text-[12px] text-black transition hover:bg-p-pop">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-p-ink/75">You earn {earn}</p>
      <div className="mt-4 grid grid-cols-3 gap-px border border-p-line bg-p-line">
        {[
          ['Earned', formatMoney(card.earnedCents)],
          ['On hold', formatMoney(card.onHoldCents)],
          ['Referred', String(card.referrals)],
        ].map(([k, v]) => (
          <div key={k} className="bg-p-paper p-3">
            <p className="portal-label !text-[10px] text-p-ink/60">{k}</p>
            <p className="mt-1 text-lg font-bold text-p-ink">{v}</p>
          </div>
        ))}
      </div>
      <Link href="/portal/beaker" className="portal-label mt-4 inline-block !text-[11px] text-p-ink/65 transition hover:text-p-brandink">
        Refer someone, referrals and payouts
      </Link>
    </Card>
  );
}

// ── page ─────────────────────────────────────────────────────────────────

export default function PortalDashboard() {
  const { loading, error, client, phases, metrics, products, elementRows, viewerEmail, isStaff, isBeaker, accessToken } = usePortal();
  const { data, failed } = useDashboard(accessToken, client?.id);
  const potatoes = usePotatoes();

  if (loading) return <p className="portal-label !text-[12px] text-p-ink/70">Loading your portal</p>;

  if (error) {
    return <EmptyState title="Something went wrong" body={`We could not load your portal. ${error}`} cta={{ label: 'Email PodLab', href: 'mailto:info@podlablv.com' }} />;
  }

  if (!client) {
    // A Beaker with no client account: the shell is sending them to /portal/beaker.
    if (isBeaker) return <p className="portal-label !text-[12px] text-p-ink/70">Opening your Beaker account</p>;
    // Team members land here when they sign in on the client door by mistake.
    if (isStaff || viewerEmail?.toLowerCase().endsWith('@podlablv.com')) {
      return (
        <>
          <PageHeader eyebrow="PodLab team" title="This is the" accent="client side." />
          <EmptyState title="No client record on this account" body="The PodLab Portal is what clients see. Your pipeline, deals and referrals live in the CRM." cta={{ label: 'Open the CRM', href: 'https://crm.podlablv.com' }} />
          {isStaff && (
            <a href="/portal/clients" className="portal-label mt-6 inline-flex items-center gap-3 border border-p-line px-5 py-3 !text-[13px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink">
              Invite clients to the portal
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

  // Waiting on you: open 'waiting' notifications first, then the potatoes the
  // client holds (scripts, cuts, intake, brand gaps, action items, check-ins),
  // then the Growth Chain check and Clarity Document. One row per page.
  const waiting: WaitingItem[] = [];
  const seen = new Set<string>();
  const push = (w: WaitingItem) => {
    const k = w.href;
    if (seen.has(k)) return;
    seen.add(k);
    waiting.push(w);
  };
  for (const n of data?.waiting ?? []) {
    push({ key: `n:${n.id}`, href: n.link || '/portal', kicker: 'Waiting on you', title: n.title, detail: n.body });
  }
  for (const p of (potatoes ?? []).filter((x) => x.holder === 'client')) {
    push({ key: `p:${p.key}`, href: p.href, kicker: p.days ? `On you · ${p.days} ${p.days === 1 ? 'day' : 'days'}` : 'On you · today', title: p.title, detail: p.why, heat: p.heat });
  }
  const chain = chainStatus(products.map((p) => p.product), elementRows, phases);
  if (chain.answered === 0) push({ key: 'growth', href: '/portal/growth', kicker: 'Two minutes', title: 'Score your Growth Chain', detail: 'Eight questions. Find the one element holding the rest back.' });
  if (client.document_url) push({ key: 'doc', href: '/portal/document', kicker: 'Ready to read', title: 'Your Clarity Document', detail: 'Read it and flag anything you want changed.' });

  const phasesDone = phases.filter((p) => p.status === 'done').length;
  const onPodLab = (potatoes ?? []).filter((p) => p.holder === 'team').length;

  const stats = [
    { label: 'Build progress', value: phases.length ? `${Math.round((phasesDone / phases.length) * 100)}%` : '–', sub: phases.length ? `${phasesDone} of ${phases.length} phases` : 'Starts at kickoff' },
    { label: 'Waiting on you', value: String(waiting.length), sub: onPodLab ? `${onPodLab} on PodLab` : 'Nothing on PodLab' },
    { label: 'Edit credits', value: data?.credits.ready ? String(data.credits.balance) : '–', sub: 'Buy more any time', href: '/portal/projects?buy=1' },
    {
      label: data?.invoiceSummary.next ? 'Next payment' : 'Paid to date',
      value: data ? formatMoney(data.invoiceSummary.next ? data.invoiceSummary.next.amountCents : data.invoiceSummary.paidCents) : '–',
      sub: data?.invoiceSummary.next ? (data.invoiceSummary.next.dueOn ? `Due ${formatDate(data.invoiceSummary.next.dueOn)}` : data.invoiceSummary.next.status) : 'All paid up',
    },
  ];

  return (
    <div>
      <PageHeader eyebrow={[client.business_name, client.plan_label].filter(Boolean).join(' · ')} title="Welcome back," accent={`${firstName}.`} />

      {client.welcome_note && <p className="-mt-4 mb-10 max-w-3xl border-l-2 border-p-brandink pl-5 text-lg leading-relaxed text-p-ink/90">{client.welcome_note}</p>}

      {failed && (
        <p className="mb-6 border-l-2 border-p-warn bg-p-warn/5 px-4 py-3 text-sm text-p-ink/85">Some of your dashboard didn&apos;t load. Refresh to try again.</p>
      )}

      <div className="grid grid-cols-2 gap-px border border-p-line bg-p-line lg:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <>
              <p className="portal-label !text-[11px] text-p-ink/65">{s.label}</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-p-ink md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-p-ink/60">{s.sub}</p>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="bg-p-paper p-5 transition hover:bg-p-ink/[0.03] md:p-6">
              {body}
            </Link>
          ) : (
            <div key={s.label} className="bg-p-paper p-5 md:p-6">
              {body}
            </div>
          );
        })}
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-5">
        <div className="space-y-12 lg:col-span-3">
          <Section title="Waiting on you">
            <WaitingList items={waiting} />
          </Section>
          <Section title="Project progress" action={phases.length ? { label: 'All phases', href: '/portal/delivery' } : undefined}>
            <ProjectProgress phases={phases} boards={data?.boards ?? []} planLabel={client.plan_label} />
          </Section>
        </div>
        <div className="space-y-12 lg:col-span-2">
          <Section title="Credits">{data ? <Credits credits={data.credits} /> : <div className="h-32 animate-pulse border border-p-line bg-p-card" />}</Section>
          <Section title="Payments">{data ? <Payments data={data} /> : <div className="h-40 animate-pulse border border-p-line bg-p-card" />}</Section>
          {data && data.referral.state !== 'member' && (
            <Section title="Referrals">
              <Referral card={data.referral} />
            </Section>
          )}
        </div>
      </div>

      <Section title="KPIs & targets" action={data?.plans.length ? { label: 'Game plan', href: '/portal/plan' } : undefined} className="mt-12">
        <Kpis plans={data?.plans ?? []} metrics={metrics} />
      </Section>
    </div>
  );
}
