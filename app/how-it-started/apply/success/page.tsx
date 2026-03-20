import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Application Received — How It Started',
  description: 'Thank you for applying to be a guest on How It Started.',
}

export default function ApplicationSuccess() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center">
      <div className="max-w-lg mx-auto px-6 text-center py-20">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          APPLICATION <span className="text-accent">RECEIVED</span>
        </h1>

        <p className="text-text-secondary text-lg leading-relaxed mb-3">
          Thanks for applying to be a guest on <strong className="text-text-primary">How It Started</strong>.
        </p>

        <p className="text-text-secondary leading-relaxed mb-4">
          You&apos;re one step away — <strong className="text-text-primary">schedule your pre-interview call</strong> so 
          we can nail your story angle and talking points before recording day.
        </p>

        <p className="text-text-secondary text-sm leading-relaxed mb-10">
          It&apos;s a quick 15-minute call. No prep needed — just show up and be yourself.
        </p>

        {/* Primary CTA — Schedule Call */}
        <a
          href="https://calendly.com/podlablv/pre-interview-call"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center justify-center w-full px-8 py-5 bg-accent text-background text-lg font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(42,221,27,0.4)] active:scale-[0.98] relative overflow-hidden uppercase tracking-wider mb-10"
        >
          <span className="relative z-10">Schedule Your Pre-Interview Call →</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
        </a>

        {/* What happens next */}
        <div className="text-left bg-card border border-border rounded-xl p-6 mb-10">
          <h2 className="font-display text-sm font-bold text-accent tracking-widest mb-4">WHAT HAPPENS NEXT</h2>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Schedule your pre-interview call (15 min)' },
              { step: '2', text: 'We nail your story angle + talking points' },
              { step: '3', text: 'Show up to the studio, tell your story' },
              { step: '4', text: 'We handle editing, publishing, and distribution' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.step}
                </div>
                <p className="text-text-secondary text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-lg border border-border text-text-secondary hover:border-accent/50 hover:text-text-primary transition-colors text-sm font-medium"
          >
            Back to PodLab
          </Link>
          <Link
            href="/how-it-started"
            className="px-6 py-3 rounded-lg border border-border text-text-secondary hover:border-accent/50 hover:text-text-primary transition-colors text-sm font-medium"
          >
            Learn More About the Podcast
          </Link>
        </div>
      </div>
    </div>
  )
}
