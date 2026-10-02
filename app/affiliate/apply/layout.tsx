import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Apply to the Beaker Program',
  description: 'Join PodLab\'s referral program for coaches, consultants, and professionals who serve service-based founders doing $250K+ a year.',
  openGraph: {
    title: 'Apply to the Beaker Program | PodLab',
    description: 'Earn referral fees by connecting founders with PodLab.',
    url: 'https://podlablv.com/affiliate/apply',
    images: [{ url: '/api/og?title=PodLab&subtitle=Record%20Once.%20Sell%20Forever.', width: 1200, height: 630 }],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
