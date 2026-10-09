import type { SupabaseClient } from '@supabase/supabase-js';
import { isDoneColumn, stageFor } from '@/lib/production';
import { cardsInScope, clientCardScope, scopeBoardIds } from '@/lib/production-server';

export interface DeliveredItem {
  kind: 'video' | 'file' | 'script' | 'phase';
  title: string;
  detail: string;
  /** ISO date or timestamp; null when the source doesn't record one. */
  at: string | null;
  href: string;
  url?: string | null;
}

/**
 * Everything PodLab has delivered to one client, newest first: finished videos
 * on their CRM boards, approved deliverables and scripts, completed build
 * phases. Each source is best-effort; one that isn't set up adds nothing.
 */
export async function deliveredFor(db: SupabaseClient, clientId: string): Promise<DeliveredItem[]> {
  const items: DeliveredItem[] = [];

  const scope = (await clientCardScope(db, clientId)) ?? { boardIds: [], sharedIds: [] };
  if (scope.boardIds.length || scope.sharedIds.length) {
    const crm = db.schema('crm');
    const cards = await cardsInScope<{ id: string; title: string; list_id: string; board_id: string; video_url: string | null; completed_on: string | null }>(
      db,
      scope,
      'id, title, list_id, board_id, video_url, completed_on',
    );
    const boardIds = scopeBoardIds(scope, cards.data);
    const [lists, boards] = await Promise.all([
      crm.from('content_lists').select('id, name').in('board_id', boardIds),
      crm.from('content_boards').select('id, name').in('id', boardIds),
    ]);
    const listName = new Map((lists.data ?? []).map((l: { id: string; name: string }) => [l.id, l.name]));
    const boardName = new Map((boards.data ?? []).map((b: { id: string; name: string }) => [b.id, b.name]));
    for (const c of cards.data) {
      const column = String(listName.get(c.list_id) ?? '');
      if (!isDoneColumn(column)) continue;
      items.push({ kind: 'video', title: c.title, detail: `${stageFor(column)} · ${boardName.get(c.board_id) ?? 'Production'}`, at: c.completed_on, href: '/portal/production', url: c.video_url });
    }
  }

  const [assets, approvals, phases] = await Promise.all([
    db.from('portal_assets').select('*').eq('client_id', clientId).eq('status', 'approved'),
    db.from('portal_script_approvals').select('script_id, approved_at, version_id').eq('client_id', clientId),
    db.from('portal_delivery_phases').select('title, status, updated_at').eq('client_id', clientId).eq('status', 'done'),
  ]);

  for (const a of (assets.data ?? []) as Array<{ title: string; approved_at?: string | null; approved_version?: number | null }>) {
    items.push({ kind: 'file', title: a.title, detail: a.approved_version ? `Approved v${a.approved_version}` : 'Approved', at: a.approved_at ?? null, href: '/portal/deliverables' });
  }

  const approvalRows = (approvals.data ?? []) as Array<{ script_id: string; approved_at: string }>;
  if (approvalRows.length) {
    const { data: scripts } = await db.from('portal_scripts').select('id, title').in('id', approvalRows.map((r) => r.script_id));
    const title = new Map((scripts ?? []).map((s: { id: string; title: string }) => [s.id, s.title]));
    for (const r of approvalRows) {
      items.push({ kind: 'script', title: String(title.get(r.script_id) ?? 'Script'), detail: 'Script approved', at: r.approved_at, href: `/portal/scripts/${r.script_id}` });
    }
  }

  for (const p of (phases.data ?? []) as Array<{ title: string; updated_at: string | null }>) {
    items.push({ kind: 'phase', title: p.title, detail: 'Build phase complete', at: p.updated_at, href: '/portal/delivery' });
  }

  return items.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''));
}
