'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePortal } from '@/lib/portal-data';
import { viewAsClientId } from '@/lib/portal/view-as';
import type { PortalNotification } from '@/lib/portal/notify';
import { PotatoIcon, usePotatoes } from '@/components/portal/HotPotato';
import type { Potato } from '@/lib/portal/potato';

interface Feed {
  ready: boolean;
  done: PortalNotification[];
  earlier: PortalNotification[];
  waiting: PortalNotification[];
  count: number;
}

/** A line-drawn potato with a small flame: subtle, takes the text colour, no emoji. */
export function HotPotatoGlyph({ size = 20, lit = false }: { size?: number; lit?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ overflow: 'visible' }}>
      <path
        d="M3.5 15.5c0-3.6 3.6-5.8 8-5.8s8 2.2 8 5.8-3.6 6-8 6-8-2.4-8-6z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="8.5" cy="15" r=".9" fill="currentColor" />
      <circle cx="13.5" cy="17.6" r=".9" fill="currentColor" />
      <circle cx="15.6" cy="13.8" r=".7" fill="currentColor" />
      <path
        d="M12 8.2c-1.6-1.2-1.4-3 .2-4.7.1 1.3.9 1.8 1.6 2.4.6.6.6 1.6-.1 2.3"
        stroke={lit ? 'rgb(var(--p-brandink))' : 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};

function Row({ n, onGo, faded }: { n: PortalNotification; onGo: () => void; faded?: boolean }) {
  const inner = (
    <>
      <span className={`block break-words text-[15px] leading-snug ${faded ? 'text-p-ink/70' : 'text-p-ink'}`}>{n.title}</span>
      {n.body && <span className="mt-1 block break-words text-sm leading-snug text-p-ink/70">{n.body}</span>}
      <span className="portal-label mt-1.5 block !text-[10px] text-p-ink/55">{ago(n.created_at)}</span>
    </>
  );
  const cls = 'block px-4 py-3 transition hover:bg-p-ink/[0.04]';
  if (!n.link) return <div className={cls}>{inner}</div>;
  if (/^https?:/i.test(n.link)) {
    return (
      <a href={n.link} target="_blank" rel="noopener noreferrer" onClick={onGo} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={n.link} onClick={onGo} className={cls}>
      {inner}
    </Link>
  );
}

function PotatoRow({ p, onGo }: { p: Potato; onGo: () => void }) {
  return (
    <Link href={p.href} onClick={onGo} className="flex items-start gap-3 px-4 py-3 transition hover:bg-p-ink/[0.04]">
      <span className="mt-0.5 shrink-0">
        <PotatoIcon heat={p.heat} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block break-words text-[15px] leading-snug text-p-ink">{p.title}</span>
        <span className="mt-1 block break-words text-sm leading-snug text-p-ink/70">{p.why}</span>
        <span className="portal-label mt-1.5 block !text-[10px] text-p-ink/55">{p.days === 0 ? 'Since today' : `On you ${p.days} ${p.days === 1 ? 'day' : 'days'}`}</span>
      </span>
    </Link>
  );
}

/**
 * The hot potato: top right of the portal. "Waiting on you" = open 'waiting'
 * rows (they stay until the thing is done); "What we did" = unread 'done' rows.
 * Opening it marks everything shown as read. Reads public.portal_notifications
 * through /api/portal/notifications. The computed Hot Potatoes the client holds
 * (lib/portal/potato.ts: scripts to approve, cuts to watch, brand gaps…) ride
 * along under "Waiting on you" until every source writes its own rows; one with
 * the same link as a notification is shown once.
 */
export default function NotificationBell({ align = 'right' }: { align?: 'right' | 'left' }) {
  const { accessToken, client } = usePortal();
  const pathname = usePathname();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const potatoes = usePotatoes();

  const load = useCallback(async () => {
    if (!accessToken || !client) return;
    try {
      const r = await fetch('/api/portal/notifications', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
      if (r.ok) setFeed((await r.json()) as Feed);
    } catch {
      // Offline or not live yet: the button just shows no count.
    }
  }, [accessToken, client]);

  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 90_000);
    window.addEventListener('portal:refresh', load);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('portal:refresh', load);
    };
  }, [load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || !feed || !accessToken || viewAsClientId()) return;
    const unread = [...feed.done, ...feed.waiting].filter((n) => !n.read_at).map((n) => n.id);
    if (!unread.length) return;
    try {
      await fetch('/api/portal/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action: 'read', ids: unread }),
      });
    } catch {
      // Stays unread; next open tries again.
    }
  }

  if (!client) return null;
  const waiting = feed?.waiting ?? [];
  const done = feed?.done ?? [];
  const earlier = feed?.earlier ?? [];
  const links = new Set(waiting.map((n) => n.link));
  const held = (potatoes ?? []).filter((p) => p.holder === 'client' && !links.has(p.href));
  const count = waiting.length + held.length + done.length;
  const waitingCount = waiting.length + held.length;
  const close = () => setOpen(false);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={count ? `Hot potato: ${count} ${count === 1 ? 'update' : 'updates'}` : 'Hot potato: nothing new'}
        className={`relative flex h-10 items-center gap-2 border px-2.5 transition ${
          count ? 'border-p-brandink/60 text-p-brandink hover:border-p-brandink' : 'border-p-line text-p-ink/75 hover:border-p-brandink hover:text-p-brandink'
        }`}
      >
        <HotPotatoGlyph lit={waitingCount > 0} />
        {count > 0 && <span className="portal-label min-w-[1ch] !text-[12px] tabular-nums">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Hot potato"
          className={`absolute top-12 z-[80] w-[min(380px,calc(100vw-2rem))] border border-p-line bg-p-paper shadow-[0_20px_60px_rgba(0,0,0,.45)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center justify-between border-b border-p-line px-4 py-3">
            <span className="portal-label !text-[12px] text-p-brandink">Hot potato</span>
            <span className="text-sm text-p-ink/60">{count ? `${count} for you` : 'All caught up'}</span>
          </div>
          <div className="max-h-[min(70vh,560px)] overflow-y-auto">
            <section>
              <p className="portal-label border-b border-p-line bg-p-card px-4 py-2 !text-[11px] text-p-ink/70">
                Waiting on you{waitingCount ? ` · ${waitingCount}` : ''}
              </p>
              {waitingCount ? (
                <div className="divide-y divide-p-line">
                  {waiting.map((n) => (
                    <Row key={n.id} n={n} onGo={close} />
                  ))}
                  {held.map((p) => (
                    <PotatoRow key={p.key} p={p} onGo={close} />
                  ))}
                </div>
              ) : (
                <p className="px-4 py-4 text-sm text-p-ink/65">Nothing. The potato is in our hands.</p>
              )}
            </section>
            <section className="border-t border-p-line">
              <p className="portal-label border-b border-p-line bg-p-card px-4 py-2 !text-[11px] text-p-ink/70">
                What we did{done.length ? ` · ${done.length} new` : ''}
              </p>
              {done.length || earlier.length ? (
                <div className="divide-y divide-p-line">
                  {done.map((n) => (
                    <Row key={n.id} n={n} onGo={close} />
                  ))}
                  {earlier.map((n) => (
                    <Row key={n.id} n={n} onGo={close} faded />
                  ))}
                </div>
              ) : (
                <p className="px-4 py-4 text-sm text-p-ink/65">New cuts, approvals and deliveries show up here.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
