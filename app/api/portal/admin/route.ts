import { NextResponse } from 'next/server';
import { admin, resolveStaff } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin reads.
 *
 * The portal reads through RLS as the client, and staff hold no membership
 * rows — so a staff account genuinely cannot see another client's data from the
 * browser, by design. Every admin read therefore comes through here on the
 * service role, after resolveStaff has proven who is asking.
 *
 * GET              → every client, with counts worth triaging on
 * GET ?clientId=x  → one client in full
 */

export async function GET(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const clientId = new URL(req.url).searchParams.get('clientId');

  // ── one client, in full ────────────────────────────────────────────
  if (clientId) {
    const [client, scripts, versions, comments, assets, assetVersions, invoices, phases, events] =
      await Promise.all([
        db.from('portal_clients').select('*').eq('id', clientId).maybeSingle(),
        db.from('portal_scripts').select('*').eq('client_id', clientId).order('sort_order'),
        db.from('portal_script_versions').select('*').eq('client_id', clientId)
          .order('version_no', { ascending: false }),
        db.from('portal_script_comments').select('*').eq('client_id', clientId)
          .eq('status', 'open').order('created_at'),
        db.from('portal_assets').select('*').eq('client_id', clientId).order('sort_order'),
        db.from('portal_asset_versions').select('*').eq('client_id', clientId)
          .order('version_no', { ascending: false }),
        db.from('portal_invoices').select('*').eq('client_id', clientId).order('issued_on', { ascending: false }),
        db.from('portal_delivery_phases').select('*').eq('client_id', clientId).order('sort_order'),
        db.from('portal_events').select('*').eq('client_id', clientId)
          .order('created_at', { ascending: false }).limit(50),
      ]);

    if (!client.data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      client: client.data,
      scripts: scripts.data ?? [],
      versions: versions.data ?? [],
      openComments: comments.data ?? [],
      assets: assets.data ?? [],
      assetVersions: assetVersions.data ?? [],
      invoices: invoices.data ?? [],
      phases: phases.data ?? [],
      events: events.data ?? [],
    });
  }

  // ── the roster ─────────────────────────────────────────────────────
  const { data: clients, error } = await db
    .from('portal_clients')
    .select('id, business_name, email, plan_label, stage, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[portal] admin roster failed', error.message);
    return NextResponse.json({ error: 'Could not load clients.' }, { status: 500 });
  }

  const ids = (clients ?? []).map((c) => c.id);
  if (ids.length === 0) return NextResponse.json({ clients: [], staff: staff.name });

  // Counted in two queries and folded in memory rather than N queries per
  // client. The roster is small now and this keeps it small later.
  const [waitingScripts, openInvoices] = await Promise.all([
    db.from('portal_scripts').select('client_id').in('client_id', ids).eq('status', 'in review'),
    db.from('portal_invoices').select('client_id, amount_cents, status').in('client_id', ids),
  ]);

  const waitingBy = new Map<string, number>();
  for (const r of waitingScripts.data ?? []) {
    waitingBy.set(r.client_id, (waitingBy.get(r.client_id) ?? 0) + 1);
  }

  const owedBy = new Map<string, number>();
  for (const r of openInvoices.data ?? []) {
    if ((r.status || '').toLowerCase() === 'paid') continue;
    owedBy.set(r.client_id, (owedBy.get(r.client_id) ?? 0) + (r.amount_cents ?? 0));
  }

  return NextResponse.json({
    staff: staff.name,
    clients: (clients ?? []).map((c) => ({
      ...c,
      scriptsAwaitingClient: waitingBy.get(c.id) ?? 0,
      outstandingCents: owedBy.get(c.id) ?? 0,
    })),
  });
}
