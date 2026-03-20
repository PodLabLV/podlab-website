'use client';

import { useState, useRef } from 'react';
import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';

/* ───────────── constants ───────────── */

const BUSINESS_TYPES = [
  'Coach/Consultant',
  'Agency Owner',
  'Content Creator',
  'Connector/Networker',
  'Other',
];

const AUDIENCE_SIZES = ['Under 1K', '1K-5K', '5K-25K', '25K-100K', '100K+'];

const PAYOUT_METHODS = ['Apple Pay', 'Zelle', 'Wire Transfer'] as const;

const PAYOUT_PLACEHOLDERS: Record<string, string> = {
  'Apple Pay': 'Apple Pay Email',
  Zelle: 'Zelle Phone or Email',
  'Wire Transfer': 'Bank Details (routing + account)',
};

const STATS = [
  { value: '20%', label: 'First-Sale Commission' },
  { value: '10%', label: 'Recurring Commission' },
  { value: '$1.5K–$10K', label: 'Per Referral' },
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
  const [agreed, setAgreed] = useState(false);
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
          beakerId,
          contractSigned: true,
          contractSignedDate: new Date().toISOString(),
          typedSignature,
          utmLinks: links,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Submission failed');
      }
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

                <p>
                  This Affiliate Agreement (&ldquo;Agreement&rdquo;) is entered into as of{' '}
                  <strong className="text-text-primary">{todayString()}</strong>{' '}
                  (&ldquo;Effective Date&rdquo;) by and between:
                </p>

                <p>
                  <strong className="text-text-primary">PodLab LV LLC</strong>{' '}
                  (&ldquo;PodLab,&rdquo; &ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;),
                  with a principal business address at Las Vegas, Nevada,
                </p>
                <p>and</p>
                <p>
                  <strong className="text-text-primary">
                    {form.firstName} {form.lastName}
                  </strong>{' '}
                  (&ldquo;Affiliate,&rdquo; &ldquo;you&rdquo;), an individual and/or business entity
                  as identified below:
                </p>

                <ul className="list-disc pl-6 space-y-1">
                  <li>Affiliate Legal Name: <strong className="text-text-primary">{form.firstName} {form.lastName}</strong></li>
                  <li>Affiliate Business Name: <strong className="text-text-primary">{form.company || 'Individual'}</strong></li>
                  <li>Affiliate Email: <strong className="text-text-primary">{form.email}</strong></li>
                  <li>Affiliate Address: <strong className="text-text-primary">{form.businessAddress}</strong></li>
                </ul>

                <p>
                  PodLab and Affiliate may be referred to individually as a &ldquo;Party&rdquo; and
                  collectively as the &ldquo;Parties.&rdquo;
                </p>

                {/* ── Section 1 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">1) Purpose and Relationship</h3>
                <p><strong>1.1 Purpose.</strong> Affiliate will promote PodLab&rsquo;s services and/or products (&ldquo;Offerings&rdquo;) using approved marketing methods in exchange for commissions under this Agreement.</p>
                <p><strong>1.2 Independent Contractor.</strong> Affiliate is an independent contractor, not an employee, partner, joint venturer, fiduciary, agent, or legal representative of PodLab. Affiliate has no authority to bind PodLab, incur obligations, or make representations on PodLab&rsquo;s behalf.</p>
                <p><strong>1.3 No Exclusivity (Company).</strong> PodLab may work with other affiliates and partners, including those competing with Affiliate.</p>

                {/* ── Section 2 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">2) Definitions</h3>
                <p><strong>2.1</strong> &ldquo;Qualified Sale&rdquo; means a completed transaction for Offerings that: is tracked to Affiliate via PodLab&rsquo;s designated tracking method (UTM link, referral code, or platform attribution); is paid in full and not refunded, reversed, disputed, or charged back within the Hold Period; is not generated through Prohibited Traffic or Prohibited Conduct (Section 6); is not a self-referral unless expressly permitted in writing by PodLab.</p>
                <p><strong>2.2</strong> &ldquo;Commission&rdquo; means the percentage of Net Revenue (Section 4.3) paid to Affiliate for Qualified Sales.</p>
                <p><strong>2.3</strong> &ldquo;Confidential Information&rdquo; means any non-public PodLab information, including but not limited to: pricing, margins, proposals, scripts, SOPs, workflows, templates, vendor lists, client lists, lead lists, pipeline data, strategies, campaign performance data, conversion data, customer data, financials, training materials, and any information marked confidential or that reasonably should be understood to be confidential.</p>
                <p><strong>2.4</strong> &ldquo;Restricted Customers/Leads&rdquo; means any person or entity that, at any time during the Term and for 12 months after termination, is or was: a PodLab client, customer, subscriber, member, lead, prospect, inbound inquiry, booked call, or pipeline contact; or introduced to Affiliate by PodLab; or identified through PodLab Confidential Information.</p>

                {/* ── Section 3 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">3) Enrollment and Approval</h3>
                <p><strong>3.1 Approval Required.</strong> Affiliate may only promote PodLab after written confirmation of acceptance into the affiliate program.</p>
                <p><strong>3.2 Accurate Information.</strong> Affiliate represents that all information provided to PodLab is truthful and up to date. PodLab may suspend commissions until identity/payment details are verified.</p>

                {/* ── Section 4 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">4) Commission Structure and Payment</h3>
                <p><strong>4.1 Commission Rate.</strong> Affiliate will earn 10% of Net Revenue for each Qualified Sale, unless PodLab provides a different rate in writing.</p>
                <p><strong>4.2 Promo Bonus.</strong> Unless otherwise stated in writing, PodLab will apply a promo bonus of: Double Commission on First Sale (meaning the first Qualified Sale credited to Affiliate earns 2× the Commission Rate; subsequent sales revert to the standard Commission Rate).</p>
                <p><strong>4.3 Net Revenue.</strong> &ldquo;Net Revenue&rdquo; equals amounts actually received by PodLab for the applicable sale minus: refunds, chargebacks, disputes, credits, taxes, payment processing fees, affiliate network fees (if any), and any discounts or incentives applied.</p>
                <p><strong>4.4 Hold Period.</strong> Commissions become payable only after 45 days from the date PodLab receives payment (the &ldquo;Hold Period&rdquo;) to account for refunds/chargebacks and fraud screening.</p>
                <p><strong>4.5 Payment Schedule.</strong> Commissions are paid monthly within 15 days after the end of each month, for commissions that have cleared the Hold Period.</p>
                <p><strong>4.6 Minimum Payout Threshold.</strong> PodLab may apply a minimum payout threshold of $100 (or pay out any amount at PodLab&rsquo;s discretion).</p>
                <p><strong>4.7 Payout Method.</strong> Affiliate will be paid via <strong className="text-text-primary">{form.payoutMethod}</strong> to: <strong className="text-text-primary">{form.payoutDetails}</strong>.</p>
                <p><strong>4.8 Taxes.</strong> Affiliate is solely responsible for all taxes arising from commissions. PodLab may require tax forms (e.g., W-9 or W-8) as a condition of payment. If Affiliate fails to provide required tax documentation, PodLab may withhold or suspend payments to the extent permitted by law.</p>
                <p><strong>4.9 Adjustments / Clawbacks.</strong> PodLab may deduct from future payouts any amounts previously paid for sales later determined not to be Qualified Sales (including refunds, disputes, fraud, or tracking manipulation). If deductions are insufficient, Affiliate must repay the balance within 10 days of written notice.</p>
                <p><strong>4.10 Tracking; Final Authority.</strong> PodLab&rsquo;s tracking systems, records, and determinations of Qualified Sales and commissions are final, except for demonstrable system error supported by evidence. Affiliate must dispute any commission issue within 30 days of the relevant statement, or it is waived.</p>

                {/* ── Section 5 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">5) Marketing Materials, Brand, and Permissions</h3>
                <p><strong>5.1 Approved Assets Only.</strong> Affiliate may use only PodLab-approved creative, copy, and claims. Affiliate must not alter PodLab assets without written approval.</p>
                <p><strong>5.2 Limited License.</strong> PodLab grants Affiliate a limited, revocable, non-transferable, non-sublicensable license to use PodLab trademarks and marketing materials solely to promote Offerings during the Term, in compliance with this Agreement.</p>
                <p><strong>5.3 No Ownership.</strong> Affiliate gains no ownership rights in PodLab intellectual property, branding, or assets.</p>
                <p><strong>5.4 Revocation.</strong> PodLab may revoke usage rights at any time. Affiliate must immediately remove PodLab assets upon request or termination.</p>

                {/* ── Section 6 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">6) Prohibited Conduct</h3>
                <p><strong>6.1 Misrepresent.</strong> Make false, misleading, or unsubstantiated claims about PodLab, outcomes, earnings, timelines, &ldquo;guarantees,&rdquo; or services.</p>
                <p><strong>6.2 Spam / Unlawful Outreach.</strong> Send spam (email/SMS/DM), violate CAN-SPAM, TCPA, GDPR/UK GDPR, CCPA/CPRA, or any applicable privacy/marketing law.</p>
                <p><strong>6.3 Trademark Bidding / Impersonation.</strong> Bid on PodLab brand terms or misspellings in paid search without written approval. Register domains/social handles resembling PodLab or impersonate PodLab.</p>
                <p><strong>6.4 Cookie Stuffing / Tracking Manipulation.</strong> Use forced clicks, cookie stuffing, hidden iframes, deceptive redirects, link cloaking designed to mislead, attribution fraud, or any traffic manipulation.</p>
                <p><strong>6.5 Incentivized or Misleading Promotions.</strong> Offer unauthorized rebates, cash-back, giveaways, or incentives tied to purchasing PodLab services unless approved in writing.</p>
                <p><strong>6.6 Prohibited Content.</strong> Promote PodLab alongside illegal, hateful, pornographic, or otherwise brand-damaging content, or content that violates platform policies.</p>
                <p><strong>6.7 Confidential Info Leaks.</strong> Disclose Confidential Information to any third party. Violation of this Section is material breach and may result in immediate termination and forfeiture of unpaid commissions.</p>

                {/* ── Section 7 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">7) Compliance: FTC and Platform Rules</h3>
                <p><strong>7.1 FTC Disclosure Required.</strong> Affiliate must clearly and conspicuously disclose the affiliate relationship in all promotions (e.g., &ldquo;I may earn a commission if you purchase through my link&rdquo;). Disclosures must be unavoidable and platform-appropriate.</p>
                <p><strong>7.2 Platform Policies.</strong> Affiliate must comply with all policies of any platform used (Meta, YouTube, TikTok, Apple Podcasts, etc.).</p>
                <p><strong>7.3 Proof of Compliance.</strong> PodLab may request screenshots, links, or recordings showing disclosures. Failure to provide may result in suspension of payments.</p>

                {/* ── Section 8 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">8) Term and Termination</h3>
                <p><strong>8.1 Term.</strong> This Agreement starts on the Effective Date and continues until terminated.</p>
                <p><strong>8.2 Termination for Convenience.</strong> Either Party may terminate at any time with 7 days&rsquo; written notice.</p>
                <p><strong>8.3 Immediate Termination for Cause.</strong> PodLab may terminate immediately if Affiliate breaches this Agreement, violates law, harms PodLab&rsquo;s reputation, or engages in Prohibited Conduct.</p>
                <p><strong>8.4 Effect of Termination.</strong> Affiliate must immediately stop using PodLab assets and cease representing any relationship. Affiliate remains eligible for commissions only on Qualified Sales that occur before termination and clear the Hold Period, unless termination was for cause, in which case PodLab may withhold unpaid commissions to the extent permitted by law and consistent with fraud prevention.</p>

                {/* ── Section 9 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">9) Confidentiality (NDA)</h3>
                <p><strong>9.1 Confidentiality Obligation.</strong> Affiliate agrees to hold all Confidential Information in strict confidence, use it only to perform under this Agreement, and not disclose it to any third party without PodLab&rsquo;s prior written consent.</p>
                <p><strong>9.2 Standard of Care.</strong> Affiliate must protect Confidential Information using at least the same degree of care used to protect Affiliate&rsquo;s own confidential information, and no less than reasonable care.</p>
                <p><strong>9.3 Exclusions.</strong> Confidential Information does not include information that Affiliate can prove: is or becomes public through no breach by Affiliate; was lawfully known to Affiliate before disclosure by PodLab; is independently developed without use of PodLab Confidential Information; is lawfully obtained from a third party without breach of any duty.</p>
                <p><strong>9.4 Compelled Disclosure.</strong> If legally compelled to disclose Confidential Information, Affiliate must provide prompt notice (if permitted) to allow PodLab to seek protective relief, and disclose only what is legally required.</p>
                <p><strong>9.5 Return/Destruction.</strong> Upon request or termination, Affiliate must immediately return or destroy all Confidential Information (including copies, notes, screenshots, downloads) and certify compliance in writing.</p>
                <p><strong>9.6 Injunctive Relief.</strong> Affiliate acknowledges that breach of this NDA would cause irreparable harm. PodLab may seek immediate injunctive relief (without posting bond where permitted), in addition to any other remedies.</p>
                <p><strong>9.7 Survival.</strong> Confidentiality obligations survive termination for 5 years, and as to trade secrets, for as long as they remain trade secrets under applicable law.</p>

                {/* ── Section 10 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">10) Non-Compete + Non-Solicit</h3>
                <p><strong>10.1 Restricted Business.</strong> &ldquo;Restricted Business&rdquo; means podcast production services, podcast growth/monetization services, podcast agency services, and materially similar services to PodLab Offerings.</p>
                <p><strong>10.2 Non-Solicitation of Restricted Customers/Leads.</strong> During the Term and for 12 months after termination, Affiliate will not, directly or indirectly: solicit, entice, divert, or attempt to divert any Restricted Customers/Leads away from PodLab; or sell or provide Restricted Business services to any Restricted Customers/Leads; or assist any third party in doing so.</p>
                <p><strong>10.3 Non-Interference with Business Relationships.</strong> During the Term and for 12 months after termination, Affiliate will not interfere with PodLab&rsquo;s relationships with vendors, contractors, or partners learned through PodLab.</p>
                <p><strong>10.4 Non-Compete.</strong> During the Term and for 12 months after termination, Affiliate will not, to the maximum extent permitted by applicable law, directly or indirectly engage in Restricted Business where such engagement is based on, derived from, or materially aided by PodLab Confidential Information.</p>
                <p><strong>10.5 Carve-Out.</strong> Nothing prevents Affiliate from: engaging in general marketing activities unrelated to Restricted Business; or performing services for third parties in non-competing markets, provided Affiliate does not use PodLab Confidential Information and does not solicit Restricted Customers/Leads.</p>
                <p><strong>10.6 No Use of PodLab Playbook.</strong> Even if a jurisdiction limits non-competes, Affiliate agrees they may not use PodLab Confidential Information to replicate PodLab&rsquo;s business model, pricing structure, scripts, SOPs, or systems in a competing offering.</p>
                <p><strong>10.7 Blue-Pencil / Reformation.</strong> If any restriction is found overly broad, a court may modify it to the minimum extent necessary to make it enforceable, and the modified restriction will be enforced.</p>
                <p><strong>10.8 Separate Covenants.</strong> Each restriction in this Section is independent. If one is unenforceable, the others remain enforceable.</p>
                <p><strong>10.9 Acknowledgment.</strong> Affiliate acknowledges these restrictions are reasonable in scope, duration, and purpose to protect PodLab&rsquo;s legitimate business interests.</p>

                {/* ── Section 11 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">11) Non-Disparagement</h3>
                <p>Affiliate agrees not to make any false or malicious statements (public or private) that would reasonably harm PodLab&rsquo;s reputation. This does not prohibit truthful statements required by law.</p>

                {/* ── Section 12 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">12) Intellectual Property, Content, and Ownership</h3>
                <p><strong>12.1 Affiliate IP.</strong> Affiliate retains ownership of pre-existing materials created independently of PodLab.</p>
                <p><strong>12.2 PodLab IP.</strong> All PodLab materials remain PodLab&rsquo;s sole property.</p>
                <p><strong>12.3 Feedback License.</strong> If Affiliate provides feedback, ideas, or suggestions, Affiliate grants PodLab a perpetual, worldwide, royalty-free license to use them without obligation.</p>
                <p><strong>12.4 No Recording/Redistribution.</strong> Affiliate must not record, redistribute, or sell PodLab materials, calls, trainings, templates, or internal resources without explicit written consent.</p>

                {/* ── Section 13 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">13) Data Privacy and Security</h3>
                <p><strong>13.1 Minimum Security.</strong> Affiliate must use reasonable administrative, technical, and physical safeguards to protect any PodLab-related information.</p>
                <p><strong>13.2 No Data Harvesting.</strong> Affiliate may not scrape PodLab sites or collect personal data outside lawful means.</p>
                <p><strong>13.3 Incident Notification.</strong> Affiliate must notify PodLab within 48 hours of any suspected data breach involving PodLab information.</p>

                {/* ── Section 14 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">14) Representations and Warranties</h3>
                <p>Affiliate represents and warrants: they will comply with all applicable laws and regulations; they have the right to enter into this Agreement; they will not violate any third-party rights; all promotions will be truthful and not deceptive; they will not infringe IP or use unlicensed materials.</p>

                {/* ── Section 15 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">15) Indemnification</h3>
                <p><strong>15.1 Affiliate Indemnity.</strong> Affiliate will indemnify, defend, and hold harmless PodLab and its owners, managers, employees, contractors, and agents from any claims, damages, liabilities, penalties, costs, and attorneys&rsquo; fees arising from or related to: Affiliate&rsquo;s marketing, content, statements, or representations; violation of law; IP infringement by Affiliate materials; breach of this Agreement.</p>
                <p><strong>15.2 Company Indemnity (Limited).</strong> PodLab will indemnify Affiliate for third-party claims that PodLab&rsquo;s provided marketing assets (as supplied) infringe a third party&rsquo;s IP, provided Affiliate used them as approved.</p>

                {/* ── Section 16 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">16) Limitation of Liability</h3>
                <p>To the maximum extent permitted by law: PodLab is not liable for indirect, incidental, special, consequential, or punitive damages. PodLab&rsquo;s total liability under this Agreement will not exceed the commissions paid to Affiliate in the 3 months preceding the event giving rise to the claim.</p>

                {/* ── Section 17 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">17) Dispute Resolution, Governing Law, and Attorneys&rsquo; Fees</h3>
                <p><strong>17.1 Governing Law.</strong> This Agreement is governed by the laws of the State of Nevada, without regard to conflict of laws principles.</p>
                <p><strong>17.2 Good Faith Resolution.</strong> The Parties agree to attempt good-faith resolution within 30 days before filing any formal action, except for injunctive relief.</p>
                <p><strong>17.3 Injunctive Relief.</strong> PodLab may seek immediate injunctive relief for breaches of Sections 9–10 in any court of competent jurisdiction.</p>
                <p><strong>17.4 Venue.</strong> Unless prohibited by law, any action will be brought in Clark County, Nevada.</p>
                <p><strong>17.5 Attorneys&rsquo; Fees.</strong> The prevailing Party is entitled to reasonable attorneys&rsquo; fees and costs.</p>

                {/* ── Section 18 ── */}
                <h3 className="text-base font-bold text-text-primary mt-6">18) Miscellaneous</h3>
                <p><strong>18.1 Entire Agreement.</strong> This is the entire agreement and supersedes prior discussions.</p>
                <p><strong>18.2 Amendments.</strong> Any amendment must be in writing signed by both Parties. PodLab may update program policies with notice; continued participation constitutes acceptance.</p>
                <p><strong>18.3 Assignment.</strong> Affiliate may not assign this Agreement without PodLab&rsquo;s written consent. PodLab may assign to an affiliate or successor entity.</p>
                <p><strong>18.4 Severability.</strong> If any provision is unenforceable, the remainder remains effective.</p>
                <p><strong>18.5 Waiver.</strong> No waiver is effective unless in writing; waiver of one breach is not waiver of another.</p>
                <p><strong>18.6 Notices.</strong> Notices will be sent to the emails listed above (and are deemed delivered when sent, absent bounceback).</p>
                <p><strong>18.7 Counterparts; E-Signature.</strong> This Agreement may be signed electronically and in counterparts, each deemed an original.</p>

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
                    I have read and agree to all terms of this Affiliate Agreement
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
              <div className="text-center">
                <button
                  onClick={() => window.print()}
                  className="px-8 py-3 rounded-xl border border-accent text-accent hover:bg-accent hover:text-black transition-colors font-bold"
                >
                  Download Agreement (Print)
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </HomePageWrapper>
  );
}
