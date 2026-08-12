'use client';

import Script from 'next/script';

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (opts: { url: string }) => void;
    };
  }
}

interface CalendlyButtonProps {
  url: string;
  className?: string;
  children: React.ReactNode;
}

export default function CalendlyButton({ url, className, children }: CalendlyButtonProps) {
  return (
    <>
      <link rel="stylesheet" href="https://assets.calendly.com/assets/external/widget.css" />
      <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" />
      <button
        type="button"
        className={className}
        onClick={() => window.Calendly?.initPopupWidget({ url })}
      >
        {children}
      </button>
    </>
  );
}
