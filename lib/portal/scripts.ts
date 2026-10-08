/**
 * Scripts & Deliverables: shared types and pure helpers.
 *
 * No 'use client' and no database, so the API routes and the pages can both
 * import it. The block-split rule in particular has to be the same on both
 * sides: the index a comment stores must mean the same thing to the route that
 * writes it and the page that renders it.
 */

// ── types (rows as RLS returns them) ────────────────────────────────────

export interface PortalScript {
  id: string;
  client_id: string;
  title: string;
  lab: string | null;
  kind: string | null;
  status: string | null;
  current_version: number;
  shoot_date: string | null;
  source: string | null;
  trial_group: string | null;
  changes_requested_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
}

export interface PortalScriptVersion {
  id: string;
  script_id: string;
  version_no: number;
  body: string;
  word_count: number | null;
  runtime_seconds: number | null;
  author_name: string | null;
  author_kind: string | null;
  note: string | null;
  created_at: string;
}

export interface PortalScriptComment {
  id: string;
  version_id: string;
  script_id: string;
  parent_id: string | null;
  block_index: number | null;
  quoted_text: string | null;
  body: string;
  author_name: string;
  author_kind: 'client' | 'staff' | string;
  status: 'open' | 'resolved' | 'carried' | string;
  orphaned: boolean;
  created_at: string;
}

export interface PortalScriptApproval {
  id: string;
  version_id: string;
  script_id: string;
  approved_by_name: string;
  approved_at: string;
}

export interface PortalAssetVersion {
  id: string;
  asset_id: string;
  version_no: number;
  storage_path: string | null;
  external_url: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  note: string | null;
  uploaded_by: string | null;
  created_at: string;
  /** [{ t, title }] — see lib/chapters.ts. Absent before 20261008e runs. */
  chapters?: unknown;
}

export interface PortalAssetComment {
  id: string;
  version_id: string;
  asset_id: string;
  time_seconds: number | null;
  body: string;
  author_name: string;
  author_kind: string;
  status: string;
  created_at: string;
}

/** The new columns on portal_assets. Absent until the migration runs. */
export interface AssetReviewFields {
  current_version?: number | null;
  approved_version?: number | null;
  approved_at?: string | null;
  approved_by?: string | null;
  changes_requested_at?: string | null;
}

// ── status ──────────────────────────────────────────────────────────────

export const SCRIPT_STATUSES = [
  'draft',
  'in review',
  'changes requested',
  'approved',
  'shot',
  'published',
] as const;
export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];

export type Tone = 'you' | 'us' | 'done' | 'idle';

/**
 * Plain words, and whose move it is. A founder must be able to tell from the
 * badge alone whether they are the blocker.
 */
const STATUS_VOCAB: Record<string, { label: string; plain: string; tone: Tone }> = {
  draft: { label: 'Draft', plain: 'Being written', tone: 'us' },
  'in review': { label: 'Your review', plain: 'Waiting on your notes', tone: 'you' },
  'changes requested': { label: 'Revising', plain: "We're rewriting", tone: 'us' },
  approved: { label: 'Approved', plain: 'Locked and ready to shoot', tone: 'done' },
  shot: { label: 'Filmed', plain: 'Shot, in the edit', tone: 'us' },
  published: { label: 'Live', plain: 'Published', tone: 'done' },
  // legacy portal_assets values
  ready: { label: 'Ready', plain: 'Ready to open', tone: 'done' },
  'in progress': { label: 'In progress', plain: 'Being made', tone: 'us' },
  pending: { label: 'Pending', plain: 'Not started', tone: 'idle' },
};

export function vocab(status: string | null) {
  const key = (status || 'draft').toLowerCase();
  return STATUS_VOCAB[key] ?? { label: status || 'Pending', plain: '', tone: 'idle' as Tone };
}

export function isWaitingOnClient(status: string | null): boolean {
  return (status || '').toLowerCase() === 'in review';
}

// ── text ────────────────────────────────────────────────────────────────

/** Blank-line separated blocks, which is how the Lab skills already emit markdown. */
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
  if (!seconds || seconds < 1) return '';
  return clock(seconds);
}

/**
 * Re-anchor a quote against a new version's blocks. Null means the line is
 * gone, which flags the note as orphaned rather than dropping it.
 */
export function reanchor(quotedText: string | null, blocks: string[]): number | null {
  if (!quotedText) return null;
  const needle = quotedText.trim().toLowerCase();
  if (!needle) return null;
  const idx = blocks.findIndex((b) => b.toLowerCase().includes(needle));
  return idx === -1 ? null : idx;
}

// ── time + size ─────────────────────────────────────────────────────────

/** "0:42" / "1:05:10", the form a player shows. */
export function clock(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '';
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "1:23", "1:02:03" or plain seconds. Null when it isn't a time. */
export function parseClock(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d+(:\d{1,2}){0,2}(\.\d+)?$/.test(t)) return null;
  const parts = t.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function humanSize(bytes: number | null): string | null {
  if (!bytes) return null;
  const mb = bytes / 1_048_576;
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

/** Notes written by the client since they last pressed "send". */
export function unsentClientNotes<T extends { author_kind: string; status: string; created_at: string }>(
  notes: T[],
  lastSentAt: string | null | undefined,
): T[] {
  // Compare as instants: Postgres and toISOString() format fractions differently.
  const since = lastSentAt ? Date.parse(lastSentAt) : NaN;
  return notes.filter(
    (n) =>
      n.author_kind === 'client' &&
      n.status === 'open' &&
      (!Number.isFinite(since) || Date.parse(n.created_at) > since),
  );
}
