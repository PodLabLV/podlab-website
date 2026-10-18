import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { admin, resolveStaff } from '@/lib/portal-server';
import { runCheckin } from '@/lib/tiptop/checkin-run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * TipTop's weekly check-in (vercel.json cron, Mondays 16:00 UTC = 9am PDT / 8am PST).
 *
 * GET with `Authorization: Bearer $CRON_SECRET`: for every active client with a
 *   live Game Plan or open action items, seeds TipTop's opening message in
 *   their thread and writes a 'waiting' notification (delivered by
 *   /api/cron/portal-notify). Once per ISO week per client; safe to re-run.
 * GET ?dry=1 with a staff session (or the cron secret): returns the would-be
 *   messages, writes nothing. Optional &clientId=.
 * No model call anywhere in here: the opener is written from their numbers.
 */

function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const dry = params.get('dry') === '1';
  const db = admin();

  if (dry) {
    if (!cronAuthorized(req) && !(await resolveStaff(req, db))) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  } else if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    const run = await runCheckin(db, { dry, clientId: params.get('clientId') ?? undefined });
    const tally = run.results.reduce<Record<string, number>>((acc, r) => ((acc[r.outcome] = (acc[r.outcome] ?? 0) + 1), acc), {});
    console.log('[tiptop-checkin] run', JSON.stringify({ dry, week: run.week, eligible: run.eligible, ...tally }));
    if (dry) return NextResponse.json({ dry: true, ...run, tally }, { headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({
      week: run.week,
      eligible: run.eligible,
      tally,
      results: run.results.map(({ clientId, outcome, error }) => ({ clientId, outcome, error })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reportError('[tiptop-checkin] run failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
