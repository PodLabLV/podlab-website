'use client';

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import qrcode from 'qrcode-generator';
import {
  DONT,
  GOOD_REFERRAL,
  STATUS_LABEL,
  STATUS_STEPS,
  TAX_NOTE,
  contactLooksValid,
  setupSteps,
  shortDate,
  toolkit,
  usd,
  type BeakerPayload,
  type PlainStatus,
} from '@/lib/portal/beaker-view';

/**
 * The Beaker tab, top to bottom: your link, refer someone, my referrals,
 * money, toolkit. Pure view: data in, actions out (the page wires it to
 * /api/portal/beaker), so it renders the same with live or sample data.
 */

interface Props {
  data: BeakerPayload;
  onAction: (body: Record<string, unknown> | FormData) => Promise<{ ok: boolean; message: string }>;
}

const FIELD = 'w-full border border-p-line bg-p-paper px-4 py-3 text-base text-p-ink placeholder:text-p-ink/50 focus:border-p-brandink focus:outline-none disabled:opacity-60';
const BTN = 'portal-label bg-p-brand px-5 py-3 !text-[13px] text-black transition hover:bg-p-pop disabled:opacity-40';
const GHOST = 'portal-label border border-p-brandink px-4 py-2.5 !text-[12px] text-p-brandink transition hover:bg-p-brand hover:text-black disabled:opacity-40';

function Section({ id, n, title, hint, children }: { id: string; n: number; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-p-line pt-10">
      <div className="flex items-baseline gap-3">
        <span className="portal-label !text-[12px] text-p-ink/50">{String(n).padStart(2, '0')}</span>
        <h2 className="text-2xl font-bold tracking-tight text-p-ink">{title}</h2>
      </div>
      {hint && <p className="mt-2 max-w-2xl text-base leading-relaxed text-p-ink/75">{hint}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Note({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <p className={`border-l-2 px-4 py-3 text-base ${ok ? 'border-p-brandink bg-p-brand/5 text-p-ink/90' : 'border-p-bad bg-p-bad/5 text-p-ink/90'}`}>{children}</p>;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / no permission: select-and-copy fallback.
    try {
      const t = document.createElement('textarea');
      t.value = text;
      t.setAttribute('readonly', '');
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(t);
      return ok;
    } catch {
      return false;
    }
  }
}

function CopyButton({ text, label = 'Copy', big }: { text: string; label?: string; big?: boolean }) {
  const [state, setState] = useState<'idle' | 'done' | 'fail'>('idle');
  return (
    <button
      type="button"
      onClick={async () => {
        setState((await copyText(text)) ? 'done' : 'fail');
        setTimeout(() => setState('idle'), 1800);
      }}
      className={big ? `${BTN} min-w-[120px]` : GHOST}
    >
      {state === 'done' ? 'Copied' : state === 'fail' ? 'Select and copy' : label}
    </button>
  );
}

/** The link as a QR code, drawn as SVG squares (no image service sees the link). */
function Qr({ value }: { value: string }) {
  const { size, cells } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const out: string[] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) out.push(`M${c + 2} ${r + 2}h1v1h-1z`);
    return { size: n + 4, cells: out.join('') };
  }, [value]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${cells}" fill="#000"/></svg>`;
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label="QR code for your Beaker link" className="h-40 w-40 bg-white">
        <rect width={size} height={size} fill="#fff" />
        <path d={cells} fill="#000" />
      </svg>
      <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} download="podlab-beaker-qr.svg" className="portal-label !text-[11px] text-p-ink/70 transition hover:text-p-brandink">
        Download QR
      </a>
    </div>
  );
}

const STATUS_TONE: Record<PlainStatus, string> = {
  submitted: 'border-p-ink/25 text-p-ink/75',
  talking: 'border-p-warn/60 text-p-warn',
  bought: 'border-p-brandink bg-p-brand/10 text-p-brandink',
  not_fit: 'border-p-ink/15 text-p-ink/50',
};

// ── 2. refer someone ──────────────────────────────────────────────────────

function ReferForm({ readOnly, onAction }: { readOnly: boolean; onAction: Props['onAction'] }) {
  const empty = { name: '', contact: '', business: '', note: '' };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!f.name.trim()) return setErr('Add their name.');
    if (!contactLooksValid(f.contact)) return setErr('Add their email or phone number so PodLab can reach them.');
    setBusy(true);
    const r = await onAction({ action: 'refer', ...f });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    setDone(r.message || 'Sent. PodLab reaches out next.');
    setF(empty);
  }

  if (done)
    return (
      <div className="space-y-4">
        <Note ok>{done}</Note>
        <p className="text-base text-p-ink/75">It shows in My referrals below as Submitted. You don&apos;t need to do anything else.</p>
        <button type="button" onClick={() => setDone(null)} className={GHOST}>
          Refer someone else
        </button>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="portal-label mb-2 block !text-[11px] text-p-ink/70">Their name *</span>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Jane Doe" autoComplete="off" disabled={readOnly} className={FIELD} />
      </label>
      <label className="block">
        <span className="portal-label mb-2 block !text-[11px] text-p-ink/70">Their email or phone *</span>
        <input value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="jane@company.com or (702) 555-0101" autoComplete="off" disabled={readOnly} className={FIELD} />
      </label>
      <label className="block">
        <span className="portal-label mb-2 block !text-[11px] text-p-ink/70">Their business</span>
        <input value={f.business} onChange={(e) => setF({ ...f, business: e.target.value })} placeholder="Doe Roofing" autoComplete="off" disabled={readOnly} className={FIELD} />
      </label>
      <label className="block sm:row-span-2">
        <span className="portal-label mb-2 block !text-[11px] text-p-ink/70">A note for PodLab</span>
        <textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="How you know them, and what they need" rows={4} disabled={readOnly} className={`${FIELD} sm:h-[calc(100%-1.75rem)]`} />
      </label>
      <div className="flex flex-col justify-end gap-3">
        {err && <Note ok={false}>{err}</Note>}
        <button disabled={busy || readOnly} className={`${BTN} self-start`}>
          {busy ? 'Sending' : 'Send referral'}
        </button>
      </div>
    </form>
  );
}

// ── 4. payout setup ───────────────────────────────────────────────────────

function Setup({ data, onAction }: Props) {
  const s = data.setup;
  const missing = setupSteps(s);
  const [whop, setWhop] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const ro = data.readOnly;

  async function act(body: Record<string, unknown> | FormData, ok: string) {
    setBusy(true);
    setNote(null);
    const r = await onAction(body);
    setBusy(false);
    setNote({ ok: r.ok, text: r.ok ? ok : r.message });
  }

  if (!missing.length)
    return (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-p-ink/85">
        <span className="portal-label border border-p-brandink px-2 py-1 !text-[11px] text-p-brandink">Payouts set up</span>
        Whop @{s.whopUsername} · payout terms accepted · W-9 {s.w9}
      </p>
    );

  const steps: Array<{ key: 'whop' | 'terms' | 'w9'; title: string; body: ReactNode }> = [
    {
      key: 'whop',
      title: s.whopLinked ? `Whop linked: @${s.whopUsername}` : 'Link your Whop account',
      body: (
        <>
          <p className="mb-3 text-base text-p-ink/75">
            Your money is sent to your own Whop account, then you move it to your bank from Whop. PodLab never asks for bank details. No Whop account?{' '}
            <a href="https://whop.com" target="_blank" rel="noopener noreferrer" className="text-p-brandink underline">
              Make one free
            </a>
            , then type your Whop username here (it&apos;s on your Whop profile).
          </p>
          <div className="flex flex-wrap gap-2">
            <input value={whop} onChange={(e) => setWhop(e.target.value)} placeholder="@yourname" aria-label="Whop username" disabled={ro} className={`${FIELD} max-w-xs`} />
            <button type="button" disabled={busy || ro || !whop.trim()} onClick={() => act({ action: 'linkWhop', username: whop }, 'Whop account linked.')} className={BTN}>
              Link
            </button>
          </div>
        </>
      ),
    },
    {
      key: 'terms',
      title: s.termsCurrent ? 'Payout terms accepted' : 'Accept the payout terms',
      body: (
        <>
          <p className="mb-3 text-base text-p-ink/75">Commissions are paid by Whop transfer to your Whop account, and a W-9 is needed before the first one. Everything else in your Beaker agreement stays the same.</p>
          <label className="flex items-center gap-2 text-base text-p-ink">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={ro} />I agree to the payout terms ({s.termsVersion}).
          </label>
          <button type="button" disabled={busy || ro || !agree} onClick={() => act({ action: 'acceptTerms', accept: true }, 'Payout terms accepted.')} className={`${BTN} mt-3`}>
            Accept
          </button>
        </>
      ),
    },
    {
      key: 'w9',
      title: s.w9 === 'missing' ? 'Upload your W-9' : `W-9 ${s.w9}`,
      body: (
        <>
          <p className="mb-3 text-base text-p-ink/75">
            Fill in the{' '}
            <a href="https://www.irs.gov/pub/irs-pdf/fw9.pdf" target="_blank" rel="noopener noreferrer" className="text-p-brandink underline">
              IRS W-9
            </a>{' '}
            and upload it here, as a PDF or a photo. Only PodLab&apos;s owner can open it.
          </p>
          <input
            ref={file}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/heic"
            className="hidden"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              if (!picked) return;
              const fd = new FormData();
              fd.set('file', picked);
              act(fd, 'W-9 uploaded. Thank you.');
              e.target.value = '';
            }}
          />
          <button type="button" disabled={busy || ro} onClick={() => file.current?.click()} className={BTN}>
            Upload W-9
          </button>
        </>
      ),
    },
  ];

  return (
    <div>
      <p className="mb-4 text-base text-p-ink">
        <span className="font-semibold">Before PodLab can pay you:</span> {missing.length} step{missing.length === 1 ? '' : 's'} left. Do them once; every payout after that is automatic on your side.
      </p>
      {note && (
        <div className="mb-4">
          <Note ok={note.ok}>{note.text}</Note>
        </div>
      )}
      <ol className="divide-y divide-p-line border border-p-line">
        {steps.map((st, i) => {
          const done = !missing.includes(st.key);
          const current = st.key === missing[0];
          return (
            <li key={st.key} className="bg-p-paper px-4 py-4">
              <p className="flex items-center gap-3 text-base text-p-ink">
                <span className={`portal-label inline-flex h-7 w-7 shrink-0 items-center justify-center border !text-[11px] ${done ? 'border-p-brandink bg-p-brand text-black' : 'border-p-ink/30 text-p-ink/70'}`}>
                  {done ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={done ? 'text-p-ink/70' : 'font-semibold'}>{st.title}</span>
              </p>
              {!done && current && <div className="mt-3 pl-10">{st.body}</div>}
              {!done && !current && <p className="mt-1 pl-10 text-sm text-p-ink/60">After the step above.</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── the screen ────────────────────────────────────────────────────────────

export default function BeakerView({ data, onAction }: Props) {
  const m = data.money;
  const kit = useMemo(() => toolkit(data.link, data.affiliate.name), [data.link, data.affiliate.name]);
  const counts = useMemo(() => {
    const c: Record<PlainStatus, number> = { submitted: 0, talking: 0, bought: 0, not_fit: 0 };
    for (const r of data.referrals) c[r.status] += 1;
    return c;
  }, [data.referrals]);
  const first = data.affiliate.name.split(' ')[0] || 'there';

  return (
    <div>
      <div className="mb-10">
        <span className="portal-label block text-p-brandink">Beaker · {data.affiliate.beakerId}</span>
        <h1 className="mt-4 text-3xl font-bold leading-[1.05] tracking-tight text-p-ink md:text-4xl">
          Send a founder, <em className="portal-drama text-p-brandink">get paid.</em>
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-p-ink/80">{data.howYouEarn}</p>
        {data.readOnly && <p className="mt-4 text-sm text-p-warn">Staff preview: read-only.</p>}
      </div>

      {/* 1. the link */}
      <section aria-label="Your link" className="mb-12 grid gap-6 border border-p-line bg-p-card p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <p className="portal-label !text-[12px] text-p-brandink">Your link</p>
          <p className="mt-3 break-all text-xl font-semibold text-p-ink sm:text-2xl">{data.link.replace(/^https:\/\//, '')}</p>
          <p className="mt-2 text-base text-p-ink/70">Send it to anyone. Whoever clicks it is yours for 90 days, on any PodLab page they visit.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <CopyButton text={data.link} label="Copy link" big />
            <a href="#toolkit" className={GHOST}>
              Get a message to send
            </a>
          </div>
        </div>
        <Qr value={data.link} />
      </section>

      <div className="space-y-14">
        <Section id="refer" n={1} title="Refer someone" hint="Rather introduce them yourself? Give PodLab their details and PodLab reaches out, credited to you.">
          <ReferForm readOnly={data.readOnly} onAction={onAction} />
        </Section>

        <Section
          id="referrals"
          n={2}
          title={`My referrals${data.referrals.length ? ` · ${data.referrals.length}` : ''}`}
          hint={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {STATUS_STEPS.map((st, i) => (
                <span key={st.key} className="inline-flex items-center gap-2">
                  <span className="text-p-ink">{st.label}</span>
                  {i < 2 && <span aria-hidden="true">→</span>}
                  {i === 2 && <span aria-hidden="true">/</span>}
                </span>
              ))}
            </span>
          }
        >
          {data.referrals.length ? (
            <>
              <p className="mb-3 text-sm text-p-ink/65">
                {counts.submitted} submitted · {counts.talking} talking · {counts.bought} bought · {counts.not_fit} not a fit
              </p>
              <ul className="divide-y divide-p-line border border-p-line">
                {data.referrals.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 bg-p-paper px-4 py-3.5">
                    <span className="min-w-0">
                      <span className="block break-words text-base font-medium text-p-ink">{r.name}</span>
                      <span className="mt-0.5 block text-sm text-p-ink/60">Sent {shortDate(r.since)}</span>
                    </span>
                    <span className="flex items-center gap-4">
                      <span className={`portal-label border px-2.5 py-1 !text-[11px] ${STATUS_TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                      <span className="w-20 text-right text-base font-semibold text-p-ink">{r.earnedCents ? usd(r.earnedCents) : <span className="font-normal text-p-ink/40">$0</span>}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="border border-dashed border-p-line p-6">
              <p className="text-lg font-semibold text-p-ink">No referrals yet, {first}.</p>
              <p className="mt-2 max-w-xl text-base text-p-ink/75">
                Two ways to start: copy your link and send it to one founder you know (the toolkit below has a message ready), or fill in Refer someone above and PodLab does the reaching out.
              </p>
            </div>
          )}
        </Section>

        <Section id="money" n={3} title="Money" hint={m.line}>
          <div className="grid grid-cols-2 gap-px border border-p-line bg-p-line lg:grid-cols-4">
            {[
              { label: 'Earned', cents: m.earnedCents, sub: 'all time' },
              { label: 'On hold', cents: m.onHoldCents, sub: m.nextClearsOn ? `next clears ${shortDate(m.nextClearsOn)}` : '45-day hold' },
              { label: 'Ready', cents: m.readyCents, sub: `next payout ${shortDate(m.nextPayout)}` },
              { label: 'Paid out', cents: m.paidCents, sub: 'to you so far' },
            ].map((t) => (
              <div key={t.label} className="bg-p-card p-5">
                <p className="portal-label !text-[12px] text-p-ink/70">{t.label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-p-ink">{usd(Math.max(0, t.cents))}</p>
                <p className="mt-1 text-sm text-p-ink/60">{t.sub}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-p-ink/65">
            Payouts go out on the 1st and the 14th, by Whop transfer, once at least {usd(m.minimumCents)} is ready. A refund inside the 45 days cancels that part; after it, it comes off a later payout.
          </p>

          <div className="mt-8">
            <p className="portal-label mb-3 !text-[12px] text-p-brandink">Payout method</p>
            <Setup data={data} onAction={onAction} />
          </div>

          <div className="mt-8">
            <p className="portal-label mb-3 !text-[12px] text-p-brandink">Payout history</p>
            {data.payouts.length ? (
              <ul className="divide-y divide-p-line border border-p-line">
                {data.payouts.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 bg-p-paper px-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-base text-p-ink">{p.label}</span>
                      <span className="block text-sm text-p-ink/60">{p.sentAt ? shortDate(p.sentAt) : ''}</span>
                    </span>
                    <span className="text-base font-semibold text-p-ink">{usd(p.amountCents)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-p-ink/70">No payouts yet. Your first one shows here, and PodLab emails you a statement each time.</p>
            )}
          </div>

          {data.canUseAsCredit && (
            <p className="mt-6 text-base text-p-ink/75">
              Rather spend it on PodLab?{' '}
              <a href="/portal/referrals" className="text-p-brandink underline">
                Turn what&apos;s ready into PodLab credit
              </a>
              , dollar for dollar.
            </p>
          )}

          <p className="mt-6 border-l-2 border-p-line pl-4 text-sm leading-relaxed text-p-ink/65">{TAX_NOTE}</p>
        </Section>

        <Section id="toolkit" n={4} title="Toolkit" hint="Ready to send, with your link already in it. Copy, swap in their name, send.">
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { title: 'A text', body: kit.text, copy: kit.text },
              { title: 'An email', body: `Subject: ${kit.emailSubject}\n\n${kit.email}`, copy: `Subject: ${kit.emailSubject}\n\n${kit.email}` },
              { title: 'A social post', body: kit.social, copy: kit.social },
            ].map((c) => (
              <div key={c.title} className="flex flex-col border border-p-line bg-p-card">
                <div className="flex items-center justify-between gap-3 border-b border-p-line px-4 py-3">
                  <p className="portal-label !text-[12px] text-p-ink">{c.title}</p>
                  <CopyButton text={c.copy} />
                </div>
                <p className="max-h-72 flex-1 overflow-auto whitespace-pre-line px-4 py-4 text-[15px] leading-relaxed text-p-ink/85">{c.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="border border-p-line bg-p-card p-5">
              <p className="portal-label !text-[12px] text-p-brandink">Who to send</p>
              <ul className="mt-3 space-y-2.5">
                {GOOD_REFERRAL.map((g) => (
                  <li key={g} className="flex gap-3 text-base text-p-ink/85">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-p-brand" aria-hidden="true" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-p-line bg-p-card p-5">
              <p className="portal-label !text-[12px] text-p-brandink">The rules</p>
              <ul className="mt-3 space-y-2.5">
                {DONT.map((d) => (
                  <li key={d.text} className="flex gap-3 text-base text-p-ink/85">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-p-bad" aria-hidden="true" />
                    <span>
                      {d.text} <span className="text-sm text-p-ink/45">{d.ref}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-p-ink/60">From your Beaker agreement. Questions: info@podlablv.com.</p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
