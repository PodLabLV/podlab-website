import Navigation from "@/components/Navigation";
import Link from "next/link";
import Image from "next/image";
import ImageWithHover from "@/components/ImageWithHover";
import type { Metadata } from 'next';
import HomePageWrapper from '@/components/HomePageWrapper';

export const metadata: Metadata = {
  title: 'Beaker Affiliate Program | Earn While Helping Founders Scale',
  description: 'Earn 20% on your first referral, then 10% recurring — helping $1M–$8M founders break through the bottleneck. Join the PodLab Beaker affiliate program.',
  openGraph: {
    title: 'PodLab Beaker | Affiliate Program',
    description: 'Earn 20% on your first referral, then 10% recurring. Help founders scale.',
    url: 'https://podlablv.com/affiliate',
  },
  twitter: {
    title: 'PodLab Beaker | Affiliate Program',
    description: 'Earn 20% on your first referral, then 10% recurring. Help founders scale.',
  },
};

export default function AffiliatePage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />
        
        {/* Hero */}
        <section className="group relative pt-32 pb-24 px-6 overflow-hidden">
          {/* Beaker Background - B&W to Color on Hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            {/* B&W base layer */}
            <img 
              src="/beaker-hero-bw.png" 
              alt="Beaker Background"
              className="w-full h-full object-cover"
            />
            {/* Color layer - fades in on group hover */}
            <img 
              src="/beaker-hero.png" 
              alt="Beaker Background"
              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-[350ms]"
            />
          </div>
          
          <div className="relative z-10 max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-7xl lg:text-8xl font-black mb-8 leading-[0.95] tracking-tight">
              <span className="bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">Earn</span> While Helping<br />
              Founders <span className="text-accent drop-shadow-[0_0_25px_rgba(42,221,27,0.5)]">Scale</span>
            </h1>
            <p className="text-2xl md:text-3xl text-text-secondary mb-16 max-w-4xl mx-auto font-light leading-relaxed">
              <span className="text-white font-semibold">PodLab Beaker</span> is our affiliate program for founders, creators, and connectors who know <span className="text-accent font-bold">$1M–$8M business owners</span> stuck as the bottleneck.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8 mb-12">
              {stats.map((stat) => (
                <div key={stat.label} className="glass-card group p-6 hover:border-accent hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(42,221,27,0.2)] transition-all duration-350 cursor-pointer">
                  <div className="text-4xl font-bold text-accent mb-2 group-hover:scale-110 transition-transform">{stat.value}</div>
                  <div className="text-sm text-text-secondary group-hover:text-accent transition-colors">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/affiliate/apply"
                className="group inline-block px-12 py-5 bg-accent text-black text-lg font-bold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(42,221,27,0.4)] relative overflow-hidden"
              >
                <span className="relative z-10">Apply to Join →</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              </a>
              <Link
                href="/affiliate/dashboard"
                className="inline-block px-10 py-5 border border-white/20 text-white text-lg font-bold rounded-lg hover:border-accent hover:text-accent transition-all hover:-translate-y-1"
              >
                Beaker Dashboard →
              </Link>
            </div>
          </div>
        </section>

        {/* Become a Beaker Video */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(42,221,27,0.3)]">
              <div className="aspect-video">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/vbo59PvEfto?autoplay=0&mute=0&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1"
                  title="Become a Beaker - PodLab Affiliate Program"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">Simple. Transparent. Founder-Friendly.</h2>
            <div className="grid md:grid-cols-3 gap-12">
              {steps.map((step, index) => (
                <div key={step.title} className="glass-card group p-8 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(42,221,27,0.2)] transition-all duration-350 cursor-pointer">
                  <div className="text-accent font-bold mb-4 group-hover:scale-110 transition-transform inline-block">STEP {index + 1}</div>
                  <h3 className="text-2xl font-bold mb-4 group-hover:text-accent transition-colors">{step.title}</h3>
                  <p className="text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Commission Structure */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">What You Earn</h2>
            <div className="glass-card p-8 md:p-12">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-4 px-6 font-semibold">Lab</th>
                      <th className="text-right py-4 px-6 font-semibold">Price</th>
                      <th className="text-right py-4 px-6 font-semibold">10% Commission</th>
                      <th className="text-right py-4 px-6 font-semibold">20% First Sale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((item) => (
                      <tr key={item.lab} className="border-b border-border/50">
                        <td className="py-4 px-6">{item.lab}</td>
                        <td className="text-right py-4 px-6 text-text-secondary">{item.price}</td>
                        <td className="text-right py-4 px-6 text-text-secondary">{item.standard}</td>
                        <td className="text-right py-4 px-6 text-accent font-semibold">{item.first}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-12 glass-card p-8">
              <h3 className="text-2xl font-bold mb-4">Recurring Revenue</h3>
              <p className="text-lg text-text-secondary mb-4">
                When your referral signs up for ExpansionLab ($5K/month retainer), you earn <strong className="text-accent">$500/month recurring</strong> for as long as they stay active.
              </p>
              <p className="text-text-secondary">
                Example: Refer 3 clients to ExpansionLab → Earn <strong className="text-accent">$1,500/month recurring</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Rules */}
        <section className="py-24 px-6">
          <div className="glass-card max-w-4xl mx-auto p-8 md:p-12">
            <h2 className="text-4xl font-bold mb-12">What You CAN'T Do</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {rules.map((rule) => (
                <div key={rule} className="flex items-start gap-3">
                  <span className="text-red-500 text-xl flex-shrink-0">✗</span>
                  <span className="text-text-secondary">{rule}</span>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-text-secondary">
              <strong className="text-text-primary">Violation = Immediate Termination</strong> (and unpaid commissions forfeited)
            </p>
          </div>
        </section>

        {/* Ambassadors */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4">Meet Our Ambassadors</h2>
            <p className="text-xl text-text-secondary text-center mb-16">
              Early partners helping founders scale without founder dependency
            </p>

            {/* Featured Ambassador - Jaxon Wright */}
            <div className="glass-card mb-16 p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="group">
                  <div className="overflow-hidden rounded-xl border border-border group-hover:border-accent transition-all duration-350">
                    <ImageWithHover
                      src="/affiliate/jaxon-wright.png"
                      alt="Jaxon Wright - My Friends in Business"
                      width={600}
                      height={400}
                      className="shadow-xl"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-accent text-sm font-bold uppercase tracking-wider mb-3">Featured Ambassador</div>
                  <h3 className="text-3xl font-bold mb-2">Jaxon Wright</h3>
                  <p className="text-xl text-accent font-semibold mb-4">Owner, My Friends in Business</p>
                  <p className="text-lg text-text-secondary mb-6 leading-relaxed">
                    Event company for established business owners. Connecting $1M+ founders with systems and strategies that remove bottlenecks and create scale.
                  </p>
                  <div className="flex items-center gap-3 text-text-secondary">
                    <span className="px-4 py-2 bg-accent/10 border border-accent text-accent rounded-full text-sm">Event Production</span>
                    <span className="px-4 py-2 bg-accent/10 border border-accent text-accent rounded-full text-sm">Network Builder</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PodLab Group Photo */}
            <div className="text-center">
              <div className="group overflow-hidden rounded-2xl border-2 border-border hover:border-accent transition-all duration-350 inline-block">
                <ImageWithHover
                  src="/affiliate/podlab-group.png"
                  alt="PodLab Ambassador Network"
                  width={1000}
                  height={600}
                  className="shadow-2xl"
                />
              </div>
              <p className="text-text-secondary mt-6 text-lg">
                Join a network of connectors helping founders duplicate themselves
              </p>
            </div>
          </div>
        </section>

        {/* Apply */}
        <section id="apply" className="py-24 px-6">
          <div className="glass-card max-w-4xl mx-auto text-center p-8 md:p-12">
            <h2 className="text-5xl font-bold mb-6">Ready to Join PodLab Beaker?</h2>
            <p className="text-xl text-text-secondary mb-12">
              If you know $1M+ founders stuck as the bottleneck, and you want to earn while helping them scale, apply now.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/affiliate/apply"
                className="group inline-block px-12 py-5 bg-accent text-black text-lg font-bold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(42,221,27,0.4)] relative overflow-hidden"
              >
                <span className="relative z-10">Apply to Join →</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              </a>
              <Link
                href="/affiliate/dashboard"
                className="inline-block px-10 py-5 border border-white/20 text-white text-lg font-bold rounded-lg hover:border-accent hover:text-accent transition-all hover:-translate-y-1"
              >
                Beaker Dashboard →
              </Link>
            </div>
            <p className="mt-6 text-sm text-text-secondary">
              Already a Beaker? <Link href="/affiliate/dashboard" className="text-accent hover:underline">Go to your dashboard</Link>. New? Application takes 3 minutes.
            </p>
          </div>
        </section>
      </div>
    </HomePageWrapper>
  );
}

const stats = [
  { value: "10%", label: "Commission Rate" },
  { value: "20%", label: "First Sale Bonus" },
  { value: "$500/mo", label: "Recurring (ExpansionLab)" },
];

const steps = [
  {
    title: "Apply",
    description: "Tell us who you are, who you know, and why you'd be a great partner. We approve affiliates manually.",
  },
  {
    title: "Refer",
    description: "Share your unique link with founders in your network. Private communities, one-on-one conversations, genuine recommendations.",
  },
  {
    title: "Earn",
    description: "When your referral completes a Lab and clears the 45-day hold period, you get paid. Monthly payouts via ApplePay, Zelle, or Wire.",
  },
];

const commissions = [
  { lab: "AssetsLab", price: "$1,500", standard: "$150", first: "$300" },
  { lab: "BrandLab", price: "$3,500", standard: "$350", first: "$700" },
  { lab: "SiteLab", price: "$3,500", standard: "$350", first: "$700" },
  { lab: "VideoSalesLab", price: "$10,000", standard: "$1,000", first: "$2,000" },
  { lab: "ExpansionLab", price: "$5,000/mo", standard: "$500/mo", first: "$1,000 first month" },
  { lab: "Full Suite", price: "$18,500", standard: "$1,850", first: "$3,700" },
];

const rules = [
  "Spam or unlawful outreach",
  "False or misleading claims",
  "Trademark bidding (paid search on PodLab)",
  "Cookie stuffing / tracking manipulation",
  "Unauthorized incentives (cash-back, rebates)",
  "Prohibited content (illegal, hateful, etc.)",
  "Confidential info leaks",
  "Failure to disclose affiliate relationship (FTC)",
];
