import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "You're Not Behind — You're at the Starting Line",
  description: 'We work with $1M–$8M service founders. We just opened 6 slots a month for owners under $1M — the lite version of the system those founders scale with. Here\'s why.',
  openGraph: {
    title: "You're Not Behind — You're at the Starting Line",
    url: 'https://podlablv.com/blog/youre-at-the-starting-line',
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
            <img src="/blog/beakers.png" alt="EssentialsLab — the starting line" className="w-full h-full object-cover" />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-accent font-semibold uppercase tracking-wider px-2 py-1 border border-accent/30 rounded">Strategy</span>
            <span className="text-xs text-text-secondary">June 1, 2026</span>
            <span className="text-xs text-text-secondary">· 5 min read</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            You're Not Behind — You're at the <span className="text-accent">Starting Line</span>
          </h1>

          <p className="text-xl text-text-secondary mb-12 leading-relaxed border-l-4 border-accent pl-6">
            You've been running hard for years. So why does it feel like you haven't left the parking lot? Because you've been running a job — not a business that scales without you.
          </p>

          <div className="space-y-6 text-lg text-text-secondary leading-relaxed">

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">Running a Job, Not a Business</h2>

            <p>If you're a service founder doing under a million, here's the trap nobody names: you didn't build a business. You built a high-paying job with you as the product.</p>

            <p>Every sale runs through you. Every trust-building moment needs you in the room. The same pitch, the same explanation, the same credibility markers — delivered over and over, by hand, because there's no system carrying it for you.</p>

            <div className="glass-card p-6 my-8">
              <p className="text-xl font-bold text-white">It's not a revenue problem. It's a duplication problem. Growth stalls exactly at your personal capacity.</p>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Race Is Scale, Not Survival</h2>

            <p>When we say "starting line," we don't mean you haven't started. You've been grinding for years. We mean the line where the <span className="text-white font-semibold">business</span> starts moving without you in every seat.</p>

            <p>That's the actual race — the one the founders we work with are already running. Not "make more content" or "work more hours." A business that sells, qualifies, and follows up whether you're on a call or on vacation.</p>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">What the Founders Already Scaling Use</h2>

            <p>We build for $1M–$8M service founders. The system that gets them out of the bottleneck is consistent every time:</p>

            <div className="space-y-4 my-8">
              <div className="glass-card p-5"><span className="text-accent font-semibold">Clarity</span> — a positioning, offer, and message so sharp the right buyer self-selects.</div>
              <div className="glass-card p-5"><span className="text-accent font-semibold">A sales floor</span> — a page and video that deliver your best pitch 24/7, so prospects arrive pre-sold.</div>
              <div className="glass-card p-5"><span className="text-accent font-semibold">A demand engine</span> — ads engineered to bring qualified buyers, not just impressions.</div>
            </div>

            <p>Record once. Sell forever. That's how they scale without burning out.</p>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Lite Version — Built to Get You to the Line</h2>

            <p>Until now, that system started at the full Business Growth System — built for founders already past the million-dollar line. If you weren't there yet, you were on the outside looking in.</p>

            <p>So we built <span className="text-white font-semibold">EssentialsLab</span>: the same playbook, sized for your stage.</p>

            <div className="glass-card p-8 my-8 border-accent/30">
              <p className="text-sm text-accent font-semibold uppercase tracking-wider mb-4">EssentialsLab — $3,000, live in under 30 days</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3"><span className="text-accent">→</span> Strategic clarity: ICP, offer, brand voice, positioning</li>
                <li className="flex items-start gap-3"><span className="text-accent">→</span> A conversion-built landing page — your sales floor</li>
                <li className="flex items-start gap-3"><span className="text-accent">→</span> A 4K landing video + 3 FAQ videos</li>
                <li className="flex items-start gap-3"><span className="text-accent">→</span> 5 ads scripted, shot, and edited</li>
              </ul>
            </div>

            <p>Same direction the scaling founders are headed. Sized to get you into the race — without burning out on the way.</p>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">Six Slots a Month</h2>

            <p>We cap EssentialsLab at six founders a month. Not a countdown-timer gimmick — a real constraint. A studio day, a full build, and a strategy review per client takes the kind of attention you can't fake at volume.</p>

            <p className="text-white font-semibold">Six in. Built right. Then the next six.</p>

            <div className="glass-card p-8 my-12 text-center border-accent/30">
              <h3 className="text-2xl font-bold text-white mb-3">Find out exactly where your growth is leaking.</h3>
              <p className="text-text-secondary mb-6">Start with the free 3-minute assessment. You'll know precisely where the bottleneck is — and we'll walk through it together on a clarity call.</p>
              <a href="https://podlablv.com/essentialslab" className="inline-block px-8 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1">
                Take the Free Assessment →
              </a>
            </div>
          </div>
        </div>
      </article>
    </div>
    </HomePageWrapper>
  );
}
