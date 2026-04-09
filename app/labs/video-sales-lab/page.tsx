import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import LabNavigation from '@/components/LabNavigation';
import Link from 'next/link';
import { ArrowRight, Check, Video, Users, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import TypeformEmbed from './TypeformEmbed';

// Set via NEXT_PUBLIC_VSL_TYPEFORM_ID in environment variables
const TYPEFORM_FORM_ID = process.env.NEXT_PUBLIC_VSL_TYPEFORM_ID || 'YOUR_FORM_ID';

export const metadata: Metadata = {
  title: 'VideoSalesLab — $10K/mo Video Sales System for $1M–$8M Founders',
  description:
    'One filming day. Five evergreen selling machines. Stop repeating yourself on sales calls — duplicate your best pitch into video assets that close 24/7.',
  openGraph: {
    title: 'VideoSalesLab — Duplicate Yourself on Camera',
    description:
      'One filming day. Five evergreen selling machines. Stop repeating yourself on sales calls — duplicate your best pitch into video assets that close 24/7.',
    url: 'https://podlablv.com/labs/video-sales-lab',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'PodLab VideoSalesLab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VideoSalesLab — Duplicate Yourself on Camera',
    description:
      'One filming day. Five evergreen selling machines. Stop repeating yourself on sales calls — duplicate your best pitch into video assets that close 24/7.',
    images: ['/opengraph-image.png'],
    creator: '@podlab',
  },
  alternates: {
    canonical: 'https://podlablv.com/labs/video-sales-lab',
  },
};

const valueProps = [
  {
    icon: Video,
    headline: 'Record Once. Close Forever.',
    body: 'Your best sales pitch — filmed in our $150K studio, edited to perfection, and deployed 24/7. Stop re-explaining yourself on every discovery call.',
  },
  {
    icon: Users,
    headline: 'Qualify Leads Before They Call You.',
    body: 'Strategic video assets pre-educate prospects so they arrive sold. You spend time closing, not convincing.',
  },
  {
    icon: TrendingUp,
    headline: 'One Day. Six to Twelve Months of Content.',
    body: 'Five core video assets that repurpose into clips, reels, and carousels — your entire social content calendar, handled.',
  },
];

const deliverables = [
  'Founder Story Video — builds trust before the first call',
  'Explainer Video — clarifies your offer, filters bad-fit leads',
  'Video Sales Letter (VSL) — the core persuasion engine',
  'FAQ Video Suite — handles objections automatically',
  'Testimonial Compilation — social proof on demand',
];

export default function VideoSalesLabFunnelPage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-20">
          <LabNavigation currentLab="VideoSalesLab" />
        </div>

        {/* ─── Hero ─── */}
        <section className="relative pt-8 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm text-accent font-semibold uppercase tracking-widest mb-4">VideoSalesLab</p>
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Stop Selling.<br className="hidden sm:block" />
              <span className="text-accent">Start Duplicating.</span>
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary leading-relaxed mb-4 max-w-3xl mx-auto">
              One filming day. Five evergreen selling machines. Your best pitch — on camera, working 24/7, closing deals while you sleep.
            </p>
            <p className="text-lg text-text-secondary mb-10 max-w-2xl mx-auto">
              For $1M–$8M founders spending 20+ hours a week on repetitive sales conversations.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://calendly.com/podlablv/strategy-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all text-lg"
              >
                Book a Strategy Call
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#apply"
                className="inline-flex items-center gap-2 px-8 py-4 border border-accent/40 text-accent font-semibold rounded-lg hover:border-accent hover:bg-accent/5 transition-all text-lg"
              >
                Apply to Work With Us
              </a>
            </div>
          </div>
        </section>

        {/* ─── Value Props ─── */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold">Why VideoSalesLab</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {valueProps.map((prop, i) => {
                const Icon = prop.icon;
                return (
                  <div key={i} className="glass-card p-8 flex flex-col gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="text-xl font-bold">{prop.headline}</h3>
                    <p className="text-text-secondary leading-relaxed">{prop.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── Social Proof / Case Study ─── */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-8 md:p-12 border border-accent/20">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-6">Client Result</p>
              <div className="glass-card p-6 mb-8 border-accent/20 inline-block w-full">
                <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Revenue Journey</div>
                <div className="text-3xl font-bold">
                  $1.2M → <span className="text-accent">$1.9M</span>
                </div>
                <div className="text-text-secondary mt-1">58% growth in 8 months</div>
              </div>
              <blockquote className="text-xl md:text-2xl text-white italic leading-relaxed mb-6">
                "They didn't just give us marketing. They gave us infrastructure. I'm not the product anymore. I'm the CEO."
              </blockquote>
              <p className="text-text-secondary mb-6">— CEO, Legacy Home Services Brand</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-3 text-text-secondary">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  Sales time cut from 20hrs/week to 10hrs/week
                </li>
                <li className="flex items-center gap-3 text-text-secondary">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  Inbound leads doubled within 90 days
                </li>
                <li className="flex items-center gap-3 text-text-secondary">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  Close rate improved 35%
                </li>
              </ul>
              <div className="mt-8">
                <Link
                  href="/case-studies"
                  className="inline-flex items-center gap-2 text-accent font-semibold hover:underline"
                >
                  See all case studies
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── What You Get ─── */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-8 md:p-12 border-2 border-accent">
              <div className="text-center mb-10">
                <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">The Package</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">5 Videos. 1 Day. $10,000.</h2>
                <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                  Everything you need to sell without being present — built in our $150K studio in a single filming day.
                </p>
              </div>
              <ul className="space-y-4 mb-10">
                {deliverables.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-text-secondary">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="text-center">
                <p className="text-4xl font-bold text-accent mb-2">$10,000</p>
                <p className="text-text-secondary mb-8">One-time investment. Evergreen assets.</p>
                <a
                  href="https://calendly.com/podlablv/strategy-call"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
                >
                  Book Your Strategy Call
                  <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Typeform Intake ─── */}
        <section id="apply" className="py-20 px-6 scroll-mt-20">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">Apply</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                Ready to Duplicate Yourself?
              </h2>
              <p className="text-text-secondary text-lg">
                Tell us about your business. We'll reach out within 24 hours to see if you're a fit.
              </p>
            </div>
            <div className="glass-card p-2 sm:p-4">
              <TypeformEmbed formId={TYPEFORM_FORM_ID} />
            </div>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center glass-card p-8 md:p-12">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-6">
              The $10K/mo anchor offer starts with one filming day.
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              Spots are limited — we only take clients who are ready to execute. Book your call to see if VideoSalesLab is the right fit.
            </p>
            <a
              href="https://calendly.com/podlablv/strategy-call"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
            >
              Book a Strategy Call
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </section>
      </div>
    </HomePageWrapper>
  );
}
