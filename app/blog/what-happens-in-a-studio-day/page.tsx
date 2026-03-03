import Navigation from '@/components/Navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What Happens in a Studio Day? | PodLab Blog',
  description: 'Inside a PodLab studio session. How we turn founders into evergreen sales assets in a single day.',
};

export default function BlogPost() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <article className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="text-accent hover:underline mb-8 inline-block">← Back to Blog</Link>
          <div className="mb-8">
            <div className="text-sm text-accent mb-4">Week 3</div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">What Happens in a Podlab Studio Day</h1>
          </div>
          <div className="prose prose-invert prose-lg max-w-none space-y-6">
            <p className="lead text-xl text-text-secondary">You've got one day. No second chances. No "we'll fix it in post." That sounds intense. It is — by design.</p>
            <p>A Podlab studio day isn't a casual recording session. It's a structured production day that turns your expertise into a library of sales assets.</p>
            <h2 className="text-3xl font-bold mt-12 mb-4">Before You Show Up</h2>
            <p>The real work starts weeks before you step into the studio. Our team runs a deep diagnostic on your business — your sales process, your positioning, your buyer's objections, and the gaps where deals slow down or die.</p>
            <p>By studio day, you'll have a full content map linking every recording segment to a specific stage in your sales process, scripted talking points, and a production schedule broken down by the hour.</p>
            <h2 className="text-3xl font-bold mt-12 mb-4">The Morning: Foundation Assets</h2>
            <p>We start with the high-leverage pieces — the ones that do the heaviest lifting across your entire sales infrastructure. Your authority video and video sales letter.</p>
            <h2 className="text-3xl font-bold mt-12 mb-4">Midday: Objection Killers</h2>
            <p>We run through 10-15 short-form segments — each one designed to address a specific objection. Each segment runs 2–5 minutes. You already know the answers. Then they work for you forever.</p>
            <h2 className="text-3xl font-bold mt-12 mb-4">After You Leave</h2>
            <p>Our five labs take over. Within weeks, you have a full ecosystem of assets — deployed, working, and compounding.</p>
            <div className="mt-12 p-8 bg-bg-secondary border border-border rounded-xl">
              <p className="text-lg mb-6"><strong>One studio day. Five labs. Six months of assets. Zero guesswork.</strong></p>
              <Link href="/contact" className="inline-block px-8 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover transition">Book Your Strategy Call →</Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
