import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "You Don't Need More Content — You Need Better Assets",
  description: "Most founders are on a content treadmill. Posting daily, burning time they don't have. Stop creating throwaway content. Start building durable assets.",
  openGraph: {
    title: "You Don't Need More Content — You Need Better Assets",
    description: "Stop creating throwaway content. Start building durable assets.",
    url: "https://podlablv.com/blog/you-dont-need-more-content",
  },
};

export default function BlogPost() {
  return (
    <HomePageWrapper><div className="min-h-screen">
      <Navigation />
      
      <article className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">

          {/* Back link */}
          <Link href="/blog" className="text-accent hover:underline mb-8 inline-flex items-center gap-2 text-sm font-semibold hover:text-accent-hover transition-colors">
            ← Back to Blog
          </Link>

          {/* Hero Image */}
          <div className="aspect-[2/1] rounded-xl overflow-hidden mb-8">
            <img src="/blog/pen-syringe.png" alt="Content Assets" className="w-full h-full object-cover" />
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-accent font-semibold uppercase tracking-wider px-2 py-1 border border-accent/30 rounded">Strategy</span>
            <span className="text-xs text-text-secondary">March 3, 2026</span>
            <span className="text-xs text-text-secondary">· 8 min read</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            You Don't Need More Content — You Need <span className="text-accent">Better Assets</span>
          </h1>

          <p className="text-xl text-text-secondary mb-12 leading-relaxed border-l-4 border-accent pl-6">
            Most founders are on a content treadmill. Posting daily, showing up everywhere, burning time they don't have — and wondering why it's not moving the needle.
          </p>

          {/* Body */}
          <div className="space-y-6 text-lg text-text-secondary leading-relaxed">
            <p>
              The advice is everywhere: "You need to create content." "Show up consistently." "Build your personal brand."
            </p>

            <p>
              So you do. You post on LinkedIn. You batch videos on Sunday. You write threads, record voice notes, share behind-the-scenes clips. You show up.
            </p>

            <p>
              Three months later, you've burned 40+ hours and generated a few hundred likes. Maybe a DM or two. Zero deals closed.
            </p>

            <div className="glass-card p-6 my-8">
              <p className="text-xl font-bold text-white">
                The problem isn't your effort. It's your model.
              </p>
            </div>

            {/* Section */}
            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">Content vs. Assets</h2>

            <p>Most founders confuse content with assets. They're not the same.</p>

            <div className="grid md:grid-cols-2 gap-4 my-8">
              <div className="glass-card p-6 border-red-500/20">
                <h3 className="text-lg font-bold text-red-400 mb-2">Content</h3>
                <p className="text-sm">Disposable. A social post dies in 24 hours. A video gets 48 hours of traction, then disappears into the algorithm graveyard. You're starting from zero every single time.</p>
              </div>
              <div className="glass-card p-6 border-accent/20">
                <h3 className="text-lg font-bold text-accent mb-2">Assets</h3>
                <p className="text-sm">Compound. They work while you sleep. They're embedded in your sales process and generate results months — even years — after you create them.</p>
              </div>
            </div>

            <p className="text-white font-semibold text-xl text-center my-8">
              Content is a treadmill. Assets are infrastructure.
            </p>

            {/* Section */}
            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Treadmill Problem</h2>

            <p>Here's what the content treadmill looks like for a founder doing $2M–$5M:</p>

            <div className="glass-card p-6 my-6 space-y-3">
              <div className="flex justify-between items-center border-b border-[#2E2E2E] pb-2">
                <span>Batch 5 videos on Sunday</span>
                <span className="text-accent font-semibold">3 hours</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#2E2E2E] pb-2">
                <span>Team edits, captions, and schedules</span>
                <span className="text-accent font-semibold">4 hours</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#2E2E2E] pb-2">
                <span>Write 3 LinkedIn posts</span>
                <span className="text-accent font-semibold">2 hours</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#2E2E2E] pb-2">
                <span>Show up on a podcast</span>
                <span className="text-accent font-semibold">2+ hours</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#2E2E2E] pb-2">
                <span>Repurpose clips for IG and X</span>
                <span className="text-accent font-semibold">2 hours</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-white text-lg">Total</span>
                <span className="font-bold text-accent text-lg">13+ hours/week</span>
              </div>
            </div>

            <p>
              <strong className="text-white">Result:</strong> A few thousand impressions. Maybe 10 profile views. One mediocre inbound lead.
            </p>

            <p>
              Meanwhile, your calendar is still full of sales calls. Your team still can't close without you. And next week? You start over.
            </p>

            <div className="glass-card p-6 my-8">
              <p className="text-xl font-bold text-white">
                The treadmill doesn't reward consistency. It punishes it.
              </p>
            </div>

            {/* Section */}
            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">What an Asset Actually Does</h2>

            <p>An asset doesn't just get views. It does a job. A properly built asset:</p>

            <div className="space-y-4 my-6">
              <div className="flex items-start gap-3">
                <span className="text-accent text-xl flex-shrink-0 mt-1"></span>
                <div>
                  <p className="font-semibold text-white">Shortens your sales cycle</p>
                  <p className="text-sm">Prospects show up to calls already educated, pre-sold, and ready to buy.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent text-xl flex-shrink-0 mt-1"></span>
                <div>
                  <p className="font-semibold text-white">Handles objections before they're asked</p>
                  <p className="text-sm">The "Why you?" and "Why now?" get answered by a 3-minute video, not a 30-minute call.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent text-xl flex-shrink-0 mt-1"></span>
                <div>
                  <p className="font-semibold text-white">Empowers your team</p>
                  <p className="text-sm">Your sales coordinator sends targeted assets instead of scheduling another meeting with you.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent text-xl flex-shrink-0 mt-1"></span>
                <div>
                  <p className="font-semibold text-white">Compounds over time</p>
                  <p className="text-sm">Works on Saturday nights, holidays, and while you're focused on everything else.</p>
                </div>
              </div>
            </div>

            <p className="text-white font-semibold">
              A single well-deployed asset can replace 20+ hours of founder time per month. Forever.
            </p>

            {/* Section */}
            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Asset-First Model</h2>

            <p>Instead of asking "What should I post this week?" ask:</p>

            <div className="glass-card p-6 my-8 text-center">
              <p className="text-xl font-bold text-accent">
                "What part of my sales process still requires me personally?"
              </p>
              <p className="text-sm text-text-secondary mt-2">Then build an asset to replace it.</p>
            </div>

            <div className="space-y-4 my-6">
              <div className="glass-card p-5">
                <p className="text-sm"><span className="text-white font-semibold">You spend 15 min of every call explaining your methodology</span> → Record a 10-minute authority video and send it before the call.</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-sm"><span className="text-white font-semibold">Prospects ask "How is this different?"</span> → Create a 3-minute comparison video and embed it on your site.</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-sm"><span className="text-white font-semibold">Your team struggles to explain your process</span> → Film a case study walkthrough they can share in proposals.</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-sm"><span className="text-white font-semibold">Deals stall because prospects "need to think"</span> → Build a FAQ video series that handles every objection.</p>
              </div>
            </div>

            <p className="text-white font-semibold text-center text-xl my-8">
              One asset. One time. Deployed everywhere.
            </p>

            {/* Section */}
            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The ROI You're Not Measuring</h2>

            <p>Most founders measure content by vanity metrics: likes, shares, comments. Assets are measured differently:</p>

            <div className="grid md:grid-cols-3 gap-4 my-8">
              <div className="glass-card p-5 text-center">
                <p className="text-2xl font-bold text-accent mb-1">⏱️</p>
                <p className="font-semibold text-white text-sm">Time Saved</p>
                <p className="text-xs text-text-secondary mt-1">How many sales calls did this asset eliminate or shorten?</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-2xl font-bold text-accent mb-1"></p>
                <p className="font-semibold text-white text-sm">Close Rate</p>
                <p className="text-xs text-text-secondary mt-1">Do prospects who watch close faster or at higher rates?</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-2xl font-bold text-accent mb-1"></p>
                <p className="font-semibold text-white text-sm">Team Leverage</p>
                <p className="text-xs text-text-secondary mt-1">Can your team move deals forward without you?</p>
              </div>
            </div>

            <p>
              A single founder-duplication asset that saves you 10 hours a week is worth <span className="text-accent font-bold">$50K–$100K+ per year</span> in reclaimed time alone.
            </p>

            <p>
              That's before you count the deals it closes, the prospects it pre-qualifies, and the team capacity it unlocks.
            </p>

            {/* Section */}
            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">Stop Creating. Start Building.</h2>

            <p>
              You don't need more content. You need assets that do the work you're doing manually.
            </p>

            <p className="text-white font-semibold text-xl">
              One recording session. Five strategic assets. Six months of infrastructure.
            </p>

            <p>That's the model.</p>

            {/* CTA */}
            <div className="glass-card p-8 my-12 text-center border-accent/30">
              <h3 className="text-2xl font-bold text-white mb-3">Ready to stop the treadmill?</h3>
              <p className="text-text-secondary mb-6">
                Book a strategy call. We'll assess your bottleneck, map your sales process, and show you exactly which assets you need.
              </p>
              <a
                href="https://calendly.com/podlablv/strategy-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1"
              >
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
