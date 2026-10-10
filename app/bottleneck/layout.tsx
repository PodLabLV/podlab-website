import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Founder Bottleneck — Play for Real Prizes | PodLab',
  description:
    'Land rings, win real prizes, and find out exactly what is bottlenecking your business. A 20-question founder diagnostic disguised as a ring-toss game, hosted by TipTop.',
  openGraph: {
    title: 'The Founder Bottleneck — Ready to play, hotshot?',
    description:
      'Land 5 rings, win a prize. Miss one, answer a question. Finish all 20 and find out what is really holding your business hostage.',
    url: 'https://podlablv.com/bottleneck',
    images: [{ url: 'https://podlablv.com/assessment-og.png', width: 1366, height: 768, alt: 'PodLab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Founder Bottleneck — Ready to play, hotshot?',
    description: 'A founder diagnostic disguised as a ring-toss game. Real prizes.',
    images: ['https://podlablv.com/assessment-og.png'],
  },
};

export default function BottleneckLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
