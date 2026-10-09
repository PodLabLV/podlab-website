'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePortal } from '@/lib/portal-data';
import dynamic from 'next/dynamic';

// The chat (and the AI SDK client) loads on first open, not with every portal page.
const TipTopPanel = dynamic(() => import('./TipTopPanel'), { ssr: false });

export const AVATAR = '/tiptop/avatar.webp';

// TipTop in the portal: a launcher bottom-right and the panel it opens (a
// full-screen sheet on phones, a 420px column on desktop). Only for a signed-in
// account with a client row; TipTop works on that client's own portal.
//
// Other pages can open her with window.dispatchEvent(new CustomEvent('tiptop:open',
// { detail: { prompt?: string } })).

const subscribeNoop = () => () => {};

export default function TipTop() {
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const { client, loading } = usePortal();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ prompt?: string }>).detail;
      setPrompt(detail?.prompt ?? null);
      setOpen(true);
    };
    window.addEventListener('tiptop:open', onOpen);
    return () => window.removeEventListener('tiptop:open', onOpen);
  }, []);

  // Focus back on the launcher when the panel closes.
  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  if (!mounted || loading || !client) return null;

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask TipTop, your PodLab guide"
          aria-haspopup="dialog"
          className="group fixed right-4 z-[60] flex items-center gap-3 border border-p-brandink/50 bg-p-paper/90 p-1 pr-1 backdrop-blur transition hover:border-p-brandink sm:right-6 sm:pr-4"
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <Image src={AVATAR} alt="" width={40} height={40} className="h-10 w-10 object-cover" />
          <span className="portal-label hidden !text-[10px] text-p-brandink sm:inline">Ask TipTop</span>
        </button>
      )}
      {open && <TipTopPanel onClose={close} initialPrompt={prompt} onPromptUsed={() => setPrompt(null)} />}
    </>
  );
}
