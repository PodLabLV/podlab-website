import FadeIn from '@/components/FadeIn';

// On-ramp for sub-$1M founders: after seeing the full 5-Lab system, the founder
// who isn't ready for the Business Growth System gets routed to EssentialsLab.
// Links with a plain <a> (not next/link) because /essentialslab is a rewrite to
// the standalone EssentialsLab deployment, not a Next route — it needs a full nav.
export default function EssentialsLabCta() {
  return (
    <section className="relative py-20 px-6 overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto">
        <FadeIn direction="up">
          <div className="glass-card p-8 md:p-12 border-accent/30 hover:border-accent/50 transition-all text-center">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="h-px w-10 bg-gradient-to-r from-transparent to-accent" />
              <span className="text-accent font-semibold uppercase tracking-wider text-sm">For Founders Under $1M</span>
              <div className="h-px w-10 bg-gradient-to-l from-transparent to-accent" />
            </div>

            <h2 className="text-2xl md:text-4xl lg:text-5xl font-black mb-6 leading-tight">
              Not Ready for the Full System?<br />
              Start with <span className="text-accent drop-shadow-[0_0_20px_rgba(42,221,27,0.4)]">EssentialsLab.</span>
            </h2>

            <p className="text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
              The lite version of the $1M+ playbook — strategic clarity, a conversion-optimized sales floor,
              and a 5-ad demand engine, delivered in under 30 days. <span className="text-white font-semibold">$3,000.</span>
            </p>

            <a
              href="/essentialslab"
              className="group inline-block px-10 py-4 md:px-14 md:py-5 bg-accent text-black text-lg md:text-xl font-bold rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(42,221,27,0.4)] uppercase tracking-wider relative overflow-hidden"
            >
              <span className="relative z-10">Explore EssentialsLab →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            </a>

            <p className="mt-6 text-sm text-text-secondary">
              $1,500 locks your build slot · 10-day delivery · Las Vegas studio
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
