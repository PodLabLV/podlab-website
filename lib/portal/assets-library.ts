import type { SupabaseClient } from '@supabase/supabase-js';
import { deliveredFor } from '@/lib/delivered-server';
import { loadOnboarding } from '@/lib/portal/onboarding-server';

/**
 * The Assets tab's library: who they are (profile), their documents, and their
 * finished videos. Branding and b-roll come from the Brand loader directly.
 *
 * Placement follows portal_assets.library, which onApproved() sets when a
 * client approves something. Rows approved before that column existed fall
 * back to their file type.
 */

/** The profile an approved AssetsLab carries (the worker writes it into the job output). */
export const PROFILE_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'one_liner', label: 'What you do' },
  { key: 'offer', label: 'Core offer' },
  { key: 'ideal_client', label: 'Ideal client' },
  { key: 'outcome', label: 'The outcome' },
  { key: 'mechanism', label: 'Why it works' },
  { key: 'voice', label: 'Brand voice' },
  { key: 'mission', label: 'Mission' },
  { key: 'vision', label: 'Vision' },
  { key: 'values', label: 'Values' },
];

export interface LibraryDoc {
  id: string;
  title: string;
  lab: string | null;
  fileType: string;
  approvedAt: string | null;
  /** Open through GET /api/portal/deliverables?versionId= (a signed link). */
  versionId: string | null;
  url: string | null;
}

export interface AssetsLibrary {
  profile: {
    source: 'assetslab' | 'intake' | null;
    approvedAt: string | null;
    fields: Array<{ label: string; value: string }>;
  };
  onboardingDone: boolean;
  clarity: { available: boolean };
  docs: LibraryDoc[];
  scripts: Array<{ title: string; at: string | null; href: string }>;
  videos: Array<{ title: string; detail: string; at: string | null; href: string; url: string | null }>;
}

function text(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join(' · ');
  return v === null || v === undefined ? '' : String(v).trim();
}

export async function loadLibrary(db: SupabaseClient, clientId: string, crmLeadId: string | null): Promise<AssetsLibrary> {
  const [onboarding, client, assets, delivered] = await Promise.all([
    loadOnboarding(db, clientId, crmLeadId),
    db.from('portal_clients').select('document_url').eq('id', clientId).maybeSingle(),
    db.from('portal_assets').select('*').eq('client_id', clientId).eq('status', 'approved').order('approved_at', { ascending: false }),
    deliveredFor(db, clientId),
  ]);

  // Profile: the approved AssetsLab's, else the intake's own words.
  let profile: AssetsLibrary['profile'] = { source: null, approvedAt: null, fields: [] };
  if (onboarding.profile) {
    profile = {
      source: 'assetslab',
      approvedAt: onboarding.profileApprovedAt,
      fields: PROFILE_FIELDS.map((f) => ({ label: f.label, value: text(onboarding.profile?.[f.key]) })).filter((f) => f.value),
    };
  } else {
    const a = onboarding.answers;
    const offer = [text(a.core_offer), text(a.offer_price)].filter(Boolean).join(' · ');
    const fields = [
      { label: 'What you do', value: text(a.business_description) },
      { label: 'Core offer', value: offer },
      { label: 'Ideal client', value: text(a.dream_client) },
      { label: 'The outcome', value: text(a.outcome_delivered) },
      { label: 'Why it works', value: text(a.mechanism) },
      { label: 'Brand voice', value: [text(a.brand_adjectives), text(a.brand_tone)].filter(Boolean).join(' · ') },
    ].filter((f) => f.value);
    if (fields.length) profile = { source: 'intake', approvedAt: null, fields };
  }

  const rows = (assets.data ?? []) as Array<{
    id: string; title: string; lab: string | null; file_type: string | null; library?: string | null;
    approved_at: string | null; approved_version: number | null; url: string | null;
  }>;
  const versionIds = new Map<string, string>();
  const approvedRows = rows.filter((r) => r.approved_version);
  if (approvedRows.length) {
    const { data: versions } = await db
      .from('portal_asset_versions')
      .select('id, asset_id, version_no')
      .in('asset_id', approvedRows.map((r) => r.id));
    for (const v of (versions ?? []) as Array<{ id: string; asset_id: string; version_no: number }>) {
      const row = approvedRows.find((r) => r.id === v.asset_id);
      if (row && row.approved_version === v.version_no) versionIds.set(row.id, v.id);
    }
  }

  const placeOf = (r: (typeof rows)[number]) => r.library ?? ((r.file_type ?? '').toUpperCase() === 'VIDEO' ? 'videos' : 'docs');
  const docs: LibraryDoc[] = rows
    .filter((r) => placeOf(r) === 'docs' || placeOf(r) === 'branding')
    .map((r) => ({
      id: r.id,
      title: r.title,
      lab: r.lab,
      fileType: (r.file_type ?? 'PDF').toUpperCase(),
      approvedAt: r.approved_at,
      versionId: versionIds.get(r.id) ?? null,
      url: versionIds.has(r.id) ? null : r.url,
    }));

  const videoAssets = rows
    .filter((r) => placeOf(r) === 'videos')
    .map((r) => ({ title: r.title, detail: 'Approved', at: r.approved_at, href: '/portal/deliverables', url: null }));
  const videoCards = delivered
    .filter((d) => d.kind === 'video')
    .map((d) => ({ title: d.title, detail: d.detail, at: d.at, href: d.href, url: d.url ?? null }));

  return {
    profile,
    onboardingDone: Boolean(onboarding.completedAt),
    clarity: { available: Boolean(client.data?.document_url) },
    docs,
    scripts: delivered.filter((d) => d.kind === 'script').map((d) => ({ title: d.title, at: d.at, href: d.href })),
    videos: [...videoAssets, ...videoCards].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '')),
  };
}
