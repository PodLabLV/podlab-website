'use client';

import Link from 'next/link';
import ImageWithHover from './ImageWithHover';
import { TiltCard } from './ui/tilt-card';
import { MessageSquare, Palette, Globe, Video, TrendingUp } from 'lucide-react';

const labs = [
  {
    name: "AssetsLab",
    slug: "/labs/assets",
    tagline: "Know exactly who you are and what you sell.",
    icon: "/labs/icons/AssetsLab-icon.png",
    description: "Clarifies your positioning with customer avatar, mission/vision, dialed-in offer, and brand voice guide.",
    outcome: "Crystal-clear messaging foundation",
    price: "$1,500",
    IconComponent: MessageSquare,
  },
  {
    name: "BrandLab",
    slug: "/labs/brand",
    tagline: "Look like the leader you already are.",
    icon: "/labs/icons/BrandLab-icon.png",
    description: "Builds complete brand identity (logo, colors, typography, guidelines) so your business looks and sounds like a market leader.",
    outcome: "Professional brand presence that matches business quality",
    price: "$3,500",
    IconComponent: Palette,
  },
  {
    name: "SiteLab",
    slug: "/labs/site",
    tagline: "Your website becomes your best salesperson.",
    icon: "/labs/icons/SiteLab-icon.png",
    description: "Designs and develops a high-converting website with strategic copy, video integration, and conversion optimization.",
    outcome: "Website that sells 24/7 without founder involvement",
    price: "$3,500+",
    IconComponent: Globe,
  },
  {
    name: "VideoSalesLab",
    slug: "/labs/video-sales",
    tagline: "Duplicate yourself in one recording session.",
    icon: "/labs/icons/VideoSalesLab-icon.png",
    description: "Produces five core strategic video assets in our $150K studio.",
    outcome: "Video suite that pre-sells prospects 24/7",
    price: "$10,000",
    IconComponent: Video,
  },
  {
    name: "ExpansionLab",
    slug: "/labs/expansion",
    tagline: "Predictable growth without founder dependency.",
    icon: "/labs/icons/ExpansionLab-icon.png",
    description: "Ongoing marketing optimization (fractional CMO + execution) to scale lead generation, content output, and campaign performance.",
    outcome: "Scalable, predictable growth on autopilot",
    price: "$5K+/month",
    IconComponent: TrendingUp,
  },
];

export default function LabsSection() {
  return (
    <section className="relative py-24 px-6 overflow-hidden bg-bg-secondary">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 opacity-20">
        <img 
          src="/labs-section-bg.png" 
          alt="Labs Background"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary/60 via-bg-secondary/70 to-bg-secondary/60"></div>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-center">The 5-Phase Growth System</h2>
        <p className="text-xl text-text-secondary mb-12 text-center">
          One system. Five phases. Complete founder duplication.
        </p>

        {/* Flask Icons Row */}
        <div className="flex justify-center items-end gap-6 md:gap-10 mb-16">
          {labs.map((lab, index) => {
            const isCenter = index === 2;
            return (
              <Link
                key={lab.name}
                href={lab.slug}
                className="group flex flex-col items-center gap-3 transition-all duration-300 hover:-translate-y-2"
              >
                <div className={`relative ${isCenter ? 'w-24 h-24 md:w-28 md:h-28' : 'w-16 h-16 md:w-20 md:h-20'} rounded-xl overflow-hidden border border-[#2ADD1B]/30 group-hover:border-[#2ADD1B] group-hover:shadow-[0_0_30px_rgba(42,221,27,0.3)] transition-all duration-300`}>
                  <img
                    src={lab.icon}
                    alt={lab.name}
                    className="w-full h-full object-contain p-2 opacity-70 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <span className={`text-xs md:text-sm font-semibold text-text-secondary group-hover:text-accent transition-colors ${isCenter ? 'text-accent' : ''}`}>
                  {lab.name}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="text-center mb-16">
          <Link
            href="/labs/assets"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all"
          >
            Start with AssetsLab →
          </Link>
        </div>

        <div className="space-y-12">
          {labs.map((lab, index) => {
            const Icon = lab.IconComponent;
            return (
              <Link key={lab.name} href={lab.slug} className="block">
                <TiltCard tiltAmount={12} glareEnabled={true} gyroscopeEnabled={true} className="h-full">
                  <div className="group relative bg-bg-tertiary border border-border rounded-xl p-8 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-350 cursor-pointer">
                    {/* Green glow on hover */}
                    <div className="absolute inset-0 bg-[#2ADD1B]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none z-10" />
                    
                    <div className="flex items-start gap-6 relative z-20">
                      <div className="flex-shrink-0 relative">
                        {/* Icon container with green glow */}
                        <div className="relative w-20 h-20 flex items-center justify-center bg-[#2ADD1B]/10 rounded-xl border border-[#2ADD1B]/30 group-hover:border-[#2ADD1B] transition-all duration-350">
                          <Icon className="w-10 h-10 text-[#2ADD1B]" />
                        </div>
                        <ImageWithHover
                          src={lab.icon}
                          alt={lab.name}
                          width={80}
                          height={80}
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-350"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-accent font-semibold mb-2 uppercase tracking-wider">PHASE {index + 1}</div>
                        <h3 className="text-3xl font-bold mb-2 group-hover:text-accent transition-colors">{lab.name}</h3>
                        <p className="text-accent font-semibold mb-4">{lab.tagline}</p>
                        <p className="text-text-secondary mb-4 leading-relaxed">{lab.description}</p>
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border group-hover:border-accent transition-colors">
                          <span className="text-2xl font-bold text-accent">{lab.price}</span>
                          <span className="text-sm text-text-tertiary group-hover:text-accent transition-colors">{lab.outcome} →</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </Link>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-block bg-bg-tertiary border border-accent rounded-xl p-8 mb-8">
            <p className="text-lg text-text-secondary mb-2">
              <span className="font-bold text-text-primary">Full Suite Value:</span> $40,000+ perceived value
            </p>
            <p className="text-2xl font-bold text-accent mb-2">Actual Price: $18,500</p>
            <p className="text-sm text-text-secondary">(Labs 1-4 bundled)</p>
            <p className="text-sm text-accent mt-4">ROI Payback: 30-60 days (typical)</p>
          </div>
          <br />
          <Link
            href="/contact"
            className="inline-block px-12 py-5 bg-accent text-black text-lg font-bold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1"
          >
            Start with AssetsLab →
          </Link>
        </div>
      </div>
    </section>
  );
}
