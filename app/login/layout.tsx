import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Client Login',
  description: 'Log in to your PodLab client portal to view your assessment results, deliverables, and project progress.',
  openGraph: {
    title: 'Client Login | PodLab',
    description: 'Access your PodLab client portal.',
    url: 'https://podlablv.com/login',
    images: [{ url: '/api/og?title=PodLab&subtitle=Record%20Once.%20Sell%20Forever.', width: 1200, height: 630 }],
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
