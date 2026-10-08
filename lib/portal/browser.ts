'use client';

/**
 * Per-page data for Scripts and Deliverables.
 *
 * Fetched by the page that needs it instead of the shared PortalProvider, so the
 * dashboard doesn't pay for script bodies and the shared context stays small.
 * Every read goes through RLS. A table that doesn't exist yet (migration not
 * applied) reads as empty rather than breaking the page.
 */

import { getSupabaseBrowser } from '@/lib/supabase-browser';
import type {
  PortalScript,
  PortalScriptVersion,
  PortalScriptComment,
  PortalScriptApproval,
  PortalAssetVersion,
  PortalAssetComment,
} from '@/lib/portal/scripts';

type Result<T> = { data: T[] | null; error: { message: string } | null };

function rows<T>(r: Result<T>, label: string): T[] {
  if (r.error) {
    // Expected before 20261008_portal_scripts_deliverables.sql is applied.
    console.warn(`[portal] ${label}: ${r.error.message}`);
    return [];
  }
  return r.data ?? [];
}

export interface ScriptIndexData {
  scripts: PortalScript[];
  versions: Pick<PortalScriptVersion, 'id' | 'script_id' | 'version_no' | 'runtime_seconds' | 'word_count' | 'created_at'>[];
  openNotes: Pick<PortalScriptComment, 'id' | 'script_id' | 'version_id'>[];
}

export async function loadScriptIndex(): Promise<ScriptIndexData> {
  const db = getSupabaseBrowser();
  const [s, v, c] = await Promise.all([
    db.from('portal_scripts').select('*').order('sort_order').order('created_at', { ascending: false }),
    db.from('portal_script_versions').select('id, script_id, version_no, runtime_seconds, word_count, created_at'),
    db.from('portal_script_comments').select('id, script_id, version_id').eq('status', 'open'),
  ]);
  return {
    scripts: rows(s as Result<PortalScript>, 'scripts'),
    versions: rows(v as Result<ScriptIndexData['versions'][number]>, 'script versions'),
    openNotes: rows(c as Result<ScriptIndexData['openNotes'][number]>, 'script notes'),
  };
}

export interface ScriptDetailData {
  script: PortalScript | null;
  versions: PortalScriptVersion[];
  comments: PortalScriptComment[];
  approvals: PortalScriptApproval[];
}

export async function loadScript(id: string): Promise<ScriptDetailData> {
  const db = getSupabaseBrowser();
  const [s, v, c, a] = await Promise.all([
    db.from('portal_scripts').select('*').eq('id', id).maybeSingle(),
    db.from('portal_script_versions').select('*').eq('script_id', id).order('version_no', { ascending: false }),
    db.from('portal_script_comments').select('*').eq('script_id', id).order('created_at'),
    db.from('portal_script_approvals').select('id, version_id, script_id, approved_by_name, approved_at').eq('script_id', id),
  ]);
  if (s.error) console.warn(`[portal] script: ${s.error.message}`);
  return {
    script: (s.data as PortalScript | null) ?? null,
    versions: rows(v as Result<PortalScriptVersion>, 'script versions'),
    comments: rows(c as Result<PortalScriptComment>, 'script notes'),
    approvals: rows(a as Result<PortalScriptApproval>, 'script approvals'),
  };
}

export interface AssetReviewData {
  versions: PortalAssetVersion[];
  comments: PortalAssetComment[];
}

export async function loadAssetReview(): Promise<AssetReviewData> {
  const db = getSupabaseBrowser();
  const [v, c] = await Promise.all([
    db.from('portal_asset_versions').select('*').order('version_no', { ascending: false }),
    db.from('portal_asset_comments').select('*').order('created_at'),
  ]);
  return {
    versions: rows(v as Result<PortalAssetVersion>, 'deliverable versions'),
    comments: rows(c as Result<PortalAssetComment>, 'deliverable notes'),
  };
}

/** The current access token, read fresh so a refreshed session is never stale. */
export async function currentToken(): Promise<string | null> {
  const { data } = await getSupabaseBrowser().auth.getSession();
  return data.session?.access_token ?? null;
}

/** Authenticated JSON call to a portal route. Throws the route's own error message. */
export async function portalCall<T = unknown>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH',
  payload?: unknown,
): Promise<T> {
  const token = await currentToken();
  const res = await fetch(path, {
    method,
    headers: {
      ...(payload !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || 'Something went wrong.');
  return json as T;
}
