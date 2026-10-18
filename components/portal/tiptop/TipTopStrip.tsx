'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { fmtNumber } from '@/lib/portal/game-plan';
import type { TipTopContext } from '@/app/api/portal/tiptop/context/route';

// The strip beside TipTop's chat on the TipTop tab: what she is tracking for
// this client (her notes on the business, targets with pace, the action plan
// with due dates, builds). Buttons ask her the matching question.

const TONE: Record<string, string> = {
  'on track': 'border-p-brandink/60 text-p-brandink',
  'at risk': 'border-p-warn/60 text-p-warn',
  'off track': 'border-[#ff8a1f]/70 text-[#ff8a1f]',
  done: 'border-p-brandink bg-p-brand text-black',
};

const shortDate = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-p-line px-5 py-5 last:border-b-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="portal-label !text-[12px] text-p-brandink">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

interface TipTopStripProps {
  ctx: TipTopContext;
  ask: (prompt: string) => void;
  readOnly: boolean;
}

export default function TipTopStrip({ ctx, ask, readOnly }: TipTopStripProps) {
  const u = ctx.understanding;
  const overdue = ctx.actions.filter((a) => a.overdue).length;
  const askBtn = (label: string, prompt: string) =>
    readOnly ? null : (
      <button type="button" onClick={() => ask(prompt)} className="portal-label mt-3 border border-p-brandink/50 px-3 py-2 !text-[11px] text-p-brandink transition hover:bg-p-brand hover:text-black">
        {label}
      </button>
    );

  return (
    <div>
      <Section title="What I know" aside={u.ready ? <span className="text-[13px] text-p-ink/60">{u.facts.length}/{u.facts.length + u.missing.length}</span> : null}>
        {!u.ready ? (
          <p className="text-[15px] text-p-ink/70">My notes switch on shortly.</p>
        ) : u.facts.length ? (
          <dl className="space-y-2.5">
            {u.facts.map((f) => (
              <div key={f.key}>
                <dt className="text-[13px] text-p-ink/60">{f.label}</dt>
                <dd className="text-[15px] leading-snug text-p-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[15px] text-p-ink/75">Nothing yet. I start by learning how your business works, one question at a time.</p>
        )}
        {u.ready && u.next && (
          <>
            <p className="mt-3 text-[13px] text-p-ink/60">Still learning: {u.missing.slice(0, 4).join(', ').toLowerCase()}{u.missing.length > 4 ? '…' : ''}</p>
            {askBtn(u.facts.length ? 'Answer the next one' : 'Get to know my business', u.facts.length ? `Ask me about ${u.next.toLowerCase()}.` : 'Get to know my business. One question at a time.')}
          </>
        )}
      </Section>

      <Section title="Targets" aside={<Link href="/portal/plan" className="text-[13px] text-p-ink/60 underline-offset-2 hover:text-p-brandink hover:underline">Game Plan</Link>}>
        {!ctx.plansReady || !ctx.plans.length ? (
          <>
            <p className="text-[15px] text-p-ink/75">No targets yet. A number per part of the business, 90 days out, with this week&apos;s moves.</p>
            {askBtn('Build my 90-day plan', 'Help me build my 90-day game plan. Where should I start?')}
          </>
        ) : (
          <ul className="space-y-4">
            {ctx.plans.map((p) => (
              <li key={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[15px] font-semibold leading-snug text-p-ink">{p.outcome}</p>
                  <span className={`portal-label shrink-0 border px-1.5 py-0.5 !text-[10px] ${TONE[p.status] ?? TONE['on track']}`}>{p.status}</span>
                </div>
                <div className="relative mt-2 h-1.5 bg-p-line" aria-hidden="true">
                  <div className="h-full bg-p-brand" style={{ width: `${Math.max(2, Math.round((p.progress ?? 0) * 100))}%` }} />
                  {p.clock !== null && <span className="absolute -top-1 h-3.5 w-px bg-p-ink/60" style={{ left: `${Math.round(p.clock * 100)}%` }} />}
                </div>
                <p className="mt-1.5 text-[13px] text-p-ink/65">
                  {p.pillar} · {fmtNumber(p.current ?? p.baseline)} of {fmtNumber(p.target)}
                  {p.metric ? ` ${p.metric}` : ''}
                  {p.dueOn ? ` · by ${shortDate(p.dueOn)}` : ''}
                </p>
                {p.checkInDue && !readOnly && (
                  <button type="button" onClick={() => ask(`Weekly check-in for my ${p.pillar} plan.`)} className="portal-label mt-2 bg-p-brand px-3 py-1.5 !text-[11px] text-black transition hover:bg-p-pop">
                    Check-in due
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Action plan"
        aside={
          <Link href="/portal/actions" className="text-[13px] text-p-ink/60 underline-offset-2 hover:text-p-brandink hover:underline">
            {ctx.actions.length} open{overdue ? ` · ${overdue} past due` : ''}
          </Link>
        }
      >
        {ctx.actions.length ? (
          <ul className="space-y-2">
            {ctx.actions.slice(0, 8).map((a) => (
              <li key={a.id} className="flex gap-2.5 text-[15px] leading-snug">
                <span className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 border ${a.overdue ? 'border-p-warn bg-p-warn/30' : 'border-p-ink/30'}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="text-p-ink">{a.title}</span>
                  {a.dueOn && <span className={`ml-2 text-[13px] ${a.overdue ? 'text-p-warn' : 'text-p-ink/60'}`}>{a.overdue ? `past due ${shortDate(a.dueOn)}` : `due ${shortDate(a.dueOn)}`}</span>}
                </span>
              </li>
            ))}
            {ctx.actions.length > 8 && <li className="text-[13px] text-p-ink/60">and {ctx.actions.length - 8} more</li>}
          </ul>
        ) : (
          <p className="text-[15px] text-p-ink/75">Nothing open. Ask me for this week&apos;s moves.</p>
        )}
      </Section>

      {ctx.jobs.ready && ctx.jobs.items.length > 0 && (
        <Section title="Builds">
          <ul className="space-y-2">
            {ctx.jobs.items.map((j) => (
              <li key={j.id} className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="text-p-ink">{j.label}</span>
                <span className={`text-[13px] ${j.active ? 'text-p-brandink' : 'text-p-ink/60'}`}>{j.status}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
