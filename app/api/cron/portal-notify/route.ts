import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { admin, resolveStaff } from '@/lib/portal-server';
import { NotifyNotReady, runNotify } from '@/lib/portal/notify-run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Notification delivery (vercel.json cron, every 15 minutes).
 *
 * GET with `Authorization: Bearer $CRON_SECRET` (Vercel adds it): batches each
 *   client's undelivered portal_notifications into one email (and one text when
 *   they opted in), at most one of each per client per hour, texts only 8am–9pm
 *   in their timezone. Fails closed with 401 when CRON_SECRET is unset.
 * GET ?dry=1 with a staff session (or the cron secret): returns what would go
 *   out, rendered, and sends and stamps nothing. Optional &clientId=.
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
    const run = await runNotify(db, { dry, clientId: params.get('clientId') ?? undefined });
    const tally = { email: count(run.results.map((r) => r.email.outcome)), sms: count(run.results.map((r) => r.sms.outcome)) };
    console.log('[portal-notify] run', JSON.stringify({ dry, clients: run.clients, ...tally }));
    for (const r of run.results) {
      if (r.email.outcome === 'failed') reportError('[portal-notify] email failed', r.clientId, r.email.error);
      if (r.sms.outcome === 'failed') reportError('[portal-notify] sms failed', r.clientId, r.sms.error);
    }
    if (dry) return NextResponse.json({ dry: true, ...run, tally }, { headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({
      startedAt: run.startedAt,
      clients: run.clients,
      tally,
      results: run.results.map((r) => ({
        clientId: r.clientId,
        email: { outcome: r.email.outcome, reason: r.email.reason, rows: r.email.rows, error: r.email.error },
        sms: { outcome: r.sms.outcome, reason: r.sms.reason, rows: r.sms.rows, error: r.sms.error },
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reportError('[portal-notify] run failed', message);
    return NextResponse.json({ error: message }, { status: err instanceof NotifyNotReady ? 503 : 500 });
  }
}

function count(xs: string[]): Record<string, number> {
  return xs.reduce<Record<string, number>>((acc, x) => ((acc[x] = (acc[x] ?? 0) + 1), acc), {});
}
