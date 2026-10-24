'use client';

import { vocab, type Tone } from '@/lib/portal/scripts';

const TONE_CLASS: Record<Tone, string> = {
  you: 'border-p-warn/50 text-p-warn',
  us: 'border-p-brandink/50 text-p-brandink',
  done: 'border-p-brandink bg-p-brand text-black',
  idle: 'border-p-ink/15 text-p-ink/70',
};

interface ScriptStatusBadgeProps {
  status: string | null;
  /** The plain-English line under the label: whose move it is. */
  showPlain?: boolean;
  align?: 'start' | 'end';
  /** Held for Hiram: only staff (view-as) ever see this; the client can't see the row at all. */
  held?: boolean;
}

/** Status for scripts and reviewable deliverables. Square, Michroma, no emoji. */
export default function ScriptStatusBadge({ status, showPlain = false, align = 'start', held = false }: ScriptStatusBadgeProps) {
  const v = vocab(status);
  if (held) {
    return (
      <span className={`inline-flex shrink-0 flex-col gap-1.5 ${align === 'end' ? 'items-end text-right' : 'items-start'}`}>
        <span className="portal-label inline-block whitespace-nowrap border border-p-warn/50 px-2 py-1 !text-[11px] text-p-warn">Awaiting Hiram</span>
        <span className="text-[14px] text-p-ink/70">Not visible to the client yet</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex shrink-0 flex-col gap-1.5 ${align === 'end' ? 'items-end text-right' : 'items-start'}`}>
      <span className={`portal-label inline-block whitespace-nowrap border px-2 py-1 !text-[11px] ${TONE_CLASS[v.tone]}`}>
        {v.label}
      </span>
      {showPlain && v.plain && <span className="text-[14px] text-p-ink/70">{v.plain}</span>}
    </span>
  );
}
