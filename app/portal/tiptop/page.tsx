'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { usePortal } from '@/lib/portal-data';
import { EmptyState } from '@/components/portal/Shared';
import { viewAsClientId } from '@/lib/portal/view-as';
import TipTopStrip from '@/components/portal/tiptop/TipTopStrip';
import type { TipTopContext } from '@/app/api/portal/tiptop/context/route';

// The TipTop tab (docs/PORTAL-V2.md, track D): her chat full-page, on the same
// thread as the floating launcher, beside a strip of what she is tracking:
// her notes on the business, their targets, their action plan, their builds.
// The chat (and the AI SDK) loads on the client only, like the launcher's.

const TipTopThread = dynamic(() => import('@/components/portal/tiptop/TipTopPanel').then((m) => m.TipTopThread), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <p className="portal-label !text-[12px] text-p-ink/70">Opening</p>
    </div>
  ),
});

function TipTopPageInner() {
  const { loading, client, accessToken, isStaff } = usePortal();
  const params = useSearchParams();
  const [viewAs, setViewAs] = useState<string | null>(null);
  const [ctx, setCtx] = useState<TipTopContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(() => params.get('ask')?.slice(0, 500) || null);
  const [stripOpen, setStripOpen] = useState(false);

  useEffect(() => setViewAs(viewAsClientId()), []);

  const load = useCallback(() => {
    if (!accessToken) return;
    fetch('/api/portal/tiptop/context', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Could not load what TipTop is tracking.');
        setCtx(j as TipTopContext);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load what TipTop is tracking.'));
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);
  // TipTop just saved something: refresh the strip.
  useEffect(() => {
    window.addEventListener('portal:refresh', load);
    return () => window.removeEventListener('portal:refresh', load);
  }, [load]);
  // Other parts of the portal ask TipTop things; on this page she answers here.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const p = (e as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (p) setPrompt(p);
    };
    window.addEventListener('tiptop:open', onOpen);
    return () => window.removeEventListener('tiptop:open', onOpen);
  }, []);

  const ask = useCallback((p: string) => {
    setPrompt(p);
    setStripOpen(false);
  }, []);
  const promptUsed = useCallback(() => setPrompt(null), []);

  if (loading) return <p className="text-base text-p-ink/70">Loading...</p>;
  if (isStaff && !viewAs) return <EmptyState title="TipTop is the client's" body="Open a client with View as client to see what TipTop is tracking for them." />;
  if (!client) return <EmptyState title="Account not set up yet" body="Once PodLab sets up your portal, TipTop lives here." />;

  const readOnly = Boolean(viewAs);
  const strip = error ? (
    <p className="px-5 py-5 text-[15px] text-p-ink/70">{error}</p>
  ) : ctx ? (
    <TipTopStrip ctx={ctx} ask={ask} readOnly={readOnly} />
  ) : (
    <p className="portal-label px-5 py-5 !text-[12px] text-p-ink/70">Loading</p>
  );

  return (
    <div>
      <div className="mb-6">
        <p className="portal-label !text-[12px] text-p-brandink">TipTop</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-p-ink sm:text-4xl">
          Your chief of staff. <span className="portal-drama font-normal text-p-ink/80">She learns it, plans it, builds it, and holds you to it.</span>
        </h1>
      </div>

      <div className="grid gap-px border border-p-line bg-p-line lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* The strip: on phones a fold above the chat, on desktop a column beside it. */}
        <aside className="bg-p-paper lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto">
          <button
            type="button"
            onClick={() => setStripOpen((o) => !o)}
            aria-expanded={stripOpen}
            className="flex w-full items-center justify-between px-5 py-4 text-left lg:hidden"
          >
            <span className="portal-label !text-[12px] text-p-ink">What TipTop is tracking</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={`text-p-ink/70 transition ${stripOpen ? 'rotate-180' : ''}`}>
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>
          <div className={`${stripOpen ? 'block' : 'hidden'} border-t border-p-line lg:block lg:border-t-0`}>{strip}</div>
        </aside>

        <div className="flex h-[calc(100dvh-12rem)] min-h-[520px] flex-col bg-p-paper lg:h-[calc(100dvh-14rem)]">
          {readOnly ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <p className="max-w-sm text-base text-p-ink/75">The chat is the client&apos;s own. In a preview you see what TipTop is tracking for them, beside it.</p>
            </div>
          ) : (
            <TipTopThread initialPrompt={prompt} onPromptUsed={promptUsed} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function TipTopPage() {
  return (
    <Suspense fallback={<p className="portal-label !text-[12px] text-p-ink/70">Loading</p>}>
      <TipTopPageInner />
    </Suspense>
  );
}
