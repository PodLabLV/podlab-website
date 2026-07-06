'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';

// ============================================
// ESSENTIALSLAB ASSESSMENT — SHORT FORM
// One screen. 4 required + 2 optional fields.
// Goal: qualify + book a clarity call. Deep intake
// moves to a post-booking Pre-Call Brief.
// POSTs to /api/essentialslab-assessment.
// ============================================

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  revenueBand: string;
  biggestBottleneck: string;
}

const INITIAL_STATE: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  revenueBand: '',
  biggestBottleneck: '',
};

// Formspree endpoint — instant-email backup capture (does NOT replace the
// Supabase write below, which stays the CRM system of record + pixel spine).
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xwvdzbky';

const inputClass =
  'w-full px-4 py-3 bg-bg-secondary border-2 border-border rounded-xl text-white placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors';
const labelClass = 'block text-sm font-medium text-text-secondary mb-2';

export default function EssentialsLabAssessmentPage() {
  const [started, setStarted] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
    setSubmitError('');
  };

  const validate = (): boolean => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.revenueBand) {
      setFormError('First name, last name, email, and revenue band are required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setSubmitting(true);

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || undefined,
      revenueBand: form.revenueBand,
      biggestBottleneck: form.biggestBottleneck || undefined,
    };

    // Fire-and-forget: instant-email backup via Formspree. Never blocks or
    // breaks the primary submit; if it fails we still have Supabase.
    try {
      void fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`,
          email: form.email,
          phone: form.phone || '',
          revenue: form.revenueBand,
          bottleneck: form.biggestBottleneck || '',
          _subject: `New EssentialsLab Assessment: ${form.firstName} ${form.lastName} (${form.revenueBand})`,
        }),
      }).catch(() => {});
    } catch {
      /* backup channel only — swallow */
    }

    // Capture attribution (which ad / card / QR this came from)
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

      // Fire the REAL conversion on actual submission (not on CTA click).
      // This is the event the Meta campaign should optimize toward.
      const w = window as unknown as {
        fbq?: (...args: unknown[]) => void;
        posthog?: { capture?: (event: string, props?: Record<string, unknown>) => void };
      };
      w.fbq?.('track', 'Lead', { content_name: 'EssentialsLab Assessment' });
      w.posthog?.capture?.('essentialslab_assessment_submitted', {
        revenue_band: form.revenueBand,
        bottleneck: form.biggestBottleneck || undefined,
      });

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
              Tell us where you are in 30 seconds. We&apos;ll map your real bottleneck and the fastest path
              to a system that sells without you &mdash; then get you on a clarity call.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="group px-10 py-5 md:px-16 md:py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(42,221,27,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
            >
              <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Start Assessment →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            </button>
            <p className="text-sm text-text-secondary mt-8">30 seconds · 4 quick fields · Not a quiz</p>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================
  // SUCCESS SCREEN — drive straight to booking
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
                Got it, <span className="text-accent">{form.firstName || 'there'}</span>. Last step —
                book your call.
              </h2>
              <p className="text-lg text-text-secondary mb-8 max-w-md mx-auto">
                Grab a time and we&apos;ll walk through your bottleneck live and map your fastest path. This is
                where it actually gets solved.
              </p>
              <a
                href="https://calendly.com/podlablv/essentialslab-clarity-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block group px-10 py-5 bg-accent text-black text-lg font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(42,221,27,0.5)] active:scale-[0.98] uppercase tracking-wider"
              >
                <span className="relative z-10">Book My Clarity Call →</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================
  // FORM SCREEN — single short form
  // ==========================================
  return (
    <div className="min-h-screen">
      <Navigation />
      <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-black to-bg-secondary min-h-screen">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-bg-tertiary border-2 border-border rounded-2xl p-8 md:p-10">
            <div className="space-y-5">
              <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">You &amp; your business</h2>
              <p className="text-text-secondary mb-6">
                Four quick fields and you&apos;re done &mdash; then book your clarity call.
              </p>

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
                <label htmlFor="biggestBottleneck" className={labelClass}>
                  Your biggest bottleneck right now <span className="text-text-secondary text-xs">(optional)</span>
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
            </div>

            {/* Errors */}
            {formError && (
              <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {formError}
              </div>
            )}
            {submitError && (
              <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {submitError}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end items-center mt-8">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-4 bg-accent text-black font-black rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-0.5 active:scale-[0.98] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Get My Read →'}
              </button>
            </div>
          </form>

          <p className="text-xs text-text-secondary text-center mt-4">
            30 seconds. No spam, ever. You&apos;ll book your clarity call on the next screen.
          </p>
        </div>
      </section>
    </div>
  );
}
