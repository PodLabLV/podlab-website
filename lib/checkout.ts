// Whop checkout links behind the site's Buy buttons, and where each buyer goes
// next.
//
// These are shared links (one per offer, every buyer uses the same one), made
// by podlab-crm/scripts/whop-site-links.mjs. The CRM's Whop webhook knows the
// offer from the link and creates or matches the buyer's lead by email, so the
// site never touches payment data. Keys match the CRM's src/data/labs.ts.
//
// After paying, Whop redirects to /thank-you?offer=<key>.

// Every Buy button goes through the CRM, which sends the buyer to that offer's
// Whop checkout — or, when the visitor came in on a Beaker link (beaker_ref
// cookie, see lib/beaker-ref.ts), to that affiliate's own tagged checkout so
// the sale is credited. It never blocks a sale: any failure falls back to the
// default checkout noted beside each offer.
const buyUrl = (key: string) => `https://crm.podlablv.com/api/buy/${key}`;

export interface SiteOffer {
  key: string;
  name: string;
  price: string;           // what the button says
  value: number;           // dollars charged now — the conversion value
  depositTier?: 'essentials' | 'elite'; // EssentialsLab's existing deposit_paid tier
  checkoutUrl: string;     // crm.podlablv.com/api/buy/<key>
  kickoffUrl?: string;     // Calendly event the buyer books next; none = no call needed
  nextStep: string;
}

export const SITE_OFFERS: Record<string, SiteOffer> = {
  assetslab: {
    key: 'assetslab',
    name: 'AssetsLab',
    price: '$1,500',
    value: 1500,
    checkoutUrl: buyUrl('assetslab'), // default Whop checkout: ch_6RQ8UheiWXe5IOW
    kickoffUrl: 'https://calendly.com/podlablv/assets-lab-strategy',
    nextStep: 'Book your Strategy Sprint kickoff. We run the clarity assessment on that call and start building your foundation.',
  },
  'essentialslab-core-pmt-1': {
    key: 'essentialslab-core-pmt-1',
    name: 'EssentialsLab',
    price: '$1,500 deposit',
    value: 1500,
    depositTier: 'essentials',
    checkoutUrl: buyUrl('essentialslab-core-pmt-1'), // default Whop checkout: ch_qFgkdDAF6G0PbUn
    kickoffUrl: 'https://calendly.com/podlablv/essentialslab-clarity-call',
    nextStep: 'Book your clarity call. We lock your film day in the Las Vegas studio; the second $1,500 is due on film day.',
  },
  'essentialslab-elite-pmt-1': {
    key: 'essentialslab-elite-pmt-1',
    name: 'EssentialsLab ELITE',
    price: '$2,500 deposit',
    value: 2500,
    depositTier: 'elite',
    checkoutUrl: buyUrl('essentialslab-elite-pmt-1'), // default Whop checkout: ch_zpdgiVzal5FEGmn
    kickoffUrl: 'https://calendly.com/podlablv/essentialslab-clarity-call',
    nextStep: 'Book your clarity call. We lock your film day in the Las Vegas studio; the second $2,500 is due on film day.',
  },
};

// finish.podlablv.com (PodLab × 4Better, "Your footage is in"). Moved off
// 4 Better, LLC's QuickBooks links 2026-09-27. Turnarounds are the ones that
// page promises; the edits need no call — the footage is already shot.
Object.assign(SITE_OFFERS, {
  'standard-edit': {
    key: 'standard-edit',
    name: 'Standard Edit',
    price: '$500',
    value: 500,
    checkoutUrl: buyUrl('standard-edit'), // default Whop checkout: ch_AfLsN7tL7bhqgDP
    nextStep: 'Your edit is back in 5 business days, with 1 round of changes. The clock started when your payment cleared.',
  },
  'premium-edit-faqs': {
    key: 'premium-edit-faqs',
    name: 'Premium Edit + 3 FAQ Videos',
    price: '$1,000',
    value: 1000,
    checkoutUrl: buyUrl('premium-edit-faqs'), // default Whop checkout: ch_LRnz6PJs6Dpq26S
    nextStep: 'Your four videos are back in 7 business days, with 2 rounds of changes. The clock started when your payment cleared.',
  },
  'essentialslab-core': {
    key: 'essentialslab-core',
    name: 'EssentialsLab',
    price: '$3,000',
    value: 3000,
    checkoutUrl: buyUrl('essentialslab-core'), // default Whop checkout: ch_a6ywdIoXyieKMKQ
    kickoffUrl: 'https://calendly.com/podlablv/essentialslab-clarity-call',
    nextStep: 'Paid in full. Book your clarity call to lock your film day in the Las Vegas studio; you go live 10 days after it.',
  },
  'essentialslab-elite': {
    key: 'essentialslab-elite',
    name: 'EssentialsLab ELITE',
    price: '$5,000',
    value: 5000,
    checkoutUrl: buyUrl('essentialslab-elite'), // default Whop checkout: ch_sHMjdG2IxGer8aW
    kickoffUrl: 'https://calendly.com/podlablv/essentialslab-clarity-call',
    nextStep: 'Paid in full. Book your clarity call to lock your film day in the Las Vegas studio; you go live 10 days after it.',
  },
} satisfies Record<string, SiteOffer>);

export function offerFor(key: string | undefined | null): SiteOffer | null {
  return (key && SITE_OFFERS[key]) || null;
}
