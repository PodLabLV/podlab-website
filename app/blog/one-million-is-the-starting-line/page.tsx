import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '$1M Is the Starting Line. EssentialsLab Is the On-Ramp.',
  description: 'A million isn\'t the finish line — it\'s the starting line. Under $1M is the grind. EssentialsLab is the on-ramp: a lite version of the Business Growth System that cuts the fluff and builds a vehicle to get you there.',
  openGraph: {
    title: '$1M Is the Starting Line. EssentialsLab Is the On-Ramp.',
    url: 'https://podlablv.com/blog/one-million-is-the-starting-line',
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
            <img src="/blog/essentialslab.jpg" alt="EssentialsLab — the on-ramp to $1M" className="w-full h-full object-cover" />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-accent font-semibold uppercase tracking-wider px-2 py-1 border border-accent/30 rounded">Strategy</span>
            <span className="text-xs text-text-secondary">June 1, 2026</span>
            <span className="text-xs text-text-secondary">· 5 min read</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            $1M Is the Starting Line. <span className="text-accent">EssentialsLab Is the On-Ramp.</span>
          </h1>

          <p className="text-xl text-text-secondary mb-12 leading-relaxed border-l-4 border-accent pl-6">
            You started a business. Now you're grinding under a million — doing everything yourself, wondering when it gets easier. Here's the truth: a million isn't the finish line. It's the starting line. EssentialsLab is how you get there.
          </p>

          <div className="space-y-6 text-lg text-text-secondary leading-relaxed">

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">$1M Is the Starting Line</h2>

            <p>Most founders treat a million in revenue like a finish line. It isn't. It's where the real race starts — where you finally have the cash, the team, and the surface area to build a business that scales without you.</p>

            <p>That's where our Business Growth System lives: the full PodLab system for founders scaling from $1M to $8M. But you can't run that race until you reach the line.</p>

            <div className="glass-card p-6 my-8">
              <p className="text-xl font-bold text-white">Under a million, you're not in the race yet. You're trying to reach the on-ramp.</p>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">Under a Million Is the Hardest Part</h2>

            <p>Nobody tells you this part out loud: the climb to your first million is the toughest stretch you'll run. You started a business — that already puts you ahead of most. But down here, you're the bottleneck on everything.</p>

            <p>Every sale runs through you. Every follow-up waits on you. There's no system carrying your pitch, so growth caps at your personal hours. You don't need more effort. You're already maxed.</p>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">Most "Help" Down Here Is Fluff</h2>

            <p>The advice aimed at sub-million founders is mostly noise. Another course. Another content treadmill. Another guru telling you to post more and manifest harder.</p>

            <p className="text-white font-semibold">None of it builds the one thing that actually moves you forward: a system that sells without you in the room.</p>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">EssentialsLab Is the On-Ramp</h2>

            <p>So we built the vehicle. <span className="text-white font-semibold">EssentialsLab is a lite version of the Business Growth System</span> — the same playbook our scaling founders use, sized for the climb to the starting line. We cut the fluff and build you a vehicle to get there.</p>

            <div className="glass-card p-8 my-8 border-accent/30">
              <p className="text-sm text-accent font-semibold uppercase tracking-wider mb-4">EssentialsLab — $3,000, live in under 30 days</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3"><span className="text-accent">→</span> Strategic clarity: ICP, offer, brand voice, positioning</li>
                <li className="flex items-start gap-3"><span className="text-accent">→</span> A conversion-built landing page — your sales floor</li>
                <li className="flex items-start gap-3"><span className="text-accent">→</span> A 4K landing video + 3 FAQ videos</li>
                <li className="flex items-start gap-3"><span className="text-accent">→</span> 5 ads scripted, shot, and edited</li>
              </ul>
            </div>

            <p>Clarity, a sales floor that closes while you sleep, and a demand engine that brings pre-sold buyers. No fluff. Just the vehicle that gets you to the line.</p>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">Six Slots a Month</h2>

            <p>We cap EssentialsLab at six founders a month. Not a countdown-timer gimmick — a real constraint. A studio day, a full build, and a strategy review per client takes attention you can't fake at volume.</p>

            <p className="text-white font-semibold">Six in. Built right. Then the next six.</p>

            <div className="glass-card p-8 my-12 text-center border-accent/30">
              <h3 className="text-2xl font-bold text-white mb-3">Find out exactly what's between you and the starting line.</h3>
              <p className="text-text-secondary mb-6">Start with the free 3-minute assessment. You'll see precisely where the bottleneck is — and we'll map your on-ramp together on a clarity call.</p>
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
