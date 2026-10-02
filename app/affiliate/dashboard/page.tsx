'use client';

// Beaker affiliates' front door on podlablv.com. The dashboard itself lives in
// the CRM (crm.podlablv.com → Referrals), where affiliates sign in: their
// links, tier progress, referrals, commission statement, payouts and payout
// setup are real data there. This page used to be a static mock with sample
// numbers; it now points affiliates at the real thing and keeps the swipe
// copy and FAQ, which are the same for everyone.

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';

const CRM_LOGIN = 'https://crm.podlablv.com/login';

const INSIDE = [
  ['Your links', 'Every PodLab page with your Beaker ID on it — anyone who arrives is remembered for 90 days.'],
  ['Where you stand', 'Your current rate, how many cleared sales to the next tier, and whether your 2× first sale is still ahead.'],
  ['Your referrals', 'Everyone credited to you, where they are in the pipeline, and what each has earned.'],
  ['Commission statement', 'Every line: net revenue, rate, amount, and the date it clears the 45-day hold.'],
  ['Getting paid', 'Link your Whop account, accept the payout terms, upload your W-9 — then payouts arrive monthly.'],
] as const;

const SWIPE_COPY = {
  social: [
    {
      title: 'LinkedIn Post',
      content: `If you're a founder doing $250K+ a year and still the bottleneck in your business — you need to see what PodLab is building.\n\nThey turn your expertise into 4K video assets that sell for you 24/7. Not generic content. Strategic founder duplication.\n\nI've seen the results firsthand. DM me for my referral link or check them out: podlablv.com`,
    },
    {
      title: 'Twitter/X Thread Starter',
      content: `Most founders doing $250K+ are stuck as the bottleneck.\n\nThey know content works but can't find time to create it. @PodLabLV solves this — they duplicate YOU into strategic video assets.\n\nRecord once. Sell forever. 🧪\n\nHere's what they offer 🧵`,
    },
    {
      title: 'Instagram Story Script',
      content: `Know a founder doing $1M+ who's the bottleneck in their business?\n\nI just connected someone with PodLab and they're already seeing results. They turn founder expertise into 4K video assets that sell 24/7.\n\nDM me "PODLAB" and I'll send you the link.`,
    },
  ],
  email: [
    {
      title: 'Warm Introduction Email',
      content: `Subject: Thought of you — founder duplication\n\nHey [Name],\n\nI know you've been grinding to grow [Company] and I wanted to share something I think could be a game-changer.\n\nPodLab works with service-based founders doing $250K+ a year to duplicate their expertise into strategic video assets. Think: your knowledge, your voice, your authority — working 24/7 even when you're not in the room.\n\nThey start with a $1,500 AssetsLab to build your content DNA, then scale from there. No fluff — pure ROI-focused founder duplication.\n\nWorth a look: podlablv.com/assessment?ref=[your-beaker-id]\n\nHappy to intro you directly if you're interested.\n\nBest,\n[Your Name]`,
    },
  ],
};

const FAQ_ITEMS = [
  {
    question: 'How does tracking work?',
    answer: 'Share your links (podlablv.com/?ref=your-beaker-id, or any page with ?ref= on it). A 90-day cookie remembers you; if they fill in a form or buy within that window, the referral is credited to you automatically. Buy buttons send them to a checkout tagged with your ID. People who were already PodLab contacts can\'t be credited (Restricted Customers, §2.4 of your agreement).',
  },
  {
    question: 'When do I get paid?',
    answer: 'Payouts are sent within 15 days after the end of each month, to your own Whop account (you withdraw to your bank from there). You need a minimum of $100 in cleared commissions, a linked Whop account and a W-9 on file.',
  },
  {
    question: "What's the hold period?",
    answer: 'All commissions have a 45-day hold period from the date PodLab receives the payment. This protects against refunds and chargebacks. After 45 days a commission becomes payable. A refund inside the hold cancels it; after the hold it comes off your next payout.',
  },
  {
    question: 'What if my referral buys multiple Labs?',
    answer: 'Your first sale pays 2× your rate (20% at the standard 10%), across every payment of that first deal. Later sales pay your tier rate: 10%, 12% from 5 cleared sales, 15% from 10, negotiated from 20. On ExpansionLab (monthly) the 2× applies to the first month only; every month after pays your rate for as long as they stay.',
  },
  {
    question: 'How do I sign in?',
    answer: 'At crm.podlablv.com with the email you applied with. PodLab sends your login once your application is approved. Forgot it? Email info@podlablv.com and we\'ll reset it.',
  },
];

// ─── Helper Components ───────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 hover:border-[#2ADD1B]/50 hover:text-[#2ADD1B] transition-all bg-white/5"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-[family-name:var(--font-michroma)] text-2xl md:text-3xl font-bold mb-8 text-white">
      {children}
    </h2>
  );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function BeakerDashboardHome() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <HomePageWrapper>
      <div className="min-h-screen bg-[#0A0A0A]">
        <Navigation />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-20">
          <div className="mb-10">
            <p className="text-[#2ADD1B] text-sm font-semibold uppercase tracking-widest mb-2">PodLab Beaker</p>
            <h1 className="font-[family-name:var(--font-michroma)] text-3xl md:text-5xl font-bold text-white">
              Your Beaker dashboard
            </h1>
            <p className="mt-4 text-neutral-400 max-w-2xl">
              Your links, referrals, commissions and payouts live in your PodLab account. Sign in with the email you applied with.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={CRM_LOGIN} className="px-6 py-3 rounded-xl font-bold bg-[#2ADD1B] text-black hover:shadow-[0_0_30px_rgba(42,221,27,0.4)] transition-all">
                Sign in to your dashboard
              </a>
              <a href="/affiliate/apply" className="px-6 py-3 rounded-xl font-semibold border border-white/15 text-white hover:border-[#2ADD1B]/50 transition-all">
                Not a Beaker yet? Apply
              </a>
            </div>
          </div>

          <section className="mb-12">
            <SectionHeading>What&apos;s inside</SectionHeading>
            <div className="grid md:grid-cols-2 gap-4">
              {INSIDE.map(([title, body]) => (
                <GlassCard key={title} className="p-5">
                  <div className="text-white font-semibold mb-1">{title}</div>
                  <p className="text-sm text-neutral-400 leading-relaxed">{body}</p>
                </GlassCard>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <SectionHeading>Swipe copy</SectionHeading>
            <p className="text-sm text-neutral-400 mb-4">Ready to post. Swap in your own link from the dashboard.</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[...SWIPE_COPY.social, ...SWIPE_COPY.email].map((item) => (
                <GlassCard key={item.title} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-semibold">{item.title}</span>
                    <CopyButton text={item.content} />
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-neutral-400 font-sans leading-relaxed">{item.content}</pre>
                </GlassCard>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h3>
            <div className="space-y-3">
              {FAQ_ITEMS.map((faq, i) => (
                <GlassCard key={i} className="overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-white font-medium pr-4">{faq.question}</span>
                    <span className={`text-neutral-400 transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-neutral-400 leading-relaxed border-t border-white/5 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
            <p className="mt-6 text-sm text-neutral-500">
              Questions? <a href="mailto:info@podlablv.com" className="text-[#2ADD1B]">info@podlablv.com</a>
            </p>
          </section>
        </div>
      </div>
    </HomePageWrapper>
  );
}
