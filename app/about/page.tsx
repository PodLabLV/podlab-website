import Navigation from "@/components/Navigation";
import Link from "next/link";
import ImageWithHover from "@/components/ImageWithHover";
import FadeIn from "@/components/FadeIn";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About PodLab | Built by a Founder, For Founders',
  description: 'Meet Hiram Andino. Combat vet. Former corporate director. Failed once. Rebuilt with systems. Now helping $1M–$8M founders break through the bottleneck.',
  openGraph: {
    title: 'About PodLab | Built by a Founder, For Founders',
    description: 'Meet Hiram Andino. Combat vet turned founder duplication expert.',
    url: 'https://podlablv.com/about',
  },
  twitter: {
    title: 'About PodLab | Built by a Founder, For Founders',
    description: 'Meet Hiram Andino. Combat vet turned founder duplication expert.',
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Background Wrapper with B&W → Color Hover */}
      <div className="group relative">
        {/* Founder Bottleneck Assessment Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-350">
            <img 
              src="/founder-bottleneck-assessment-logo.png" 
              alt="Founder Bottleneck Assessment"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 opacity-20 group-hover:opacity-0 transition-opacity duration-350">
            <img 
              src="/founder-bottleneck-assessment-logo-B&W.png" 
              alt="Founder Bottleneck Assessment"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-bg-secondary/70 to-bg-secondary/80"></div>
      
        {/* Hero */}
        <section className="relative z-10 pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h1 className="text-7xl md:text-8xl font-black mb-8 leading-[0.95]">
                Built by a <span className="bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">Founder</span>,<br />
                <span className="text-accent drop-shadow-[0_0_25px_rgba(57,255,20,0.5)]">For Founders.</span>
              </h1>
              <p className="text-2xl text-text-secondary mb-16 leading-relaxed font-light">
                This isn't <span className="line-through text-text-tertiary">theory</span>. It's the <span className="text-white font-semibold">exact system</span> I used to break through the founder bottleneck — and now I help <span className="text-accent font-bold">$1M–$8M service-based founders</span> do the same.
              </p>
              <a
                href="https://calendly.com/podlablv/strategy-call"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-block px-16 py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(57,255,20,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
              >
                <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Work With Us →</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-accent-hover to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </a>
            </div>
            <div className="flex justify-center">
              <ImageWithHover
                src="/about/hiram-mirna-hero-pic.png"
                alt="Hiram & Mirna Andino"
                width={1000}
                height={1000}
                className="rounded-xl shadow-2xl w-full max-w-[600px] aspect-square object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Founder Story */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold mb-12">The Bottleneck That Built PodLab</h2>
          
          {/* Glassy Container for Story */}
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-border/30">
            <div className="prose prose-invert max-w-none text-lg space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">The Problem</h3>
              <p className="text-text-secondary">
                I'm Hiram Andino. Combat Army veteran. Systems thinker. Founder.
              </p>
              <p className="text-text-secondary">
                I built PodLab to $1M revenue doing what most founders do: grinding. Every sales call. Every trust-building moment. Every client onboarding. Me, personally.
              </p>
              <p className="text-text-secondary">
                I thought that's what it meant to run a business. Then I hit the wall.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4">The Breaking Point</h3>
              <p className="text-text-secondary">
                One week I got sick. Couldn't take calls. Couldn't show up.
              </p>
              <p className="text-text-secondary">
                Revenue dropped 40%.
              </p>
              <p className="text-xl font-semibold text-text-primary">
                That's when it hit me: I didn't build a business. I built a high-paying job disguised as one.
              </p>
              <p className="text-text-secondary">
                If I stopped, the business stopped. I was the product, the salesperson, the brand, and the bottleneck.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4">The Search for Solutions</h3>
              <p className="text-text-secondary mb-4">I tried everything:</p>
              <div className="space-y-4">
                <div>
                  <p className="font-bold text-text-primary">Content agencies?</p>
                  <p className="text-text-secondary">They put me on a treadmill. Endless production cycles. Ongoing dependency. No finish line.</p>
                </div>
                <div>
                  <p className="font-bold text-text-primary">Business consultants?</p>
                  <p className="text-text-secondary">They handed me frameworks and left. More work on my plate, not less.</p>
                </div>
                <div>
                  <p className="font-bold text-text-primary">Video production houses?</p>
                  <p className="text-text-secondary">They filmed beautiful videos that didn't convert. Pretty content. Zero sales impact.</p>
                </div>
              </div>
              <p className="text-text-secondary mt-4">
                None of them solved the core problem: <strong className="text-text-primary">Founder dependency.</strong>
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4">The Solution</h3>
              <p className="text-text-secondary">
                So I built what didn't exist.
              </p>
              <p className="text-text-secondary">
                A growth system that combines <strong className="text-text-primary">strategic clarity + brand development + sales-duplicating video production</strong> in a single, phase-by-phase framework.
              </p>
              <p className="text-text-secondary">
                The goal? <strong className="text-accent">Duplicate founders so they can scale without being the bottleneck.</strong>
              </p>
              <div className="bg-bg-tertiary/50 border border-accent/30 rounded-xl p-8 mt-6">
                <p className="font-bold text-text-primary mb-4">The result:</p>
                <ul className="space-y-2 text-text-secondary">
                  <li>• My video answers objections while I sleep</li>
                  <li>• Prospects book calls already convinced</li>
                  <li>• My close rate went up, sales time went down</li>
                  <li>• I freed up 15+ hours a week to lead, not sell</li>
                </ul>
                <p className="text-text-primary mt-4">It worked.</p>
                <p className="text-accent font-bold mt-2">So I turned it into Business Growth System by PodLab.</p>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4">The Mission Today</h3>
              <p className="text-text-secondary">
                Now I help $1M–$8M service-based founders do the same.
              </p>
              <p className="text-text-secondary">
                I bring military systems thinking into the business growth world. Clear strategy. Flawless execution. Measurable outcomes.
              </p>
              <p className="text-xl font-semibold text-text-primary">
                No fluff. No hype. No ongoing dependency.
              </p>
              <p className="text-text-secondary">
                Just a proven system that duplicates you so you can scale without burning out.
              </p>
            </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xl text-text-primary mb-6">Want to see how it works?</p>
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
        </div>
      </section>
      </div>
      {/* End Background Wrapper */}

      {/* Mission, Vision, Values */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold mb-16 text-center">What We Believe</h2>
          
          <div className="grid md:grid-cols-3 gap-12 mb-16">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">Mission</h3>
              <p className="text-text-secondary">
                To eliminate founder bottlenecks by duplicating expertise through strategic video assets, enabling $1M–$8M service-based businesses to scale without burning out.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">Vision</h3>
              <p className="text-text-secondary">
                To become the industry standard for founder duplication — where every service-based business owner has a growth lab that works 24/7.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">Core Values</h3>
              <ul className="text-text-secondary space-y-2">
                <li>• Systems Over Hustle</li>
                <li>• Founder Freedom</li>
                <li>• ROI Transparency</li>
                <li>• Execution Excellence</li>
                <li>• Founder-to-Founder Service</li>
              </ul>
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-12">
            {values.map((value) => (
              <div key={value.title} className="group bg-bg-secondary border border-border rounded-xl p-8 hover:border-accent hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.15)] transition-all duration-350 cursor-pointer">
                <h3 className="text-2xl font-bold mb-2 group-hover:text-accent transition-colors">{value.title}</h3>
                <p className="text-accent font-semibold mb-4">{value.tagline}</p>
                <p className="text-text-secondary group-hover:text-text-primary transition-colors">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 px-6 bg-black">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold mb-16 text-center">The Team</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {team.map((member) => (
              <div key={member.name} className="group text-center cursor-pointer">
                <div className="mb-6 mx-auto max-w-[500px] group-hover:-translate-y-2 transition-transform duration-350">
                  <ImageWithHover
                    src={member.image}
                    alt={member.name}
                    width={500}
                    height={500}
                    className="rounded-full shadow-xl group-hover:shadow-2xl group-hover:shadow-accent/20 transition-shadow"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors">{member.name}</h3>
                <div className="text-sm text-accent uppercase tracking-wide mb-3">{member.role}</div>
                <p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Section - No container, green glow */}
      <FadeIn direction="up">
      <section className="relative py-24 px-6 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(57,255,20,0.5)]">
            <iframe
              src="https://www.youtube.com/embed/5wqcVnpzknQ?autoplay=1&mute=0&loop=1&playlist=5wqcVnpzknQ&controls=1&modestbranding=1&playsinline=1&enablejsapi=1"
              title="Meet the PodLab Team"
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      </section>
      </FadeIn>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-black to-bg-secondary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">Ready to Duplicate Yourself?</h2>
          <p className="text-xl text-text-secondary mb-12">
            If you're a $1M–$8M founder ready to stop being the bottleneck, let's talk.
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

const team = [
  {
    name: "Hiram Andino",
    role: "Founder",
    image: "/about/hiram-solo.png",
    bio: "Combat Army vet. Former Corporate Director. Built PodLab to solve the founder bottleneck.",
  },
  {
    name: "Mirna Andino",
    role: "Brand & Experience Lead",
    image: "/about/Mirna.png",
    bio: "Brand strategist. Makes sure everything looks and feels right.",
  },
  {
    name: "Dakota Hanshew",
    role: "Co-Founder",
    image: "/about/Dakota.png",
    bio: "Systems architect. Automation expert. Makes the backend invisible.",
  },
  {
    name: "Adonis",
    role: "Director of Business Development",
    image: "/about/Adonis.png",
    bio: "Combat Marine vet. Knows how to close with integrity.",
  },
];

const values = [
  {
    title: "1. Systems Over Hustle",
    tagline: "Build infrastructure, not dependency.",
    description: "Your success shouldn't require constant manual effort. It should compound through strategic assets that work while you sleep.",
  },
  {
    title: "2. Founder Freedom",
    tagline: "Scale the business, not the stress.",
    description: "We protect your time, energy, and sanity by duplicating you so you can focus on what only you can do: lead and grow the company.",
  },
  {
    title: "3. ROI Transparency",
    tagline: "Measurable outcomes, always.",
    description: "We don't sell vague benefits like visibility or engagement. We deliver time saved, deals closed, and close rates increased.",
  },
  {
    title: "4. Execution Excellence",
    tagline: "Strategy means nothing without flawless delivery.",
    description: "We don't hand you frameworks and wish you luck. We build the assets, deploy the system, and ensure it works.",
  },
  {
    title: "5. Founder-to-Founder Service",
    tagline: "We protect your time, brand, and vision as if it were our own.",
    description: "Because it is. Hiram built PodLab from the same bottleneck you're in now. We get it.",
  },
];
