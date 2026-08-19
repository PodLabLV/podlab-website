'use client';

import { useState, useRef } from 'react';
import Navigation from '@/components/Navigation';
import SmsConsent from '@/components/SmsConsent';
import HomePageWrapper from '@/components/HomePageWrapper';
import {
  AGREEMENT_VERSION,
  BASE_RATE,
  FIRST_SALE_MULTIPLIER,
  HOLD_PERIOD_DAYS,
  LAB_COMMISSIONS,
  MINIMUM_PAYOUT_USD,
  PAYOUT_DAYS_AFTER_MONTH_END,
  PAYOUT_METHODS as TERM_PAYOUT_METHODS,
  VOLUME_TIERS,
  commissionFor,
  firstSaleFor,
  pct,
  usd,
} from '@/lib/affiliate-terms';
import {
  buildAgreement,
  buildPartyBlock,
  buildRecitals,
  exhibitANotes,
} from '@/lib/affiliate-agreement';

/* ───────────── constants ───────────── */

const BUSINESS_TYPES = [
  'Coach/Consultant',
  'Agency Owner',
  'Content Creator',
  'Connector/Networker',
  'Other',
];

const AUDIENCE_SIZES = ['Under 1K', '1K-5K', '5K-25K', '25K-100K', '100K+'];

// Sourced from the terms module so the dropdown can never offer a method the
// contract's payout clause doesn't recognise.
const PAYOUT_METHODS = TERM_PAYOUT_METHODS;

const PAYOUT_PLACEHOLDERS: Record<string, string> = {
  'Apple Pay': 'Apple Pay Email',
  Zelle: 'Zelle Phone or Email',
  'Wire Transfer': 'Bank Details (routing + account)',
};

const STATS = [
  { value: pct(BASE_RATE * FIRST_SALE_MULTIPLIER), label: 'First-Sale Commission' },
  { value: pct(BASE_RATE), label: 'Standard Commission' },
  { value: '$150–$1,850', label: 'Per Referral' },
];

const BASE = 'https://podlablv.com';

const UTM_PAGES: { label: string; path: string }[] = [
  { label: 'Homepage', path: '/' },
  { label: 'Assessment', path: '/assessment' },
  { label: 'Services', path: '/services' },
  { label: 'AssetsLab', path: '/labs/assets' },
  { label: 'BrandLab', path: '/labs/brand' },
  { label: 'SiteLab', path: '/labs/site' },
  { label: 'VideoSalesLab', path: '/labs/video-sales' },
  { label: 'ExpansionLab', path: '/labs/expansion' },
  { label: 'Contact', path: '/contact' },
];

/* ───────────── types ───────────── */

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  businessAddress: string;
  website: string;
  businessType: string;
  audienceSize: string;
  howConnect: string;
  whyJoin: string;
  howHeard: string;
  payoutMethod: string;
  payoutDetails: string;
}

const emptyForm: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  businessAddress: '',
  website: '',
  businessType: '',
  audienceSize: '',
  howConnect: '',
  whyJoin: '',
  howHeard: '',
  payoutMethod: '',
  payoutDetails: '',
};

/* ───────────── helpers ───────────── */

function generateBeakerId(first: string, last: string) {
  return `${first}-${last}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function buildLink(beakerId: string, path: string) {
  return `${BASE}${path}?utm_source=beaker&utm_medium=referral&utm_campaign=${beakerId}`;
}

function todayString() {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/* ───────────── component ───────────── */

export default function BeakerApplyPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [beakerId, setBeakerId] = useState('');
  // Outside FormData on purpose: set() maps every key to a string event value.
  const [smsConsent, setSmsConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  // ESIGN consent is a separate affirmative act from agreeing to the terms.
  // Bundling them into one checkbox is exactly what gets a click-wrap voided.
  const [electronicConsent, setElectronicConsent] = useState(false);
  const [agreementUrl, setAgreementUrl] = useState<string | null>(null);
  const [typedSignature, setTypedSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const contractRef = useRef<HTMLDivElement>(null);

  /* ── field helpers ── */

  const set = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  /* ── step navigation ── */

  function goToStep2() {
    const required: (keyof FormData)[] = [
      'firstName',
      'lastName',
      'email',
      'businessAddress',
      'businessType',
      'audienceSize',
      'howConnect',
      'whyJoin',
      'payoutMethod',
      'payoutDetails',
    ];
    for (const k of required) {
      if (!form[k].trim()) {
        setError(`Please fill in all required fields.`);
        return;
      }
    }
    setError('');
    const id = generateBeakerId(form.firstName, form.lastName);
    setBeakerId(id);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitContract() {
    if (!agreed) {
      setError('Please agree to the terms before signing.');
      return;
    }
    if (!electronicConsent) {
      setError('Please consent to signing electronically before submitting.');
      return;
    }
    if (!typedSignature.trim()) {
      setError('Please type your full name as a digital signature.');
      return;
    }
    setError('');
    setSubmitting(true);

    const links = UTM_PAGES.map((p) => ({
      label: p.label,
      url: buildLink(beakerId, p.path),
    }));

    try {
      const res = await fetch('/api/affiliate/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          // Only meaningful alongside a number; sending it without one would put
          // a consent record on a contact we can't text anyway.
          sms_consent: Boolean(form.phone.trim() && smsConsent),
          beakerId,
          contractSigned: true,
          contractSignedDate: new Date().toISOString(),
          typedSignature,
          electronicConsent,
          utmLinks: links,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }
      // Null when PDF generation or upload failed — the agreement is still
      // signed and stored, so step 3 falls back to print rather than erroring.
      setAgreementUrl(data.agreementUrl ?? null);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── copy helper ── */

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  /* ── utm links for step 3 ── */

  const utmLinks = UTM_PAGES.map((p) => ({
    label: p.label,
    url: buildLink(beakerId, p.path),
  }));

  const allLinksText = utmLinks.map((l) => `${l.label}: ${l.url}`).join('\n');

  /* ── agreement, built from what they just typed ── */

  const agreementParty = {
    firstName: form.firstName,
    lastName: form.lastName,
    company: form.company,
    email: form.email,
    businessAddress: form.businessAddress,
    payoutMethod: form.payoutMethod,
    payoutDetails: form.payoutDetails,
    beakerId,
    effectiveDate: todayString(),
  };

  const agreementSections = buildAgreement(agreementParty);
  const recurringLab = LAB_COMMISSIONS.find((l) => l.recurring);

  const homepageLink = buildLink(beakerId, '/');

  const swipeCopy = [
    {
      title: 'LinkedIn DM',
      text: `Hey [Name] — I work with a content studio called PodLab that helps $1M–$8M founders turn their expertise into video assets that sell for them 24/7. Thought it might be a fit for you.\n\nHere's a link if you want to check it out: ${homepageLink}`,
    },
    {
      title: 'Email',
      text: `Subject: Quick intro — PodLab\n\nHey [Name],\n\nI wanted to introduce you to PodLab — they work with $1M–$8M service-based founders to create video sales assets that replace the founder in the sales process.\n\nTheir whole model is "record once, sell forever." Thought it might be worth a look:\n${homepageLink}\n\nLet me know if you have questions — happy to connect you directly.\n\nBest,\n${form.firstName}`,
    },
    {
      title: 'Text Message',
      text: `Hey! Wanted to share this with you — PodLab helps founders turn their expertise into video content that sells for them. Check it out: ${homepageLink}`,
    },
  ];

  /* ──────────── render ──────────── */

  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-10 text-sm font-mono">
      {[
        { n: 1, label: 'Application' },
        { n: 2, label: 'Agreement' },
        { n: 3, label: 'Welcome' },
      ].map((s, i) => (
        <span key={s.n} className="flex items-center gap-2">
          {i > 0 && <span className="text-text-secondary">→</span>}
          <span
            className={
              step === s.n
                ? 'text-accent font-bold'
                : step > s.n
                  ? 'text-text-secondary'
                  : 'text-text-secondary'
            }
          >
            {s.n}. {s.label}
          </span>
        </span>
      ))}
    </div>
  );

  /* ── shared field styles ── */

  const inputClass =
    'w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors';
  const labelClass = 'block text-sm font-medium text-text-secondary mb-1.5';
  const reqMark = <span className="text-accent ml-0.5">*</span>;

  return (
    <HomePageWrapper>
      <Navigation />

      {/* print-only styles */}
      <style>{`
        @media print {
          nav, .no-print, .step-indicator { display: none !important; }
          body, html { background: #fff !important; color: #000 !important; }
          .print-contract { max-height: none !important; overflow: visible !important; border: none !important; background: #fff !important; color: #000 !important; padding: 0 !important; }
          .print-contract * { color: #000 !important; border-color: #ccc !important; }
          .print-contract h2, .print-contract h3, .print-contract strong { color: #000 !important; }
          @page { margin: 1in; }
        }
      `}</style>

      <main className="min-h-screen pt-28 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="no-print">{stepIndicator}</div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm no-print">
              {error}
            </div>
          )}

          {/* ═══════════ STEP 1 ═══════════ */}
          {step === 1 && (
            <div className="animate-fade-in-up">
              <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-display font-bold text-text-primary mb-3">
                  Join the Beaker Program
                </h1>
                <p className="text-text-secondary text-lg">
                  Earn recurring commissions by referring $1M–$8M founders to PodLab.
                </p>
              </div>

              {/* quick stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {STATS.map((s) => (
                  <div
                    key={s.label}
                    className="glass-card rounded-xl p-4 text-center border border-border"
                  >
                    <div className="text-2xl font-bold text-accent">{s.value}</div>
                    <div className="text-xs text-text-secondary mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* form */}
              <div className="glass-card rounded-2xl border border-border p-6 md:p-8 space-y-5">
                {/* name row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>First Name{reqMark}</label>
                    <input className={inputClass} value={form.firstName} onChange={set('firstName')} placeholder="First name" />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name{reqMark}</label>
                    <input className={inputClass} value={form.lastName} onChange={set('lastName')} placeholder="Last name" />
                  </div>
                </div>

                {/* email + phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Email{reqMark}</label>
                    <input className={inputClass} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input className={inputClass} type="tel" value={form.phone} onChange={set('phone')} placeholder="(optional)" />
                    {/* Only shown once there's a number to consent about. */}
                    {form.phone.trim() && (
                      <div className="mt-3">
                        <SmsConsent checked={smsConsent} onChange={setSmsConsent} />
                      </div>
                    )}
                  </div>
                </div>

                {/* company + address */}
                <div>
                  <label className={labelClass}>Company / Business Name</label>
                  <input className={inputClass} value={form.company} onChange={set('company')} placeholder="(optional)" />
                </div>
                <div>
                  <label className={labelClass}>Business Address{reqMark}</label>
                  <input className={inputClass} value={form.businessAddress} onChange={set('businessAddress')} placeholder="Full address (needed for contract)" />
                </div>

                {/* website */}
                <div>
                  <label className={labelClass}>Website or LinkedIn URL</label>
                  <input className={inputClass} value={form.website} onChange={set('website')} placeholder="https:// (optional)" />
                </div>

                {/* dropdowns row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Business Type{reqMark}</label>
                    <select className={inputClass} value={form.businessType} onChange={set('businessType')}>
                      <option value="">Select…</option>
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Audience Size{reqMark}</label>
                    <select className={inputClass} value={form.audienceSize} onChange={set('audienceSize')}>
                      <option value="">Select…</option>
                      {AUDIENCE_SIZES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* textareas */}
                <div>
                  <label className={labelClass}>
                    How do you typically connect with $1M–$8M founders?{reqMark}
                  </label>
                  <textarea className={inputClass + ' min-h-[100px]'} value={form.howConnect} onChange={set('howConnect')} placeholder="Describe your network and outreach methods…" />
                </div>
                <div>
                  <label className={labelClass}>
                    Why do you want to join the Beaker program?{reqMark}
                  </label>
                  <textarea className={inputClass + ' min-h-[100px]'} value={form.whyJoin} onChange={set('whyJoin')} placeholder="What excites you about partnering with PodLab?" />
                </div>

                {/* how heard */}
                <div>
                  <label className={labelClass}>How did you hear about PodLab?</label>
                  <input className={inputClass} value={form.howHeard} onChange={set('howHeard')} placeholder="(optional)" />
                </div>

                {/* payout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Preferred Payout Method{reqMark}</label>
                    <select className={inputClass} value={form.payoutMethod} onChange={set('payoutMethod')}>
                      <option value="">Select…</option>
                      {PAYOUT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Payout Details{reqMark}</label>
                    <input
                      className={inputClass}
                      value={form.payoutDetails}
                      onChange={set('payoutDetails')}
                      placeholder={PAYOUT_PLACEHOLDERS[form.payoutMethod] || 'Select payout method first'}
                    />
                  </div>
                </div>

                {/* submit */}
                <button
                  onClick={goToStep2}
                  className="w-full mt-4 py-4 rounded-xl font-bold text-lg bg-accent hover:bg-accent-hover text-black transition-all duration-200 hover:shadow-[0_0_30px_rgba(42,221,27,0.4)]"
                >
                  Continue to Agreement →
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ STEP 2 ═══════════ */}
          {step === 2 && (
            <div className="animate-fade-in-up">
              <div className="text-center mb-8 no-print">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-text-primary mb-2">
                  Affiliate Agreement
                </h1>
                <p className="text-text-secondary">
                  Review the full agreement below, then sign digitally.
                </p>
              </div>

              {/* contract */}
              <div
                ref={contractRef}
                className="print-contract glass-card rounded-2xl border border-border p-6 md:p-8 max-h-[60vh] overflow-y-auto space-y-4 text-sm leading-relaxed text-text-secondary mb-8"
              >
                <h2 className="text-xl font-bold text-text-primary text-center mb-1">
                  PODLAB LV LLC – AFFILIATE AGREEMENT
                </h2>
                <p className="text-center text-xs text-text-tertiary mb-4">
                  PodLab Beaker Program · {AGREEMENT_VERSION}
                </p>

                {buildRecitals(agreementParty).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}

                <ul className="list-disc pl-6 space-y-1">
                  {buildPartyBlock(agreementParty).map((row) => (
                    <li key={row.label}>
                      {row.label}:{' '}
                      <strong className="text-text-primary">{row.value}</strong>
                    </li>
                  ))}
                </ul>

                <p>
                  PodLab and Affiliate may be referred to individually as a &ldquo;Party&rdquo; and
                  collectively as the &ldquo;Parties.&rdquo;
                </p>

                {/* Clause text is rendered from lib/affiliate-agreement.ts — the same
                    source the executed PDF renders from, so the document on file and
                    the document on screen cannot drift apart. */}
                {agreementSections.map((section) => (
                  <div key={section.n} className="space-y-2">
                    <h3 className="text-base font-bold text-text-primary mt-6">
                      {section.n}) {section.heading}
                    </h3>
                    {section.clauses.map((clause, i) => (
                      <p key={clause.n || i}>
                        {clause.n && <strong>{clause.n} </strong>}
                        {clause.title && <strong>{clause.title}. </strong>}
                        {clause.text}
                      </p>
                    ))}
                  </div>
                ))}

                {/* ── Exhibit A ── */}
                <div className="mt-8 pt-6 border-t border-border space-y-4">
                  <h3 className="text-lg font-bold text-text-primary">
                    EXHIBIT A — COMMISSION SCHEDULE
                  </h3>
                  <p className="text-xs text-text-tertiary">
                    Incorporated into this Agreement under Section 4.1. Prepared for{' '}
                    {form.firstName} {form.lastName}
                    {beakerId ? ` (${beakerId})` : ''} as of {todayString()}.
                  </p>

                  <h4 className="font-bold text-text-primary mt-4">A-1. Per-Offering Commission</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-bg-secondary text-text-primary text-xs">
                          <th className="p-2 font-bold">OFFERING</th>
                          <th className="p-2 font-bold">LIST PRICE</th>
                          <th className="p-2 font-bold">STANDARD ({pct(BASE_RATE)})</th>
                          <th className="p-2 font-bold">
                            FIRST SALE ({pct(BASE_RATE * FIRST_SALE_MULTIPLIER)})
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {LAB_COMMISSIONS.map((lab) => (
                          <tr key={lab.lab} className="border-b border-border">
                            <td className="p-2 font-bold text-text-primary">{lab.lab}</td>
                            <td className="p-2">{lab.price}</td>
                            <td className="p-2">{commissionFor(lab, BASE_RATE)}</td>
                            <td className="p-2 text-accent font-bold">
                              {firstSaleFor(lab, BASE_RATE)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="font-bold text-text-primary mt-4">A-2. Recurring Commission</h4>
                  <p>
                    Offerings billed monthly pay commission every month the client remains active
                    and current. ExpansionLab at {recurringLab?.price} pays{' '}
                    <strong className="text-text-primary">
                      {recurringLab ? commissionFor(recurringLab, BASE_RATE) : ''}
                    </strong>{' '}
                    for the life of the engagement, subject to the same Hold Period and clawback
                    terms as one-time commissions.
                  </p>

                  <h4 className="font-bold text-text-primary mt-4">A-3. Volume Tiers</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-bg-secondary text-text-primary text-xs">
                          <th className="p-2 font-bold">LIFETIME QUALIFIED SALES</th>
                          <th className="p-2 font-bold">COMMISSION RATE</th>
                          <th className="p-2 font-bold">TIER</th>
                        </tr>
                      </thead>
                      <tbody>
                        {VOLUME_TIERS.map((tier) => (
                          <tr key={tier.label} className="border-b border-border">
                            <td className="p-2">
                              {tier.threshold === 0 ? '0–4 sales' : `${tier.threshold}+ sales`}
                            </td>
                            <td className="p-2 font-bold text-text-primary">
                              {tier.rate === null ? 'Negotiated' : pct(tier.rate)}
                            </td>
                            <td className="p-2">{tier.label}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="font-bold text-text-primary mt-4">A-4. Notes</h4>
                  <ul className="list-disc pl-6 space-y-1 text-xs">
                    {exhibitANotes().map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>

                {/* ── Signatures ── */}
                <div className="border-t border-border mt-8 pt-6 space-y-4">
                  <h3 className="text-base font-bold text-text-primary">SIGNATURES</h3>

                  <div>
                    <p className="font-bold text-text-primary">PODLAB LV LLC</p>
                    <p>By: Hiram Andino</p>
                    <p>Title: CEO</p>
                    <p className="font-mono italic text-accent mt-1">Hiram Andino</p>
                    <p className="text-xs text-text-secondary">{todayString()}</p>
                  </div>

                  <div className="mt-4">
                    <p className="font-bold text-text-primary">
                      AFFILIATE – {form.firstName.toUpperCase()} {form.lastName.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* signature area */}
              <div className="glass-card rounded-2xl border border-border p-6 md:p-8 space-y-5 no-print">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-accent rounded"
                  />
                  <span className="text-sm text-text-secondary">
                    I have read and agree to all terms of this Affiliate Agreement, including the
                    NDA in Section 9 and the Commission Schedule in Exhibit A
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={electronicConsent}
                    onChange={(e) => setElectronicConsent(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-accent rounded"
                  />
                  <span className="text-sm text-text-secondary">
                    I consent to sign electronically and agree my typed name below is my legal
                    signature under the ESIGN Act and Nevada UETA. A PDF copy will be emailed to me;
                    I may request a free paper copy from info@podlablv.com.
                  </span>
                </label>

                <div>
                  <label className={labelClass}>Typed Signature (Full Legal Name){reqMark}</label>
                  <input
                    className={inputClass + ' font-mono italic'}
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    placeholder="Type your full name"
                  />
                </div>

                <div>
                  <label className={labelClass}>Date</label>
                  <input className={inputClass} value={todayString()} disabled />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setStep(1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-6 py-3 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:border-text-tertiary transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={submitContract}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl font-bold text-lg bg-accent hover:bg-accent-hover text-black transition-all duration-200 hover:shadow-[0_0_30px_rgba(42,221,27,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting…' : 'Sign Agreement →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ STEP 3 ═══════════ */}
          {step === 3 && (
            <div className="animate-fade-in-up">
              <div className="text-center mb-10">
                <div className="text-6xl mb-4">🧪</div>
                <h1 className="text-4xl md:text-5xl font-display font-bold text-text-primary mb-3">
                  Welcome to the Beaker Program!
                </h1>
                <p className="text-text-secondary text-lg">
                  Your application has been submitted and your agreement is on file.
                </p>
              </div>

              {/* beaker ID */}
              <div className="glass-card rounded-2xl border border-border p-6 text-center mb-8">
                <p className="text-sm text-text-secondary mb-1">Your Beaker ID</p>
                <p className="text-2xl font-mono font-bold text-accent">{beakerId}</p>
              </div>

              {/* UTM links */}
              <div className="glass-card rounded-2xl border border-border p-6 md:p-8 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-text-primary">Your Tracking Links</h2>
                  <button
                    onClick={() => copy(allLinksText, 'all')}
                    className="text-sm px-4 py-1.5 rounded-lg border border-accent text-accent hover:bg-accent hover:text-black transition-colors"
                  >
                    {copied === 'all' ? 'Copied!' : 'Copy All Links'}
                  </button>
                </div>
                <div className="space-y-3">
                  {utmLinks.map((link) => (
                    <div
                      key={link.label}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-bg-secondary border border-border"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">{link.label}</p>
                        <p className="text-xs text-text-secondary truncate font-mono">{link.url}</p>
                      </div>
                      <button
                        onClick={() => copy(link.url, link.label)}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-md border border-border text-text-secondary hover:text-accent hover:border-accent transition-colors"
                      >
                        {copied === link.label ? '✓' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* swipe copy */}
              <div className="glass-card rounded-2xl border border-border p-6 md:p-8 mb-8">
                <h2 className="text-lg font-bold text-text-primary mb-4">Swipe Copy Templates</h2>
                <div className="space-y-4">
                  {swipeCopy.map((tmpl) => (
                    <div key={tmpl.title} className="p-4 rounded-lg bg-bg-secondary border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-accent">{tmpl.title}</p>
                        <button
                          onClick={() => copy(tmpl.text, tmpl.title)}
                          className="text-xs px-3 py-1 rounded-md border border-border text-text-secondary hover:text-accent hover:border-accent transition-colors"
                        >
                          {copied === tmpl.title ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre className="text-xs text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
                        {tmpl.text}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* download */}
              <div className="text-center space-y-3">
                {agreementUrl ? (
                  <>
                    <a
                      href={agreementUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-8 py-3 rounded-xl bg-accent text-black hover:bg-accent-hover transition-colors font-bold"
                    >
                      Download Signed Agreement (PDF)
                    </a>
                    <p className="text-xs text-text-tertiary">
                      A copy is also on its way to {form.email}. This download link expires in 30
                      days — the emailed PDF does not.
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setStep(2)}
                      className="px-8 py-3 rounded-xl border border-accent text-accent hover:bg-accent hover:text-black transition-colors font-bold"
                    >
                      View Agreement
                    </button>
                    <p className="text-xs text-text-tertiary">
                      Your agreement is signed and on file. The PDF copy is still generating — check
                      your inbox shortly, or email info@podlablv.com and we&rsquo;ll send it.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </HomePageWrapper>
  );
}
