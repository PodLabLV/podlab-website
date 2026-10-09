import { createHmac, timingSafeEqual } from 'node:crypto';
import { getVercelOidcToken } from '@vercel/oidc';
import type { BrandKind } from '@/lib/portal/brand';

/**
 * Google Drive for the Brand page: uploads land in the client's own PodLab OS
 * folder. Auth is keyless: Vercel's OIDC token is exchanged with Google STS
 * (Workload Identity Federation, pool "vercel") and then used to impersonate the
 * portal-uploads service account, which is a Content manager on the Shared Drive.
 *
 * The browser uploads straight to Google through a resumable session this
 * server opens, so file size never touches a function.
 */

const API = 'https://www.googleapis.com/drive/v3';
const FOLDER = 'application/vnd.google-apps.folder';
const ALL_DRIVES = 'supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives';

const env = () => ({
  number: process.env.GCP_PROJECT_NUMBER,
  email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
  pool: process.env.GCP_WORKLOAD_IDENTITY_POOL_ID,
  provider: process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
});

export function driveConfigured(): boolean {
  const e = env();
  return Boolean(e.number && e.email && e.pool && e.provider);
}

// ── auth ─────────────────────────────────────────────────────────────────
let cached: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const e = env();
  const sts = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      audience: `//iam.googleapis.com/projects/${e.number}/locations/global/workloadIdentityPools/${e.pool}/providers/${e.provider}`,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      subject_token: await getVercelOidcToken(),
    }),
  });
  const federated = (await sts.json()) as { access_token?: string; error_description?: string };
  if (!federated.access_token) throw new Error(`Google STS refused: ${federated.error_description ?? sts.status}`);

  const res = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${e.email}:generateAccessToken`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${federated.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/drive'] }),
  });
  const sa = (await res.json()) as { accessToken?: string; expireTime?: string; error?: { message?: string } };
  if (!sa.accessToken) throw new Error(`Service account impersonation refused: ${sa.error?.message ?? res.status}`);
  cached = { token: sa.accessToken, expires: sa.expireTime ? Date.parse(sa.expireTime) : Date.now() + 30 * 60_000 };
  return cached.token;
}

async function drive(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${await accessToken()}` },
  });
  return res;
}

async function driveJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await drive(path, init);
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Drive ${res.status}: ${body.error?.message ?? 'request failed'}`);
  return body;
}

// ── folders ──────────────────────────────────────────────────────────────
export function folderIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/folders\/([\w-]{10,})/) ?? url.match(/[?&]id=([\w-]{10,})/);
  return m?.[1] ?? null;
}

/**
 * Where each kind lands inside a client folder (the PodLab OS client template).
 * Each step matches by name, so renumbering ("02- B-Roll" → "03- B-Roll") never
 * breaks it; a missing step is created with the template's name.
 */
const ROUTES: Record<BrandKind, Array<{ match: RegExp; create: string }>> = {
  broll: [
    { match: /content/i, create: '03- Content' },
    { match: /b-?\s?roll/i, create: '02- B-Roll' },
  ],
  logo: [
    { match: /company/i, create: '01- Company' },
    { match: /brand kit/i, create: '02- Brand Kit & Logos' },
    { match: /logo/i, create: '01- Logo' },
  ],
  guide: [
    { match: /company/i, create: '01- Company' },
    { match: /brand kit/i, create: '02- Brand Kit & Logos' },
    { match: /^(?!.*logo).*brand kit/i, create: '02- Brand Kit' },
  ],
  font: [
    { match: /company/i, create: '01- Company' },
    { match: /brand kit/i, create: '02- Brand Kit & Logos' },
    { match: /^(?!.*logo).*brand kit/i, create: '02- Brand Kit' },
  ],
};

/** Subfolders of a folder. Shared Drive items only show up with corpora=allDrives. */
export async function listFolders(parent: string): Promise<Array<{ id: string; name: string; createdTime?: string }>> {
  const q = encodeURIComponent(`'${parent}' in parents and mimeType='${FOLDER}' and trashed=false`);
  const { files } = await driveJson<{ files: Array<{ id: string; name: string; createdTime?: string }> }>(
    `/files?q=${q}&fields=files(id,name,createdTime)&pageSize=100&${ALL_DRIVES}`,
  );
  return files;
}

/** Move a file or folder to the Shared Drive's trash (recoverable). */
export async function trashFile(id: string): Promise<void> {
  await driveJson(`/files/${encodeURIComponent(id)}?supportsAllDrives=true&fields=id`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  });
}

const SECTION = /^\d+\s*-\s*(company|acquisition|content|fulfil+ment|dashboard|growth|team)/i;

/**
 * The folder that actually holds a client's 01–07 sections. Usually the linked
 * folder itself, but a person with a business gets a layer between
 * ("Sharlene Ruiz / The Collected View / 01- Company…"): when the linked folder
 * has no sections and exactly one subfolder does, that subfolder is the root.
 */
async function sectionsRoot(rootId: string): Promise<string> {
  const top = await listFolders(rootId);
  if (top.some((f) => SECTION.test(f.name))) return rootId;
  const withSections: string[] = [];
  for (const f of top.slice(0, 8)) {
    if ((await listFolders(f.id)).some((g) => SECTION.test(g.name))) withSections.push(f.id);
  }
  return withSections.length === 1 ? withSections[0] : rootId;
}

const folderCache = new Map<string, { id: string; at: number }>();

export async function targetFolder(rootId: string, kind: BrandKind): Promise<string> {
  const key = `${rootId}:${kind}`;
  const hit = folderCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.id;

  let parent = await sectionsRoot(rootId);
  for (const step of ROUTES[kind]) {
    const files = await listFolders(parent);
    const found = files.sort((a, b) => a.name.localeCompare(b.name)).find((f) => step.match.test(f.name));
    if (found) {
      parent = found.id;
      continue;
    }
    const made = await driveJson<{ id: string }>(`/files?supportsAllDrives=true&fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: step.create, mimeType: FOLDER, parents: [parent] }),
    });
    parent = made.id;
  }
  folderCache.set(key, { id: parent, at: Date.now() });
  return parent;
}

// ── files ────────────────────────────────────────────────────────────────
/**
 * Open a resumable upload session. The browser PUTs the bytes to the returned
 * URL in chunks (and can resume after a dropped connection). `origin` must be
 * the page's origin: Google only allows the browser's PUTs (CORS) from the
 * origin that opened the session.
 */
export async function openUploadSession(p: { folderId: string; name: string; mimeType: string; size: number; origin: string }): Promise<string> {
  const res = await drive(`https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,size,mimeType`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': p.mimeType || 'application/octet-stream',
      'X-Upload-Content-Length': String(p.size),
      Origin: p.origin,
    },
    body: JSON.stringify({ name: p.name, parents: [p.folderId] }),
  });
  const url = res.headers.get('location');
  if (!res.ok || !url) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Drive upload session ${res.status}: ${body.error?.message ?? 'no session'}`);
  }
  return url;
}

export interface DriveFile {
  id: string;
  name: string;
  size?: string;
  mimeType: string;
  parents?: string[];
  thumbnailLink?: string;
  trashed?: boolean;
}

export async function getFile(id: string): Promise<DriveFile> {
  return driveJson<DriveFile>(`/files/${encodeURIComponent(id)}?fields=id,name,size,mimeType,parents,thumbnailLink,trashed&supportsAllDrives=true`);
}

/** The file's bytes, or its thumbnail, as a fetch Response to stream back. */
export async function fetchContent(id: string, variant: 'file' | 'thumb'): Promise<Response | null> {
  if (variant === 'file') {
    const res = await drive(`/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`);
    return res.ok ? res : null;
  }
  const f = await getFile(id);
  if (!f.thumbnailLink) return null;
  // Thumbnail links take a size suffix; 640px is plenty for a tile.
  const res = await drive(f.thumbnailLink.replace(/=s\d+$/, '=s640'));
  return res.ok ? res : null;
}

export const driveViewUrl = (id: string) => `https://drive.google.com/file/d/${id}/view`;
export const driveFolderUrl = (id: string) => `https://drive.google.com/drive/folders/${id}`;

// ── signed preview links ─────────────────────────────────────────────────
// <img> and <video> can't send a bearer token, so previews go through
// /api/portal/brand/file with a short-lived HMAC instead.
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function sign(assetId: string, variant: string, exp: number, scope = 'brand-file'): string {
  return createHmac('sha256', secret()).update(`${scope}:${assetId}:${variant}:${exp}`).digest('base64url');
}

/**
 * Signed link to stream a Drive cut inline: a production card's video_url or a
 * deliverable version's external_url. Minted only after the route has checked
 * the viewer may see that card or version.
 */
export function streamUrl(kind: 'card' | 'version', id: string, ttlSeconds = 6 * 3600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `/api/portal/stream?k=${kind}&id=${id}&exp=${exp}&sig=${sign(id, kind, exp, 'stream')}`;
}

export function verifyStream(kind: string, id: string, exp: string, sig: string): boolean {
  const e = Number(exp);
  if (!secret() || !Number.isFinite(e) || e < Date.now() / 1000 || (kind !== 'card' && kind !== 'version')) return false;
  const want = Buffer.from(sign(id, kind, e, 'stream'));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** A byte range of a Drive file (video seeking). Passes Google's status through: 200, 206, 416… */
export async function fetchRange(id: string, range: string | null): Promise<Response> {
  return drive(`/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`, { headers: range ? { Range: range } : {} });
}

export function previewUrl(assetId: string, variant: 'file' | 'thumb', ttlSeconds = 3600, download = false): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `/api/portal/brand/file?id=${assetId}&v=${variant}&exp=${exp}&sig=${sign(assetId, variant, exp)}${download ? '&dl=1' : ''}`;
}

export function verifyPreview(assetId: string, variant: string, exp: string, sig: string): boolean {
  const e = Number(exp);
  if (!secret() || !Number.isFinite(e) || e < Date.now() / 1000) return false;
  const want = Buffer.from(sign(assetId, variant, e));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** storage_path for a Drive-backed row: no schema change, and never confused with a bucket path. */
export const DRIVE_PREFIX = 'drive:';
export const driveIdOf = (storagePath: string | null) => (storagePath?.startsWith(DRIVE_PREFIX) ? storagePath.slice(DRIVE_PREFIX.length) : null);
