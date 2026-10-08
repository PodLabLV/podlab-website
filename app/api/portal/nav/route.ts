import { NextResponse } from 'next/server';
import { admin, resolveCaller } from '@/lib/portal-server';
import { buildOverview } from '@/lib/tiptop/overview';
import { gameFor, type Game } from '@/lib/portal/game';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface NavPayload {
  game: Game;
  /** Things waiting on the client, per page. Zero means no badge. */
  badges: Partial<Record<'intake' | 'scripts' | 'deliverables' | 'actions' | 'brand' | 'production', number>>;
  /** Pages that are finished on the client's side: a check instead of a badge. */
  done: Partial<Record<'intake' | 'brand', boolean>>;
  /** Pages with something in them. Hidden pages are still reachable by URL. */
  show: Record<'growth' | 'document' | 'intake' | 'delivery' | 'production' | 'deliverables' | 'scripts' | 'actions' | 'reports' | 'invoices', boolean>;
  chain: { unlocked: number; available: boolean };
}

/** GET — the sidebar: what to show, what's waiting, and the build level. The client's own data only. */
export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const [o, reports] = await Promise.all([
    buildOverview(db, caller),
    db.from('portal_report_metrics').select('id', { count: 'exact', head: true }).eq('client_id', caller.clientId),
  ]);

  const waitingScripts = o.scripts.items.filter((s) => s.waitingOnYou).length;
  const waitingDeliverables = o.deliverables.items.filter((d) => d.waitingOnYou).length;
  const cutsToWatch = o.production.videos.filter((v) => v.hasVideo && !v.done && !v.lastNoteByYou).length;

  const payload: NavPayload = {
    game: gameFor(o),
    badges: {
      intake: o.intake.total && !o.intake.submitted ? Math.max(1, o.intake.requiredLeft) : 0,
      scripts: waitingScripts,
      deliverables: waitingDeliverables,
      actions: o.actionItems.open.length,
      brand: o.brand.available ? o.brand.gaps.length : 0,
      production: cutsToWatch,
    },
    done: {
      intake: o.intake.total > 0 && o.intake.submitted,
      brand: o.brand.available && o.brand.gaps.length === 0,
    },
    show: {
      growth: o.chain.available,
      document: o.document.has,
      intake: o.intake.total > 0,
      delivery: o.phases.length > 0,
      production: o.production.videos.length > 0,
      deliverables: o.deliverables.items.length > 0,
      scripts: o.scripts.items.length > 0,
      actions: o.actionItems.open.length + o.actionItems.done > 0,
      reports: (reports.count ?? 0) > 0,
      invoices: o.invoices.open.length + o.invoices.paidCount > 0,
    },
    chain: { unlocked: o.chain.unlocked, available: o.chain.available },
  };
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
