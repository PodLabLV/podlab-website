import Navigation from "@/components/Navigation";
import HomePageWrapper from "@/components/HomePageWrapper";
import Link from "next/link";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Case Studies',
  description: 'See how PodLab helps $1M–$8M service-based founders eliminate founder dependency and scale through strategic video assets.',
  openGraph: {
    title: 'Case Studies — Real Results',
    description: 'See how PodLab helps $1M–$8M service-based founders eliminate founder dependency and scale through strategic video assets.',
    url: 'https://podlablv.com/case-studies',
    images: [{ url: 'https://podlablv.com/podlab-og.png', width: 1366, height: 768, alt: 'PodLab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Case Studies — Real Results',
    description: 'See how PodLab helps $1M–$8M service-based founders eliminate founder dependency and scale through strategic video assets.',
    images: ['https://podlablv.com/podlab-og.png'],
  },
};

export default function CaseStudiesPage() {
  return (
    <HomePageWrapper>
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-black mb-6 leading-[0.95] tracking-tight">
            Real Founders. <span className="text-accent">Real Results.</span>
          </h1>
          <p className="text-xl text-text-secondary font-light leading-relaxed max-w-3xl mx-auto">
            <span className="text-accent font-bold">$1M–$8M founders</span> who duplicated themselves and scaled without burning out.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card p-5 text-center group hover:border-accent/30 transition-all">
              <div className="text-3xl font-bold text-accent mb-1 group-hover:scale-110 transition-transform">{stat.value}</div>
              <div className="text-xs text-text-secondary uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Case Studies */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto space-y-16">
          {caseStudies.map((study) => (
            <div key={study.name} className="glass-card p-8 md:p-12">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-accent font-semibold uppercase tracking-wider px-2 py-1 border border-accent/30 rounded">{study.industry}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">{study.name}</h2>
              <p className="text-text-secondary mb-4">{study.role} · {study.company}</p>

              {/* Objection callout — speaks directly to the skeptic */}
              {study.objection && (
                <div className="glass-card p-5 mb-8 border-red-500/20 bg-red-500/5">
                  <p className="text-sm text-text-secondary uppercase tracking-wider mb-1">Sound Familiar?</p>
                  <p className="text-lg text-white italic">{study.objection}</p>
                </div>
              )}

              {/* Revenue Journey */}
              <div className="glass-card p-6 mb-8 border-accent/20">
                <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Revenue Journey</div>
                <div className="text-3xl font-bold">
                  {study.revenueBefore} → <span className="text-accent">{study.revenueAfter}</span>
                </div>
                <div className="text-text-secondary mt-1">{study.growth} growth</div>
              </div>

              {/* Problem */}
              <h3 className="text-xl font-bold text-white mb-3">The Problem</h3>
              <p className="text-text-secondary leading-relaxed mb-8">{study.problem}</p>

              {/* Solution */}
              <h3 className="text-xl font-bold text-white mb-3">The Solution</h3>
              <p className="text-text-secondary leading-relaxed mb-4">{study.solution}</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {study.labs.map((lab) => (
                  <span key={lab} className="px-3 py-1 text-xs text-accent bg-accent/10 border border-accent/20 rounded-full font-semibold">{lab}</span>
                ))}
              </div>

              {/* Results */}
              <h3 className="text-xl font-bold text-white mb-4">The Results</h3>
              <div className="grid md:grid-cols-2 gap-3 mb-8">
                {study.results.map((result) => (
                  <div key={result} className="flex items-start gap-2">
                    <span className="text-accent flex-shrink-0">✓</span>
                    <span className="text-sm text-text-secondary">{result}</span>
                  </div>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="border-l-4 border-accent pl-6 py-3 mb-8">
                <p className="text-lg italic text-white mb-2">"{study.quote}"</p>
                <cite className="text-accent text-sm font-semibold not-italic">— {study.name}, {study.role}</cite>
              </blockquote>

              {/* ROI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-4 text-center">
                  <div className="text-xs text-text-secondary mb-1">Investment</div>
                  <div className="text-lg font-bold">{study.investment}</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-xs text-text-secondary mb-1">Payback</div>
                  <div className="text-lg font-bold text-accent">{study.payback}</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-xs text-text-secondary mb-1">Net ROI</div>
                  <div className="text-lg font-bold text-accent">{study.roi}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Video Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            Hear It From <span className="text-accent">Them</span>
          </h2>
          <p className="text-xl text-text-secondary mb-16 text-center">
            Real founders sharing their experience working with PodLab.
          </p>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="group">
              <div className="border border-[#2E2E2E] rounded-xl overflow-hidden hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(42,221,27,0.2)] transition-all duration-350">
                <video
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full aspect-[9/16]"
                >
                  <source src="/videos/bridgett-tebow-testimonial.mp4" type="video/mp4" />
                </video>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-accent transition-colors">Bridgett Tebow</h3>
                  <p className="text-accent font-semibold mb-2">Founder</p>
                </div>
              </div>
            </div>

            <div className="group">
              <div className="border border-[#2E2E2E] rounded-xl overflow-hidden hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(42,221,27,0.2)] transition-all duration-350">
                <video
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full aspect-[9/16]"
                >
                  <source src="/videos/kevin-testimonial.mp4" type="video/mp4" />
                </video>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-accent transition-colors">Kevin</h3>
                  <p className="text-accent font-semibold mb-2">Founder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center glass-card p-6 md:p-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Want These Results for Your Business?</h2>
          <p className="text-xl text-text-secondary mb-8">
            Book a strategy call. We'll assess your bottleneck, map your path, and show you exactly what's possible.
          </p>
          <a
            href="https://calendly.com/podlablv/strategy-call"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-block px-12 py-5 bg-accent text-black text-lg font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(42,221,27,0.4)] transition-all"
          >
            Schedule Clarity →
          </a>
        </div>
      </section>
    </div>
    </HomePageWrapper>
  );
}

const stats = [
  { value: "50+", label: "Founders Served" },
  { value: "8-12hrs", label: "Saved/Week" },
  { value: "15-25%", label: "Close Rate ↑" },
  { value: "3-6mo", label: "Content Created" },
  { value: "60-90d", label: "ROI Payback" },
  { value: "5", label: "Labs Built" },
];

type CaseStudy = {
  name: string;
  role: string;
  company: string;
  industry: string;
  revenueBefore: string;
  revenueAfter: string;
  growth: string;
  problem: string;
  solution: string;
  labs: string[];
  results: string[];
  quote: string;
  investment: string;
  payback: string;
  roi: string;
  objection?: string;
};

const caseStudies: CaseStudy[] = [
  {
    name: "Home Services Client",
    role: "CEO",
    company: "Legacy Service Brand",
    industry: "Home Services",
    revenueBefore: "$1.2M",
    revenueAfter: "$1.9M",
    growth: "58%",
    problem: "A well-known local brand built on decades of word-of-mouth. Revenue had plateaued. The CEO was the bottleneck — every sale required him personally. The business couldn't scale if he was the only person who could close.",
    solution: "Complete 5-Lab build over 6 months. Clarified positioning, built professional brand identity, launched conversion-optimized website, filmed strategic video assets, then scaled with ongoing campaigns.",
    labs: ["AssetsLab", "BrandLab", "SiteLab", "VideoSalesLab", "ExpansionLab"],
    results: [
      "Revenue grew 58% in 8 months",
      "Sales time cut from 20hrs/week to 10hrs/week",
      "Inbound leads doubled within 90 days",
      "Close rate improved by 35%",
      "Launched a second service line",
      "Booked 3 months ahead for the first time",
    ],
    quote: "They didn't just give us marketing. They gave us infrastructure. I'm not the product anymore. I'm the CEO.",
    investment: "$18.5K + $5K/mo",
    payback: "90 days",
    roi: "340%",
  },
  {
    name: "Financial Services Client",
    role: "Founder",
    company: "Funding & Capital Advisory",
    industry: "Financial Services",
    revenueBefore: "$800K",
    revenueAfter: "$1.4M",
    growth: "75%",
    problem: "Generic brand, weak website, sales process relied entirely on the founder's personal credibility. Lead generation was 100% referrals. Revenue stuck under $1M for 2+ years with no clear path to scale.",
    solution: "Lab-by-lab monthly build (de-risked payment model). Each month delivered a complete phase — clarity, brand, website, video assets — with visible ROI before committing to the next.",
    labs: ["AssetsLab", "BrandLab", "SiteLab", "VideoSalesLab"],
    results: [
      "Revenue grew 75% within 6 months",
      "Lead source shifted from 100% referrals to 40% inbound",
      "Sales cycle shortened from 4-6 weeks to 2-3 weeks",
      "Close rate improved from 22% to 34%",
      "Cost per qualified lead dropped 30%",
      "Founder reclaimed 8 hours/week",
    ],
    quote: "I went lab-by-lab because I wanted to see results before committing. Best decision I made. I saw ROI from each phase before moving to the next.",
    investment: "$11.5K (4 months)",
    payback: "3 months",
    roi: "280%",
  },
  {
    name: "Custom Manufacturing Client",
    role: "Ownership Team",
    company: "Premium Home Products",
    industry: "Manufacturing & Installation",
    revenueBefore: "$3.2M",
    revenueAfter: "$4.1M",
    growth: "28%",
    problem: "Strong reputation but marketing was purely reactive. No digital brand presence. Founders deeply involved in sales. Competitors with weaker products but stronger online brands were winning premium projects.",
    solution: "Retainer model: Built the full foundation (all 5 Labs), then PodLab became their fractional growth team. Strategy, content, and campaigns — all handled monthly.",
    labs: ["AssetsLab", "BrandLab", "SiteLab", "VideoSalesLab", "ExpansionLab"],
    results: [
      "Revenue grew 28% year-over-year",
      "Lead volume increased 45%",
      "Founder marketing time: 15hrs/week → 3hrs/week",
      "Premium project win rate up 18%",
      "Marketing ROI: 3.2X",
      "Sales cycle shortened by 2 weeks",
    ],
    quote: "PodLab became our growth team. Strategy plus execution, all handled. We went from 15 hours a week on marketing to a few hours reviewing reports.",
    investment: "$25K + $5K/mo",
    payback: "4 months",
    roi: "220%",
  },
  {
    name: "Consulting Firm Client",
    role: "Managing Partner",
    company: "Strategy & Operations Consultancy",
    industry: "Professional Services",
    revenueBefore: "$1.8M",
    revenueAfter: "$2.6M",
    growth: "44%",
    objection: "\"We've spent $40K on marketing agencies before. Nothing moved the needle.\"",
    problem: "Two failed agency relationships in 18 months. Spent $40K combined on social media management and a rebrand that looked nice but generated zero leads. The managing partner was skeptical of any marketing investment. Every new client still came through personal referrals or speaking engagements — which meant growth was capped at however many stages he could stand on.",
    solution: "Started with AssetsLab only — $1,500 to diagnose and map the real problem. No big commitment. The diagnostic revealed the issue wasn't awareness, it was trust. Prospects were finding them online but had nothing to watch, read, or verify before booking a call. Built video assets that let prospects pre-qualify themselves. By month 3, he greenlit the full build.",
    labs: ["AssetsLab", "VideoSalesLab", "SiteLab", "ExpansionLab"],
    results: [
      "Revenue grew 44% within 10 months",
      "Inbound leads went from 0 to 30% of pipeline",
      "Average deal size increased 22% (better-qualified prospects)",
      "Sales calls shortened from 60 min to 35 min",
      "Founder speaking gigs still drove leads — now they converted faster",
      "Hired first salesperson (finally had a process to hand off)",
    ],
    quote: "I'd been burned twice. I told them I wasn't spending another dollar on marketing that doesn't sell. They said 'good — neither are we.' That's when I knew this was different.",
    investment: "$15K (phased over 5 months)",
    payback: "4 months",
    roi: "310%",
  },
  {
    name: "Med Spa & Wellness Client",
    role: "Founder & Medical Director",
    company: "Aesthetic & Wellness Practice",
    industry: "Health & Wellness",
    revenueBefore: "$2.1M",
    revenueAfter: "$3.0M",
    growth: "43%",
    objection: "\"I literally do not have time for this. I'm seeing patients 6 days a week.\"",
    problem: "Booked solid — 50+ patients a week, 6 days in the office. Revenue was strong but entirely dependent on the founder being in the room. No associate could close at her rate. Marketing was Instagram posts her office manager threw together between appointments. She wanted to grow but had zero hours to give to a marketing project.",
    solution: "Designed the entire process around her schedule. One half-day in our studio — 4 hours total. Pre-scripted everything so she walked in, delivered her expertise on camera, and walked out. No homework. No content calendar to manage. Our labs handled everything from there.",
    labs: ["AssetsLab", "BrandLab", "VideoSalesLab", "ExpansionLab"],
    results: [
      "Revenue grew 43% in 9 months",
      "New patient inquiries up 60%",
      "Consultation no-show rate dropped 40% (video pre-education)",
      "Average treatment package value increased 28%",
      "Hired a second provider — video assets trained patients to trust the brand, not just her",
      "Total founder time invested: 4 hours in studio + 1 hour monthly review",
    ],
    quote: "Four hours. That's all they needed from me. Everything else — the brand, the videos, the website, the campaigns — they handled. I just kept seeing patients. Revenue went up anyway.",
    investment: "$13K + $5K/mo",
    payback: "3 months",
    roi: "350%",
  },
  {
    name: "Commercial Contractor Client",
    role: "Owner",
    company: "Commercial Construction & Renovation",
    industry: "Construction",
    revenueBefore: "$4.5M",
    revenueAfter: "$5.8M",
    growth: "29%",
    objection: "\"My industry doesn't do video marketing. Our clients don't buy that way.\"",
    problem: "Been in business 12 years. All growth came from relationships, referrals, and bidding. The owner believed his industry was 'different' — that commercial clients don't watch videos or care about brands. He was losing bids to competitors with slicker proposals and stronger online presence, even though his work was better.",
    solution: "Didn't try to make him an influencer. Built authority assets — project walkthroughs, process explainers, and a client onboarding video that replaced the first 2 meetings of every engagement. Embedded video into proposals and the website. Made his expertise visible to decision-makers who'd never meet him in person.",
    labs: ["AssetsLab", "SiteLab", "VideoSalesLab"],
    results: [
      "Revenue grew 29% year-over-year",
      "Proposal win rate jumped from 1-in-5 to 1-in-3",
      "Average project value increased 18%",
      "Eliminated 2 meetings per new client (video replaced them)",
      "Recruited 3 senior hires who found the brand online",
      "Competitors started copying his approach within 6 months",
    ],
    quote: "I was wrong. I thought my clients didn't care about video. Turns out they care about trust — and video is how you build it when you're not in the room.",
    investment: "$15K (one-time build)",
    payback: "5 months",
    roi: "260%",
  },
];
