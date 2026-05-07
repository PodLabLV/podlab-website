export type LabSlug =
  | 'assets-lab'
  | 'brand-lab'
  | 'site-lab'
  | 'video-sales-lab'
  | 'expansion-lab';

export interface Lab {
  slug: LabSlug;
  name: string;
  subtitle: string;
  presenter: string;
  teaser: string;
  unlockOutcome: string;
  priceRange: string;
  timeline: string;
  primaryFor: string[];
  href: string;
}

export const LABS: Lab[] = [
  {
    slug: 'assets-lab',
    name: 'AssetsLab',
    subtitle: 'Strategic Clarity',
    presenter: 'Adonis',
    teaser:
      'Extract the positioning, messaging, and sales DNA trapped in your head. Define exactly who you serve, what you say, and how you say it — so every dollar you spend after this works harder.',
    unlockOutcome: 'Crystal-clear positioning that makes every marketing and sales decision easier.',
    priceRange: '$1,000',
    timeline: '1 week',
    primaryFor: ['Strategic Clarity', 'Founder Dependency', 'Marketing Systems'],
    href: '/labs/assets',
  },
  {
    slug: 'brand-lab',
    name: 'BrandLab',
    subtitle: 'Premium Brand Identity',
    presenter: 'Mirna',
    teaser:
      'A professional visual identity engineered to command premium pricing — logo, color, typography, brand guidelines. The kind of brand that makes prospects trust you before you say a word.',
    unlockOutcome: 'Your brand stops underselling you. Premium pricing becomes the obvious choice.',
    priceRange: '$3,500',
    timeline: '2–3 weeks',
    primaryFor: ['Brand & Perception'],
    href: '/labs/brand',
  },
  {
    slug: 'site-lab',
    name: 'SiteLab',
    subtitle: 'Digital Sales Floor',
    presenter: 'Stephen',
    teaser:
      'A website built to convert the $1M–$8M buyer — clear positioning, social proof, video integration, conversion paths. Your digital sales floor that moves visitors from browsing to booking.',
    unlockOutcome: 'A website that closes for you, not one prospects bounce from.',
    priceRange: '$3,500+',
    timeline: '2–4 weeks',
    primaryFor: ['Brand & Perception', 'Sales Infrastructure'],
    href: '/labs/site',
  },
  {
    slug: 'video-sales-lab',
    name: 'VideoSalesLab',
    subtitle: 'Strategic 4K Video Sales System',
    presenter: 'Dakota',
    teaser:
      '5 strategic videos that do your selling 24/7 — authority, origin story, offer breakdown, objection handling, social proof. Prospects show up to calls already pre-sold and ready to buy.',
    unlockOutcome: 'Shorter sales cycles. Higher close rates. Less time per deal.',
    priceRange: '$10,000',
    timeline: '3–4 weeks',
    primaryFor: ['Sales Infrastructure', 'Founder Dependency'],
    href: '/labs/video-sales',
  },
  {
    slug: 'expansion-lab',
    name: 'ExpansionLab',
    subtitle: 'Strategy Meets Execution',
    presenter: 'Hiram',
    teaser:
      'Ongoing conversion system — content production, LinkedIn campaigns, paid ads, retargeting, optimization. Your marketing engine running every month, not something you have to "get to."',
    unlockOutcome: 'Predictable lead flow from multiple channels. Marketing becomes a system that runs.',
    priceRange: '$5,000+/mo',
    timeline: 'Ongoing',
    primaryFor: ['Marketing Systems'],
    href: '/labs/expansion',
  },
];

export function getLab(slug: LabSlug): Lab | undefined {
  return LABS.find((l) => l.slug === slug);
}

export function rankLabsForCategoryScores(
  scores: Record<string, number>
): Lab[] {
  const sortedWeakestFirst = Object.entries(scores).sort((a, b) => a[1] - b[1]);

  const ranked: Lab[] = [];
  const used = new Set<LabSlug>();

  for (const [cat] of sortedWeakestFirst) {
    for (const lab of LABS) {
      if (used.has(lab.slug)) continue;
      if (lab.primaryFor.includes(cat)) {
        ranked.push(lab);
        used.add(lab.slug);
        break;
      }
    }
  }
  for (const lab of LABS) {
    if (!used.has(lab.slug)) {
      ranked.push(lab);
      used.add(lab.slug);
    }
  }
  return ranked;
}
