import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Affiliate UTM Builder',
  description: 'Generate tracked referral links for the PodLab Beaker program.',
  openGraph: {
    title: 'Affiliate UTM Builder | PodLab',
    description: 'Build tracked referral links for PodLab.',
    url: 'https://podlablv.com/affiliate/utm',
    images: [{ url: '/api/og?title=PodLab&subtitle=Record%20Once.%20Sell%20Forever.', width: 1200, height: 630 }],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
