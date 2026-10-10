import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/portal-server';
import {
  resolvePublisher,
  resolveClientId,
  recordActivity,
  nextVersionNo,
} from '@/lib/portal/server';
import { SCRIPT_STATUSES, toBlocks, wordCount, runtimeSeconds, reanchor } from '@/lib/portal/scripts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Scripts: PodLab writes.
 *
 * POST  creates a script with v1, or (with scriptId) adds the next version.
 *       This is the publish path for the Lab skills: vsllab, hooklab and
 *       realtorlab-pack already produce the text, this puts it in front of the
 *       client with version history and line-level notes.
 * PATCH moves a script along after approval (shot, published) or edits its
 *       metadata. Never touches a version: versions are immutable.
 *
 * Staff or PORTAL_PUBLISH_KEY only. Clients read through RLS, and comment and
 * approve through their own routes.
 */

interface PostPayload {
  clientId?: string;
  clientEmail?: string;
  scriptId?: string;
  title?: string;
  lab?: string;
  kind?: string;
  source?: string;
  trialGroup?: string;
  shootDate?: string;
  body?: string;
  note?: string;
}

const MAX_BODY = 60_000;

export async function POST(req: Request) {
  const db = admin();
  const publisher = await resolvePublisher(req, db);
  if (!publisher) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: PostPayload;
  try {
    p = (await req.json()) as PostPayload;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const body = (p.body || '').trim();
  if (!body) return NextResponse.json({ error: 'A script needs a body.' }, { status: 400 });
  if (body.length > MAX_BODY) return NextResponse.json({ error: 'That script is too long.' }, { status: 400 });
  const note = p.note?.trim() ? p.note.trim().slice(0, 1000) : null;
  const authorKind = publisher.via === 'key' || (p.source && p.source !== 'manual') ? 'ai' : 'podlab';

  // ── next version of an existing script ─────────────────────────────
  if (p.scriptId) {
    const { data: script } = await db
      .from('portal_scripts')
      .select('id, client_id, title, current_version')
      .eq('id', p.scriptId)
      .maybeSingle();
    if (!script) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const versionNo = await nextVersionNo(db, 'portal_script_versions', 'script_id', script.id);
    const { data: version, error: vErr } = await db
      .from('portal_script_versions')
      .insert({
        script_id: script.id,
        client_id: script.client_id,
        version_no: versionNo,
        body,
        word_count: wordCount(body),
        runtime_seconds: runtimeSeconds(body),
        author_name: publisher.name,
        author_kind: authorKind,
        note,
      })
      .select('id, version_no')
      .single();

    if (vErr || !version) {
      // 23505 = someone else published the same version number a moment ago.
      const conflict = vErr?.code === '23505';
      reportError('[portal] script version insert failed', vErr?.message);
      return NextResponse.json(
        { error: conflict ? 'Another version was just published. Retry.' : 'Could not save that.' },
        { status: conflict ? 409 : 500 },
      );
    }

    const { data: previous } = await db
      .from('portal_script_versions')
      .select('id')
      .eq('script_id', script.id)
      .eq('version_no', script.current_version)
      .maybeSingle();

    await db
      .from('portal_scripts')
      .update({ current_version: versionNo, status: 'in review', updated_at: new Date().toISOString() })
      .eq('id', script.id);

    if (previous) await carryNotesForward(db, script.id, previous.id, version.id, body);

    await recordActivity(db, script.client_id, 'update', `Script v${versionNo} ready for your review: ${script.title}`);

    return NextResponse.json({ scriptId: script.id, versionId: version.id, versionNo });
  }

  // ── brand new script ───────────────────────────────────────────────
  const title = (p.title || '').trim();
  const clientId = await resolveClientId(db, p);
  if (!clientId || !title) {
    return NextResponse.json(
      { error: 'A known clientId (or clientEmail) and a title are required.' },
      { status: 400 },
    );
  }

  const { data: script, error: sErr } = await db
    .from('portal_scripts')
    .insert({
      client_id: clientId,
      title: title.slice(0, 200),
      lab: p.lab ?? null,
      kind: p.kind ?? 'vsl',
      source: p.source ?? 'manual',
      trial_group: p.trialGroup ?? null,
      shoot_date: p.shootDate ?? null,
      status: 'in review',
      current_version: 1,
    })
    .select('id, client_id, title')
    .single();

  if (sErr || !script) {
    reportError('[portal] script insert failed', sErr?.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  const { data: version, error: vErr } = await db
    .from('portal_script_versions')
    .insert({
      script_id: script.id,
      client_id: clientId,
      version_no: 1,
      body,
      word_count: wordCount(body),
      runtime_seconds: runtimeSeconds(body),
      author_name: publisher.name,
      author_kind: authorKind,
      note,
    })
    .select('id')
    .single();

  if (vErr || !version) {
    // Don't leave a script with no text behind.
    await db.from('portal_scripts').delete().eq('id', script.id);
    reportError('[portal] first version insert failed', vErr?.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  await recordActivity(db, clientId, 'update', `New script ready for your review: ${script.title}`);

  return NextResponse.json({ scriptId: script.id, versionId: version.id, versionNo: 1 });
}

interface PatchPayload {
  scriptId?: string;
  status?: string;
  title?: string;
  shootDate?: string | null;
  sortOrder?: number;
}

export async function PATCH(req: Request) {
  const db = admin();
  const publisher = await resolvePublisher(req, db);
  if (!publisher) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: PatchPayload;
  try {
    p = (await req.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!p.scriptId) return NextResponse.json({ error: 'scriptId is required.' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (p.status !== undefined) {
    if (!(SCRIPT_STATUSES as readonly string[]).includes(p.status)) {
      return NextResponse.json({ error: `status must be one of ${SCRIPT_STATUSES.join(', ')}` }, { status: 400 });
    }
    // "approved" is the client's word to give, with evidence. Staff can't fake it.
    if (p.status === 'approved') {
      return NextResponse.json({ error: 'Only the client can approve a script.' }, { status: 400 });
    }
    patch.status = p.status;
  }
  if (p.title !== undefined) patch.title = String(p.title).trim().slice(0, 200);
  if (p.shootDate !== undefined) patch.shoot_date = p.shootDate || null;
  if (typeof p.sortOrder === 'number') patch.sort_order = p.sortOrder;

  const { data, error } = await db
    .from('portal_scripts')
    .update(patch)
    .eq('id', p.scriptId)
    .select('id, client_id, title, status')
    .maybeSingle();

  if (error) {
    reportError('[portal] script patch failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (p.status === 'in review') await recordActivity(db, data.client_id, 'update', `New script ready for your review: ${data.title}`);
  if (p.status === 'shot') await recordActivity(db, data.client_id, 'update', `Filmed: ${data.title}`);
  if (p.status === 'published') await recordActivity(db, data.client_id, 'deliverable', `Live: ${data.title}`);

  return NextResponse.json({ script: data });
}

/**
 * Move the previous version's open notes onto the new one.
 *
 * #21 copied every open note on the script and left the originals open, so each
 * new version re-copied all earlier copies and notes multiplied. Here only the
 * previous version's notes move, and the originals are marked "carried".
 */
async function carryNotesForward(
  db: ReturnType<typeof admin>,
  scriptId: string,
  fromVersionId: string,
  toVersionId: string,
  newBody: string,
): Promise<void> {
  const { data: open } = await db
    .from('portal_script_comments')
    .select('id, client_id, quoted_text, body, author_name, author_kind, block_index, created_at')
    .eq('version_id', fromVersionId)
    .eq('status', 'open')
    .is('parent_id', null);

  if (!open?.length) return;

  const blocks = toBlocks(newBody);
  const rows = open.map((c) => {
    // A note on the whole script has no quote and stays a whole-script note.
    const idx = c.quoted_text ? reanchor(c.quoted_text, blocks) : null;
    return {
      version_id: toVersionId,
      script_id: scriptId,
      client_id: c.client_id,
      block_index: idx,
      quoted_text: c.quoted_text,
      body: c.body,
      author_name: c.author_name,
      author_kind: c.author_kind,
      status: 'open',
      orphaned: Boolean(c.quoted_text) && idx === null,
      // Keep the original time so a carried note doesn't read as newly unsent.
      created_at: c.created_at,
    };
  });

  const { error } = await db.from('portal_script_comments').insert(rows);
  if (error) {
    reportError('[portal] carry-forward failed', error.message);
    return;
  }
  await db
    .from('portal_script_comments')
    .update({ status: 'carried' })
    .in('id', open.map((c) => c.id));
}
