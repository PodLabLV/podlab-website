'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Card } from '@/components/portal/Shared';
import OnboardingField from '@/components/portal/OnboardingField';
import {
  BRAND_QUESTIONS,
  INTAKE_GROUPS,
  INTAKE_QUESTIONS,
  isAnswered,
  isShown,
  missingRequired,
  type Answers,
  type OnboardingQuestion,
} from '@/lib/portal/onboarding-questions';
import type { BrandMode, OnboardingState } from '@/lib/portal/onboarding-server';

/**
 * The three onboarding steps. Pure UI: the page hands it the loaded state and
 * the calls, so it renders the same with live data or a mock.
 *
 * 1. AssetsLab intake, one group at a time, prefilled from the application,
 *    saved as they type.
 * 2. Branding: upload what they have (the Brand manager, passed in as
 *    brandUpload) or "I need help" (the brand questionnaire).
 * 3. Confirm: what we'll build, then submit.
 */

export interface OnboardingApi {
  save: (p: { answers?: Answers; brandAnswers?: Answers }) => Promise<void>;
  brandMode: (mode: BrandMode) => Promise<void>;
  submit: () => Promise<{ queued: string[] }>;
  /** Upload one attachment to their Drive; resolves to the answer's new list, or null when uploads are off. */
  upload: (questionId: string, file: File, onProgress: (pct: number) => void) => Promise<string[] | null>;
}

/** The strategy call the old Typeform's end screen offered ("schedule clarity"). */
const CLARITY_CALL_URL = 'https://calendly.com/podlablv/strategy-call';

interface OnboardingFlowProps {
  initial: OnboardingState;
  firstName: string;
  api: OnboardingApi;
  brandUpload: ReactNode;
}

type Step = 0 | 1 | 2;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const btnPrimary =
  'portal-label bg-p-brand px-6 py-3.5 !text-[13px] text-black transition hover:bg-p-pop disabled:cursor-not-allowed disabled:opacity-40';
const btnGhost =
  'portal-label border border-p-line px-5 py-3 !text-[12px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink disabled:opacity-40';

const STEPS = ['Your business', 'Your brand', 'Confirm'];
const JOB_LABEL: Record<string, string> = { assetslab: 'Your AssetsLab', vsl_pack: 'Your VSL scripts', brand_kit: 'Your brand kit' };

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

function useAutosave(send: (v: Answers) => Promise<void>) {
  const [state, setState] = useState<SaveState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Answers | null>(null);

  const flush = useCallback(async () => {
    if (!pending.current) return;
    const v = pending.current;
    pending.current = null;
    setState('saving');
    try {
      await send(v);
      setState('saved');
    } catch {
      setState('error');
    }
  }, [send]);

  const queue = useCallback(
    (v: Answers) => {
      pending.current = v;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 800);
    },
    [flush],
  );

  // Leaving mid-debounce: send what's pending.
  useEffect(() => () => void flush(), [flush]);
  return { state, queue, flush };
}

function SaveNote({ state }: { state: SaveState }) {
  return (
    <span className="portal-label !text-[11px] text-p-ink/65" aria-live="polite">
      {state === 'saving' ? 'Saving' : state === 'saved' ? 'Saved' : state === 'error' ? <span className="text-p-bad">Not saved. Check your connection.</span> : 'Saves as you type'}
    </span>
  );
}

export default function OnboardingFlow({ initial, firstName, api, brandUpload }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>(0);
  const [group, setGroup] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initial.answers);
  const [brandAnswers, setBrandAnswers] = useState<Answers>(initial.brandAnswers);
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set(initial.prefilled));
  const [mode, setMode] = useState<BrandMode | null>(initial.brandMode);
  const [showMissing, setShowMissing] = useState(false);
  // "On file" answers (website, revenue…) open for editing only when asked.
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string[] | null>(initial.completedAt ? initial.jobs.map((j) => j.kind) : null);

  const intakeSave = useAutosave(useCallback((v: Answers) => api.save({ answers: v }), [api]));
  const brandSave = useAutosave(useCallback((v: Answers) => api.save({ brandAnswers: v }), [api]));

  // Prefilled answers are saved on first visit so the worker reads them from the row.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !initial.prefilled.length) return;
    seeded.current = true;
    intakeSave.queue(initial.answers);
  }, [initial, intakeSave]);

  const setAnswer = (id: string, v: string | string[]) => {
    const next = { ...answers, [id]: v };
    setAnswers(next);
    setPrefilled((s) => {
      if (!s.has(id)) return s;
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    intakeSave.queue(next);
  };
  const setBrandAnswer = (id: string, v: string | string[]) => {
    const next = { ...brandAnswers, [id]: v };
    setBrandAnswers(next);
    brandSave.queue(next);
  };

  const live = INTAKE_QUESTIONS.filter((q) => isShown(q, answers));
  const total = live.length;
  const answered = live.filter((q) => isAnswered(answers[q.id])).length;
  const missing = useMemo(() => missingRequired(INTAKE_QUESTIONS, answers), [answers]);
  const brandMissing = useMemo(() => (mode === 'help' ? missingRequired(BRAND_QUESTIONS, brandAnswers) : []), [mode, brandAnswers]);
  const missingIds = new Set([...missing, ...brandMissing].map((q) => q.id));

  // Overall progress: intake answers carry most of it, brand choice and confirm the rest.
  const pct = Math.round(((answered / total) * 0.7 + (mode ? 0.2 : 0) + (done ? 0.1 : 0)) * 100);

  const groupQs = live.filter((q) => q.group === INTAKE_GROUPS[group].id);
  const groupLeft = (gid: string) => live.filter((q) => q.group === gid && q.required && !isAnswered(answers[q.id])).length;
  const onFile = (q: OnboardingQuestion) => Boolean(q.askIfMissing && initial.prefilled.includes(q.id) && !editing.has(q.id) && isAnswered(answers[q.id]));

  const upload = async (q: OnboardingQuestion, file: File, onProgress: (pct: number) => void) => {
    await intakeSave.flush();
    const list = await api.upload(q.id, file, onProgress);
    if (list) setAnswers((a) => ({ ...a, [q.id]: list }));
    return list;
  };

  const go = async (s: Step) => {
    await Promise.all([intakeSave.flush(), brandSave.flush()]);
    setError(null);
    setStep(s);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const chooseMode = async (m: BrandMode) => {
    setMode(m);
    try {
      await api.brandMode(m);
    } catch {
      setError('Could not save that choice. Try again.');
    }
  };

  const submit = async () => {
    setShowMissing(true);
    if (missing.length || !mode || brandMissing.length) {
      setError(
        missing.length
          ? `Still needed in Your business: ${missing.map((q) => q.prompt).join('; ')}.`
          : !mode
            ? 'Pick how you want to handle your brand.'
            : `Still needed in Your brand: ${brandMissing.map((q) => q.prompt).join('; ')}.`,
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await Promise.all([intakeSave.flush(), brandSave.flush()]);
      const r = await api.submit();
      setDone(r.queued);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit. Your answers are saved; try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  const building = ['assetslab', ...(initial.vslBooking ? ['vsl_pack'] : []), ...(mode === 'help' ? ['brand_kit'] : [])];

  // ── Done
  if (done) {
    return (
      <div className="mx-auto max-w-3xl">
        <span className="portal-label block text-p-brandink">Onboarding complete</span>
        <h1 className="mt-4 text-3xl font-bold leading-[1.05] tracking-tight text-p-ink md:text-4xl">
          You&apos;re in, {firstName || 'welcome'}. <em className="portal-drama text-p-brandink">We take it from here.</em>
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-p-ink/80">
          Each item lands in Projects for your review. We&apos;ll let you know the moment one is ready.
        </p>
        <Card className="mt-8 divide-y divide-p-line">
          {(done.length ? done : building).map((k) => {
            const job = initial.jobs.find((j) => j.kind === k);
            return (
              <div key={k} className="flex items-center justify-between gap-4 p-5">
                <span className="text-base text-p-ink">{JOB_LABEL[k] ?? k}</span>
                <span className="portal-label !text-[11px] text-p-ink/70">
                  {job?.status === 'done' ? 'Ready to review' : job?.status === 'running' ? 'Building now' : job?.status === 'failed' ? 'With the team' : 'Queued'}
                </span>
              </div>
            );
          })}
        </Card>
        <Card className="mt-6 p-5">
          <p className="text-lg font-semibold text-p-ink">Want to walk through it live?</p>
          <p className="mt-1 text-[15px] leading-relaxed text-p-ink/75">Book a 30-minute clarity call and we go over your answers together.</p>
          <a href={CLARITY_CALL_URL} target="_blank" rel="noopener noreferrer" className={`${btnGhost} mt-4 inline-block`}>
            Book your clarity call
          </a>
        </Card>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/portal" className={btnPrimary}>
            Go to your dashboard
          </Link>
          <button className={btnGhost} onClick={() => { setDone(null); setStep(0); }}>
            Review my answers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <span className="portal-label block text-p-brandink">Welcome to PodLab</span>
      <h1 className="mt-4 text-3xl font-bold leading-[1.05] tracking-tight text-p-ink md:text-4xl">
        {firstName ? `${firstName}, let's` : "Let's"} build your <em className="portal-drama text-p-brandink">foundation.</em>
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-p-ink/80">
        Three short steps. We already filled in what you told us on your application, so you only answer what&apos;s missing.
        Your answers become your AssetsLab: your offer, your client, your voice, and a 90-day plan.
      </p>

      {/* Stepper + progress */}
      <div className="sticky top-0 z-10 -mx-4 mt-8 border-b border-p-line bg-p-paper/95 px-4 py-4 backdrop-blur md:mx-0 md:px-0">
        <ol className="flex gap-2" aria-label="Onboarding steps">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1">
              <button
                onClick={() => go(i as Step)}
                aria-current={step === i ? 'step' : undefined}
                className={`w-full border-t-2 pt-2 text-left transition ${step === i ? 'border-p-brandink text-p-ink' : i < step ? 'border-p-brandink/50 text-p-ink/75' : 'border-p-line text-p-ink/55'}`}
              >
                <span className="portal-label block !text-[11px]">Step {i + 1}</span>
                <span className="block text-[15px] font-medium">{label}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex items-center gap-4">
          <div className="h-1 flex-1 overflow-hidden bg-p-ink/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Onboarding progress">
            <div className="h-full bg-p-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="portal-label !text-[11px] text-p-ink/70">{pct}%</span>
          <SaveNote state={step === 1 ? brandSave.state : intakeSave.state} />
        </div>
      </div>

      {error && <p className="mt-6 border-l-2 border-p-warn bg-p-warn/5 px-4 py-3 text-base text-p-ink/90">{error}</p>}

      {/* ── Step 1: AssetsLab intake */}
      {step === 0 && (
        <section className="mt-8">
          <nav aria-label="Question groups" className="flex flex-wrap gap-2">
            {INTAKE_GROUPS.map((g, i) => {
              const left = groupLeft(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => setGroup(i)}
                  className={`portal-label border px-3 py-2 !text-[11px] transition ${i === group ? 'border-p-brandink text-p-brandink' : 'border-p-line text-p-ink/70 hover:text-p-ink'}`}
                >
                  {g.title}
                  {left > 0 ? <span className="ml-2 text-p-warn">{left}</span> : <svg className="ml-2 inline h-3 w-3 text-p-brandink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-label="complete"><path d="M5 12l5 5L20 7" /></svg>}
                </button>
              );
            })}
          </nav>

          <div className="mt-8">
            <h2 className="text-2xl font-bold tracking-tight text-p-ink">{INTAKE_GROUPS[group].title}</h2>
            <p className="mt-1 text-base text-p-ink/70">{INTAKE_GROUPS[group].intro}</p>
            <div className="mt-6 space-y-8">
              {groupQs.map((q) =>
                onFile(q) ? (
                  <div key={q.id} className="flex flex-wrap items-baseline justify-between gap-3 border-l-2 border-p-brandink/40 py-1 pl-5">
                    <span>
                      <span className="portal-label block !text-[11px] text-p-ink/65">{q.prompt} · on file</span>
                      <span className="mt-1 block text-base text-p-ink">{String(answers[q.id])}</span>
                    </span>
                    <button className="portal-label !text-[11px] text-p-brandink hover:text-p-ink" onClick={() => setEditing((s) => new Set(s).add(q.id))}>
                      Edit
                    </button>
                  </div>
                ) : (
                  <OnboardingField
                    key={q.id}
                    q={q}
                    value={answers[q.id]}
                    prefilled={prefilled.has(q.id)}
                    missing={showMissing && missingIds.has(q.id)}
                    onChange={(v) => setAnswer(q.id, v)}
                    onUpload={upload}
                  />
                ),
              )}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
            <button className={btnGhost} disabled={group === 0} onClick={() => setGroup((g) => Math.max(0, g - 1))}>
              Back
            </button>
            <span className="text-sm text-p-ink/65">
              {answered} of {total} answered{missing.length ? ` · ${missing.length} required left` : ''}
            </span>
            {group < INTAKE_GROUPS.length - 1 ? (
              <button className={btnPrimary} onClick={() => { setGroup((g) => g + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                Next: {INTAKE_GROUPS[group + 1].title}
              </button>
            ) : (
              <button className={btnPrimary} onClick={() => go(1)}>
                Next: your brand
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Step 2: branding */}
      {step === 1 && (
        <section className="mt-8">
          <h2 className="text-2xl font-bold tracking-tight text-p-ink">Your brand</h2>
          <p className="mt-1 text-base text-p-ink/70">Already have a logo, colors and fonts? Upload them. Starting out or due for a refresh? We&apos;ll build the kit with you.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {([
              ['upload', 'I have a brand', 'Upload your logo, colors and fonts. Takes two minutes.'],
              ['help', 'I need help with my brand', 'Answer a few questions and we design a brand kit for you to approve.'],
            ] as const).map(([m, title, body]) => (
              <button
                key={m}
                onClick={() => chooseMode(m)}
                aria-pressed={mode === m}
                className={`border p-5 text-left transition ${mode === m ? 'border-p-brandink bg-p-brand/10' : 'border-p-line hover:border-p-ink/40'}`}
              >
                <span className="block text-lg font-semibold text-p-ink">{title}</span>
                <span className="mt-1 block text-[15px] leading-relaxed text-p-ink/75">{body}</span>
              </button>
            ))}
          </div>

          {mode === 'upload' && <div className="mt-8">{brandUpload}</div>}

          {mode === 'help' && (
            <div className="mt-8 space-y-8">
              <p className="text-base text-p-ink/75">
                These feed our brand-kit build: a logo concept, a color system, a type pairing and a brand board, all for your approval. Have a logo you want to keep? Upload it below too.
              </p>
              {BRAND_QUESTIONS.map((q) => (
                <OnboardingField
                  key={q.id}
                  q={q}
                  value={brandAnswers[q.id]}
                  missing={showMissing && missingIds.has(q.id)}
                  onChange={(v) => setBrandAnswer(q.id, v)}
                />
              ))}
              <details className="border border-p-line p-5">
                <summary className="portal-label cursor-pointer !text-[12px] text-p-ink/80">Upload a logo or brand files anyway</summary>
                <div className="mt-6">{brandUpload}</div>
              </details>
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
            <button className={btnGhost} onClick={() => go(0)}>
              Back
            </button>
            <button className={btnPrimary} disabled={!mode} onClick={() => go(2)}>
              Next: confirm
            </button>
          </div>
        </section>
      )}

      {/* ── Step 3: confirm */}
      {step === 2 && (
        <section className="mt-8">
          <h2 className="text-2xl font-bold tracking-tight text-p-ink">What happens next</h2>
          <p className="mt-1 text-base text-p-ink/70">Submit and we start building. Each item comes to Projects for your review before it goes anywhere.</p>

          <Card className="mt-6 divide-y divide-p-line">
            {building.map((k) => (
              <div key={k} className="p-5">
                <p className="text-lg font-semibold text-p-ink">{JOB_LABEL[k]}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-p-ink/75">
                  {k === 'assetslab' && 'Your strategic foundation: ideal client, dialed-in offer, brand voice, 50 hooks, and a 90-day roadmap. A PDF in your Projects folder.'}
                  {k === 'vsl_pack' && initial.vslBooking &&
                    `For your ${initial.vslBooking.eventName} on ${formatWhen(initial.vslBooking.startAt)}: the VSL script, the confirmation video script and three FAQ video scripts.`}
                  {k === 'brand_kit' && 'A logo concept, color system, type pairing and brand board. Once you approve it, it becomes your brand kit here.'}
                </p>
              </div>
            ))}
          </Card>

          <dl className="mt-6 grid gap-px border border-p-line bg-p-line sm:grid-cols-3">
            {[
              ['Answers', `${answered} of ${total}`],
              ['Required left', String(missing.length + brandMissing.length)],
              ['Brand', mode === 'help' ? 'We build it' : mode === 'upload' ? 'Uploading mine' : 'Not chosen'],
            ].map(([k, v]) => (
              <div key={k} className="bg-p-card p-4">
                <dt className="portal-label !text-[11px] text-p-ink/65">{k}</dt>
                <dd className="mt-1 text-lg font-semibold text-p-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
            <button className={btnGhost} onClick={() => go(1)}>
              Back
            </button>
            <button className={btnPrimary} disabled={submitting} onClick={submit}>
              {submitting ? 'Sending' : 'Submit and start building'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
