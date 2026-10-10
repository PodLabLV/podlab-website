import type { Category } from './questions';

/**
 * Prizes, one per dependency. A prize is always awarded against the player's
 * currently weakest category so the reward previews the fix the roadmap is
 * about to recommend — the mapping matches lib/roadmap-generator.ts.
 */
export interface Prize {
  category: Category;
  name: string;
  blurb: string;
  /** What TipTop says when it lands. */
  callout: string;
}

export const PRIZES: Record<Category, Prize> = {
  'Founder Dependency': {
    category: 'Founder Dependency',
    name: 'Free 30-Minute Strategy Session',
    blurb: 'Thirty minutes with Hiram to pull the business off your back.',
    callout: "You're the bottleneck, so you get thirty minutes with the guy who unhooks founders for a living.",
  },
  'Brand & Perception': {
    category: 'Brand & Perception',
    name: 'Free Website',
    blurb: 'A single landing page built to make you look like the premium option.',
    callout: "Your brand is underselling you. So here's a page that doesn't.",
  },
  'Marketing Systems': {
    category: 'Marketing Systems',
    name: '5 Free Video Ads + Organic Q&A Pack',
    blurb: 'Five ad cuts and a Q&A set, so your content keeps working after you stop posting.',
    callout: 'Your marketing dies the day you stop pushing it. These keep running without you.',
  },
  'Sales Infrastructure': {
    category: 'Sales Infrastructure',
    name: 'Free VSL',
    blurb: 'A video sales letter that pre-sells prospects before they ever reach you.',
    callout: "You explain yourself from scratch every call. Not anymore — this does it for you.",
  },
  'Strategic Clarity': {
    category: 'Strategic Clarity',
    name: 'AssetsLab',
    blurb: 'ICP, founder DNA, hook bank, content roadmap. The clarity everything else runs on.',
    callout: "You can't say who you serve in one sentence. AssetsLab fixes that first.",
  },
};

/** Fallback order when there isn't enough data to know the weakest category. */
export const DEFAULT_PRIZE_ORDER: Category[] = [
  'Founder Dependency',
  'Brand & Perception',
  'Marketing Systems',
  'Sales Infrastructure',
  'Strategic Clarity',
];

/**
 * Picks the next prize: weakest unawarded category first, falling back to the
 * default order. Returns null only once every prize is already won.
 */
export function nextPrize(weakestFirst: Category[], alreadyWon: Category[]): Prize | null {
  const taken = new Set(alreadyWon);
  const fromWeakest = weakestFirst.find((c) => !taken.has(c));
  if (fromWeakest) return PRIZES[fromWeakest];
  const fromDefault = DEFAULT_PRIZE_ORDER.find((c) => !taken.has(c));
  return fromDefault ? PRIZES[fromDefault] : null;
}
