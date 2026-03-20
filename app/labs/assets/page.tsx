import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import LabNavigation from '@/components/LabNavigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MessageSquare, User, Target, Lightbulb, Check, FileText } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AssetsLab — Strategic Clarity for Founders',
  description: 'Messaging, avatar, and positioning foundations that guide your content and offers.',
  openGraph: {
    title: 'AssetsLab — Strategic Clarity for Founders',
    description: 'Messaging, avatar, and positioning foundations that guide your content and offers.',
    url: '/labs/assets',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'PodLab AssetsLab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AssetsLab — Strategic Clarity for Founders',
    description: 'Messaging, avatar, and positioning foundations that guide your content and offers.',
    images: ['/opengraph-image.png'],
    creator: '@podlab',
  },
};

const pillars = [
  {
    icon: MessageSquare,
    title: 'Internal DNA',
    description: 'Living knowledge base for your team with clear positioning and messaging.',
    deliverables: [
      'Customer avatar deep dive',
      'Mission & vision clarity',
      'Dialed-in offer positioning',
      'Customer journey map',
      'Brand voice guide',
    ],
  },
  {
    icon: User,
    title: 'External DNA',
    description: 'Clarity document for vendors and partners to understand your business.',
    deliverables: [
      'Company overview',
      'Target market definition',
      'Competitive positioning',
      'Key messaging points',
      'Brand guidelines',
    ],
  },
  {
    icon: Target,
    title: 'Hook Bank',
    description: '50+ ready-to-use content angles that resonate with your audience.',
    deliverables: [
      'Pain point hooks',
      'Solution-focused angles',
      'Social proof themes',
      'Educational topics',
      'Conversion-focused CTAs',
    ],
  },
  {
    icon: Lightbulb,
    title: 'Content Roadmap',
    description: '90-day plan with topics, formats, and platforms mapped out.',
    deliverables: [
      'Content calendar',
      'Platform strategy',
      'Format recommendations',
      'Publishing schedule',
      'Performance KPIs',
    ],
  },
];

const process = [
  { step: '1', title: 'Discovery', description: 'Deep dive into your business and goals.' },
  { step: '2', title: 'Avatar Workshop', description: 'Define your ideal customer profile.' },
  { step: '3', title: 'Messaging Framework', description: 'Build your core messaging foundation.' },
  { step: '4', title: 'Content Strategy', description: 'Create your 90-day roadmap.' },
  { step: '5', title: 'Training & Handoff', description: 'Equip your team to execute.' },
];

export default function AssetsLabPage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-20">
          <LabNavigation currentLab="AssetsLab" />
        </div>

        {/* Hero Section */}
        <section className="relative pt-8 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-bold mb-4">AssetsLab</h1>
            <p className="text-2xl md:text-3xl text-accent font-bold mb-4">
              Know Exactly Who You Are and What You Sell
            </p>
            <p className="text-xl text-text-secondary leading-relaxed mb-6">
              Before you create a single piece of content, you need clarity. AssetsLab builds the strategic foundation
              that makes all your marketing work harder—messaging, avatar, offer positioning, and content pillars.
            </p>
            <p className="text-lg text-text-secondary leading-relaxed mb-8">
              Most founders skip this step. They jump straight to content without strategy. That's why their marketing feels 
              random and their message gets ignored. AssetsLab fixes that.
            </p>
            <div className="mb-12">
              <a
                href="https://calendly.com/podlablv/strategy-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
              >
                Build Your Foundation
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>

            {/* Centered Video */}
            <div className="max-w-3xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(42,221,27,0.3)]">
                <div className="aspect-video">
                  <iframe
                    src="https://www.youtube.com/embed/DaaI23DU4_I"
                    title="AssetsLab Video"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-5 sm:p-8 md:p-12">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">The Problem</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Most founders skip the foundation and wonder why nothing works</h2>
              <p className="text-xl text-text-secondary leading-relaxed">
                You jump straight into creating content, building funnels, running ads—but without strategic clarity,
                you're just making noise. Your messaging is scattered. Your positioning is unclear. Your audience doesn't
                understand why they should choose you.
              </p>
            </div>
          </div>
        </section>

        {/* Deliverables Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">What You Get</p>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold">Four strategic pillars</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {pillars.map((pillar, index) => {
                const Icon = pillar.icon;
                return (
                  <div key={index} className="glass-card p-8">
                    <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                      <Icon className="w-7 h-7 text-accent" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{pillar.title}</h3>
                    <p className="text-text-secondary leading-relaxed mb-6">{pillar.description}</p>
                    <div className="space-y-2">
                      {pillar.deliverables.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-accent flex-shrink-0" />
                          <span className="text-text-secondary">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">The Process</p>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold">How we build your assets</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {process.map((step, index) => (
                <div key={index} className="glass-card p-6">
                  <span className="text-4xl font-bold text-accent">{step.step}</span>
                  <h3 className="text-xl font-bold mt-2 mb-2">{step.title}</h3>
                  <p className="text-sm text-text-secondary">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card p-5 sm:p-8 md:p-12 text-center border-2 border-accent">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full text-accent text-sm font-medium mb-6">
                <FileText className="w-4 h-4" />
                Complete Package
              </div>
              <h3 className="text-3xl font-bold mb-4">AssetsLab</h3>
              <div className="mb-2">
                <span className="text-sm text-text-secondary line-through">Perceived Value: $5,000+</span>
              </div>
              <p className="text-4xl md:text-5xl font-bold text-accent mb-6">$1,500</p>
              <p className="text-text-secondary max-w-md mx-auto mb-8">
                Everything you need to build a rock-solid strategic foundation for your brand and content.
              </p>
              <ul className="space-y-3 text-left max-w-sm mx-auto mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Internal DNA (living knowledge base)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">External DNA (clarity document)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Hook Bank (50+ content angles)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">90-day Content Roadmap</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Training session included</span>
                </li>
              </ul>
              <a
                href="https://calendly.com/podlablv/strategy-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center glass-card p-6 md:p-12">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-6">Ready to stop winging it?</h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              Build the strategic foundation that makes everything else work. Start with AssetsLab.
            </p>
            <a
              href="https://calendly.com/podlablv/strategy-call"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
            >
              Build Your Foundation
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </section>
      </div>
    </HomePageWrapper>
  );
}
