// Asset builds TipTop can queue: a row in portal_jobs (track C owns the table
// and the Mac mini runner; docs/PORTAL-V2.md "Onboarding + generation"). The
// runner builds with the existing skills (assetslab, vsllab, brandkit) and the
// output lands in Projects for review. Server only, except the pure parts.
//
// Guarded: if portal_jobs isn't there yet, nothing is written and she offers to
// flag the request for the team instead.

import type { SupabaseClient } from '@supabase/supabase-js';

export const JOB_KINDS = ['assetslab', 'vsl_pack', 'brand_kit'] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export const JOB_LABELS: Record<JobKind, string> = {
  assetslab: 'AssetsLab (Clarity Document)',
  vsl_pack: 'VSL pack (script, confirmation, FAQ scripts)',
  brand_kit: 'Brand kit',
};

/** Statuses that mean "still going". Anything else (done, failed, cancelled…) is finished. */
const ACTIVE = new Set(['queued', 'pending', 'running', 'in_progress', 'processing']);
export const isActiveJob = (status: string | null | undefined) => ACTIVE.has(String(status ?? 'queued').toLowerCase());

/** Builds in a rolling 30 days; each one runs a long model job on the Mac mini. */
export const MAX_JOBS_30D = 4;

export interface JobRow {
  id: string;
  kind: string;
  status: string | null;
  created_at: string;
}

export function missingTable(err: { code?: string; message?: string } | null): boolean {
  return Boolean(err && (err.code === 'PGRST205' || err.code === '42P01' || /schema cache|does not exist/i.test(err.message ?? '')));
}

export async function loadJobs(db: SupabaseClient, clientId: string): Promise<{ ready: boolean; jobs: JobRow[] }> {
  const { data, error } = await db.from('portal_jobs').select('id, kind, status, created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(20);
  if (error) return { ready: false, jobs: [] };
  return { ready: true, jobs: (data ?? []) as JobRow[] };
}

/** Why a new build can't be queued right now, or null if it can. Pure. */
export function jobBlocker(kind: JobKind, jobs: JobRow[], now = Date.now()): string | null {
  const running = jobs.find((j) => j.kind === kind && isActiveJob(j.status));
  if (running) return `A ${JOB_LABELS[kind]} build is already ${running.status ?? 'queued'} (started ${running.created_at.slice(0, 10)}). It lands in Projects for review when it's done.`;
  const recent = jobs.filter((j) => now - Date.parse(j.created_at) < 30 * 86_400_000).length;
  if (recent >= MAX_JOBS_30D) return `${recent} builds were queued in the last 30 days. Flag this one for the team instead of queueing it.`;
  return null;
}

export async function queueJob(
  db: SupabaseClient,
  clientId: string,
  kind: JobKind,
  input: Record<string, unknown>,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const base = { client_id: clientId, kind, input };
  let res = await db.from('portal_jobs').insert(base).select('id').single();
  // No default on status in this schema: say it explicitly.
  if (res.error?.code === '23502') res = await db.from('portal_jobs').insert({ ...base, status: 'queued' }).select('id').single();
  if (res.error) return { ok: false, message: missingTable(res.error) ? 'Asset builds are not switched on yet.' : `queue failed: ${res.error.message}` };
  return { ok: true, id: (res.data as { id: string }).id };
}
