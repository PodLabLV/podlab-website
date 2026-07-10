import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'EssentialsLab Assessment',
  description: 'See if EssentialsLab is the right fit — the lite version of the $1M+ playbook PodLab runs for service founders.',
  openGraph: {
    title: 'EssentialsLab Assessment | PodLab',
    description: 'See if EssentialsLab is the right fit for your business.',
    url: 'https://podlablv.com/essentialslab-assessment',
    images: [{ url: 'https://podlablv.com/essentialslab-og.png', width: 1366, height: 768, alt: 'EssentialsLab by PodLab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EssentialsLab Assessment | PodLab',
    description: 'See if EssentialsLab is the right fit for your business.',
    images: ['https://podlablv.com/essentialslab-og.png'],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
