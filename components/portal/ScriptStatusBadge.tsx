'use client';

import { vocab, type Tone } from '@/lib/portal/scripts';

const TONE_CLASS: Record<Tone, string> = {
  you: 'border-yellow-300/50 text-yellow-300',
  us: 'border-[#2add1b]/50 text-[#2add1b]',
  done: 'border-[#2add1b] bg-[#2add1b] text-black',
  idle: 'border-[#eeeeee]/15 text-[#eeeeee]/45',
};

interface ScriptStatusBadgeProps {
  status: string | null;
  /** The plain-English line under the label: whose move it is. */
  showPlain?: boolean;
  align?: 'start' | 'end';
}

/** Status for scripts and reviewable deliverables. Square, Michroma, no emoji. */
export default function ScriptStatusBadge({ status, showPlain = false, align = 'start' }: ScriptStatusBadgeProps) {
  const v = vocab(status);
  return (
    <span className={`inline-flex shrink-0 flex-col gap-1.5 ${align === 'end' ? 'items-end text-right' : 'items-start'}`}>
      <span className={`portal-label inline-block whitespace-nowrap border px-2 py-1 !text-[8.5px] ${TONE_CLASS[v.tone]}`}>
        {v.label}
      </span>
      {showPlain && v.plain && <span className="text-[11px] text-[#eeeeee]/45">{v.plain}</span>}
    </span>
  );
}
