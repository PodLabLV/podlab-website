import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { admin, resolveStaff } from '@/lib/portal-server';
import { runBeakerNotify } from '@/lib/portal/beaker-notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Beaker notifications (vercel.json cron, hourly). Reads the last 3 days of CRM
 * activity per approved Beaker (stage moves, commissions, payouts) and writes
 * a deduped portal_notifications row for each, which the portal-notify cron
 * then delivers. Never sends anything itself.
 *
 * GET with `Authorization: Bearer $CRON_SECRET`: writes. Fails closed without it.
 * GET ?dry=1 with a staff session (or the cron secret): returns the plan, writes nothing.
 */

function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  const dry = new URL(req.url).searchParams.get('dry') === '1';
  const db = admin();
  if (dry) {
    if (!cronAuthorized(req) && !(await resolveStaff(req, db))) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  } else if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  try {
    const run = await runBeakerNotify(db, { dry });
    console.log('[beaker-notify] run', JSON.stringify({ dry, affiliates: run.affiliates, planned: run.planned.reduce((t, p) => t + p.rows.length, 0), written: run.written }));
    return NextResponse.json(run, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    reportError('[beaker-notify] run failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Run failed' }, { status: 500 });
  }
}
