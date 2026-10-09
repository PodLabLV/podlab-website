import { NextResponse } from 'next/server';
import { admin, resolveCaller, resolveStaff } from '@/lib/portal-server';
import { loadPlans } from '@/lib/portal/game-plan-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface PlanActionItem {
  id: string;
  title: string;
  detail: string | null;
  effort: string | null;
  done: boolean;
  pillar: string;
}

/**
 * GET — the Game Plan page: every pillar's 90-day plan plus the action items
 * that roll up to it (source "Game Plan · <pillar>"). Client: their own.
 * Staff: ?clientId=. Writes happen through TipTop (set_game_plan, check_in).
 */
export async function GET(req: Request) {
  const db = admin();
  let clientId: string | null = null;
  const staff = await resolveStaff(req, db);
  if (staff) clientId = new URL(req.url).searchParams.get('clientId');
  else clientId = (await resolveCaller(req, db))?.clientId ?? null;
  if (!clientId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const [{ ready, plans }, items] = await Promise.all([
    loadPlans(db, clientId),
    db.from('portal_action_items').select('id, title, detail, effort, status, source').eq('client_id', clientId).like('source', 'Game Plan · %').order('sort_order'),
  ]);
  const actions: PlanActionItem[] = ((items.data ?? []) as Array<{ id: string; title: string; detail: string | null; effort: string | null; status: string | null; source: string }>).map((r) => ({
    id: r.id,
    title: r.title,
    detail: r.detail,
    effort: r.effort,
    done: r.status === 'done',
    pillar: r.source.replace('Game Plan · ', ''),
  }));
  return NextResponse.json({ ready, plans, actions }, { headers: { 'Cache-Control': 'no-store' } });
}
