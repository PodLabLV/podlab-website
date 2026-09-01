'use client';

/**
 * The Lab Notebook — the activity feed as a bench log.
 *
 * Monospace, right-aligned timestamps, actor initials, append-only. Entries
 * that arrive over the broadcast channel flash once and settle, so "live" is
 * something the client can see happen rather than a number that silently
 * differs from the one they were looking at.
 *
 * Reads portal_events verbatim. This component is the payoff for building the
 * event log properly instead of scattering notify calls across routes.
 *
 * Spec: PORTAL-EXPERIENCE.md §5.2
 */

import { useEffect, useRef, useState } from 'react';
import type { PortalEvent } from '@/lib/portal-data';
import { Card, EmptyState } from '@/components/portal/Shared';

/** Colour by what the entry means, using the signal semantics. */
function toneFor(kind: string): string {
  const k = kind.toLowerCase();
  if (k.includes('paid') || k.includes('approved') || k.includes('validated') || k.includes('done')) {
    return 'bg-[#2ADD1B]';
  }
  if (k.includes('review') || k.includes('waiting') || k.includes('requested')) return 'bg-[#FFB020]';
  if (k.includes('failed') || k.includes('overdue') || k.includes('blocked')) return 'bg-[#F0483E]';
  return 'bg-[#22D3EE]';
}

function initials(name: string | null, actorKind: string | null): string {
  if (actorKind === 'system' || !name) return 'SYS';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase();
}

/** "2026-08-31  14:22" — sortable, unambiguous, reads like a log. */
function stamp(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '—', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function Entry({ event, isNew }: { event: PortalEvent; isNew: boolean }) {
  const { date, time } = stamp(event.created_at);

  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${isNew ? 'portal-arrive' : ''}`}>
      <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${toneFor(event.kind)}`} />

      <div className="hidden shrink-0 font-mono text-[10px] leading-5 text-white/30 portal-num sm:block">
        {date} {time}
      </div>

      <span className="shrink-0 rounded border border-[#2ADD1B]/20 bg-[#2ADD1B]/10 px-1.5 py-0.5 font-mono text-[9px] leading-4 text-[#2ADD1B]">
        {initials(event.actor_name, event.actor_kind)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs leading-5 text-white/80">{event.title}</p>
        {event.detail && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/35">{event.detail}</p>
        )}
        <p className="mt-0.5 font-mono text-[10px] text-white/25 portal-num sm:hidden">
          {date} {time}
        </p>
      </div>
    </div>
  );
}

export default function LabNotebook({
  events,
  limit = 8,
}: {
  events: PortalEvent[];
  limit?: number;
}) {
  // Track which ids arrived after first paint so only genuinely new rows flash.
  // Without this every entry animates on mount, which reads as a glitch.
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(events.map((e) => e.id));
      return;
    }
    const added = events.filter((e) => !seen.current!.has(e.id)).map((e) => e.id);
    if (added.length === 0) return;

    added.forEach((id) => seen.current!.add(id));
    setFresh(new Set(added));
    const t = setTimeout(() => setFresh(new Set()), 700);
    return () => clearTimeout(t);
  }, [events]);

  if (events.length === 0) {
    return (
      <EmptyState
        title="The notebook is empty"
        body="Every delivery, payment, and revision gets logged here as it happens — with a timestamp and who did it."
      />
    );
  }

  return (
    <Card className="divide-y divide-white/5 overflow-hidden">
      {events.slice(0, limit).map((e) => (
        <Entry key={e.id} event={e} isNew={fresh.has(e.id)} />
      ))}
    </Card>
  );
}
