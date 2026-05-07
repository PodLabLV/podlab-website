import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What Happens in a PodLab Studio Day',
  description: 'Inside a PodLab studio session. How we turn founders into evergreen sales assets in a single day.',
  openGraph: {
    title: 'What Happens in a PodLab Studio Day',
    url: 'https://podlablv.com/blog/what-happens-in-a-studio-day',
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
            <img src="/studio/bigboss-color.png" alt="The Big Boss Studio Set" className="w-full h-full object-cover" />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-accent font-semibold uppercase tracking-wider px-2 py-1 border border-accent/30 rounded">Behind the Scenes</span>
            <span className="text-xs text-text-secondary">March 17, 2026</span>
            <span className="text-xs text-text-secondary">· 5 min read</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            What Happens in a <span className="text-accent">PodLab Studio Day</span>
          </h1>

          <p className="text-xl text-text-secondary mb-12 leading-relaxed border-l-4 border-accent pl-6">
            You've got one day. No second chances. No "we'll fix it in post." That sounds intense. It is — by design.
          </p>

          <div className="space-y-6 text-lg text-text-secondary leading-relaxed">

            <p>A PodLab studio day isn't a casual recording session. It's a structured production day that turns your expertise into a library of sales assets.</p>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">Before You Show Up</h2>
            
            <p>The real work starts weeks before. Our team runs a deep diagnostic on your business — your sales process, positioning, buyer objections, and the gaps where deals slow down or die.</p>
            
            <p>By studio day, you'll have a full content map, scripted talking points, and a production schedule broken down by the hour.</p>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Day</h2>

            <div className="space-y-4 my-8">
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-accent font-bold text-sm">️ MORNING</span>
                  <span className="text-xs text-text-secondary">Foundation Assets</span>
                </div>
                <p className="text-sm">High-leverage pieces first — your authority video and video sales letter. These do the heaviest lifting across your entire sales infrastructure.</p>
              </div>
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-accent font-bold text-sm"> MIDDAY</span>
                  <span className="text-xs text-text-secondary">Objection Killers</span>
                </div>
                <p className="text-sm">10-15 short-form segments, each addressing a specific objection. 2–5 minutes each. You already know the answers — now they work for you forever.</p>
              </div>
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-accent font-bold text-sm"> AFTER</span>
                  <span className="text-xs text-text-secondary">Labs Take Over</span>
                </div>
                <p className="text-sm">Our five labs handle everything from here. Within weeks, you have a full ecosystem of assets — deployed, working, and compounding.</p>
              </div>
            </div>

            <div className="glass-card p-8 my-12 text-center border-accent/30">
              <h3 className="text-2xl font-bold text-white mb-3">One studio day. Five labs. Six months of assets.</h3>
              <p className="text-text-secondary mb-6">Zero guesswork. Just a proven production system.</p>
              <a href="https://calendly.com/podlablv/strategy-call" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1">
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
