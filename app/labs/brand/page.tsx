import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import LabNavigation from '@/components/LabNavigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Palette, Check, Type, Droplet, Layers, FileImage } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BrandLab — Premium Brand Identity',
  description: 'Visual identity systems that include logo, color, typography, and brand guidelines.',
  openGraph: {
    title: 'BrandLab — Premium Brand Identity',
    description: 'Visual identity systems that include logo, color, typography, and brand guidelines.',
    url: '/labs/brand',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'PodLab BrandLab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BrandLab — Premium Brand Identity',
    description: 'Visual identity systems that include logo, color, typography, and brand guidelines.',
    images: ['/opengraph-image.png'],
    creator: '@podlab',
  },
};

const deliverables = [
  {
    icon: Layers,
    title: 'Logo & Visual Identity',
    description: 'Primary logo, variations, and usage guidelines that represent your brand professionally.',
    includes: ['Primary logo', 'Logo variations', 'Icon versions', 'Usage guidelines'],
  },
  {
    icon: FileImage,
    title: 'Brand Guidelines',
    description: 'Complete rulebook for colors, typography, imagery, voice & tone to maintain consistency.',
    includes: ['Color palette', 'Typography system', 'Imagery style', 'Voice & tone guide'],
  },
  {
    icon: Type,
    title: 'Messaging Templates',
    description: 'Ready-to-use templates for email sequences, social posts, and sales pitches.',
    includes: ['Email templates', 'Social post formats', 'Sales pitch scripts', 'Response templates'],
  },
  {
    icon: Droplet,
    title: 'Brand Kit',
    description: 'Complete Figma file with all assets and exports for immediate use across platforms.',
    includes: ['Figma source file', 'Export library', 'Asset templates', 'Implementation guide'],
  },
];

const whoItsFor = [
  'Founders embarrassed by their current brand',
  'Businesses losing deals because they look less polished than competitors',
  'Teams struggling with brand consistency',
  'Anyone ready to position as a premium, category-leading brand',
];

export default function BrandLabPage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-20">
          <LabNavigation currentLab="BrandLab" />
        </div>

        {/* Hero Section */}
        <section className="relative pt-8 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-bold mb-4">BrandLab</h1>
            <p className="text-2xl md:text-3xl text-accent font-bold mb-4">
              Look Like the Leader You Already Are
            </p>
            <p className="text-xl text-text-secondary leading-relaxed mb-6">
              Your visual identity should command respect before you say a word. BrandLab creates a complete visual
              system—logo, colors, typography, and guidelines—that positions you as the premium choice.
            </p>
            <p className="text-lg text-text-secondary leading-relaxed mb-8">
              No more amateur DIY logos or inconsistent visuals. BrandLab positions you as the category leader, 
              even if you're not the biggest player yet.
            </p>
            <div className="mb-12">
              <a
                href="https://calendly.com/podlablv/strategy-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
              >
                Build Your Brand
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(42,221,27,0.3)]">
                <div className="aspect-video">
                  <iframe
                    src="https://www.youtube.com/embed/L71CAugSo5g"
                    title="BrandLab Video"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Who It's For Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-5 sm:p-8 md:p-12">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">Who It's For</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Perfect for founders ready to level up their visual presence</h2>
              <ul className="space-y-4">
                {whoItsFor.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-accent text-2xl flex-shrink-0">→</span>
                    <span className="text-xl text-text-secondary pt-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Deliverables Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">What You Get</p>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold">Complete visual identity system</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              {deliverables.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="glass-card p-8">
                    <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                      <Icon className="w-7 h-7 text-accent" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                    <p className="text-text-secondary leading-relaxed mb-6">{item.description}</p>
                    <div className="space-y-2">
                      {item.includes.map((include, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-accent flex-shrink-0" />
                          <span className="text-text-secondary">{include}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Outcome Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-5 sm:p-8 md:p-12">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">The Outcome</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Professional brand presence that matches business quality</h2>
              <p className="text-xl text-text-secondary leading-relaxed">
                You'll have a complete brand identity that positions you as a market leader. Every touchpoint—from your 
                website to your business cards—will reflect the quality of your work. Your team will know exactly how to 
                represent the brand, and prospects will see you as the premium choice.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card p-5 sm:p-8 md:p-12 text-center border-2 border-accent">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full text-accent text-sm font-medium mb-6">
                <Palette className="w-4 h-4" />
                Complete Package
              </div>
              <h3 className="text-3xl font-bold mb-4">BrandLab</h3>
              <div className="mb-2">
                <span className="text-sm text-text-secondary line-through">Perceived Value: $12,000+</span>
              </div>
              <p className="text-4xl md:text-5xl font-bold text-accent mb-6">$3,500</p>
              <p className="text-text-secondary max-w-md mx-auto mb-8">
                A complete visual identity that positions you as the premium choice in your market.
              </p>
              <ul className="space-y-3 text-left max-w-sm mx-auto mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Logo & Visual Identity</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Brand Guidelines</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Messaging Templates</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Brand Kit (Figma + exports)</span>
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
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-6">Ready for a brand that commands respect?</h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              Let's create a visual identity that makes you unforgettable.
            </p>
            <a
              href="https://calendly.com/podlablv/strategy-call"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
            >
              Build Your Brand
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </section>
      </div>
    </HomePageWrapper>
  );
}
