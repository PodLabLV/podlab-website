'use client';

import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import CalendlyButton from './CalendlyButton';

interface TypeformEmbedProps {
  formId: string;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function fireGA4Event(eventName: string, params: Record<string, unknown>) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: eventName, ...params });
  }
}

function getUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const val = p.get(key);
    if (val) result[key] = val;
  }
  return result;
}

const PLACEHOLDER_ID = 'YOUR_FORM_ID';
const CALENDLY_URL = 'https://calendly.com/podlablv/strategy-call';

export default function TypeformEmbed({ formId }: TypeformEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasForm = formId && formId !== PLACEHOLDER_ID;

  useEffect(() => {
    // Typeform submit → generate_lead
    function handleTypeformMessage(event: MessageEvent) {
      if (event.origin !== 'https://form.typeform.com') return;
      let data: { type?: string } | null = null;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.type === 'form-submit') {
        fireGA4Event('generate_lead', {
          event_category: 'VideoSalesLab',
          event_label: 'Typeform Submit',
          lead_source: 'typeform',
          page_path: '/labs/video-sales-lab',
          value: 10000,
          ...getUtmParams(),
        });
      }
    }

    // Calendly booking → book_appointment
    function handleCalendlyMessage(event: MessageEvent) {
      if (event.origin !== 'https://calendly.com') return;
      let data: { event?: string } | null = null;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.event === 'calendly.event_scheduled') {
        fireGA4Event('book_appointment', {
          event_category: 'VideoSalesLab',
          event_label: 'Calendly Booking',
          lead_source: 'calendly',
          meeting_type: 'pre_interview',
          page_path: '/labs/video-sales-lab',
          value: 10000,
          ...getUtmParams(),
        });
      }
    }

    window.addEventListener('message', handleTypeformMessage);
    window.addEventListener('message', handleCalendlyMessage);
    return () => {
      window.removeEventListener('message', handleTypeformMessage);
      window.removeEventListener('message', handleCalendlyMessage);
    };
  }, []);

  if (!hasForm) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12 px-6 text-center">
        <p className="text-text-secondary text-lg max-w-md">
          Ready to duplicate yourself on camera? Book a 30-minute strategy call — we&apos;ll confirm fit and outline your filming day.
        </p>
        <CalendlyButton
          url={CALENDLY_URL}
          className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black font-bold rounded-lg hover:bg-accent-hover hover:-translate-y-1 transition-all text-lg"
        >
          Schedule Your Strategy Call
          <ArrowRight className="h-5 w-5" />
        </CalendlyButton>
      </div>
    );
  }

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
