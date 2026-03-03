import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PodLab - Record Once, Sell Forever',
  description: 'Duplicate yourself into strategic 4K video assets that sell 24/7. For $1M–$8M founders stuck as the bottleneck.',
  keywords: 'founder duplication, video marketing, business growth, content studio, sales automation',
  authors: [{ name: 'PodLab LV' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://podlablv.com',
    siteName: 'PodLab',
    title: 'PodLab - Record Once, Sell Forever',
    description: 'Duplicate yourself into strategic 4K video assets that sell 24/7. For $1M–$8M founders stuck as the bottleneck.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PodLab - Founder Duplication Studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PodLab - Record Once, Sell Forever',
    description: 'Duplicate yourself into strategic 4K video assets that sell 24/7. For $1M–$8M founders stuck as the bottleneck.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
