import type { SupabaseClient } from '@supabase/supabase-js';
import {
  BRAND_BUCKET,
  BRAND_URL_TTL,
  MAX_PROXY_BYTES,
  isImage,
  type BrandColor,
  type BrandFont,
  type BrandKind,
  type BrandKit,
  type BrandPayload,
  type LogoVariant,
} from '@/lib/portal/brand';
import { driveIdOf, driveViewUrl, previewUrl } from '@/lib/portal/drive';

/** Server-only half of the Brand page: reads rows and mints the links. */

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
 * The client's whole brand page with links. Three kinds of row:
 * - Drive (`storage_path` = "drive:<id>"): previews and small downloads go through
 *   our signed proxy; the team opens the file in Drive.
 * - Bucket (any other `storage_path`): a signed storage URL.
 * - Link (`external_url`): the link itself.
 * `ready: false` means the migration hasn't run.
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
  const sign = opts.sign !== false;
  const paths = rows.map((r) => r.storage_path).filter((p): p is string => Boolean(p) && !driveIdOf(p));
  const signed = new Map<string, string>();
  if (sign && paths.length) {
    const { data } = await db.storage.from(BRAND_BUCKET).createSignedUrls(paths, BRAND_URL_TTL);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  return {
    kit,
    ready: true,
    assets: rows.map((r) => {
      const driveId = driveIdOf(r.storage_path);
      let url: string | null = null;
      let thumbUrl: string | null = null;
      if (driveId) {
        if (sign) {
          const small = (r.size_bytes ?? 0) <= MAX_PROXY_BYTES;
          url = small ? previewUrl(r.id, 'file', BRAND_URL_TTL) : null;
          thumbUrl = isImage(r.filename, r.mime_type) && small ? url : previewUrl(r.id, 'thumb', BRAND_URL_TTL);
        }
      } else if (r.storage_path) {
        url = sign ? signed.get(r.storage_path) ?? null : null;
      } else {
        url = r.external_url;
      }
      return {
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
        url,
        thumbUrl,
        driveUrl: driveId ? driveViewUrl(driveId) : null,
      };
    }),
  };
}
