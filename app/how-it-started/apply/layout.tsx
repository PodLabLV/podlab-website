import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Apply to Be a Guest — How It Started',
  description: 'Apply to be a guest on How It Started, PodLab\'s podcast featuring founders who built something real from scratch.',
  openGraph: {
    title: 'Apply to Be a Guest — How It Started | PodLab',
    description: 'Share your founder story on our podcast.',
    url: 'https://podlablv.com/how-it-started/apply',
    images: [{ url: '/api/og?title=PodLab&subtitle=Record%20Once.%20Sell%20Forever.', width: 1200, height: 630 }],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
