/**
 * Scripts — shared types and pure helpers.
 *
 * No 'use client' and no imports from the browser data layer, so the API routes
 * and the pages can both use this. Anything that needs a database goes in the
 * route; anything that needs React goes in the component.
 */

export type ScriptStatus =
  | 'draft'
  | 'in review'
  | 'changes requested'
  | 'approved'
  | 'shot'
  | 'published';

export const SCRIPT_STATUSES: ScriptStatus[] = [
  'draft',
  'in review',
  'changes requested',
  'approved',
  'shot',
  'published',
];

/**
 * Themed label, plain subtitle, signal colour.
 *
 * The subtitle is not decoration. PORTAL-EXPERIENCE.md rule 2: the theme skins,
 * it never obscures — a client must be able to tell what is happening without
 * decoding "Hypothesis". Never render the label without it.
 */
export const STATUS_VOCAB: Record<
  ScriptStatus,
  { label: string; plain: string; tone: 'running' | 'waiting' | 'done' | 'failed' }
> = {
  draft:               { label: 'Hypothesis',   plain: 'Being written',            tone: 'running' },
  'in review':         { label: 'Peer Review',  plain: 'Waiting on your notes',    tone: 'waiting' },
  'changes requested': { label: 'Revision',     plain: "We're rewriting",          tone: 'running' },
  approved:            { label: 'Validated',    plain: 'Locked and ready to shoot', tone: 'done'   },
  shot:                { label: 'In Production', plain: 'Filmed, in the edit',     tone: 'running' },
  published:           { label: 'Deployed',     plain: 'Live',                     tone: 'done'   },
};

export const TONE_HEX = {
  running: '#22D3EE',
  waiting: '#FFB020',
  done: '#2ADD1B',
  failed: '#F0483E',
} as const;

export function vocab(status: string | null) {
  const key = (status || 'draft').toLowerCase() as ScriptStatus;
  return STATUS_VOCAB[key] ?? STATUS_VOCAB.draft;
}

/**
 * Split a script body into comment-anchorable blocks.
 *
 * Blank-line separated, which is how the skills already emit markdown. Kept in
 * one place because the block index a comment stores has to mean the same thing
 * to the route that writes it and the page that renders it — two different
 * split rules would silently mis-anchor every note.
 */
export function toBlocks(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
}

export function wordCount(body: string): number {
  return body.trim().split(/\s+/).filter(Boolean).length;
}

/** 150 wpm is a delivered-to-camera pace, not a silent reading pace. */
export function runtimeSeconds(body: string): number {
  return Math.round((wordCount(body) / 150) * 60);
}

export function formatRuntime(seconds: number | null): string {
  if (!seconds || seconds < 1) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
}

/**
 * Re-anchor a comment against a new version.
 *
 * Returns the block index whose text still contains the quote, or null when the
 * quote is gone. Null means orphaned, which is flagged for a human rather than
 * dropped — a note that quietly vanishes because the line was rewritten is how
 * feedback gets lost.
 */
export function reanchor(quotedText: string | null, blocks: string[]): number | null {
  if (!quotedText) return null;
  const needle = quotedText.trim().toLowerCase();
  if (!needle) return null;
  const idx = blocks.findIndex((b) => b.toLowerCase().includes(needle));
  return idx === -1 ? null : idx;
}

/**
 * Reaction Rate — median days from a version entering review to its approval.
 *
 * Median, not mean: one script that sat over a holiday should not define the
 * number. Returns null rather than 0 when there is nothing to measure, because
 * showing a founder "0.0 days" for no data is worse than showing nothing.
 *
 * PORTAL-EXPERIENCE.md §5.4 tone rules apply wherever this is rendered: never
 * red, never ranked against other clients by name, always paired with the one
 * oldest waiting item and a way to clear it.
 */
export function reactionRateDays(
  pairs: Array<{ reviewedAt: string | null; approvedAt: string | null }>,
): number | null {
  const spans = pairs
    .filter((p) => p.reviewedAt && p.approvedAt)
    .map((p) => {
      const start = new Date(p.reviewedAt as string).getTime();
      const end = new Date(p.approvedAt as string).getTime();
      return (end - start) / 86_400_000;
    })
    .filter((d) => Number.isFinite(d) && d >= 0)
    .sort((a, b) => a - b);

  if (spans.length === 0) return null;

  const mid = Math.floor(spans.length / 2);
  const median = spans.length % 2 === 0 ? (spans[mid - 1] + spans[mid]) / 2 : spans[mid];
  return Math.round(median * 10) / 10;
}
