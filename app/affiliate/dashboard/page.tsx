'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';

// ─── Mock Data ───────────────────────────────────────────────
const BEAKER = {
  name: 'Marcus Rivera',
  joinedDate: 'January 2026',
  tier: 'Active Beaker',
};

const HERO_STATS = [
  { label: 'Total Clicks', value: '1,247', icon: '🔗', delta: '+89 this month' },
  { label: 'Assessments Started', value: '43', icon: '📋', delta: '+7 this month' },
  { label: 'Calls Booked', value: '18', icon: '📞', delta: '+3 this month' },
  { label: 'Deals Closed', value: '7', icon: '🤝', delta: '+1 this month' },
];

const EARNINGS = {
  totalEarned: 4_550,
  pendingCommissions: 1_050,
  availableForPayout: 2_150,
  nextPayoutDate: 'April 1, 2026',
  lifetimeReferrals: 7,
};

const COMMISSIONS = [
  { date: '2026-03-02', name: 'David Chen', lab: 'SiteLab', saleAmount: 3500, rate: 0.10, commission: 350, status: 'Pending' as const },
  { date: '2026-02-28', name: 'Priya Patel', lab: 'AssetsLab', saleAmount: 1500, rate: 0.20, commission: 300, status: 'Pending' as const },
  { date: '2026-02-14', name: 'Jordan Miles', lab: 'BrandLab', saleAmount: 3500, rate: 0.10, commission: 350, status: 'Cleared' as const },
  { date: '2026-02-01', name: 'Rachel Torres', lab: 'SiteLab', saleAmount: 3500, rate: 0.20, commission: 700, status: 'Cleared' as const },
  { date: '2026-01-18', name: 'Marcus Lee', lab: 'AssetsLab', saleAmount: 1500, rate: 0.20, commission: 300, status: 'Paid' as const },
  { date: '2026-01-05', name: 'Sarah Kim', lab: 'VideoSalesLab', saleAmount: 10000, rate: 0.20, commission: 2000, status: 'Paid' as const },
  { date: '2025-12-20', name: 'Jordan Miles', lab: 'AssetsLab', saleAmount: 1500, rate: 0.10, commission: 150, status: 'Paid' as const },
  { date: '2025-12-08', name: 'Alex Nguyen', lab: 'BrandLab', saleAmount: 3500, rate: 0.10, commission: 350, status: 'Paid' as const },
];

const UTM_LINKS = [
  { page: 'Assessment', link: 'podlablv.com/assessment?ref=marcus-rivera', clicks: 482, conversions: 21, rate: 4.4 },
  { page: 'Services', link: 'podlablv.com/services?ref=marcus-rivera', clicks: 315, conversions: 12, rate: 3.8 },
  { page: 'Home', link: 'podlablv.com?ref=marcus-rivera', clicks: 276, conversions: 7, rate: 2.5 },
  { page: 'Affiliate', link: 'podlablv.com/affiliate?ref=marcus-rivera', clicks: 174, conversions: 3, rate: 1.7 },
];

const MONTHLY_DATA = [
  { month: 'Oct', amount: 0 },
  { month: 'Nov', amount: 150 },
  { month: 'Dec', amount: 500 },
  { month: 'Jan', amount: 2300 },
  { month: 'Feb', amount: 1050 },
  { month: 'Mar', amount: 350 },
];

const SWIPE_COPY = {
  social: [
    {
      title: 'LinkedIn Post',
      content: `If you're a founder doing $1M-$8M and still the bottleneck in your business — you need to see what PodLab is building.\n\nThey turn your expertise into 4K video assets that sell for you 24/7. Not generic content. Strategic founder duplication.\n\nI've seen the results firsthand. DM me for my referral link or check them out: podlablv.com`,
    },
    {
      title: 'Twitter/X Thread Starter',
      content: `Most $1M-$8M founders are stuck as the bottleneck.\n\nThey know content works but can't find time to create it. @PodLabLV solves this — they duplicate YOU into strategic video assets.\n\nRecord once. Sell forever. 🧪\n\nHere's what they offer 🧵`,
    },
    {
      title: 'Instagram Story Script',
      content: `Know a founder doing $1M+ who's the bottleneck in their business?\n\nI just connected someone with PodLab and they're already seeing results. They turn founder expertise into 4K video assets that sell 24/7.\n\nDM me "PODLAB" and I'll send you the link.`,
    },
  ],
  email: [
    {
      title: 'Warm Introduction Email',
      content: `Subject: Thought of you — founder duplication\n\nHey [Name],\n\nI know you've been grinding to grow [Company] and I wanted to share something I think could be a game-changer.\n\nPodLab works with $1M-$8M service-based founders to duplicate their expertise into strategic video assets. Think: your knowledge, your voice, your authority — working 24/7 even when you're not in the room.\n\nThey start with a $1,500 AssetsLab to build your content DNA, then scale from there. No fluff — pure ROI-focused founder duplication.\n\nWorth a look: podlablv.com/assessment?ref=marcus-rivera\n\nHappy to intro you directly if you're interested.\n\nBest,\n[Your Name]`,
    },
  ],
};

const FAQ_ITEMS = [
  {
    question: 'How does tracking work?',
    answer: 'Every Beaker gets unique UTM links for each PodLab page. When someone clicks your link, a 90-day cookie is placed. If they complete an assessment, book a call, or purchase within that window — the referral is attributed to you automatically.',
  },
  {
    question: 'When do I get paid?',
    answer: 'Payouts happen on the 1st of each month via ApplePay, Zelle, or Wire transfer. You need a minimum of $100 in cleared commissions to trigger a payout.',
  },
  {
    question: "What's the hold period?",
    answer: 'All commissions have a 45-day hold period from the date of the referred sale. This protects against refunds and chargebacks. After 45 days, commissions move from "Pending" to "Cleared" and become available for payout.',
  },
  {
    question: 'What if my referral buys multiple Labs?',
    answer: 'You earn 20% on the first Lab they purchase and 10% on every subsequent Lab. For ExpansionLab (monthly retainer), you earn 10% recurring for as long as they remain active.',
  },
];

// ─── Helper Components ───────────────────────────────────────

function StatusBadge({ status }: { status: 'Pending' | 'Cleared' | 'Paid' }) {
  const colors = {
    Pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Cleared: 'bg-[#2ADD1B]/20 text-[#2ADD1B] border-[#2ADD1B]/30',
    Paid: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${colors[status]}`}>
      {status}
    </span>
  );
}

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

// ─── Main Dashboard ──────────────────────────────────────────

export default function BeakerDashboard() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const maxMonthly = Math.max(...MONTHLY_DATA.map((d) => d.amount), 1);

  return (
    <HomePageWrapper>
      <div className="min-h-screen bg-[#0A0A0A]">
        <Navigation />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-20">
          {/* Welcome Header */}
          <div className="mb-10">
            <p className="text-[#2ADD1B] text-sm font-semibold uppercase tracking-widest mb-2">{BEAKER.tier} · Since {BEAKER.joinedDate}</p>
            <h1 className="font-[family-name:var(--font-michroma)] text-3xl md:text-5xl font-bold text-white">
              Welcome back, {BEAKER.name.split(' ')[0]}
            </h1>
          </div>

          {/* ── 1. Hero Stats Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {HERO_STATS.map((stat) => (
              <GlassCard key={stat.label} className="p-5 md:p-6 hover:border-[#2ADD1B]/40 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{stat.icon}</span>
                  <span className="text-xs text-[#2ADD1B] opacity-0 group-hover:opacity-100 transition-opacity">{stat.delta}</span>
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-neutral-400">{stat.label}</div>
              </GlassCard>
            ))}
          </div>

          {/* ── 2. Earnings Summary ── */}
          <section className="mb-12">
            <SectionHeading>Earnings Summary</SectionHeading>
            <GlassCard className="p-6 md:p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div>
                  <div className="text-sm text-neutral-400 mb-1">Total Earned</div>
                  <div className="text-3xl font-bold text-white">${EARNINGS.totalEarned.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-400 mb-1">Pending (45-day hold)</div>
                  <div className="text-3xl font-bold text-yellow-400">${EARNINGS.pendingCommissions.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-400 mb-1">Available for Payout</div>
                  <div className="text-3xl font-bold text-[#2ADD1B]">${EARNINGS.availableForPayout.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-400 mb-1">Next Payout</div>
                  <div className="text-xl font-semibold text-white">{EARNINGS.nextPayoutDate}</div>
                </div>
              </div>
              <button className="w-full sm:w-auto px-8 py-4 bg-[#2ADD1B] text-black font-bold text-lg rounded-xl hover:bg-[#25c418] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(42,221,27,0.4)]">
                Request Payout — ${EARNINGS.availableForPayout.toLocaleString()}
              </button>
            </GlassCard>
          </section>

          {/* ── 3. Commission Breakdown Table ── */}
          <section className="mb-12">
            <SectionHeading>Commission Breakdown</SectionHeading>
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-neutral-400">
                      <th className="text-left py-4 px-4 md:px-6 font-medium">Date</th>
                      <th className="text-left py-4 px-4 md:px-6 font-medium">Referral</th>
                      <th className="text-left py-4 px-4 md:px-6 font-medium hidden sm:table-cell">Lab</th>
                      <th className="text-right py-4 px-4 md:px-6 font-medium hidden md:table-cell">Sale</th>
                      <th className="text-right py-4 px-4 md:px-6 font-medium hidden md:table-cell">Rate</th>
                      <th className="text-right py-4 px-4 md:px-6 font-medium">Commission</th>
                      <th className="text-right py-4 px-4 md:px-6 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMMISSIONS.map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-4 md:px-6 text-neutral-300 whitespace-nowrap">{new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td className="py-4 px-4 md:px-6 text-white font-medium">{row.name}</td>
                        <td className="py-4 px-4 md:px-6 text-neutral-300 hidden sm:table-cell">{row.lab}</td>
                        <td className="py-4 px-4 md:px-6 text-right text-neutral-300 hidden md:table-cell">${row.saleAmount.toLocaleString()}</td>
                        <td className="py-4 px-4 md:px-6 text-right hidden md:table-cell">
                          <span className={row.rate === 0.20 ? 'text-[#2ADD1B] font-semibold' : 'text-neutral-400'}>
                            {(row.rate * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-4 px-4 md:px-6 text-right text-white font-semibold">${row.commission.toLocaleString()}</td>
                        <td className="py-4 px-4 md:px-6 text-right"><StatusBadge status={row.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </section>

          {/* ── 4. UTM Link Performance ── */}
          <section className="mb-12">
            <SectionHeading>UTM Link Performance</SectionHeading>
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-neutral-400">
                      <th className="text-left py-4 px-4 md:px-6 font-medium">Page</th>
                      <th className="text-left py-4 px-4 md:px-6 font-medium">Link</th>
                      <th className="text-right py-4 px-4 md:px-6 font-medium">Clicks</th>
                      <th className="text-right py-4 px-4 md:px-6 font-medium hidden sm:table-cell">Conversions</th>
                      <th className="text-right py-4 px-4 md:px-6 font-medium hidden sm:table-cell">Rate</th>
                      <th className="text-right py-4 px-4 md:px-6 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {UTM_LINKS.map((link) => (
                      <tr key={link.page} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-4 md:px-6 text-white font-medium">{link.page}</td>
                        <td className="py-4 px-4 md:px-6 text-neutral-400 text-xs md:text-sm font-mono truncate max-w-[200px]">{link.link}</td>
                        <td className="py-4 px-4 md:px-6 text-right text-white">{link.clicks.toLocaleString()}</td>
                        <td className="py-4 px-4 md:px-6 text-right text-neutral-300 hidden sm:table-cell">{link.conversions}</td>
                        <td className="py-4 px-4 md:px-6 text-right text-[#2ADD1B] font-semibold hidden sm:table-cell">{link.rate}%</td>
                        <td className="py-4 px-4 md:px-6 text-right">
                          <CopyButton text={`https://${link.link}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </section>

          {/* ── 5. Monthly Performance Chart ── */}
          <section className="mb-12">
            <SectionHeading>Monthly Performance</SectionHeading>
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-end gap-3 md:gap-6 h-56 md:h-72">
                {MONTHLY_DATA.map((d) => {
                  const pct = maxMonthly > 0 ? (d.amount / maxMonthly) * 100 : 0;
                  return (
                    <div key={d.month} className="flex-1 flex flex-col items-center justify-end h-full group">
                      <span className="text-xs md:text-sm font-semibold text-white mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        ${d.amount.toLocaleString()}
                      </span>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-[#2ADD1B]/80 to-[#2ADD1B] group-hover:from-[#2ADD1B] group-hover:to-[#5fff4a] transition-all relative"
                        style={{ height: `${Math.max(pct, 2)}%` }}
                      >
                        <div className="absolute inset-0 rounded-t-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-xs text-neutral-500 mt-3">{d.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-sm">
                <span className="text-neutral-400">6-month total</span>
                <span className="text-white font-semibold">
                  ${MONTHLY_DATA.reduce((s, d) => s + d.amount, 0).toLocaleString()}
                </span>
              </div>
            </GlassCard>
          </section>

          {/* ── 6. Swipe Copy Section ── */}
          <section className="mb-12">
            <SectionHeading>Swipe Copy</SectionHeading>
            <p className="text-neutral-400 mb-6 -mt-4">Pre-written posts and emails — just copy, personalize, and share.</p>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Social Posts</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SWIPE_COPY.social.map((item) => (
                  <GlassCard key={item.title} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-[#2ADD1B]">{item.title}</h4>
                      <CopyButton text={item.content} />
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-line line-clamp-6">{item.content}</p>
                  </GlassCard>
                ))}
              </div>

              <h3 className="text-lg font-semibold text-white pt-4">Email Templates</h3>
              <div className="grid gap-4">
                {SWIPE_COPY.email.map((item) => (
                  <GlassCard key={item.title} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-[#2ADD1B]">{item.title}</h4>
                      <CopyButton text={item.content} />
                    </div>
                    <pre className="text-xs text-neutral-400 leading-relaxed whitespace-pre-wrap font-sans line-clamp-[10]">{item.content}</pre>
                  </GlassCard>
                ))}
              </div>
            </div>
          </section>

          {/* ── 7. Resources ── */}
          <section className="mb-12">
            <SectionHeading>Resources</SectionHeading>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <a href="/affiliate/utm" className="block group">
                <GlassCard className="p-6 hover:border-[#2ADD1B]/40 transition-all">
                  <div className="text-2xl mb-3">🔗</div>
                  <h4 className="text-white font-semibold mb-1 group-hover:text-[#2ADD1B] transition-colors">UTM Link Generator</h4>
                  <p className="text-sm text-neutral-400">Create tracked links for any PodLab page</p>
                </GlassCard>
              </a>
              <a href="#" className="block group">
                <GlassCard className="p-6 hover:border-[#2ADD1B]/40 transition-all">
                  <div className="text-2xl mb-3">🎨</div>
                  <h4 className="text-white font-semibold mb-1 group-hover:text-[#2ADD1B] transition-colors">Brand Assets</h4>
                  <p className="text-sm text-neutral-400">Logos, colors, and approved imagery</p>
                </GlassCard>
              </a>
              <a href="mailto:info@podlablv.com" className="block group">
                <GlassCard className="p-6 hover:border-[#2ADD1B]/40 transition-all">
                  <div className="text-2xl mb-3">💬</div>
                  <h4 className="text-white font-semibold mb-1 group-hover:text-[#2ADD1B] transition-colors">Get Support</h4>
                  <p className="text-sm text-neutral-400">Questions? Reach out to the Beaker team</p>
                </GlassCard>
              </a>
            </div>

            {/* FAQ */}
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
          </section>
        </div>
      </div>
    </HomePageWrapper>
  );
}
