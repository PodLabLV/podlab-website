'use client';

import { useEffect, useState } from 'react';
import { usePortal } from '@/lib/portal-data';
import { STUDIO_COPY, formatStudioDay, type StudioDayState } from '@/lib/portal/studio-day';

interface StudioDayCardProps {
  className?: string;
}

const CalendarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="1" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

/**
 * ELITE EssentialsLab only: a big "Book your Studio Day" button until the
 * booking shows up in the CRM, then the booked date. Renders nothing for
 * everyone else, or while loading.
 */
export default function StudioDayCard({ className = '' }: StudioDayCardProps) {
  const { client, accessToken } = usePortal();
  const [state, setState] = useState<StudioDayState | null>(null);

  useEffect(() => {
    if (!client?.id || !accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/portal/studio-day', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
        if (res.ok && !cancelled) setState((await res.json()) as StudioDayState);
      } catch {
        // Leave it hidden; the email carries the link too.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client?.id, accessToken]);

  if (!state?.eligible) return null;

  if (state.booked) {
    const when = formatStudioDay(state.startAt);
    return (
      <section className={`border border-p-line bg-p-card p-5 md:p-6 ${className}`}>
        <span className="portal-label block !text-[12px] text-p-brandink">{STUDIO_COPY.kicker}</span>
        <p className="mt-2 flex items-center gap-3 text-xl font-semibold text-p-ink">
          <span className="text-p-brandink"><CalendarIcon /></span>
          {when ? `${STUDIO_COPY.bookedTitle}: ${when}` : STUDIO_COPY.bookedTitle}
        </p>
        <p className="mt-2 text-base text-p-ink/75">{STUDIO_COPY.bookedBody}</p>
      </section>
    );
  }

  if (!state.url) return null;
  return (
    <section className={`border-2 border-p-brandink bg-p-card p-6 md:p-8 ${className}`}>
      <span className="portal-label block !text-[12px] text-p-brandink">{STUDIO_COPY.kicker}</span>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-p-ink md:text-3xl">{STUDIO_COPY.title}</h2>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-p-ink/85">{STUDIO_COPY.body}</p>
      <a
        href={state.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-[56px] items-center gap-3 bg-p-brand px-8 py-4 text-lg font-bold text-black transition hover:bg-p-pop"
      >
        <CalendarIcon />
        {STUDIO_COPY.button}
      </a>
    </section>
  );
}
