import Navigation from '@/components/Navigation';
import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import { offerFor } from '@/lib/checkout';
import PurchaseTracking from './PurchaseTracking';

// Where Whop sends a buyer after paying (redirect_url on each site checkout
// link). The payment itself is recorded by the CRM's webhook, not here — this
// page only confirms and gets the kickoff booked while intent is highest.
export const metadata: Metadata = {
  title: "You're in | PodLab",
  description: 'Payment received. Book your kickoff.',
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ offer?: string }>;
}) {
  const { offer: key } = await searchParams;
  const offer = offerFor(key);
  // A known offer with no kickoff (the edits) needs no call; an unknown offer
  // still gets the strategy call so nobody lands on a dead end.
  const kickoff = offer ? offer.kickoffUrl : 'https://calendly.com/podlablv/strategy-call';
  const embed = kickoff
    ? `${kickoff}?hide_gdpr_banner=1&background_color=0a0a0a&text_color=ffffff&primary_color=2add1b`
    : null;

  return (
    <div className="min-h-screen">
      <Navigation />
      {offer && (
        <PurchaseTracking offerKey={offer.key} name={offer.name} value={offer.value} depositTier={offer.depositTier} />
      )}
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/15 mb-6">
            <Check className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {offer ? `You're in: ${offer.name}` : "Payment received. You're in."}
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto mb-2">
            {offer?.nextStep || 'Book your kickoff call below and we will take it from there.'}
          </p>
          <p className="text-sm text-text-secondary">
            Your receipt is on its way from Whop. Questions? <a href="mailto:info@podlablv.com" className="text-accent">info@podlablv.com</a>
          </p>
        </div>

        {embed && kickoff && (
          <>
            <div className="max-w-4xl mx-auto mt-12 glass-card overflow-hidden">
              <iframe
                src={embed}
                title="Book your kickoff call"
                className="w-full"
                style={{ height: 720, border: 0 }}
                loading="lazy"
              />
            </div>
            <p className="text-center text-sm text-text-secondary mt-4">
              Calendar not loading? <a href={kickoff} target="_blank" rel="noopener noreferrer" className="text-accent">Open it in a new tab</a>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
