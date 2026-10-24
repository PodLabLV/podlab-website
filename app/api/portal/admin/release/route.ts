import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { admin, resolveStaff, notifySlack } from '@/lib/portal-server';
import { resolvePublisher, resolveClientId, recordActivity, trimTo, MAX_NOTE } from '@/lib/portal/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The "Awaiting Hiram" gate. The automation publishes scripts and deliverables
 * with held: true (held_for = 'hiram'); RLS and every client-facing server read
 * hide them until staff decides here.
 *
 * POST { type: 'script'|'asset', id, decision: 'release'|'changes', note? } — staff only.
 *   release  clears the hold, stamps who/when, puts it in the client's review.
 *   changes  adds an INTERNAL note on the current version (the client never
 *            sees it), keeps it held, and flips status to 'changes requested'
 *            so the automation revises it.
 *
 * GET ?clientId= (or ?clientEmail=) — staff or PORTAL_PUBLISH_KEY. Held items
 *   for one client, with Hiram's open internal notes, so the automation can
 *   pick up what to revise.
 */

type Kind = 'script' | 'asset';

const TABLES = {
  script: { parent: 'portal_scripts', versions: 'portal_script_versions', comments: 'portal_script_comments', fk: 'script_id' },
  asset: { parent: 'portal_assets', versions: 'portal_asset_versions', comments: 'portal_asset_comments', fk: 'asset_id' },
} as const;

export async function POST(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: { type?: string; id?: string; decision?: string; note?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if ((p.type !== 'script' && p.type !== 'asset') || !p.id || !['release', 'changes'].includes(p.decision || '')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const kind = p.type as Kind;
  const t = TABLES[kind];

  const { data: row, error: rErr } = await db
    .from(t.parent)
    .select('id, client_id, title, status, current_version, held_for')
    .eq('id', p.id)
    .maybeSingle();
  if (rErr) {
    reportError('[portal] release lookup failed', rErr.message);
    return NextResponse.json({ error: 'Could not load that.' }, { status: 500 });
  }
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!row.held_for) {
    return NextResponse.json({ error: 'That one is not held; the client can already see it.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const label = `${row.title} v${row.current_version}`;

  // ── release: the client sees it from now on
  if (p.decision === 'release') {
    const { data: released, error } = await db
      .from(t.parent)
      .update({
        held_for: null,
        held_released_at: now,
        held_released_by: staff.name,
        status: 'in review',
        updated_at: now,
      })
      .eq('id', row.id)
      .not('held_for', 'is', null)
      .select('id')
      .maybeSingle();
    if (error) {
      reportError('[portal] release failed', error.message);
      return NextResponse.json({ error: 'Could not release that.' }, { status: 500 });
    }
    if (!released) return NextResponse.json({ error: 'Someone already released that.' }, { status: 409 });

    // Hiram's internal notes did their job; they stay internal, just closed.
    const { error: cErr } = await db
      .from(t.comments)
      .update({ status: 'resolved', resolved_at: now })
      .eq(t.fk, row.id)
      .eq('internal', true)
      .eq('status', 'open');
    if (cErr) reportError('[portal] release note close failed', cErr.message);

    await recordActivity(
      db,
      row.client_id,
      kind === 'script' ? 'update' : 'deliverable',
      kind === 'script' ? `New script ready for your review: ${row.title}` : `${label} is ready for your review`,
    );
    return NextResponse.json({ status: 'in review', released: true });
  }

  // ── changes: an internal note for the automation, still held
  const note = (p.note || '').trim();
  if (!note) return NextResponse.json({ error: 'Say what to change.' }, { status: 400 });
  if (note.length > MAX_NOTE) return NextResponse.json({ error: `Keep it under ${MAX_NOTE} characters.` }, { status: 400 });

  const { data: version } = await db
    .from(t.versions)
    .select('id')
    .eq(t.fk, row.id)
    .eq('version_no', row.current_version)
    .maybeSingle();
  if (!version) return NextResponse.json({ error: 'There is no version to note.' }, { status: 409 });

  const comment: Record<string, unknown> = {
    version_id: version.id,
    [t.fk]: row.id,
    client_id: row.client_id,
    body: note,
    author_name: staff.name,
    author_kind: 'staff',
    status: 'open',
    internal: true,
  };
  if (kind === 'script') {
    comment.block_index = null;
    comment.orphaned = false;
  }
  const { error: iErr } = await db.from(t.comments).insert(comment);
  if (iErr) {
    reportError('[portal] internal note failed', iErr.message);
    return NextResponse.json({ error: 'Could not save that note.' }, { status: 500 });
  }

  const { error: uErr } = await db
    .from(t.parent)
    .update({ status: 'changes requested', changes_requested_at: now, updated_at: now })
    .eq('id', row.id);
  if (uErr) {
    reportError('[portal] held changes failed', uErr.message);
    return NextResponse.json({ error: 'Note saved, but could not flag it for revision.' }, { status: 500 });
  }

  const { data: client } = await db.from('portal_clients').select('business_name').eq('id', row.client_id).maybeSingle();
  await notifySlack(
    `*Hiram requested changes* (held, client can't see it) — ${client?.business_name ?? 'Client'}\n*${label}*\n• ${trimTo(note, 600)}`,
    'revisions',
  );
  return NextResponse.json({ status: 'changes requested' });
}

export async function GET(req: Request) {
  const db = admin();
  const publisher = await resolvePublisher(req, db);
  if (!publisher) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const u = new URL(req.url).searchParams;
  const clientId = await resolveClientId(db, {
    clientId: u.get('clientId') ?? undefined,
    clientEmail: u.get('clientEmail') ?? undefined,
  });
  if (!clientId) return NextResponse.json({ error: 'A known clientId (or clientEmail) is required.' }, { status: 400 });

  try {
    const [s, a] = await Promise.all([
      db.from('portal_scripts').select('id, title, status, current_version, changes_requested_at').eq('client_id', clientId).not('held_for', 'is', null),
      db.from('portal_assets').select('id, title, status, current_version, changes_requested_at').eq('client_id', clientId).not('held_for', 'is', null),
    ]);
    if (s.error) throw new Error(`scripts: ${s.error.message}`);
    if (a.error) throw new Error(`assets: ${a.error.message}`);
    type Row = { id: string; title: string; status: string | null; current_version: number | null; changes_requested_at: string | null };
    const scripts = (s.data ?? []) as Row[];
    const assets = (a.data ?? []) as Row[];

    const [sn, an] = await Promise.all([
      scripts.length
        ? db.from('portal_script_comments').select('script_id, body, author_name, created_at').in('script_id', scripts.map((r) => r.id)).eq('internal', true).eq('status', 'open').order('created_at')
        : Promise.resolve({ data: [], error: null }),
      assets.length
        ? db.from('portal_asset_comments').select('asset_id, body, author_name, created_at').in('asset_id', assets.map((r) => r.id)).eq('internal', true).eq('status', 'open').order('created_at')
        : Promise.resolve({ data: [], error: null }),
    ]);
    const notesFor = (rows: Array<Record<string, unknown>> | null, fk: string, id: string) =>
      (rows ?? []).filter((n) => n[fk] === id).map((n) => ({ body: n.body as string, author: n.author_name as string, at: n.created_at as string }));

    const items = [
      ...scripts.map((r) => ({ id: r.id, type: 'script' as const, title: r.title, status: r.status, current_version: r.current_version, changes_requested_at: r.changes_requested_at, notes: notesFor(sn.data, 'script_id', r.id) })),
      ...assets.map((r) => ({ id: r.id, type: 'asset' as const, title: r.title, status: r.status, current_version: r.current_version, changes_requested_at: r.changes_requested_at, notes: notesFor(an.data, 'asset_id', r.id) })),
    ];
    return NextResponse.json({ clientId, items });
  } catch (err) {
    reportError('[portal] held list failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Could not load held items.' }, { status: 500 });
  }
}
