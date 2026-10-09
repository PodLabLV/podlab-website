'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePortal } from '@/lib/portal-data';
import { PageHeader, EmptyState } from '@/components/portal/Shared';
import { FORMAT_LABEL, JOB_LABEL, groupByWeek, jobMix, needsScript, JOBS, type ContentItem, type ContentStatus } from '@/lib/portal/content-plan';

const STATUS_TONE: Record<ContentStatus, string> = {
  planned: 'border-[#eeeeee]/20 text-[#eeeeee]/55',
  scripted: 'border-[#2add1b]/50 text-[#2add1b]',
  recorded: 'border-yellow-300/50 text-yellow-300',
  'in edit': 'border-sky-300/50 text-sky-300',
  posted: 'border-[#2add1b] bg-[#2add1b] text-black',
  skipped: 'border-[#eeeeee]/10 text-[#eeeeee]/30 line-through',
};

const askTipTop = (prompt: string) => window.dispatchEvent(new CustomEvent('tiptop:open', { detail: { prompt } }));

const fmtWeek = (w: string) => `Week of ${new Date(`${w}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

function Row({ item, staff, onSend, busy }: { item: ContentItem; staff: boolean; onSend: (id: string) => void; busy: boolean }) {
  const late = needsScript(item);
  return (
    <li className="grid gap-3 bg-black px-4 py-4 sm:grid-cols-[110px_1fr_auto] sm:items-start">
      <div>
        <p className="text-sm font-semibold text-[#eeeeee]">{fmtDay(item.publishOn)}</p>
        <p className="portal-label mt-1 !text-[8.5px] text-[#eeeeee]/40">
          {FORMAT_LABEL[item.format]} · {JOB_LABEL[item.job]}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-[15px] text-[#eeeeee]">{item.title}</p>
        {item.hook && <p className="mt-1 text-sm italic text-[#eeeeee]/55">&ldquo;{item.hook}&rdquo;</p>}
        <p className="mt-1 text-xs text-[#eeeeee]/35">
          {item.pillar}
          {item.cta ? ` · CTA: ${item.cta}` : ''}
        </p>
        {late && !staff && (
          <button onClick={() => askTipTop(`Write the script for "${item.title}" from my content plan.`)} className="portal-label mt-2 !text-[9px] text-[#ff8a1f] hover:text-[#eeeeee]">
            Goes out soon with no script. Write it with TipTop
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
        <span className={`portal-label border px-2 py-1 !text-[8.5px] ${STATUS_TONE[item.status]}`}>{item.status}</span>
        {item.scriptId && (
          <Link href={`/portal/scripts/${item.scriptId}`} className="portal-label !text-[8.5px] text-[#2add1b] hover:text-[#eeeeee]">
            Script
          </Link>
        )}
        {staff && item.status === 'recorded' && !item.crmCardId && (
          <button onClick={() => onSend(item.id)} disabled={busy} className="portal-label bg-[#2add1b] px-3 py-2 !text-[8.5px] text-black transition hover:bg-[#eeeeee] disabled:opacity-40">
            Send to editors
          </button>
        )}
      </div>
    </li>
  );
}

function ContentPageInner() {
  const { loading, client, accessToken, isStaff } = usePortal();
  const params = useSearchParams();
  const staffClient = isStaff ? params.get('client') : null;
  const [data, setData] = useState<{ ready: boolean; items: ContentItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    const qs = staffClient ? `?clientId=${encodeURIComponent(staffClient)}` : '';
    fetch(`/api/portal/content${qs}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Could not load your content plan.');
        setData(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your content plan.'));
  }, [accessToken, staffClient]);

  useEffect(() => {
    if (isStaff && !staffClient) return;
    load();
  }, [load, isStaff, staffClient]);
  useEffect(() => {
    window.addEventListener('portal:refresh', load);
    return () => window.removeEventListener('portal:refresh', load);
  }, [load]);

  async function send(itemId: string) {
    setBusy(true);
    setFlash(null);
    try {
      const r = await fetch('/api/portal/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` },
        body: JSON.stringify({ itemId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not send that.');
      setFlash(`Card created on "${j.board}". The editors have it.`);
      load();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Could not send that.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-[#eeeeee]/40">Loading...</p>;
  if (isStaff && !staffClient) return <EmptyState title="Pick a client" body="Open a client from Clients · staff to see their content plan." />;
  if (!client && !staffClient) return <EmptyState title="Account not set up yet" body="Once PodLab sets up your portal, your content plan lives here." />;
  if (error) return <EmptyState title="Could not load your content plan" body={error} />;
  if (!data) return <p className="portal-label !text-[9px] text-[#eeeeee]/40">Loading your content plan</p>;
  if (!data.ready) return <EmptyState title="Almost ready" body="The content plan is being switched on for your account. Check back shortly." />;

  const live = data.items.filter((i) => i.status !== 'skipped');
  const mix = jobMix(data.items);
  const weeks = groupByWeek(data.items);
  const posted = live.filter((i) => i.status === 'posted').length;

  return (
    <div>
      {staffClient && (
        <Link href={`/portal/clients/${staffClient}`} className="portal-label !text-[9px] text-[#eeeeee]/40 transition hover:text-[#2add1b]">
          ← Back to the client
        </Link>
      )}
      <div className={staffClient ? 'mt-6' : ''}>
        <PageHeader
          eyebrow="Content Plan"
          title="What goes out,"
          accent="and when."
          subtitle="Every piece has a date, a format and one job. TipTop plans it with you and writes the scripts; once you've recorded a piece, it goes to your editors."
        />
      </div>

      {flash && <p className="mb-6 border-l-2 border-[#2add1b] bg-[#2add1b]/5 px-4 py-3 text-sm text-[#eeeeee]/80">{flash}</p>}

      {live.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 border-l-2 border-[#2add1b] bg-[#2add1b]/5 px-5 py-4">
          <p className="text-sm text-[#eeeeee]/80">No content planned yet. TipTop will pick your pillars, set a cadence you can actually keep, and lay out the next 30 days.</p>
          {!staffClient && (
            <button onClick={() => askTipTop('Plan my content for the next 30 days.')} className="portal-label bg-[#2add1b] px-5 py-3 !text-[10px] text-black transition hover:bg-[#eeeeee]">
              Plan my next 30 days
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px border border-[#1a1a1a] bg-[#1a1a1a] sm:grid-cols-5">
            <div className="bg-black p-4">
              <p className="portal-label !text-[8.5px] text-[#eeeeee]/40">Planned</p>
              <p className="mt-2 text-2xl font-bold text-[#eeeeee]">{live.length}</p>
              <p className="text-xs text-[#eeeeee]/35">{posted} posted</p>
            </div>
            {JOBS.map((j) => (
              <div key={j} className="bg-black p-4">
                <p className="portal-label !text-[8.5px] text-[#eeeeee]/40">{JOB_LABEL[j]}</p>
                <p className="mt-2 text-2xl font-bold text-[#eeeeee]">{mix[j]}</p>
              </div>
            ))}
          </div>
          {!staffClient && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => askTipTop('Plan my next 30 days of content, picking up where my current plan ends.')} className="portal-label border border-[#1a1a1a] px-4 py-2.5 !text-[9.5px] text-[#eeeeee]/70 transition hover:border-[#2add1b] hover:text-[#2add1b]">
                Plan the next 30 days
              </button>
              <button onClick={() => askTipTop('I recorded some pieces from my content plan. Mark them recorded.')} className="portal-label border border-[#1a1a1a] px-4 py-2.5 !text-[9.5px] text-[#eeeeee]/70 transition hover:border-[#2add1b] hover:text-[#2add1b]">
                I recorded some
              </button>
            </div>
          )}

          <div className="mt-8 space-y-8">
            {weeks.map((w) => (
              <section key={w.week}>
                <p className="portal-label !text-[9px] text-[#2add1b]">{fmtWeek(w.week)}</p>
                <ul className="mt-3 divide-y divide-[#1a1a1a] border border-[#1a1a1a]">
                  {w.items.map((i) => (
                    <Row key={i.id} item={i} staff={Boolean(staffClient)} onSend={send} busy={busy} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ContentPlanPage() {
  return (
    <Suspense fallback={<p className="portal-label !text-[9px] text-[#eeeeee]/40">Loading your content plan</p>}>
      <ContentPageInner />
    </Suspense>
  );
}
