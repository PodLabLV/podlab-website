import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function NotFound() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-8xl font-display text-[#2ADD1B] mb-4">404</div>
          <h1 className="text-2xl font-display text-white uppercase tracking-wider mb-4">
            Page Not Found
          </h1>
          <p className="text-[#c0c0c0] mb-8">
            This page doesn&apos;t exist — but your growth potential does. Let&apos;s get you where you need to go.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-8 py-3 bg-[#2ADD1B] text-black font-bold rounded-xl hover:bg-[#85FF78] transition-all uppercase tracking-wider text-sm"
            >
              Go Home
            </Link>
            <Link
              href="/assessment/start"
              className="px-8 py-3 border border-[#2ADD1B]/30 text-[#2ADD1B] font-bold rounded-xl hover:bg-[#2ADD1B]/10 transition-all uppercase tracking-wider text-sm"
            >
              Take Assessment
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
