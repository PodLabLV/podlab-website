import Navigation from '@/components/Navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Record Once, Sell Forever Framework | PodLab Blog',
  description: 'Stop treating content like a treadmill. Learn the operating system behind every asset we build at PodLab. Record once. Sell forever.',
  openGraph: {
    title: 'The Record Once, Sell Forever Framework',
    description: 'Stop treating content like a treadmill. Record once. Sell forever.',
    url: 'https://podlablv.com/blog/record-once-sell-forever',
  },
  twitter: {
    title: 'The Record Once, Sell Forever Framework',
    description: 'Stop treating content like a treadmill. Record once. Sell forever.',
  },
};

export default function BlogPost() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <article className="pt-32 pb-24 px-6 bg-gradient-to-b from-black to-bg-secondary">
        <div className="max-w-4xl mx-auto">
          <Link href="/blog" className="text-accent hover:underline mb-12 inline-block text-lg font-semibold hover:text-accent-hover transition-colors">
            ← Back to Blog
          </Link>
          
          <div className="mb-12">
            <div className="text-lg text-accent mb-6 font-bold uppercase tracking-wider">Week 2</div>
            <h1 className="text-6xl md:text-7xl font-black mb-8 leading-tight">
              The <span className="bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">Record Once</span>, <span className="text-accent drop-shadow-[0_0_20px_rgba(57,255,20,0.4)]">Sell Forever</span> Framework
            </h1>
          </div>

          <div className="prose prose-invert prose-lg max-w-none space-y-6">
            <p className="lead text-xl text-text-secondary">
              Most founders treat content like a treadmill. Record, post, repeat. Every week, starting from zero. There's a better model. One that treats your time like the scarce resource it is — and turns a single day of focused effort into months of selling power.
            </p>

            <p>We call it Record Once, Sell Forever. And it's the operating system behind every asset we build at The Podlab.</p>

            <h2 className="text-3xl font-bold mt-12 mb-4">The Problem With the Content Treadmill</h2>
            
            <p>You already know the math doesn't work.</p>
            
            <p>You're running a company. Managing a team. Closing deals. And somewhere in between, you're supposed to "show up" online — consistently, creatively, and with enough substance to actually move the needle.</p>
            
            <p>So you batch a few videos on a Sunday. You write posts in the margins. You hire someone to edit and hope it looks professional.</p>
            
            <p>Three weeks later, you've burned 20+ hours and produced a handful of clips that got a few hundred views.</p>
            
            <p>Meanwhile, your sales process hasn't changed. Your team still can't sell without you. And next month, you start over.</p>
            
            <p><strong>The treadmill doesn't reward effort. It punishes it.</strong></p>

            <h2 className="text-3xl font-bold mt-12 mb-4">The Framework</h2>
            
            <p>Record Once, Sell Forever isn't a slogan. It's a production methodology. Here's how it works:</p>

            <h3 className="text-2xl font-bold mt-8 mb-3">Step 1: Map the Sales Process</h3>
            
            <p>Before we turn on a camera, we map your buyer's journey — from first touch to closed deal. Every objection. Every question. Every moment where trust either builds or breaks.</p>
            
            <p>This isn't a creative exercise. It's a diagnostic. We're identifying the exact points in your sales cycle where the right asset eliminates friction, shortens timelines, or replaces a conversation you're having manually.</p>

            <h3 className="text-2xl font-bold mt-8 mb-3">Step 2: Script the Assets</h3>
            
            <p>Each asset gets designed for a specific job:</p>
            
            <ul className="space-y-2 ml-6">
              <li><strong>Top of funnel</strong> — Authority videos that make strangers understand your expertise in under 3 minutes.</li>
              <li><strong>Mid funnel</strong> — Objection-handling content that answers "Why you? Why now? Why this approach?" before your prospect ever asks.</li>
              <li><strong>Bottom of funnel</strong> — Case studies, breakdowns, and proof pieces that convert warm leads into booked calls.</li>
              <li><strong>Post-sale</strong> — Onboarding and education assets that reduce churn and increase referrals.</li>
            </ul>
            
            <p>Nothing is generic. Every asset maps to a stage, an objection, or a conversion point.</p>

            <h3 className="text-2xl font-bold mt-8 mb-3">Step 3: One Studio Day</h3>
            
            <p>This is where it all comes together. One focused day in our Las Vegas studio. Structured. Produced. Directed.</p>
            
            <p>You're not "winging it" in front of a ring light. You're executing a production plan — with professional audio, video, lighting, and a team that knows how to pull the best version of your message out of you.</p>
            
            <p>Most founders walk out of a single studio day with the raw material for:</p>
            
            <ul className="space-y-2 ml-6">
              <li>1–2 long-form authority pieces</li>
              <li>10–15 short-form clips</li>
              <li>A full video sales letter or VSL</li>
              <li>Website and landing page video</li>
              <li>3–6 months of social content</li>
            </ul>
            
            <p><strong>One day. Not one day a week. One day, period.</strong></p>

            <h3 className="text-2xl font-bold mt-8 mb-3">Step 4: Build the System</h3>
            
            <p>Raw footage isn't an asset. It's a starting point. After the studio session, our labs take over:</p>
            
            <ul className="space-y-2 ml-6">
              <li><strong>AssetsLab</strong> refines your message and positioning.</li>
              <li><strong>BrandLab</strong> wraps it in an identity that matches your authority.</li>
              <li><strong>SiteLab</strong> builds the conversion-focused pages that house your assets.</li>
              <li><strong>VideoSalesLab</strong> turns your recordings into a digital sales team that works 24/7.</li>
              <li><strong>ExpansionLab</strong> distributes and amplifies — so the right people see the right asset at the right time.</li>
            </ul>
            
            <p>The output isn't content. It's infrastructure that sells while you operate.</p>

            <h3 className="text-2xl font-bold mt-8 mb-3">Step 5: Deploy and Compound</h3>
            
            <p>Here's where "Sell Forever" kicks in.</p>
            
            <p>A social post dies in 24 hours. A sales asset deployed on your website, in your email sequences, in your team's outreach — that compounds.</p>
            
            <p>It works on Saturday nights. It works when you're on vacation. It works when you're focused on the hundred other things that actually need a founder's attention.</p>
            
            <p>Six months from now, that one studio day is still generating leads, pre-qualifying prospects, and shortening your sales cycle.</p>

            <h2 className="text-3xl font-bold mt-12 mb-4">Why This Works for Founders at Scale</h2>
            
            <p>If you're doing $1M–$8M, you don't need more awareness. You need more leverage.</p>
            
            <p>You've already proven the market wants what you sell. The bottleneck isn't demand — it's you. Your time. Your presence on every call. Your energy spent repeating the same pitch to prospects who should already be sold before they show up.</p>
            
            <p>Record Once, Sell Forever is built for this exact problem. It extracts what makes you compelling — your expertise, your story, your conviction — and turns it into something that operates independently of your calendar.</p>
            
            <p>You stay focused on running the business. Your assets handle the selling.</p>

            <h2 className="text-3xl font-bold mt-12 mb-4">The Math</h2>
            
            <p>Think about what one less sales call per day is worth to you. Not in time saved — in what you'd do with that time instead.</p>
            
            <p>Now multiply that across a quarter. Across a year.</p>
            
            <p>That's the ROI of an asset. Not impressions. Not engagement. Reclaimed hours and compounding revenue from a system that doesn't need you to show up again.</p>

            <div className="mt-12 p-8 bg-bg-secondary border border-border rounded-xl">
              <p className="text-lg mb-6">
                <strong>One recording session. Five strategic assets. Zero guesswork.</strong>
              </p>
              <Link
                href="/contact"
                className="inline-block px-8 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover transition"
              >
                Book Your Strategy Call →
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
