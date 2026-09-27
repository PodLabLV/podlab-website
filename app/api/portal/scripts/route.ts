import { NextResponse } from 'next/server';
import { admin, resolveStaff, recordEvent } from '@/lib/portal-server';
import { toBlocks, wordCount, runtimeSeconds, reanchor } from '@/lib/portal/scripts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Scripts — staff writes.
 *
 * POST creates a script with version 1, or adds a new version to an existing
 * script. This is also the write path for the generator skills: vsllab,
 * hooklab, scriptbuilder, and realtorlab-pack already produce this content and
 * drop it into files. Posting it here puts it in front of the client with
 * version history and inline comments instead of a PDF someone has to email.
 *
 * Staff only. A client has no write path to scripts at all — they comment and
 * they approve, both through their own routes.
 */

interface Payload {
  clientId?: string;
  scriptId?: string;       // present = new version of an existing script
  title?: string;
  lab?: string;
  kind?: string;
  source?: string;
  trialGroup?: string;
  body?: string;
  note?: string;
  shootDate?: string;
}

export async function POST(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: Payload;
  try {
    p = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const body = (p.body || '').trim();
  if (!body) return NextResponse.json({ error: 'A script needs a body.' }, { status: 400 });

  // ── new version of an existing script ──────────────────────────────
  if (p.scriptId) {
    const { data: script } = await db
      .from('portal_scripts')
      .select('id, client_id, title, current_version')
      .eq('id', p.scriptId)
      .maybeSingle();

    if (!script) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const nextNo = (script.current_version ?? 1) + 1;

    const { data: version, error: vErr } = await db
      .from('portal_script_versions')
      .insert({
        script_id: script.id,
        client_id: script.client_id,
        version_no: nextNo,
        body,
        word_count: wordCount(body),
        runtime_seconds: runtimeSeconds(body),
        author_name: staff.name,
        author_kind: 'podlab',
        note: p.note ?? null,
      })
      .select('id, version_no')
      .maybeSingle();

    if (vErr || !version) {
      console.error('[portal] version insert failed', vErr?.message);
      return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
    }

    await db
      .from('portal_scripts')
      .update({ current_version: nextNo, status: 'in review', updated_at: new Date().toISOString() })
      .eq('id', script.id);

    // Carry open notes forward. A note whose quoted line survived gets
    // re-anchored to wherever it now sits; one whose line is gone is marked
    // orphaned so a human sees it, rather than disappearing with the rewrite.
    await carryCommentsForward(db, script.id, version.id, body);

    await recordEvent(db, {
      clientId: script.client_id,
      module: 'scripts',
      kind: 'script.version_added',
      title: `${script.title} — v${nextNo} ready for review`,
      detail: p.note ?? null,
      actorName: staff.name,
      actorKind: 'staff',
      refId: script.id,
      slack: false,
    });

    return NextResponse.json({ scriptId: script.id, versionId: version.id, versionNo: nextNo });
  }

  // ── brand new script ───────────────────────────────────────────────
  if (!p.clientId || !p.title) {
    return NextResponse.json({ error: 'clientId and title are required.' }, { status: 400 });
  }

  const { data: script, error: sErr } = await db
    .from('portal_scripts')
    .insert({
      client_id: p.clientId,
      title: p.title,
      lab: p.lab ?? null,
      kind: p.kind ?? 'vsl',
      source: p.source ?? 'manual',
      trial_group: p.trialGroup ?? null,
      shoot_date: p.shootDate ?? null,
      status: 'in review',
      current_version: 1,
    })
    .select('id, client_id, title')
    .maybeSingle();

  if (sErr || !script) {
    console.error('[portal] script insert failed', sErr?.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  const { data: version, error: vErr } = await db
    .from('portal_script_versions')
    .insert({
      script_id: script.id,
      client_id: script.client_id,
      version_no: 1,
      body,
      word_count: wordCount(body),
      runtime_seconds: runtimeSeconds(body),
      author_name: staff.name,
      author_kind: p.source && p.source !== 'manual' ? 'ai' : 'podlab',
      note: p.note ?? null,
    })
    .select('id')
    .maybeSingle();

  if (vErr) {
    console.error('[portal] first version insert failed', vErr.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  await recordEvent(db, {
    clientId: script.client_id,
    module: 'scripts',
    kind: 'script.created',
    title: `New script ready for review — ${script.title}`,
    actorName: staff.name,
    actorKind: 'staff',
    refId: script.id,
    slack: false,
  });

  return NextResponse.json({ scriptId: script.id, versionId: version?.id, versionNo: 1 });
}

/**
 * Move open comments from the previous version onto the new one.
 *
 * Deliberately not a database cascade: whether a note still applies is a
 * question about the text, and only the app knows how the text changed.
 */
async function carryCommentsForward(
  db: ReturnType<typeof admin>,
  scriptId: string,
  newVersionId: string,
  newBody: string,
): Promise<void> {
  const { data: open } = await db
    .from('portal_script_comments')
    .select('id, quoted_text, body, author_name, author_kind, client_id, block_index')
    .eq('script_id', scriptId)
    .eq('status', 'open');

  if (!open?.length) return;

  const blocks = toBlocks(newBody);

  const rows = open.map((c) => {
    const idx = reanchor(c.quoted_text, blocks);
    return {
      version_id: newVersionId,
      script_id: scriptId,
      client_id: c.client_id,
      block_index: idx,
      quoted_text: c.quoted_text,
      body: c.body,
      author_name: c.author_name,
      author_kind: c.author_kind,
      status: 'open',
      orphaned: idx === null,
    };
  });

  const { error } = await db.from('portal_script_comments').insert(rows);
  if (error) console.error('[portal] carry-forward failed', error.message);
}
