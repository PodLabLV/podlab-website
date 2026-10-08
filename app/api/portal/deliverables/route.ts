import { NextResponse } from 'next/server';
import { parseChapters } from '@/lib/chapters';
import { admin, resolveCaller, notifySlack, logToCrm } from '@/lib/portal-server';
import {
  resolveActor,
  resolvePublisher,
  resolveClientId,
  recordActivity,
  clientIp,
  nextVersionNo,
  trimTo,
  MAX_NOTE,
} from '@/lib/portal/server';
import { unsentClientNotes, clock } from '@/lib/portal/scripts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Deliverables.
 *
 * GET   mint a short-lived signed URL for one version (client on their own, or staff)
 * POST  PodLab: mint a signed UPLOAD url (intent "sign"), or register a version
 * PATCH client: approve the current version, or send notes asking for changes
 *
 * The client-deliverables bucket is private with no storage policies at all.
 * Every read is a signed URL minted here after an ownership check, so a shared
 * link expires and a guessed path returns nothing.
 */

const BUCKET = 'client-deliverables';
// Long enough to start a download or buffer a cut; the page re-mints on expiry.
const SIGNED_URL_TTL = 600;

// ── GET: open a version ──────────────────────────────────────────────────
export async function GET(req: Request) {
  const db = admin();
  const versionId = new URL(req.url).searchParams.get('versionId');
  if (!versionId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const { staff, caller } = await resolveActor(req, db);
  if (!staff && !caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const { data: version } = await db
    .from('portal_asset_versions')
    .select('id, client_id, storage_path, external_url')
    .eq('id', versionId)
    .maybeSingle();
  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (caller && version.client_id !== caller.clientId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  if (!version.storage_path) return NextResponse.json({ url: version.external_url, external: true });

  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(version.storage_path, SIGNED_URL_TTL);
  if (error || !data) {
    console.error('[portal] signed url failed', error?.message);
    return NextResponse.json({ error: 'Could not open that file.' }, { status: 500 });
  }
  return NextResponse.json({ url: data.signedUrl, expiresIn: SIGNED_URL_TTL, external: false });
}

// ── POST: publish ────────────────────────────────────────────────────────
interface PostPayload {
  intent?: 'sign' | 'register' | 'chapters';
  versionId?: string;       // chapters
  chapters?: unknown;       // "0:00 Hook" lines, or [{ t, title }]
  assetId?: string;
  clientId?: string;
  clientEmail?: string;
  title?: string;
  description?: string;
  lab?: string;
  fileType?: string;        // PDF | VIDEO | FOLDER | LINK
  filename?: string;        // sign
  storagePath?: string;     // register
  externalUrl?: string;     // register
  sizeBytes?: number;
  mimeType?: string;
  note?: string;
}

const FILE_TYPES = ['PDF', 'VIDEO', 'FOLDER', 'LINK'];

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

  // ── signed upload url: the file goes straight to storage, not through a function
  if (p.intent === 'sign') {
    const clientId = p.assetId ? await clientOfAsset(db, p.assetId) : await resolveClientId(db, p);
    if (!clientId || !p.filename) {
      return NextResponse.json({ error: 'A known client (or assetId) and a filename are required.' }, { status: 400 });
    }
    const safe = p.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const path = `${clientId}/${Date.now()}-${safe}`;
    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error('[portal] signed upload failed', error?.message);
      return NextResponse.json({ error: 'Could not start that upload.' }, { status: 500 });
    }
    return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
  }

  // ── set or replace a version's chapters ─────────────────────────────
  if (p.intent === 'chapters') {
    if (!p.versionId) return NextResponse.json({ error: 'versionId required' }, { status: 400 });
    const chapters = parseChapters(p.chapters ?? '');
    const { data, error } = await db
      .from('portal_asset_versions')
      .update({ chapters })
      .eq('id', p.versionId)
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('[portal] chapters update failed', error.message);
      return NextResponse.json({ error: 'Could not save chapters.' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ versionId: p.versionId, chapters });
  }

  // ── register a version ──────────────────────────────────────────────
  const external = p.externalUrl?.trim() || null;
  if (!p.storagePath && !external) {
    return NextResponse.json({ error: 'A version needs a storagePath or an externalUrl.' }, { status: 400 });
  }
  if (external && !/^https:\/\//i.test(external)) {
    return NextResponse.json({ error: 'externalUrl must be https.' }, { status: 400 });
  }

  let assetId = p.assetId ?? null;
  let clientId: string | null = null;
  let title = '';

  if (assetId) {
    const { data: asset } = await db
      .from('portal_assets')
      .select('id, client_id, title')
      .eq('id', assetId)
      .maybeSingle();
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    clientId = asset.client_id;
    title = asset.title;
  } else {
    clientId = await resolveClientId(db, p);
    title = (p.title || '').trim().slice(0, 200);
    if (!clientId || !title) {
      return NextResponse.json({ error: 'A known clientId (or clientEmail) and a title are required.' }, { status: 400 });
    }
    const fileType = (p.fileType || 'LINK').toUpperCase();
    const { data: asset, error } = await db
      .from('portal_assets')
      .insert({
        client_id: clientId,
        title,
        description: p.description?.trim() || null,
        lab: p.lab ?? null,
        file_type: FILE_TYPES.includes(fileType) ? fileType : 'LINK',
        status: 'in review',
        current_version: 0,
      })
      .select('id')
      .single();
    if (error || !asset) {
      console.error('[portal] asset insert failed', error?.message);
      return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
    }
    assetId = asset.id;
  }

  // A storage path must sit in this client's folder; a path is not an ownership proof otherwise.
  if (p.storagePath && !p.storagePath.startsWith(`${clientId}/`)) {
    return NextResponse.json({ error: 'storagePath must come from a "sign" call for this client.' }, { status: 400 });
  }

  // From the versions that exist, so legacy rows (no versions) start at v1.
  const versionNo = await nextVersionNo(db, 'portal_asset_versions', 'asset_id', assetId as string);

  const { data: version, error: vErr } = await db
    .from('portal_asset_versions')
    .insert({
      asset_id: assetId,
      client_id: clientId,
      version_no: versionNo,
      storage_path: p.storagePath ?? null,
      external_url: external,
      size_bytes: typeof p.sizeBytes === 'number' ? p.sizeBytes : null,
      mime_type: p.mimeType ?? null,
      note: p.note?.trim() ? p.note.trim().slice(0, 1000) : null,
      uploaded_by: publisher.name,
      ...(p.chapters ? { chapters: parseChapters(p.chapters) } : {}),
    })
    .select('id, version_no')
    .single();

  if (vErr || !version) {
    const conflict = vErr?.code === '23505';
    console.error('[portal] asset version insert failed', vErr?.message);
    return NextResponse.json(
      { error: conflict ? 'Another version was just published. Retry.' : 'Could not save that.' },
      { status: conflict ? 409 : 500 },
    );
  }

  await db
    .from('portal_assets')
    .update({
      current_version: versionNo,
      status: 'in review',
      approved_version: null,
      approved_at: null,
      approved_by: null,
      approved_by_email: null,
      approved_ip: null,
      approved_user_agent: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId);

  await recordActivity(db, clientId as string, 'deliverable', `${title} v${versionNo} is ready for your review`);

  return NextResponse.json({ assetId, versionId: version.id, versionNo });
}

async function clientOfAsset(db: ReturnType<typeof admin>, assetId: string): Promise<string | null> {
  const { data } = await db.from('portal_assets').select('client_id').eq('id', assetId).maybeSingle();
  return data?.client_id ?? null;
}

// ── PATCH: the client's decision ─────────────────────────────────────────
export async function PATCH(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: { assetId?: string; decision?: string; message?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!p.assetId || !['approved', 'changes requested'].includes(p.decision || '')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const message = (p.message || '').trim().slice(0, MAX_NOTE);

  const { data: asset } = await db
    .from('portal_assets')
    .select('id, client_id, title, status, current_version, changes_requested_at')
    .eq('id', p.assetId)
    .maybeSingle();
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (asset.client_id !== caller.clientId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { data: version } = await db
    .from('portal_asset_versions')
    .select('id, version_no')
    .eq('asset_id', asset.id)
    .eq('version_no', asset.current_version)
    .maybeSingle();
  // Legacy rows (a url and no versions) have nothing to sign off on.
  if (!version) return NextResponse.json({ error: 'This file has no version to review.' }, { status: 409 });

  const label = `${asset.title} v${version.version_no}`;
  const now = new Date().toISOString();

  if (p.decision === 'approved') {
    const { error } = await db
      .from('portal_assets')
      .update({
        status: 'approved',
        approved_version: version.version_no,
        approved_at: now,
        approved_by: caller.displayName,
        approved_by_email: caller.email,
        approved_ip: clientIp(req),
        approved_user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
        updated_at: now,
      })
      .eq('id', asset.id);
    if (error) {
      console.error('[portal] asset approve failed', error.message);
      return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
    }
    await db
      .from('portal_asset_comments')
      .update({ status: 'resolved', resolved_at: now })
      .eq('asset_id', asset.id)
      .eq('status', 'open');

    await Promise.all([
      notifySlack(`*Deliverable approved* — ${caller.businessName}\n${label}, approved by ${caller.displayName}.`),
      logToCrm(db, caller, `Approved deliverable in portal: ${label}`),
      recordActivity(db, caller.clientId, 'deliverable', `You approved ${label}`),
    ]);
    return NextResponse.json({ status: 'approved' });
  }

  // ── changes requested: bundle every unsent note into one brief
  const { data: notes } = await db
    .from('portal_asset_comments')
    .select('id, time_seconds, body, author_kind, status, created_at')
    .eq('version_id', version.id)
    .order('time_seconds', { ascending: true, nullsFirst: true });
  const unsent = unsentClientNotes(notes ?? [], asset.changes_requested_at);

  if (unsent.length === 0 && !message) {
    return NextResponse.json({ error: 'Leave at least one note so we know what to change.' }, { status: 400 });
  }
  if (message) {
    await db.from('portal_asset_comments').insert({
      version_id: version.id,
      asset_id: asset.id,
      client_id: asset.client_id,
      body: message,
      author_name: caller.displayName,
      author_kind: 'client',
    });
  }

  const { error } = await db
    .from('portal_assets')
    .update({ status: 'changes requested', changes_requested_at: now, updated_at: now })
    .eq('id', asset.id);
  if (error) {
    console.error('[portal] asset changes failed', error.message);
    return NextResponse.json({ error: 'Could not send that.' }, { status: 500 });
  }

  const lines = [
    ...(message ? [`Overall: ${trimTo(message, 400)}`] : []),
    ...unsent.map((n) => (n.time_seconds !== null ? `At ${clock(Number(n.time_seconds))}: ` : '') + trimTo(n.body, 300)),
  ];
  const count = lines.length;
  const shown = lines.slice(0, 12).map((l) => `• ${l}`).join('\n');
  const more = lines.length > 12 ? `\n…and ${lines.length - 12} more in the portal.` : '';

  await Promise.all([
    notifySlack(`*Deliverable revision requested* — ${caller.businessName}\n*${label}* · ${count} note${count === 1 ? '' : 's'}\n${shown}${more}`),
    logToCrm(db, caller, `Requested changes in portal on ${label} (${count} note${count === 1 ? '' : 's'}): ${trimTo(lines.join(' | '), 1500)}`),
    recordActivity(db, caller.clientId, 'deliverable', `You sent ${count} note${count === 1 ? '' : 's'} on ${label}`),
  ]);

  return NextResponse.json({ status: 'changes requested', sent: count });
}
