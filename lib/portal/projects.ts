/**
 * Projects tab (portal v2, track B): one list of everything a client reviews,
 * waits on or has signed off. Pure types and rules; the server loader is
 * lib/portal/projects-server.ts.
 *
 * Each row links into the flow that already exists for it, so approvals keep
 * their evidence trail:
 *   script     → /portal/scripts/<id>               (line notes, approval with evidence)
 *   video      → /portal/production?card=<id>       (player, timestamped notes, Looks good)
 *   doc / page → /portal/deliverables?item=<id>     (versions, notes, approve)
 *   submission → its card once an editor has a cut; until then, the row itself
 */

export type ProjectState = 'needs_you' | 'in_progress' | 'approved';
export type ProjectKind = 'script' | 'video' | 'doc' | 'page' | 'submission';

export interface ProjectItem {
  /** Stable across loads: "<kind>:<id>". */
  key: string;
  kind: ProjectKind;
  title: string;
  /** Plain words for where it stands ("Ready for your review", "In the edit"). */
  status: string;
  state: ProjectState;
  /** What it is, for the row's small print ("VSL script · v3", "Short-form edit · 1 credit"). */
  meta: string | null;
  href: string | null;
  /** Opens outside the portal (a live landing page). */
  external?: boolean;
  updatedAt: string | null;
  /** The dedupe key of the 'waiting' notification while it needs the client. */
  waitingRef?: string;
}

export const STATE_LABEL: Record<ProjectState, string> = {
  needs_you: 'Needs you',
  in_progress: 'In progress',
  approved: 'Approved',
};

export const STATE_ORDER: ProjectState[] = ['needs_you', 'in_progress', 'approved'];

// ── scripts ──────────────────────────────────────────────────────────────

export function scriptState(status: string | null): { state: ProjectState; status: string } {
  switch ((status || '').toLowerCase()) {
    case 'in review':
      return { state: 'needs_you', status: 'Ready for your review' };
    case 'changes requested':
      return { state: 'in_progress', status: 'We’re revising it' };
    case 'draft':
      return { state: 'in_progress', status: 'Being written' };
    case 'approved':
      return { state: 'approved', status: 'Approved' };
    case 'shot':
      return { state: 'approved', status: 'Filmed' };
    case 'published':
      return { state: 'approved', status: 'Live' };
    default:
      return { state: 'in_progress', status: status || 'In progress' };
  }
}

// ── deliverables (portal_assets) ─────────────────────────────────────────

const DOC_HOSTS = /(drive|docs)\.google\.com|dropbox\.com|frame\.io|vimeo\.com|youtube\.com|youtu\.be|supabase\.co/i;

/** A video, a document (PDF, VSL pack, brand kit) or a landing page (a live site to click through). */
export function assetKind(a: { file_type: string | null; url: string | null; title: string }): 'video' | 'doc' | 'page' {
  const t = (a.file_type || '').toUpperCase();
  if (t === 'VIDEO') return 'video';
  if (t === 'PAGE' || t === 'SITE' || t === 'WEBSITE') return 'page';
  if (t === 'LINK' && a.url && /^https?:\/\//i.test(a.url) && !DOC_HOSTS.test(a.url)) return 'page';
  if (/landing page|website|\bsite\b/i.test(a.title) && t !== 'PDF') return 'page';
  return 'doc';
}

export function assetState(a: { status: string | null; current_version: number | null }): { state: ProjectState; status: string } {
  const s = (a.status || '').toLowerCase();
  // Versioned rows go through review; legacy rows (a url, no versions) were delivered as-is.
  if ((a.current_version ?? 0) > 0) {
    if (s === 'in review') return { state: 'needs_you', status: 'Ready for your review' };
    if (s === 'changes requested') return { state: 'in_progress', status: 'We’re revising it' };
    if (s === 'approved') return { state: 'approved', status: 'Approved' };
  }
  if (s === 'in progress' || s === 'pending') return { state: 'in_progress', status: 'In progress' };
  if (s === 'in review') return { state: 'in_progress', status: 'Coming soon' };
  return { state: 'approved', status: 'Delivered' };
}

// ── submissions ──────────────────────────────────────────────────────────

export function submissionState(s: { status: string }): { state: ProjectState; status: string } {
  if (s.status === 'failed') return { state: 'in_progress', status: 'Not sent: credits returned' };
  return { state: 'in_progress', status: 'Footage received' };
}

// ── ordering + filtering ─────────────────────────────────────────────────

/** Needs-you first, then in progress, then approved; newest first inside each. */
export function sortItems(items: ProjectItem[]): ProjectItem[] {
  return [...items].sort(
    (a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
  );
}

export function countByState(items: ProjectItem[]): Record<ProjectState, number> {
  const out: Record<ProjectState, number> = { needs_you: 0, in_progress: 0, approved: 0 };
  for (const i of items) out[i.state]++;
  return out;
}

// ── 'waiting' notification refs ──────────────────────────────────────────
// One ref per thing-at-a-version, so a new version is a new nudge and the old
// one can be resolved. Everything here starts with "review:" so a sync can tell
// its own rows from other tracks' waiting rows.

export const REVIEW_PREFIX = 'review:';
export const reviewRef = {
  script: (id: string, version: number) => `review:script:${id}:v${version}`,
  asset: (id: string, version: number) => `review:asset:${id}:v${version}`,
  card: (id: string, cutAt: number | null) => `review:card:${id}:${cutAt ?? 0}`,
};
