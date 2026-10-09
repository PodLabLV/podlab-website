/**
 * Brand page: logos, brand kit (colors, fonts, guide, notes) and b-roll.
 * Shared by the portal route, the editors' read-only kit link and TipTop.
 */

export const BRAND_BUCKET = 'client-brand';
export const BRAND_URL_TTL = 3600;
/** Drive files bigger than this aren't proxied for download; the team opens them in Drive. */
export const MAX_PROXY_BYTES = 100 * 1024 * 1024;
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
  /** Signed, short-lived: the file itself (or the pasted link). Null when it's too big to proxy. */
  url: string | null;
  /** A small preview image for tiles (Drive thumbnails). */
  thumbUrl: string | null;
  /** The file in the client's PodLab OS Drive folder. Opens for the team, not the client. */
  driveUrl: string | null;
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

/** How long the Brand page waits for more uploads before one Slack post covers them all. */
export const BRAND_QUIET_MS = 120_000;

/**
 * Batching Brand pings without a queue. Each finished upload waits out the
 * quiet window, then looks at the client's files: if anything was added after
 * its own announce, a later upload will post (this one stays quiet). Otherwise
 * it posts every file in the run, walking back from the newest while the gaps
 * stay under the window plus slack (a long upload registers late).
 */
export function brandBurst<T extends { created_at: string }>(rows: T[], announcedAt: number, quietMs = BRAND_QUIET_MS): { post: boolean; rows: T[] } {
  const sorted = [...rows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  if (!sorted.length) return { post: false, rows: [] };
  if (Date.parse(sorted[0].created_at) > announcedAt) return { post: false, rows: [] };
  const run = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (Date.parse(run[run.length - 1].created_at) - Date.parse(sorted[i].created_at) > quietMs + 60_000) break;
    run.push(sorted[i]);
  }
  return { post: true, rows: run };
}
