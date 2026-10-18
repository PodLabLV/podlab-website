import { NextResponse } from 'next/server';
import { reportError } from '@/lib/alerts';
import { SITE_URL } from '@/lib/portal-email';
import { admin } from '@/lib/portal-server';
import { resolvePublisher } from '@/lib/portal/server';
import { driveConfigured, fetchContent, folderIdFromUrl, openUploadSession, projectFolder, driveFolderUrl, type ProjectKind } from '@/lib/portal/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generation jobs: the Mac mini worker (scripts/portal-jobs-worker.py) and staff.
 * Auth: x-portal-publish-key (PORTAL_PUBLISH_KEY) or a staff session.
 *
 * The worker claims jobs and writes results straight to Supabase. It comes here
 * only for what needs the portal's Google identity (Vercel OIDC → Workload
 * Identity → portal-uploads@), which the Mac mini doesn't have:
 *
 * POST { intent: 'drive-session', jobId, filename, sizeBytes, mimeType }
 *      → { sessionUrl, folderId, folderUrl }  resumable upload into the client's
 *        Projects folder (03- Content / 04- Projects / <AssetsLab | VSL Pack | Brand Kit>)
 *      → { skipped: reason }  no Drive folder linked / Drive not configured
 * POST { intent: 'drive-file', jobId, driveFileId }  the bytes of an onboarding attachment the
 *        job's input names (mission/vision/values, materials), so the skill can read it
 * POST { intent: 'requeue', jobId }  staff: put a failed job back in the queue
 * GET  ?clientId=  staff: a client's jobs
 */

export async function GET(req: Request) {
  const db = admin();
  if (!(await resolvePublisher(req, db))) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const clientId = new URL(req.url).searchParams.get('clientId');
  let q = db.from('portal_jobs').select('id, client_id, kind, status, attempts, error, created_at, started_at, finished_at').order('created_at', { ascending: false }).limit(100);
  if (clientId) q = q.eq('client_id', clientId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data });
}

export async function POST(req: Request) {
  const db = admin();
  const publisher = await resolvePublisher(req, db);
  if (!publisher) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: { intent?: string; jobId?: string; filename?: string; sizeBytes?: number; mimeType?: string; driveFileId?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!p.jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

  const { data: job } = await db.from('portal_jobs').select('id, client_id, kind, status').eq('id', p.jobId).maybeSingle();
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (p.intent === 'requeue') {
    if (job.status === 'running') return NextResponse.json({ error: 'That job is running.' }, { status: 409 });
    const { error } = await db
      .from('portal_jobs')
      .update({ status: 'queued', attempts: 0, error: null, updated_at: new Date().toISOString() })
      .eq('id', job.id);
    if (error) return NextResponse.json({ error: 'Could not requeue.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // The client's onboarding attachments (mission/vision/values, materials), for the skill to read.
  // Only files the job's own input names, so a key can't be used to read the Drive at large.
  if (p.intent === 'drive-file') {
    if (job.status !== 'running' || !p.driveFileId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    const { data: full } = await db.from('portal_jobs').select('input').eq('id', job.id).maybeSingle();
    if (!JSON.stringify(full?.input ?? {}).includes(`/file/d/${p.driveFileId}/`)) return NextResponse.json({ error: 'Not part of this job.' }, { status: 403 });
    try {
      const res = await fetchContent(p.driveFileId, 'file');
      if (!res?.body) return NextResponse.json({ error: 'Could not read that file.' }, { status: 502 });
      return new Response(res.body, { headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream' } });
    } catch (err) {
      reportError('[portal] job drive file failed', err);
      return NextResponse.json({ error: 'Could not read that file.' }, { status: 502 });
    }
  }

  if (p.intent === 'drive-session') {
    // Only a job that is actually running gets an upload session.
    if (job.status !== 'running') return NextResponse.json({ error: 'Job is not running.' }, { status: 409 });
    if (!p.filename || typeof p.sizeBytes !== 'number') return NextResponse.json({ error: 'filename and sizeBytes required' }, { status: 400 });
    if (!driveConfigured()) return NextResponse.json({ skipped: 'Drive is not configured on this deployment.' });

    const { data: client } = await db.from('portal_clients').select('drive_folder_url').eq('id', job.client_id).maybeSingle();
    const root = folderIdFromUrl(client?.drive_folder_url);
    if (!root) return NextResponse.json({ skipped: 'No Drive folder is linked for this client.' });

    try {
      const folderId = await projectFolder(root, job.kind as ProjectKind);
      const sessionUrl = await openUploadSession({
        folderId,
        name: p.filename.replace(/[\\/]/g, '_').slice(0, 200),
        mimeType: p.mimeType || 'application/octet-stream',
        size: p.sizeBytes,
        origin: SITE_URL,
      });
      return NextResponse.json({ sessionUrl, folderId, folderUrl: driveFolderUrl(folderId) });
    } catch (err) {
      reportError('[portal] job drive session failed', err);
      return NextResponse.json({ error: 'Could not open a Drive upload.' }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}
