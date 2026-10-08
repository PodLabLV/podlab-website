import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'PodLab Portal — Sign In' },
  description: 'Log in to the PodLab Portal to view your assessment results, deliverables, and project progress.',
  openGraph: {
    title: 'PodLab Portal — Sign In',
    description: 'Access the PodLab Portal.',
    url: 'https://podlablv.com/login',
    images: [{ url: '/api/og?title=PodLab&subtitle=Record%20Once.%20Sell%20Forever.', width: 1200, height: 630 }],
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
