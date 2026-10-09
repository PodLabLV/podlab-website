import { admin } from '@/lib/portal-server';
import { driveFileId } from '@/lib/chapters';
import { fetchRange, verifyStream } from '@/lib/portal/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A long cut on a slow connection streams for a while; each seek is its own request.
export const maxDuration = 300;

/**
 * GET ?k=card|version&id=&exp=&sig= — stream a Drive-hosted cut so the portal's
 * own <video> player can play it (and read its clock for timestamped notes).
 *
 * The HMAC is the credential (minted by the production / deliverables routes
 * after their ownership checks); the Drive file id is looked up server-side from
 * the card or version, never taken from the URL. Range requests pass straight
 * through to Google, so seeking works without downloading the whole file.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const kind = q.get('k') ?? '';
  const id = q.get('id') ?? '';
  if (!verifyStream(kind, id, q.get('exp') ?? '', q.get('sig') ?? '')) return new Response('Link expired. Reload the page.', { status: 403 });

  const db = admin();
  let link: string | null = null;
  if (kind === 'card') {
    const { data } = await db.schema('crm').from('content_cards').select('video_url').eq('id', id).maybeSingle();
    link = data?.video_url ?? null;
  } else {
    const { data } = await db.from('portal_asset_versions').select('external_url').eq('id', id).maybeSingle();
    link = data?.external_url ?? null;
  }
  const fileId = driveFileId(link);
  if (!fileId) return new Response('Not found', { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetchRange(fileId, req.headers.get('range'));
  } catch (err) {
    console.error('[portal] stream auth failed', err instanceof Error ? err.message : err);
    return new Response('Not available', { status: 502 });
  }
  // 403/404 here usually means the cut lives in a drive the portal account can't
  // see; the player falls back to opening it on Drive.
  if (!upstream.ok || !upstream.body) return new Response('Not available', { status: upstream.status === 416 ? 416 : 404 });

  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') ?? 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  for (const h of ['content-length', 'content-range']) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
