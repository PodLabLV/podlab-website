import { NextResponse } from 'next/server';
import { admin, resolveCaller, resolveStaff, recordEvent } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'client-deliverables';

/**
 * Deliverables.
 *
 * GET   — mint a short-lived signed URL for one version (client or staff)
 * POST  — staff: mint a signed UPLOAD url, or register a finished version
 * PATCH — client: approve or request changes on the current version
 *
 * The bucket is private and has no RLS policies for authenticated users at all.
 * Every read is a signed URL minted here after checking ownership, so a leaked
 * link expires and a guessed path returns nothing.
 */

const SIGNED_URL_TTL = 300; // 5 minutes — long enough to start a download

// ── GET: download ────────────────────────────────────────────────────
export async function GET(req: Request) {
  const db = admin();
  const url = new URL(req.url);
  const versionId = url.searchParams.get('versionId');
  if (!versionId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const caller = await resolveCaller(req, db);
  const staff = caller ? null : await resolveStaff(req, db);
  if (!caller && !staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const { data: version } = await db
    .from('portal_asset_versions')
    .select('id, client_id, storage_path, external_url')
    .eq('id', versionId)
    .maybeSingle();

  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (caller && version.client_id !== caller.clientId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Things that live elsewhere are handed back as-is; nothing to sign.
  if (!version.storage_path) {
    return NextResponse.json({ url: version.external_url });
  }

  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUrl(version.storage_path, SIGNED_URL_TTL);

  if (error || !data) {
    console.error('[portal] signed url failed', error?.message);
    return NextResponse.json({ error: 'Could not open that file.' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl, expiresIn: SIGNED_URL_TTL });
}

// ── POST: upload ─────────────────────────────────────────────────────
interface UploadPayload {
  intent?: 'sign' | 'register';
  assetId?: string;
  clientId?: string;
  title?: string;
  lab?: string;
  fileType?: string;
  /** sign: the filename we are about to upload */
  filename?: string;
  /** register: what was actually uploaded */
  storagePath?: string;
  externalUrl?: string;
  sizeBytes?: number;
  mimeType?: string;
  note?: string;
}

export async function POST(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: UploadPayload;
  try {
    p = (await req.json()) as UploadPayload;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // ── mint a signed upload URL ───────────────────────────────────────
  // The browser uploads straight to storage. Routing a 400 MB cut through a
  // function would be slower, costlier, and pointless.
  if (p.intent === 'sign') {
    if (!p.clientId || !p.filename) {
      return NextResponse.json({ error: 'clientId and filename are required.' }, { status: 400 });
    }
    // Namespaced by client and timestamped so two uploads of "final.mp4" cannot
    // collide, and so a path never reveals another client's tree.
    const safe = p.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const path = `${p.clientId}/${Date.now()}-${safe}`;

    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error('[portal] signed upload failed', error?.message);
      return NextResponse.json({ error: 'Could not start that upload.' }, { status: 500 });
    }
    return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
  }

  // ── register a finished version ────────────────────────────────────
  if (!p.storagePath && !p.externalUrl) {
    return NextResponse.json({ error: 'A version needs a file or a URL.' }, { status: 400 });
  }

  let assetId = p.assetId ?? null;
  let clientId = p.clientId ?? null;

  if (assetId) {
    const { data: asset } = await db
      .from('portal_assets')
      .select('id, client_id, title, current_version')
      .eq('id', assetId)
      .maybeSingle();
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    clientId = asset.client_id;
  } else {
    if (!clientId || !p.title) {
      return NextResponse.json({ error: 'clientId and title are required.' }, { status: 400 });
    }
    const { data: asset, error } = await db
      .from('portal_assets')
      .insert({
        client_id: clientId,
        title: p.title,
        lab: p.lab ?? null,
        file_type: p.fileType ?? 'LINK',
        status: 'pending review',
        current_version: 0, // bumped to 1 below
      })
      .select('id')
      .maybeSingle();
    if (error || !asset) {
      console.error('[portal] asset insert failed', error?.message);
      return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
    }
    assetId = asset.id;
  }

  const { data: current } = await db
    .from('portal_assets')
    .select('current_version, title')
    .eq('id', assetId)
    .maybeSingle();

  const nextNo = (current?.current_version ?? 0) + 1;

  const { data: version, error: vErr } = await db
    .from('portal_asset_versions')
    .insert({
      asset_id: assetId,
      client_id: clientId,
      version_no: nextNo,
      storage_path: p.storagePath ?? null,
      external_url: p.externalUrl ?? null,
      size_bytes: p.sizeBytes ?? null,
      mime_type: p.mimeType ?? null,
      note: p.note ?? null,
      uploaded_by: staff.name,
    })
    .select('id, version_no')
    .maybeSingle();

  if (vErr || !version) {
    console.error('[portal] asset version insert failed', vErr?.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  await db
    .from('portal_assets')
    .update({
      current_version: nextNo,
      status: 'pending review',
      approved_at: null,
      approved_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId);

  await recordEvent(db, {
    clientId: clientId as string,
    module: 'deliverables',
    kind: 'deliverable.version_added',
    title: `${current?.title ?? 'Deliverable'} — v${nextNo} ready to review`,
    detail: p.note ?? null,
    actorName: staff.name,
    actorKind: 'staff',
    refId: assetId,
  });

  return NextResponse.json({ assetId, versionId: version.id, versionNo: nextNo });
}

// ── PATCH: client approves or asks for changes ───────────────────────
export async function PATCH(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: { assetId?: string; decision?: 'approved' | 'changes requested' };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (!p.assetId || !['approved', 'changes requested'].includes(p.decision || '')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { data: asset } = await db
    .from('portal_assets')
    .select('id, client_id, title, current_version')
    .eq('id', p.assetId)
    .maybeSingle();

  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (asset.client_id !== caller.clientId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const approved = p.decision === 'approved';

  const { error } = await db
    .from('portal_assets')
    .update({
      status: p.decision,
      approved_at: approved ? new Date().toISOString() : null,
      approved_by: approved ? caller.displayName : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', asset.id);

  if (error) {
    console.error('[portal] asset decision failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  await recordEvent(db, {
    clientId: asset.client_id,
    module: 'deliverables',
    kind: approved ? 'deliverable.approved' : 'deliverable.changes_requested',
    title: approved
      ? `Deliverable approved — ${asset.title} v${asset.current_version}`
      : `Changes requested — ${asset.title} v${asset.current_version}`,
    actorName: caller.displayName,
    actorKind: 'client',
    refId: asset.id,
    crmLeadId: caller.crmLeadId,
    businessName: caller.businessName,
    slack: true,
  });

  return NextResponse.json({ status: p.decision });
}
