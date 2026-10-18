import { NextResponse } from 'next/server';
import { admin, resolveCaller } from '@/lib/portal-server';
import { loadPlans } from '@/lib/portal/game-plan-server';
import { checkInDue, paceStatus, progress, elapsed } from '@/lib/portal/game-plan';
import { FACT_KEYS, FACT_LABELS, loadFacts, nextQuestion } from '@/lib/tiptop/understanding';
import { JOB_LABELS, isActiveJob, loadJobs, type JobKind } from '@/lib/tiptop/jobs';
import { openItems } from '@/lib/tiptop/checkin-run';
import { isOverdue, localDate } from '@/lib/tiptop/checkin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — what TipTop is tracking for the signed-in client, for the strip on the
 * TipTop tab: her notes on the business, their Game Plan targets with pace,
 * open action items with due dates, and asset builds. Read-only. Works in a
 * staff view-as preview (resolveCaller allows GET).
 */

export interface TipTopContext {
  understanding: { ready: boolean; facts: Array<{ key: string; label: string; value: string }>; missing: string[]; next: string | null };
  plans: Array<{
    id: string;
    pillar: string;
    outcome: string;
    metric: string | null;
    baseline: number | null;
    target: number | null;
    current: number | null;
    dueOn: string | null;
    status: string;
    progress: number | null;
    clock: number | null;
    checkInDue: boolean;
  }>;
  plansReady: boolean;
  actions: Array<{ id: string; title: string; dueOn: string | null; overdue: boolean }>;
  jobs: { ready: boolean; items: Array<{ id: string; label: string; status: string; active: boolean; createdAt: string }> };
  today: string;
}

export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const id = caller.clientId;
  const now = Date.now();

  const [facts, plans, items, jobs, client] = await Promise.all([
    loadFacts(db, id),
    loadPlans(db, id),
    openItems(db, id).catch(() => []),
    loadJobs(db, id),
    db.from('portal_clients').select('timezone').eq('id', id).maybeSingle(),
  ]);
  const today = localDate(now, (client.data as { timezone?: string | null } | null)?.timezone || undefined);

  const body: TipTopContext = {
    understanding: {
      ready: facts.ready,
      facts: FACT_KEYS.filter((k) => facts.facts[k]).map((k) => ({ key: k, label: FACT_LABELS[k], value: facts.facts[k]!.value })),
      missing: FACT_KEYS.filter((k) => !facts.facts[k]).map((k) => FACT_LABELS[k]),
      next: (() => {
        const k = nextQuestion(facts.facts);
        return k ? FACT_LABELS[k] : null;
      })(),
    },
    plansReady: plans.ready,
    plans: plans.plans.map((p) => ({
      id: p.id,
      pillar: p.pillar,
      outcome: p.outcome,
      metric: p.metric,
      baseline: p.baseline,
      target: p.target,
      current: p.current,
      dueOn: p.dueOn,
      status: p.status === 'done' ? 'done' : paceStatus(p, now),
      progress: progress(p),
      clock: elapsed(p, now),
      checkInDue: checkInDue(p, now),
    })),
    actions: items
      .map((i) => ({ id: i.id, title: i.title, dueOn: i.dueOn, overdue: isOverdue(i, today) }))
      .sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999')),
    jobs: {
      ready: jobs.ready,
      items: jobs.jobs.slice(0, 6).map((j) => ({
        id: j.id,
        label: JOB_LABELS[j.kind as JobKind] ?? j.kind,
        status: j.status ?? 'queued',
        active: isActiveJob(j.status),
        createdAt: j.created_at,
      })),
    },
    today,
  };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
