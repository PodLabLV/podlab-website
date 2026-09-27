'use client';

import { vocab, TONE_HEX } from '@/lib/portal/scripts';

/**
 * Themed label with its plain-English subtitle.
 *
 * The subtitle is not optional. PORTAL-EXPERIENCE.md rule 2 — the theme skins,
 * it never obscures. "Peer Review" is a nice word; "Waiting on your notes" is
 * the part that tells a founder they are the blocker.
 */
export default function ScriptStatusBadge({
  status,
  showPlain = true,
}: {
  status: string | null;
  showPlain?: boolean;
}) {
  const v = vocab(status);
  const hex = TONE_HEX[v.tone];

  return (
    <span className="inline-flex flex-col gap-1">
      <span
        className="inline-block w-fit rounded-lg border px-2.5 py-1 font-display text-[10px] uppercase tracking-widest"
        style={{ color: hex, borderColor: `${hex}33`, backgroundColor: `${hex}1A` }}
      >
        {v.label}
      </span>
      {showPlain && <span className="text-[11px] text-white/40">{v.plain}</span>}
    </span>
  );
}
