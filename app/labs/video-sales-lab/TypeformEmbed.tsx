'use client';

import { useEffect, useRef } from 'react';

interface TypeformEmbedProps {
  formId: string;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export default function TypeformEmbed({ formId }: TypeformEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== 'https://form.typeform.com') return;

      let data: { type?: string } | null = null;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (data?.type === 'form-submit') {
        // Fire GA4 lead event
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'lead', {
            event_category: 'VideoSalesLab',
            event_label: 'Typeform Submit',
            value: 10000,
          });
        }
        // Push to dataLayer for GTM
        if (Array.isArray(window.dataLayer)) {
          window.dataLayer.push({
            event: 'lead',
            form_name: 'VideoSalesLab Intake',
            form_source: 'typeform',
          });
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={`https://form.typeform.com/to/${formId}?typeform-embed=embed-widget`}
      title="VideoSalesLab Application"
      className="w-full rounded-2xl border border-accent/20"
      style={{ minHeight: '520px', height: '100%' }}
      allow="camera; microphone; autoplay; encrypted-media;"
      frameBorder="0"
    />
  );
}
