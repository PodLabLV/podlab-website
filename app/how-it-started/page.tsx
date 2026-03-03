import Navigation from "@/components/Navigation";
import Link from "next/link";
import ImageWithHover from "@/components/ImageWithHover";
import Image from "next/image";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Started Podcast | Real Founders, Real Stories | PodLab',
  description: '$1M+ founders share the raw truth about building a business. The failures. The pivots. The lessons learned the hard way. No fluff. Hosted by Hiram Andino.',
  openGraph: {
    title: 'How It Started Podcast | Real Founders, Real Stories',
    description: '$1M+ founders share the raw truth. No fluff.',
    url: 'https://podlablv.com/how-it-started',
  },
  twitter: {
    title: 'How It Started Podcast | Real Founders, Real Stories',
    description: '$1M+ founders share the raw truth. No fluff.',
  },
};

export default function PodcastPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-black to-bg-secondary">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-12 flex justify-center group">
            <ImageWithHover
              src="/podcast/how-it-started-logo.png"
              alt="How It Started"
              width={400}
              height={133}
              className="opacity-90 group-hover:opacity-100 transition-opacity"
            />
          </div>
          <h1 className="text-7xl md:text-8xl font-black mb-8 leading-[0.95] tracking-tight">
            <span className="bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">Real</span> Founders.<br />
            Real Stories.<br />
            <span className="text-accent drop-shadow-[0_0_25px_rgba(57,255,20,0.5)]">No Fluff.</span>
          </h1>
          <p className="text-2xl md:text-3xl text-text-secondary mb-16 max-w-4xl mx-auto font-light leading-relaxed">
            <span className="text-white font-semibold">How It Started</span> is where <span className="text-accent font-bold">$1M+ founders</span> share the raw truth about building a business.
            The failures. The pivots. The lessons learned the hard way.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a
              href="https://calendly.com/podlablv/podcast-recording"
              target="_blank"
              rel="noopener noreferrer"
              className="group px-16 py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(57,255,20,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
            >
              <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Be a Guest →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-accent-hover to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </a>
            <a
              href="#listen"
              className="px-8 py-4 border border-border text-text-primary font-medium rounded-lg hover:border-accent hover:text-accent transition-all"
            >
              Listen Now
            </a>
          </div>
        </div>
      </section>

      {/* What This Is */}
      <section className="py-24 px-6 bg-bg-secondary">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">Not Another Business Podcast</h2>
          <div className="prose prose-invert max-w-none text-lg space-y-6">
            <p className="text-text-secondary">
              Most business podcasts sound the same. Polished stories. Highlight reels. "Here's what I did right" without the context of what went wrong first.
            </p>
            <p className="text-xl font-semibold text-text-primary">
              How It Started is different.
            </p>
            <div className="grid md:grid-cols-2 gap-8 mt-8">
              <div>
                <h3 className="text-xl font-semibold mb-3">We Talk About:</h3>
                <ul className="space-y-2 text-text-secondary">
                  <li>• The origin story — How you got here</li>
                  <li>• The turning points — Decisions that shaped everything</li>
                  <li>• The systems you built — What actually works</li>
                  <li>• The lessons you'd share — What you'd tell yourself 5 years ago</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">Format:</h3>
                <ul className="space-y-2 text-text-secondary">
                  <li>• 45-60 minutes</li>
                  <li>• Conversational, not scripted</li>
                  <li>• In-studio (Vegas) or remote</li>
                  <li>• Raw, honest, real</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Host */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Hosted by Hiram Andino</h2>
          
          <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
            <div className="group">
              <div className="overflow-hidden rounded-xl border border-border group-hover:border-accent transition-all duration-350 h-[600px]">
                <ImageWithHover
                  src="/podcast/Afgan-squad-pic.png"
                  alt="Hiram Andino - Afghanistan"
                  width={1200}
                  height={800}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-text-tertiary text-center mt-3">Combat Army Veteran - Afghanistan Deployment</p>
            </div>
            <div className="group">
              <div className="overflow-hidden rounded-xl border border-border group-hover:border-accent transition-all duration-350 h-[600px]">
                <ImageWithHover
                  src="/podcast/early-days.png"
                  alt="Hiram Andino - Early Days"
                  width={1200}
                  height={800}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-text-tertiary text-center mt-3">Early Days - Building PodLab</p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto prose prose-invert">
            <p className="text-lg text-text-secondary mb-6">
              Hiram Andino didn't start as an entrepreneur. He started as a combat Army veteran who brought military systems thinking into the business world.
            </p>
            <p className="text-xl font-semibold text-text-primary text-center mb-12">
              "Most founders hit the same walls. The only difference is how fast they recognize the pattern and build the system to break through."
            </p>
          </div>
        </div>
      </section>

      {/* The Journey - Timeline */}
      <section className="py-24 px-6 bg-bg-secondary">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">The Journey</h2>
          <p className="text-xl text-text-secondary text-center mb-16">
            From humble beginnings to helping $1M+ founders duplicate themselves
          </p>

          <div className="space-y-8">
            {timeline.map((milestone, index) => (
              <div key={index} className="group flex gap-8 items-start">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-accent group-hover:scale-150 transition-transform"></div>
                  {index !== timeline.length - 1 && (
                    <div className="w-0.5 h-full min-h-[80px] bg-border group-hover:bg-accent transition-colors"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div className="bg-bg-tertiary border border-border rounded-xl p-6 group-hover:border-accent group-hover:-translate-y-1 group-hover:shadow-[0_8px_24px_rgba(57,255,20,0.2)] transition-all duration-350">
                    <div className="text-sm text-accent font-semibold mb-2">{milestone.phase}</div>
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">{milestone.title}</h3>
                    <p className="text-text-secondary">{milestone.description}</p>
                    {milestone.highlight && (
                      <p className="mt-4 text-accent font-semibold">→ {milestone.highlight}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* The Breakthrough */}
          <div className="mt-20 bg-gradient-to-br from-bg-tertiary to-bg-secondary border-2 border-accent rounded-2xl p-12 text-center">
            <div className="text-accent text-sm font-bold uppercase tracking-wider mb-4">The Breakthrough</div>
            <h3 className="text-4xl font-bold mb-6">The Founder Duplication System</h3>
            <div className="max-w-3xl mx-auto space-y-4 text-lg text-text-secondary">
              <p>
                "I was stuck. Revenue depended on me being in every sales call. My brand didn't match my business quality. I was spending 20+ hours a week explaining the same thing to different prospects."
              </p>
              <p className="text-xl font-semibold text-accent">
                So I duplicated myself into strategic 4K videos that sell 24/7.
              </p>
              <p>
                Built systems to make delivery easy. Built systems to get paid. Removed myself as the bottleneck.
              </p>
              <p className="text-2xl font-bold text-text-primary mt-6">
                Now I help other founders do the same.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Listen */}
      <section id="listen" className="py-24 px-6 bg-bg-secondary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-12">Listen to How It Started</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {platforms.map((platform) => (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-8 bg-bg-tertiary border border-border rounded-xl hover:border-accent transition-all group"
              >
                <div className="text-5xl mb-4">{platform.icon}</div>
                <div className="font-semibold mb-2">{platform.name}</div>
                <div className="text-sm text-text-secondary">{platform.description}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Be a Guest */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">Want to Share Your Story?</h2>
          <p className="text-xl text-text-secondary mb-12">
            If you're a $1M+ founder with a story worth telling, we want to hear it.
          </p>
          <a
            href="https://calendly.com/podlablv/podcast-recording"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-block px-12 py-5 bg-accent text-black text-lg font-bold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.4)] relative overflow-hidden"
          >
            <span className="relative z-10">Book Pre-Interview Call →</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
          </a>
        </div>
      </section>
    </div>
  );
}

const timeline = [
  {
    phase: "Origins",
    title: "New Jersey → Las Vegas",
    description: "From humble beginnings in NJ to making the move to Las Vegas. High school, early years, building the foundation.",
  },
  {
    phase: "Military",
    title: "Combat Army Veteran",
    description: "Joined the military, deployed to Afghanistan. Leadership under pressure. Systems thinking forged in combat.",
    highlight: "Where systems thinking was born",
  },
  {
    phase: "Corporate Rise",
    title: "Sales → GSM → Corporate Director",
    description: "Started in sales at the world's most famous dealership. Promoted to General Sales Manager in just 6 years. Then Corporate Director for entire dealership group — hiring, onboarding, training all positions, customer service.",
    highlight: "Built scalable systems across an entire organization",
  },
  {
    phase: "The First Attempt",
    title: "Opened PodLab → Failed",
    description: "Launched PodLab. It didn't work. Hard lessons learned about positioning, systems, and founder dependency.",
    highlight: "Failure as teacher",
  },
  {
    phase: "Proof of Concept",
    title: "Cardone Ventures - #1 Hire",
    description: "Joined Cardone Ventures as #1 hire for event sales and business development. 6 months of high-performance validation.",
    highlight: "Proved the model worked at scale",
  },
  {
    phase: "The Relaunch",
    title: "PodLab v2 - Armed with Lessons",
    description: "Relaunched PodLab with clarity on positioning, systems, and delivery. The grind to $1M. Got beat up on the way. Paid the price.",
  },
  {
    phase: "The Breakthrough",
    title: "Duplicated Myself into Strategic Videos",
    description: "Created 4K strategic video assets that sell 24/7. Built systems to make delivery easy. Built systems to get paid. Removed myself as the bottleneck.",
    highlight: "Record once, sell forever",
  },
  {
    phase: "Today",
    title: "Helping Founders Duplicate Themselves",
    description: "PodLab exists to help $1M-$8M founders duplicate their best sales conversations into strategic video assets. Remove founder dependency. Scale without adding complexity.",
    highlight: "Turning the lesson into a movement",
  },
  {
    phase: "The Podcast",
    title: "How It Started",
    description: "A podcast for entrepreneurs to learn from $1M+ founders who built real systems. The journey. The failures. The breakthroughs. No fluff, just truth.",
    highlight: "Real founders. Real systems. Real results.",
  },
];

const platforms = [
  {
    name: "YouTube",
    icon: "📺",
    description: "Watch full episodes",
    url: "#",
  },
  {
    name: "Spotify",
    icon: "🎵",
    description: "Listen on the go",
    url: "#",
  },
  {
    name: "Apple Podcasts",
    icon: "🎙️",
    description: "All Apple devices",
    url: "#",
  },
];
