import Navigation from '@/components/Navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How One Founder Cut Sales Calls in Half | PodLab Blog',
  description: 'Real case study: How strategic video assets reduced founder time on sales by 50% while closing more deals.',
};

export default function BlogPost() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <article className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="text-accent hover:underline mb-8 inline-block">← Back to Blog</Link>
          <div className="mb-8">
            <div className="text-sm text-accent mb-4">Week 5</div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">How One Founder Cut Sales Calls in Half — Same Revenue</h1>
          </div>
          <div className="prose prose-invert prose-lg max-w-none space-y-6">
            <p className="lead text-xl text-text-secondary">He was on 40 sales calls a month. Closing well. Growing steadily. And completely stuck.</p>
            <h2 className="text-3xl font-bold mt-12 mb-4">The Setup</h2>
            <p>We'll call him Mark. Eight figures in revenue. B2B service business. Mark was the engine. Every qualified lead ended up on his calendar. Close rate north of 40%. Revenue was climbing. But he was the bottleneck. His calendar capped how many deals could close in a month.</p>
            <h2 className="text-3xl font-bold mt-12 mb-4">The Diagnosis</h2>
            <p>The first 15 minutes of every call were identical. The same introduction. The same explanation. The same credibility markers. Forty times a month. That was the leak.</p>
            <h2 className="text-3xl font-bold mt-12 mb-4">The Build</h2>
            <p>Mark spent one day in our studio. He created: a 12-minute authority video, eight objection-handling clips, two case study breakdowns, and a video sales letter.</p>
            <h2 className="text-3xl font-bold mt-12 mb-4">What Changed</h2>
            <p>Within 60 days: Sales calls went from 40/month to 18/month. Close rate went from 40% to 55%. Revenue stayed flat the first month, then grew 20% over the next quarter. Mark got back ~30 hours a month.</p>
            <div className="mt-12 p-8 bg-bg-secondary border border-border rounded-xl">
              <p className="text-lg mb-6"><strong>One studio day. Fewer calls. Same revenue. More leverage.</strong></p>
              <Link href="/contact" className="inline-block px-8 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover transition">Book Your Strategy Call →</Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
