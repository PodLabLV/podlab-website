'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';

// ============================================
// ESSENTIALSLAB ASSESSMENT
// Branded discovery capture — replaces a Typeform.
// 4 steps, no scoring. POSTs to /api/essentialslab-assessment.
// ============================================

const CHANNEL_OPTIONS = ['Instagram', 'Facebook', 'LinkedIn', 'YouTube', 'TikTok', 'Email', 'Other'] as const;

const STEPS = [
  'You & your business',
  'What you sell & to whom',
  "Where you're stuck",
  'Voice & wrap',
] as const;

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  website: string;
  yearsInBusiness: string;
  revenueBand: string;
  phone: string;
  whatYouDo: string;
  coreOffer: string;
  dreamClient: string;
  topPain: string;
  outcome: string;
  topGoal: string;
  marketingGap: string;
  biggestBottleneck: string;
  channels: string[];
  brandWords: string;
  anythingElse: string;
  contactPref: string;
}

const INITIAL_STATE: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  businessName: '',
  website: '',
  yearsInBusiness: '',
  revenueBand: '',
  phone: '',
  whatYouDo: '',
  coreOffer: '',
  dreamClient: '',
  topPain: '',
  outcome: '',
  topGoal: '',
  marketingGap: '',
  biggestBottleneck: '',
  channels: [],
  brandWords: '',
  anythingElse: '',
  contactPref: '',
};

const inputClass =
  'w-full px-4 py-3 bg-bg-secondary border-2 border-border rounded-xl text-white placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors';
const labelClass = 'block text-sm font-medium text-text-secondary mb-2';
const textareaClass = `${inputClass} resize-y min-h-[96px]`;

export default function EssentialsLabAssessmentPage() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [stepError, setStepError] = useState('');
  const [success, setSuccess] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStepError('');
    setSubmitError('');
  };

  const toggleChannel = (channel: string) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  // Step 1 has the required fields — gate forward navigation there.
  const validateStep1 = (): boolean => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.revenueBand) {
      setStepError('First name, last name, email, and revenue band are required to continue.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep1()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepError('');
    setSubmitError('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateStep1()) {
      setStep(0);
      return;
    }

    setSubmitting(true);

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      businessName: form.businessName || undefined,
      website: form.website || undefined,
      yearsInBusiness: form.yearsInBusiness || undefined,
      revenueBand: form.revenueBand,
      phone: form.phone || undefined,
      whatYouDo: form.whatYouDo || undefined,
      coreOffer: form.coreOffer || undefined,
      dreamClient: form.dreamClient || undefined,
      topPain: form.topPain || undefined,
      outcome: form.outcome || undefined,
      topGoal: form.topGoal || undefined,
      marketingGap: form.marketingGap || undefined,
      biggestBottleneck: form.biggestBottleneck || undefined,
      channels: form.channels.length ? form.channels : undefined,
      brandWords: form.brandWords || undefined,
      anythingElse: form.anythingElse || undefined,
      contactPref: form.contactPref || undefined,
    };

    // Capture attribution (e.g. which person's business-card QR this came from)
    const utm =
      typeof window !== 'undefined'
        ? (() => {
            const p = new URLSearchParams(window.location.search);
            return {
              utm_source: p.get('utm_source') || undefined,
              utm_medium: p.get('utm_medium') || undefined,
              utm_content: p.get('utm_content') || undefined,
              utm_campaign: p.get('utm_campaign') || undefined,
            };
          })()
        : {};

    try {
      const res = await fetch('/api/essentialslab-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, ...utm }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit. Please try again.');
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // INTRO SCREEN
  // ==========================================
  if (!started) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <section className="relative pt-32 pb-24 px-6 min-h-[80vh] flex items-center overflow-hidden bg-gradient-to-b from-black to-bg-secondary">
          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <div className="text-sm uppercase tracking-[0.25em] text-accent font-bold mb-6 font-display">
              EssentialsLab Assessment
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-8 leading-[0.95] tracking-tight">
              <span className="text-accent drop-shadow-[0_0_30px_rgba(42,221,27,0.5)]">$1M</span> is the
              <br className="hidden md:block" /> starting line.
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary mb-10 max-w-3xl mx-auto font-light leading-relaxed">
              Tell us where you are and where you&apos;re stuck. We&apos;ll review it and map your fastest path to a
              system that sells without you.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="group px-10 py-5 md:px-16 md:py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(42,221,27,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
            >
              <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Start Assessment →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            </button>
            <p className="text-sm text-text-secondary mt-8">4 quick steps · No score, just a conversation starter</p>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================
  // SUCCESS SCREEN
  // ==========================================
  if (success) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-black to-bg-secondary min-h-screen">
          <div className="max-w-2xl mx-auto">
            <div className="bg-bg-tertiary border-2 border-accent/40 rounded-2xl p-10 md:p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center">
                <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                Got it, <span className="text-accent">{form.firstName || 'there'}</span> — we&apos;ll review and reach
                out.
              </h2>
              <p className="text-lg text-text-secondary mb-8 max-w-md mx-auto">
                Want to fast-track? Book a strategy call and we&apos;ll walk through your bottleneck live.
              </p>
              <a
                href="https://calendly.com/podlablv/strategy-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block group px-10 py-5 bg-accent text-black text-lg font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(42,221,27,0.5)] active:scale-[0.98] uppercase tracking-wider"
              >
                <span className="relative z-10">Book a Call →</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================
  // FORM SCREEN
  // ==========================================
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen">
      <Navigation />
      <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-black to-bg-secondary min-h-screen">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-text-secondary">
                Step {step + 1} of {STEPS.length}
              </div>
              <div className="text-sm text-accent font-bold">{STEPS[step]}</div>
            </div>
            <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-bg-tertiary border-2 border-border rounded-2xl p-8 md:p-10">
            {/* ---- STEP 1 ---- */}
            {step === 0 && (
              <div className="space-y-5">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">You &amp; your business</h2>
                <p className="text-text-secondary mb-6">The basics — so we know who we&apos;re talking to.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="firstName" className={labelClass}>
                      First Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={form.firstName}
                      onChange={(e) => update('firstName', e.target.value)}
                      className={inputClass}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className={labelClass}>
                      Last Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={form.lastName}
                      onChange={(e) => update('lastName', e.target.value)}
                      className={inputClass}
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className={labelClass}>
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className={inputClass}
                    placeholder="you@company.com"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="businessName" className={labelClass}>
                      Business Name <span className="text-text-secondary text-xs">(optional)</span>
                    </label>
                    <input
                      id="businessName"
                      type="text"
                      value={form.businessName}
                      onChange={(e) => update('businessName', e.target.value)}
                      className={inputClass}
                      placeholder="Your company"
                    />
                  </div>
                  <div>
                    <label htmlFor="website" className={labelClass}>
                      Website <span className="text-text-secondary text-xs">(optional)</span>
                    </label>
                    <input
                      id="website"
                      type="url"
                      value={form.website}
                      onChange={(e) => update('website', e.target.value)}
                      className={inputClass}
                      placeholder="yourcompany.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="yearsInBusiness" className={labelClass}>
                      Years in Business <span className="text-text-secondary text-xs">(optional)</span>
                    </label>
                    <select
                      id="yearsInBusiness"
                      value={form.yearsInBusiness}
                      onChange={(e) => update('yearsInBusiness', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select…</option>
                      <option value="<1 year">&lt;1 year</option>
                      <option value="1–3 years">1–3 years</option>
                      <option value="3+ years">3+ years</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="revenueBand" className={labelClass}>
                      Annual Revenue <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="revenueBand"
                      required
                      value={form.revenueBand}
                      onChange={(e) => update('revenueBand', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select…</option>
                      <option value="Under $1M">Under $1M</option>
                      <option value="$1M–$3M">$1M–$3M</option>
                      <option value="$3M–$8M">$3M–$8M</option>
                      <option value="$8M+">$8M+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className={labelClass}>
                    Phone <span className="text-text-secondary text-xs">(optional)</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    className={inputClass}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            )}

            {/* ---- STEP 2 ---- */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">What you sell &amp; to whom</h2>
                <p className="text-text-secondary mb-6">Short answers are fine — we just need the shape of it.</p>

                <div>
                  <label htmlFor="whatYouDo" className={labelClass}>
                    What do you do? <span className="text-text-secondary text-xs">(1–2 sentences)</span>
                  </label>
                  <textarea
                    id="whatYouDo"
                    value={form.whatYouDo}
                    onChange={(e) => update('whatYouDo', e.target.value)}
                    className={textareaClass}
                    placeholder="We help…"
                  />
                </div>
                <div>
                  <label htmlFor="coreOffer" className={labelClass}>
                    Your core offer
                  </label>
                  <textarea
                    id="coreOffer"
                    value={form.coreOffer}
                    onChange={(e) => update('coreOffer', e.target.value)}
                    className={textareaClass}
                    placeholder="The main thing people pay you for, and roughly what it costs."
                  />
                </div>
                <div>
                  <label htmlFor="dreamClient" className={labelClass}>
                    Your dream client
                  </label>
                  <textarea
                    id="dreamClient"
                    value={form.dreamClient}
                    onChange={(e) => update('dreamClient', e.target.value)}
                    className={textareaClass}
                    placeholder="Who do you most want more of? Industry, size, stage."
                  />
                </div>
                <div>
                  <label htmlFor="topPain" className={labelClass}>
                    The #1 pain they come to you with
                  </label>
                  <textarea
                    id="topPain"
                    value={form.topPain}
                    onChange={(e) => update('topPain', e.target.value)}
                    className={textareaClass}
                    placeholder="What's broken in their world that you fix?"
                  />
                </div>
                <div>
                  <label htmlFor="outcome" className={labelClass}>
                    The outcome you deliver
                  </label>
                  <textarea
                    id="outcome"
                    value={form.outcome}
                    onChange={(e) => update('outcome', e.target.value)}
                    className={textareaClass}
                    placeholder="What does success look like after working with you?"
                  />
                </div>
              </div>
            )}

            {/* ---- STEP 3 ---- */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">Where you&apos;re stuck</h2>
                <p className="text-text-secondary mb-6">This is the part that tells us where to start.</p>

                <div>
                  <label htmlFor="topGoal" className={labelClass}>
                    Your top goal for the next 12 months
                  </label>
                  <textarea
                    id="topGoal"
                    value={form.topGoal}
                    onChange={(e) => update('topGoal', e.target.value)}
                    className={textareaClass}
                    placeholder="Revenue, freedom, a new market — whatever matters most."
                  />
                </div>
                <div>
                  <label htmlFor="marketingGap" className={labelClass}>
                    What should your marketing do that it isn&apos;t?
                  </label>
                  <textarea
                    id="marketingGap"
                    value={form.marketingGap}
                    onChange={(e) => update('marketingGap', e.target.value)}
                    className={textareaClass}
                    placeholder="The gap between where your marketing is and where it should be."
                  />
                </div>
                <div>
                  <label htmlFor="biggestBottleneck" className={labelClass}>
                    Your biggest bottleneck right now
                  </label>
                  <select
                    id="biggestBottleneck"
                    value={form.biggestBottleneck}
                    onChange={(e) => update('biggestBottleneck', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    <option value="I'm the bottleneck">I&apos;m the bottleneck</option>
                    <option value="No system">No system</option>
                    <option value="No clarity on offer/ICP">No clarity on offer/ICP</option>
                    <option value="No demand engine">No demand engine</option>
                    <option value="Weak brand/perception">Weak brand/perception</option>
                  </select>
                </div>
                <div>
                  <span className={labelClass}>Where are you showing up today?</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                    {CHANNEL_OPTIONS.map((channel) => {
                      const checked = form.channels.includes(channel);
                      return (
                        <button
                          type="button"
                          key={channel}
                          onClick={() => toggleChannel(channel)}
                          className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all text-left ${
                            checked
                              ? 'border-accent bg-accent/10 text-white'
                              : 'border-border text-text-secondary hover:border-accent hover:text-accent'
                          }`}
                          aria-pressed={checked}
                        >
                          {channel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ---- STEP 4 ---- */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">Voice &amp; wrap</h2>
                <p className="text-text-secondary mb-6">Last few — then you&apos;re done.</p>

                <div>
                  <label htmlFor="brandWords" className={labelClass}>
                    3 words for your brand&apos;s tone
                  </label>
                  <input
                    id="brandWords"
                    type="text"
                    value={form.brandWords}
                    onChange={(e) => update('brandWords', e.target.value)}
                    className={inputClass}
                    placeholder="e.g. bold, direct, premium"
                  />
                </div>
                <div>
                  <label htmlFor="anythingElse" className={labelClass}>
                    Anything else we should know?
                  </label>
                  <textarea
                    id="anythingElse"
                    value={form.anythingElse}
                    onChange={(e) => update('anythingElse', e.target.value)}
                    className={textareaClass}
                    placeholder="Context, constraints, deadlines — whatever helps."
                  />
                </div>
                <div>
                  <label htmlFor="contactPref" className={labelClass}>
                    Best way to reach you
                  </label>
                  <select
                    id="contactPref"
                    value={form.contactPref}
                    onChange={(e) => update('contactPref', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="Text">Text</option>
                  </select>
                </div>
              </div>
            )}

            {/* Errors */}
            {stepError && (
              <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {stepError}
              </div>
            )}
            {submitError && (
              <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {submitError}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 gap-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0}
                className="px-6 py-3 border-2 border-border text-text-secondary rounded-lg hover:border-accent hover:text-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Back
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3 bg-accent text-black font-black rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-0.5 active:scale-[0.98] uppercase tracking-wider"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-accent text-black font-black rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-0.5 active:scale-[0.98] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting…' : 'Submit →'}
                </button>
              )}
            </div>
          </form>

          <p className="text-xs text-text-secondary text-center mt-4">
            No spam, ever. We&apos;ll only use this to review your business and reach out.
          </p>
        </div>
      </section>
    </div>
  );
}
