import { NextResponse } from 'next/server';
import { admin } from '@/lib/portal-server';
import { loadBrand } from '@/lib/portal/brand-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET ?token= — the editors' read-only brand kit. No login: the token is the
 * credential (144 random bits, staff can rotate it). Files come back as signed
 * links that expire in an hour, so a forwarded page goes stale on its own.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const db = admin();
  const { data: kit } = await db.from('portal_brand_kits').select('client_id').eq('share_token', token).maybeSingle();
  if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [{ data: client }, brand] = await Promise.all([
    db.from('portal_clients').select('business_name').eq('id', kit.client_id).maybeSingle(),
    loadBrand(db, kit.client_id),
  ]);
  return NextResponse.json(
    { businessName: client?.business_name ?? 'Client', brand },
    { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } },
  );
}
