'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import Link from 'next/link';

const revenueOptions = [
  'Pre-Revenue',
  '$100K–$500K',
  '$500K–$1M',
  '$1M–$3M',
  '$3M–$8M',
  '$8M+',
];

const podcastExperienceOptions = [
  'Yes, multiple times',
  'Yes, once or twice',
  'No, but I\'m comfortable on camera',
  'No, and I\'m nervous (that\'s okay!)',
];

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  title: string;
  companyWebsite: string;
  linkedinUrl: string;
  revenueRange: string;
  industry: string;
  founderStory: string;
  hardLesson: string;
  episodeTopic: string;
  podcastExperience: string;
  howDidYouHear: string;
  anythingElse: string;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  companyName: '',
  title: '',
  companyWebsite: '',
  linkedinUrl: '',
  revenueRange: '',
  industry: '',
  founderStory: '',
  hardLesson: '',
  episodeTopic: '',
  podcastExperience: '',
  howDidYouHear: '',
  anythingElse: '',
};

export default function PodcastApplyPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/podcast/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setStatus('success');
      router.push('/how-it-started/apply/success');
      return;
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />

        {/* Hero */}
        <section className="pt-32 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-7xl font-black mb-6 leading-[1.1] md:leading-[0.95] tracking-tight">
              Be a Guest on{' '}
              <span className="text-accent drop-shadow-[0_0_25px_rgba(42,221,27,0.5)]">
                How It Started
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary mb-10 max-w-3xl mx-auto font-light leading-relaxed">
              Share your founder story with $1M+ business owners. Raw conversations. Real lessons.{' '}
              <span className="text-white font-semibold">No fluff.</span>
            </p>
            <div className="flex flex-wrap justify-center gap-6 md:gap-10">
              {[
                { label: 'Goal: 50 Episodes', icon: '️' },
                { label: 'Goal: 10K Listeners', icon: '' },
                { label: '$1M–$8M Founders', icon: '' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 text-text-secondary">
                  <span className="text-2xl">{stat.icon}</span>
                  <span className="text-lg font-semibold text-white">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="pb-24 px-6">
          <div className="max-w-3xl mx-auto">
            {status === 'success' ? (
              <div className="glass-card p-6 md:p-12 text-center border-accent">
                <div className="text-6xl mb-6">️</div>
                <h2 className="text-3xl font-bold mb-4 text-accent">Application Received!</h2>
                <p className="text-lg text-text-secondary max-w-xl mx-auto">
                  We review every application personally. If you&apos;re a fit, we&apos;ll reach out
                  within 5 business days to schedule your recording session.
                </p>
                <Link
                  href="/how-it-started"
                  className="inline-block mt-8 px-8 py-3 border border-border text-text-primary font-medium rounded-lg hover:border-accent hover:text-accent transition-all"
                >
                  ← Back to How It Started
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="glass-card p-8 md:p-12 space-y-8">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold">Tell Us About You</h2>
                  <p className="text-text-secondary mt-2">Fields marked with * are required</p>
                </div>

                {/* Name Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Field
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                  <Field
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Contact Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Field
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <Field
                    label="Phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                {/* Company Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Field
                    label="Company Name"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                  />
                  <Field
                    label="Your Title/Role"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Links Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Field
                    label="Company Website"
                    name="companyWebsite"
                    type="url"
                    value={formData.companyWebsite}
                    onChange={handleChange}
                    placeholder="https://"
                  />
                  <Field
                    label="LinkedIn Profile URL"
                    name="linkedinUrl"
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>

                {/* Revenue & Industry */}
                <div className="grid md:grid-cols-2 gap-6">
                  <SelectField
                    label="Business Revenue Range"
                    name="revenueRange"
                    value={formData.revenueRange}
                    onChange={handleChange}
                    options={revenueOptions}
                    required
                  />
                  <Field
                    label="Industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    required
                    placeholder="e.g., SaaS, Real Estate, Marketing"
                  />
                </div>

                {/* Story Questions */}
                <TextAreaField
                  label="What's your founder story in 2-3 sentences?"
                  name="founderStory"
                  value={formData.founderStory}
                  onChange={handleChange}
                  required
                  placeholder="How did you get started? What drove you to build this?"
                  rows={3}
                />

                <TextAreaField
                  label="What's one lesson you've learned the hard way that other founders need to hear?"
                  name="hardLesson"
                  value={formData.hardLesson}
                  onChange={handleChange}
                  required
                  placeholder="The real stuff — not the LinkedIn version."
                  rows={3}
                />

                <TextAreaField
                  label="What topic would make the best episode?"
                  name="episodeTopic"
                  value={formData.episodeTopic}
                  onChange={handleChange}
                  required
                  placeholder="What's the one thing you could talk about for an hour?"
                  rows={3}
                />

                {/* Podcast Experience */}
                <SelectField
                  label="Have you been on a podcast before?"
                  name="podcastExperience"
                  value={formData.podcastExperience}
                  onChange={handleChange}
                  options={podcastExperienceOptions}
                  required
                />

                {/* Optional Fields */}
                <Field
                  label="How did you hear about How It Started?"
                  name="howDidYouHear"
                  value={formData.howDidYouHear}
                  onChange={handleChange}
                  placeholder="Referral, social media, YouTube, etc."
                />

                <TextAreaField
                  label="Anything else we should know?"
                  name="anythingElse"
                  value={formData.anythingElse}
                  onChange={handleChange}
                  placeholder="Links to previous interviews, topics you're passionate about, scheduling preferences, etc."
                  rows={3}
                />

                {/* Error Message */}
                {status === 'error' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
                    {errorMessage}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="group w-full px-12 py-5 bg-accent text-black text-lg font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(42,221,27,0.4)] active:scale-[0.98] relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none uppercase tracking-wider"
                >
                  <span className="relative z-10">
                    {status === 'loading' ? 'Submitting...' : 'Submit Your Story →'}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                </button>
              </form>
            )}
          </div>
        </section>

        {/* What to Expect */}
        <section className="pb-24 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12">What to Expect</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: '',
                  title: 'Pre-Interview Call',
                  description:
                    '15-minute prep call to nail your story angle and talking points.',
                },
                {
                  icon: '',
                  title: 'Studio Session',
                  description:
                    '60-90 minutes in our Las Vegas studio. Professional production, relaxed conversation.',
                },
                {
                  icon: '',
                  title: 'Distribution',
                  description:
                    'Published on YouTube + all podcast platforms. Clips for your social media included.',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="glass-card p-8 text-center hover:border-accent transition-all group"
                >
                  <div className="text-5xl mb-4">{card.icon}</div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-accent transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-text-secondary">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </HomePageWrapper>
  );
}

/* ── Reusable Form Components ── */

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

function Field({ label, name, value, onChange, type = 'text', required, placeholder }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-text-secondary mb-2">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
      />
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  required?: boolean;
}

function SelectField({ label, name, value, onChange, options, required }: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-text-secondary mb-2">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors appearance-none"
      >
        <option value="" disabled>
          Select...
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}

function TextAreaField({ label, name, value, onChange, required, placeholder, rows = 4 }: TextAreaFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-text-secondary mb-2">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-y"
      />
    </div>
  );
}
