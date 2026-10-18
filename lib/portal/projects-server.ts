import type { SupabaseClient } from '@supabase/supabase-js';
import { reportError } from '@/lib/alerts';
import { driveFileId } from '@/lib/chapters';
import { driveConfigured, modifiedTimes } from '@/lib/portal/drive';
import { cutHolder, LOOKS_GOOD_NOTE } from '@/lib/portal/potato';
import { PORTAL_COMMENT_SUFFIX, isDoneColumn, stageFor } from '@/lib/production';
import { cardsInScope, clientCardScope, scopeBoardIds, CLIENT_GATE } from '@/lib/production-server';
import { editTypeFor } from '@/lib/portal/credits';
import {
  assetKind,
  assetState,
  reviewRef,
  scriptState,
  sortItems,
  submissionState,
  type ProjectItem,
} from '@/lib/portal/projects';

/**
 * Everything on the Projects tab for one client, read with the service role
 * after the route resolved the caller. Four sources:
 *
 *   portal_scripts                 scripts (status → state)
 *   portal_assets                  docs, landing pages, video deliverables (versioned review)
 *   crm.content_cards              cuts on their linked boards + shared cards, behind the
 *                                  client-approval gate (same scope as Your Videos)
 *   portal_submissions             footage they sent in with credits
 *
 * A video deliverable tied to a card (portal_assets.crm_card_id) shows once, as
 * the deliverable. A submission's card shows as the card once the client can
 * see it; until then the submission row stands in for it.
 */

export interface ProjectsPayload {
  items: ProjectItem[];
  /** False when a source failed to load; the review sync then leaves open rows alone. */
  complete: boolean;
}

interface ScriptRow { id: string; title: string; kind: string | null; lab: string | null; status: string | null; current_version: number; updated_at: string | null; created_at: string | null }
interface AssetRow { id: string; title: string; lab: string | null; file_type: string | null; url: string | null; status: string | null; current_version: number | null; crm_card_id: string | null; updated_at: string | null; created_at: string | null }
interface CardRow { id: string; board_id: string; list_id: string; title: string; video_url: string | null; due_on: string | null; started_on: string | null; created_at: string }
interface ListRow { id: string; board_id: string; name: string; sort: number; role: string | null }
interface SubmissionRow { id: string; status: string; title: string | null; edit_type: string | null; cost: number | null; rush: boolean; card_id: string | null; due_on: string | null; submitted_at: string | null; created_at: string }

const KIND_WORD: Record<string, string> = { vsl: 'VSL script', hook: 'Hook script', faq: 'FAQ script', short: 'Short script', founder: 'Founder script', social: 'Social script', ad: 'Ad script', email: 'Email', long: 'Long-form script' };

export async function loadProjects(db: SupabaseClient, clientId: string): Promise<ProjectsPayload> {
  let complete = true;
  const items: ProjectItem[] = [];

  const [scripts, assets, subs] = await Promise.all([
    db.from('portal_scripts').select('id, title, kind, lab, status, current_version, updated_at, created_at').eq('client_id', clientId),
    db.from('portal_assets').select('id, title, lab, file_type, url, status, current_version, crm_card_id, updated_at, created_at').eq('client_id', clientId),
    db.from('portal_submissions').select('id, status, title, edit_type, cost, rush, card_id, due_on, submitted_at, created_at').eq('client_id', clientId).neq('status', 'draft'),
  ]);
  if (scripts.error || assets.error) {
    complete = false;
    reportError('[portal] projects read failed', scripts.error?.message, assets.error?.message);
  }

  // ── scripts
  for (const s of (scripts.data ?? []) as ScriptRow[]) {
    const st = scriptState(s.status);
    items.push({
      key: `script:${s.id}`,
      kind: 'script',
      title: s.title,
      ...st,
      meta: [KIND_WORD[(s.kind || '').toLowerCase()] ?? 'Script', s.current_version ? `v${s.current_version}` : null].filter(Boolean).join(' · '),
      href: `/portal/scripts/${s.id}`,
      updatedAt: s.updated_at ?? s.created_at,
      ...(st.state === 'needs_you' ? { waitingRef: reviewRef.script(s.id, s.current_version) } : {}),
    });
  }

  // ── deliverables
  const assetRows = (assets.data ?? []) as AssetRow[];
  const cardsAsAssets = new Set(assetRows.map((a) => a.crm_card_id).filter(Boolean) as string[]);
  for (const a of assetRows) {
    const kind = assetKind(a);
    const st = assetState(a);
    const versioned = (a.current_version ?? 0) > 0;
    // A legacy landing page with no versions: the live link is the thing to open.
    const external = kind === 'page' && !versioned && Boolean(a.url);
    items.push({
      key: `${kind}:${a.id}`,
      kind,
      title: a.title,
      ...st,
      meta: [kind === 'page' ? 'Landing page' : kind === 'video' ? 'Video' : 'Document', a.lab, versioned ? `v${a.current_version}` : null].filter(Boolean).join(' · '),
      href: external ? a.url : `/portal/deliverables?item=${a.id}`,
      ...(external ? { external: true } : {}),
      updatedAt: a.updated_at ?? a.created_at,
      ...(st.state === 'needs_you' ? { waitingRef: reviewRef.asset(a.id, a.current_version ?? 0) } : {}),
    });
  }

  // ── cuts on their CRM boards
  const shownCards = new Set<string>();
  try {
    const scope = await clientCardScope(db, clientId);
    if (scope === null) complete = false;
    else if (scope.boardIds.length || scope.sharedIds.length) {
      const crm = db.schema('crm');
      const cards = await cardsInScope<CardRow>(db, scope, 'id, board_id, list_id, title, video_url, due_on, started_on, created_at');
      if (cards.error) complete = false;
      const boardIds = scopeBoardIds(scope, cards.data);
      const live = cards.data.filter((c) => !cardsAsAssets.has(c.id));
      const [lists, comments, times] = await Promise.all([
        boardIds.length ? crm.from('content_lists').select('id, board_id, name, sort, role').in('board_id', boardIds).eq('archived', false) : Promise.resolve({ data: [] as ListRow[], error: null }),
        live.length
          ? crm.from('content_comments').select('card_id, author_name, body, created_at, resolved').in('card_id', live.map((c) => c.id)).like('author_name', `%${PORTAL_COMMENT_SUFFIX}`)
          : Promise.resolve({ data: [] as Array<{ card_id: string; author_name: string | null; body: string | null; created_at: string; resolved: boolean | null }>, error: null }),
        driveConfigured()
          ? modifiedTimes(live.map((c) => driveFileId(c.video_url)).filter((x): x is string => Boolean(x))).catch(() => new Map<string, number>())
          : Promise.resolve(new Map<string, number>()),
      ]);
      if (lists.error || comments.error) complete = false;
      const listRows = (lists.data ?? []) as ListRow[];
      const gated = new Set(listRows.filter((l) => (l.role ?? 'step') === 'step' && CLIENT_GATE.test(l.name)).map((l) => l.board_id));
      for (const c of live) {
        const col = listRows.find((l) => l.id === c.list_id);
        const column = col?.name ?? '';
        if (/scrap/i.test(column) || col?.role === 'scrap') continue;
        const stage = stageFor(column) || 'Queued';
        const done = isDoneColumn(column);
        const notes = (comments.data ?? [])
          .filter((n) => n.card_id === c.id)
          .map((n) => ({ at: Date.parse(n.created_at), resolved: Boolean(n.resolved), looksGood: (n.body ?? '').trim() === LOOKS_GOOD_NOTE }));
        const fileId = driveFileId(c.video_url);
        const cutAt = (fileId && times.get(fileId)) || Date.parse(c.started_on ?? c.created_at) || null;
        let state: ProjectItem['state'];
        let status = stage;
        if (done) state = 'approved';
        else if (gated.has(c.board_id)) {
          // Boards with the client-approval column: that column is the ask.
          state = CLIENT_GATE.test(column) ? 'needs_you' : 'in_progress';
          if (state === 'needs_you' && notes.some((n) => n.looksGood && (cutAt === null || n.at >= cutAt))) {
            state = 'in_progress';
            status = 'You approved it';
          }
        } else {
          // Older boards: the same rule the Hot Potato uses for "cuts to watch".
          const h = cutHolder({ hasCut: Boolean(c.video_url), cutAt, dueOn: c.due_on, clientNotes: notes });
          state = h?.holder === 'client' ? 'needs_you' : 'in_progress';
          if (state === 'needs_you') status = 'Ready for your review';
          else if (h) status = h.why;
        }
        shownCards.add(c.id);
        items.push({
          key: `video:${c.id}`,
          kind: 'video',
          title: c.title,
          state,
          status,
          meta: 'Video',
          href: `/portal/production?card=${c.id}`,
          updatedAt: cutAt ? new Date(cutAt).toISOString() : c.created_at,
          ...(state === 'needs_you' ? { waitingRef: reviewRef.card(c.id, cutAt) } : {}),
        });
      }
    }
  } catch (err) {
    complete = false;
    reportError('[portal] projects cards failed', err instanceof Error ? err.message : err);
  }

  // ── footage they sent in (until the editor's card is visible to them)
  for (const s of (subs.data ?? []) as SubmissionRow[]) {
    if (s.card_id && shownCards.has(s.card_id)) continue;
    const t = editTypeFor(s.edit_type);
    items.push({
      key: `submission:${s.id}`,
      kind: 'submission',
      title: s.title || 'Footage for editing',
      ...submissionState(s),
      meta: [t?.label ?? 'Edit', s.rush ? 'Rush' : null, s.cost ? `${s.cost} credit${s.cost === 1 ? '' : 's'}` : null, s.due_on && s.status === 'submitted' ? `due ${s.due_on}` : null].filter(Boolean).join(' · '),
      href: null,
      updatedAt: s.submitted_at ?? s.created_at,
    });
  }

  return { items: sortItems(items), complete };
}
