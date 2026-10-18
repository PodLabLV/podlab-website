import { NextResponse, after } from 'next/server';
import { reportError } from '@/lib/alerts';
import { admin, resolveCaller, viewAsId } from '@/lib/portal-server';
import { SITE_URL } from '@/lib/portal-email';
import { loadProjects } from '@/lib/portal/projects-server';
import { loadWallet } from '@/lib/portal/wallet-server';
import { syncReviewWaiting } from '@/lib/portal/review-notify';
import { editCost, editTypeFor, type EditType } from '@/lib/portal/credits';
import { openUploadSession } from '@/lib/portal/drive';
import { createDraft, draftFolder, driveRootOf, submitFootage } from '@/lib/portal/submissions-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Projects tab (portal v2, track B).
 *
 * GET   everything to review / in progress / approved, the credit wallet, and
 *       whether footage uploads go to their Drive folder.
 * POST  intent draft   → a draft submission (+ its Drive folder); refuses when the
 *                        wallet can't cover the edit, before anything uploads
 *       intent sign    → a resumable Drive upload session inside that folder
 *       intent submit  → spend credits, card in Editing, notify (lib/portal/submissions-server.ts)
 */

export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const [projects, wallet, root] = await Promise.all([
    loadProjects(db, caller.clientId),
    loadWallet(db, caller.clientId),
    driveRootOf(db, caller.clientId),
  ]);

  // Keep the 'waiting' notifications in step with the list. Never from a staff
  // preview (read-only), and never off a partial read (it would close rows that
  // still need the client).
  if (projects.complete && !viewAsId(req)) {
    const clientId = caller.clientId;
    after(() => syncReviewWaiting(db, clientId, projects.items));
  }

  return NextResponse.json({ items: projects.items, wallet, uploads: Boolean(root) });
}

/** Google lets the browser PUT only from the origin that opened the session. */
function uploadOrigin(req: Request): string {
  const o = req.headers.get('origin');
  const ok = o && (/^https:\/\/([a-z0-9-]+\.)?podlablv\.com$/.test(o) || /^https:\/\/podlab-site[a-z0-9-]*\.vercel\.app$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));
  return ok ? o! : SITE_URL;
}

interface PostPayload {
  intent?: 'draft' | 'sign' | 'submit';
  submissionId?: string;
  editType?: string;
  rush?: boolean;
  extraRounds?: number;
  title?: string;
  notes?: string;
  links?: unknown;
  filename?: string;
  sizeBytes?: number;
  mimeType?: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: PostPayload;
  try {
    p = (await req.json()) as PostPayload;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (p.submissionId && !UUID.test(p.submissionId)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  if (p.intent === 'draft') {
    const type = editTypeFor(p.editType);
    const cost = type ? editCost({ type: type.key as EditType, rush: p.rush === true, extraRounds: Number(p.extraRounds ?? 0) }) : null;
    const res = await createDraft(db, caller, { title: p.title, cost, withFolder: true });
    if (!res.ok) return NextResponse.json({ error: res.message }, { status: res.status });
    return NextResponse.json({ submissionId: res.id, uploads: res.uploads });
  }

  if (p.intent === 'sign') {
    const filename = (p.filename ?? '').trim();
    if (!p.submissionId || !filename) return NextResponse.json({ error: 'A submission and a filename are required.' }, { status: 400 });
    if (!p.sizeBytes || p.sizeBytes < 1) return NextResponse.json({ error: `${filename} is empty.` }, { status: 400 });
    const folderId = await draftFolder(db, caller.clientId, p.submissionId);
    if (!folderId) return NextResponse.json({ error: 'Uploads are not switched on for this account. Paste a link instead.' }, { status: 400 });
    try {
      const sessionUrl = await openUploadSession({ folderId, name: filename.slice(0, 200), mimeType: p.mimeType ?? '', size: p.sizeBytes, origin: uploadOrigin(req) });
      return NextResponse.json({ sessionUrl });
    } catch (err) {
      reportError('[portal] footage upload session failed', err instanceof Error ? err.message : err);
      return NextResponse.json({ error: 'Could not start that upload. Try again, or paste a link.' }, { status: 502 });
    }
  }

  if (p.intent === 'submit') {
    const res = await submitFootage(db, caller, p);
    if (!res.ok) return NextResponse.json({ error: res.message, code: res.code }, { status: res.status });
    return NextResponse.json(res);
  }

  return NextResponse.json({ error: 'Unknown intent' }, { status: 400 });
}
