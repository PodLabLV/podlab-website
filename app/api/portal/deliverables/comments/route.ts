import { NextResponse } from 'next/server';
import { admin, resolveCaller, resolveStaff, recordEvent } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Notes on a deliverable, optionally pinned to a timestamp.
 *
 * time_seconds is what turns "the cut at 0:42 is long" from prose into
 * something an editor can jump straight to.
 */

export async function POST(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  const staff = caller ? null : await resolveStaff(req, db);
  if (!caller && !staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: { versionId?: string; timeSeconds?: number | null; body?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const body = (p.body || '').trim();
  if (!body || !p.versionId) {
    return NextResponse.json({ error: 'A note needs a version and some text.' }, { status: 400 });
  }
  if (body.length > 4000) {
    return NextResponse.json({ error: 'That note is too long.' }, { status: 400 });
  }

  // Derive asset and client from the version — never trust them from the body.
  const { data: version } = await db
    .from('portal_asset_versions')
    .select('id, asset_id, client_id')
    .eq('id', p.versionId)
    .maybeSingle();

  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (caller && version.client_id !== caller.clientId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const authorName = caller?.displayName ?? staff?.name ?? 'PodLab';
  const authorKind = caller ? 'client' : 'staff';

  const time =
    typeof p.timeSeconds === 'number' && Number.isFinite(p.timeSeconds) && p.timeSeconds >= 0
      ? Math.round(p.timeSeconds * 10) / 10
      : null;

  const { data: comment, error } = await db
    .from('portal_asset_comments')
    .insert({
      version_id: version.id,
      asset_id: version.asset_id,
      client_id: version.client_id,
      time_seconds: time,
      body,
      author_name: authorName,
      author_kind: authorKind,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[portal] asset comment failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  const { data: asset } = await db
    .from('portal_assets')
    .select('title')
    .eq('id', version.asset_id)
    .maybeSingle();

  await recordEvent(db, {
    clientId: version.client_id,
    module: 'deliverables',
    kind: 'deliverable.comment_added',
    title: `Note on ${asset?.title ?? 'a deliverable'}`,
    detail: time !== null ? `At ${time}s — ${body.slice(0, 160)}` : body.slice(0, 180),
    actorName: authorName,
    actorKind: authorKind,
    refId: version.asset_id,
    slack: authorKind === 'client',
  });

  return NextResponse.json({ comment });
}
