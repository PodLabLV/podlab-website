import Navigation from '@/components/Navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Why Your Website Isn't Closing | PodLab Blog",
  description: "Your website looks professional. But prospects still leave without booking. Here's why—and how to fix it.",
};

export default function BlogPost() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <article className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="text-accent hover:underline mb-8 inline-block">← Back to Blog</Link>
          <div className="mb-8">
            <div className="text-sm text-accent mb-4">Week 4</div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Why Your Website Isn't Closing — And What Will</h1>
          </div>
          <div className="prose prose-invert prose-lg max-w-none space-y-6">
            <p className="lead text-xl text-text-secondary">Your website looks good. It says the right things. It even gets traffic. But it's not closing. Not the way you close.</p>
            <h2 className="text-3xl font-bold mt-12 mb-4">The Brochure Problem</h2>
            <p>Most founder-led businesses have what amounts to a digital brochure. Clean design. A few sections about services. Some logos. A "Book a Call" button. It checks every box. And it converts almost nobody.</p>
            <p>Because a brochure assumes the visitor already trusts you. Already understands the problem. Already believes you're the one to solve it. That's four massive leaps — and your website does nothing to help them make a single one.</p>
            <h2 className="text-3xl font-bold mt-12 mb-4">What Your Sales Calls Actually Do</h2>
            <p>You diagnose. You reframe. You prove. You handle objections. You close. Your website does none of this. It skips straight to step five and wonders why no one's clicking.</p>
            <h2 className="text-3xl font-bold mt-12 mb-4">A Website That Sells Like You Do</h2>
            <p>The fix isn't better copy. It's building a site that replicates the experience of being in a conversation with you — the same sequence, the same logic, the same proof — without requiring you to be there.</p>
            <p>Open with the problem. Reframe before you pitch. Let them see you (video, not just text). Stack the proof. Make the next step feel inevitable.</p>
            <div className="mt-12 p-8 bg-bg-secondary border border-border rounded-xl">
              <p className="text-lg mb-6"><strong>Your website should sell like you do — without you.</strong></p>
              <Link href="/contact" className="inline-block px-8 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover transition">Book Your Strategy Call →</Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
