'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePortal } from '@/lib/portal-data';
import { PageHeader, EmptyState } from '@/components/portal/Shared';

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
}

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const day = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00Z` : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: d.length === 10 ? 'UTC' : undefined });

const FIELD = 'w-full border border-p-line bg-p-paper px-4 py-3 text-base text-p-ink placeholder:text-p-ink/50 focus:border-p-brandink focus:outline-none';
const BTN = 'portal-label bg-p-brand px-5 py-3 !text-[13px] text-black transition hover:bg-p-pop disabled:opacity-40';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <span className="portal-label block text-p-brandink">{title}</span>
      {hint && <p className="mt-2 max-w-2xl text-base text-p-ink/75">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Step({ done, title, children }: { done: boolean; title: string; children?: React.ReactNode }) {
  return (
    <li className="bg-p-paper px-4 py-4">
      <p className="flex items-center gap-3 text-base text-p-ink">
        <span className={`portal-label inline-flex h-6 w-6 shrink-0 items-center justify-center border !text-[11px] ${done ? 'border-p-brandink bg-p-brand text-black' : 'border-p-ink/30 text-p-ink/70'}`}>{done ? '✓' : ''}</span>
        {title}
      </p>
      {!done && children && <div className="mt-3 pl-9">{children}</div>}
    </li>
  );
}

export default function ReferralsPage() {
  const { accessToken, loading } = usePortal();
  const [s, setS] = useState<Summary | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'not' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [whop, setWhop] = useState('');
  const [acceptPayout, setAcceptPayout] = useState(false);
  const [acceptCredit, setAcceptCredit] = useState(false);
  const [ref, setRef] = useState({ name: '', company: '', referralEmail: '', phone: '', notes: '' });
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

  async function act(body: Record<string, unknown> | FormData, ok: (j: Record<string, unknown>) => string) {
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
      setNote({ ok: true, text: ok(j) });
      await load();
      return true;
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : 'Could not save that.' });
      return false;
    } finally {
      setBusy(false);
    }
  }

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
  const held = s.ledger.filter((r) => r.effective_status === 'held').reduce((t, r) => t + r.amount_cents, 0);
  const paid = s.payouts.reduce((t, p) => t + p.amount_cents, 0);
  const setupDone = a.whopLinked && a.termsCurrent && a.w9 !== 'missing';
  const willPay = setupDone && s.payableCents >= s.minimumPayoutCents;

  return (
    <div>
      <PageHeader
        eyebrow="Beaker"
        title="Send a founder,"
        accent="earn 10%."
        subtitle={`You're Beaker ${a.beakerId}. When someone you send becomes a PodLab client, you earn 10% of what they pay, on up to 12 payments. Earnings become available 45 days after each payment: cash them out, or use them on your own PodLab work.`}
      />

      {note && (
        <p className={`mb-6 border-l-2 px-4 py-3 text-base ${note.ok ? 'border-p-brandink bg-p-brand/5 text-p-ink/90' : 'border-p-bad bg-p-bad/5 text-p-ink/90'}`}>{note.text}</p>
      )}

      <div className="grid grid-cols-2 gap-px border border-p-line bg-p-line sm:grid-cols-4">
        {[
          { label: 'Available now', value: s.payableCents, sub: 'cash out or credit' },
          { label: 'On hold', value: held, sub: '45-day hold' },
          { label: 'Paid to you', value: paid, sub: 'cash + credit' },
          { label: 'Your credit', value: s.creditCents, sub: 'off your next invoice' },
        ].map((m) => (
          <div key={m.label} className="bg-p-card p-5">
            <p className="portal-label !text-[12px] text-p-ink/70">{m.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-p-ink">{usd(Math.max(0, m.value))}</p>
            <p className="mt-1 text-sm text-p-ink/65">{m.sub}</p>
          </div>
        ))}
      </div>

      <Section title="Your links" hint="Anyone who clicks one is yours for 90 days, on any page they visit after.">
        <ul className="divide-y divide-p-line border border-p-line">
          {s.links.map((l) => (
            <li key={l.url} className="flex flex-wrap items-center justify-between gap-3 bg-p-paper px-4 py-3">
              <span className="min-w-0">
                <span className="block text-base text-p-ink">{l.label}</span>
                <span className="block break-all text-sm text-p-ink/65">{l.url}</span>
              </span>
              <button onClick={() => copy(l.url)} className="portal-label shrink-0 border border-p-brandink px-3 py-2 !text-[11px] text-p-brandink transition hover:bg-p-brand hover:text-black">
                {copied === l.url ? 'Copied' : 'Copy'}
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Cash out" hint={`Payouts go out on the 1st and the 14th, by Whop transfer, once you have at least ${usd(s.minimumPayoutCents)} available. Next: ${day(s.nextRun)}.`}>
        {willPay && <p className="mb-4 border-l-2 border-p-brandink bg-p-brand/5 px-4 py-3 text-base text-p-ink/90">{usd(s.payableCents)} goes to @{a.whopUsername} on {day(s.nextRun)}.</p>}
        {setupDone && !willPay && s.payableCents > 0 && (
          <p className="mb-4 text-base text-p-ink/75">You have {usd(s.payableCents)} available. It goes out once it reaches {usd(s.minimumPayoutCents)}, or use it as credit below.</p>
        )}
        <ul className="divide-y divide-p-line border border-p-line">
          <Step done={a.whopLinked} title={a.whopLinked ? `Whop account linked: @${a.whopUsername}` : 'Link your Whop account'}>
            <p className="mb-2 text-base text-p-ink/75">Payouts land in your Whop balance. No bank details are collected. Your username is on your Whop profile.</p>
            <div className="flex flex-wrap gap-2">
              <input value={whop} onChange={(e) => setWhop(e.target.value)} placeholder="@yourname" aria-label="Whop username" className={`${FIELD} max-w-xs`} />
              <button disabled={busy || !whop.trim()} onClick={() => act({ action: 'linkWhop', username: whop }, () => 'Whop account linked.')} className={BTN}>
                Link
              </button>
            </div>
          </Step>
          <Step done={a.termsCurrent} title={`Accept the payout terms (${a.termsVersion})`}>
            <p className="mb-2 text-base text-p-ink/75">
              Commissions are paid by Whop transfer to your Whop account. PodLab doesn&apos;t collect bank details. A W-9 is required before your first payout. Everything else in your Beaker
              agreement stays the same.
            </p>
            <label className="flex items-center gap-2 text-base text-p-ink">
              <input type="checkbox" checked={acceptPayout} onChange={(e) => setAcceptPayout(e.target.checked)} />I agree to the payout terms ({a.termsVersion}).
            </label>
            <button disabled={busy || !acceptPayout} onClick={() => act({ action: 'acceptTerms', accept: true }, () => 'Payout terms accepted.')} className={`${BTN} mt-3`}>
              Accept
            </button>
          </Step>
          <Step done={a.w9 !== 'missing'} title={a.w9 === 'missing' ? 'Upload your W-9' : `W-9 ${a.w9 === 'verified' ? 'verified' : 'received'}`}>
            <p className="mb-2 text-base text-p-ink/75">
              Fill in the{' '}
              <a href="https://www.irs.gov/pub/irs-pdf/fw9.pdf" target="_blank" rel="noopener noreferrer" className="text-p-brandink underline">
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
                act(fd, () => 'W-9 uploaded. Thank you.');
                e.target.value = '';
              }}
            />
            <button disabled={busy} onClick={() => fileRef.current?.click()} className={BTN}>
              Upload W-9
            </button>
          </Step>
        </ul>
      </Section>

      <Section title="Use it on PodLab" hint="Turn what's available into credit, dollar for dollar. It comes off your next PodLab invoice or checkout link.">
        {s.payableCents > 0 && s.canRedeem ? (
          <div className="border border-p-line bg-p-paper p-5">
            <p className="text-lg text-p-ink">Turn {usd(s.payableCents)} into PodLab credit</p>
            <p className="mt-3 text-base text-p-ink/80">{s.creditTerms}</p>
            <label className="mt-4 flex items-center gap-2 text-base text-p-ink">
              <input type="checkbox" checked={acceptCredit} onChange={(e) => setAcceptCredit(e.target.checked)} />I agree to the credit terms.
            </label>
            <button
              disabled={busy || !acceptCredit}
              onClick={() =>
                act({ action: 'redeem', accept: true, termsVersion: s.creditTermsVersion }, (j) => `${usd(Number(j.amountCents) || 0)} is now PodLab credit. It comes off your next invoice.`).then((ok) => ok && setAcceptCredit(false))
              }
              className={`${BTN} mt-4`}
            >
              Use as credit
            </button>
            {a.w9 === 'missing' && <p className="mt-3 text-sm text-p-ink/70">Credit counts as paid commission for taxes, so it needs your W-9 too.</p>}
          </div>
        ) : (
          <p className="text-base text-p-ink/75">
            {s.creditCents > 0 ? `You have ${usd(s.creditCents)} of credit. PodLab takes it off your next invoice. ` : ''}
            {s.payableCents > 0 ? 'Credit needs your portal linked to your PodLab deal; ask PodLab.' : held > 0 ? `Nothing available yet. ${usd(held)} is on its 45-day hold.` : 'Nothing available yet.'}
          </p>
        )}
      </Section>

      <Section title="Refer someone" hint="Know a founder who should talk to PodLab? Send them here and PodLab reaches out. Someone already in our system isn't credited (Beaker agreement §2.4), and we'll tell you.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act({ action: 'refer', ...ref }, (j) => String(j.message ?? 'Sent.')).then((ok) => ok && setRef({ name: '', company: '', referralEmail: '', phone: '', notes: '' }));
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input required value={ref.name} onChange={(e) => setRef({ ...ref, name: e.target.value })} placeholder="Their name" aria-label="Their name" className={FIELD} />
          <input value={ref.company} onChange={(e) => setRef({ ...ref, company: e.target.value })} placeholder="Business" aria-label="Business" className={FIELD} />
          <input type="email" value={ref.referralEmail} onChange={(e) => setRef({ ...ref, referralEmail: e.target.value })} placeholder="Email" aria-label="Their email" className={FIELD} />
          <input value={ref.phone} onChange={(e) => setRef({ ...ref, phone: e.target.value })} placeholder="Phone" aria-label="Their phone" className={FIELD} />
          <textarea value={ref.notes} onChange={(e) => setRef({ ...ref, notes: e.target.value })} placeholder="What they need, and how you know them" aria-label="Notes" rows={3} className={`${FIELD} sm:col-span-2`} />
          <button disabled={busy || !ref.name.trim()} className={`${BTN} sm:col-span-2 sm:justify-self-start`}>
            Send referral
          </button>
        </form>
      </Section>

      <Section title={`Your referrals · ${s.referrals.length}`}>
        {s.referrals.length ? (
          <ul className="divide-y divide-p-line border border-p-line">
            {s.referrals.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 bg-p-paper px-4 py-3">
                <span className="min-w-0">
                  <span className="block break-words text-base text-p-ink">{r.name}</span>
                  <span className="portal-label mt-1 block !text-[11px] text-p-ink/65">
                    {r.stage} · since {day(r.created_at)}
                  </span>
                </span>
                <span className="text-base font-semibold text-p-ink">{r.earnedCents ? usd(r.earnedCents) : '—'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-p-ink/75">No referrals yet. Share a link above.</p>
        )}
      </Section>

      {s.ledger.length > 0 && (
        <Section title="Earnings">
          <ul className="divide-y divide-p-line border border-p-line">
            {s.ledger.slice(0, 30).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 bg-p-paper px-4 py-3">
                <span className="min-w-0">
                  <span className="block break-words text-base text-p-ink">{r.lead_name?.split('—')[0].trim() || 'Client payment'}</span>
                  <span className="portal-label mt-1 block !text-[11px] text-p-ink/65">
                    {r.kind === 'commission' ? 'Commission' : r.kind === 'clawback' ? 'Refund clawback' : 'Adjustment'} · paid {day(r.paid_at_source)}
                    {r.effective_status === 'held' ? ` · available ${day(r.hold_until)}` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className={`portal-label border px-2 py-1 !text-[11px] ${r.effective_status === 'payable' ? 'border-p-brandink text-p-brandink' : 'border-p-ink/20 text-p-ink/70'}`}>
                    {r.effective_status === 'payable' ? 'available' : r.effective_status}
                  </span>
                  <span className="text-base font-semibold text-p-ink">{usd(r.amount_cents)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
