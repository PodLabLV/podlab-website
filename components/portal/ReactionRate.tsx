'use client';

/**
 * Reaction Rate — the client's own median time to validate a script.
 *
 * This is the whole game loop, and the only honest kind: the number goes down
 * when they make money faster, not when they use the portal more.
 *
 * Tone rules from PORTAL-EXPERIENCE.md §5.4, all load-bearing:
 *   - never red, never a failure state
 *   - never ranked against other clients by name
 *   - never 0.0 when there is no data — say there is no data
 *   - always paired with the single oldest waiting item and a way to clear it
 *
 * Open question #2 in the spec says run this staff-only for one client cycle
 * before showing it to anyone, so the number can be checked for fairness first.
 * `visibleToClient` is that switch and it defaults to off.
 */

import Link from 'next/link';
import { Card } from '@/components/portal/Shared';
import { reactionRateDays } from '@/lib/portal/scripts';
import type { PortalScript, PortalScriptVersion, PortalScriptApproval } from '@/lib/portal-data';

export default function ReactionRate({
  scripts,
  versions,
  approvals,
  visibleToClient = false,
  isStaff = false,
}: {
  scripts: PortalScript[];
  versions: PortalScriptVersion[];
  approvals: PortalScriptApproval[];
  visibleToClient?: boolean;
  isStaff?: boolean;
}) {
  if (!visibleToClient && !isStaff) return null;

  // A version entering review is its creation; validation is its approval.
  const rate = reactionRateDays(
    versions.map((v) => ({
      reviewedAt: v.created_at,
      approvedAt: approvals.find((a) => a.version_id === v.id)?.approved_at ?? null,
    })),
  );

  const waiting = scripts
    .filter((s) => (s.status || '').toLowerCase() === 'in review')
    .sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || ''))[0];

  const daysWaiting = waiting?.updated_at
    ? Math.floor((Date.now() - new Date(waiting.updated_at).getTime()) / 86_400_000)
    : null;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-[10px] uppercase tracking-widest text-white/40">
          Reaction Rate
        </p>
        {isStaff && !visibleToClient && (
          <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/30">
            Staff only
          </span>
        )}
      </div>

      {rate === null ? (
        <>
          <p className="mt-2 text-2xl font-semibold text-white/40">—</p>
          <p className="mt-1 text-xs leading-relaxed text-white/40">
            Nothing validated yet. This shows your median time to approve a script once there is
            something to measure.
          </p>
        </>
      ) : (
        <>
          <p className="portal-num mt-2 text-2xl font-semibold text-white">
            {rate} {rate === 1 ? 'day' : 'days'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/40">
            Your median time to validate a script. Clients under two days launch about three weeks
            sooner.
          </p>
        </>
      )}

      {waiting && (
        <Link
          href={`/portal/scripts/${waiting.id}`}
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#FFB020]/25 bg-[#FFB020]/[0.06] px-3 py-2.5 transition hover:border-[#FFB020]/50"
        >
          <span className="min-w-0">
            <span className="block truncate text-xs text-white/80">{waiting.title}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#FFB020]">
              {daysWaiting !== null && daysWaiting > 0
                ? `waiting ${daysWaiting} day${daysWaiting === 1 ? '' : 's'}`
                : 'waiting on you'}
            </span>
          </span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-white/40">
            Read →
          </span>
        </Link>
      )}
    </Card>
  );
}
