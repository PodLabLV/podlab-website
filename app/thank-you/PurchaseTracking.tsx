'use client';

import { useEffect } from 'react';

// Conversion events for a completed Whop checkout.
//
// Stripe used to return EssentialsLab buyers to that page with ?deposit=<tier>,
// where it fired PostHog `deposit_paid` and the Meta Pixel `Purchase`. Whop
// lands them here instead, so the same events fire here — same names, same
// properties, same pixel — or ad optimisation and the deposit funnel would go
// quiet without anyone noticing. Deduped per session so a refresh doesn't
// count a second sale.
declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void };
    fbq?: (...args: unknown[]) => void;
  }
}

export default function PurchaseTracking({
  offerKey, name, value, depositTier,
}: { offerKey: string; name: string; value: number; depositTier?: string }) {
  useEffect(() => {
    const flag = `purchase_tracked_${offerKey}`;
    try {
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, '1');
    } catch { /* storage blocked: fire once per load */ }

    // Both scripts load afterInteractive; give them a moment to exist.
    let tries = 0;
    const fire = () => {
      if ((!window.posthog || !window.fbq) && tries++ < 20) { setTimeout(fire, 250); return; }
      if (depositTier) window.posthog?.capture('deposit_paid', { tier: depositTier, value, processor: 'whop' });
      window.posthog?.capture('purchase_completed', { offer: offerKey, value, processor: 'whop' });
      window.fbq?.('track', 'Purchase', { value, currency: 'USD', content_name: name });
    };
    fire();
  }, [offerKey, name, value, depositTier]);

  return null;
}
