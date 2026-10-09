'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StaffCard } from '@/app/api/portal/admin/cards/route';

interface SharedCardsProps {
  clientId: string;
  accessToken: string;
}

/** Staff: share single CRM cards with a client without linking the whole board (shared boards like Deal Flow Radio). */
export default function SharedCards({ clientId, accessToken }: SharedCardsProps) {
  const [shared, setShared] = useState<StaffCard[]>([]);
  const [results, setResults] = useState<StaffCard[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(
    async (query: string) => {
      const r = await fetch(`/api/portal/admin/cards?clientId=${encodeURIComponent(clientId)}&q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const j = await r.json();
      if (!r.ok) {
        setNote(j.error || 'Could not load cards.');
        return;
      }
      setShared(j.shared);
      setResults(j.results);
    },
    [clientId, accessToken],
  );

  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, load]);

  async function act(cardIds: string[], remove: boolean) {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch('/api/portal/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ clientId, cardIds, remove }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not save that.');
      setNote(remove ? 'Removed from their Your Videos page.' : `Shared ${j.shared} card${j.shared === 1 ? '' : 's'}.`);
      await load(q.trim());
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  }

  const unshared = results.filter((c) => !c.shared && !c.onLinkedBoard);

  return (
    <div>
      {note && <p className="mb-4 border-l-2 border-p-brandink bg-p-brand/5 px-4 py-3 text-base text-p-ink/90">{note}</p>}

      {shared.length > 0 ? (
        <ul className="divide-y divide-p-line border border-p-line">
          {shared.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 bg-p-brand/[0.08] px-4 py-3">
              <span className="min-w-0">
                <span className="block break-words text-base text-p-ink">{c.title}</span>
                <span className="portal-label mt-1 block !text-[11px] text-p-ink/65">
                  {c.board}
                  {c.column ? ` · ${c.column}` : ''}
                  {c.hasCut ? ' · cut attached' : ''}
                </span>
              </span>
              <button disabled={busy} onClick={() => act([c.id], true)} className="portal-label shrink-0 !text-[11px] text-p-ink/70 transition hover:text-p-bad disabled:opacity-40">
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-p-ink/75">No single cards shared yet.</p>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search card titles across every board, e.g. Aoife"
        aria-label="Search CRM cards"
        className="mt-4 w-full border border-p-line bg-p-paper px-4 py-3 text-base text-p-ink placeholder:text-p-ink/50 focus:border-p-brandink focus:outline-none"
      />

      {q.trim().length >= 2 && (
        <div className="mt-3">
          {unshared.length > 1 && (
            <button disabled={busy} onClick={() => act(unshared.map((c) => c.id), false)} className="portal-label mb-3 bg-p-brand px-4 py-2.5 !text-[12px] text-black transition hover:bg-p-pop disabled:opacity-40">
              Share all {unshared.length}
            </button>
          )}
          {results.length === 0 ? (
            <p className="text-base text-p-ink/75">No live cards match.</p>
          ) : (
            <ul className="divide-y divide-p-line border border-p-line">
              {results.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 bg-p-paper px-4 py-3">
                  <span className="min-w-0">
                    <span className="block break-words text-base text-p-ink">{c.title}</span>
                    <span className="portal-label mt-1 block !text-[11px] text-p-ink/65">
                      {c.board}
                      {c.column ? ` · ${c.column}` : ''}
                      {c.hasCut ? ' · cut attached' : ''}
                    </span>
                  </span>
                  {c.shared ? (
                    <span className="portal-label shrink-0 !text-[11px] text-p-brandink">Shared</span>
                  ) : c.onLinkedBoard ? (
                    <span className="portal-label shrink-0 !text-[11px] text-p-ink/65">Board linked</span>
                  ) : (
                    <button disabled={busy} onClick={() => act([c.id], false)} className="portal-label shrink-0 border border-p-brandink px-3 py-2 !text-[11px] text-p-brandink transition hover:bg-p-brand hover:text-black disabled:opacity-40">
                      Share
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
