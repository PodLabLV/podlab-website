import { NextResponse } from 'next/server';
import { admin, isStaff, viewAsId } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Staff "view as client": the portal's direct database reads (usePortal,
 * scripts, deliverables) normally run as the client under RLS. In view-as mode
 * the browser sends them here instead, and they run with the service role but
 * pinned to the previewed client: every query gets client_id=eq.<id> (id=eq.
 * for portal_clients) added, PostgREST ANDs it with whatever else was asked,
 * and only these read-only portal tables are allowed.
 *
 * GET ?t=<table>&q=<the original PostgREST query string>
 */
const TABLES = new Set([
  'portal_clients',
  'portal_assets',
  'portal_projects',
  'portal_invoices',
  'portal_activity',
  'portal_report_metrics',
  'portal_comments',
  'portal_action_items',
  'portal_intake_items',
  'portal_intake_answers',
  'portal_delivery_phases',
  'portal_client_products',
  'portal_client_elements',
  'portal_scripts',
  'portal_script_versions',
  'portal_script_comments',
  'portal_script_approvals',
  'portal_asset_versions',
  'portal_asset_comments',
]);

export async function GET(req: Request) {
  const db = admin();
  const clientId = viewAsId(req);
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!clientId || !token) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
  const { data } = await db.auth.getUser(token);
  if (!data?.user || !(await isStaff(db, data.user.email))) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

  const u = new URL(req.url);
  const table = u.searchParams.get('t') ?? '';
  if (!TABLES.has(table)) return NextResponse.json({ message: 'Not available in view-as mode' }, { status: 400 });
  const q = new URLSearchParams(u.searchParams.get('q') ?? '');
  q.append(table === 'portal_clients' ? 'id' : 'client_id', `eq.${clientId}`);

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}` };
  for (const h of ['accept', 'range', 'range-unit', 'prefer']) {
    const v = req.headers.get(h);
    if (v) headers[h] = v;
  }
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${q.toString()}`, { headers, cache: 'no-store' });
  const out = new Headers({ 'Content-Type': res.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' });
  const range = res.headers.get('content-range');
  if (range) out.set('Content-Range', range);
  return new Response(await res.text(), { status: res.status, headers: out });
}
