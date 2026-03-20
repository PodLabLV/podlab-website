import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import LabNavigation from '@/components/LabNavigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, PlayCircle, Check, Film, MessageSquare, Users, RefreshCw, Target } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VideoSalesLab — Duplicate Yourself on Camera',
  description: 'Five core sales videos that educate, persuade, and close while you sleep.',
  openGraph: {
    title: 'VideoSalesLab — Duplicate Yourself on Camera',
    description: 'Five core sales videos that educate, persuade, and close while you sleep.',
    url: '/labs/video-sales',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'PodLab VideoSalesLab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VideoSalesLab — Duplicate Yourself on Camera',
    description: 'Five core sales videos that educate, persuade, and close while you sleep.',
    images: ['/opengraph-image.png'],
    creator: '@podlab',
  },
};

const videos = [
  {
    title: 'Founder Video',
    description: 'Your origin story and why you built this business. Builds trust and connection.',
    icon: Users,
  },
  {
    title: 'Explainer Video',
    description: "What you do, how it works, and who it's for. Clarifies your offer instantly.",
    icon: Film,
  },
  {
    title: 'Video Sales Letter (VSL)',
    description: 'The persuasive video that moves prospects from interest to action.',
    icon: Target,
  },
  {
    title: 'FAQ Suite',
    description: 'Answer common objections on video so prospects pre-qualify themselves.',
    icon: MessageSquare,
  },
  {
    title: 'Testimonial Compilation',
    description: 'Social proof from real clients that validates your results.',
    icon: RefreshCw,
  },
];

const whoItsFor = [
  'Founders spending 20+ hours/week on sales calls',
  'Businesses with no video presence (or low-quality DIY videos)',
  'Teams ready to scale trust without scaling founder involvement',
  'Anyone who wants to duplicate their best sales moves and deploy them 24/7',
];

export default function VideoSalesLabPage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-20">
          <LabNavigation currentLab="VideoSalesLab" />
        </div>

        {/* Hero Section */}
        <section className="relative pt-8 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-xl sm:text-2xl md:text-5xl lg:text-7xl font-bold mb-4">VideoSalesLab</h1>
            <p className="text-2xl md:text-3xl text-accent font-bold mb-4">
              Duplicate Yourself in One Recording Session
            </p>
            <p className="text-xl text-text-secondary leading-relaxed mb-6">
              The core video assets every founder needs: VSL, testimonial compilation, explainer, FAQ suite, and founder story. 
              One filming day. Five evergreen selling machines.
            </p>
            <p className="text-lg text-text-secondary leading-relaxed mb-8">
              These aren't generic content pieces. They're sales-duplicating assets engineered to move prospects through 
              the entire customer journey (awareness → trust → conversion) while you focus on closing deals, not explaining basics.
            </p>
            <div className="mb-12">
              <a
                href="https://calendly.com/podlablv/strategy-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
              >
                Build Your Video Arsenal
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(42,221,27,0.3)]">
                <div className="aspect-video">
                  <iframe
                    src="https://www.youtube.com/embed/v-i3msWxH0s"
                    title="VideoSalesLab Video"
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
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Perfect for founders ready to scale without burning out</h2>
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

        {/* Videos Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm text-accent font-semibold uppercase tracking-wide mb-4">The 5 Essential Videos</p>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold">Every video you need to sell</h2>
            </div>

            <div className="space-y-6">
              {videos.map((video, index) => {
                const Icon = video.icon;
                return (
                  <div key={index} className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold mb-2">{video.title}</h3>
                      <p className="text-text-secondary leading-relaxed text-base sm:text-lg">{video.description}</p>
                    </div>
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
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Complete video suite + repurposing strategy</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xl font-semibold mb-2">5 Strategic Video Assets</p>
                    <p className="text-text-secondary">Filmed in our $150K state-of-the-art studio in one day</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xl font-semibold mb-2">Custom Thumbnails</p>
                    <p className="text-text-secondary">On-brand thumbnails with neon green play buttons</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xl font-semibold mb-2">Video Integration Plan</p>
                    <p className="text-text-secondary">Exactly where to deploy each video and how to use them</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xl font-semibold mb-2">6-12 Months of Content</p>
                    <p className="text-text-secondary">Repurpose into clips, reels, and carousel posts</p>
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
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Video suite that pre-sells prospects 24/7</h2>
              <p className="text-xl text-text-secondary leading-relaxed">
                Your videos will work around the clock to educate, build trust, and move prospects toward booking. 
                You'll spend less time on discovery calls and more time closing qualified leads who already understand 
                what you do and why you're the right choice.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card p-5 sm:p-8 md:p-12 text-center border-2 border-accent">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full text-accent text-sm font-medium mb-6">
                <PlayCircle className="w-4 h-4" />
                Complete Package
              </div>
              <h3 className="text-3xl font-bold mb-4">VideoSalesLab</h3>
              <div className="mb-2">
                <span className="text-sm text-text-secondary line-through">Perceived Value: $25,000+</span>
              </div>
              <p className="text-4xl md:text-5xl font-bold text-accent mb-6">$10,000</p>
              <p className="text-text-secondary max-w-md mx-auto mb-8">
                5 professional video assets that work for you 24/7. Filmed in one day.
              </p>
              <ul className="space-y-3 text-left max-w-sm mx-auto mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">5 strategic video assets</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Custom thumbnails</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">Video integration plan</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">6-12 months of content</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-secondary">One day of filming</span>
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
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-6">Ready to create videos that sell?</h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              One day of filming. Five evergreen assets. Let's build your video sales machine.
            </p>
            <a
              href="https://calendly.com/podlablv/strategy-call"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
            >
              Build Your Video Arsenal
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </section>
      </div>
    </HomePageWrapper>
  );
}
