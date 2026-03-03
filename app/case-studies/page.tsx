import Navigation from "@/components/Navigation";
import ImageWithHover from "@/components/ImageWithHover";
import Link from "next/link";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Case Studies | Real Founders, Real Results | PodLab',
  description: '$1M–$8M founders who duplicated themselves and scaled without burning out. See how our clients turned founder dependency into evergreen sales systems.',
  openGraph: {
    title: 'Case Studies | Real Founders, Real Results | PodLab',
    description: 'See how $1M–$8M founders duplicated themselves and scaled.',
    url: 'https://podlablv.com/case-studies',
  },
  twitter: {
    title: 'Case Studies | Real Founders, Real Results',
    description: 'See how $1M–$8M founders duplicated themselves and scaled.',
  },
};

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-black to-bg-secondary">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-7xl md:text-8xl font-black mb-8 leading-[0.95] tracking-tight">
            <span className="bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">Real</span> Founders. <span className="text-accent drop-shadow-[0_0_25px_rgba(57,255,20,0.5)]">Real Results.</span>
          </h1>
          <p className="text-2xl md:text-3xl text-text-secondary font-light leading-relaxed">
            <span className="text-accent font-bold">$1M–$8M founders</span> who duplicated themselves and <span className="text-white font-semibold">scaled without burning out</span>.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="group text-center bg-bg-tertiary border border-border rounded-xl p-6 hover:border-accent hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(57,255,20,0.2)] transition-all duration-350 cursor-pointer">
              <div className="text-4xl font-bold text-accent mb-2 group-hover:scale-110 transition-transform">{stat.value}</div>
              <div className="text-sm text-text-secondary group-hover:text-accent transition-colors uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Insider Award */}
      <section className="pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <a 
            href="https://theinsiderweekly.com/podlab-best-business-growth-solution/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block group"
          >
            <ImageWithHover
              src="/insider-logo.png"
              alt="Insider Best of 2025"
              width={480}
              height={480}
              className="mx-auto mb-6 group-hover:scale-110 transition-transform duration-350"
            />
            <div className="inline-flex items-center gap-2 text-accent font-semibold group-hover:text-accent-hover transition-colors">
              <span>Read the Full Article</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        </div>
      </section>

      {/* Case Studies */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto space-y-32">
          {caseStudies.map((study, index) => (
            <div key={study.name}>
              {/* Header */}
              <div className="mb-12">
                <div className="grid md:grid-cols-[200px_1fr] gap-8 items-start">
                  {index === 0 && (
                    <div>
                      <ImageWithHover
                        src="/case-studies/website-austin-casestudy.png"
                        alt={study.name}
                        width={200}
                        height={200}
                        className="rounded-xl shadow-lg"
                      />
                    </div>
                  )}
                  <div className={index === 0 ? "" : "md:col-span-2"}>
                    <div className="inline-block px-4 py-1.5 bg-accent/10 border border-accent text-accent text-sm font-semibold rounded-full mb-4">
                      {study.industry}
                    </div>
                    <h2 className="text-5xl font-bold mb-4">{study.name}</h2>
                    <div className="flex items-center gap-6 text-text-secondary">
                      <span>Role: {study.role}</span>
                      <span>•</span>
                      <span>{study.company}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Journey */}
              <div className="group bg-bg-tertiary border border-border rounded-xl p-8 mb-12 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.2)] transition-all duration-350 cursor-pointer">
                <div className="text-sm font-semibold text-accent mb-4">Revenue Journey</div>
                <div className="text-4xl font-bold mb-2 group-hover:scale-105 transition-transform">
                  {study.revenueBefore} → <span className="text-accent">{study.revenueAfter}</span>
                </div>
                <div className="text-lg text-text-secondary group-hover:text-text-primary transition-colors">{study.growth} growth</div>
              </div>

              {/* Story */}
              {/* Glassy Container for Case Study Story */}
              <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-border/30">
                <div className="prose prose-invert max-w-none">
                  <h3 className="text-2xl font-bold mb-4">The Problem</h3>
                <p className="text-text-secondary text-lg mb-8 leading-relaxed">
                  {study.problem}
                </p>

                <h3 className="text-2xl font-bold mb-4">The Solution</h3>
                <p className="text-text-secondary text-lg mb-6 leading-relaxed">
                  {study.solution}
                </p>
                <div className="grid md:grid-cols-5 gap-4 mb-8">
                  {["AssetsLab", "BrandLab", "SiteLab", "VideoSalesLab", "ExpansionLab"].map((lab) => (
                    <div key={lab} className="px-4 py-2 bg-accent/10 border border-accent text-accent text-center text-sm font-semibold rounded-lg">
                      {lab}
                    </div>
                  ))}
                </div>

                <h3 className="text-2xl font-bold mb-4">The Results</h3>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {study.results.map((result) => (
                    <div key={result} className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-accent mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-text-secondary">{result}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-bg-secondary/50 border-l-4 border-accent/50 p-6 rounded-r-lg">
                  <p className="text-lg italic text-text-primary mb-4">"{study.quote}"</p>
                  <p className="text-text-secondary">— {study.name}, {study.role}</p>
                </div>
                </div>
              </div>

              {/* ROI */}
              <div className="mt-12 grid md:grid-cols-3 gap-6">
                <div className="group bg-bg-tertiary border border-border rounded-xl p-6 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.15)] transition-all duration-350 cursor-pointer">
                  <div className="text-sm text-text-secondary mb-2 group-hover:text-accent transition-colors">Investment</div>
                  <div className="text-2xl font-bold group-hover:scale-105 transition-transform">{study.investment}</div>
                </div>
                <div className="group bg-bg-tertiary border border-border rounded-xl p-6 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.15)] transition-all duration-350 cursor-pointer">
                  <div className="text-sm text-text-secondary mb-2 group-hover:text-accent transition-colors">Payback Period</div>
                  <div className="text-2xl font-bold text-accent group-hover:scale-105 transition-transform">{study.payback}</div>
                </div>
                <div className="group bg-bg-tertiary border border-border rounded-xl p-6 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.15)] transition-all duration-350 cursor-pointer">
                  <div className="text-sm text-text-secondary mb-2 group-hover:text-accent transition-colors">Net ROI</div>
                  <div className="text-2xl font-bold text-accent group-hover:scale-105 transition-transform">{study.roi}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-bg-secondary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">Want These Results for Your Business?</h2>
          <p className="text-xl text-text-secondary mb-12">
            Book a strategy call. We'll assess your bottleneck, map your path, and show you exactly what's possible.
          </p>
          <a
            href="https://calendly.com/podlablv/strategy-call"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-block px-12 py-5 bg-accent text-black text-lg font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(57,255,20,0.4)] transition-all relative overflow-hidden"
          >
            <span className="relative z-10">Schedule Clarity →</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
          </a>
        </div>
      </section>
    </div>
  );
}

const stats = [
  { value: "200+", label: "Founders Duplicated" },
  { value: "10-20hrs", label: "Time Saved/Week" },
  { value: "20-30%", label: "Close Rate Increase" },
  { value: "6-12mo", label: "Content Generated" },
  { value: "30-60d", label: "ROI Payback" },
  { value: "$150K", label: "Studio Investment" },
];

const caseStudies = [
  {
    name: "Austin Reinders",
    role: "CEO",
    company: "Simonian Rugs",
    industry: "Rug Cleaning & Manufacturing",
    revenueBefore: "$750K",
    revenueAfter: "$4.72M",
    growth: "155%",
    problem: "For 70 years, Simonian served the Bay Area through word-of-mouth. Revenue plateaued at $750K. Austin was the bottleneck — every sale required him personally. The business could not scale if he was the only person who could close.",
    solution: "Took Simonian through all 5 Labs over 6 months. Clarified positioning, built professional brand, launched conversion-optimized website, filmed strategic video assets, then scaled with ExpansionLab campaigns.",
    results: [
      "Revenue: $750K → $4.72M (155% growth)",
      "Sales calls: 25hrs/week → 10hrs/week (60% reduction)",
      "Lead gen: 3-4/week → 7-8/day",
      "Close rate: 4X improvement",
      "Launched Woolle ($100K month 1)",
      "Manufacturing expansion ($2M+ Aug 2026)",
    ],
    quote: "PodLab did not just give us marketing. They gave us infrastructure. I am not the product anymore. I am the CEO.",
    investment: "$18.5K + $5K/mo",
    payback: "6 weeks",
    roi: "15,400%",
  },
  {
    name: "David",
    role: "Founder",
    company: "Business Funding Company",
    industry: "Business Funding & Capital",
    revenueBefore: "$750K",
    revenueAfter: "$2.3M",
    growth: "207%",
    problem: "Generic brand, weak website, sales process relied entirely on David's personal credibility. Lead generation inconsistent (referrals only). Revenue stuck at $750K for 2+ years.",
    solution: "Went lab-by-lab monthly (de-risked payment model). Built clarity, professional brand, conversion website, strategic video assets, then scaled with targeted campaigns.",
    results: [
      "Revenue: $750K → $2.3M (207% growth)",
      "Lead gen: 100% referrals → 50% inbound",
      "Sales cycle: 4-6 weeks → 10-14 days",
      "Close rate: 22% → 41%",
      "Cost per lead: -40%",
      "Time per deal: -50%",
    ],
    quote: "I went lab-by-lab because I wanted to see results before committing. Best decision I made. I paid monthly and saw ROI from each phase before moving to the next.",
    investment: "$11.5K (4 months)",
    payback: "2 months",
    roi: "13,300%",
  },
  {
    name: "Custom Specialties Group",
    role: "Ownership Team",
    company: "CSG",
    industry: "Custom Garage Doors & Fireplaces",
    revenueBefore: "$25M",
    revenueAfter: "$28.5M",
    growth: "14%",
    problem: "Already dominant (largest in Vegas), but marketing was reactive. No digital brand presence. Founder deeply involved in sales. Competitors with weaker products but stronger brands winning premium projects.",
    solution: "Retainer model: Built foundation (all 5 Labs), then PodLab became fractional CMO + execution team. Strategy, content, campaigns — all handled monthly.",
    results: [
      "Revenue: $25M → $28.5M (14% YoY)",
      "Lead volume: +85%",
      "Founder marketing time: 15hrs/week → 2hrs/month",
      "Premium project win rate: +22%",
      "Marketing ROI: 4.2X",
      "Sales cycle: -18%",
    ],
    quote: "PodLab became our growth team. Strategy + execution, all handled. Our founder went from 15 hours a week on marketing to 2 hours a month in strategy reviews.",
    investment: "$25K + $8K/mo",
    payback: "5 weeks",
    roi: "2,900%",
  },
];
