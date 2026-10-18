'use client';

/**
 * Projects (portal v2, track B): everything that needs the client's review,
 * what's in progress, and what's approved, in one list, plus the credit
 * wallet, Buy credits (?buy=1 opens it) and Submit footage for editing
 * (?submit=1). Each row opens the flow that already exists for it; nothing
 * here approves anything by itself.
 */

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePortal, formatDate } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';
import { portalCall } from '@/lib/portal/browser';
import { uploadToDrive } from '@/lib/portal/drive-upload';
import { STATE_LABEL, STATE_ORDER, countByState, type ProjectItem, type ProjectState } from '@/lib/portal/projects';
import { EDIT_TYPES, EXTRA_ROUND_CREDITS, MAX_EXTRA_ROUNDS, RUSH_CREDITS, RUSH_HOURS, editCost, type EditType } from '@/lib/portal/credits';
import type { Wallet } from '@/lib/portal/wallet-server';

interface Payload {
  items: ProjectItem[];
  wallet: Wallet;
  uploads: boolean;
}

const primaryBtn =
  'portal-label inline-flex items-center justify-center gap-3 bg-p-brand px-5 py-3 !text-[13px] text-black transition hover:bg-p-pop disabled:cursor-not-allowed disabled:opacity-40';
const ghostBtn =
  'portal-label inline-flex items-center justify-center gap-3 border border-p-line px-5 py-3 !text-[13px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink disabled:cursor-not-allowed disabled:opacity-40';
const inputClass =
  'w-full border border-p-line bg-p-paper px-3 py-2.5 text-[17px] text-p-ink placeholder:text-p-ink/50 focus:border-p-brandink focus:outline-none';

const credits = (n: number) => `${n} credit${n === 1 ? '' : 's'}`;
const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

// ── icons (SVG only: no emojis in the portal) ────────────────────────────

function KindIcon({ kind }: { kind: ProjectItem['kind'] }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true } as const;
  switch (kind) {
    case 'script':
      return (
        <svg {...common}>
          <path d="M6 3h9l3 3v15H6z" />
          <path d="M9 9h6M9 13h6M9 17h4" />
        </svg>
      );
    case 'video':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" />
          <path d="M10 9l5 3-5 3z" />
        </svg>
      );
    case 'page':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" />
          <path d="M3 8h18M6 6h.01M8.5 6h.01" />
        </svg>
      );
    case 'submission':
      return (
        <svg {...common}>
          <path d="M12 16V4M7 9l5-5 5 5" />
          <path d="M4 15v5h16v-5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M6 3h8l4 4v14H6z" />
          <path d="M14 3v4h4" />
        </svg>
      );
  }
}

function ArrowIcon({ external }: { external?: boolean }) {
  return external ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 4h6v6M20 4L10 14M18 14v6H4V6h6" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// ── list ─────────────────────────────────────────────────────────────────

const STATE_TONE: Record<ProjectState, string> = {
  needs_you: 'border-[#ff8a1f]/60 text-[#ff8a1f]',
  in_progress: 'border-p-brandink/50 text-p-brandink',
  approved: 'border-p-brandink bg-p-brand text-black',
};

function Row({ item }: { item: ProjectItem }) {
  const body = (
    <>
      <span className="mt-0.5 shrink-0 text-p-ink/70">
        <KindIcon kind={item.kind} />
      </span>
      <span className="min-w-0 flex-1">
        {item.meta && <span className="portal-label block !text-[12px] text-p-ink/70">{item.meta}</span>}
        <span className="mt-1 block break-words text-lg font-semibold text-p-ink transition group-hover:text-p-brandink">{item.title}</span>
        {item.updatedAt && <span className="mt-0.5 block text-sm text-p-ink/65">Updated {formatDate(item.updatedAt)}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2">
        <span className={`portal-label inline-block border px-2 py-1 !text-[11px] ${STATE_TONE[item.state]}`}>{item.status}</span>
        {item.href && (
          <span className="portal-label hidden items-center gap-1.5 !text-[11px] text-p-ink/70 transition group-hover:text-p-brandink sm:flex">
            {item.state === 'needs_you' ? 'Review' : 'Open'} <ArrowIcon external={item.external} />
          </span>
        )}
      </span>
    </>
  );
  const cls = 'group flex items-start gap-4 px-4 py-5 transition hover:bg-p-ink/[0.02]';
  if (!item.href) return <li className={cls}>{body}</li>;
  return (
    <li>
      {item.external ? (
        <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
          {body}
        </a>
      ) : (
        <Link href={item.href} className={cls}>
          {body}
        </Link>
      )}
    </li>
  );
}

// ── wallet ───────────────────────────────────────────────────────────────

function WalletCard({ wallet, onBuy, onSubmit }: { wallet: Wallet; onBuy: () => void; onSubmit: () => void }) {
  const [showHistory, setShowHistory] = useState(false);
  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="portal-label block !text-[12px] text-p-ink/70">Edit credits</span>
          <p className="mt-2 text-4xl font-bold tracking-tight text-p-ink">{wallet.balance}</p>
          <p className="mt-1 text-sm text-p-ink/70">
            {wallet.nextExpiry ? `${credits(wallet.nextExpiry.credits)} expire ${formatDate(wallet.nextExpiry.on)}` : 'Credits last 90 days from purchase.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={onSubmit} className={primaryBtn}>
            Submit footage
          </button>
          <button onClick={onBuy} className={ghostBtn}>
            Buy credits
          </button>
        </div>
      </div>
      {wallet.history.length > 0 && (
        <div className="mt-5 border-t border-p-line pt-4">
          <button onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory} className="portal-label !text-[12px] text-p-ink/70 transition hover:text-p-brandink">
            {showHistory ? 'Hide history' : 'Credit history'}
          </button>
          {showHistory && (
            <ul className="mt-3 divide-y divide-p-line">
              {wallet.history.map((h) => (
                <li key={h.id} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-base text-p-ink">{h.label}</span>
                    <span className="block text-sm text-p-ink/65">
                      {formatDate(h.at)}
                      {h.expiresOn ? ` · expires ${formatDate(h.expiresOn)}` : ''}
                    </span>
                  </span>
                  <span className={`shrink-0 text-base font-semibold ${h.delta > 0 ? 'text-p-brandink' : 'text-p-ink/80'}`}>
                    {h.delta > 0 ? `+${h.delta}` : h.delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Card className="mt-6 p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="portal-label block text-p-brandink">{title}</span>
        <button onClick={onClose} aria-label="Close" className="text-p-ink/60 transition hover:text-p-brandink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {children}
    </Card>
  );
}

function BuyPanel({ wallet, email, onClose }: { wallet: Wallet; email: string; onClose: () => void }) {
  return (
    <Panel title="Buy credits" onClose={onClose}>
      <p className="mt-2 max-w-2xl text-base text-p-ink/80">
        One credit is a short-form edit. A long-form or VSL edit is 2, premium plus FAQs is 4, and rush or an extra revision round adds 1. Packs last 90 days.
      </p>
      <div className="mt-5 grid gap-px border border-p-line bg-p-line sm:grid-cols-2 lg:grid-cols-4">
        {wallet.packs.map((p) => (
          <div key={p.key} className="flex flex-col bg-p-paper p-5">
            <span className="portal-label !text-[12px] text-p-ink/70">{p.kind === 'monthly' ? 'Monthly' : 'Pack'}</span>
            <p className="mt-2 text-xl font-bold text-p-ink">{p.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-p-brandink">
              {usd(p.price)}
              {p.kind === 'monthly' && <span className="text-base font-medium text-p-ink/70">/mo</span>}
            </p>
            <p className="mt-1 text-sm text-p-ink/70">{usd(p.perCredit)} per credit</p>
            <p className="mt-3 flex-1 text-base text-p-ink/80">{p.blurb}</p>
            {p.checkoutUrl ? (
              <a href={p.checkoutUrl} target="_blank" rel="noopener noreferrer" className={`${primaryBtn} mt-4`}>
                Buy <ArrowIcon external />
              </a>
            ) : (
              <span className="portal-label mt-4 inline-flex justify-center border border-dashed border-p-line px-5 py-3 !text-[12px] text-p-ink/60">Not set up yet</span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-p-ink/70">
        {wallet.canBuy
          ? `Pay with ${email || 'the email you sign in with'} so the credits land in this account. They show up here a minute after the payment clears.`
          : 'Online checkout for credits is being set up. Email info@podlablv.com and we will add credits to your account by hand.'}
      </p>
    </Panel>
  );
}

interface UploadState {
  name: string;
  progress: number;
  error?: string;
}

function SubmitPanel({ wallet, uploads, onClose, onDone }: { wallet: Wallet; uploads: boolean; onClose: () => void; onDone: (msg: string) => void }) {
  const [type, setType] = useState<EditType>('short');
  const [rush, setRush] = useState(false);
  const [extra, setExtra] = useState(0);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [links, setLinks] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<UploadState[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  const cost = editCost({ type, rush, extraRounds: extra }) ?? 0;
  const short = wallet.balance < cost;
  const linkList = links.split(/\s+/).map((s) => s.trim()).filter(Boolean);
  const ready = title.trim() && (files.length > 0 || linkList.length > 0) && !short;

  async function send() {
    setBusy(true);
    setErr(null);
    try {
      let submissionId = draftId;
      if (files.length) {
        // A draft with its own Drive folder; refuses before anything uploads if the wallet is short.
        if (!submissionId) {
          const d = await portalCall<{ submissionId: string; uploads: boolean }>('/api/portal/projects', 'POST', { intent: 'draft', title, editType: type, rush, extraRounds: extra });
          if (!d.uploads) throw new Error('Uploads are not switched on for your account yet. Paste a link to the footage instead.');
          submissionId = d.submissionId;
          setDraftId(submissionId);
        }
        // One file at a time, like the Brand page: steadier on a phone connection.
        setProgress(files.map((f) => ({ name: f.name, progress: 0 })));
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const set = (patch: Partial<UploadState>) => setProgress((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));
          try {
            const s = await portalCall<{ sessionUrl: string }>('/api/portal/projects', 'POST', { intent: 'sign', submissionId, filename: f.name, sizeBytes: f.size, mimeType: f.type || null });
            await uploadToDrive(s.sessionUrl, f, (pct) => set({ progress: pct }));
            set({ progress: 100 });
          } catch (e) {
            set({ error: e instanceof Error ? e.message : 'Upload failed.' });
            throw new Error(`${f.name} did not upload. Nothing was charged; try again.`);
          }
        }
      }
      const res = await portalCall<{ cost: number; already?: boolean }>('/api/portal/projects', 'POST', {
        intent: 'submit',
        submissionId,
        editType: type,
        rush,
        extraRounds: extra,
        title,
        notes,
        links: linkList,
      });
      window.dispatchEvent(new Event('portal:refresh'));
      onDone(res.already ? 'Already sent. It is with the editors.' : `Sent. ${credits(res.cost)} spent; it is with the editors now.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send that.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Submit footage for editing" onClose={onClose}>
      <fieldset className="mt-4">
        <legend className="portal-label !text-[12px] text-p-ink/70">Edit type</legend>
        <div className="mt-2 grid gap-px border border-p-line bg-p-line md:grid-cols-3">
          {EDIT_TYPES.map((t) => (
            <label key={t.key} className={`flex cursor-pointer flex-col bg-p-paper p-4 transition ${type === t.key ? 'outline outline-2 -outline-offset-2 outline-p-brandink' : 'hover:bg-p-ink/[0.02]'}`}>
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <input type="radio" name="edit-type" value={t.key} checked={type === t.key} onChange={() => setType(t.key)} className="accent-[#39FF14]" />
                  <span className="text-base font-semibold text-p-ink">{t.label}</span>
                </span>
                <span className="portal-label !text-[12px] text-p-brandink">{credits(t.credits)}</span>
              </span>
              <span className="mt-2 text-sm text-p-ink/75">{t.detail}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <label className="flex cursor-pointer items-center gap-2 text-base text-p-ink">
          <input type="checkbox" checked={rush} onChange={(e) => setRush(e.target.checked)} className="accent-[#39FF14]" />
          Rush, back in {RUSH_HOURS} hours (+{RUSH_CREDITS})
        </label>
        <span className="flex items-center gap-3 text-base text-p-ink">
          Extra revision rounds (+{EXTRA_ROUND_CREDITS} each)
          <span className="flex items-center border border-p-line">
            <button type="button" aria-label="One fewer round" disabled={extra === 0} onClick={() => setExtra((n) => Math.max(0, n - 1))} className="px-3 py-1.5 text-p-ink/80 disabled:opacity-30">
              -
            </button>
            <span className="min-w-[2ch] text-center font-semibold">{extra}</span>
            <button type="button" aria-label="One more round" disabled={extra >= MAX_EXTRA_ROUNDS} onClick={() => setExtra((n) => Math.min(MAX_EXTRA_ROUNDS, n + 1))} className="px-3 py-1.5 text-p-ink/80 disabled:opacity-30">
              +
            </button>
          </span>
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="portal-label block !text-[12px] text-p-ink/70">Name it</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="October podcast clip" className={`${inputClass} mt-1.5`} />
        </label>
        <label className="block">
          <span className="portal-label block !text-[12px] text-p-ink/70">Footage links (Drive, Dropbox, Frame)</span>
          <input value={links} onChange={(e) => setLinks(e.target.value)} placeholder="https://drive.google.com/…" className={`${inputClass} mt-1.5`} />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="portal-label block !text-[12px] text-p-ink/70">Notes for the editor</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={4000} placeholder="What it's for, where it gets posted, the moment to open on, anything to cut." className={`${inputClass} mt-1.5`} />
      </label>

      {uploads ? (
        <div className="mt-4">
          <span className="portal-label block !text-[12px] text-p-ink/70">Upload files (they go straight to your PodLab folder)</span>
          <input
            type="file"
            multiple
            accept="video/*,audio/*,image/*,.mov,.mp4,.m4v,.mxf,.braw,.r3d,.wav,.mp3,.zip"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-2 block w-full text-base text-p-ink file:mr-4 file:border file:border-p-line file:bg-p-paper file:px-4 file:py-2 file:text-p-ink"
          />
          {progress.length > 0 && (
            <ul className="mt-3 space-y-2">
              {progress.map((p) => (
                <li key={p.name}>
                  <div className="flex justify-between gap-3 text-sm text-p-ink/80">
                    <span className="truncate">{p.name}</span>
                    <span className={p.error ? 'text-p-bad' : ''}>{p.error ?? `${p.progress}%`}</span>
                  </div>
                  <div className="mt-1 h-1 bg-p-line">
                    <div className="h-full bg-p-brand transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-p-ink/70">Paste a link to the footage. Direct uploads switch on once your PodLab folder is linked.</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-p-line pt-5">
        <p className="text-base text-p-ink">
          This edit: <strong>{credits(cost)}</strong> · you have {credits(wallet.balance)}
          {short && <span className="block text-sm text-p-warn">Not enough credits yet. Buy a pack first.</span>}
        </p>
        <button onClick={send} disabled={!ready || busy} className={primaryBtn}>
          {busy ? 'Sending' : `Send to the editors · ${credits(cost)}`}
        </button>
      </div>
      {err && (
        <p role="alert" className="mt-3 text-base text-p-bad">
          {err}
        </p>
      )}
    </Panel>
  );
}

// ── page ─────────────────────────────────────────────────────────────────

function ProjectsInner() {
  const { loading, client, accessToken } = usePortal();
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectState | 'all'>('all');
  const [flash, setFlash] = useState<string | null>(null);
  const buyOpen = params.get('buy') === '1';
  const submitOpen = params.get('submit') === '1';

  const load = useCallback(async () => {
    try {
      setData(await portalCall<Payload>('/api/portal/projects', 'GET'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your projects.');
    }
  }, []);

  useEffect(() => {
    if (!accessToken || !client) return;
    load();
    const again = () => load();
    window.addEventListener('portal:refresh', again);
    return () => window.removeEventListener('portal:refresh', again);
  }, [accessToken, client, load]);

  // Default to what needs them, when anything does.
  const counts = useMemo(() => countByState(data?.items ?? []), [data]);
  useEffect(() => {
    if (data && filter === 'all' && counts.needs_you > 0) setFilter('needs_you');
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data === null]);

  const setPanel = (panel: 'buy' | 'submit' | null) => {
    const q = new URLSearchParams(params.toString());
    q.delete('buy');
    q.delete('submit');
    if (panel) q.set(panel, '1');
    const s = q.toString();
    router.replace(`/portal/projects${s ? `?${s}` : ''}`, { scroll: false });
  };

  const header = (
    <PageHeader
      eyebrow="Projects"
      title="Everything in the works,"
      accent="in one list."
      subtitle="Scripts, cuts, documents and pages. What needs you is first: open it, leave notes, or approve it. Send new footage to the editors with your credits."
    />
  );

  if (loading || (client && !data && !error)) return <p className="portal-label !text-[12px] text-p-ink/70">Loading projects</p>;
  if (!client || error || !data) {
    return (
      <>
        {header}
        <EmptyState title={error ? 'Could not load your projects' : 'No client record yet'} body={error ?? 'Projects appear once your workspace is set up.'} />
      </>
    );
  }

  const shown = filter === 'all' ? data.items : data.items.filter((i) => i.state === filter);

  return (
    <>
      {header}
      <WalletCard wallet={data.wallet} onBuy={() => setPanel(buyOpen ? null : 'buy')} onSubmit={() => setPanel(submitOpen ? null : 'submit')} />
      {flash && (
        <p role="status" className="mt-4 border-l-2 border-p-brandink pl-4 text-base text-p-ink">
          {flash}
        </p>
      )}
      {buyOpen && <BuyPanel wallet={data.wallet} email={client.email} onClose={() => setPanel(null)} />}
      {submitOpen && (
        <SubmitPanel
          wallet={data.wallet}
          uploads={data.uploads}
          onClose={() => setPanel(null)}
          onDone={(msg) => {
            setFlash(msg);
            setPanel(null);
            setFilter('in_progress');
            load();
          }}
        />
      )}

      <div className="mt-10 flex flex-wrap gap-px border border-p-line bg-p-line sm:w-fit" role="tablist" aria-label="Filter projects">
        {(['all', ...STATE_ORDER] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={filter === s}
            onClick={() => setFilter(s)}
            className={`portal-label flex-1 px-4 py-2.5 !text-[12px] transition sm:flex-none ${filter === s ? 'bg-p-brand text-black' : 'bg-p-paper text-p-ink/75 hover:text-p-ink'}`}
          >
            {s === 'all' ? 'All' : STATE_LABEL[s]}
            <span className="ml-2 opacity-70">{s === 'all' ? data.items.length : counts[s]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={filter === 'needs_you' ? 'Nothing needs you right now' : data.items.length ? 'Nothing here' : 'No projects yet'}
            body={
              filter === 'needs_you'
                ? 'The moment a script, cut or document is ready for you, it shows up here and in your notifications.'
                : 'Scripts, cuts, documents and landing pages land here as we make them. Have footage ready? Submit it for editing with your credits.'
            }
          />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-p-line border border-p-line">
          {shown.map((i) => (
            <Row key={i.key} item={i} />
          ))}
        </ul>
      )}
    </>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<p className="portal-label !text-[12px] text-p-ink/70">Loading projects</p>}>
      <ProjectsInner />
    </Suspense>
  );
}
