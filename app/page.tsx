import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import PodsSection from '@/components/PodsSection';
import LabsSection from '@/components/LabsSection';
import EssentialsLabCta from '@/components/EssentialsLabCta';
import Link from 'next/link';
import ImageWithHover from '@/components/ImageWithHover';
import FadeIn from '@/components/FadeIn';
import CounterNumber from '@/components/CounterNumber';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PodLab - Duplicate Yourself, Scale Without Burning Out',
  description: 'Turn your expertise into strategic 4K video assets that sell 24/7. No more founder bottleneck. For $1M–$8M service-based founders. Record once. Sell forever.',
  openGraph: {
    title: 'PodLab - Duplicate Yourself, Scale Without Burning Out',
    description: 'Turn your expertise into strategic 4K video assets that sell 24/7. No more founder bottleneck.',
    url: 'https://podlablv.com',
    images: [{ url: 'https://podlablv.com/podlab-og.png', width: 1366, height: 768, alt: 'PodLab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PodLab - Duplicate Yourself, Scale Without Burning Out',
    description: 'Turn your expertise into strategic 4K video assets that sell 24/7. No more founder bottleneck.',
    images: ['https://podlablv.com/podlab-og.png'],
  },
};

export default function HomePage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />
      
      {/* Hero Section — clean, Unicorn bg shows through */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center py-32" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
          <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-8 font-display leading-[0.95] tracking-tight">
            <span className="inline-block hover:text-accent transition-colors duration-500">Duplicate</span>{" "}
            <span className="inline-block bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">Yourself.</span>
            <br />
            <span className="inline-block text-text-secondary hover:text-white transition-colors duration-500">Scale Without</span>{" "}
            <span className="inline-block text-accent drop-shadow-[0_0_25px_rgba(42,221,27,0.5)]">Burning Out.</span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-text-secondary mb-16 max-w-4xl mx-auto leading-relaxed font-light px-4">
            You're the <span className="text-white font-semibold">bottleneck</span>. Every sale, every trust-building moment requires <span className="text-white font-semibold">you personally</span>.
            <br />
            <span className="text-accent font-bold mt-4 inline-block">There's a better way.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
            <a
              href="https://calendly.com/podlablv/strategy-call"
              target="_blank"
              rel="noopener noreferrer"
              className="group px-8 py-4 md:px-16 md:py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(42,221,27,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
            >
              <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Schedule Clarity →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            </a>
            <Link
              href="/assessment"
              className="px-12 py-6 border-2 border-accent text-accent text-xl font-bold rounded-xl hover:bg-accent hover:text-black transition-all hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(42,221,27,0.3)] uppercase tracking-wider"
            >
              Take Assessment
            </Link>
          </div>

          {/* Video integrated into Hero */}
          <div className="max-w-5xl mx-auto">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(42,221,27,0.4)] border-2 border-accent/20">
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/79ROJxsnCW4?autoplay=0&mute=0&loop=1&playlist=79ROJxsnCW4&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1"
                title="PodLab Introduction Video"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* Problem + Solution — no bg video/image, just clean content */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto space-y-32">
          {/* Problem Section */}
          <FadeIn direction="up">
          <div className="max-w-5xl mx-auto glass-card p-8 md:p-12">
            <h3 className="text-2xl md:text-4xl lg:text-5xl font-black mb-12 text-center leading-tight">
              You Built a <span className="text-accent drop-shadow-[0_0_20px_rgba(42,221,27,0.4)]">$3M Business</span>.<br />
              But It's Really Just a <span className="text-text-secondary">High-Paying Job.</span>
            </h3>
            
            <div>
              <div className="space-y-6 text-lg text-text-secondary leading-relaxed">
                <p>
                  You're stuck. Revenue depends on you being in every sales call. Your brand presence doesn't match your business quality. You spend 20+ hours a week explaining the same thing to different prospects.
                </p>
                <p className="font-semibold text-text-primary">
                  You didn't build a business to become its bottleneck.
                </p>
                <div className="mt-8">
                  <p className="font-bold text-text-primary mb-4">The reality:</p>
                  <ul className="space-y-3 ml-6">
                    <li>• Every deal requires you personally. If you stop, revenue stops.</li>
                    <li>• Your best sales conversation dies after the call ends.</li>
                    <li>• Prospects arrive unqualified because there's no system pre-selling them.</li>
                    <li>• You're one sick week away from your pipeline drying up.</li>
                  </ul>
                </div>
                <p className="text-xl font-semibold text-text-primary mt-8">
                  This isn't scale. It's founder dependency disguised as success.
                </p>
              </div>
            </div>
          </div>
          </FadeIn>

          {/* Solution Intro */}
          <div>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-black mb-8 text-center leading-tight">
              Record Once. <span className="text-accent drop-shadow-[0_0_30px_rgba(42,221,27,0.5)]">Sell Forever.</span>
            </h2>
            <p className="text-2xl md:text-3xl text-text-secondary mb-0 text-center max-w-4xl mx-auto font-light leading-relaxed">
              What if your best sales conversation worked <span className="text-white font-semibold">24/7</span>? What if prospects arrived <span className="text-accent font-bold">pre-sold, educated, and ready to buy?</span>
              <br /><br />
              <span className="text-white text-4xl font-bold">That's founder duplication.</span>
            </p>
          </div>

          {/* Solution Details */}
          <div className="space-y-8">
            <div className="glass-card p-8 md:p-12">
              <div className="prose prose-invert max-w-none mb-12">
                <p className="text-lg text-text-secondary leading-relaxed mb-6">
                  PodLab turns one recording session into a complete suite of strategic video assets that duplicate you across the entire customer journey.
                </p>
                
                <div className="border border-[#2E2E2E] rounded-xl p-8 mb-8">
                  <p className="font-bold text-text-primary mb-4">The result:</p>
                  <ul className="space-y-3 text-text-secondary">
                    <li>• Your video answers objections while you sleep</li>
                    <li>• Prospects book calls already convinced</li>
                    <li>• Your close rate goes up while your sales time goes down</li>
                    <li>• Your brand finally matches the business you've built</li>
                  </ul>
                </div>

                <p className="text-lg text-text-secondary mb-8">
                  We combine strategic clarity, brand development, and sales-duplicating video production in a single, phase-by-phase framework.
                </p>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div>
                    <p className="font-semibold text-text-primary mb-2">Unlike content agencies</p>
                    <p className="text-sm text-text-secondary">(ongoing dependency, no end in sight)</p>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary mb-2">Unlike business consultants</p>
                    <p className="text-sm text-text-secondary">(frameworks without execution)</p>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary mb-2">Unlike video production houses</p>
                    <p className="text-sm text-text-secondary">(pretty videos that don't convert)</p>
                  </div>
                </div>

                <p className="text-xl font-bold text-accent text-center">
                  PodLab delivers both: The framework + the assets. Built once. Working forever.
                </p>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link
                href="/services"
                className="inline-block px-10 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1"
              >
                See the 5 Labs →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The Pods - Studio Showcase */}
      <PodsSection />

      {/* Client Logos + Insider Award — clean, no bg images */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Insider Award */}
          <div className="text-center mb-16">
            <a 
              href="https://theinsiderweekly.com/podlab-best-business-growth-solution/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block group"
            >
              <ImageWithHover
                src="/insider-logo.png"
                alt="Insider Best of 2025"
                width={480}
                height={480}
                className="mx-auto mb-6 group-hover:scale-110 transition-transform duration-350"
              />
              <div className="inline-flex items-center gap-2 text-accent font-semibold group-hover:text-accent-hover transition-colors">
                <span>Read the Full Article</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          </div>

          {/* Article Summary Card */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="glass-card p-8 md:p-12 relative overflow-hidden group border-accent/20 hover:border-accent/40">
              <div className="relative z-10">
                <h3 className="text-3xl md:text-4xl font-black mb-6 text-center">
                  <span className="bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">
                    Best Business Growth Solution 2025
                  </span>
                </h3>

                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className="h-px w-16 bg-gradient-to-r from-transparent to-accent"></div>
                  <span className="text-accent font-semibold uppercase tracking-wider text-sm">Insider Weekly Award</span>
                  <div className="h-px w-16 bg-gradient-to-l from-transparent to-accent"></div>
                </div>

                <div className="space-y-6 mb-8">
                  <p className="text-lg text-text-secondary leading-relaxed text-center">
                    <span className="text-white font-semibold">Las Vegas-based PodLab</span> has been recognized by <span className="text-accent font-semibold">Insider Weekly</span> for its innovative approach to helping $1M-$8M businesses scale through strategic video content systems.
                  </p>

                  <div className="grid md:grid-cols-3 gap-6 my-8">
                    <div className="text-center p-6 rounded-xl border border-accent/10">
                      <div className="text-3xl font-black text-accent mb-2">15+</div>
                      <div className="text-sm text-text-secondary">Repurposed Clips Per Sprint</div>
                    </div>
                    <div className="text-center p-6 rounded-xl border border-accent/10">
                      <div className="text-3xl font-black text-accent mb-2">4K</div>
                      <div className="text-sm text-text-secondary">Sony FX30 Cameras</div>
                    </div>
                    <div className="text-center p-6 rounded-xl border border-accent/10">
                      <div className="text-3xl font-black text-accent mb-2">97%</div>
                      <div className="text-sm text-text-secondary">Business Failure Rate We Help Avoid</div>
                    </div>
                  </div>
                </div>

                {/* Founder Quote */}
                <blockquote className="border-l-4 border-accent pl-6 py-4 mb-8 rounded-r-xl">
                  <p className="text-xl italic text-text-secondary mb-3">
                    "We don't just make content. We engineer trust, clarity, and conversion at scale."
                  </p>
                  <cite className="text-accent font-semibold not-italic text-sm">
                    — Hiram Andino, Founder & Combat Army Veteran
                  </cite>
                </blockquote>

                {/* Key Differentiators */}
                <div className="mb-8">
                  <h4 className="text-xl font-bold mb-4 text-center text-white">What Sets PodLab Apart</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <span className="text-accent text-xl flex-shrink-0">✓</span>
                      <p className="text-text-secondary"><span className="text-white font-semibold">Systems over videos</span> — Build lasting infrastructure, not one-off content</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-accent text-xl flex-shrink-0">✓</span>
                      <p className="text-text-secondary"><span className="text-white font-semibold">Evergreen assets</span> — Homepage videos, VSLs, testimonials that work 24/7</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-accent text-xl flex-shrink-0">✓</span>
                      <p className="text-text-secondary"><span className="text-white font-semibold">Sales psychology</span> — Content engineered to convert, not just look pretty</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-accent text-xl flex-shrink-0">✓</span>
                      <p className="text-text-secondary"><span className="text-white font-semibold">90-day GTM plans</span> — Strategic video integration into funnels & campaigns</p>
                    </div>
                  </div>
                </div>

                {/* Client Testimonials Mini */}
                <div className="rounded-xl p-6 mb-6 border border-[#2E2E2E]">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="text-center md:text-left">
                      <p className="text-sm italic text-text-secondary mb-2">
                        "After one AssetsLab sprint, I had a homepage video, 15+ clips, a VSL, and content running across platforms. Game changer."
                      </p>
                      <cite className="text-accent text-xs font-semibold not-italic">— Coaching Client</cite>
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-sm italic text-text-secondary mb-2">
                        "They took my brand and turned it into something that looks like I've got a full in-house team."
                      </p>
                      <cite className="text-accent text-xs font-semibold not-italic">— Fractional CMO</cite>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="text-center">
                  <a 
                    href="https://theinsiderweekly.com/podlab-best-business-growth-solution/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(42,221,27,0.4)]"
                  >
                    <span>Read Full Article on Insider Weekly</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Client Logos */}
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">
              Trusted by <span className="text-accent">200+ Founders</span> At
            </h3>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 md:gap-12 items-center justify-items-center glass-card p-6 md:p-12">
            <ImageWithHover src="/logos/csg.png" alt="Custom Specialties Group" width={300} height={120} className="opacity-70 hover:opacity-100 transition" />
            <ImageWithHover src="/logos/simonian-color.png" alt="Simonian Rugs" width={300} height={120} className="opacity-70 hover:opacity-100 transition" />
            <ImageWithHover src="/logos/woolle-color.png" alt="Woolle" width={300} height={120} className="opacity-70 hover:opacity-100 transition" />
            <ImageWithHover src="/logos/isw-color.png" alt="I Sell Winners" width={300} height={120} className="opacity-70 hover:opacity-100 transition" />
            <ImageWithHover src="/logos/full-pay-rey-rey.png" alt="Full Pay Rey Rey" width={300} height={120} className="opacity-70 hover:opacity-100 transition" />
            <ImageWithHover src="/logos/mezcla.png" alt="Mezcla" width={300} height={120} className="opacity-70 hover:opacity-100 transition" />
            <ImageWithHover src="/logos/vortex.png" alt="Vortex" width={300} height={120} className="opacity-70 hover:opacity-100 transition" />
          </div>
        </div>
      </section>

      {/* 5 Labs Overview */}
      <LabsSection />

      {/* Sub-$1M on-ramp → EssentialsLab */}
      <EssentialsLabCta />

      {/* Video Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto glass-card p-8 md:p-12">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 text-center">
            See It In <span className="text-accent">Action</span>
          </h2>
          <p className="text-xl text-text-secondary mb-16 text-center">
            Real founders. Real transformations. Real results.
          </p>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="group">
              <div className="border border-[#2E2E2E] rounded-xl overflow-hidden hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(42,221,27,0.2)] transition-all duration-350">
                <video 
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full aspect-[9/16]"
                  poster="/case-studies/austin-reinders-cover.png"
                >
                  <source src="/videos/austin-testimonial.mp4" type="video/mp4" />
                </video>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-accent transition-colors">Austin Reinders</h3>
                  <p className="text-accent font-semibold mb-2">CEO, Simonian Rugs</p>
                  <p className="text-text-secondary">$3.1M → $4.72M in revenue</p>
                </div>
              </div>
            </div>

            <div className="group">
              <div className="border border-[#2E2E2E] rounded-xl overflow-hidden hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(42,221,27,0.2)] transition-all duration-350">
                <video 
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full aspect-[9/16]"
                  poster="/case-studies/client-montage-cover.png"
                >
                  <source src="/videos/client-montage.mp4" type="video/mp4" />
                </video>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-accent transition-colors">Client Success Stories</h3>
                  <p className="text-accent font-semibold mb-2">200+ Founders Filmed</p>
                  <p className="text-text-secondary">See how founders duplicate themselves and scale</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Objection Handling */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto glass-card p-8 md:p-12">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-8">&ldquo;But I&apos;m Not Great on Camera...&rdquo;</h2>
          <div className="prose prose-invert max-w-none text-lg">
            <p className="text-text-secondary mb-6">
              We've filmed 200+ founders. Most had the same fear.
            </p>
            <p className="text-xl font-semibold text-text-primary mb-8">
              Here's the truth: We coach, script, and produce so even camera-shy founders look and sound like pros.
            </p>
            <p className="text-text-secondary mb-8">
              Your only job is to show up and talk. We handle everything else: strategy, scripting, filming, editing, deployment.
            </p>

            <div className="space-y-6">
              <div>
                <p className="font-bold text-text-primary mb-2">"I need to get ready first."</p>
                <p className="text-text-secondary">
                  That's what AssetsLab is for. We bring the strategy, structure, and prep — you just show up. Most "getting ready" is procrastination disguised as preparation.
                </p>
              </div>
              <div>
                <p className="font-bold text-text-primary mb-2">"It's a big investment."</p>
                <p className="text-text-secondary">
                  One session pays for itself many times over. If you save 15 hours/week at $300/hour, that's $4,500/week in value — or $18K/month. VideoSalesLab costs $10,000. Payback in a month.
                </p>
              </div>
              <div>
                <p className="font-bold text-text-primary mb-2">"We've been burned before."</p>
                <p className="text-text-secondary">
                  We ran this system on ourselves first. We're not selling theory — we're showing you the exact framework that took PodLab from bottleneck to growth lab.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <a
              href="https://calendly.com/podlablv/strategy-call"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-10 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1"
            >
              Schedule Clarity →
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA — clean gradient, no competing bg */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/90 to-accent/60 z-0"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6 text-black">
            Your Expertise Should Work 24/7.<br />
            Not Just When You're in the Room.
          </h2>
          <p className="text-xl md:text-2xl text-black/80 font-semibold mb-8">
            Stop being the product. Become the builder.
          </p>
          <p className="text-base md:text-lg text-black/70 mb-12 max-w-3xl mx-auto">
            Schedule clarity. We'll show you exactly how to duplicate yourself, scale your business, and free up 10-20 hours a week — without adding more to your plate.<br /><br />
            No fluff. No hype. Just a proven system that works.
          </p>
          <a
            href="https://calendly.com/podlablv/strategy-call"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-block px-8 py-4 md:px-16 md:py-6 bg-black text-accent text-xl font-bold rounded-lg hover:bg-black/90 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all relative overflow-hidden"
          >
            <span className="relative z-10">Schedule Clarity →</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
          </a>
          <p className="mt-8 text-sm text-black/60">
            30-minute clarity session. Zero pressure. We'll map out your path from founder-led sales to founder-duplicated growth.
          </p>
        </div>
      </section>
      </div>
    </HomePageWrapper>
  );
}
