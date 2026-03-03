import Navigation from "@/components/Navigation";
import Link from "next/link";
import Image from "next/image";
import ImageWithHover from "@/components/ImageWithHover";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The 5-Phase Growth System | PodLab Services',
  description: 'AssetsLab, BrandLab, SiteLab, ContentLab, ExpansionLab. One system. Five phases. Complete founder duplication for $1M–$8M service-based businesses.',
  openGraph: {
    title: 'The 5-Phase Growth System | PodLab Services',
    description: 'Complete founder duplication system across 5 strategic phases.',
    url: 'https://podlablv.com/services',
  },
  twitter: {
    title: 'The 5-Phase Growth System | PodLab Services',
    description: 'Complete founder duplication system across 5 strategic phases.',
  },
};

export default function ServicesPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero */}
      <section className="group relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Business Growth System Background - B&W to Color on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-50">
          {/* B&W base layer */}
          <img 
            src="/business-growth-system-B&W.png" 
            alt="Business Growth System Background"
            className="w-full h-full object-cover"
          />
          {/* Color layer - fades in on group hover */}
          <img 
            src="/business-growth-system.png" 
            alt="Business Growth System Background"
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-[350ms]"
          />
        </div>
        <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <h1 className="text-7xl md:text-8xl font-black mb-8 leading-[0.95] tracking-tight">
            The <span className="inline-block bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">5-Phase</span> Growth System<br />
            <span className="text-accent drop-shadow-[0_0_25px_rgba(57,255,20,0.5)]">for $1M–$8M Founders</span>
          </h1>
          <p className="text-2xl md:text-3xl text-text-secondary mb-6 font-light leading-relaxed">
            One system. Five phases. <span className="text-white font-semibold">Complete founder duplication.</span>
          </p>
          <p className="text-xl text-text-secondary mb-16 max-w-4xl mx-auto">
            Stop being the product. Build <span className="text-accent font-bold">infrastructure that works 24/7</span> — without adding more to your plate.
          </p>
          <a
            href="https://calendly.com/podlablv/strategy-call"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-block px-16 py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(57,255,20,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
          >
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Start with AssetsLab →</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-accent-hover to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </a>

          {/* 5 Lab Icons Visual Guide */}
          <div className="mt-20 flex justify-center gap-8 flex-wrap max-w-4xl mx-auto">
            {labs.map((lab) => (
              <div key={lab.name} className="group flex flex-col items-center gap-3">
                <ImageWithHover
                  src={lab.icon}
                  alt={lab.name}
                  width={120}
                  height={120}
                  className="group-hover:scale-110 transition-transform duration-350"
                />
                <p className="text-sm font-semibold text-text-secondary group-hover:text-accent transition-colors">{lab.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Explainer Video */}
      <section className="relative py-24 px-6 bg-black overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-center">
            How the <span className="text-accent">5-Phase System</span> Works
          </h2>
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(57,255,20,0.3)]">
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/uoiT4vTh7bY?autoplay=1&mute=0&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1"
              title="PodLab 5-Phase System Explainer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </section>

      {/* Why Most Founders Stay Stuck */}
      <section className="py-24 px-6 bg-bg-secondary">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold mb-8">Why Most Founders Stay Stuck</h2>
          <div className="prose prose-invert max-w-none text-lg space-y-6">
            <p className="text-text-secondary">
              You've tried content agencies. They put you on a treadmill — ongoing production cycles, never-ending dependency, no clear finish line.
            </p>
            <p className="text-text-secondary">
              You've tried business consultants. They gave you frameworks and left you to implement alone. More work on your plate, not less.
            </p>
            <p className="text-text-secondary">
              You've tried video production houses. They filmed beautiful content that didn't convert. Pretty videos. Zero sales impact.
            </p>
            <p className="text-2xl font-bold text-accent">PodLab is different.</p>
            <p className="text-text-secondary">
              We combine <strong className="text-text-primary">strategic clarity + brand development + sales-duplicating video production</strong> in a single, phase-by-phase system.
            </p>
            <div className="bg-bg-tertiary border border-accent rounded-xl p-8 mt-8">
              <p className="font-bold text-text-primary mb-4">The result:</p>
              <p className="text-text-secondary">
                You walk in. Record once. Leave with a complete growth system that works 24/7 to attract, educate, and convert high-value clients — freeing you to lead, not sell.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Assessment CTA */}
      <section className="py-24 px-6 bg-gradient-to-b from-bg-secondary via-black to-bg-secondary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Not Sure <span className="text-accent drop-shadow-[0_0_20px_rgba(57,255,20,0.4)]">Where to Start?</span>
          </h2>
          <p className="text-xl text-text-secondary mb-12 leading-relaxed">
            Take our <span className="text-white font-semibold">5-minute Founder Bottleneck Assessment</span> to discover exactly which Lab you need first.
          </p>
          <Link
            href="/assessment"
            className="group inline-block px-16 py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(57,255,20,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
          >
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Take Assessment →</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-accent-hover to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Link>
        </div>
      </section>

      {/* Labs Detail */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-32">
          {labs.map((lab, index) => (
            <div key={lab.name} id={lab.name.toLowerCase().replace(" ", "-")}>
              <div className="grid md:grid-cols-2 gap-12 items-start">
                {/* Glassy Container for Lab Details */}
                <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-border/30">
                  <div className="text-sm font-semibold text-accent mb-2">PHASE {index + 1}</div>
                  <div className="flex items-center gap-4 mb-4">
                    <ImageWithHover
                      src={lab.icon}
                      alt={lab.name}
                      width={64}
                      height={64}
                      className="flex-shrink-0"
                    />
                    <h2 className="text-5xl font-bold">{lab.name}</h2>
                  </div>
                  <p className="text-2xl text-accent font-semibold mb-6">{lab.tagline}</p>
                  <p className="text-lg text-text-secondary mb-8">{lab.description}</p>
                  
                  <div className="bg-bg-tertiary/50 border border-border/20 rounded-xl p-6 mb-6">
                    <h3 className="font-bold text-text-primary mb-4">Deliverables:</h3>
                    <ul className="space-y-2">
                      {lab.deliverables.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <span className="text-accent">✓</span>
                          <span className="text-text-secondary">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-8">
                    <div className="text-sm text-text-secondary mb-2">Outcome</div>
                    <p className="text-lg font-semibold text-text-primary">{lab.outcome}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm text-text-secondary mb-1">Perceived Value</div>
                      <div className="text-2xl font-bold text-text-tertiary line-through">{lab.perceivedValue}</div>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary mb-1">Actual Price</div>
                      <div className="text-3xl font-bold text-accent">{lab.price}</div>
                    </div>
                  </div>
                </div>

                <div className="group bg-bg-secondary border border-border rounded-xl p-8 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.2)] transition-all duration-350 cursor-pointer">
                  <div className="mb-8 flex justify-center">
                    <ImageWithHover
                      src={lab.icon}
                      alt={lab.name}
                      width={200}
                      height={200}
                      className="group-hover:scale-110 transition-transform duration-350"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-accent transition-colors">Who It's For</h3>
                  <ul className="space-y-3 text-text-secondary">
                    {lab.whoItsFor.map((item) => (
                      <li key={item} className="group-hover:text-text-primary transition-colors">• {item}</li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className="mt-8 block text-center px-6 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(57,255,20,0.4)] transition-all"
                  >
                    Start {lab.name} →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Table */}
      <section className="py-24 px-6 bg-bg-secondary">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl font-bold mb-12 text-center">The Complete Growth System</h2>
          
          {/* Mobile: Card Layout */}
          <div className="md:hidden space-y-4 mb-8">
            {pricingData.map((item) => (
              <div key={item.lab} className={`bg-bg-tertiary border ${item.isTotal ? 'border-accent' : 'border-border'} rounded-xl p-6`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    {item.icon && <ImageWithHover src={item.icon} alt={item.lab} width={32} height={32} />}
                    <h3 className={`font-bold ${item.isTotal ? 'text-xl' : 'text-lg'}`}>{item.lab}</h3>
                  </div>
                  <div className="text-accent font-bold text-right">
                    <div className={item.isTotal ? 'text-2xl' : 'text-xl'}>{item.price}</div>
                  </div>
                </div>
                <div className="text-sm text-text-secondary line-through">{item.perceived}</div>
              </div>
            ))}
            <p className="text-center text-text-secondary mt-6">
              Plus: ExpansionLab retainer ($5K+/month) for ongoing growth
            </p>
          </div>

          {/* Desktop: Table Layout */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-6">Lab</th>
                  <th className="text-right py-4 px-6">Perceived Value</th>
                  <th className="text-right py-4 px-6">Actual Price</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <ImageWithHover src="/labs/icons/AssetsLab-icon.png" alt="AssetsLab" width={40} height={40} />
                      <span className="font-semibold">AssetsLab</span>
                    </div>
                  </td>
                  <td className="text-right py-4 px-6 text-text-secondary">$5,000+</td>
                  <td className="text-right py-4 px-6 text-accent font-bold">$1,500</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <ImageWithHover src="/labs/icons/BrandLab-icon.png" alt="BrandLab" width={40} height={40} />
                      <span className="font-semibold">BrandLab</span>
                    </div>
                  </td>
                  <td className="text-right py-4 px-6 text-text-secondary">$12,000+</td>
                  <td className="text-right py-4 px-6 text-accent font-bold">$3,500</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <ImageWithHover src="/labs/icons/SiteLab-icon.png" alt="SiteLab" width={40} height={40} />
                      <span className="font-semibold">SiteLab</span>
                    </div>
                  </td>
                  <td className="text-right py-4 px-6 text-text-secondary">$15,000+</td>
                  <td className="text-right py-4 px-6 text-accent font-bold">$3,500+</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <ImageWithHover src="/labs/icons/VideoSalesLab-icon.png" alt="VideoSalesLab" width={40} height={40} />
                      <span className="font-semibold">VideoSalesLab</span>
                    </div>
                  </td>
                  <td className="text-right py-4 px-6 text-text-secondary">$25,000+</td>
                  <td className="text-right py-4 px-6 text-accent font-bold">$10,000</td>
                </tr>
                <tr className="border-t-2 border-accent">
                  <td className="py-4 px-6 font-bold text-lg">Full Suite</td>
                  <td className="text-right py-4 px-6 text-text-secondary font-bold">$40,000+</td>
                  <td className="text-right py-4 px-6 text-accent font-bold text-2xl">$18,500</td>
                </tr>
              </tbody>
            </table>
            <p className="text-center text-text-secondary mt-8">
              Plus: ExpansionLab retainer ($5K+/month) for ongoing growth
            </p>
          </div>
        </div>
      </section>

      {/* Why Start with AssetsLab */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold mb-8">Start with Clarity. Skip the Guesswork.</h2>
          <div className="prose prose-invert max-w-none text-lg space-y-6">
            <p className="text-text-secondary">
              Most founders want to jump straight to videos or websites. We get it — you want results fast.
            </p>
            <p className="text-text-secondary">
              But here's the truth: <strong className="text-text-primary">Tactics without strategy waste time and money.</strong>
            </p>
            <p className="text-text-secondary">
              AssetsLab ensures every dollar you spend after has maximum ROI. It's the foundation that makes BrandLab, SiteLab, and VideoSalesLab 10x more effective.
            </p>
            <div className="bg-bg-tertiary border border-border rounded-xl p-8">
              <p className="font-bold text-text-primary mb-4">Think of it like this:</p>
              <ul className="space-y-3 text-text-secondary">
                <li>• Building a website without AssetsLab = guessing what to say</li>
                <li>• Filming videos without AssetsLab = talking without strategy</li>
                <li>• Running ads without AssetsLab = burning budget on the wrong message</li>
              </ul>
            </div>
            <p className="text-xl font-semibold text-text-primary">
              AssetsLab gives you the clarity to move fast — without wasting money on tactics that don't work.
            </p>
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/contact"
              className="group inline-block px-12 py-5 bg-accent text-black text-lg font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(57,255,20,0.4)] transition-all relative overflow-hidden"
            >
              <span className="relative z-10">Start with AssetsLab ($1,500) →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-bg-secondary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">Ready to Duplicate Yourself?</h2>
          <p className="text-xl text-text-secondary mb-12">
            Book a 30-minute strategy call. We'll map out your path from founder-led sales to founder-duplicated growth.
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
          <p className="mt-6 text-sm text-text-secondary">
            Zero pressure. We'll assess your business, recommend the right Lab to start, and show you exactly what to expect.
          </p>
        </div>
      </section>
    </div>
  );
}

const pricingData = [
  { lab: "AssetsLab", perceived: "$5,000+", price: "$1,500", isTotal: false, icon: "/labs/icons/AssetsLab-icon.png" },
  { lab: "BrandLab", perceived: "$12,000+", price: "$3,500", isTotal: false, icon: "/labs/icons/BrandLab-icon.png" },
  { lab: "SiteLab", perceived: "$15,000+", price: "$3,500+", isTotal: false, icon: "/labs/icons/SiteLab-icon.png" },
  { lab: "VideoSalesLab", perceived: "$25,000+", price: "$10,000", isTotal: false, icon: "/labs/icons/VideoSalesLab-icon.png" },
  { lab: "Full Suite", perceived: "$40,000+", price: "$18,500", isTotal: true, icon: null },
];

const labs = [
  {
    name: "AssetsLab",
    tagline: "Know Exactly Who You Are and What You Sell",
    icon: "/labs/icons/AssetsLab-icon.png",
    logo: "/labs/assetslab.png",
    description: "AssetsLab clarifies your positioning with customer avatar, mission/vision, dialed-in offer, customer journey map, and brand voice guide. Most founders skip this step. They jump straight to content without strategy. That's why their marketing feels random and their message gets ignored. AssetsLab fixes that.",
    deliverables: [
      "Internal DNA (living knowledge base for your team)",
      "External DNA (clarity document for vendors/partners)",
      "Hook Bank (50+ ready-to-use content angles)",
      "Content Roadmap (90-day plan with topics, formats, platforms)",
    ],
    outcome: "Crystal-clear positioning and messaging foundation",
    perceivedValue: "$5,000+",
    price: "$1,500",
    whoItsFor: [
      "Founders with unclear positioning or inconsistent messaging",
      "Businesses ready to scale but lack strategic foundation",
      "Teams producing content without clear strategy",
      "Anyone who's tried marketing tactics that didn't work",
    ],
  },
  {
    name: "BrandLab",
    tagline: "Look Like the Leader You Already Are",
    icon: "/labs/icons/BrandLab-icon.png",
    logo: "/labs/brandlab.png",
    description: "BrandLab builds your complete brand identity — logo, colors, typography, brand guidelines, and messaging templates — so your business looks and sounds like a market leader. No more amateur DIY logos or inconsistent visuals. BrandLab positions you as the category leader, even if you're not the biggest player yet.",
    deliverables: [
      "Logo & Visual Identity (primary logo, variations, usage guidelines)",
      "Brand Guidelines (colors, typography, imagery, voice & tone)",
      "Messaging Templates (email sequences, social posts, sales pitches)",
      "Brand Kit (Figma file + exports for immediate use)",
    ],
    outcome: "Professional brand presence that matches business quality",
    perceivedValue: "$12,000+",
    price: "$3,500",
    whoItsFor: [
      "Founders embarrassed by their current brand",
      "Businesses losing deals because they look less polished than competitors",
      "Teams struggling with brand consistency",
      "Anyone ready to position as a premium, category-leading brand",
    ],
  },
  {
    name: "SiteLab",
    tagline: "Your Website Becomes Your Best Salesperson",
    icon: "/labs/icons/SiteLab-icon.png",
    logo: "/labs/sitelab.png",
    description: "SiteLab designs and develops a high-converting website with strategic copy, video integration, and conversion optimization. Your website isn't a digital business card. It's your 24/7 sales team. SiteLab turns your site into a pre-selling machine that educates prospects, answers objections, and drives qualified bookings — without you touching it.",
    deliverables: [
      "Conversion-Optimized Website (designed and developed, mobile-responsive)",
      "Strategic Copy (homepage, services, about, contact, case studies)",
      "Video Integration (placements planned for VideoSalesLab videos)",
      "Analytics Setup (Google Analytics 4, heatmaps, form tracking)",
    ],
    outcome: "Website that sells 24/7 without founder involvement",
    perceivedValue: "$15,000+",
    price: "$3,500+",
    whoItsFor: [
      "Founders whose websites don't convert (high traffic, low bookings)",
      "Businesses with outdated, amateur, or generic sites",
      "Teams frustrated by websites that don't reflect business quality",
      "Anyone ready for a site that actually drives revenue",
    ],
  },
  {
    name: "VideoSalesLab",
    tagline: "Duplicate Yourself in One Recording Session",
    icon: "/labs/icons/VideoSalesLab-icon.png",
    logo: "/labs/videosaleslab.png",
    description: "VideoSalesLab produces five core strategic video assets in our $150K state-of-the-art studio — filmed in one day, working 24/7 to duplicate your best sales conversations. This isn't generic content. These are sales-duplicating assets engineered to move prospects through the entire customer journey (awareness → trust → conversion).",
    deliverables: [
      "5 Strategic Video Assets (Founder Video, Explainer, VSL, FAQ Suite, Testimonials)",
      "Custom Thumbnails (on-brand, neon green play buttons)",
      "Video Integration Plan (where they go, what they do, how to use them)",
      "6-12 Months of Content (repurpose into clips, reels, carousels)",
    ],
    outcome: "Video suite that pre-sells prospects 24/7",
    perceivedValue: "$25,000+",
    price: "$10,000",
    whoItsFor: [
      "Founders spending 20+ hours/week on sales calls",
      "Businesses with no video presence (or low-quality DIY videos)",
      "Teams ready to scale trust without scaling founder involvement",
      "Anyone who wants to duplicate their best sales moves and deploy them 24/7",
    ],
  },
  {
    name: "ExpansionLab",
    tagline: "Predictable Growth Without Founder Dependency",
    icon: "/labs/icons/ExpansionLab-icon.png",
    logo: "/labs/expansionlab.png",
    description: "ExpansionLab provides ongoing growth and marketing optimization — fractional CMO + execution — to scale lead generation, content output, and campaign performance. Think of it as your in-house growth team, without the overhead. We strategize, execute, optimize, and report — so you get predictable, scalable growth without managing another vendor or employee.",
    deliverables: [
      "Monthly Strategy Session (60-90 min, review + plan)",
      "Campaign Execution (ads, emails, landing pages, lead magnets)",
      "Content Calendar (4-8 posts/week across platforms)",
      "Performance Report (leads, bookings, revenue, ROI)",
    ],
    outcome: "Predictable, scalable growth on autopilot",
    perceivedValue: "Varies",
    price: "$5,000+/mo",
    whoItsFor: [
      "Founders who've completed AssetsLab → VideoSalesLab and want ongoing growth",
      "Businesses with inconsistent lead flow",
      "Teams without in-house marketing expertise",
      "Anyone ready to scale marketing without hiring full-time CMO or agency",
    ],
  },
];
