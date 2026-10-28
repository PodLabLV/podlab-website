'use client';

// The client's Beaker page. Five blocks, top to bottom: refer someone (copy,
// text, email, or a two-field quick refer), points toward the next reward,
// what they've earned, where each referral is, and getting paid (payout setup,
// credit, and the statement behind a disclosure).

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronDown, Clapperboard, Copy, Layers, Lock, Magnet, Mail, MessageSquare, Scissors, Upload, type LucideIcon } from 'lucide-react';
import { usePortal } from '@/lib/portal-data';
import { PageHeader, EmptyState } from '@/components/portal/Shared';
import { TRACK, contactField, lockedText, mailtoHref, nextGoal, payoutSetup, primaryLink, referralStep, smsHref } from '@/lib/portal/beaker-share';

interface LedgerRow {
  id: string;
  lead_name: string | null;
  kind: string;
  amount_cents: number;
  effective_status: 'held' | 'payable' | 'paid' | 'void' | 'disputed';
  hold_until: string;
  paid_at_source: string;
}

interface Summary {
  beaker: boolean;
  affiliate: { beakerId: string; name: string; whopUsername: string | null; whopLinked: boolean; w9: 'missing' | 'received' | 'verified'; termsCurrent: boolean; termsVersion: string };
  ledger: LedgerRow[];
  payouts: Array<{ amount_cents: number; period_label: string; sent_at: string }>;
  links: Array<{ label: string; url: string }>;
  referrals: Array<{ id: string; name: string; stage: string; created_at: string; earnedCents: number }>;
  minimumPayoutCents: number;
  nextRun: string;
  payableCents: number;
  creditCents: number;
  canRedeem: boolean;
  creditTerms: string;
  creditTermsVersion: string;
  points?: Points | null;
}

interface Points {
  balance: number;
  buyers: number;
  referrals: number;
  nextExpiry: { at: string; points: number } | null;
  funnelLockedUntil: string | null;
  rewards: Array<{ key: string; label: string; points: number; valueCents: number; ok: boolean; reason?: string }>;
  recent: Array<{ name: string; kind: 'filmed' | 'bought'; points: number; at: string }>;
}

type Where = 'refer' | 'points' | 'pay' | 'credit';

const BADGES: Record<string, { label: string; need: string; Icon: LucideIcon }> = {
  edit: { label: 'Free Standard Edit', need: '3 points', Icon: Scissors },
  lead_magnet: { label: 'Free lead magnet', need: '3 points', Icon: Magnet },
  session: { label: 'Second studio session', need: '6 points', Icon: Clapperboard },
  funnel: { label: 'Full funnel', need: '12 points + 2 buyers', Icon: Layers },
};

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const day = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00Z` : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: d.length === 10 ? 'UTC' : undefined });
const STROKE = 1.5;

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

function Reveal({ children }: { children: React.ReactNode }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`bkp-reveal mt-8 ${inView ? 'is-in' : ''}`}>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <Reveal>
      <div className="bkp-shell">
        <div className="bkp-core">{children}</div>
      </div>
    </Reveal>
  );
}

type PillProps = { children: React.ReactNode; icon?: LucideIcon; ghost?: boolean };
function PillButton({ children, icon: Icon = ArrowUpRight, ghost, className = '', ...rest }: PillProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`bkp-pill ${ghost ? 'bkp-ghost' : 'bkp-sig'} ${className}`}>
      {children}
      <span className="bkp-ico">
        <Icon size={16} strokeWidth={STROKE} />
      </span>
    </button>
  );
}
function PillLink({ children, icon: Icon = ArrowUpRight, ghost, ...rest }: PillProps & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...rest} className={`bkp-pill ${ghost ? 'bkp-ghost' : 'bkp-sig'}`}>
      {children}
      <span className="bkp-ico">
        <Icon size={16} strokeWidth={STROKE} />
      </span>
    </a>
  );
}

function Meter({ value }: { value: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="bkp-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <span style={{ transform: `scaleX(${inView ? value : 0})` }} />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="portal-label block !text-[12px] text-p-ink/65">{children}</span>;
}

function Note({ note }: { note: { ok: boolean; text: string } | null }) {
  if (!note) return null;
  return <p className={`mt-4 text-base ${note.ok ? 'text-p-brandink' : 'text-p-bad'}`}>{note.text}</p>;
}

function Step({ done, n, title, children }: { done: boolean; n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-4 border-t border-p-line py-5">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${done ? 'bg-p-brand text-black' : 'border border-p-line text-p-ink/70'}`}>
        {done ? <Check size={14} strokeWidth={2} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-p-ink">{title}</p>
        {!done && children && <div className="mt-2">{children}</div>}
      </div>
    </li>
  );
}

function Track({ step }: { step: number }) {
  return (
    <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`${TRACK[step]}, step ${step + 1} of 4`}>
      {TRACK.map((t, i) => (
        <li key={t}>
          <span className={`block h-1 rounded-full ${i <= step ? 'bg-p-brand' : 'bg-p-line'}`} />
          <span className={`mt-1.5 block text-[12px] ${i <= step ? 'text-p-ink' : 'text-p-ink/50'}`}>{t}</span>
        </li>
      ))}
    </ol>
  );
}

export default function ReferralsPage() {
  const { accessToken, loading } = usePortal();
  const [s, setS] = useState<Summary | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'not' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<{ where: Where; ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [whop, setWhop] = useState('');
  const [acceptPayout, setAcceptPayout] = useState(false);
  const [acceptCredit, setAcceptCredit] = useState(false);
  const [ref, setRef] = useState({ name: '', contact: '' });
  const [referred, setReferred] = useState<string | null>(null);
  const [requested, setRequested] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const r = await fetch('/api/portal/referrals', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
      const j = await r.json();
      if (j.beaker === false) return setState('not');
      if (!r.ok) throw new Error(j.error || 'Could not load your referrals.');
      setS(j as Summary);
      setState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your referrals.');
      setState('error');
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(where: Where, body: Record<string, unknown> | FormData, ok: (j: Record<string, unknown>) => string) {
    setBusy(true);
    setNote(null);
    try {
      const form = body instanceof FormData;
      const r = await fetch('/api/portal/referrals', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken ?? ''}`, ...(form ? {} : { 'Content-Type': 'application/json' }) },
        body: form ? body : JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j.error || 'Could not save that.');
      setNote({ where, ok: true, text: ok(j) });
      await load();
      return true;
    } catch (e) {
      setNote({ where, ok: false, text: e instanceof Error ? e.message : 'Could not save that.' });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const noteAt = (w: Where) => (note?.where === w ? note : null);

  function copy(url: string) {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  if (loading || state === 'loading') return <p className="portal-label !text-[12px] text-p-ink/70">Loading your referrals</p>;
  if (state === 'not')
    return (
      <EmptyState
        title="Not a Beaker yet"
        body="Beakers earn 10% when someone they send becomes a PodLab client. Ask PodLab for your invite, or apply at podlablv.com/affiliate/apply."
        cta={{ label: 'Apply to be a Beaker', href: 'https://podlablv.com/affiliate/apply' }}
      />
    );
  if (state === 'error' || !s) return <EmptyState title="Could not load your referrals" body={error ?? 'Try again in a minute.'} />;

  const a = s.affiliate;
  const p = s.points ?? null;
  const held = s.ledger.filter((r) => r.effective_status === 'held').reduce((t, r) => t + r.amount_cents, 0);
  const earned = s.ledger.filter((r) => r.effective_status !== 'void').reduce((t, r) => t + r.amount_cents, 0);
  const setup = payoutSetup(a);
  const willPay = setup.complete && s.payableCents >= s.minimumPayoutCents;
  const myLink = primaryLink(s.links);
  const firstName = a.name.split(' ')[0];
  const goal = p ? nextGoal(p) : null;
  const payOpen = earned > 0 && (!setup.complete || s.payableCents > 0);

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <PageHeader eyebrow={`Beaker ${a.beakerId}`} title="Send a founder," accent="earn 10%." subtitle="Anyone who opens your link is yours for 90 days." />

      {/* ── refer ── */}
      <div className="bkp-shell">
        <div className="bkp-core">
          {myLink && (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <PillButton onClick={() => copy(myLink)} icon={copied === myLink ? Check : Copy} aria-live="polite">
                  {copied === myLink ? 'Copied' : 'Copy my link'}
                </PillButton>
                <PillLink ghost href={smsHref(myLink)} icon={MessageSquare}>
                  Text it
                </PillLink>
                <PillLink ghost href={mailtoHref(myLink, firstName)} icon={Mail}>
                  Email it
                </PillLink>
              </div>
              <p className="mt-3 truncate font-mono text-[13px] text-p-ink/55">{myLink}</p>
            </>
          )}

          <div className="mt-10 border-t border-p-line pt-8">
            <Label>Or send us their details</Label>
            {referred ? (
              <div className="mt-4 flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-p-brand text-black">
                  <Check size={14} strokeWidth={2} />
                </span>
                <div>
                  <p className="text-base text-p-ink">{referred}</p>
                  <button onClick={() => setReferred(null)} className="mt-2 text-sm text-p-ink/70 underline underline-offset-4">
                    Send another
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const c = contactField(ref.contact);
                  let sent = 'Sent.';
                  act('refer', { action: 'refer', name: ref.name, company: '', notes: '', referralEmail: c.email, phone: c.phone }, (j) => (sent = String(j.message ?? 'Sent.'))).then((ok) => {
                    if (!ok) return;
                    setReferred(sent);
                    setRef({ name: '', contact: '' });
                  });
                }}
                className="mt-4 grid items-center gap-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <input required value={ref.name} onChange={(e) => setRef({ ...ref, name: e.target.value })} placeholder="Their name" aria-label="Their name" className="bkp-field" />
                <input value={ref.contact} onChange={(e) => setRef({ ...ref, contact: e.target.value })} placeholder="Phone or email" aria-label="Their phone or email" className="bkp-field" />
                <PillButton type="submit" disabled={busy || !ref.name.trim()}>
                  Send
                </PillButton>
              </form>
            )}
            {!referred && noteAt('refer') && !noteAt('refer')!.ok && <Note note={noteAt('refer')} />}
          </div>

          {s.links.length > 1 && (
            <details className="bkp-details mt-8">
              <summary className="flex items-center gap-2 text-sm text-p-ink/70">
                More links <ChevronDown size={14} strokeWidth={STROKE} />
              </summary>
              <ul className="mt-4 space-y-3">
                {s.links.map((l) => (
                  <li key={l.url} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-base text-p-ink">{l.label.replace(/\s+[—–]\s+/, ', ')}</span>
                      <span className="block truncate font-mono text-[12px] text-p-ink/55">{l.url}</span>
                    </span>
                    <button onClick={() => copy(l.url)} className={`flex shrink-0 items-center gap-1.5 text-sm ${copied === l.url ? 'text-p-brandink' : 'text-p-ink/70'}`}>
                      {copied === l.url ? <Check size={14} strokeWidth={STROKE} /> : <Copy size={14} strokeWidth={STROKE} />}
                      {copied === l.url ? 'Copied' : 'Copy'}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>

      {/* ── points ── */}
      {p && (
        <Card>
          <div className="flex items-end justify-between gap-4">
            <div>
              <Label>Points</Label>
              <p className={`mt-2 font-mono text-[44px] font-bold leading-none ${p.balance > 0 ? 'text-p-brandink' : 'text-p-ink'}`}>{p.balance}</p>
            </div>
            <p className="text-right text-sm text-p-ink/70">
              {goal ? (
                <>
                  {goal.toGo} more to
                  <br />
                  <span className="text-p-ink">{BADGES[p.rewards.find((r) => r.label === goal.label)?.key ?? '']?.label ?? goal.label}</span>
                </>
              ) : (
                'Enough for every reward'
              )}
            </p>
          </div>
          <div className="mt-5">
            <Meter value={goal ? goal.pct : 1} />
          </div>
          <p className="mt-4 text-sm text-p-ink/70">1 point when someone you send films their free VSL. 3 more when they buy.</p>

          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.rewards.map((r) => {
              const b = BADGES[r.key] ?? { label: r.label, need: `${r.points} points`, Icon: Layers };
              const asked = requested.includes(r.key);
              return (
                <li key={r.key} className={`flex flex-col rounded-[18px] border bg-p-paper p-4 ${r.ok ? 'border-p-brandink/50' : 'border-p-line opacity-75'}`}>
                  <span className={`grid h-10 w-10 place-items-center rounded-full ${r.ok ? 'bg-p-brand/15 text-p-brandink' : 'bg-p-ink/5 text-p-ink/50'}`}>
                    {r.ok ? <b.Icon size={18} strokeWidth={STROKE} /> : <Lock size={16} strokeWidth={STROKE} />}
                  </span>
                  <span className="mt-4 text-sm font-semibold leading-snug text-p-ink">{b.label}</span>
                  <span className="mt-1 text-[12px] text-p-ink/55">{b.need}</span>
                  <span className="mt-auto pt-4">
                    {asked ? (
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-p-brandink">
                        <Check size={14} strokeWidth={STROKE} /> Requested
                      </span>
                    ) : r.ok ? (
                      <button
                        disabled={busy}
                        onClick={() =>
                          act('points', { action: 'requestPoints', reward: r.key }, (j) => (j.already ? "You already asked for this one. We'll reach out to set it up." : "We'll reach out to set it up.")).then(
                            (ok) => ok && setRequested((q) => [...q, r.key]),
                          )
                        }
                        className="rounded-full bg-p-brand px-3.5 py-1.5 text-[13px] font-semibold text-black disabled:opacity-40"
                      >
                        Request this
                      </button>
                    ) : (
                      <span className="text-[13px] text-p-ink/70">{lockedText(r, p)}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <Note note={noteAt('points')} />
          <p className="mt-6 text-[12px] text-p-ink/55">
            Points expire 12 months after you earn them and have no cash value. One free funnel every 12 months.
            {p.nextExpiry ? ` ${p.nextExpiry.points} expire ${day(p.nextExpiry.at.slice(0, 10))}.` : ''}
          </p>
        </Card>
      )}

      {/* ── earnings ── */}
      <Reveal>
        <div className="bkp-shell">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-p-line sm:grid-cols-4">
            {[
              { label: 'Earned', value: usd(Math.max(0, earned)), sig: false },
              { label: 'On hold', value: usd(Math.max(0, held)), sig: false },
              { label: 'Ready', value: usd(Math.max(0, s.payableCents)), sig: true },
              { label: 'Rate', value: '10%', sig: false },
            ].map((m) => (
              <div key={m.label} className="bg-p-card px-5 py-5">
                <Label>{m.label}</Label>
                <p className={`mt-2 font-mono text-2xl font-bold ${m.sig ? 'text-p-brandink' : 'text-p-ink'}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── your people ── */}
      <Card>
        <div className="flex items-baseline justify-between">
          <Label>Your people</Label>
          <span className="font-mono text-sm text-p-ink/55">{s.referrals.length}</span>
        </div>
        {s.referrals.length ? (
          <ul className="mt-2">
            {s.referrals.map((r) => (
              <li key={r.id} className="border-t border-p-line py-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-base text-p-ink">{r.name}</span>
                  <span className={`shrink-0 font-mono text-sm ${r.earnedCents ? 'text-p-brandink' : 'text-p-ink/55'}`}>{r.earnedCents ? usd(r.earnedCents) : day(r.created_at)}</span>
                </div>
                <Track step={referralStep(r, p?.recent)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-base text-p-ink/70">No one yet. Your link is at the top.</p>
        )}
      </Card>

      {/* ── get paid ── */}
      <Reveal>
        <div className={`bkp-shell ${earned > 0 ? '' : 'opacity-80'}`}>
          <details className="bkp-details bkp-core" open={payOpen}>
            <summary className="flex items-center justify-between gap-3">
              <span className="font-display text-lg text-p-ink">Get paid</span>
              <span className={`flex items-center gap-2 text-sm ${setup.complete ? 'text-p-brandink' : earned > 0 ? 'text-amber-500' : 'text-p-ink/65'}`}>
                {setup.done} of {setup.total} done <ChevronDown size={14} strokeWidth={STROKE} />
              </span>
            </summary>

            <div className="mt-5">
              <p className="text-base text-p-ink/75">
                Payouts go out on the 1st and the 14th, by Whop transfer, once you have at least {usd(s.minimumPayoutCents)} ready. Next: {day(s.nextRun)}.
              </p>
              {willPay && (
                <p className="mt-3 text-base text-p-brandink">
                  {usd(s.payableCents)} goes to @{a.whopUsername} on {day(s.nextRun)}.
                </p>
              )}
              {setup.complete && !willPay && s.payableCents > 0 && (
                <p className="mt-3 text-base text-p-ink/75">
                  You have {usd(s.payableCents)} ready. It goes out once it reaches {usd(s.minimumPayoutCents)}, or use it as credit below.
                </p>
              )}

              <ul className="mt-4">
                <Step n={1} done={a.termsCurrent} title={a.termsCurrent ? 'Payout terms accepted' : `Accept the payout terms (${a.termsVersion})`}>
                  <p className="mb-3 text-base text-p-ink/75">
                    Commissions are paid by Whop transfer to your Whop account. PodLab doesn&apos;t collect bank details. A W-9 is required before your first payout. Everything else in your Beaker
                    agreement stays the same.
                  </p>
                  <label className="flex items-center gap-2 text-base text-p-ink">
                    <input type="checkbox" checked={acceptPayout} onChange={(e) => setAcceptPayout(e.target.checked)} />I agree to the payout terms ({a.termsVersion}).
                  </label>
                  <PillButton className="mt-4" icon={Check} disabled={busy || !acceptPayout} onClick={() => act('pay', { action: 'acceptTerms', accept: true }, () => 'Payout terms accepted.')}>
                    Accept
                  </PillButton>
                </Step>
                <Step n={2} done={a.w9 !== 'missing'} title={a.w9 === 'missing' ? 'Upload your W-9' : `W-9 ${a.w9 === 'verified' ? 'verified' : 'received'}`}>
                  <p className="mb-3 text-base text-p-ink/75">
                    Fill in the{' '}
                    <a href="https://www.irs.gov/pub/irs-pdf/fw9.pdf" target="_blank" rel="noopener noreferrer" className="text-p-brandink underline underline-offset-4">
                      IRS W-9
                    </a>{' '}
                    and upload it (PDF or photo). Only PodLab&apos;s owner can open it.
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/heic"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const fd = new FormData();
                      fd.set('file', f);
                      act('pay', fd, () => 'W-9 uploaded. Thank you.');
                      e.target.value = '';
                    }}
                  />
                  <PillButton icon={Upload} disabled={busy} onClick={() => fileRef.current?.click()}>
                    Upload W-9
                  </PillButton>
                </Step>
                <Step n={3} done={a.whopLinked} title={a.whopLinked ? `Whop account linked: @${a.whopUsername}` : 'Add your Whop username'}>
                  <p className="mb-3 text-base text-p-ink/75">Payouts land in your Whop balance. No bank details are collected. Your username is on your Whop profile.</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input value={whop} onChange={(e) => setWhop(e.target.value)} placeholder="@yourname" aria-label="Whop username" className="bkp-field sm:max-w-xs" />
                    <PillButton disabled={busy || !whop.trim()} onClick={() => act('pay', { action: 'linkWhop', username: whop }, () => 'Whop account linked.')}>
                      Save
                    </PillButton>
                  </div>
                </Step>
              </ul>
              <Note note={noteAt('pay')} />

              <div className="mt-6 border-t border-p-line pt-6">
                <Label>Use it on PodLab</Label>
                {s.payableCents > 0 && s.canRedeem ? (
                  <div className="mt-3">
                    <p className="text-base text-p-ink">Turn {usd(s.payableCents)} into PodLab credit, dollar for dollar. It comes off your next PodLab invoice or checkout link.</p>
                    <p className="mt-3 text-base text-p-ink/75">{s.creditTerms}</p>
                    <label className="mt-4 flex items-center gap-2 text-base text-p-ink">
                      <input type="checkbox" checked={acceptCredit} onChange={(e) => setAcceptCredit(e.target.checked)} />I agree to the credit terms.
                    </label>
                    <PillButton
                      className="mt-4"
                      disabled={busy || !acceptCredit}
                      onClick={() =>
                        act('credit', { action: 'redeem', accept: true, termsVersion: s.creditTermsVersion }, (j) => `${usd(Number(j.amountCents) || 0)} is now PodLab credit. It comes off your next invoice.`).then(
                          (ok) => ok && setAcceptCredit(false),
                        )
                      }
                    >
                      Use as credit
                    </PillButton>
                    {a.w9 === 'missing' && <p className="mt-3 text-sm text-p-ink/70">Credit counts as paid commission for taxes, so it needs your W-9 too.</p>}
                  </div>
                ) : (
                  <p className="mt-3 text-base text-p-ink/75">
                    {s.creditCents > 0 ? `You have ${usd(s.creditCents)} of credit. PodLab takes it off your next invoice. ` : ''}
                    {s.payableCents > 0 ? 'Credit needs your portal linked to your PodLab deal. Ask PodLab.' : held > 0 ? `Nothing ready yet. ${usd(held)} is on its 45-day hold.` : 'Nothing ready yet.'}
                  </p>
                )}
                <Note note={noteAt('credit')} />
              </div>

              {s.ledger.length > 0 && (
                <details className="bkp-details mt-6 border-t border-p-line pt-5">
                  <summary className="flex items-center gap-2 text-sm text-p-ink/70">
                    View statement <ChevronDown size={14} strokeWidth={STROKE} />
                  </summary>
                  <ul className="mt-3">
                    {s.ledger.slice(0, 30).map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-p-line py-3">
                        <span className="min-w-0">
                          <span className="block break-words text-base text-p-ink">{r.lead_name?.split('—')[0].trim() || 'Client payment'}</span>
                          <span className="mt-1 block text-[13px] text-p-ink/60">
                            {r.kind === 'commission' ? 'Commission' : r.kind === 'clawback' ? 'Refund clawback' : 'Adjustment'} · paid {day(r.paid_at_source)}
                            {r.effective_status === 'held' ? ` · ready ${day(r.hold_until)}` : ''}
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[12px] ${r.effective_status === 'payable' ? 'border-p-brandink text-p-brandink' : 'border-p-line text-p-ink/70'}`}>
                            {r.effective_status === 'payable' ? 'ready' : r.effective_status === 'held' ? 'on hold' : r.effective_status}
                          </span>
                          <span className="font-mono text-base font-semibold text-p-ink">{usd(r.amount_cents)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {s.payouts.length > 0 && <p className="mt-4 text-sm text-p-ink/70">Payouts: {s.payouts.map((x) => `${x.period_label} ${usd(x.amount_cents)} (${day(x.sent_at)})`).join(' · ')}</p>}
                </details>
              )}
            </div>
          </details>
        </div>
      </Reveal>
    </div>
  );
}
