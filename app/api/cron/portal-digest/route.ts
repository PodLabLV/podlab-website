import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { admin, resolveStaff } from '@/lib/portal-server';
import { DigestNotReady, runDigest } from '@/lib/portal/digest-run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily client digest (vercel.json cron, 15:00 UTC).
 *
 * GET with `Authorization: Bearer $CRON_SECRET` (Vercel adds it): runs the
 *   digest and sends. Fails closed with 401 when CRON_SECRET is unset.
 * GET ?dry=1 with a staff session token: returns the would-be emails as JSON,
 *   sends nothing and saves nothing. Optional &clientId= previews one client.
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
    const staff = await resolveStaff(req, db);
    if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  } else if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    const run = await runDigest(db, { dry, clientId: params.get('clientId') ?? undefined });
    const tally = run.results.reduce<Record<string, number>>((acc, r) => ((acc[r.outcome] = (acc[r.outcome] ?? 0) + 1), acc), {});
    console.log('[digest] run', JSON.stringify({ dry, eligible: run.eligible, skipped: run.skipped, ...tally }));
    for (const r of run.results) if (r.outcome === 'failed') console.error('[digest] failed', r.clientId, r.error);

    if (dry) {
      return NextResponse.json(
        { dry: true, ...run, emails: run.results.filter((r) => r.outcome === 'would-send') },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    // Strip the per-client detail from the cron response; the logs have it.
    return NextResponse.json({
      startedAt: run.startedAt,
      eligible: run.eligible,
      skipped: run.skipped,
      tally,
      results: run.results.map(({ clientId, outcome, subject, error }) => ({ clientId, outcome, subject, error })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[digest] run failed', message);
    return NextResponse.json({ error: message }, { status: err instanceof DigestNotReady ? 503 : 500 });
  }
}
