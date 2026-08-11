'use client';

import { useState } from 'react';
import { usePortal, formatDate } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';

export default function ActionItemsPage() {
  const { loading, client, actionItems, setActionItem, accessToken } = usePortal();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <p className="text-white/40 text-sm">Loading...</p>;

  if (!client || actionItems.length === 0) {
    return (
      <>
        <PageHeader title="Action Items" />
        <EmptyState
          title="No action items yet"
          body="The things we need from you show up here — each one small enough to finish in a week. Tick them off and the team is notified automatically."
        />
      </>
    );
  }

  async function toggle(id: string, done: boolean) {
    setBusy(id);
    setError(null);
    const previous = !done;
    setActionItem(id, done); // optimistic
    try {
      const res = await fetch('/api/portal/action-items', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken ?? ''}`,
        },
        body: JSON.stringify({ id, done }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Could not save that.');
      }
    } catch (err) {
      setActionItem(id, previous); // roll back so the tick never lies
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusy(null);
    }
  }

  const done = actionItems.filter((i) => i.status === 'done').length;

  return (
    <>
      <PageHeader
        title="Action Items"
        subtitle="What moves the needle first. Tick one off and we will see it on our side."
      />

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-[10px] uppercase tracking-widest text-white/40">
            Progress
          </p>
          <p className="text-white text-sm font-semibold">
            {done} of {actionItems.length} complete
          </p>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-[#2ADD1B] transition-all duration-500"
            style={{ width: `${(done / actionItems.length) * 100}%` }}
          />
        </div>
      </Card>

      {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

      <div className="space-y-4">
        {actionItems.map((item, i) => {
          const complete = item.status === 'done';
          return (
            <Card
              key={item.id}
              className={`p-5 transition ${complete ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggle(item.id, !complete)}
                  disabled={busy === item.id}
                  aria-pressed={complete}
                  aria-label={complete ? `Reopen: ${item.title}` : `Complete: ${item.title}`}
                  className={`mt-0.5 shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition disabled:opacity-50 ${
                    complete
                      ? 'bg-[#2ADD1B] border-[#2ADD1B] text-black'
                      : 'border-white/25 hover:border-[#2ADD1B] text-transparent'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-display text-[10px] uppercase tracking-widest text-[#2ADD1B]">
                      Action {String(i + 1).padStart(2, '0')}
                    </span>
                    {item.effort && (
                      <span className="font-display text-[10px] uppercase tracking-widest text-white/30">
                        {item.effort}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-white text-sm font-semibold mt-1.5 ${
                      complete ? 'line-through decoration-white/30' : ''
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.detail && (
                    <p className="text-white/50 text-sm mt-2.5 leading-relaxed whitespace-pre-wrap">
                      {item.detail}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-white/25">
                    {item.source && <span>{item.source}</span>}
                    {complete && item.completed_at && (
                      <span className="text-[#2ADD1B]/70">
                        Completed {formatDate(item.completed_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
