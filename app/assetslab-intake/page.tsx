'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import SmsConsent from '@/components/SmsConsent';

// ============================================
// ASSETSLAB INTAKE
// Deep post-sale intake — replaces a Typeform.
// 6 steps, no scoring. POSTs to /api/assetslab-intake.
// Feeds the /assetslab deliverable generator (raw_responses).
// ============================================

const CHANNEL_OPTIONS = [
  'Instagram',
  'Facebook',
  'LinkedIn',
  'YouTube',
  'TikTok',
  'Email',
  'Google',
  'Referrals',
  'Other',
] as const;

const STEPS = [
  'You & your business',
  'What you do',
  'Your customers',
  'Competitors & market',
  'Brand',
  'Wrap',
] as const;

interface FormState {
  // Step 1 — You & your business
  fullName: string;
  email: string;
  phone: string;
  smsConsent: boolean;
  businessName: string;
  website: string;
  yearsInBusiness: string;
  annualRevenue: string;
  // Step 2 — What you do
  businessDescription: string;
  servicesOffered: string;
  coreOfferDescription: string;
  differentiators: string;
  // Step 3 — Your customers
  currentCustomers: string;
  dreamClient: string;
  painPoints: string;
  outcomeDelivered: string;
  bestClientFeedback: string;
  customerChannels: string[];
  // Step 4 — Competitors & market
  topCompetitors: string;
  competitorAdmire: string;
  // Step 5 — Brand
  brandPersonality: string;
  brandAdjectives: string;
  brandTone: string;
  brandsAdmired: string;
  hasMvv: string;
  // Step 6 — Wrap
  existingMaterials: string;
  customerResearchStatus: string;
  topGoals: string;
  marketingGap: string;
  anythingElse: string;
}

const INITIAL_STATE: FormState = {
  fullName: '',
  email: '',
  phone: '',
  smsConsent: false,
  businessName: '',
  website: '',
  yearsInBusiness: '',
  annualRevenue: '',
  businessDescription: '',
  servicesOffered: '',
  coreOfferDescription: '',
  differentiators: '',
  currentCustomers: '',
  dreamClient: '',
  painPoints: '',
  outcomeDelivered: '',
  bestClientFeedback: '',
  customerChannels: [],
  topCompetitors: '',
  competitorAdmire: '',
  brandPersonality: '',
  brandAdjectives: '',
  brandTone: '',
  brandsAdmired: '',
  hasMvv: '',
  existingMaterials: '',
  customerResearchStatus: '',
  topGoals: '',
  marketingGap: '',
  anythingElse: '',
};

const inputClass =
  'w-full px-4 py-3 bg-bg-secondary border-2 border-border rounded-xl text-white placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors';
const labelClass = 'block text-sm font-medium text-text-secondary mb-2';
const textareaClass = `${inputClass} resize-y min-h-[96px]`;

export default function AssetsLabIntakePage() {
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
      customerChannels: prev.customerChannels.includes(channel)
        ? prev.customerChannels.filter((c) => c !== channel)
        : [...prev.customerChannels, channel],
    }));
  };

  const firstName = form.fullName.trim().split(/\s+/)[0] || '';

  // Step 1 has the required fields — gate forward navigation there.
  const validateStep1 = (): boolean => {
    if (!form.fullName.trim() || !form.email.trim() || !form.businessName.trim()) {
      setStepError('Full name, email, and business name are required to continue.');
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
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || undefined,
      // Only meaningful alongside a number; sending it without one would put a
      // consent record on a contact we can't text anyway.
      sms_consent: Boolean(form.phone.trim() && form.smsConsent),
      businessName: form.businessName,
      website: form.website || undefined,
      yearsInBusiness: form.yearsInBusiness || undefined,
      annualRevenue: form.annualRevenue || undefined,
      businessDescription: form.businessDescription || undefined,
      servicesOffered: form.servicesOffered || undefined,
      coreOfferDescription: form.coreOfferDescription || undefined,
      differentiators: form.differentiators || undefined,
      currentCustomers: form.currentCustomers || undefined,
      dreamClient: form.dreamClient || undefined,
      painPoints: form.painPoints || undefined,
      outcomeDelivered: form.outcomeDelivered || undefined,
      bestClientFeedback: form.bestClientFeedback || undefined,
      customerChannels: form.customerChannels.length ? form.customerChannels : undefined,
      topCompetitors: form.topCompetitors || undefined,
      competitorAdmire: form.competitorAdmire || undefined,
      brandPersonality: form.brandPersonality || undefined,
      brandAdjectives: form.brandAdjectives || undefined,
      brandTone: form.brandTone || undefined,
      brandsAdmired: form.brandsAdmired || undefined,
      hasMvv: form.hasMvv || undefined,
      existingMaterials: form.existingMaterials || undefined,
      customerResearchStatus: form.customerResearchStatus || undefined,
      topGoals: form.topGoals || undefined,
      marketingGap: form.marketingGap || undefined,
      anythingElse: form.anythingElse || undefined,
    };

    // Capture attribution (e.g. which campaign this came from)
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
      const res = await fetch('/api/assetslab-intake', {
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
              AssetsLab Intake
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-8 leading-[0.95] tracking-tight">
              Let&apos;s map your
              <br className="hidden md:block" />{' '}
              <span className="text-accent drop-shadow-[0_0_30px_rgba(42,221,27,0.5)]">foundation.</span>
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary mb-10 max-w-3xl mx-auto font-light leading-relaxed">
              AssetsLab is where we get clarity — your offer, your customer, your voice, your edge. The deeper you go
              here, the sharper everything we build for you becomes.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="group px-10 py-5 md:px-16 md:py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(42,221,27,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
            >
              <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Start Intake →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            </button>
            <p className="text-sm text-text-secondary mt-8">6 steps · Take your time — this becomes your strategic foundation</p>
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
                Got it, <span className="text-accent">{firstName || 'there'}</span> — we&apos;ll build your AssetsLab
                foundation and reach out.
              </h2>
              <p className="text-lg text-text-secondary mb-8 max-w-md mx-auto">
                We&apos;ll review every answer and turn it into your strategic foundation. Want to talk it through? Book
                a call and we&apos;ll walk it live.
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
                <p className="text-text-secondary mb-6">The basics — so we know who we&apos;re building for.</p>

                <div>
                  <label htmlFor="fullName" className={labelClass}>
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => update('fullName', e.target.value)}
                    className={inputClass}
                    placeholder="First and last name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                    {/* Only shown once there's a number to consent about. */}
                    {form.phone.trim() && (
                      <div className="mt-3">
                        <SmsConsent
                          checked={form.smsConsent}
                          onChange={(v) => update('smsConsent', v)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="businessName" className={labelClass}>
                      Business Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="businessName"
                      type="text"
                      required
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
                      <option value="3–10 years">3–10 years</option>
                      <option value="10+ years">10+ years</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="annualRevenue" className={labelClass}>
                      Annual Revenue <span className="text-text-secondary text-xs">(optional)</span>
                    </label>
                    <select
                      id="annualRevenue"
                      value={form.annualRevenue}
                      onChange={(e) => update('annualRevenue', e.target.value)}
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
              </div>
            )}

            {/* ---- STEP 2 ---- */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">What you do</h2>
                <p className="text-text-secondary mb-6">The shape of your business — in your own words.</p>

                <div>
                  <label htmlFor="businessDescription" className={labelClass}>
                    Describe your business
                  </label>
                  <textarea
                    id="businessDescription"
                    value={form.businessDescription}
                    onChange={(e) => update('businessDescription', e.target.value)}
                    className={textareaClass}
                    placeholder="What you do, who it's for, and how it works in a few sentences."
                  />
                </div>
                <div>
                  <label htmlFor="servicesOffered" className={labelClass}>
                    Services / products you offer
                  </label>
                  <textarea
                    id="servicesOffered"
                    value={form.servicesOffered}
                    onChange={(e) => update('servicesOffered', e.target.value)}
                    className={textareaClass}
                    placeholder="List everything you sell — and roughly what each costs."
                  />
                </div>
                <div>
                  <label htmlFor="coreOfferDescription" className={labelClass}>
                    Your core offer
                  </label>
                  <textarea
                    id="coreOfferDescription"
                    value={form.coreOfferDescription}
                    onChange={(e) => update('coreOfferDescription', e.target.value)}
                    className={textareaClass}
                    placeholder="The single thing most people pay you for — describe it in detail."
                  />
                </div>
                <div>
                  <label htmlFor="differentiators" className={labelClass}>
                    What makes you different?
                  </label>
                  <textarea
                    id="differentiators"
                    value={form.differentiators}
                    onChange={(e) => update('differentiators', e.target.value)}
                    className={textareaClass}
                    placeholder="Why do clients pick you over the alternatives?"
                  />
                </div>
              </div>
            )}

            {/* ---- STEP 3 ---- */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">Your customers</h2>
                <p className="text-text-secondary mb-6">Who you serve — and who you want more of.</p>

                <div>
                  <label htmlFor="currentCustomers" className={labelClass}>
                    Who you serve now
                  </label>
                  <textarea
                    id="currentCustomers"
                    value={form.currentCustomers}
                    onChange={(e) => update('currentCustomers', e.target.value)}
                    className={textareaClass}
                    placeholder="Your current customers — industry, size, stage, type."
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
                    placeholder="Who do you most want more of? Be specific."
                  />
                </div>
                <div>
                  <label htmlFor="painPoints" className={labelClass}>
                    The pain points they come to you with
                  </label>
                  <textarea
                    id="painPoints"
                    value={form.painPoints}
                    onChange={(e) => update('painPoints', e.target.value)}
                    className={textareaClass}
                    placeholder="What's broken in their world that you fix?"
                  />
                </div>
                <div>
                  <label htmlFor="outcomeDelivered" className={labelClass}>
                    The outcome you deliver
                  </label>
                  <textarea
                    id="outcomeDelivered"
                    value={form.outcomeDelivered}
                    onChange={(e) => update('outcomeDelivered', e.target.value)}
                    className={textareaClass}
                    placeholder="What does success look like after working with you?"
                  />
                </div>
                <div>
                  <label htmlFor="bestClientFeedback" className={labelClass}>
                    What your best clients say about you
                  </label>
                  <textarea
                    id="bestClientFeedback"
                    value={form.bestClientFeedback}
                    onChange={(e) => update('bestClientFeedback', e.target.value)}
                    className={textareaClass}
                    placeholder="A quote, a compliment, the thing they always tell you."
                  />
                </div>
                <div>
                  <span className={labelClass}>Where do your customers find you?</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                    {CHANNEL_OPTIONS.map((channel) => {
                      const checked = form.customerChannels.includes(channel);
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
                <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">Competitors &amp; market</h2>
                <p className="text-text-secondary mb-6">Who you&apos;re up against — and who&apos;s doing it well.</p>

                <div>
                  <label htmlFor="topCompetitors" className={labelClass}>
                    Your top competitors
                  </label>
                  <textarea
                    id="topCompetitors"
                    value={form.topCompetitors}
                    onChange={(e) => update('topCompetitors', e.target.value)}
                    className={textareaClass}
                    placeholder="Names or URLs — whoever you bump into most."
                  />
                </div>
                <div>
                  <label htmlFor="competitorAdmire" className={labelClass}>
                    One competitor you admire — and why
                  </label>
                  <input
                    id="competitorAdmire"
                    type="text"
                    value={form.competitorAdmire}
                    onChange={(e) => update('competitorAdmire', e.target.value)}
                    className={inputClass}
                    placeholder="Who's doing it well, and what about them?"
                  />
                </div>
              </div>
            )}

            {/* ---- STEP 5 ---- */}
            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">Brand</h2>
                <p className="text-text-secondary mb-6">How your business should feel and sound.</p>

                <div>
                  <label htmlFor="brandPersonality" className={labelClass}>
                    If your brand were a person…
                  </label>
                  <textarea
                    id="brandPersonality"
                    value={form.brandPersonality}
                    onChange={(e) => update('brandPersonality', e.target.value)}
                    className={textareaClass}
                    placeholder="Describe their personality — how they talk, carry themselves, show up."
                  />
                </div>
                <div>
                  <label htmlFor="brandAdjectives" className={labelClass}>
                    3–5 words that describe your brand
                  </label>
                  <input
                    id="brandAdjectives"
                    type="text"
                    value={form.brandAdjectives}
                    onChange={(e) => update('brandAdjectives', e.target.value)}
                    className={inputClass}
                    placeholder="e.g. bold, direct, premium, warm"
                  />
                </div>
                <div>
                  <label htmlFor="brandTone" className={labelClass}>
                    Your brand tone
                  </label>
                  <select
                    id="brandTone"
                    value={form.brandTone}
                    onChange={(e) => update('brandTone', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    <option value="Professional & polished">Professional &amp; polished</option>
                    <option value="Bold & direct">Bold &amp; direct</option>
                    <option value="Warm & approachable">Warm &amp; approachable</option>
                    <option value="Playful & energetic">Playful &amp; energetic</option>
                    <option value="Authoritative & expert">Authoritative &amp; expert</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="brandsAdmired" className={labelClass}>
                    Brands whose voice you admire
                  </label>
                  <textarea
                    id="brandsAdmired"
                    value={form.brandsAdmired}
                    onChange={(e) => update('brandsAdmired', e.target.value)}
                    className={textareaClass}
                    placeholder="Any brands — in or out of your industry — whose voice you'd want to borrow."
                  />
                </div>
                <div>
                  <label htmlFor="hasMvv" className={labelClass}>
                    Do you have a mission, vision &amp; values?
                  </label>
                  <select
                    id="hasMvv"
                    value={form.hasMvv}
                    onChange={(e) => update('hasMvv', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    <option value="Yes, written down">Yes, written down</option>
                    <option value="Sort of, in my head">Sort of, in my head</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            )}

            {/* ---- STEP 6 ---- */}
            {step === 5 && (
              <div className="space-y-5">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">Wrap</h2>
                <p className="text-text-secondary mb-6">Last few — then your foundation is in our hands.</p>

                <div>
                  <label htmlFor="existingMaterials" className={labelClass}>
                    What do you already have?
                  </label>
                  <textarea
                    id="existingMaterials"
                    value={form.existingMaterials}
                    onChange={(e) => update('existingMaterials', e.target.value)}
                    className={textareaClass}
                    placeholder="Logos, brand guides, content — paste links to anything we should see."
                  />
                </div>
                <div>
                  <label htmlFor="customerResearchStatus" className={labelClass}>
                    Have you done customer research?
                  </label>
                  <select
                    id="customerResearchStatus"
                    value={form.customerResearchStatus}
                    onChange={(e) => update('customerResearchStatus', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    <option value="Yes, recently">Yes, recently</option>
                    <option value="A while ago">A while ago</option>
                    <option value="Never">Never</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="topGoals" className={labelClass}>
                    Your top 3 goals for the next 12 months
                  </label>
                  <textarea
                    id="topGoals"
                    value={form.topGoals}
                    onChange={(e) => update('topGoals', e.target.value)}
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
                  <label htmlFor="anythingElse" className={labelClass}>
                    Anything else we should know?
                  </label>
                  <textarea
                    id="anythingElse"
                    value={form.anythingElse}
                    onChange={(e) => update('anythingElse', e.target.value)}
                    className={textareaClass}
                    placeholder="Context, constraints, deadlines — whatever helps us build."
                  />
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
            Your answers go straight into building your AssetsLab foundation. No spam, ever.
          </p>
        </div>
      </section>
    </div>
  );
}
