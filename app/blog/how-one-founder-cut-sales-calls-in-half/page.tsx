import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How One Founder Cut Sales Calls in Half — Same Revenue',
  description: 'Real case study: How strategic video assets reduced founder time on sales by 50% while maintaining revenue.',
  openGraph: {
    title: 'How One Founder Cut Sales Calls in Half — Same Revenue',
    url: 'https://podlablv.com/blog/how-one-founder-cut-sales-calls-in-half',
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
            <img src="/blog/hiram-hero.png" alt="Founder Case Study" className="w-full h-full object-cover" />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-accent font-semibold uppercase tracking-wider px-2 py-1 border border-accent/30 rounded">Case Study</span>
            <span className="text-xs text-text-tertiary">March 31, 2026</span>
            <span className="text-xs text-text-tertiary">· 4 min read</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
            How One Founder Cut Sales Calls in Half — <span className="text-accent">Same Revenue</span>
          </h1>

          <p className="text-xl text-text-secondary mb-12 leading-relaxed border-l-4 border-accent pl-6">
            He was on 40 sales calls a month. Closing well. Growing steadily. And completely stuck.
          </p>

          <div className="space-y-6 text-lg text-text-secondary leading-relaxed">

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Setup</h2>
            
            <p>We'll call him Mark. Eight figures in revenue. B2B service business. Mark was the engine — every qualified lead ended up on his calendar. Close rate north of 40%. Revenue was climbing.</p>

            <div className="glass-card p-6 my-8">
              <p className="text-xl font-bold text-white">But he was the bottleneck. His calendar capped how many deals could close in a month.</p>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Diagnosis</h2>
            
            <p>The first 15 minutes of every call were identical. The same introduction. The same explanation. The same credibility markers. Forty times a month.</p>
            
            <p className="text-white font-semibold">That was the leak.</p>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Build</h2>
            
            <p>Mark spent one day in our studio. He created:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
              <div className="glass-card p-5 text-center">
                <p className="text-2xl font-bold text-accent mb-1">1</p>
                <p className="text-sm font-semibold text-white">12-min Authority Video</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-2xl font-bold text-accent mb-1">8</p>
                <p className="text-sm font-semibold text-white">Objection-Handling Clips</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-2xl font-bold text-accent mb-1">2</p>
                <p className="text-sm font-semibold text-white">Case Study Breakdowns</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-2xl font-bold text-accent mb-1">1</p>
                <p className="text-sm font-semibold text-white">Video Sales Letter</p>
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Results</h2>

            <p>Within 60 days:</p>

            <div className="space-y-4 my-8">
              <div className="glass-card p-5 flex items-center justify-between">
                <span>Sales calls per month</span>
                <div className="flex items-center gap-3">
                  <span className="text-red-400 line-through">40</span>
                  <span className="text-accent font-bold text-xl">18</span>
                </div>
              </div>
              <div className="glass-card p-5 flex items-center justify-between">
                <span>Close rate</span>
                <div className="flex items-center gap-3">
                  <span className="text-text-tertiary">40%</span>
                  <span className="text-accent font-bold text-xl">55%</span>
                </div>
              </div>
              <div className="glass-card p-5 flex items-center justify-between">
                <span>Revenue (next quarter)</span>
                <div className="flex items-center gap-3">
                  <span className="text-accent font-bold text-xl">+20%</span>
                </div>
              </div>
              <div className="glass-card p-5 flex items-center justify-between">
                <span>Hours reclaimed per month</span>
                <div className="flex items-center gap-3">
                  <span className="text-accent font-bold text-xl">~30 hrs</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 my-12 text-center border-accent/30">
              <h3 className="text-2xl font-bold text-white mb-3">One studio day. Fewer calls. Same revenue. More leverage.</h3>
              <p className="text-text-secondary mb-6">See what your version of this looks like.</p>
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
