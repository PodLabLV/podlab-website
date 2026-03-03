import Navigation from "@/components/Navigation";
import Link from "next/link";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Schedule a Strategy Call | Get Clarity on Your Bottleneck | PodLab",
  description: "Book a 30-minute strategy call. We'll assess your bottleneck, map your path to founder duplication, and show exactly what's possible. Zero pressure. Just clarity.",
  openGraph: {
    title: "Schedule a Strategy Call | Get Clarity on Your Bottleneck",
    description: "30-minute strategy call. Assess your bottleneck and get a clear roadmap.",
    url: "https://podlablv.com/contact",
  },
  twitter: {
    title: "Schedule a Strategy Call | PodLab",
    description: "30-minute strategy call. Assess your bottleneck and get a clear roadmap.",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-black to-bg-secondary">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-7xl md:text-8xl font-black mb-8 leading-[0.95] tracking-tight">
            Let's <span className="bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">Duplicate</span> <span className="text-accent drop-shadow-[0_0_25px_rgba(57,255,20,0.5)]">You.</span>
          </h1>
          <p className="text-2xl md:text-3xl text-text-secondary mb-6 font-light leading-relaxed max-w-4xl mx-auto">
            Book a <span className="text-white font-semibold">30-minute strategy call</span>. We'll assess your business, map your path from founder-led sales to <span className="text-accent font-bold">founder-duplicated growth</span>, and show you exactly what's possible.
          </p>
          <p className="text-2xl font-bold text-accent mb-8">Zero pressure. Just clarity.</p>
        </div>
      </section>

      {/* Assessment CTA */}
      <section className="py-16 px-6 bg-gradient-to-b from-bg-secondary to-black">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-lg text-text-secondary mb-6">
            <span className="text-accent font-bold">Not sure if we're a fit?</span> Take our 5-minute assessment first.
          </p>
          <Link
            href="/assessment"
            className="inline-block px-12 py-4 border-2 border-accent text-accent text-lg font-bold rounded-xl hover:bg-accent hover:text-black transition-all hover:-translate-y-1 uppercase tracking-wider"
          >
            Take Bottleneck Assessment →
          </Link>
        </div>
      </section>

      {/* Calendly Embed */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-bg-tertiary border border-border rounded-xl overflow-hidden">
            <div className="aspect-[4/3] bg-bg-secondary flex items-center justify-center p-12">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-6">📅</div>
                <h3 className="text-2xl font-bold mb-4">Calendly Integration</h3>
                <p className="text-text-secondary mb-6">
                  Calendar booking widget will be embedded here.
                </p>
                <p className="text-sm text-text-tertiary mb-6">
                  Using Google Meet for all calls
                </p>
                <a
                  href="mailto:tiptopdawson@podlablv.com"
                  className="group inline-block px-8 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(57,255,20,0.4)] transition-all relative overflow-hidden"
                >
                  <span className="relative z-10">Email to Schedule →</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-32 px-6 bg-gradient-to-b from-bg-secondary via-black to-bg-tertiary">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black mb-6 text-center">
            What Happens on the <span className="text-accent drop-shadow-[0_0_25px_rgba(57,255,20,0.5)]">Strategy Call?</span>
          </h2>
          <p className="text-2xl text-text-secondary mb-16 text-center font-light">
            This isn't a <span className="line-through text-text-tertiary">sales pitch</span>. It's a <span className="text-white font-semibold">diagnostic</span>.
          </p>

          <div className="space-y-6 mb-12">
            <div className="group bg-bg-tertiary border border-border rounded-xl p-8 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.15)] transition-all duration-350 cursor-pointer">
              <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">1. Assess Your Bottleneck (10 min)</h3>
              <p className="text-text-secondary group-hover:text-text-primary transition-colors">
                We'll identify where founder dependency is costing you time, revenue, and growth.
              </p>
            </div>
            <div className="group bg-bg-tertiary border border-border rounded-xl p-8 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.15)] transition-all duration-350 cursor-pointer">
              <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">2. Map Your Path (10 min)</h3>
              <p className="text-text-secondary group-hover:text-text-primary transition-colors">
                We'll walk through the 5-phase system and show you which Lab to start with.
              </p>
            </div>
            <div className="group bg-bg-tertiary border border-border rounded-xl p-8 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.15)] transition-all duration-350 cursor-pointer">
              <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">3. Show You What's Possible (10 min)</h3>
              <p className="text-text-secondary group-hover:text-text-primary transition-colors">
                We'll share ROI examples, case studies, and expected outcomes so you know exactly what you're investing in.
              </p>
            </div>
          </div>

          <div className="group bg-bg-tertiary border border-accent rounded-xl p-8 hover:shadow-[0_12px_40px_rgba(57,255,20,0.25)] hover:-translate-y-1 transition-all duration-350 cursor-pointer">
            <p className="font-bold text-text-primary mb-4 group-hover:text-accent transition-colors">At the end of the call, you'll have:</p>
            <ul className="space-y-2 text-text-secondary mb-6">
              <li className="group-hover:text-text-primary transition-colors">✓ Clarity on your biggest bottleneck</li>
              <li className="group-hover:text-text-primary transition-colors">✓ A recommended path to scale without burning out</li>
              <li className="group-hover:text-text-primary transition-colors">✓ Transparent pricing and timelines (no surprises)</li>
            </ul>
            <p className="text-lg font-semibold text-accent">No pressure. No hype. Just a clear plan.</p>
          </div>
        </div>
      </section>

      {/* Alternative Contact */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold mb-8 text-center">Prefer Email or Phone?</h3>
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div className="group bg-bg-tertiary border border-border rounded-xl p-8 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.15)] transition-all duration-350 cursor-pointer">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📧</div>
              <h4 className="font-semibold mb-2 group-hover:text-accent transition-colors">Email</h4>
              <a href="mailto:tiptopdawson@podlablv.com" className="text-accent hover:underline block">
                tiptopdawson@podlablv.com
              </a>
              <p className="text-sm text-text-secondary mt-2 group-hover:text-text-primary transition-colors">
                We respond within 24 hours (usually faster)
              </p>
            </div>
            <div className="group bg-bg-tertiary border border-border rounded-xl p-8 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.15)] transition-all duration-350 cursor-pointer">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📍</div>
              <h4 className="font-semibold mb-2 group-hover:text-accent transition-colors">Location</h4>
              <p className="text-text-secondary group-hover:text-text-primary transition-colors">Las Vegas, NV</p>
              <p className="text-sm text-text-secondary mt-2 group-hover:text-text-primary transition-colors">
                Studio tours available (virtual or in-person)
              </p>
            </div>
            <div className="group bg-bg-tertiary border border-border rounded-xl p-8 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.15)] transition-all duration-350 cursor-pointer">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔗</div>
              <h4 className="font-semibold mb-2 group-hover:text-accent transition-colors">Client Portal</h4>
              <a
                href="https://portal.podlablv.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline block"
              >
                portal.podlablv.com
              </a>
              <p className="text-sm text-text-secondary mt-2 group-hover:text-text-primary transition-colors">
                Existing clients: Access your projects
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-bg-secondary">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12">Questions Before You Book?</h2>
          {/* Glassy Container for FAQs */}
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-border/30">
            <div className="space-y-8">
            {faqs.map((faq) => (
              <div key={faq.q} className="group border-b border-border pb-8 last:border-0 hover:border-accent transition-colors cursor-pointer">
                <h3 className="text-xl font-bold mb-3 group-hover:text-accent transition-colors">{faq.q}</h3>
                <p className="text-text-secondary group-hover:text-text-primary transition-colors">{faq.a}</p>
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const faqs = [
  {
    q: "How long is the strategy call?",
    a: "30 minutes. No fluff, just diagnostic and recommendations.",
  },
  {
    q: "Is there any cost for the strategy call?",
    a: "No. It's free. We assess your business and show you the right path. No pressure to buy anything.",
  },
  {
    q: "What if I'm not ready to start right away?",
    a: "No problem. The call gives you clarity on your bottleneck and a roadmap for when you're ready. No expiration date.",
  },
  {
    q: "Do you work with all industries?",
    a: "We focus on service-based businesses doing $1M–$8M in revenue. If you're outside that range or not service-based, we'll be upfront on the call.",
  },
  {
    q: "What's the typical investment to work with PodLab?",
    a: "AssetsLab starts at $1,500. Full suite (AssetsLab → VideoSalesLab) is $18,500. ExpansionLab retainer is $5K+/month. We'll show you exact pricing on the call.",
  },
];
