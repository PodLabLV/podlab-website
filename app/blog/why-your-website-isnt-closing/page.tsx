import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Why Your Website Isn't Closing — And What Will",
  description: "Your website looks professional. But prospects still leave without booking. Here's why — and how to fix it.",
  openGraph: {
    title: "Why Your Website Isn't Closing — And What Will",
    url: 'https://podlablv.com/blog/why-your-website-isnt-closing',
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
            <img src="/blog/flask-icon.png" alt="Website Conversion" className="w-full h-full object-cover" />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-accent font-semibold uppercase tracking-wider px-2 py-1 border border-accent/30 rounded">Sales</span>
            <span className="text-xs text-text-secondary">March 24, 2026</span>
            <span className="text-xs text-text-secondary">· 5 min read</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Why Your Website Isn't <span className="text-accent">Closing</span> — And What Will
          </h1>

          <p className="text-xl text-text-secondary mb-12 leading-relaxed border-l-4 border-accent pl-6">
            Your website looks good. It says the right things. It even gets traffic. But it's not closing. Not the way you close.
          </p>

          <div className="space-y-6 text-lg text-text-secondary leading-relaxed">

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">The Brochure Problem</h2>
            
            <p>Most founder-led businesses have what amounts to a digital brochure. Clean design. A few sections about services. Some logos. A "Book a Call" button.</p>
            
            <p>It checks every box. And it converts almost nobody.</p>

            <div className="glass-card p-6 my-8">
              <p className="text-xl font-bold text-white">A brochure assumes the visitor already trusts you. Your website does nothing to help them get there.</p>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">What Your Sales Calls Actually Do</h2>
            
            <div className="space-y-3 my-6">
              {["Diagnose the problem", "Reframe how they think about it", "Prove you can solve it", "Handle their objections", "Close"].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-accent font-bold text-xs">{i + 1}</span>
                  </div>
                  <span className="text-white font-semibold">{step}</span>
                </div>
              ))}
            </div>

            <p>Your website skips straight to step five and wonders why no one's clicking.</p>

            <h2 className="text-2xl md:text-3xl font-bold text-white pt-8 pb-2">A Website That Sells Like You Do</h2>
            
            <p>The fix isn't better copy. It's building a site that replicates the experience of being in a conversation with you.</p>

            <div className="space-y-4 my-8">
              <div className="glass-card p-5">
                <p className="text-sm"><span className="text-white font-semibold">Open with the problem.</span> Not your solution. Their pain.</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-sm"><span className="text-white font-semibold">Reframe before you pitch.</span> Change how they think before you sell.</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-sm"><span className="text-white font-semibold">Let them see you.</span> Video, not just text. Trust is visual.</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-sm"><span className="text-white font-semibold">Stack the proof.</span> Testimonials, results, case studies.</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-sm"><span className="text-white font-semibold">Make the next step feel inevitable.</span> Not a leap — a logical conclusion.</p>
              </div>
            </div>

            <div className="glass-card p-8 my-12 text-center border-accent/30">
              <h3 className="text-2xl font-bold text-white mb-3">Your website should sell like you do — without you.</h3>
              <p className="text-text-secondary mb-6">Let us show you what that looks like for your business.</p>
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
