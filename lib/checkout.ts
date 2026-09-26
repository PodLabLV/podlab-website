// Whop checkout links behind the site's Buy buttons, and where each buyer goes
// next.
//
// These are shared links (one per offer, every buyer uses the same one), made
// by podlab-crm/scripts/whop-site-links.mjs. The CRM's Whop webhook knows the
// offer from the link and creates or matches the buyer's lead by email, so the
// site never touches payment data. Keys match the CRM's src/data/labs.ts.
//
// After paying, Whop redirects to /thank-you?offer=<key>.

export interface SiteOffer {
  key: string;
  name: string;
  price: string;           // what the button says
  value: number;           // dollars charged now — the conversion value
  depositTier?: 'essentials' | 'elite'; // EssentialsLab's existing deposit_paid tier
  checkoutUrl: string;
  kickoffUrl: string;      // Calendly event the buyer books next
  nextStep: string;
}

export const SITE_OFFERS: Record<string, SiteOffer> = {
  assetslab: {
    key: 'assetslab',
    name: 'AssetsLab',
    price: '$1,500',
    value: 1500,
    checkoutUrl: 'https://whop.com/checkout/ch_vKwqXjJiKs1cunl/',
    kickoffUrl: 'https://calendly.com/podlablv/assets-lab-strategy',
    nextStep: 'Book your Strategy Sprint kickoff. We run the clarity assessment on that call and start building your foundation.',
  },
  'essentialslab-core-pmt-1': {
    key: 'essentialslab-core-pmt-1',
    name: 'EssentialsLab',
    price: '$1,500 deposit',
    value: 1500,
    depositTier: 'essentials',
    checkoutUrl: 'https://whop.com/checkout/ch_qFgkdDAF6G0PbUn/',
    kickoffUrl: 'https://calendly.com/podlablv/essentialslab-clarity-call',
    nextStep: 'Book your clarity call. We lock your film day in the Las Vegas studio; the second $1,500 is due on film day.',
  },
  'essentialslab-elite-pmt-1': {
    key: 'essentialslab-elite-pmt-1',
    name: 'EssentialsLab ELITE',
    price: '$2,500 deposit',
    value: 2500,
    depositTier: 'elite',
    checkoutUrl: 'https://whop.com/checkout/ch_zpdgiVzal5FEGmn/',
    kickoffUrl: 'https://calendly.com/podlablv/essentialslab-clarity-call',
    nextStep: 'Book your clarity call. We lock your film day in the Las Vegas studio; the second $2,500 is due on film day.',
  },
};

export function offerFor(key: string | undefined | null): SiteOffer | null {
  return (key && SITE_OFFERS[key]) || null;
}
