import type { Metadata } from 'next';
import { Inter, Michroma } from 'next/font/google';
import Script from 'next/script';
import ChatBot from '@/components/ChatBot';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const michroma = Michroma({ weight: '400', subsets: ['latin'], variable: '--font-michroma' });

// Tracking IDs
const GTM_ID = 'GTM-KN5FB9XH';
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-F32FR2PPTT';
const CLARITY_ID = 'v9ghczr4pd';
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '1187387449256258';

export const metadata: Metadata = {
  metadataBase: new URL('https://podlablv.com'),
  title: {
    default: 'PodLab | Record Once. Sell Forever.',
    template: '%s | PodLab',
  },
  description: 'Duplicate yourself into strategic 4K video assets that sell 24/7. For $1M–$8M founders stuck as the bottleneck. Your content studio & growth lab.',
  alternates: {
    canonical: './',
  },
  keywords: 'founder duplication, video marketing, business growth, content studio, sales automation',
  authors: [{ name: 'PodLab LV' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://podlablv.com',
    siteName: 'PodLab',
    title: 'PodLab - Record Once, Sell Forever',
    description: 'Duplicate yourself into strategic 4K video assets that sell 24/7. For $1M–$8M founders stuck as the bottleneck. Your content studio & growth lab.',
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
    description: 'Duplicate yourself into strategic 4K video assets that sell 24/7. For $1M–$8M founders stuck as the bottleneck. Your content studio & growth lab.',
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
      <head>
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>

        {/* Google Analytics 4 (direct fallback if not configured in GTM) */}
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { send_page_view: true });`}
            </Script>
          </>
        )}

        {/* Microsoft Clarity */}
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");`}
        </Script>

        {/* Meta (Facebook) Pixel */}
        {FB_PIXEL_ID && (
          <Script id="fb-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FB_PIXEL_ID}');
            fbq('track', 'PageView');`}
          </Script>
        )}
      </head>
      <body className={`${inter.variable} ${michroma.variable}`}>
        {/* GTM noscript fallback */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        {/* Meta Pixel noscript fallback */}
        {FB_PIXEL_ID && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}

        <div id="content-overlay" />
        {children}
        <ChatBot />
      </body>
    </html>
  );
}
