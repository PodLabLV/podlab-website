'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import TipTop, { type Mood } from '@/components/bottleneck/TipTop';
import RingToss, { type ThrowResult } from '@/components/bottleneck/RingToss';
import SmsConsent from '@/components/SmsConsent';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { captureUtm, getUtm } from '@/lib/utm';
import {
  CATEGORIES,
  QUESTIONS,
  ZONE_COLOR,
  ZONE_LABEL,
  categoryScores,
  getZone,
  rankedWeakest,
  totalScore,
  type Category,
} from '@/lib/bottleneck/questions';
import { nextPrize, type Prize } from '@/lib/bottleneck/prizes';
import { MAKE_LINES, MISS_LINES, NEAR_MISS_LINES, STREAK_LINES, THINKING_LINES, pick } from '@/lib/bottleneck/tiptop-lines';

type Phase = 'intro' | 'play' | 'question' | 'prize' | 'claim' | 'submitting' | 'results';

const MAKES_PER_PRIZE = 5;

interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  website: string;
  phone: string;
  smsConsent: boolean;
  password: string;
}

const EMPTY_CONTACT: Contact = {
  firstName: '',
  lastName: '',
  email: '',
  company: '',
  website: '',
  phone: '',
  smsConsent: false,
  password: '',
};

export default function BottleneckGame() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('intro');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const [answeredOption, setAnsweredOption] = useState<number | null>(null);

  const [makes, setMakes] = useState(0);
  const [misses, setMisses] = useState(0);
  const [throws, setThrows] = useState(0);
  const [streak, setStreak] = useState(0);
  const [makesSincePrize, setMakesSincePrize] = useState(0);

  const [prizesWon, setPrizesWon] = useState<Prize[]>([]);
  const [activePrize, setActivePrize] = useState<Prize | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);

  const [line, setLine] = useState("Ready to play, hotshot?");
  const [mood, setMood] = useState<Mood>('idle');
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');

  const lineSeq = useRef(0);
  const pendingSubmit = useRef(false);

  useEffect(() => {
    captureUtm();
  }, []);

  const answeredCount = Object.keys(answers).length;
  const remaining = QUESTIONS.filter((q) => !(q.id in answers));
  const weakest = useMemo(() => rankedWeakest(answers), [answers]);

  const say = useCallback((text: string, nextMood: Mood = 'idle') => {
    lineSeq.current += 1;
    setLine(text);
    setMood(nextMood);
  }, []);

  /* ── submission ─────────────────────────────────────────────────────── */

  const submit = useCallback(
    async (finalAnswers: Record<number, number>, person: Contact) => {
      setPhase('submitting');
      setSubmitError('');

      const scores = categoryScores(finalAnswers);
      const total = totalScore(finalAnswers);
      const zone = getZone(total);

      const answersMap: Record<string, number> = {};
      for (const [id, pts] of Object.entries(finalAnswers)) answersMap[`q${id}`] = pts;

      try {
        const res = await fetch('/api/assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: person.firstName,
            lastName: person.lastName,
            email: person.email,
            phone: person.phone || undefined,
            sms_consent: Boolean(person.phone.trim() && person.smsConsent),
            company: person.company || undefined,
            website: person.website || undefined,
            password: person.password || undefined,
            answers: answersMap,
            categoryScores: scores,
            totalScore: total,
            zone,
            ...getUtm(),
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to save your results');

        if (data.assessmentId) setAssessmentId(data.assessmentId);

        // Install the session so the portal link works, but stay on the results
        // panel — a brand-new lead dropped straight into /portal lands on an
        // empty workspace, which is a worse first impression than their score.
        if (data.session?.access_token && data.session?.refresh_token) {
          try {
            await getSupabaseBrowser().auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });
          } catch (err) {
            console.warn('Session install failed:', err);
          }
        }

        setPhase('results');
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
        setPhase('results');
      }
    },
    []
  );

  /* ── the loop ───────────────────────────────────────────────────────── */

  const handleThrow = useCallback(
    (result: ThrowResult) => {
      setThrows((t) => t + 1);

      if (result.made) {
        const nextStreak = streak + 1;
        const nextSincePrize = makesSincePrize + 1;
        setMakes((m) => m + 1);
        setStreak(nextStreak);

        if (nextSincePrize >= MAKES_PER_PRIZE) {
          const prize = nextPrize(
            weakest,
            prizesWon.map((p) => p.category)
          );
          setMakesSincePrize(0);
          if (prize) {
            setPrizesWon((p) => [...p, prize]);
            setActivePrize(prize);
            say(prize.callout, 'cheer');
            setPhase('prize');
            return;
          }
          say("You've cleaned me out, hotshot. No prizes left. Finish the job.", 'hype');
          return;
        }

        setMakesSincePrize(nextSincePrize);
        say(STREAK_LINES[nextStreak] ?? pick(MAKE_LINES), nextStreak >= 3 ? 'hype' : 'idle');
        return;
      }

      // Miss — the toll is a question.
      setStreak(0);
      setMisses((m) => m + 1);
      const question = remaining[0];
      if (!question) {
        say('Out of questions. That is the whole diagnostic.', 'hype');
        return;
      }
      say(result.nearMiss ? pick(NEAR_MISS_LINES) : pick(MISS_LINES), 'smirk');
      setActiveQuestionId(question.id);
      setAnsweredOption(null);
      setPhase('question');
    },
    [streak, makesSincePrize, weakest, prizesWon, remaining, say]
  );

  const answerQuestion = useCallback(
    async (questionId: number, points: number) => {
      setAnsweredOption(points);
      const updated = { ...answers, [questionId]: points };
      setAnswers(updated);

      // Static line immediately; the AI line replaces it if it arrives first.
      const seq = ++lineSeq.current;
      setLine(pick(THINKING_LINES));
      setMood('thinking');

      fetch('/api/tiptop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, points }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.line && lineSeq.current === seq) {
            setLine(d.line);
            setMood(points >= 4 ? 'hype' : 'smirk');
          }
        })
        .catch(() => {});

      const done = Object.keys(updated).length >= QUESTIONS.length;

      window.setTimeout(() => {
        if (done) {
          setActiveQuestionId(null);
          pendingSubmit.current = true;

          // Finisher guarantee. Ring skill decides how MANY prizes you win, never
          // whether you win one — someone who answered all twenty honestly and
          // never found the range still walks away paid.
          if (prizesWon.length === 0) {
            const prize = nextPrize(rankedWeakest(updated), []);
            if (prize) {
              setPrizesWon([prize]);
              setActivePrize(prize);
              say("You never found the range. Doesn't matter — you went twenty for twenty honest. That earns one.", 'cheer');
              setPhase('prize');
              return;
            }
          }

          if (claimed) {
            pendingSubmit.current = false;
            submit(updated, contact);
          } else {
            setPhase('claim');
          }
          return;
        }
        setActiveQuestionId(null);
        setPhase('play');
      }, 1500);
    },
    [answers, claimed, contact, prizesWon.length, submit, say]
  );

  const finishPrize = useCallback(() => {
    setActivePrize(null);
    if (!claimed) {
      setPhase('claim');
      return;
    }
    if (pendingSubmit.current) {
      pendingSubmit.current = false;
      submit(answers, contact);
      return;
    }
    setPhase('play');
    say(pick(MAKE_LINES), 'idle');
  }, [claimed, answers, contact, submit, say]);

  const handleClaim = useCallback(
    (person: Contact) => {
      setContact(person);
      setClaimed(true);
      if (pendingSubmit.current) {
        pendingSubmit.current = false;
        submit(answers, person);
        return;
      }
      setPhase('play');
      say(`Locked in, ${person.firstName}. Back to the table.`, 'hype');
    },
    [answers, submit, say]
  );

  /* ── screens ────────────────────────────────────────────────────────── */

  if (phase === 'intro') {
    return (
      <Shell>
        <div className="max-w-3xl mx-auto text-center pt-10 pb-20">
          <TipTop mood="hype" className="w-40 sm:w-52 mx-auto" />
          <h1 className="mt-8 font-display text-2xl sm:text-4xl uppercase tracking-wider">
            The Founder <span className="text-accent">Bottleneck</span>
          </h1>
          <p className="mt-5 text-xl sm:text-2xl text-accent font-display">Ready to play, hotshot?</p>
          <div className="mt-8 text-text-secondary leading-relaxed space-y-4 text-left sm:text-center">
            <p>
              I am TipTop. I run this table. Here is the deal, and I am only explaining it once.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 pt-2 text-left">
              <Rule n="1" title="Land 5 rings, win a prize">
                Real ones. AssetsLab, a free VSL, a strategy session, a website, ad videos.
              </Rule>
              <Rule n="2" title="Miss a ring, pay the toll">
                You answer one honest question about how your business actually runs.
              </Rule>
              <Rule n="3" title="20 questions ends it">
                Then I tell you exactly what is holding you hostage, and what to do about it.
              </Rule>
            </div>
            <p className="pt-2 text-sm text-text-tertiary">
              No email to start. It gets harder every time you win. I want you to win anyway.
            </p>
          </div>
          <button
            onClick={() => {
              setPhase('play');
              say('Step up. Let me see that arm.', 'hype');
            }}
            className="mt-10 px-12 py-4 rounded-lg bg-accent text-black font-display text-sm uppercase tracking-[0.2em] hover:bg-accent-hover transition"
          >
            Step up
          </button>
        </div>
      </Shell>
    );
  }

  if (phase === 'results') {
    const scores = categoryScores(answers);
    const total = totalScore(answers);
    const zone = getZone(total);
    const primary = weakest[0];

    return (
      <Shell>
        <div className="max-w-4xl mx-auto pb-24">
          <div className="text-center pt-6">
            <TipTop mood="hype" className="w-28 mx-auto" />
            <Bubble>
              {total >= 75
                ? `${contact.firstName}, you run a real machine. The gaps are small — but they are still gaps.`
                : total >= 50
                ? `${contact.firstName}, you have built momentum. You are also still the engine. Here is the proof.`
                : `${contact.firstName}, straight up: the business runs on you. That is fixable, and here is where to start.`}
            </Bubble>
          </div>

          <div className="mt-8 rounded-2xl border-2 p-8 text-center" style={{ borderColor: `${ZONE_COLOR[zone]}55` }}>
            <div className="text-6xl sm:text-8xl font-black" style={{ color: ZONE_COLOR[zone] }}>
              {total}
            </div>
            <div className="text-text-tertiary text-sm mt-1">out of 100</div>
            <div
              className="inline-block mt-4 px-5 py-2 rounded-lg border-2"
              style={{ borderColor: ZONE_COLOR[zone], background: `${ZONE_COLOR[zone]}15` }}
            >
              <span className="font-bold" style={{ color: ZONE_COLOR[zone] }}>
                {ZONE_LABEL[zone]}
              </span>
              <span className="text-white/50 text-sm ml-2">— {zone} Zone</span>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {CATEGORIES.map((cat) => {
              const score = scores[cat];
              const pctFull = (score / 20) * 100;
              const isPrimary = cat === primary;
              return (
                <div key={cat} className="rounded-lg border border-border bg-bg-secondary p-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className={`text-sm font-bold ${isPrimary ? 'text-accent' : 'text-text-primary'}`}>
                      {cat}
                      {isPrimary && <span className="ml-2 text-[10px] uppercase tracking-widest">← your bottleneck</span>}
                    </span>
                    <span className="text-text-tertiary text-sm tabular-nums">{score}/20</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1f1f1f] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pctFull}%`, background: score <= 8 ? '#FF4444' : score <= 14 ? '#FFB800' : '#2ADD1B' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {prizesWon.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-sm uppercase tracking-widest text-accent mb-4">What you won</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {prizesWon.map((p) => (
                  <div key={p.category} className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                    <div className="font-bold text-text-primary">{p.name}</div>
                    <div className="text-text-tertiary text-xs mt-1">{p.blurb}</div>
                  </div>
                ))}
              </div>
              <p className="text-text-tertiary text-xs mt-3">
                We emailed these to {contact.email}. They are yours whether or not you book anything.
              </p>
            </div>
          )}

          <div className="mt-10 rounded-xl border border-border bg-bg-secondary p-6">
            <div className="flex gap-4 items-start">
              <TipTop mood="smirk" className="w-16 shrink-0 hidden sm:block" />
              <div>
                <p className="text-text-secondary leading-relaxed">
                  Your full breakdown, the 90-day roadmap and my written diagnosis are being generated right
                  now. I will walk you through all of it — and then I am going to ask you to book a call,
                  because a roadmap you do not act on is just a nicely formatted regret.
                </p>
                <div className="flex flex-wrap gap-3 mt-5">
                  {assessmentId && (
                    <a
                      href={`/assessment/results/${assessmentId}`}
                      className="px-6 py-3 rounded-lg bg-accent text-black font-display text-xs uppercase tracking-[0.15em] hover:bg-accent-hover transition"
                    >
                      See the full breakdown
                    </a>
                  )}
                  <a
                    href="https://calendly.com/podlablv/strategy-call"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-lg border border-accent/40 text-accent font-display text-xs uppercase tracking-[0.15em] hover:bg-accent/10 transition"
                  >
                    Book the call
                  </a>
                </div>
                {submitError && (
                  <p className="text-[#FF6B6B] text-xs mt-4">
                    {submitError} — your score is on screen, but email info@podlablv.com so we can recover it.
                  </p>
                )}
              </div>
            </div>
          </div>

          <p className="text-center text-text-tertiary text-xs mt-8">
            {throws} throws · {makes} landed · {misses} missed · {prizesWon.length} prizes
          </p>
        </div>
      </Shell>
    );
  }

  if (phase === 'submitting') {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center pt-20">
          <TipTop mood="thinking" className="w-32 mx-auto" />
          <Bubble>Crunching it. Do not close this.</Bubble>
          <div className="mt-8 h-1 w-48 mx-auto rounded-full bg-[#1f1f1f] overflow-hidden">
            <div className="h-full w-1/3 bg-accent animate-[slide_1.1s_ease-in-out_infinite]" />
          </div>
          <style>{`@keyframes slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }`}</style>
        </div>
      </Shell>
    );
  }

  const activeQuestion = QUESTIONS.find((q) => q.id === activeQuestionId) ?? null;

  return (
    <Shell>
      <div className="max-w-3xl mx-auto pb-16">
        {/* HUD */}
        <div className="flex items-center justify-between gap-4 text-xs text-text-tertiary">
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-widest">Next prize</span>
            <div className="flex gap-1">
              {Array.from({ length: MAKES_PER_PRIZE }).map((_, i) => (
                <span
                  key={i}
                  className={`block w-4 h-1.5 rounded-full ${i < makesSincePrize ? 'bg-accent' : 'bg-[#242424]'}`}
                />
              ))}
            </div>
          </div>
          <div className="uppercase tracking-widest">
            <span className="text-accent tabular-nums">{answeredCount}</span>/{QUESTIONS.length} answered
          </div>
        </div>
        <div className="mt-2 h-1 rounded-full bg-[#141414] overflow-hidden">
          <div
            className="h-full bg-accent/70 transition-all duration-500"
            style={{ width: `${(answeredCount / QUESTIONS.length) * 100}%` }}
          />
        </div>

        {/* host */}
        <div className="mt-6 flex items-end gap-3">
          <TipTop mood={mood} className="w-20 sm:w-24 shrink-0" />
          <Bubble compact>{line}</Bubble>
        </div>

        {/* table */}
        <div className="mt-6 rounded-2xl border border-border bg-gradient-to-b from-[#0d1410] to-[#080808] p-5 sm:p-7">
          <RingToss
            level={prizesWon.length}
            disabled={phase !== 'play'}
            ringsLanded={makes}
            onResult={handleThrow}
          />
        </div>

        {prizesWon.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            {prizesWon.map((p) => (
              <span
                key={p.category}
                className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border border-accent/30 text-accent bg-accent/5"
              >
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* question overlay */}
      {phase === 'question' && activeQuestion && (
        <Overlay>
          <div className="w-full max-w-2xl">
            <div className="text-[10px] uppercase tracking-[0.3em] text-accent mb-3">
              Question {answeredCount + (answeredOption == null ? 1 : 0)} of {QUESTIONS.length}
            </div>
            <h2 className="font-display text-lg sm:text-2xl leading-snug">{activeQuestion.text}</h2>
            <p className="text-text-tertiary text-sm mt-3">{activeQuestion.subtext}</p>
            <div className="mt-6 space-y-2.5">
              {activeQuestion.options.map((opt) => {
                const chosen = answeredOption === opt.points;
                const locked = answeredOption != null;
                return (
                  <button
                    key={opt.text}
                    disabled={locked}
                    onClick={() => answerQuestion(activeQuestion.id, opt.points)}
                    className={`w-full text-left px-5 py-4 rounded-lg border transition
                      ${chosen ? 'border-accent bg-accent/15 text-text-primary' : 'border-border bg-bg-secondary hover:border-accent/50 text-text-secondary'}
                      ${locked && !chosen ? 'opacity-35' : ''}`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
            {answeredOption != null && (
              <div className="mt-6 flex items-end gap-3">
                <TipTop mood={mood} className="w-16 shrink-0" />
                <Bubble compact>{line}</Bubble>
              </div>
            )}
          </div>
        </Overlay>
      )}

      {/* prize overlay */}
      {phase === 'prize' && activePrize && (
        <Overlay>
          <div className="w-full max-w-lg text-center">
            <div className="text-[10px] uppercase tracking-[0.35em] text-accent">Five rings. Paid.</div>
            <TipTop mood="cheer" className="w-32 mx-auto mt-4" />
            <div className="mt-6 rounded-2xl border-2 border-accent bg-accent/10 p-8">
              <div className="font-display text-xl sm:text-2xl text-accent">{activePrize.name}</div>
              <p className="text-text-secondary text-sm mt-3">{activePrize.blurb}</p>
            </div>
            <Bubble>{activePrize.callout}</Bubble>
            <button
              onClick={finishPrize}
              className="mt-7 px-10 py-3.5 rounded-lg bg-accent text-black font-display text-xs uppercase tracking-[0.2em] hover:bg-accent-hover transition"
            >
              {pendingSubmit.current ? 'Show me the damage' : claimed ? 'Keep playing' : 'Claim it'}
            </button>
          </div>
        </Overlay>
      )}

      {/* claim gate */}
      {phase === 'claim' && (
        <Overlay>
          <ClaimForm
            initial={contact}
            finishing={pendingSubmit.current}
            onSubmit={handleClaim}
          />
        </Overlay>
      )}
    </Shell>
  );
}

/* ── chrome ───────────────────────────────────────────────────────────── */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-text-primary px-4 py-8 sm:py-12 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          background:
            'radial-gradient(70% 45% at 50% 0%, rgba(42,221,27,0.10) 0%, rgba(0,0,0,0) 70%)',
        }}
      />
      <div className="relative">{children}</div>
    </main>
  );
}

function Bubble({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div
      className={`relative rounded-xl border border-accent/25 bg-[#0e150e] text-text-secondary ${
        compact ? 'px-4 py-3 text-sm flex-1' : 'mt-5 px-5 py-4 inline-block'
      }`}
    >
      {children}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/88 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full flex justify-center animate-[pop_240ms_cubic-bezier(.2,.9,.3,1.2)]">
        {children}
      </div>
      <style>{`@keyframes pop { from { opacity:0; transform: translateY(14px) scale(.98) } to { opacity:1; transform:none } }`}</style>
    </div>
  );
}

function Rule({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-bg-secondary p-4">
      <div className="w-6 h-6 rounded-full bg-accent text-black text-xs font-bold grid place-items-center">{n}</div>
      <div className="font-bold text-sm mt-3 text-text-primary">{title}</div>
      <div className="text-text-tertiary text-xs mt-1.5 leading-relaxed">{children}</div>
    </div>
  );
}

function ClaimForm({
  initial,
  finishing,
  onSubmit,
}: {
  initial: Contact;
  finishing: boolean;
  onSubmit: (c: Contact) => void;
}) {
  const [form, setForm] = useState<Contact>(initial);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => setForm((f) => ({ ...f, [k]: v }));

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('First name, last name and email — that is all I need.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('That email does not look real, hotshot.');
      return;
    }
    if (form.password && form.password.length < 8) {
      setError('Password needs 8 characters or more.');
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={go} className="w-full max-w-md">
      <div className="text-center">
        <TipTop mood="smirk" className="w-24 mx-auto" />
        <h2 className="font-display text-lg uppercase tracking-wider mt-4">
          {finishing ? 'Last thing' : 'Claim it'}
        </h2>
        <p className="text-text-secondary text-sm mt-3">
          {finishing
            ? 'You answered all twenty. Tell me where to send the diagnosis.'
            : 'I am not mailing a prize into the void. Name and email, then back to the table.'}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" value={form.firstName} onChange={(v) => set('firstName', v)} autoFocus />
          <Field label="Last name" value={form.lastName} onChange={(v) => set('lastName', v)} />
        </div>
        <Field label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} />

        {!more && (
          <button
            type="button"
            onClick={() => setMore(true)}
            className="text-accent text-xs hover:underline"
          >
            + Add your company and website — it sharpens the diagnosis
          </button>
        )}

        {more && (
          <div className="space-y-3 pt-1">
            <Field label="Company" value={form.company} onChange={(v) => set('company', v)} />
            <Field
              label="Website"
              value={form.website}
              onChange={(v) => set('website', v)}
              placeholder="yourcompany.com"
            />
            <Field label="Phone (optional)" value={form.phone} onChange={(v) => set('phone', v)} />
            {form.phone.trim() && (
              <SmsConsent checked={form.smsConsent} onChange={(c) => set('smsConsent', c)} id="claim-sms" />
            )}
            <Field
              label="Password (optional — for your portal)"
              type="password"
              value={form.password}
              onChange={(v) => set('password', v)}
            />
          </div>
        )}
      </div>

      {error && <p className="text-[#FF6B6B] text-xs mt-4">{error}</p>}

      <button
        type="submit"
        className="mt-6 w-full py-4 rounded-lg bg-accent text-black font-display text-xs uppercase tracking-[0.2em] hover:bg-accent-hover transition"
      >
        {finishing ? 'Show me the damage' : 'Claim and keep playing'}
      </button>
      <p className="text-text-tertiary text-[11px] mt-3 text-center">
        No spam. Your results and prizes, and that is it.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-widest text-text-tertiary mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-[#0f0f0f] border border-border text-text-primary text-sm
                   focus:border-accent focus:outline-none transition"
      />
    </label>
  );
}
