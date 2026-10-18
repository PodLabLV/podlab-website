import type { SupabaseClient } from '@supabase/supabase-js';
import { reportError } from '@/lib/alerts';
import { notify, resolve } from '@/lib/portal/notify';
import type { BrandColor, BrandFont } from '@/lib/portal/brand';

/**
 * "Everything goes to the right spots once approved."
 *
 * Called by the approval flow (PATCH /api/portal/deliverables, decision
 * 'approved') after the approval is recorded. Decides where the approved item
 * lives in the Assets tab and copies what it carries into the place the rest of
 * the portal reads from:
 *
 *   brand kit  → colors + fonts merged into portal_brand_kits, the guide added
 *                to the Brand files, library 'branding'
 *   AssetsLab  → library 'docs', its profile becomes the Assets profile summary
 *   VSL pack   → library 'docs'
 *   a video    → library 'videos'
 *   other PDFs → library 'docs'
 *
 * Best effort: the approval already happened, so a routing failure is reported,
 * never thrown back at the client.
 */

export interface ApprovedAsset {
  id: string;
  client_id: string;
  title: string;
  lab?: string | null;
  file_type?: string | null;
  library?: string | null;
  source_job_id?: string | null;
  approved_version?: number | null;
}

interface JobRow {
  id: string;
  kind: 'assetslab' | 'vsl_pack' | 'brand_kit';
  output: {
    profile?: Record<string, unknown>;
    brand?: { colors?: BrandColor[]; fonts?: BrandFont[]; notes?: string };
    drive?: Array<{ name: string; driveFileId: string; role?: string }>;
  } | null;
}

const HEX = /^#[0-9a-f]{6}$/i;

export function libraryFor(asset: ApprovedAsset, jobKind: JobRow['kind'] | null): 'docs' | 'branding' | 'videos' {
  if (jobKind === 'brand_kit' || /brand ?(lab|kit)/i.test(asset.lab ?? '')) return 'branding';
  if ((asset.file_type ?? '').toUpperCase() === 'VIDEO') return 'videos';
  return 'docs';
}

/** Merge by hex / font name: what the client already set is kept, the kit only adds. */
export function mergeKit(
  current: { colors: BrandColor[]; fonts: BrandFont[] },
  add: { colors?: BrandColor[]; fonts?: BrandFont[] },
): { colors: BrandColor[]; fonts: BrandFont[] } {
  const colors = [...current.colors];
  for (const c of add.colors ?? []) {
    const hex = String(c?.hex ?? '').trim().toUpperCase();
    if (!HEX.test(hex) || colors.some((x) => x.hex.toUpperCase() === hex)) continue;
    colors.push({ hex, name: String(c.name ?? '').slice(0, 60) });
  }
  const fonts = [...current.fonts];
  for (const f of add.fonts ?? []) {
    const name = String(f?.name ?? '').trim().slice(0, 80);
    if (!name || fonts.some((x) => x.name.toLowerCase() === name.toLowerCase())) continue;
    fonts.push({ name, use: String(f.use ?? '').slice(0, 40) });
  }
  return { colors: colors.slice(0, 24), fonts: fonts.slice(0, 12) };
}

export async function onApproved(db: SupabaseClient, asset: ApprovedAsset, approvedBy: string): Promise<void> {
  try {
    let job: JobRow | null = null;
    if (asset.source_job_id) {
      const { data } = await db.from('portal_jobs').select('id, kind, output').eq('id', asset.source_job_id).maybeSingle();
      job = (data as JobRow | null) ?? null;
    }
    const library = libraryFor(asset, job?.kind ?? null);
    const now = new Date().toISOString();

    const { error: libErr } = await db.from('portal_assets').update({ library }).eq('id', asset.id);
    // Before migration 20261018_portal_v2_c the column doesn't exist: nothing else to route.
    if (libErr) {
      if (!/column .*library/i.test(libErr.message)) reportError('[portal] onApproved library failed', libErr.message);
      return;
    }

    if (job?.kind === 'brand_kit' && job.output?.brand) {
      const { data: kit } = await db.from('portal_brand_kits').select('colors, fonts, notes').eq('client_id', asset.client_id).maybeSingle();
      const merged = mergeKit(
        { colors: (kit?.colors as BrandColor[]) ?? [], fonts: (kit?.fonts as BrandFont[]) ?? [] },
        job.output.brand,
      );
      const { error } = await db.from('portal_brand_kits').upsert(
        {
          client_id: asset.client_id,
          colors: merged.colors,
          fonts: merged.fonts,
          // Never overwrite their own do's and don'ts.
          notes: (kit?.notes as string | null) || job.output.brand.notes?.slice(0, 4000) || null,
          updated_by: `${approvedBy} (approved brand kit)`,
          updated_at: now,
        },
        { onConflict: 'client_id' },
      );
      if (error) reportError('[portal] onApproved brand kit failed', error.message);

      // The guide and the board go in Brand files, so editors get them from the kit link too.
      const files = (job.output.drive ?? []).filter((f) => f.driveFileId);
      if (files.length) {
        const { data: existing } = await db
          .from('portal_brand_assets')
          .select('storage_path')
          .eq('client_id', asset.client_id)
          .in('storage_path', files.map((f) => `drive:${f.driveFileId}`));
        const have = new Set((existing ?? []).map((r: { storage_path: string }) => r.storage_path));
        const rows = files
          .filter((f) => !have.has(`drive:${f.driveFileId}`))
          .map((f) => ({
            client_id: asset.client_id,
            kind: 'guide',
            label: f.role === 'board' ? 'Brand board (PodLab)' : 'Brand guide (PodLab)',
            storage_path: `drive:${f.driveFileId}`,
            filename: f.name,
            uploaded_by: 'PodLab',
            uploaded_by_kind: 'staff',
          }));
        if (rows.length) {
          const { error: aErr } = await db.from('portal_brand_assets').insert(rows);
          if (aErr) reportError('[portal] onApproved brand files failed', aErr.message);
        }
      }
    }

    if (job?.kind === 'assetslab' && job.output?.profile) {
      const { error } = await db
        .from('portal_onboarding')
        .upsert({ client_id: asset.client_id, profile: job.output.profile, profile_approved_at: now, updated_at: now }, { onConflict: 'client_id' });
      if (error) reportError('[portal] onApproved profile failed', error.message);
    }

    const where = library === 'branding' ? 'Assets · Branding' : library === 'videos' ? 'Assets · Videos' : 'Assets · Docs';
    await Promise.all([
      resolve(asset.client_id, `asset:${asset.id}:v${asset.approved_version ?? 1}`),
      notify(asset.client_id, {
        kind: 'approved',
        direction: 'done',
        title: `${asset.title} is in your library`,
        body: `Approved and filed under ${where}.`,
        link: `/portal/assets#${library}`,
        ref: `asset:${asset.id}:filed`,
      }),
    ]);
  } catch (err) {
    reportError('[portal] onApproved threw', err);
  }
}
