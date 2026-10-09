/**
 * Production: the client's view of their videos on the CRM content boards.
 *
 * Shared by /api/portal/production (which reads crm.* with the service role)
 * and /portal/production. A card's status is the column it sits in; the
 * editors' ladders (CRM phase59) are mapped to words a client understands.
 */

import type { Chapter } from '@/lib/chapters';

export interface ProductionComment {
  id: string;
  author: string;
  /** Text without the "[0:42 · Hook]" tag. */
  body: string;
  /** Seconds into the video, when the note was pinned to a moment. */
  t: number | null;
  createdAt: string;
  /** Written from the portal by the client, rather than by the PodLab team. */
  fromClient: boolean;
  /** The editor ticked it off in the CRM (the card can't leave Revising until every note is). */
  resolved: boolean;
  /** The client's "Looks good" on the cut. */
  approval?: boolean;
}

export interface ProductionCard {
  id: string;
  title: string;
  column: string;
  /** Client-facing stage, from STAGE_WORDS. */
  stage: string;
  /** 0-based position of the column among the board's columns. */
  step: number;
  steps: number;
  dueOn: string | null;
  videoUrl: string | null;
  /** Signed proxy URL that plays a Drive-hosted cut inline; null for other hosts. */
  streamUrl?: string | null;
  /** From the card description, YouTube-chapter style ("0:00 Hook" per line). */
  chapters: Chapter[];
  done: boolean;
  comments: ProductionComment[];
}

export interface ProductionBoard {
  id: string;
  name: string;
  type: string;
  columns: string[];
  cards: ProductionCard[];
}

/** The free-VSL pipeline columns on crm.leads (CRM phase95), when the client came through it. */
export interface VslTrack {
  status: string;
  scriptsWritten: number;
  scriptsApprovedAt: string | null;
  filmedAt: string | null;
  footageDeliveredAt: string | null;
  bookedFor: string | null;
}

export interface ProductionPayload {
  boards: ProductionBoard[];
  vsl: VslTrack | null;
}

/** Marks a portal-written comment on a CRM card, so the portal can tell them apart. */
export const PORTAL_COMMENT_SUFFIX = ' (client, via portal)';

// The editors' column names, in client words. Anything not listed shows as-is.
const STAGE_WORDS: Record<string, string> = {
  editing: 'Editing',
  'waiting on trailer': 'Editing',
  'piecing episode': 'Editing',
  revising: 'Revising',
  'pending quality control': 'Quality check',
  'pending client approval': 'Ready for your review',
  approved: 'Approved',
  posted: 'Posted',
};

const DONE = new Set(['approved', 'posted', 'done', 'delivered', 'complete', 'completed']);

export function stageFor(column: string): string {
  return STAGE_WORDS[column.trim().toLowerCase()] ?? column;
}

export function isDoneColumn(column: string): boolean {
  return DONE.has(column.trim().toLowerCase());
}
