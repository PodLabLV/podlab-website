import Link from 'next/link';
import Navigation from '@/components/Navigation';
import ImageWithHover from '@/components/ImageWithHover';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Founder Bottleneck Assessment | Free 5-Minute Business Growth Quiz - PodLab',
  description: 'Discover your #1 bottleneck in 5 minutes. Free assessment for $1M-$8M service-based founders. Get your score + tactical roadmap to scale without burning out.',
  openGraph: {
    title: 'Are You the Bottleneck? Take the Free 5-Minute Assessment',
    description: 'Find out where your business is stuck and get a tactical roadmap to fix it. For $1M-$8M service-based founders.',
    type: 'website',
  },
};

export default function BottleneckAssessmentPage() {
  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      {/* Video Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl mx-auto w-full">
          {/* Pre-Headline */}
          <p className="text-accent text-sm font-semibold uppercase tracking-wider text-center mb-4">
            For $1M–$8M Service-Based Founders
          </p>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black text-center mb-8 leading-tight">
            <span className="text-white">You're Not the Problem.</span><br />
            <span className="text-white">But You Might Be the </span>
            <span className="text-accent drop-shadow-[0_0_25px_rgba(57,255,20,0.5)]">Bottleneck.</span>
          </h1>

          {/* Video Embed */}
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(57,255,20,0.3)] mb-8">
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/Suks-OF5-DE?controls=1&showinfo=0&rel=0&modestbranding=1&color=white"
              title="Founder Bottleneck Assessment"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          {/* CTA Button */}
          <div className="text-center mb-6">
            <Link
              href="/assessment/start"
              className="inline-block px-16 py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(57,255,20,0.6)] active:scale-95 uppercase tracking-wider"
            >
              Take the Free Assessment →
            </Link>
          </div>

          {/* Supporting Text */}
          <p className="text-center text-text-secondary text-sm">
            Free. 5 minutes. Get your score + tactical roadmap.
          </p>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="py-16 px-6 border-t border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-black text-accent mb-2">200+</div>
              <div className="text-text-secondary text-sm">Founders Assessed</div>
            </div>
            <div>
              <div className="text-5xl font-black text-accent mb-2">5 Minutes</div>
              <div className="text-text-secondary text-sm">To Complete</div>
            </div>
            <div>
              <div className="text-5xl font-black text-accent mb-2">100% Free</div>
              <div className="text-text-secondary text-sm">No Credit Card</div>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Discover */}
      <section className="py-24 px-6 bg-bg-secondary">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
            What You'll Discover in <span className="text-accent">5 Minutes</span>
          </h2>

          <div className="space-y-12">
            <div className="flex items-start gap-8 group">
              <div className="flex-shrink-0 w-48 h-48">
                <ImageWithHover
                  src="/Your-Bottleneck-Score-icon.png"
                  alt="Bottleneck Score"
                  width={192}
                  height={192}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-white">Your Bottleneck Score (Out of 100)</h3>
                <p className="text-text-secondary leading-relaxed">
                  Where you're stuck across 5 core areas: Founder Dependency, Brand Perception, Marketing System, Sales Infrastructure, Strategic Clarity.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-8 group">
              <div className="flex-shrink-0 w-48 h-48">
                <ImageWithHover
                  src="/Tacticle-roadmap-icon.png"
                  alt="Tactical Roadmap"
                  width={192}
                  height={192}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-white">Your Tactical Roadmap</h3>
                <p className="text-text-secondary leading-relaxed">
                  Exactly what to fix first (and in what order) to get unstuck and scale past your current ceiling.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-8 group">
              <div className="flex-shrink-0 w-48 h-48">
                <ImageWithHover
                  src="/Personalized--Lab-icon.png"
                  alt="Personalized Lab"
                  width={192}
                  height={192}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-white">Personalized Lab Recommendation</h3>
                <p className="text-text-secondary leading-relaxed">
                  Which of PodLab's 5 Labs solves your #1 bottleneck (AssetsLab, BrandLab, SiteLab, VideoSalesLab, or ExpansionLab).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Agitation */}
      <section className="py-24 px-6 bg-black">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12">
            If This Sounds Familiar, <span className="text-accent">You're in the Right Place</span>
          </h2>

          <div className="space-y-4 max-w-2xl mx-auto mb-12">
            <div className="flex items-start gap-4">
              <span className="text-accent text-2xl flex-shrink-0">☑️</span>
              <p className="text-lg text-text-secondary">
                <span className="font-semibold text-white">You're closing all the deals yourself</span> (if you stop, revenue stops)
              </p>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-accent text-2xl flex-shrink-0">☑️</span>
              <p className="text-lg text-text-secondary">
                <span className="font-semibold text-white">Your brand's decent, but it's not landing</span> (perception gap costing you deals)
              </p>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-accent text-2xl flex-shrink-0">☑️</span>
              <p className="text-lg text-text-secondary">
                <span className="font-semibold text-white">Marketing is inconsistent</span> (feast or famine, no predictable pipeline)
              </p>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-accent text-2xl flex-shrink-0">☑️</span>
              <p className="text-lg text-text-secondary">
                <span className="font-semibold text-white">The busier you get, the harder growth becomes</span> (stuck at $3M-$5M ceiling)
              </p>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-accent text-2xl flex-shrink-0">☑️</span>
              <p className="text-lg text-text-secondary">
                <span className="font-semibold text-white">You're the bottleneck</span> (and if you're honest, you already know it)
              </p>
            </div>
          </div>

          <div className="text-center mb-8">
            <p className="text-3xl font-bold text-white mb-4">
              The real issue? <span className="text-accent">You've become the bottleneck.</span>
            </p>
            <p className="text-lg text-text-secondary max-w-3xl mx-auto leading-relaxed">
              Most $1M–$8M founders hit a ceiling they can't quite explain. You're stuck in sales. Still the face of the brand. Still winging marketing. And somehow, the busier you get, the harder growth becomes.
            </p>
          </div>

          <p className="text-lg text-text-secondary max-w-3xl mx-auto text-center">
            This free 5-minute assessment breaks down exactly where you're stuck — and what to do about it.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-bg-secondary">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
            How the <span className="text-accent">Assessment Works</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-40 h-40 mx-auto mb-6">
                <ImageWithHover
                  src="/number-icon-1.png"
                  alt="Step 1"
                  width={160}
                  height={160}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-xl font-bold mb-3">Answer 20 Questions</h3>
              <p className="text-text-secondary leading-relaxed">
                5 minutes. Quick, focused questions about your sales process, brand, systems, content, and growth.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-40 h-40 mx-auto mb-6">
                <ImageWithHover
                  src="/number-icon-2.png"
                  alt="Step 2"
                  width={160}
                  height={160}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-xl font-bold mb-3">Get Your Score</h3>
              <p className="text-text-secondary leading-relaxed">
                Custom score out of 100 across 5 core bottlenecks. See exactly where you're stuck.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-40 h-40 mx-auto mb-6">
                <ImageWithHover
                  src="/number-icon-3.png"
                  alt="Step 3"
                  width={160}
                  height={160}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-xl font-bold mb-3">Follow Your Roadmap</h3>
              <p className="text-text-secondary leading-relaxed">
                Tactical roadmap on what to fix first. Plus, personalized Lab recommendation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-b from-black via-bg-secondary to-black">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black mb-6">
            Ready to Find Your <span className="text-accent drop-shadow-[0_0_25px_rgba(57,255,20,0.5)]">Bottleneck?</span>
          </h2>
          <p className="text-2xl text-text-secondary mb-12">
            5 minutes. No fluff. No pitch. Just clarity.
          </p>

          <Link
            href="/assessment/start"
            className="inline-block px-20 py-8 bg-accent text-black text-2xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(57,255,20,0.6)] active:scale-95 uppercase tracking-wider mb-8"
          >
            Take the Free Assessment →
          </Link>

          <p className="text-sm text-text-tertiary">
            No credit card required. Results in your inbox instantly.
          </p>
        </div>
      </section>

      {/* Trust Elements */}
      <section className="py-16 px-6 bg-black border-t border-border">
        <div className="max-w-3xl mx-auto">
          <blockquote className="text-center mb-8">
            <p className="text-xl italic text-text-secondary mb-4">
              "This assessment nailed exactly where I was stuck. Within 5 minutes, I had total clarity on what to fix first."
            </p>
            <cite className="text-accent font-semibold not-italic">— Founder, $4M Service Business</cite>
          </blockquote>

          <p className="text-center text-sm text-text-tertiary">
            🔒 <span className="font-semibold">Your data is private.</span> We never share or sell your information. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-8 px-6 bg-black border-t border-border">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-text-tertiary mb-4">
            © 2026 PodLab. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 text-sm text-text-tertiary">
            <Link href="/contact" className="hover:text-accent transition-colors">Contact</Link>
            <span>•</span>
            <a href="mailto:info@podlablv.com" className="hover:text-accent transition-colors">info@podlablv.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
