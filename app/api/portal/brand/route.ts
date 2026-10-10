import { reportError } from '@/lib/alerts';
import { randomBytes } from 'node:crypto';
import { NextResponse, after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, notifySlack, logToCrm, type PortalCaller } from '@/lib/portal-server';
import { resolveActor, recordActivity } from '@/lib/portal/server';
import { SITE_URL } from '@/lib/portal-email';
import {
  BRAND_BUCKET,
  BRAND_KINDS,
  LOGO_VARIANTS,
  MAX_UPLOAD_BYTES,
  BRAND_QUIET_MS,
  allowedFile,
  brandBurst,
  formatBytes,
  validateKit,
  type BrandKind,
} from '@/lib/portal/brand';
import { loadBrand } from '@/lib/portal/brand-server';
import { DRIVE_PREFIX, driveConfigured, driveFolderUrl, folderIdFromUrl, getFile, openUploadSession, targetFolder } from '@/lib/portal/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The Slack ping waits out a quiet window after the response (see announce).
export const maxDuration = 300;

/**
 * Brand page: logos, brand kit, b-roll.
 *
 * GET     the client's kit and files (signed links). Staff pass ?clientId=.
 * POST    intent sign       → a signed upload URL; the file goes straight to storage
 *         intent register   → record an uploaded file, or a pasted link
 *         intent announce   → timeline line now; one Slack ping per run of uploads (2 quiet minutes)
 *         intent kit        → save colors, fonts, notes
 *         intent share      → staff: make (or rotate) the editors' read-only link
 *         intent cards      → staff: put that link on every card of their linked boards
 * PATCH   relabel a file, or change a logo's variant
 * DELETE  ?assetId= hide a file (the object stays in storage until staff purge it)
 *
 * Uploads go straight to the client's PodLab OS Drive folder (lib/portal/drive.ts)
 * when one is linked; otherwise to the private bucket, where every read is a
 * signed URL minted after an ownership check.
 */

interface Actor {
  clientId: string;
  name: string;
  kind: 'client' | 'staff';
  caller: PortalCaller | null;
}

async function actorFor(req: Request, db: SupabaseClient, clientIdHint?: string | null): Promise<Actor | null> {
  const { staff, caller } = await resolveActor(req, db);
  if (caller) return { clientId: caller.clientId, name: caller.displayName, kind: 'client', caller };
  if (staff && clientIdHint) {
    const { data } = await db.from('portal_clients').select('id').eq('id', clientIdHint).maybeSingle();
    if (data) return { clientId: data.id, name: staff.name, kind: 'staff', caller: null };
  }
  return null;
}

/** The client's PodLab OS folder, when Drive uploads are switched on and the folder is linked. */
async function driveRootOf(db: SupabaseClient, clientId: string): Promise<string | null> {
  if (!driveConfigured()) return null;
  const { data } = await db.from('portal_clients').select('drive_folder_url').eq('id', clientId).maybeSingle();
  return folderIdFromUrl(data?.drive_folder_url);
}

/** Google lets the browser PUT only from the origin that opened the session. */
function uploadOrigin(req: Request): string {
  const o = req.headers.get('origin');
  const ok = o && (/^https:\/\/([a-z0-9-]+\.)?podlablv\.com$/.test(o) || /^https:\/\/podlab-site[a-z0-9-]*\.vercel\.app$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));
  return ok ? o! : SITE_URL;
}

function shareUrl(token: string): string {
  return `${SITE_URL}/portal/kit/${token}`;
}

async function shareTokenOf(db: SupabaseClient, clientId: string): Promise<string | null> {
  const { data } = await db.from('portal_brand_kits').select('share_token').eq('client_id', clientId).maybeSingle();
  return data?.share_token ?? null;
}

const notReady = () => NextResponse.json({ error: 'The Brand page is not switched on yet. Run migration 20261012.' }, { status: 503 });

// ── GET ──────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const db = admin();
  const actor = await actorFor(req, db, new URL(req.url).searchParams.get('clientId'));
  if (!actor) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const brand = await loadBrand(db, actor.clientId);
  if (!brand.ready) return NextResponse.json({ brand, staff: actor.kind === 'staff' });

  const token = actor.kind === 'staff' ? await shareTokenOf(db, actor.clientId) : null;
  return NextResponse.json({ brand, staff: actor.kind === 'staff', shareUrl: token ? shareUrl(token) : null });
}

// ── POST ─────────────────────────────────────────────────────────────────
interface PostPayload {
  intent?: 'sign' | 'register' | 'announce' | 'kit' | 'share' | 'cards';
  clientId?: string;
  kind?: BrandKind;
  variant?: string | null;
  label?: string | null;
  filename?: string;
  sizeBytes?: number;
  mimeType?: string | null;
  path?: string;
  driveFileId?: string;
  externalUrl?: string;
  count?: number;
  colors?: unknown;
  fonts?: unknown;
  notes?: unknown;
  rotate?: boolean;
}

const KIND_WORD: Record<BrandKind, [string, string]> = {
  logo: ['logo', 'logos'],
  guide: ['brand guide file', 'brand guide files'],
  font: ['font file', 'font files'],
  broll: ['b-roll file', 'b-roll files'],
};

export async function POST(req: Request) {
  const db = admin();
  let p: PostPayload;
  try {
    p = (await req.json()) as PostPayload;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const actor = await actorFor(req, db, p.clientId);
  if (!actor) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const kind = p.kind && BRAND_KINDS.includes(p.kind) ? p.kind : null;

  // ── signed upload url
  if (p.intent === 'sign') {
    const filename = (p.filename ?? '').trim();
    if (!kind || !filename) return NextResponse.json({ error: 'A kind and a filename are required.' }, { status: 400 });
    if (!allowedFile(kind, filename)) {
      return NextResponse.json({ error: `${filename} isn't a file type we take here.` }, { status: 400 });
    }
    if (!p.sizeBytes || p.sizeBytes < 1) return NextResponse.json({ error: `${filename} is empty.` }, { status: 400 });

    // Straight into their PodLab OS folder when we can; the bucket otherwise.
    const root = await driveRootOf(db, actor.clientId);
    if (root) {
      try {
        const folderId = await targetFolder(root, kind);
        const sessionUrl = await openUploadSession({ folderId, name: filename.slice(0, 200), mimeType: p.mimeType ?? '', size: p.sizeBytes, origin: uploadOrigin(req) });
        return NextResponse.json({ target: 'drive', sessionUrl });
      } catch (err) {
        reportError('[portal] drive upload session failed; using the bucket', err instanceof Error ? err.message : err);
      }
    }

    if ((p.sizeBytes ?? 0) > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `${filename} is over 5 GB. Paste a Drive or Dropbox link to it instead.` }, { status: 400 });
    }
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const path = `${actor.clientId}/${kind}/${Date.now()}-${randomBytes(3).toString('hex')}-${safe}`;
    const { data, error } = await db.storage.from(BRAND_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      reportError('[portal] brand signed upload failed', error?.message);
      return NextResponse.json({ error: /bucket/i.test(error?.message ?? '') ? 'Uploads are not switched on yet.' : 'Could not start that upload.' }, { status: 500 });
    }
    return NextResponse.json({ target: 'bucket', path, signedUrl: data.signedUrl });
  }

  // ── record an uploaded file, or a link
  if (p.intent === 'register') {
    if (!kind) return NextResponse.json({ error: 'kind required' }, { status: 400 });
    const external = (p.externalUrl ?? '').trim();
    if (!p.path && !external && !p.driveFileId) return NextResponse.json({ error: 'A file or a link is required.' }, { status: 400 });

    let drive: { id: string; name: string; size: number | null; mime: string | null } | null = null;
    if (p.driveFileId) {
      // The id came from the browser: it only counts if the file sits in this
      // client's folder for this kind.
      const root = await driveRootOf(db, actor.clientId);
      if (!root) return NextResponse.json({ error: 'Drive uploads are not switched on for this account.' }, { status: 400 });
      try {
        const [f, folderId] = await Promise.all([getFile(p.driveFileId), targetFolder(root, kind)]);
        if (f.trashed || !f.parents?.includes(folderId)) {
          return NextResponse.json({ error: 'That upload does not belong to this account.' }, { status: 400 });
        }
        drive = { id: f.id, name: f.name, size: f.size ? Number(f.size) : null, mime: f.mimeType ?? null };
      } catch (err) {
        reportError('[portal] drive register check failed', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'The upload did not finish. Try that file again.' }, { status: 400 });
      }
    } else if (p.path) {
      // A path is not an ownership proof unless it sits in this client's folder,
      // and it must really be there (the upload can fail after signing).
      if (!p.path.startsWith(`${actor.clientId}/${kind}/`)) {
        return NextResponse.json({ error: 'That upload does not belong to this account.' }, { status: 400 });
      }
      const name = p.path.split('/').pop()!;
      const { data: found } = await db.storage.from(BRAND_BUCKET).list(`${actor.clientId}/${kind}`, { search: name, limit: 1 });
      if (!found?.some((f) => f.name === name)) {
        return NextResponse.json({ error: 'The upload did not finish. Try that file again.' }, { status: 400 });
      }
    } else {
      let u: URL;
      try {
        u = new URL(external);
      } catch {
        return NextResponse.json({ error: 'Paste a full link, starting with https://' }, { status: 400 });
      }
      if (u.protocol !== 'https:') return NextResponse.json({ error: 'Paste a full link, starting with https://' }, { status: 400 });
    }

    const variant = kind === 'logo' ? (LOGO_VARIANTS.includes(p.variant as never) ? p.variant : 'other') : null;
    const { data, error } = await db
      .from('portal_brand_assets')
      .insert({
        client_id: actor.clientId,
        kind,
        variant,
        label: (p.label ?? '').trim().slice(0, 120) || null,
        storage_path: drive ? `${DRIVE_PREFIX}${drive.id}` : p.path ?? null,
        external_url: drive || p.path ? null : external,
        filename: drive ? drive.name.slice(0, 200) : p.path ? (p.filename ?? '').slice(0, 200) || null : null,
        size_bytes: drive ? drive.size : p.path && p.sizeBytes ? Math.round(p.sizeBytes) : null,
        mime_type: drive ? drive.mime : p.path ? (p.mimeType ?? '').slice(0, 100) || null : null,
        uploaded_by: actor.name,
        uploaded_by_kind: actor.kind,
      })
      .select('id')
      .single();
    if (error) {
      reportError('[portal] brand register failed', error.message);
      return /portal_brand_assets/.test(error.message) ? notReady() : NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
    }
    return NextResponse.json({ id: data.id });
  }

  // ── one ping per batch, not per file
  if (p.intent === 'announce') {
    if (!kind) return NextResponse.json({ error: 'kind required' }, { status: 400 });
    const count = Math.max(1, Math.min(500, Math.round(p.count ?? 1)));
    const size = p.sizeBytes ? ` (${formatBytes(p.sizeBytes)})` : '';
    const what = `${count} ${KIND_WORD[kind][count === 1 ? 0 : 1]}${size}`;
    const { data: c } = await db.from('portal_clients').select('business_name').eq('id', actor.clientId).maybeSingle();
    const biz = c?.business_name ?? 'A client';
    const by = actor.kind === 'client' ? `${actor.name} (${biz})` : `${actor.name} for ${biz}`;
    // Slack gets one post per run of uploads: wait for the client to stop
    // adding files, then the last upload in the run posts them all.
    const clientId = actor.clientId;
    const announcedAt = Date.now();
    after(async () => {
      await new Promise((r) => setTimeout(r, BRAND_QUIET_MS));
      const since = new Date(announcedAt - 6 * 3_600_000).toISOString();
      const { data: rows } = await db.from('portal_brand_assets').select('kind, size_bytes, created_at').eq('client_id', clientId).is('removed_at', null).gte('created_at', since);
      const burst = brandBurst((rows ?? []) as Array<{ kind: BrandKind; size_bytes: number | null; created_at: string }>, announcedAt + 5_000);
      if (!burst.post) return;
      const kinds = [...new Set(burst.rows.map((r) => r.kind))];
      const parts = kinds.map((k) => {
        const n = burst.rows.filter((r) => r.kind === k).length;
        return `${n} ${KIND_WORD[k][n === 1 ? 0 : 1]}`;
      });
      const bytes = burst.rows.reduce((t, r) => t + (r.size_bytes ?? 0), 0);
      const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
      // Point the team at the Drive folders the files landed in, when they did.
      let where = '';
      const root = await driveRootOf(db, clientId);
      if (root) {
        try {
          const links = await Promise.all(kinds.map(async (k) => (kinds.length > 1 ? `${KIND_WORD[k][1]}: ` : '') + driveFolderUrl(await targetFolder(root, k))));
          where = ` Drive: ${links.join(' · ')}`;
        } catch {}
      }
      await notifySlack(`*Brand* · ${by} added ${list}${bytes ? ` (${formatBytes(bytes)})` : ''}. ${SITE_URL}/portal/brand?client=${clientId}${where}`, 'revisions');
    });
    await Promise.all([
      actor.caller ? logToCrm(db, actor.caller, `Added ${what} on the portal Brand page.`) : Promise.resolve(),
      recordActivity(db, actor.clientId, 'update', actor.kind === 'client' ? `You added ${what}` : `PodLab added ${what} to your Brand page`),
    ]);
    return NextResponse.json({ ok: true });
  }

  // ── colors, fonts, notes
  if (p.intent === 'kit') {
    const { kit, error: invalid } = validateKit(p);
    if (!kit) return NextResponse.json({ error: invalid }, { status: 400 });
    const { error } = await db
      .from('portal_brand_kits')
      .upsert({ client_id: actor.clientId, ...kit, notes: kit.notes || null, updated_by: actor.name, updated_at: new Date().toISOString() }, { onConflict: 'client_id' });
    if (error) {
      reportError('[portal] brand kit save failed', error.message);
      return /portal_brand_kits/.test(error.message) ? notReady() : NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
    }
    if (actor.caller) await logToCrm(db, actor.caller, 'Updated their brand colors, fonts and notes on the portal.');
    return NextResponse.json({ brand: await loadBrand(db, actor.clientId) });
  }

  // ── staff: editors' read-only link
  if (p.intent === 'share' || p.intent === 'cards') {
    if (actor.kind !== 'staff') return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    let token = await shareTokenOf(db, actor.clientId);
    if (!token || (p.intent === 'share' && p.rotate)) {
      token = randomBytes(18).toString('base64url');
      const { error } = await db
        .from('portal_brand_kits')
        .upsert({ client_id: actor.clientId, share_token: token }, { onConflict: 'client_id' });
      if (error) {
        reportError('[portal] brand share failed', error.message);
        return /portal_brand_kits/.test(error.message) ? notReady() : NextResponse.json({ error: 'Could not make that link.' }, { status: 500 });
      }
    }
    const url = shareUrl(token);
    if (p.intent === 'share') return NextResponse.json({ shareUrl: url });
    const updated = await linkOnCards(db, actor.clientId, url);
    return NextResponse.json({ shareUrl: url, ...updated });
  }

  return NextResponse.json({ error: 'Unknown intent' }, { status: 400 });
}

/**
 * Put "Brand kit: <link>" on every card of the client's linked boards, replacing
 * an older link line rather than stacking a second one. The line starts with a
 * word, so the portal never reads it as a video chapter.
 */
async function linkOnCards(db: SupabaseClient, clientId: string, url: string): Promise<{ cards: number; boards: number }> {
  const { data: links } = await db.from('portal_client_boards').select('board_id').eq('client_id', clientId);
  const boardIds = (links ?? []).map((l: { board_id: string }) => l.board_id);
  if (!boardIds.length) return { cards: 0, boards: 0 };
  const crm = db.schema('crm');
  const { data: cards } = await crm
    .from('content_cards')
    .select('id, description')
    .in('board_id', boardIds)
    .eq('archived', false)
    .eq('is_template', false);
  const LINE = /^Brand kit: \S+\/portal\/kit\/\S+$/m;
  const line = `Brand kit: ${url}`;
  let n = 0;
  for (const c of (cards ?? []) as Array<{ id: string; description: string | null }>) {
    const d = c.description ?? '';
    if (d.includes(line)) continue;
    const next = LINE.test(d) ? d.replace(LINE, line) : `${d.trimEnd()}${d.trim() ? '\n\n' : ''}${line}\n`;
    const { error } = await crm.from('content_cards').update({ description: next }).eq('id', c.id);
    if (error) reportError('[portal] brand link on card failed', c.id, error.message);
    else n++;
  }
  return { cards: n, boards: boardIds.length };
}

// ── PATCH: relabel ───────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const db = admin();
  let p: { clientId?: string; assetId?: string; label?: string | null; variant?: string | null };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const actor = await actorFor(req, db, p.clientId);
  if (!actor) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  if (!p.assetId) return NextResponse.json({ error: 'assetId required' }, { status: 400 });

  const patch: Record<string, string | null> = {};
  if (p.label !== undefined) patch.label = (p.label ?? '').trim().slice(0, 120) || null;
  if (p.variant !== undefined) {
    if (!LOGO_VARIANTS.includes(p.variant as never)) return NextResponse.json({ error: 'Unknown logo type.' }, { status: 400 });
    patch.variant = p.variant;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });

  const { data, error } = await db
    .from('portal_brand_assets')
    .update(patch)
    .eq('id', p.assetId)
    .eq('client_id', actor.clientId)
    .is('removed_at', null)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// ── DELETE: hide ─────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const db = admin();
  const q = new URL(req.url).searchParams;
  const actor = await actorFor(req, db, q.get('clientId'));
  if (!actor) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const assetId = q.get('assetId');
  if (!assetId) return NextResponse.json({ error: 'assetId required' }, { status: 400 });
  const { data, error } = await db
    .from('portal_brand_assets')
    .update({ removed_at: new Date().toISOString() })
    .eq('id', assetId)
    .eq('client_id', actor.clientId)
    .is('removed_at', null)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not remove that.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
