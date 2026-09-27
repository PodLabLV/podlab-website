import { NextResponse } from 'next/server';
import { admin, resolveCaller, resolveStaff, recordEvent } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Script comments.
 *
 * Both sides post here: the client leaving a note, and staff replying. Clients
 * have no write policy on the table, so this route holding the service role is
 * the only path in — which is also where Slack, the event log, and the CRM
 * timeline get written, so "record it and tell the team" cannot half-happen.
 */

interface Payload {
  versionId?: string;
  scriptId?: string;
  blockIndex?: number | null;
  quotedText?: string | null;
  body?: string;
  parentId?: string | null;
}

export async function POST(req: Request) {
  const db = admin();

  // Either a client on their own account, or staff acting on any account.
  const caller = await resolveCaller(req, db);
  const staff = caller ? null : await resolveStaff(req, db);
  if (!caller && !staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

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
  if (body.length > 4000) {
    return NextResponse.json({ error: 'That note is too long.' }, { status: 400 });
  }

  // Resolve the version server-side. Never trust the client_id or script_id the
  // browser sends — derive both from the version it is commenting on.
  const { data: version } = await db
    .from('portal_script_versions')
    .select('id, script_id, client_id')
    .eq('id', p.versionId)
    .maybeSingle();

  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // A client may only comment on their own script.
  if (caller && version.client_id !== caller.clientId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const authorName = caller?.displayName ?? staff?.name ?? 'PodLab';
  const authorKind = caller ? 'client' : 'staff';

  const { data: comment, error } = await db
    .from('portal_script_comments')
    .insert({
      version_id: version.id,
      script_id: version.script_id,
      client_id: version.client_id,
      parent_id: p.parentId ?? null,
      block_index: typeof p.blockIndex === 'number' ? p.blockIndex : null,
      quoted_text: p.quotedText ?? null,
      body,
      author_name: authorName,
      author_kind: authorKind,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[portal] script comment failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  const { data: script } = await db
    .from('portal_scripts')
    .select('title, status')
    .eq('id', version.script_id)
    .maybeSingle();

  // A client note means we are now the blocker — move the script and say so.
  if (authorKind === 'client' && script?.status === 'in review') {
    await db
      .from('portal_scripts')
      .update({ status: 'changes requested', updated_at: new Date().toISOString() })
      .eq('id', version.script_id);
  }

  await recordEvent(db, {
    clientId: version.client_id,
    module: 'scripts',
    kind: 'script.comment_added',
    title: `Note on ${script?.title ?? 'a script'}`,
    detail: body.slice(0, 180),
    actorName: authorName,
    actorKind: authorKind,
    refId: version.script_id,
    // Only ping the team when the CLIENT writes. Our own replies are not news.
    slack: authorKind === 'client',
  });

  return NextResponse.json({ comment });
}

/** Resolve a note. Staff only — a client cannot close their own feedback. */
export async function PATCH(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
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
    console.error('[portal] comment resolve failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ comment: data });
}
