import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Apply to Be a Guest — How It Started',
  description: 'Apply to be a guest on How It Started, PodLab\'s podcast featuring founders who built something real from scratch.',
  openGraph: {
    title: 'Apply to Be a Guest — How It Started | PodLab',
    description: 'Share your founder story on our podcast.',
    url: 'https://podlablv.com/how-it-started/apply',
    images: [{ url: 'https://podlablv.com/how-it-started-og.png', width: 1376, height: 768, alt: 'How It Started — PodLab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Apply to Be a Guest — How It Started | PodLab',
    description: 'Share your founder story on our podcast.',
    images: ['https://podlablv.com/how-it-started-og.png'],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
