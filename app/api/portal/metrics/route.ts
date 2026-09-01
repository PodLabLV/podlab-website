import { NextResponse } from 'next/server';
import { admin } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reporting ingest.
 *
 * portal_report_metrics has been empty since August on purpose — an honest
 * empty state beats a dashboard of zeroes. This is how real figures get in:
 * a cron or an ad-platform sync POSTs a period's metrics and they upsert by
 * (client, period, metric_key).
 *
 * Machine-to-machine, so it takes a shared secret rather than a user session,
 * and it FAILS CLOSED when that secret is unset — the same rule the Stripe
 * webhook follows. An open endpoint that writes a client's reported ROI is not
 * something to leave lying around.
 *
 * No ad-platform integration is included. Which platforms, which accounts, and
 * which attribution model are business decisions, and inventing them in code
 * would produce numbers nobody could defend.
 */

interface MetricInput {
  metricKey: string;
  label: string;
  value: string;
  sub?: string | null;
  sortOrder?: number;
}

interface Payload {
  clientId?: string;
  periodLabel?: string;   // "August 2026"
  periodStart?: string;   // "2026-08-01"
  source?: string;        // "meta-ads" | "manual" | ...
  metrics?: MetricInput[];
}

export async function POST(req: Request) {
  const secret = process.env.METRICS_INGEST_SECRET;
  if (!secret) {
    console.error('[portal] METRICS_INGEST_SECRET is not set — refusing ingest');
    return NextResponse.json({ error: 'Ingest not configured' }, { status: 500 });
  }

  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  // Constant-time compare, same as the Stripe route.
  if (provided.length !== secret.length) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
  if (diff !== 0) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: Payload;
  try {
    p = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (!p.clientId || !p.periodLabel || !Array.isArray(p.metrics) || p.metrics.length === 0) {
    return NextResponse.json(
      { error: 'clientId, periodLabel and at least one metric are required.' },
      { status: 400 },
    );
  }

  const db = admin();

  const { data: client } = await db
    .from('portal_clients')
    .select('id')
    .eq('id', p.clientId)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: 'Unknown client' }, { status: 404 });

  const rows = p.metrics.slice(0, 100).map((m, i) => ({
    client_id: p.clientId,
    period_label: p.periodLabel,
    period_start: p.periodStart ?? null,
    metric_key: m.metricKey,
    label: m.label,
    value: m.value,
    sub: m.sub ?? null,
    source: p.source ?? 'ingest',
    sort_order: m.sortOrder ?? i,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db
    .from('portal_report_metrics')
    .upsert(rows, { onConflict: 'client_id,period_label,metric_key' });

  if (error) {
    console.error('[portal] metrics ingest failed', error.message);
    return NextResponse.json({ error: 'Could not save those.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, written: rows.length });
}
