'use client';

import { useEffect, useState } from 'react';
import { usePortal, formatDate } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';
import type { ProductionBoard, ProductionCard, ProductionComment, ProductionPayload, VslTrack } from '@/lib/production';

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

function CardRow({ card, onNote }: { card: ProductionCard; onNote: (cardId: string, c: ProductionComment) => void }) {
  const { accessToken } = usePortal();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` },
        body: JSON.stringify({ cardId: card.id, body: note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not send that.');
      onNote(card.id, json.comment as ProductionComment);
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that.');
    } finally {
      setSending(false);
    }
  }

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
              {[card.dueOn ? `Due ${formatDate(card.dueOn)}` : null, card.comments.length ? `${card.comments.length} note${card.comments.length === 1 ? '' : 's'}` : null]
                .filter(Boolean)
                .join(' · ') || ' '}
            </span>
          </span>
          <StageTag card={card} />
        </div>
        <StepBar card={card} />
      </button>

      {open && (
        <div className="border-t border-[#1a1a1a] px-5 pb-5 pt-4">
          {card.videoUrl && (
            <a
              href={card.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="portal-label inline-flex items-center gap-2 border border-[#2add1b]/50 px-4 py-2.5 !text-[9.5px] text-[#2add1b] transition hover:bg-[#2add1b] hover:text-black"
            >
              Watch the latest cut →
            </a>
          )}

          {card.comments.length > 0 && (
            <ol className="mt-4 space-y-3">
              {card.comments.map((c) => (
                <li key={c.id} className={`border-l-2 pl-4 ${c.fromClient ? 'border-[#eeeeee]/25' : 'border-[#2add1b]/60'}`}>
                  <p className="portal-label !text-[8.5px] text-[#eeeeee]/35">
                    {c.fromClient ? 'You' : c.author} · {formatDate(c.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#eeeeee]/80">{c.body}</p>
                </li>
              ))}
            </ol>
          )}

          <form onSubmit={send} className="mt-5">
            <label htmlFor={`note-${card.id}`} className="portal-label mb-2 block !text-[9px] text-[#eeeeee]/45">
              Request a change
            </label>
            <textarea
              id={`note-${card.id}`}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What should change? Timestamps help: “0:42, cut the pause.”"
              className="w-full resize-y border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 text-[15px] leading-relaxed text-[#eeeeee] placeholder:text-[#eeeeee]/25 focus:border-[#2add1b] focus:outline-none"
            />
            {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={sending || !note.trim()}
                className="portal-label bg-[#2add1b] px-5 py-3 !text-[10px] text-black transition hover:bg-[#eeeeee] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? 'Sending' : 'Send to the editor'}
              </button>
              <span className="text-xs text-[#eeeeee]/35">Goes straight onto the editor&apos;s card.</span>
            </div>
          </form>
        </div>
      )}
    </li>
  );
}

function BoardSection({ board, onNote }: { board: ProductionBoard; onNote: (cardId: string, c: ProductionComment) => void }) {
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

  const onNote = (cardId: string, c: ProductionComment) =>
    setData((prev) =>
      prev && {
        ...prev,
        boards: prev.boards.map((b) => ({
          ...b,
          cards: b.cards.map((card) => (card.id === cardId ? { ...card, comments: [c, ...card.comments] } : card)),
        })),
      },
    );

  if (loading || (client && !data && !error)) return <p className="portal-label !text-[9px] text-[#eeeeee]/40">Loading production</p>;

  const header = (
    <PageHeader
      eyebrow="Production"
      title="Your videos,"
      accent="in the edit."
      subtitle="Every video we're making for you, live from our editors' board. Leave a note on any cut and it lands on the editor's card."
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
