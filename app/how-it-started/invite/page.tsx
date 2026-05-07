'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

function InviteContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') || 'there'
  const firstName = name.split(' ')[0]

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Hero */}
      <section className="relative py-20 sm:py-32 overflow-hidden">
        {/* Green glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
        
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/5 mb-8">
            <span className="text-accent text-sm font-medium tracking-wide uppercase">Personal Invitation</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Hey {firstName},<br />
            <span className="text-accent">You&apos;re Invited.</span>
          </h1>

          <p className="text-text-secondary text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-4">
            I&apos;m launching a podcast called <strong className="text-text-primary">How It Started</strong> — 
            raw, honest conversations with founders who&apos;ve built something real.
          </p>

          <p className="text-text-secondary text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-12">
            Your story deserves to be heard. No scripts. No highlight reels. 
            Just the real journey — the failures, the pivots, the lessons that shaped everything.
          </p>

          {/* Hiram signature */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg">
              H
            </div>
            <div className="text-left">
              <p className="text-text-primary font-semibold">Hiram Andino</p>
              <p className="text-text-tertiary text-sm">Founder, PodLab LV · Combat Army Veteran</p>
            </div>
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-16 border-t border-border">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-12 tracking-tight">
            WHAT TO EXPECT
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: '️', title: '30–45 Minutes', desc: 'Conversational, not an interview. Just two founders talking.' },
              { icon: '', title: 'In-Studio or Remote', desc: 'Our Las Vegas studio or Zoom — whatever works for you.' },
              { icon: '', title: 'Zero Prep Needed', desc: 'No scripts, no pre-approved questions. Come as you are.' },
              { icon: '', title: 'You Own Your Content', desc: 'Full clips, highlights, and assets from your episode — yours to use.' },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-xl border border-border bg-card hover:border-accent/30 transition-colors">
                <span className="text-2xl mb-3 block">{item.icon}</span>
                <h3 className="font-display text-lg font-bold mb-2 tracking-tight">{item.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="py-16 border-t border-border">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-12 tracking-tight">
            WE&apos;LL TALK ABOUT
          </h2>

          <div className="space-y-4 max-w-xl mx-auto">
            {[
              'How you got started — the real origin story',
              'The turning points that shaped your business',
              'The hardest lesson you learned the hard way',
              'The systems you built that actually work',
              'What you\'d tell yourself on day one',
            ].map((topic) => (
              <div key={topic} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-accent mt-2.5 shrink-0" />
                <p className="text-text-secondary text-lg">{topic}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — Calendly */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-2xl sm:text-4xl font-bold mb-4 tracking-tight">
            READY? LET&apos;S <span className="text-accent">LOCK IT IN.</span>
          </h2>
          <p className="text-text-secondary text-lg mb-10 max-w-xl mx-auto">
            Pick a time that works. No sales pitch. Just your story on the mic.
          </p>

          <a
            href="https://calendly.com/podlablv/strategy-call"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-10 py-4 bg-accent text-background font-bold text-lg rounded-lg hover:bg-accent/90 transition-colors"
          >
            Book Your Episode →
          </a>

          <p className="text-text-tertiary text-sm mt-6">
            Prefer to chat first?{' '}
            <a href="mailto:info@podlablv.com" className="text-accent hover:underline">
              Email me directly
            </a>{' '}
            or text me — you know how to reach me.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Link href="/how-it-started" className="text-accent hover:underline text-sm">
            Learn more about How It Started →
          </Link>
          <p className="text-text-tertiary text-xs mt-4">
            © {new Date().getFullYear()} PodLab LV. Las Vegas, Nevada.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}
