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
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_vURmoEnG6Y937r7SFwpU9yNaP8DXXuK4D6ZFJJc3s5SE';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

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

        {/* PostHog (product analytics — project 478484, autocapture + pageviews) */}
        {POSTHOG_KEY && (
          <Script id="posthog" strategy="afterInteractive">
            {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
            posthog.init('${POSTHOG_KEY}',{api_host:'${POSTHOG_HOST}',person_profiles:'identified_only',defaults:'2025-05-24'});`}
          </Script>
        )}

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
