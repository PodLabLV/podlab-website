'use client';

import { useEffect, useState } from 'react';
import { usePortal, formatDate } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';
import { stageFor, type ProductionBoard, type ProductionCard, type ProductionComment, type ProductionPayload, type VslTrack } from '@/lib/production';
import VideoReview, { type ReviewNote } from '@/components/portal/VideoReview';
import { videoSource } from '@/lib/chapters';

function StepBar({ card }: { card: ProductionCard }) {
  if (card.steps < 2) return null;
  return (
    <div className="flex gap-0.5" aria-label={`Step ${card.step + 1} of ${card.steps}: ${card.column}`}>
      {Array.from({ length: card.steps }, (_, i) => (
        <span key={i} className={`h-1 flex-1 ${i <= card.step ? (card.done ? 'bg-[#2add1b]' : 'bg-[#2add1b]/70') : 'bg-[#1a1a1a]'}`} />
      ))}
    </div>
  );
}

function StageTag({ card }: { card: ProductionCard }) {
  const s = card.stage.toLowerCase();
  const tone = card.done
    ? 'border-[#2add1b] bg-[#2add1b] text-black'
    : s === 'revising'
      ? 'border-yellow-300/40 text-yellow-300'
      : 'border-[#2add1b]/50 text-[#2add1b]';
  return <span className={`portal-label inline-block shrink-0 border px-2 py-1 !text-[8.5px] ${tone}`}>{card.stage || 'Queued'}</span>;
}

function CardRow({ card, onNote }: { card: ProductionCard; onNote: (cardId: string, c: ProductionComment, movedTo?: string) => void }) {
  const { accessToken } = usePortal();
  const [open, setOpen] = useState(false);

  async function addNote(t: number | null, body: string) {
    const res = await fetch('/api/portal/production', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` },
      body: JSON.stringify({ cardId: card.id, body, timeSeconds: t }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Could not send that.');
    onNote(card.id, json.comment as ProductionComment, json.reopened ? 'Revising' : undefined);
    window.dispatchEvent(new Event('portal:refresh'));
  }

  // "Looks good": passes the potato back without reopening anything.
  const approvedAt = card.comments.filter((c) => c.approval).map((c) => c.createdAt).sort().pop() ?? null;
  const [approving, setApproving] = useState(false);
  const [approveErr, setApproveErr] = useState<string | null>(null);
  async function looksGood() {
    setApproving(true);
    setApproveErr(null);
    try {
      const res = await fetch('/api/portal/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` },
        body: JSON.stringify({ cardId: card.id, intent: 'looks-good' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not send that.');
      onNote(card.id, { id: `approval-${Date.now()}`, author: 'You', t: null, body: 'Looks good. Approved in the portal.', createdAt: new Date().toISOString(), fromClient: true, resolved: false, approval: true });
      window.dispatchEvent(new Event('portal:refresh'));
    } catch (e) {
      setApproveErr(e instanceof Error ? e.message : 'Could not send that.');
    } finally {
      setApproving(false);
    }
  }

  const notes: ReviewNote[] = card.comments.map((c) => ({
    id: c.id,
    t: c.t,
    body: c.body,
    author: c.author,
    fromClient: c.fromClient,
    meta: c.approval ? `Looks good · ${formatDate(c.createdAt)}` : formatDate(c.createdAt),
    resolved: c.resolved,
  }));
  const mine = card.comments.filter((c) => c.fromClient && !c.approval);
  const fixed = mine.filter((c) => c.resolved).length;

  return (
    <li className="bg-black">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-col gap-3 p-5 text-left transition hover:bg-white/[0.02]"
      >
        <div className="flex w-full items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-[#eeeeee]">{card.title}</span>
            <span className="mt-1 block text-xs text-[#eeeeee]/40">
              {[
                card.dueOn ? `Due ${formatDate(card.dueOn)}` : null,
                card.chapters.length ? `${card.chapters.length} chapters` : null,
                mine.length ? `${fixed} of ${mine.length} of your notes fixed` : card.comments.length ? `${card.comments.length} note${card.comments.length === 1 ? '' : 's'}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || ' '}
            </span>
          </span>
          <StageTag card={card} />
        </div>
        <StepBar card={card} />
      </button>

      {open && (
        <div className="border-t border-[#1a1a1a] px-5 pb-6 pt-5">
          <VideoReview
            source={card.streamUrl && card.videoUrl ? { kind: 'file', url: card.streamUrl, fallback: { url: card.videoUrl, host: 'Google Drive' } } : videoSource(card.videoUrl)}
            chapters={card.chapters}
            notes={notes}
            onAddNote={addNote}
            emptyText={card.videoUrl ? undefined : 'No cut posted yet. You can still leave a note for the editor.'}
          />
          {card.videoUrl && !card.done && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={looksGood}
                disabled={approving}
                className="portal-label bg-[#2add1b] px-5 py-3 !text-[10px] text-black transition hover:bg-[#eeeeee] disabled:opacity-40"
              >
                {approving ? 'Sending' : approvedAt ? 'Looks good (sent)' : 'Looks good'}
              </button>
              <span className="text-xs text-[#eeeeee]/40">
                {approvedAt ? `You approved this cut ${formatDate(approvedAt)}. The editor moves it on.` : 'Happy with this cut? Tell the editor, and the potato is theirs.'}
              </span>
              {approveErr && <span className="text-xs text-red-400">{approveErr}</span>}
            </div>
          )}
          <p className="mt-3 text-xs text-[#eeeeee]/35">
            {card.done
              ? card.stage === 'Posted'
                ? 'This video is already live. A note goes to the team, who will decide on a re-cut with you.'
                : 'This video is approved. A note sends it back to the editor for another pass.'
              : 'Each note lands on the editor’s card with its time and chapter.'}
          </p>
        </div>
      )}
    </li>
  );
}

function BoardSection({ board, onNote }: { board: ProductionBoard; onNote: (cardId: string, c: ProductionComment, movedTo?: string) => void }) {
  const [showDone, setShowDone] = useState(false);
  const active = board.cards.filter((c) => !c.done);
  const done = board.cards.filter((c) => c.done);
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <span className="portal-label block text-[#2add1b]">{board.name}</span>
        <span className="portal-label !text-[9px] text-[#eeeeee]/35">
          {active.length} in progress · {done.length} done
        </span>
      </div>
      {board.cards.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Nothing on this board yet" body="Videos appear here the moment an editor picks them up." />
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <ul className="mt-4 divide-y divide-[#1a1a1a] border border-[#1a1a1a]">
              {active.map((c) => (
                <CardRow key={c.id} card={c} onNote={onNote} />
              ))}
            </ul>
          )}
          {done.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowDone((v) => !v)}
                className="portal-label !text-[9px] text-[#eeeeee]/40 transition hover:text-[#2add1b]"
              >
                {showDone ? 'Hide' : 'Show'} {done.length} finished
              </button>
              {showDone && (
                <ul className="mt-3 divide-y divide-[#1a1a1a] border border-[#1a1a1a]">
                  {done.map((c) => (
                    <CardRow key={c.id} card={c} onNote={onNote} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function VslStrip({ vsl }: { vsl: VslTrack }) {
  const steps = [
    { label: 'Scripts written', done: vsl.scriptsWritten > 0, detail: vsl.scriptsWritten ? `${vsl.scriptsWritten} written` : null },
    { label: 'Scripts approved', done: Boolean(vsl.scriptsApprovedAt), detail: vsl.scriptsApprovedAt ? formatDate(vsl.scriptsApprovedAt) : null },
    {
      label: 'Filmed',
      done: Boolean(vsl.filmedAt),
      detail: vsl.filmedAt ? formatDate(vsl.filmedAt) : vsl.bookedFor ? `Booked ${formatDate(vsl.bookedFor)}` : null,
    },
    { label: 'Footage delivered', done: Boolean(vsl.footageDeliveredAt), detail: vsl.footageDeliveredAt ? formatDate(vsl.footageDeliveredAt) : null },
  ];
  return (
    <section className="mt-10">
      <span className="portal-label block text-[#2add1b]">Your VSL</span>
      <ol className="mt-4 grid grid-cols-2 gap-px border border-[#1a1a1a] bg-[#1a1a1a] md:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.label} className="bg-black p-5">
            <span className={`flex h-7 w-7 items-center justify-center border text-[10px] font-bold ${s.done ? 'border-[#2add1b] bg-[#2add1b] text-black' : 'border-[#eeeeee]/20 text-[#eeeeee]/35'}`}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className={`mt-3 text-sm font-semibold ${s.done ? 'text-[#eeeeee]' : 'text-[#eeeeee]/50'}`}>{s.label}</p>
            <p className="mt-1 text-xs text-[#eeeeee]/40">{s.detail ?? 'Not yet'}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function ProductionPage() {
  const { loading, client, accessToken } = usePortal();
  const [data, setData] = useState<ProductionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !client) return;
    fetch('/api/portal/production', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'Could not load production.');
        setData(json as ProductionPayload);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load production.'));
  }, [accessToken, client]);

  // A note on a video past review sends it back to Revising; mirror that here.
  const onNote = (cardId: string, c: ProductionComment, movedTo?: string) =>
    setData(
      (prev) =>
        prev && {
          ...prev,
          boards: prev.boards.map((b) => ({
            ...b,
            cards: b.cards.map((card) =>
              card.id !== cardId
                ? card
                : {
                    ...card,
                    comments: [c, ...card.comments],
                    ...(movedTo
                      ? { column: movedTo, stage: stageFor(movedTo), done: false, step: Math.max(0, b.columns.indexOf(movedTo)) }
                      : {}),
                  },
            ),
          })),
        },
    );

  if (loading || (client && !data && !error)) return <p className="portal-label !text-[9px] text-[#eeeeee]/40">Loading production</p>;

  const header = (
    <PageHeader
      eyebrow="Production"
      title="Your videos,"
      accent="in the edit."
      subtitle="Every video we're making for you, live from our editors' board. Jump by chapter, pause on the moment, and your note lands on the editor's card with the time."
    />
  );

  if (!client || error) {
    return (
      <>
        {header}
        <EmptyState title={error ? 'Could not load production' : 'No client record yet'} body={error ?? 'Production appears once your workspace is set up.'} />
      </>
    );
  }

  const cards = data!.boards.flatMap((b) => b.cards);
  const counts = [
    { label: 'In the edit', value: cards.filter((c) => !c.done && c.stage.toLowerCase() !== 'revising').length },
    { label: 'Revising', value: cards.filter((c) => c.stage.toLowerCase() === 'revising').length },
    { label: 'Done', value: cards.filter((c) => c.done).length },
  ];

  return (
    <div>
      {header}

      {data!.vsl && <VslStrip vsl={data!.vsl} />}

      {data!.boards.length === 0 ? (
        !data!.vsl && (
          <EmptyState
            title="Nothing in production yet"
            body="Once your first shoot is in the edit, every video shows up here with where it stands. You can leave notes for the editor on each one."
            cta={{ label: 'Book your shoot', href: 'https://calendly.com/podlablv/strategy-call' }}
          />
        )
      ) : (
        <>
          <Card className="mt-10 grid grid-cols-3 divide-x divide-[#1a1a1a]">
            {counts.map((c) => (
              <div key={c.label} className="p-5">
                <p className="portal-label !text-[9px] text-[#eeeeee]/40">{c.label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-[#eeeeee]">{c.value}</p>
              </div>
            ))}
          </Card>
          {data!.boards.map((b) => (
            <BoardSection key={b.id} board={b} onNote={onNote} />
          ))}
        </>
      )}
    </div>
  );
}
