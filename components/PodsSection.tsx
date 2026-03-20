'use client';

import Link from 'next/link';
import ImageWithHover from './ImageWithHover';
import { TiltCard } from './ui/tilt-card';

const pods = [
  {
    name: "The Speakeasy",
    image: "/studio/speakeasy-color.png",
    description: "Intimate, conversational setting. Perfect for authentic founder stories, personal narratives, and trust-building content.",
    use: "Authority Videos",
  },
  {
    name: "The Rome",
    image: "/studio/rome-color.png",
    description: "Classic, timeless backdrop. Ideal for executive presence, professional authority, and corporate messaging.",
    use: "Corporate Content",
  },
  {
    name: "The Lounge",
    image: "/studio/lounge-color.png",
    description: "Modern, minimalist aesthetic. Great for thought leadership, strategic insights, and contemporary brand positioning.",
    use: "Thought Leadership",
  },
  {
    name: "The Mirah",
    image: "/studio/mirah-color.png",
    description: "Warm, inviting atmosphere. Perfect for relationship-building, client testimonials, and human-centered stories.",
    use: "Testimonials",
  },
  {
    name: "The Professor",
    image: "/studio/professor-color.png",
    description: "Educational setting with depth. Ideal for teaching content, explainer videos, and knowledge-sharing formats.",
    use: "Educational Content",
  },
];

export default function PodsSection() {
  return (
    <section className="relative py-32 px-6 overflow-hidden bg-black">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 opacity-15">
        <img 
          src="/pods-section-bg.png" 
          alt="Pods Background"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-6">
            The <span className="text-accent">Pods</span>
          </h2>
          <p className="text-2xl text-text-secondary mb-4">
            Five cinematic sets. One production day. Zero compromises.
          </p>
          <p className="text-lg text-text-secondary">
            Our $150K state-of-the-art Las Vegas studio | Professional lighting, 4K cameras, broadcast audio
          </p>
        </div>

        {/* Main Featured Pod */}
        <div className="mb-20">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
            <div>
              <div className="text-sm text-accent font-semibold mb-3 uppercase tracking-wider">Featured Pod</div>
              <h3 className="text-3xl md:text-5xl font-bold mb-6">The Big Boss</h3>
              <p className="text-xl text-text-secondary mb-6 leading-relaxed">
                Executive power backdrop. Perfect for authority positioning, high-stakes messaging, and C-suite credibility. Dark, dramatic, commanding presence.
              </p>
              <div className="flex flex-wrap items-center gap-3 md:gap-6 text-sm">
                <span className="px-4 py-2 bg-accent/10 border border-accent text-accent rounded-full">4K Cinema</span>
                <span className="px-4 py-2 bg-accent/10 border border-accent text-accent rounded-full">Professional Lighting</span>
                <span className="px-4 py-2 bg-accent/10 border border-accent text-accent rounded-full">Broadcast Audio</span>
              </div>
            </div>
            <TiltCard tiltAmount={10} glareEnabled={true} gyroscopeEnabled={true} className="h-full">
              <div className="group relative">
                <ImageWithHover
                  src="/studio/bigboss-color.png"
                  alt="The Big Boss Pod"
                  width={800}
                  height={600}
                  className="rounded-2xl shadow-2xl border-2 border-border group-hover:border-[#2ADD1B]/50 transition-all duration-500"
                />
                {/* Green glow overlay on hover */}
                <div className="absolute inset-0 bg-[#2ADD1B]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
              </div>
            </TiltCard>
          </div>
        </div>

        {/* Grid of All Pods */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pods.map((pod) => (
            <TiltCard key={pod.name} tiltAmount={10} glareEnabled={true} gyroscopeEnabled={true} className="h-full">
              <div className="group cursor-pointer h-full">
                <div className="relative mb-4 overflow-hidden rounded-xl border-2 border-border group-hover:border-[#2ADD1B]/50 transition-all duration-350 group-hover:shadow-[0_12px_40px_rgba(42,221,27,0.2)]">
                  <ImageWithHover
                    src={pod.image}
                    alt={pod.name}
                    width={600}
                    height={400}
                    className="rounded-xl group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Green glow overlay on hover */}
                  <div className="absolute inset-0 bg-[#2ADD1B]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <span className="text-xs text-accent font-bold uppercase tracking-widest">{pod.use}</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-2 group-hover:text-accent transition-colors">{pod.name}</h3>
                <p className="text-text-secondary leading-relaxed">{pod.description}</p>
              </div>
            </TiltCard>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <div className="inline-block bg-bg-tertiary border border-accent rounded-2xl p-6 md:p-12 max-w-3xl">
            <h3 className="text-3xl font-bold mb-4">One Day. Six Sets. Six Months of Content.</h3>
            <p className="text-lg text-text-secondary mb-8">
              Record your entire video library in a single professional studio session. We handle lighting, audio, direction, editing, and deployment.
            </p>
            <Link
              href="/services"
              className="inline-block px-10 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover transition-all hover:-translate-y-1"
            >
              Explore VideoSalesLab →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
