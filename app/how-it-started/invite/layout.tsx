import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'You\'re Invited — How It Started Podcast',
  description: 'You\'ve been personally invited by Hiram Andino to be a guest on How It Started — the podcast for real founders with real stories.',
  openGraph: {
    title: 'You\'re Invited — How It Started Podcast',
    description: 'You\'ve been personally invited to share your founder story on How It Started.',
    url: 'https://podlablv.com/how-it-started/invite',
    images: [{ url: '/api/og?title=You%27re%20Invited&subtitle=How%20It%20Started%20Podcast', width: 1200, height: 630 }],
  },
}

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children
}
