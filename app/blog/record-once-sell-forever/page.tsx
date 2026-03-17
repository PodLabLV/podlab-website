import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Record Once, Sell Forever Framework',
  description: 'Stop treating content like a treadmill. Learn the operating system behind every asset we build at PodLab. Record once. Sell forever.',
  openGraph: {
    title: 'The Record Once, Sell Forever Framework',
    description: 'Stop treating content like a treadmill. Record once. Sell forever.',
    url: 'https://podlablv.com/blog/record-once-sell-forever',
  },
};

export default function BlogPost() {
  return (
    <HomePageWrapper><div className="min-h-screen">
      <Navigation />
      
      <article className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="text-accent hover:underline mb-8 inline-flex items-center gap-2 text-sm font-semibold">← Back to Blog</Link>

          <div className="aspect-[2/1] rounded-xl overflow-hidden mb-8">
            <img src="/blog/beakers.png" alt="Record Once Sell Forever" className="w-full h-full object-cover" />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-accent font-semibold uppercase tracking-wider px-2 py-1 border border-accent/30 rounded">Framework</span>
            <span className="text-xs text-text-tertiary">March 10, 2026</span>
            <span className="text-xs text-text-tertiary">· 10 min read</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
            The Record Once, <span className="text-accent">Sell Forever</span> Framework
          </h1>

          <p className="text-xl text-text-secondary mb-12 leading-relaxed border-l-4 border-accent pl-6">
            Most founders treat content like a treadmill. Record, post, repeat. Every week, starting from zero. There's a better model — one that treats your time like the scarce resource it is.
          </p>

          <div className="space-y-6 text-lg text-text-secondary leading-relaxed">

            <p>We call it Record Once, Sell Forever. And it's the operating system behind every asset we build at PodLab.</p>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Problem With the Content Treadmill</h2>
            
            <p>You already know the math doesn't work. You're running a company. Managing a team. Closing deals. And somewhere in between, you're supposed to "show up" online.</p>
            
            <p>Three weeks later, you've burned 20+ hours and produced a handful of clips that got a few hundred views. Meanwhile, your sales process hasn't changed.</p>

            <div className="glass-card p-6 my-8">
              <p className="text-xl font-bold text-white">The treadmill doesn't reward effort. It punishes it.</p>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Framework</h2>
            
            <p>Record Once, Sell Forever isn't a slogan. It's a production methodology:</p>

            <div className="space-y-4 my-8">
              {[
                { step: "1", title: "Map the Sales Process", desc: "Before we turn on a camera, we map your buyer's journey — every objection, every question, every moment where trust builds or breaks." },
                { step: "2", title: "Script the Assets", desc: "Each asset gets designed for a specific job — top of funnel authority, mid-funnel objection handling, bottom-funnel proof, and post-sale onboarding." },
                { step: "3", title: "One Studio Day", desc: "One focused day in our Las Vegas studio. Structured. Produced. Directed. Walk out with raw material for 1-2 long-form pieces, 10-15 clips, a VSL, and 3-6 months of content." },
                { step: "4", title: "Build the System", desc: "Our five labs take over — AssetsLab, BrandLab, SiteLab, VideoSalesLab, and ExpansionLab turn raw footage into infrastructure." },
                { step: "5", title: "Deploy and Compound", desc: "Assets deployed on your website, email sequences, and team outreach compound over months and years. Not hours." },
              ].map((item) => (
                <div key={item.step} className="glass-card p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-accent font-bold text-sm">{item.step}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-sm mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">Why This Works for Founders at Scale</h2>
            
            <p>If you're doing $1M–$8M, you don't need more awareness. You need more leverage. The bottleneck isn't demand — it's you.</p>
            
            <p>Record Once, Sell Forever extracts what makes you compelling — your expertise, your story, your conviction — and turns it into something that operates independently of your calendar.</p>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Math</h2>

            <div className="grid md:grid-cols-3 gap-4 my-8">
              <div className="glass-card p-5 text-center">
                <p className="text-3xl font-bold text-accent mb-1">1</p>
                <p className="font-semibold text-white text-sm">Studio Day</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-3xl font-bold text-accent mb-1">5</p>
                <p className="font-semibold text-white text-sm">Strategic Assets</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-3xl font-bold text-accent mb-1">6+</p>
                <p className="font-semibold text-white text-sm">Months of ROI</p>
              </div>
            </div>

            <p>One less sales call per day. Multiply across a quarter, a year. That's the ROI — not impressions, but reclaimed hours and compounding revenue.</p>

            <div className="glass-card p-8 my-12 text-center border-accent/30">
              <h3 className="text-2xl font-bold text-white mb-3">One recording session. Five strategic assets. Zero guesswork.</h3>
              <p className="text-text-secondary mb-6">Book a strategy call and we'll map your sales process to the assets that will do the selling for you.</p>
              <a href="https://calendly.com/podlablv/new-meeting" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1">
                Book Your Strategy Call →
              </a>
            </div>
          </div>
        </div>
      </article>
    </div>
    </HomePageWrapper>
  );
}
