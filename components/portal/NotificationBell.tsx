'use client';

/**
 * The bell.
 *
 * Reads portal_notifications, which a database trigger fans out from
 * portal_events — so every module notifies for free and none of them can forget
 * to. New rows arrive over the same broadcast channel as everything else.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/lib/portal-data';

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const { notifications, markRead, accessToken } = usePortal();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read_at);

  // Click-away and Escape. A panel that traps you is worse than no panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function clearAll() {
    if (unread.length === 0) return;
    markRead('all');
    try {
      await fetch('/api/portal/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ all: true }),
      });
    } catch (err) {
      // The optimistic clear stands; a refresh will show the truth.
      console.error('[portal] mark read failed', err);
    }
  }

  return (
    <div ref={wrap} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`}
        className="relative rounded-lg p-2 text-white/50 transition hover:bg-white/5 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFB020] px-1 font-mono text-[9px] font-bold text-black">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <p className="font-display text-[10px] uppercase tracking-widest text-white/50">
              Notifications
            </p>
            {unread.length > 0 && (
              <button
                onClick={clearAll}
                className="font-mono text-[10px] uppercase tracking-wider text-white/30 hover:text-white"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-white/30">
              Nothing yet. Deliveries, payments, and revisions land here.
            </p>
          ) : (
            <div className="max-h-96 divide-y divide-white/5 overflow-y-auto">
              {notifications.slice(0, 20).map((n) => (
                <Link
                  key={n.id}
                  href={n.href || '/portal'}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 transition hover:bg-white/5 ${
                    n.read_at ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read_at && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFB020]" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs leading-relaxed text-white/80">{n.title}</p>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-white/25">
                        {ago(n.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
