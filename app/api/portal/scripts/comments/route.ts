import { NextResponse } from 'next/server';
import { admin } from '@/lib/portal-server';
import { resolveActor, MAX_NOTE } from '@/lib/portal/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Script notes.
 *
 * POST  a client note on their own script, or a staff reply on any. A client
 *       note is saved quietly: the client batches notes and sends them with
 *       "Send notes to PodLab" (scripts/changes), which is the one Slack ping
 *       and CRM line. Eight notes are one revision request, not eight alerts.
 * PATCH staff resolve or reopen a note.
 */

interface Payload {
  versionId?: string;
  blockIndex?: number | null;
  quotedText?: string | null;
  body?: string;
  parentId?: string | null;
}

export async function POST(req: Request) {
  const db = admin();
  const { staff, caller } = await resolveActor(req, db);
  if (!staff && !caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: Payload;
  try {
    p = (await req.json()) as Payload;
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

  // Derive script and client from the version. Never trust them from the body.
  const { data: version } = await db
    .from('portal_script_versions')
    .select('id, script_id, client_id, version_no, body')
    .eq('id', p.versionId)
    .maybeSingle();
  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (caller && version.client_id !== caller.clientId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { data: script } = await db
    .from('portal_scripts')
    .select('id, status, current_version')
    .eq('id', version.script_id)
    .maybeSingle();

  if (caller) {
    if (script?.current_version !== version.version_no) {
      return NextResponse.json(
        { error: 'There is a newer version of this script. Refresh to see it.' },
        { status: 409 },
      );
    }
    if (['approved', 'shot', 'published'].includes((script?.status || '').toLowerCase())) {
      return NextResponse.json(
        { error: 'This version is approved and locked. Email info@podlablv.com to reopen it.' },
        { status: 409 },
      );
    }
  }

  if (p.parentId) {
    const { data: parent } = await db
      .from('portal_script_comments')
      .select('id, version_id')
      .eq('id', p.parentId)
      .maybeSingle();
    if (!parent || parent.version_id !== version.id) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
  }

  // Keep the anchor honest: the quote must come from the block it claims.
  const blockIndex = typeof p.blockIndex === 'number' && p.blockIndex >= 0 ? Math.floor(p.blockIndex) : null;
  let quoted = p.quotedText?.trim() ? p.quotedText.trim().slice(0, 240) : null;
  if (quoted && !version.body.includes(quoted)) quoted = null;
  if (blockIndex === null) quoted = null;

  const { data: comment, error } = await db
    .from('portal_script_comments')
    .insert({
      version_id: version.id,
      script_id: version.script_id,
      client_id: version.client_id,
      parent_id: p.parentId ?? null,
      block_index: blockIndex,
      quoted_text: quoted,
      body,
      author_name: caller?.displayName ?? staff?.name ?? 'PodLab',
      author_kind: caller ? 'client' : 'staff',
    })
    .select('*')
    .single();

  if (error) {
    console.error('[portal] script comment failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  return NextResponse.json({ comment });
}

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
    .from('portal_script_comments')
    .update({
      status: p.status,
      resolved_at: p.status === 'resolved' ? new Date().toISOString() : null,
    })
    .eq('id', p.id)
    .select('id, status')
    .maybeSingle();

  if (error) {
    console.error('[portal] script comment resolve failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ comment: data });
}
