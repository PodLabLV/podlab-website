import { NextResponse } from 'next/server';
import { copyOnboardingToFormspree } from '@/lib/portal/formspree';
import { reportError } from '@/lib/alerts';
import { admin, resolveCaller, resolveStaff, notifySlack, logToCrm } from '@/lib/portal-server';
import { notify, resolve } from '@/lib/portal/notify';
import { BRAND_QUESTIONS, INTAKE_QUESTIONS, missingRequired } from '@/lib/portal/onboarding-questions';
import { cleanAnswers, loadOnboarding, queueOnboardingJobs, type BrandMode, type JobKind } from '@/lib/portal/onboarding-server';
import { SITE_URL } from '@/lib/portal-email';
import { driveConfigured, driveViewUrl, folderIdFromUrl, getFile, onboardingFolder, openUploadSession } from '@/lib/portal/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Onboarding (/portal/welcome).
 *
 * GET   the questions' answers (saved over CRM prefill), brand choice, VSL booking, jobs.
 *       Staff: ?clientId=<id> to look at a client's.
 * POST  { intent: 'save', answers?, brandAnswers? }  autosave (full set per scope, last write wins)
 *       { intent: 'brand-mode', mode: 'upload' | 'help' }
 *       { intent: 'submit' }  validate, mark onboarding complete, queue generation jobs
 *       { intent: 'upload-session', questionId, filename, sizeBytes, mimeType }  Drive resumable session
 *         into 01- Company / Onboarding Uploads ({ target: 'none' } without a linked folder)
 *       { intent: 'upload-register', questionId, driveFileId }  attach the uploaded file to that answer
 */

export async function GET(req: Request) {
  const db = admin();
  const staffClient = new URL(req.url).searchParams.get('clientId');
  if (staffClient) {
    const staff = await resolveStaff(req, db);
    if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    const { data: c } = await db.from('portal_clients').select('id, crm_lead_id').eq('id', staffClient).maybeSingle();
    if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ onboarding: await loadOnboarding(db, c.id, c.crm_lead_id ?? null) });
  }
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  return NextResponse.json({ onboarding: await loadOnboarding(db, caller.clientId, caller.crmLeadId) });
}

/** Google lets the browser PUT only from the origin that opened the session (same rule as the Brand route). */
function uploadOrigin(req: Request): string {
  const o = req.headers.get('origin');
  const ok = o && (/^https:\/\/([a-z0-9-]+\.)?podlablv\.com$/.test(o) || /^https:\/\/podlab-site[a-z0-9-]*\.vercel\.app$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));
  return ok ? o! : SITE_URL;
}

interface PostPayload {
  intent?: 'save' | 'brand-mode' | 'submit' | 'upload-session' | 'upload-register';
  questionId?: string;
  filename?: string;
  sizeBytes?: number;
  mimeType?: string;
  driveFileId?: string;
  answers?: unknown;
  brandAnswers?: unknown;
  mode?: BrandMode;
}

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
  const now = new Date().toISOString();

  if (p.intent === 'save') {
    const patch: Record<string, unknown> = { client_id: caller.clientId, updated_at: now };
    if (p.answers !== undefined) patch.answers = cleanAnswers(INTAKE_QUESTIONS, p.answers);
    if (p.brandAnswers !== undefined) patch.brand_answers = cleanAnswers(BRAND_QUESTIONS, p.brandAnswers);
    const { error } = await db.from('portal_onboarding').upsert(patch, { onConflict: 'client_id' });
    if (error) {
      reportError('[onboarding] save failed', error.message);
      return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, savedAt: now });
  }

  // ── attachments (mission/vision/values, materials): straight to their Drive folder
  if (p.intent === 'upload-session' || p.intent === 'upload-register') {
    const q = p.questionId ? INTAKE_QUESTIONS.find((x) => x.id === p.questionId && x.kind === 'files') : null;
    if (!q) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    const { data: c } = await db.from('portal_clients').select('drive_folder_url').eq('id', caller.clientId).maybeSingle();
    const root = folderIdFromUrl(c?.drive_folder_url);
    if (!driveConfigured() || !root) return NextResponse.json({ target: 'none' });

    try {
      const folderId = await onboardingFolder(root);
      if (p.intent === 'upload-session') {
        if (!p.filename || typeof p.sizeBytes !== 'number' || p.sizeBytes <= 0) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
        if (p.sizeBytes > 2 * 1024 ** 3) return NextResponse.json({ error: 'Files over 2 GB: paste a link instead.' }, { status: 400 });
        const sessionUrl = await openUploadSession({ folderId, name: p.filename.replace(/[\\/]/g, '_').slice(0, 200), mimeType: p.mimeType ?? '', size: p.sizeBytes, origin: uploadOrigin(req) });
        return NextResponse.json({ target: 'drive', sessionUrl });
      }
      // Register: the file must really sit in this client's onboarding folder.
      if (!p.driveFileId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
      const f = await getFile(p.driveFileId);
      if (!f.parents?.includes(folderId) || f.trashed) return NextResponse.json({ error: 'That file is not in your folder.' }, { status: 403 });
      const { data: row } = await db.from('portal_onboarding').select('answers').eq('client_id', caller.clientId).maybeSingle();
      const answers = (row?.answers ?? {}) as Record<string, unknown>;
      const list = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
      const entry = `${f.name.replace(/::/g, ' ')}::${driveViewUrl(f.id)}`;
      const next = cleanAnswers(INTAKE_QUESTIONS, { ...answers, [q.id]: [...list.filter((e) => e !== entry), entry] });
      const { error } = await db.from('portal_onboarding').upsert({ client_id: caller.clientId, answers: next, updated_at: now }, { onConflict: 'client_id' });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, entry, answers: next });
    } catch (err) {
      reportError('[onboarding] upload failed', err);
      return NextResponse.json({ error: 'Could not upload that. Paste a link instead.' }, { status: 502 });
    }
  }

  if (p.intent === 'brand-mode') {
    if (p.mode !== 'upload' && p.mode !== 'help') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    const { error } = await db
      .from('portal_onboarding')
      .upsert({ client_id: caller.clientId, brand_mode: p.mode, updated_at: now }, { onConflict: 'client_id' });
    if (error) {
      reportError('[onboarding] brand mode failed', error.message);
      return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (p.intent === 'submit') {
    const state = await loadOnboarding(db, caller.clientId, caller.crmLeadId);
    if (!state.ready) return NextResponse.json({ error: 'Onboarding is being switched on. Try again shortly.' }, { status: 503 });

    // Prefilled answers count as answered, but they must be on the row the worker reads.
    const missing = missingRequired(INTAKE_QUESTIONS, state.answers);
    if (missing.length) {
      return NextResponse.json({ error: `A few answers are still needed: ${missing.map((q) => q.prompt).join('; ')}.`, missing: missing.map((q) => q.id) }, { status: 400 });
    }
    if (!state.brandMode) return NextResponse.json({ error: 'Choose how you want to handle your brand first.' }, { status: 400 });
    if (state.brandMode === 'help') {
      const brandMissing = missingRequired(BRAND_QUESTIONS, state.brandAnswers);
      if (brandMissing.length) {
        return NextResponse.json({ error: `The brand questions need: ${brandMissing.map((q) => q.prompt).join('; ')}.`, missing: brandMissing.map((q) => q.id) }, { status: 400 });
      }
    }

    const { error } = await db.from('portal_onboarding').upsert(
      {
        client_id: caller.clientId,
        answers: cleanAnswers(INTAKE_QUESTIONS, state.answers),
        brand_answers: cleanAnswers(BRAND_QUESTIONS, state.brandAnswers),
        submitted_at: state.submittedAt ?? now,
        submitted_by: caller.displayName,
        updated_at: now,
      },
      { onConflict: 'client_id' },
    );
    if (error) {
      reportError('[onboarding] submit failed', error.message);
      return NextResponse.json({ error: 'Could not submit. Your answers are saved; try again in a moment.' }, { status: 500 });
    }
    if (!state.completedAt) {
      await db.from('portal_clients').update({ onboarding_completed_at: now }).eq('id', caller.clientId);
    }

    const queued: JobKind[] = await queueOnboardingJobs(db, caller, state);
    const label: Record<JobKind, string> = { assetslab: 'AssetsLab', vsl_pack: 'VSL scripts', brand_kit: 'brand kit' };
    const building = queued.map((k) => label[k]);

    await Promise.all([
      resolve(caller.clientId, 'onboarding'),
      building.length
        ? notify(caller.clientId, {
            kind: 'onboarding',
            direction: 'done',
            title: `We're building your ${building.join(', ').replace(/, ([^,]*)$/, ' and $1')}`,
            body: 'You will get a note here when each one is ready to review.',
            link: '/portal/projects',
            ref: `onboarding:${caller.clientId}:submitted`,
          })
        : Promise.resolve(),
      notifySlack(
        `*Onboarding submitted* — ${caller.businessName}\n${caller.displayName}. Queued: ${building.join(', ') || 'nothing new (already queued)'}.` +
          (state.vslBooking ? `\nVSL shoot: ${state.vslBooking.eventName} ${state.vslBooking.startAt.slice(0, 10)}` : ''),
      ),
      logToCrm(db, caller, `Finished portal onboarding. Queued: ${building.join(', ') || 'nothing new'}.`),
      // The Formspree inbox copy: first submission only, never blocks the submit.
      state.submittedAt
        ? Promise.resolve(false)
        : copyOnboardingToFormspree({
            business: caller.businessName, name: caller.displayName, email: caller.email,
            questions: INTAKE_QUESTIONS, answers: state.answers,
            brandQuestions: BRAND_QUESTIONS, brandAnswers: state.brandAnswers, brandMode: state.brandMode,
          }).catch(() => false),
    ]);

    return NextResponse.json({ ok: true, queued });
  }

  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}
