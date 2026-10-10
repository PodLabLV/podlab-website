import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/portal-server';
import { resolveActor, MAX_NOTE } from '@/lib/portal/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Notes on a deliverable version, optionally pinned to a moment in a video.
 *
 * A client note is saved quietly; "Send notes to PodLab" (PATCH
 * /api/portal/deliverables) is the single Slack ping and CRM line.
 */
export async function POST(req: Request) {
  const db = admin();
  const { staff, caller } = await resolveActor(req, db);
  if (!staff && !caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

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
  if (body.length > MAX_NOTE) {
    return NextResponse.json({ error: `Keep it under ${MAX_NOTE} characters.` }, { status: 400 });
  }

  const { data: version } = await db
    .from('portal_asset_versions')
    .select('id, asset_id, client_id, version_no')
    .eq('id', p.versionId)
    .maybeSingle();
  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (caller && version.client_id !== caller.clientId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  if (caller) {
    const { data: asset } = await db
      .from('portal_assets')
      .select('status, current_version')
      .eq('id', version.asset_id)
      .maybeSingle();
    if (asset?.current_version !== version.version_no) {
      return NextResponse.json({ error: 'There is a newer version. Refresh to see it.' }, { status: 409 });
    }
    if ((asset?.status || '').toLowerCase() === 'approved') {
      return NextResponse.json(
        { error: 'This version is approved. Email info@podlablv.com to reopen it.' },
        { status: 409 },
      );
    }
  }

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
      author_name: caller?.displayName ?? staff?.name ?? 'PodLab',
      author_kind: caller ? 'client' : 'staff',
    })
    .select('*')
    .single();

  if (error) {
    reportError('[portal] asset comment failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
  return NextResponse.json({ comment });
}

/** Staff resolve or reopen a note. */
export async function PATCH(req: Request) {
  const db = admin();
  const { staff } = await resolveActor(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: { id?: string; status?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!p.id || !['open', 'resolved'].includes(p.status || '')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { data, error } = await db
    .from('portal_asset_comments')
    .update({ status: p.status, resolved_at: p.status === 'resolved' ? new Date().toISOString() : null })
    .eq('id', p.id)
    .select('id, status')
    .maybeSingle();
  if (error) {
    reportError('[portal] asset comment resolve failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ comment: data });
}
