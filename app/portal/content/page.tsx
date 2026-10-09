'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePortal } from '@/lib/portal-data';
import { PageHeader, EmptyState } from '@/components/portal/Shared';
import { FORMAT_LABEL, JOB_LABEL, groupByWeek, jobMix, needsScript, JOBS, type ContentItem, type ContentStatus } from '@/lib/portal/content-plan';

const STATUS_TONE: Record<ContentStatus, string> = {
  planned: 'border-p-ink/20 text-p-ink/75',
  scripted: 'border-p-brandink/50 text-p-brandink',
  recorded: 'border-p-warn/50 text-p-warn',
  'in edit': 'border-sky-300/50 text-sky-300',
  posted: 'border-p-brandink bg-p-brand text-black',
  skipped: 'border-p-ink/10 text-p-ink/65 line-through',
};

const askTipTop = (prompt: string) => window.dispatchEvent(new CustomEvent('tiptop:open', { detail: { prompt } }));

const fmtWeek = (w: string) => `Week of ${new Date(`${w}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

function Row({ item, staff, onSend, busy }: { item: ContentItem; staff: boolean; onSend: (id: string) => void; busy: boolean }) {
  const late = needsScript(item);
  return (
    <li className="grid gap-3 bg-p-paper px-4 py-4 sm:grid-cols-[110px_1fr_auto] sm:items-start">
      <div>
        <p className="text-base font-semibold text-p-ink">{fmtDay(item.publishOn)}</p>
        <p className="portal-label mt-1 !text-[11px] text-p-ink/70">
          {FORMAT_LABEL[item.format]} · {JOB_LABEL[item.job]}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-[17px] text-p-ink">{item.title}</p>
        {item.hook && <p className="mt-1 text-base italic text-p-ink/75">&ldquo;{item.hook}&rdquo;</p>}
        <p className="mt-1 text-sm text-p-ink/65">
          {item.pillar}
          {item.cta ? ` · CTA: ${item.cta}` : ''}
        </p>
        {late && !staff && (
          <button onClick={() => askTipTop(`Write the script for "${item.title}" from my content plan.`)} className="portal-label mt-2 !text-[12px] text-[#ff8a1f] hover:text-p-ink">
            Goes out soon with no script. Write it with TipTop
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
        <span className={`portal-label border px-2 py-1 !text-[11px] ${STATUS_TONE[item.status]}`}>{item.status}</span>
        {item.scriptId && (
          <Link href={`/portal/scripts/${item.scriptId}`} className="portal-label !text-[11px] text-p-brandink hover:text-p-ink">
            Script
          </Link>
        )}
        {staff && item.status === 'recorded' && !item.crmCardId && (
          <button onClick={() => onSend(item.id)} disabled={busy} className="portal-label bg-p-brand px-3 py-2 !text-[11px] text-black transition hover:bg-p-pop disabled:opacity-40">
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

  if (loading) return <p className="text-base text-p-ink/70">Loading...</p>;
  if (isStaff && !staffClient) return <EmptyState title="Pick a client" body="Open a client from Clients · staff to see their content plan." />;
  if (!client && !staffClient) return <EmptyState title="Account not set up yet" body="Once PodLab sets up your portal, your content plan lives here." />;
  if (error) return <EmptyState title="Could not load your content plan" body={error} />;
  if (!data) return <p className="portal-label !text-[12px] text-p-ink/70">Loading your content plan</p>;
  if (!data.ready) return <EmptyState title="Almost ready" body="The content plan is being switched on for your account. Check back shortly." />;

  const live = data.items.filter((i) => i.status !== 'skipped');
  const mix = jobMix(data.items);
  const weeks = groupByWeek(data.items);
  const posted = live.filter((i) => i.status === 'posted').length;

  return (
    <div>
      {staffClient && (
        <Link href={`/portal/clients/${staffClient}`} className="portal-label !text-[12px] text-p-ink/70 transition hover:text-p-brandink">
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

      {flash && <p className="mb-6 border-l-2 border-p-brandink bg-p-brand/5 px-4 py-3 text-base text-p-ink/90">{flash}</p>}

      {live.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 border-l-2 border-p-brandink bg-p-brand/5 px-5 py-4">
          <p className="text-base text-p-ink/90">No content planned yet. TipTop will pick your pillars, set a cadence you can actually keep, and lay out the next 30 days.</p>
          {!staffClient && (
            <button onClick={() => askTipTop('Plan my content for the next 30 days.')} className="portal-label bg-p-brand px-5 py-3 !text-[13px] text-black transition hover:bg-p-pop">
              Plan my next 30 days
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px border border-p-line bg-p-line sm:grid-cols-5">
            <div className="bg-p-paper p-4">
              <p className="portal-label !text-[11px] text-p-ink/70">Planned</p>
              <p className="mt-2 text-2xl font-bold text-p-ink">{live.length}</p>
              <p className="text-sm text-p-ink/65">{posted} posted</p>
            </div>
            {JOBS.map((j) => (
              <div key={j} className="bg-p-paper p-4">
                <p className="portal-label !text-[11px] text-p-ink/70">{JOB_LABEL[j]}</p>
                <p className="mt-2 text-2xl font-bold text-p-ink">{mix[j]}</p>
              </div>
            ))}
          </div>
          {!staffClient && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => askTipTop('Plan my next 30 days of content, picking up where my current plan ends.')} className="portal-label border border-p-line px-4 py-2.5 !text-[12px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink">
                Plan the next 30 days
              </button>
              <button onClick={() => askTipTop('I recorded some pieces from my content plan. Mark them recorded.')} className="portal-label border border-p-line px-4 py-2.5 !text-[12px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink">
                I recorded some
              </button>
            </div>
          )}

          <div className="mt-8 space-y-8">
            {weeks.map((w) => (
              <section key={w.week}>
                <p className="portal-label !text-[12px] text-p-brandink">{fmtWeek(w.week)}</p>
                <ul className="mt-3 divide-y divide-p-line border border-p-line">
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
    <Suspense fallback={<p className="portal-label !text-[12px] text-p-ink/70">Loading your content plan</p>}>
      <ContentPageInner />
    </Suspense>
  );
}
