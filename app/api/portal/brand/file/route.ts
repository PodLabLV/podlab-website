import { reportError } from '@/lib/alerts';
import { admin } from '@/lib/portal-server';
import { MAX_PROXY_BYTES } from '@/lib/portal/brand';
import { driveIdOf, fetchContent, verifyPreview } from '@/lib/portal/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET ?id=<asset>&v=file|thumb&exp=&sig=[&dl=1] — a Drive-backed brand file or
 * its thumbnail, streamed from Google. The HMAC (minted by loadBrand after an
 * ownership check, valid an hour) is the credential, because <img> and <video>
 * can't send a bearer token.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const id = q.get('id') ?? '';
  const variant = q.get('v') === 'thumb' ? 'thumb' : 'file';
  if (!verifyPreview(id, variant, q.get('exp') ?? '', q.get('sig') ?? '')) return new Response('Link expired. Reload the page.', { status: 403 });

  const db = admin();
  const { data: row } = await db
    .from('portal_brand_assets')
    .select('storage_path, filename, mime_type, size_bytes')
    .eq('id', id)
    .is('removed_at', null)
    .maybeSingle();
  const driveId = driveIdOf(row?.storage_path ?? null);
  if (!row || !driveId) return new Response('Not found', { status: 404 });
  if (variant === 'file' && (row.size_bytes ?? 0) > MAX_PROXY_BYTES) return new Response('Too big to download here. Open it in Drive.', { status: 413 });

  let upstream: Response | null = null;
  try {
    upstream = await fetchContent(driveId, variant);
  } catch (err) {
    reportError('[portal] brand file proxy failed', err instanceof Error ? err.message : err);
  }
  if (!upstream?.body) return new Response('Not available yet', { status: 404 });

  const name = (row.filename ?? 'file').replace(/["\r\n]/g, '');
  return new Response(upstream.body, {
    headers: {
      'Content-Type': variant === 'thumb' ? upstream.headers.get('content-type') ?? 'image/jpeg' : row.mime_type || 'application/octet-stream',
      'Content-Disposition': `${q.get('dl') ? 'attachment' : 'inline'}; filename="${name}"`,
      'Cache-Control': 'private, max-age=600',
      // Client SVGs render on our origin: no scripts, no navigation, no sniffing.
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      ...(upstream.headers.get('content-length') ? { 'Content-Length': upstream.headers.get('content-length')! } : {}),
    },
  });
}
