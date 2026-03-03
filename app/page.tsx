import Navigation from '@/components/Navigation';
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
    images: ['/og-image.png'],
  },
  twitter: {
    title: 'PodLab - Duplicate Yourself, Scale Without Burning Out',
    description: 'Turn your expertise into strategic 4K video assets that sell 24/7. No more founder bottleneck.',
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-black via-bg-secondary to-black">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 opacity-20">
          <img 
            src="/hero-bg.png" 
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-bg-secondary/50 to-black/70"></div>
        
        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center py-32">
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black mb-8 font-display leading-[0.95] tracking-tight">
            <span className="inline-block hover:text-accent transition-colors duration-500">Duplicate</span>{" "}
            <span className="inline-block bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">Yourself.</span>
            <br />
            <span className="inline-block text-text-secondary hover:text-white transition-colors duration-500">Scale Without</span>{" "}
            <span className="inline-block text-accent drop-shadow-[0_0_25px_rgba(57,255,20,0.5)]">Burning Out.</span>
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
              className="group px-16 py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(57,255,20,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
            >
              <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Schedule Clarity →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-accent-hover to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </a>
            <Link
              href="/assessment"
              className="px-12 py-6 border-2 border-accent text-accent text-xl font-bold rounded-xl hover:bg-accent hover:text-black transition-all hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(57,255,20,0.3)] uppercase tracking-wider"
            >
              Take Assessment
            </Link>
          </div>

          {/* Video integrated into Hero */}
          <div className="max-w-5xl mx-auto">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(57,255,20,0.4)] border-2 border-accent/20">
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



      {/* Solution Section - Combined with Problem */}
      <section className="relative py-32 px-6 overflow-hidden bg-gradient-to-b from-black via-bg-secondary to-black">
        {/* Animated Background (MP4 for performance) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/podlab-logo-animation.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto space-y-32">
          {/* Problem Section */}
          <FadeIn direction="up">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-6xl md:text-7xl font-black mb-12 text-center leading-tight">
              You Built a <span className="text-accent drop-shadow-[0_0_20px_rgba(57,255,20,0.4)]">$3M Business</span>.<br />
              But It's Really Just a <span className="text-text-secondary">High-Paying Job.</span>
            </h3>
            
            {/* Text Container for Visibility */}
            <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-border/30">
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
            <h2 className="text-6xl md:text-7xl font-black mb-8 text-center leading-tight">
              Record Once. <span className="text-accent drop-shadow-[0_0_30px_rgba(57,255,20,0.5)]">Sell Forever.</span>
            </h2>
            <p className="text-2xl md:text-3xl text-text-secondary mb-0 text-center max-w-4xl mx-auto font-light leading-relaxed">
              What if your best sales conversation worked <span className="text-white font-semibold">24/7</span>? What if prospects arrived <span className="text-accent font-bold">pre-sold, educated, and ready to buy?</span>
              <br /><br />
              <span className="text-white text-4xl font-bold">That's founder duplication.</span>
            </p>
          </div>

          {/* Solution Details */}
          <div className="space-y-8">
          {/* Glassy Container */}
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-border/30">
            <div className="prose prose-invert max-w-none mb-12">
              <p className="text-lg text-text-secondary leading-relaxed mb-6">
                PodLab turns one recording session into a complete suite of strategic video assets that duplicate you across the entire customer journey.
              </p>
              
              <div className="bg-bg-tertiary/50 border border-border/20 rounded-xl p-8 mb-8">
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
                <p className="text-sm text-text-tertiary">(ongoing dependency, no end in sight)</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-2">Unlike business consultants</p>
                <p className="text-sm text-text-tertiary">(frameworks without execution)</p>
              </div>
              <div>
                <p className="font-semibold text-text-primary mb-2">Unlike video production houses</p>
                <p className="text-sm text-text-tertiary">(pretty videos that don't convert)</p>
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
      <section className="relative py-32 px-6 overflow-hidden bg-black">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 opacity-15">
          <img 
            src="/pods-section-bg.png" 
            alt="Pods Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-bold mb-6">
              The <span className="text-accent">Pods</span>
            </h2>
            <p className="text-2xl text-text-secondary mb-4">
              Five cinematic sets. One production day. Zero compromises.
            </p>
            <p className="text-lg text-text-tertiary">
              Our $150K state-of-the-art Las Vegas studio | Professional lighting, 4K cameras, broadcast audio
            </p>
          </div>

          {/* Main Featured Pod */}
          <div className="mb-20">
            <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
              <div>
                <div className="text-sm text-accent font-semibold mb-3 uppercase tracking-wider">Featured Pod</div>
                <h3 className="text-5xl font-bold mb-6">The Big Boss</h3>
                <p className="text-xl text-text-secondary mb-6 leading-relaxed">
                  Executive power backdrop. Perfect for authority positioning, high-stakes messaging, and C-suite credibility. Dark, dramatic, commanding presence.
                </p>
                <div className="flex items-center gap-6 text-sm">
                  <span className="px-4 py-2 bg-accent/10 border border-accent text-accent rounded-full">4K Cinema</span>
                  <span className="px-4 py-2 bg-accent/10 border border-accent text-accent rounded-full">Professional Lighting</span>
                  <span className="px-4 py-2 bg-accent/10 border border-accent text-accent rounded-full">Broadcast Audio</span>
                </div>
              </div>
              <div className="group">
                <ImageWithHover
                  src="/studio/bigboss-color.png"
                  alt="The Big Boss Pod"
                  width={800}
                  height={600}
                  className="rounded-2xl shadow-2xl border border-border group-hover:border-accent transition-all duration-500"
                />
              </div>
            </div>
          </div>

          {/* Grid of All Pods */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pods.map((pod) => (
              <div key={pod.name} className="group cursor-pointer">
                <div className="relative mb-4 overflow-hidden rounded-xl border-2 border-border group-hover:border-accent transition-all duration-350 group-hover:shadow-[0_12px_40px_rgba(57,255,20,0.2)]">
                  <ImageWithHover
                    src={pod.image}
                    alt={pod.name}
                    width={600}
                    height={400}
                    className="rounded-xl group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <span className="text-xs text-accent font-bold uppercase tracking-widest">{pod.use}</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-2 group-hover:text-accent transition-colors">{pod.name}</h3>
                <p className="text-text-secondary leading-relaxed">{pod.description}</p>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-20 text-center">
            <div className="inline-block bg-bg-tertiary border border-accent rounded-2xl p-12 max-w-3xl">
              <h3 className="text-3xl font-bold mb-4">One Day. Six Sets. Six Months of Content.</h3>
              <p className="text-lg text-text-secondary mb-8">
                Record your entire video library in a single professional studio session. We handle lighting, audio, direction, editing, and deployment.
              </p>
              <Link
                href="/services"
                className="inline-block px-10 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1"
              >
                Explore VideoSalesLab →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Client Logos */}
      <section className="relative py-32 px-6 overflow-hidden bg-gradient-to-b from-bg-secondary via-black to-bg-secondary">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 opacity-15">
          <img 
            src="/insider-section-bg.png" 
            alt="Insider Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary/70 via-black/60 to-bg-secondary/70"></div>
        
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
            <div className="bg-gradient-to-br from-bg-tertiary via-bg-secondary to-bg-tertiary border-2 border-accent/20 rounded-2xl p-8 md:p-12 relative overflow-hidden group hover:border-accent/40 transition-all duration-500">
              {/* Decorative corner accents */}
              <div className="absolute top-0 left-0 w-20 h-20 bg-accent/5 rounded-br-full"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-accent/5 rounded-tl-full"></div>
              
              <div className="relative z-10">
                {/* Title */}
                <h3 className="text-3xl md:text-4xl font-black mb-6 text-center">
                  <span className="bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">
                    Best Business Growth Solution 2025
                  </span>
                </h3>

                {/* Award Badge */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className="h-px w-16 bg-gradient-to-r from-transparent to-accent"></div>
                  <span className="text-accent font-semibold uppercase tracking-wider text-sm">Insider Weekly Award</span>
                  <div className="h-px w-16 bg-gradient-to-l from-transparent to-accent"></div>
                </div>

                {/* Key Highlights */}
                <div className="space-y-6 mb-8">
                  <p className="text-lg text-text-secondary leading-relaxed text-center">
                    <span className="text-white font-semibold">Las Vegas-based PodLab</span> has been recognized by <span className="text-accent font-semibold">Insider Weekly</span> for its innovative approach to helping $1M-$8M businesses scale through strategic video content systems.
                  </p>

                  <div className="grid md:grid-cols-3 gap-6 my-8">
                    <div className="text-center p-6 bg-black/30 rounded-xl border border-accent/10">
                      <div className="text-3xl font-black text-accent mb-2">15+</div>
                      <div className="text-sm text-text-secondary">Repurposed Clips Per Sprint</div>
                    </div>
                    <div className="text-center p-6 bg-black/30 rounded-xl border border-accent/10">
                      <div className="text-3xl font-black text-accent mb-2">4K</div>
                      <div className="text-sm text-text-secondary">Sony FX30 Cameras</div>
                    </div>
                    <div className="text-center p-6 bg-black/30 rounded-xl border border-accent/10">
                      <div className="text-3xl font-black text-accent mb-2">97%</div>
                      <div className="text-sm text-text-secondary">Business Failure Rate We Help Avoid</div>
                    </div>
                  </div>
                </div>

                {/* Founder Quote */}
                <blockquote className="border-l-4 border-accent pl-6 py-4 mb-8 bg-black/20 rounded-r-xl">
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
                <div className="bg-gradient-to-r from-bg-tertiary/50 via-black/50 to-bg-tertiary/50 rounded-xl p-6 mb-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="text-center md:text-left">
                      <p className="text-sm italic text-text-secondary mb-2">
                        "After one Essentials Lab sprint, I had a homepage video, 15+ clips, a VSL, and content running across platforms. Game changer."
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
                    className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.4)]"
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

          {/* Client Logos Header */}
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">
              Trusted by <span className="text-accent">200+ Founders</span> At
            </h3>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-12 items-center justify-items-center bg-bg-tertiary/30 rounded-2xl p-12 border border-border/30">
            <ImageWithHover
              src="/logos/csg.png"
              alt="Custom Specialties Group"
              width={300}
              height={120}
              className="opacity-70 hover:opacity-100 transition"
            />
            <ImageWithHover
              src="/logos/simonian-color.png"
              alt="Simonian Rugs"
              width={300}
              height={120}
              className="opacity-70 hover:opacity-100 transition"
            />
            <ImageWithHover
              src="/logos/woolle-color.png"
              alt="Woolle"
              width={300}
              height={120}
              className="opacity-70 hover:opacity-100 transition"
            />
            <ImageWithHover
              src="/logos/isw-color.png"
              alt="I Sell Winners"
              width={300}
              height={120}
              className="opacity-70 hover:opacity-100 transition"
            />
            <ImageWithHover
              src="/logos/full-pay-rey-rey.png"
              alt="Full Pay Rey Rey"
              width={300}
              height={120}
              className="opacity-70 hover:opacity-100 transition"
            />
            <ImageWithHover
              src="/logos/mezcla.png"
              alt="Mezcla"
              width={300}
              height={120}
              className="opacity-70 hover:opacity-100 transition"
            />
            <ImageWithHover
              src="/logos/vortex.png"
              alt="Vortex"
              width={300}
              height={120}
              className="opacity-70 hover:opacity-100 transition"
            />
          </div>
        </div>
      </section>

      {/* 5 Labs Overview */}
      <section className="relative py-24 px-6 overflow-hidden bg-bg-secondary">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 opacity-20">
          <img 
            src="/labs-section-bg.png" 
            alt="Labs Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary/60 via-bg-secondary/70 to-bg-secondary/60"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold mb-4 text-center">The 5-Phase Growth System</h2>
          <p className="text-xl text-text-secondary mb-16 text-center">
            One system. Five phases. Complete founder duplication.
          </p>

          <div className="space-y-12">
            {labs.map((lab, index) => (
              <div key={lab.name} className="group bg-bg-tertiary border border-border rounded-xl p-8 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-350 cursor-pointer">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <ImageWithHover
                      src={lab.icon}
                      alt={lab.name}
                      width={80}
                      height={80}
                      className="group-hover:scale-110 transition-transform duration-350"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-accent font-semibold mb-2 uppercase tracking-wider">PHASE {index + 1}</div>
                    <h3 className="text-3xl font-bold mb-2 group-hover:text-accent transition-colors">{lab.name}</h3>
                    <p className="text-accent font-semibold mb-4">{lab.tagline}</p>
                    <p className="text-text-secondary mb-4 leading-relaxed">{lab.description}</p>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border group-hover:border-accent transition-colors">
                      <span className="text-2xl font-bold text-accent">{lab.price}</span>
                      <span className="text-sm text-text-tertiary group-hover:text-accent transition-colors">{lab.outcome}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <div className="inline-block bg-bg-tertiary border border-accent rounded-xl p-8 mb-8">
              <p className="text-lg text-text-secondary mb-2">
                <span className="font-bold text-text-primary">Full Suite Value:</span> $40,000+ perceived value
              </p>
              <p className="text-2xl font-bold text-accent mb-2">Actual Price: $18,500</p>
              <p className="text-sm text-text-secondary">(Labs 1-4 bundled)</p>
              <p className="text-sm text-accent mt-4">ROI Payback: 30-60 days (typical)</p>
            </div>
            <br />
            <Link
              href="/contact"
              className="inline-block px-12 py-5 bg-accent text-black text-lg font-bold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1"
            >
              Start with AssetsLab →
            </Link>
          </div>

          {/* Social Proof - Integrated */}
          <div className="mt-32 max-w-7xl mx-auto">
            <h2 className="text-6xl md:text-7xl font-black mb-20 text-center">
              Real Founders. <span className="text-accent drop-shadow-[0_0_30px_rgba(57,255,20,0.5)]">Real Results.</span>
            </h2>

            <div className="grid md:grid-cols-4 gap-8 mb-20">
              {stats.map((stat, index) => (
                <FadeIn
                  key={stat.label}
                  delay={index * 0.1}
                  direction="up"
                >
                  <div 
                    className="group relative text-center bg-gradient-to-br from-bg-tertiary to-bg-secondary border-2 border-border rounded-2xl p-10 hover:border-accent hover:-translate-y-3 hover:scale-105 hover:shadow-[0_20px_60px_rgba(57,255,20,0.3)] transition-all duration-350 cursor-pointer overflow-hidden"
                  >
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/0 group-hover:from-accent/5 group-hover:to-accent/10 transition-all duration-350"></div>
                    
                    <div className="relative z-10">
                      <div className="text-7xl font-black text-accent group-hover:scale-125 group-hover:drop-shadow-[0_0_20px_rgba(57,255,20,0.8)] transition-all duration-350 mb-4">{stat.value}</div>
                      <div className="text-sm text-text-secondary group-hover:text-white transition-colors font-bold uppercase tracking-widest">{stat.label}</div>
                    </div>
                    
                    {/* Border glow animation */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-350 bg-gradient-to-r from-transparent via-accent/20 to-transparent blur-xl"></div>
                  </div>
                </FadeIn>
              ))}
            </div>

            <div className="text-center">
              <Link
                href="/case-studies"
                className="group inline-block px-10 py-4 border-2 border-accent text-accent font-semibold rounded-lg hover:bg-accent hover:text-black hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.3)] transition-all relative overflow-hidden"
              >
                <span className="relative z-10">See More Results →</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Video Testimonials */}
      <section className="py-24 px-6 bg-bg-secondary">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold mb-4 text-center">
            See It In <span className="text-accent">Action</span>
          </h2>
          <p className="text-xl text-text-secondary mb-16 text-center">
            Real founders. Real transformations. Real results.
          </p>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Austin Testimonial */}
            <div className="group">
              <div className="bg-bg-tertiary border border-border rounded-xl overflow-hidden hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.2)] transition-all duration-350">
                <video 
                  controls 
                  className="w-full aspect-[9/16]"
                  poster="/case-studies/website-austin-casestudy.png"
                >
                  <source src="/videos/austin-testimonial.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-accent transition-colors">Austin Reinders</h3>
                  <p className="text-accent font-semibold mb-2">CEO, Simonian Rugs</p>
                  <p className="text-text-secondary">$750K → $4.72M in revenue</p>
                </div>
              </div>
            </div>

            {/* Client Montage */}
            <div className="group">
              <div className="bg-bg-tertiary border border-border rounded-xl overflow-hidden hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.2)] transition-all duration-350">
                <video 
                  controls 
                  className="w-full aspect-[9/16]"
                >
                  <source src="/videos/client-montage.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
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
      <section className="py-24 px-6 bg-bg-tertiary">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold mb-8">"But I'm Not Great on Camera..."</h2>
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

      {/* Final CTA */}
      <section className="py-32 px-6 bg-gradient-to-b from-accent to-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-6xl font-bold mb-6 text-black">
            Your Expertise Should Work 24/7.<br />
            Not Just When You're in the Room.
          </h2>
          <p className="text-2xl text-black/80 font-semibold mb-8">
            Stop being the product. Become the builder.
          </p>
          <p className="text-lg text-black/70 mb-12 max-w-3xl mx-auto">
            Schedule clarity. We'll show you exactly how to duplicate yourself, scale your business, and free up 10-20 hours a week — without adding more to your plate.<br /><br />
            No fluff. No hype. Just a proven system that works.
          </p>
          <a
            href="https://calendly.com/podlablv/strategy-call"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-block px-16 py-6 bg-black text-accent text-xl font-bold rounded-lg hover:bg-black/90 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all relative overflow-hidden"
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
  );
}

const labs = [
  {
    name: "AssetsLab",
    tagline: "Know exactly who you are and what you sell.",
    icon: "/labs/icons/AssetsLab-icon.png",
    description: "Clarifies your positioning with customer avatar, mission/vision, dialed-in offer, and brand voice guide.",
    outcome: "Crystal-clear messaging foundation",
    price: "$1,500",
  },
  {
    name: "BrandLab",
    tagline: "Look like the leader you already are.",
    icon: "/labs/icons/BrandLab-icon.png",
    description: "Builds complete brand identity (logo, colors, typography, guidelines) so your business looks and sounds like a market leader.",
    outcome: "Professional brand presence that matches business quality",
    price: "$3,500",
  },
  {
    name: "SiteLab",
    tagline: "Your website becomes your best salesperson.",
    icon: "/labs/icons/SiteLab-icon.png",
    description: "Designs and develops a high-converting website with strategic copy, video integration, and conversion optimization.",
    outcome: "Website that sells 24/7 without founder involvement",
    price: "$3,500+",
  },
  {
    name: "VideoSalesLab",
    tagline: "Duplicate yourself in one recording session.",
    icon: "/labs/icons/VideoSalesLab-icon.png",
    description: "Produces five core strategic video assets in our $150K studio.",
    outcome: "Video suite that pre-sells prospects 24/7",
    price: "$10,000",
  },
  {
    name: "ExpansionLab",
    tagline: "Predictable growth without founder dependency.",
    icon: "/labs/icons/ExpansionLab-icon.png",
    description: "Ongoing marketing optimization (fractional CMO + execution) to scale lead generation, content output, and campaign performance.",
    outcome: "Scalable, predictable growth on autopilot",
    price: "$5K+/month",
  },
];

const stats = [
  { value: "200+", label: "Founders Filmed" },
  { value: "$150K", label: "State-of-the-Art Studio" },
  { value: "10-20 Hrs/Week", label: "Typical Time Saved" },
  { value: "20-30%", label: "Close Rate Increase" },
];

const pods = [
  {
    name: "The Speakeasy",
    image: "/studio/speakeasy-color.png",
    description: "Intimate, conversational setting. Perfect for authentic founder stories, personal narratives, and trust-building content.",
    use: "Authority Videos",
  },
  {
    name: "The Rome",
    image: "/studio/rome-color.png",
    description: "Classic, timeless backdrop. Ideal for executive presence, professional authority, and corporate messaging.",
    use: "Corporate Content",
  },
  {
    name: "The Lounge",
    image: "/studio/lounge-color.png",
    description: "Modern, minimalist aesthetic. Great for thought leadership, strategic insights, and contemporary brand positioning.",
    use: "Thought Leadership",
  },
  {
    name: "The Mirah",
    image: "/studio/mirah-color.png",
    description: "Warm, inviting atmosphere. Perfect for relationship-building, client testimonials, and human-centered stories.",
    use: "Testimonials",
  },
  {
    name: "The Professor",
    image: "/studio/professor-color.png",
    description: "Educational setting with depth. Ideal for teaching content, explainer videos, and knowledge-sharing formats.",
    use: "Educational Content",
  },
];
