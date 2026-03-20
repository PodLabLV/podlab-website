import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import LabNavigation from '@/components/LabNavigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Globe, Check, Smartphone, Zap, Search, BarChart3 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SiteLab — High-Converting Websites',
  description: 'Conversion-focused website design built to turn visitors into leads and clients.',
  openGraph: {
    title: 'SiteLab — High-Converting Websites',
    description: 'Conversion-focused website design built to turn visitors into leads and clients.',
    url: '/labs/site',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'PodLab SiteLab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SiteLab — High-Converting Websites',
    description: 'Conversion-focused website design built to turn visitors into leads and clients.',
    images: ['/opengraph-image.png'],
    creator: '@podlab',
  },
};

const features = [
  {
    icon: Smartphone,
    title: 'Conversion-Optimized Website',
    description: 'Designed and developed with strategic copy and mobile responsiveness.',
    includes: ['Custom design', 'Mobile-first approach', 'Fast loading times', 'Clean code'],
  },
  {
    icon: Zap,
    title: 'Strategic Copy',
    description: 'Homepage, services, about, contact, and case studies written to convert.',
    includes: ['Homepage copy', 'Service pages', 'About page', 'Case studies'],
  },
  {
    icon: Search,
    title: 'Video Integration',
    description: 'Placements planned for your VideoSalesLab videos to maximize impact.',
    includes: ['Video placement strategy', 'Embed optimization', 'Loading optimization', 'Mobile video UX'],
  },
  {
    icon: BarChart3,
    title: 'Analytics Setup',
    description: 'Google Analytics 4, heatmaps, and form tracking to measure performance.',
    includes: ['GA4 setup', 'Conversion tracking', 'Heatmap integration', 'Form analytics'],
  },
];

const whoItsFor = [
  "Founders whose websites don't convert (high traffic, low bookings)",
  'Businesses with outdated, amateur, or generic sites',
  "Teams frustrated by websites that don't reflect business quality",
  'Anyone ready for a site that actually drives revenue',
];

export default function SiteLabPage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-20">
          <LabNavigation currentLab="SiteLab" />
        </div>

        {/* Hero Section */}
        <section className="relative pt-8 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-bold mb-4">SiteLab</h1>
            <p className="text-2xl md:text-3xl text-accent font-bold mb-4">
              Your Website Becomes Your Best Salesperson
            </p>
            <p className="text-xl text-text-secondary leading-relaxed mb-6">
              A website isn't a brochure—it's a conversion machine. SiteLab builds mobile-first, SEO-optimized sites
              designed to turn visitors into leads and leads into clients.
            </p>
            <p className="text-lg text-text-secondary leading-relaxed mb-8">
              Your website isn't a digital business card. It's your 24/7 sales team. SiteLab turns your site into a 
              pre-selling machine that educates prospects, answers objections, and drives qualified bookings — without you touching it.
            </p>
            <div className="mb-12">
              <a
                href="https://calendly.com/podlablv/strategy-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
              >
                Build Your Site
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(42,221,27,0.3)]">
                <div className="aspect-video">
                  <iframe
                    src="https://www.youtube.com/embed/PUcAbdizyao"
                    title="SiteLab Video"
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
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Perfect for founders who need a site that actually converts</h2>
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

        {/* Features Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">Built to Convert</p>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold">More than a pretty website</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="glass-card p-8">
                    <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                      <Icon className="w-7 h-7 text-accent" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-text-secondary leading-relaxed mb-6">{feature.description}</p>
                    <div className="space-y-2">
                      {feature.includes.map((include, i) => (
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
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Website that sells 24/7 without founder involvement</h2>
              <p className="text-xl text-text-secondary leading-relaxed">
                Your website will work around the clock to educate prospects, build trust, and drive qualified bookings. 
                Visitors will understand what you do, why you're different, and how to work with you—all before they ever 
                speak to you. Less time explaining, more time closing.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card p-5 sm:p-8 md:p-12 text-center border-2 border-accent">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full text-accent text-sm font-medium mb-6">
                <Globe className="w-4 h-4" />
                Complete Package
              </div>
              <h3 className="text-3xl font-bold mb-4">SiteLab</h3>
              <div className="mb-2">
                <span className="text-sm text-text-secondary line-through">Perceived Value: $15,000+</span>
              </div>
              <p className="text-4xl md:text-5xl font-bold text-accent mb-6">$3,500+</p>
              <p className="text-text-secondary max-w-md mx-auto mb-8">
                A custom website built to convert visitors into clients, 24/7.
              </p>
              <ul className="space-y-3 text-left max-w-sm mx-auto mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Conversion-optimized design</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Strategic copy for all pages</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Video integration strategy</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Analytics & tracking setup</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Mobile-responsive</span>
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
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-6">Ready for a website that actually works?</h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              Let's build a site that converts visitors while you sleep.
            </p>
            <a
              href="https://calendly.com/podlablv/strategy-call"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
            >
              Build Your Site
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </section>
      </div>
    </HomePageWrapper>
  );
}
