import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Brand page: logos, brand kit (colors, fonts, guide, notes) and b-roll.
 * Shared by the portal route, the editors' read-only kit link and TipTop.
 */

export const BRAND_BUCKET = 'client-brand';
export const BRAND_URL_TTL = 3600;
export const MAX_UPLOAD_BYTES = 5 * 1024 ** 3;

export type BrandKind = 'logo' | 'guide' | 'font' | 'broll';
export const BRAND_KINDS: BrandKind[] = ['logo', 'guide', 'font', 'broll'];
export const LOGO_VARIANTS = ['primary', 'icon', 'white', 'dark', 'other'] as const;
export type LogoVariant = (typeof LOGO_VARIANTS)[number];

/** The logo set an editor needs before they can brand anything. */
export const NEEDED_LOGOS: Array<{ variant: LogoVariant; label: string; why: string }> = [
  { variant: 'primary', label: 'Main logo', why: 'The full logo, on a transparent background.' },
  { variant: 'icon', label: 'Icon or mark', why: 'The small version: profile pictures, watermarks, end cards.' },
  { variant: 'white', label: 'White version', why: 'For dark backgrounds and over video.' },
];

// Extensions, not MIME types: browsers report .eps, .ai and fonts inconsistently.
const EXT: Record<BrandKind, string[]> = {
  logo: ['png', 'svg', 'jpg', 'jpeg', 'webp', 'eps', 'ai', 'pdf'],
  guide: ['pdf', 'png', 'jpg', 'jpeg', 'key', 'pptx', 'zip'],
  font: ['otf', 'ttf', 'woff', 'woff2', 'zip'],
  broll: ['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm', 'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'zip'],
};
export const ACCEPT: Record<BrandKind, string> = Object.fromEntries(
  BRAND_KINDS.map((k) => [k, EXT[k].map((e) => `.${e}`).join(',')]),
) as Record<BrandKind, string>;

export function extOf(filename: string): string {
  return (filename.split('.').pop() ?? '').toLowerCase();
}

export function allowedFile(kind: BrandKind, filename: string): boolean {
  return EXT[kind].includes(extOf(filename));
}

export function isImage(filename: string | null, mime?: string | null): boolean {
  return /^image\/(png|jpe?g|webp|svg\+xml|gif)$/.test(mime ?? '') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(extOf(filename ?? ''));
}

export function isVideo(filename: string | null, mime?: string | null): boolean {
  return /^video\//.test(mime ?? '') || ['mp4', 'mov', 'm4v', 'webm'].includes(extOf(filename ?? ''));
}

export interface BrandColor {
  hex: string;
  name: string;
}
export interface BrandFont {
  name: string;
  use: string;
}
export interface BrandKit {
  colors: BrandColor[];
  fonts: BrandFont[];
  notes: string;
  updatedAt: string | null;
  updatedBy: string | null;
}
export interface BrandAsset {
  id: string;
  kind: BrandKind;
  variant: LogoVariant | null;
  label: string | null;
  filename: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
  externalUrl: string | null;
  uploadedBy: string | null;
  uploadedByKind: 'client' | 'staff';
  createdAt: string;
  /** Signed, short-lived. Null for link-only rows. */
  url: string | null;
}
export interface BrandPayload {
  kit: BrandKit;
  assets: BrandAsset[];
  ready: boolean;
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Clean what the browser sent. Returns errors in plain words instead of throwing. */
export function validateKit(input: { colors?: unknown; fonts?: unknown; notes?: unknown }): { kit?: Omit<BrandKit, 'updatedAt' | 'updatedBy'>; error?: string } {
  const colors: BrandColor[] = [];
  for (const raw of Array.isArray(input.colors) ? input.colors : []) {
    const c = raw as { hex?: unknown; name?: unknown };
    const hex = String(c.hex ?? '').trim();
    if (!hex) continue;
    if (!HEX.test(hex)) return { error: `"${hex.slice(0, 20)}" is not a color code. Use a hex code like #2ADD1B.` };
    let h = hex.replace('#', '').toUpperCase();
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    colors.push({ hex: `#${h}`, name: String(c.name ?? '').trim().slice(0, 40) });
  }
  if (colors.length > 16) return { error: 'Keep it to 16 colors.' };

  const fonts: BrandFont[] = [];
  for (const raw of Array.isArray(input.fonts) ? input.fonts : []) {
    const f = raw as { name?: unknown; use?: unknown };
    const name = String(f.name ?? '').trim().slice(0, 60);
    if (name) fonts.push({ name, use: String(f.use ?? '').trim().slice(0, 40) });
  }
  if (fonts.length > 8) return { error: 'Keep it to 8 fonts.' };

  const notes = String(input.notes ?? '').trim();
  if (notes.length > 4000) return { error: 'Brand notes are capped at 4,000 characters.' };
  return { kit: { colors, fonts, notes } };
}

const EMPTY_KIT: BrandKit = { colors: [], fonts: [], notes: '', updatedAt: null, updatedBy: null };

interface AssetRow {
  id: string;
  kind: BrandKind;
  variant: LogoVariant | null;
  label: string | null;
  storage_path: string | null;
  external_url: string | null;
  filename: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_by_kind: 'client' | 'staff';
  created_at: string;
}

/**
 * The client's whole brand page with signed links. `ready: false` means the
 * migration hasn't run, so pages can say so instead of erroring.
 */
export async function loadBrand(db: SupabaseClient, clientId: string, opts: { sign?: boolean } = {}): Promise<BrandPayload> {
  const [kitRes, assetRes] = await Promise.all([
    db.from('portal_brand_kits').select('colors, fonts, notes, updated_at, updated_by').eq('client_id', clientId).maybeSingle(),
    db
      .from('portal_brand_assets')
      .select('id, kind, variant, label, storage_path, external_url, filename, size_bytes, mime_type, uploaded_by, uploaded_by_kind, created_at')
      .eq('client_id', clientId)
      .is('removed_at', null)
      .order('created_at', { ascending: false }),
  ]);
  if (kitRes.error || assetRes.error) return { kit: EMPTY_KIT, assets: [], ready: false };

  const k = kitRes.data;
  const kit: BrandKit = k
    ? { colors: (k.colors as BrandColor[]) ?? [], fonts: (k.fonts as BrandFont[]) ?? [], notes: k.notes ?? '', updatedAt: k.updated_at, updatedBy: k.updated_by }
    : EMPTY_KIT;

  const rows = (assetRes.data ?? []) as AssetRow[];
  const paths = rows.map((r) => r.storage_path).filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (opts.sign !== false && paths.length) {
    const { data } = await db.storage.from(BRAND_BUCKET).createSignedUrls(paths, BRAND_URL_TTL);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  return {
    kit,
    ready: true,
    assets: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      variant: r.variant,
      label: r.label,
      filename: r.filename,
      sizeBytes: r.size_bytes,
      mimeType: r.mime_type,
      externalUrl: r.external_url,
      uploadedBy: r.uploaded_by,
      uploadedByKind: r.uploaded_by_kind,
      createdAt: r.created_at,
      url: r.storage_path ? signed.get(r.storage_path) ?? null : r.external_url,
    })),
  };
}

/** What's still missing, in the order an editor feels it. Empty means the kit is complete. */
export function brandGaps(p: BrandPayload): string[] {
  const out: string[] = [];
  const logos = p.assets.filter((a) => a.kind === 'logo');
  if (!logos.length) out.push('No logo uploaded yet');
  else {
    const have = new Set(logos.map((l) => l.variant));
    const missing = NEEDED_LOGOS.filter((n) => !have.has(n.variant)).map((n) => n.label.toLowerCase());
    if (missing.length) out.push(`Logo set missing: ${missing.join(', ')}`);
  }
  if (!p.kit.colors.length) out.push('Brand colors not added');
  if (!p.kit.fonts.length) out.push('Brand fonts not added');
  return out;
}

export function formatBytes(n: number | null): string {
  if (!n) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}
