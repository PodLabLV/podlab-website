import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import LabNavigation from '@/components/LabNavigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Check, BarChart3, Target, Megaphone, Users } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ExpansionLab — Ongoing Growth Engine',
  description: 'Fractional CMO support, campaign management, and growth strategy for scaling founders.',
  openGraph: {
    title: 'ExpansionLab — Ongoing Growth Engine',
    description: 'Fractional CMO support, campaign management, and growth strategy for scaling founders.',
    url: '/labs/expansion',
    images: [{ url: 'https://podlablv.com/labs-expansion-og.png', width: 1366, height: 768, alt: 'PodLab ExpansionLab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ExpansionLab — Ongoing Growth Engine',
    description: 'Fractional CMO support, campaign management, and growth strategy for scaling founders.',
    images: ['https://podlablv.com/labs-expansion-og.png'],
    creator: '@podlab',
  },
};

const services = [
  {
    title: 'Monthly Strategy Session',
    description: '60-90 minute session to review performance and plan next moves.',
    icon: BarChart3,
  },
  {
    title: 'Campaign Execution',
    description: 'Ads, emails, landing pages, and lead magnets built and launched for you.',
    icon: Target,
  },
  {
    title: 'Content Calendar',
    description: '4-8 posts per week across platforms to maintain consistent presence.',
    icon: Megaphone,
  },
  {
    title: 'Performance Reporting',
    description: 'Monthly reports tracking leads, bookings, revenue, and ROI.',
    icon: Users,
  },
];

const whoItsFor = [
  "Founders who've completed AssetsLab → VideoSalesLab and want ongoing growth",
  'Businesses with inconsistent lead flow',
  'Teams without in-house marketing expertise',
  'Anyone ready to scale marketing without hiring full-time CMO or agency',
];

export default function ExpansionLabPage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-20">
          <LabNavigation currentLab="ExpansionLab" />
        </div>

        {/* Hero Section */}
        <section className="relative pt-8 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-xl sm:text-2xl md:text-5xl lg:text-7xl font-bold mb-4">ExpansionLab</h1>
            <p className="text-2xl md:text-3xl text-accent font-bold mb-4">
              Predictable Growth Without Founder Dependency
            </p>
            <p className="text-xl text-text-secondary leading-relaxed mb-6">
              You've built the foundation. Now it's time to pour fuel on the fire. ExpansionLab provides fractional CMO
              services, campaign management, and growth strategy for founders ready to scale aggressively.
            </p>
            <p className="text-lg text-text-secondary leading-relaxed mb-8">
              Think of it as your in-house growth team, without the overhead. We strategize, execute, optimize, and 
              report — so you get predictable, scalable growth without managing another vendor or employee.
            </p>
            <div className="mb-12">
              <a
                href="https://calendly.com/podlablv/strategy-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
              >
                Scale Your Growth
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(42,221,27,0.3)]">
                <div className="aspect-video">
                  <iframe
                    src="https://www.youtube.com/embed/5_ixoMgvv48"
                    title="ExpansionLab Video"
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
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Perfect for founders ready to scale systematically</h2>
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

        {/* Services Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">What We Do</p>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold">Executive-level marketing support</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <div key={index} className="glass-card p-8">
                    <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                      <Icon className="w-7 h-7 text-accent" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                    <p className="text-text-secondary leading-relaxed text-lg">{service.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Deliverables Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-5 sm:p-8 md:p-12">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">What You Get</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Ongoing growth engine</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xl font-semibold mb-2">Monthly Strategy Session</p>
                    <p className="text-text-secondary">60-90 min review + planning call every month</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xl font-semibold mb-2">Campaign Execution</p>
                    <p className="text-text-secondary">Ads, emails, landing pages, and lead magnets</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xl font-semibold mb-2">Content Calendar</p>
                    <p className="text-text-secondary">4-8 posts/week across platforms</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xl font-semibold mb-2">Performance Report</p>
                    <p className="text-text-secondary">Leads, bookings, revenue, and ROI tracking</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Outcome Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-5 sm:p-8 md:p-12">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">The Outcome</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Predictable, scalable growth on autopilot</h2>
              <p className="text-xl text-text-secondary leading-relaxed">
                You'll have a dedicated growth team executing campaigns, creating content, and optimizing performance 
                every month. No more wondering where your next lead will come from. No more managing multiple vendors. 
                Just consistent, measurable growth while you focus on delivery and vision.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card p-5 sm:p-8 md:p-12 text-center border-2 border-accent">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full text-accent text-sm font-medium mb-6">
                <TrendingUp className="w-4 h-4" />
                Monthly Retainer
              </div>
              <h3 className="text-3xl font-bold mb-4">ExpansionLab</h3>
              <p className="text-4xl md:text-5xl font-bold text-accent mb-2">$5,000+</p>
              <p className="text-sm text-text-secondary mb-6">/month</p>
              <p className="text-text-secondary max-w-md mx-auto mb-8">
                Fractional CMO services and campaign management. Pricing scales with your ad spend and needs.
              </p>
              <ul className="space-y-3 text-left max-w-sm mx-auto mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Unlimited campaign management</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Custom growth strategy</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Executive-level support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Monthly reporting & optimization</span>
                </li>
              </ul>
              <a
                href="https://calendly.com/podlablv/strategy-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
              >
                Schedule a Call
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center glass-card p-6 md:p-12">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-6">Ready to scale?</h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              Let's talk about your growth goals and build a plan to get there.
            </p>
            <a
              href="https://calendly.com/podlablv/strategy-call"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
            >
              Scale Your Growth
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </section>
      </div>
    </HomePageWrapper>
  );
}
