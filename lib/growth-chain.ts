/**
 * The Growth Chain: the eight elements, which product unlocks which, how a
 * client's answers are scored, and how each element's state is worked out.
 *
 * Element names, questions, score bands and copy are copied from podlab-lab
 * (src/data/diagnostic.ts and src/data/elements.ts), so a client sees the same
 * eight things the homepage and /diagnostic show. Change them there first.
 *
 * The product map is Hiram's (2026-10-07). BrandLab is a foundation layer under
 * the chain ('br'), not one of the eight. The Business Growth System sets all
 * eight up in its 90 days; ExpansionLab runs them after.
 */

export type ElementKey = 'ds' | 'tg' | 'mk' | 'ld' | 'sl' | 'nu' | 'op' | 'sc';
export type LayerKey = ElementKey | 'br';
export type ElementState = 'locked' | 'building' | 'unlocked';

export type Answer =
  | { mode: 'number'; value: number; unit?: string }
  | { mode: 'range'; min: number; max: number; unit?: string }
  | { mode: 'idk' };

interface Unit {
  key: string;
  label: string;
  factor: number;
}

export interface ChainElement {
  key: ElementKey;
  symbol: string;
  name: string;
  question: string;
  hint: string;
  unit: string;
  units?: Unit[];
  bands: Array<{ at: number; score: number }>;
  lowerIsBetter?: boolean;
  readout: string;
  without: string;
  build: string;
  running: string;
}

// Chain order matters: when two elements tie, the upstream one is the constraint.
export const ELEMENTS: ChainElement[] = [
  {
    key: 'ds',
    symbol: 'Ds',
    name: 'Destination',
    question: "What's your landing page conversion rate?",
    hint: 'Of the people who land on the page you send traffic to, what percentage take the action? The target is 8–12%.',
    unit: '%',
    bands: [
      { at: 8, score: 100 },
      { at: 4, score: 70 },
      { at: 2, score: 45 },
      { at: 0, score: 20 },
    ],
    readout: 'LP conversion · target 8–12%',
    without: 'Paid traffic lands on a brochure. No price, no proof.',
    build: 'One page. One offer. One action. A video that closes.',
    running: 'You know its conversion rate from memory.',
  },
  {
    key: 'tg',
    symbol: 'Tg',
    name: 'Targets & KPIs',
    question: 'How many numbers does your team review every week?',
    hint: 'A weekly dashboard, reverse-engineered from your revenue target. We run six.',
    unit: 'KPIs',
    bands: [
      { at: 6, score: 100 },
      { at: 3, score: 70 },
      { at: 1, score: 45 },
      { at: 0, score: 15 },
    ],
    readout: 'Six-number dashboard · weekly',
    without: 'A revenue goal with no weekly math under it.',
    build: 'Six numbers, reverse-engineered from the target. One dashboard.',
    running: 'Anyone can say whether the month is on pace.',
  },
  {
    key: 'mk',
    symbol: 'Mk',
    name: 'Marketing',
    question: "How many qualified leads came in last month that weren't referrals?",
    hint: 'People who could actually buy, and found you through something other than word of mouth.',
    unit: 'leads',
    bands: [
      { at: 30, score: 100 },
      { at: 10, score: 70 },
      { at: 3, score: 45 },
      { at: 0, score: 20 },
    ],
    readout: 'Cost per qualified lead · falling',
    without: 'Growth runs on referrals and whenever you find time.',
    build: 'One studio day. Six platforms. Paid behind the winners.',
    running: 'Leads arrive on days you never touched the phone.',
  },
  {
    key: 'ld',
    symbol: 'Ld',
    name: 'Lead Management',
    question: 'How long before a new lead gets a first response?',
    hint: 'From the moment they reach out to the first real reply. The target is under five minutes.',
    unit: 'minutes',
    units: [
      { key: 'minutes', label: 'minutes', factor: 1 },
      { key: 'hours', label: 'hours', factor: 60 },
      { key: 'days', label: 'days', factor: 1440 },
    ],
    lowerIsBetter: true,
    bands: [
      { at: 5, score: 100 },
      { at: 60, score: 75 },
      { at: 1440, score: 45 },
      { at: Infinity, score: 20 },
    ],
    readout: 'Speed-to-lead < 5 min · show rate',
    without: 'Every lead treated the same. Speed-to-lead measured in days.',
    build: 'A CRM that segments by revenue and intent, and routes on rules.',
    running: 'Buyers are on a call inside the hour.',
  },
  {
    key: 'sl',
    symbol: 'Sl',
    name: 'Sales',
    question: 'What percentage of deals close without you in the room?',
    hint: "If every close needs you, the answer is zero — and that's the finding.",
    unit: '%',
    bands: [
      { at: 60, score: 100 },
      { at: 30, score: 70 },
      { at: 10, score: 40 },
      { at: 0, score: 20 },
    ],
    readout: 'Close rate · deal size · cycle',
    without: 'One closer, and it is you. Nothing to hand a new rep.',
    build: 'Documented discovery and close. Video pre-sells before the call.',
    running: 'Someone who is not you closes at your rate.',
  },
  {
    key: 'nu',
    symbol: 'Nu',
    name: 'Nurture',
    question: 'What percentage of your sales close after the prospect first said no — or “not yet”?',
    hint: 'The no-pile. If nobody works it, the answer is zero.',
    unit: '%',
    bands: [
      { at: 15, score: 100 },
      { at: 8, score: 70 },
      { at: 3, score: 40 },
      { at: 0, score: 15 },
    ],
    readout: '% closed after the first no',
    without: 'One follow-up, then silence. The no-pile never gets worked.',
    build: 'Sequences per segment — email, SMS, retargeting — carried by video.',
    running: 'Real money closes from people who first said not yet.',
  },
  {
    key: 'op',
    symbol: 'Op',
    name: 'Optimization',
    question: 'How many tests did you run last month — on a page, an ad, a script or an offer?',
    hint: 'One hypothesis, one test, one decision. Every week.',
    unit: 'tests',
    bands: [
      { at: 4, score: 100 },
      { at: 2, score: 70 },
      { at: 1, score: 45 },
      { at: 0, score: 15 },
    ],
    readout: 'Trailing lift at each step',
    without: 'Five things change at once, or nothing changes at all.',
    build: 'One hypothesis, one test, one decision. Every week.',
    running: 'Every week ends with something permanently better.',
  },
  {
    key: 'sc',
    symbol: 'Sc',
    name: 'Scale',
    question: 'If you disappeared for 30 days, what percentage of revenue would still come in?',
    hint: "Be honest. Growth that needs more of your hours isn't scale.",
    unit: '%',
    bands: [
      { at: 80, score: 100 },
      { at: 50, score: 70 },
      { at: 20, score: 40 },
      { at: 0, score: 15 },
    ],
    readout: 'Revenue per employee · founder hours',
    without: 'Growth adds hours. Every level rebuilds the same problem.',
    build: 'Documented delivery, a hiring system, spend against proven economics.',
    running: 'Revenue goes up while your hours go down.',
  },
];

export const ELEMENT_KEYS = ELEMENTS.map((e) => e.key);

export const FOUNDATION = {
  key: 'br' as const,
  name: 'Brand foundation',
  without: 'No brand system, so every page, ad and video starts from scratch.',
  build: 'Logo, palette, type and the brand system every element is built on.',
};

// ── products ─────────────────────────────────────────────────────────────

export interface Product {
  key: string;
  name: string;
  /** Layers this product unlocks (moves to Building on purchase). */
  unlocks: LayerKey[];
  /** Price as sold, for the suggestion copy. */
  price?: string;
  /** crm.podlablv.com/api/buy/<offer>, when the offer has a website checkout. */
  buyOffer?: string;
}

const BUY_BASE = 'https://crm.podlablv.com/api/buy/';
export const STRATEGY_CALL = 'https://calendly.com/podlablv/strategy-call';

export const PRODUCTS: Product[] = [
  { key: 'assetslab', name: 'AssetsLab', unlocks: ['tg'], price: '$1,500', buyOffer: 'assetslab' },
  { key: 'brandlab', name: 'BrandLab', unlocks: ['br'], price: '$3,500' },
  { key: 'sitelab', name: 'SiteLab', unlocks: ['ds'], price: 'from $3,500' },
  { key: 'videosaleslab', name: 'VideoSalesLab', unlocks: ['sl'], price: '$10,000' },
  { key: 'essentialslab', name: 'EssentialsLab', unlocks: ['br', 'ds', 'mk', 'sl'], price: '$3,000', buyOffer: 'essentialslab-core' },
  { key: 'essentialslab-elite', name: 'EssentialsLab ELITE', unlocks: ['br', 'ds', 'tg', 'mk', 'ld', 'sl'], price: '$5,000', buyOffer: 'essentialslab-elite' },
  { key: 'bgs', name: 'Business Growth System', unlocks: ['br', 'ds', 'tg', 'mk', 'ld', 'sl', 'nu', 'op', 'sc'], price: '$18,500' },
  { key: 'expansionlab', name: 'ExpansionLab', unlocks: ['mk', 'nu', 'op'], price: '$3,000/mo' },
  { key: 'expansionlab-elite', name: 'ExpansionLab ELITE', unlocks: ['mk', 'nu', 'op', 'sc'], price: '$5,000/mo' },
  { key: 'raid-voice-agent', name: 'RAID voice agent', unlocks: ['ld'] },
  // Bought, shown under "What you have", but they don't unlock an element.
  { key: 'posting', name: 'Social posting', unlocks: [], price: '+$1,000/mo' },
  { key: 'ads-management', name: 'Meta ads management', unlocks: [], price: '+$1,000/mo' },
  { key: 'vsl-recording-4k', name: '4K VSL Recording + Edit', unlocks: [], price: '$1,000' },
  { key: 'standard-edit', name: 'Standard Edit', unlocks: [], price: '$500' },
  { key: 'premium-edit', name: 'Premium Edit + 3 FAQ videos', unlocks: [], price: '$1,000' },
  { key: 'recording', name: 'Recording session', unlocks: [] },
];

export const PRODUCT_KEYS = PRODUCTS.map((p) => p.key);

export function productByKey(key: string): Product | undefined {
  return PRODUCTS.find((p) => p.key === key);
}

/** Where a "get this" button goes: the website checkout if there is one, else a call. */
export function productCta(p: Product): { href: string; label: string } {
  return p.buyOffer
    ? { href: BUY_BASE + p.buyOffer, label: `Get ${p.name}` }
    : { href: STRATEGY_CALL, label: `Talk about ${p.name}` };
}

// ── scoring (same rules as /diagnostic) ──────────────────────────────────

/** "I don't know" scores lowest: an element you can't measure is one you aren't running. */
export const IDK_SCORE = 10;
/** A range is a softer answer than a number. */
export const RANGE_PENALTY = 10;
const MAX_NUMBER = 1e12;

function toBase(el: ChainElement, v: number, unit?: string) {
  const u = el.units?.find((x) => x.key === unit);
  return u ? v * u.factor : v;
}

function bandScore(el: ChainElement, v: number) {
  if (el.lowerIsBetter) {
    for (const b of el.bands) if (v <= b.at) return b.score;
    return el.bands[el.bands.length - 1].score;
  }
  for (const b of el.bands) if (v >= b.at) return b.score;
  return el.bands[el.bands.length - 1].score;
}

export function scoreAnswer(el: ChainElement, a: Answer): number {
  if (a.mode === 'idk') return IDK_SCORE;
  if (a.mode === 'number') return bandScore(el, toBase(el, a.value, a.unit));
  const mid = (toBase(el, a.min, a.unit) + toBase(el, a.max, a.unit)) / 2;
  return Math.max(IDK_SCORE, bandScore(el, mid) - RANGE_PENALTY);
}

/** Server-side validation: rejects exactly what the form prevents. */
export function parseAnswer(el: ChainElement, raw: unknown): Answer | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const unit = typeof r.unit === 'string' && el.units?.some((u) => u.key === r.unit) ? r.unit : undefined;
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= MAX_NUMBER ? x : null);
  if (r.mode === 'idk') return { mode: 'idk' };
  if (r.mode === 'number') {
    const v = num(r.value);
    return v === null ? null : { mode: 'number', value: v, unit };
  }
  if (r.mode === 'range') {
    const a = num(r.min);
    const b = num(r.max);
    if (a === null || b === null || a > b) return null;
    return { mode: 'range', min: a, max: b, unit };
  }
  return null;
}

// ── state ────────────────────────────────────────────────────────────────

export interface ElementRow {
  element: LayerKey;
  score: number | null;
  delivered_at: string | null;
  state_override: ElementState | null;
}

export interface PhaseRow {
  status: string;
  elements: string[] | null;
}

export interface LayerStatus {
  key: LayerKey;
  state: ElementState;
  score: number | null;
  /** Products the client owns that unlock this layer. */
  ownedBy: Product[];
  /** Products that would unlock it, most targeted first (fewest other layers). */
  unlockers: Product[];
  /** Phases tagged with this layer: done / total. */
  phasesDone: number;
  phasesTotal: number;
}

/**
 * Locked → not bought. Building → bought, still being delivered. Unlocked →
 * delivered: staff marked it, or every delivery phase tagged with it is done.
 * A staff override wins over everything.
 */
export function layerStatus(
  key: LayerKey,
  owned: string[],
  rows: ElementRow[],
  phases: PhaseRow[],
): LayerStatus {
  const row = rows.find((r) => r.element === key);
  const ownedBy = PRODUCTS.filter((p) => owned.includes(p.key) && p.unlocks.includes(key));
  const unlockers = PRODUCTS.filter((p) => p.unlocks.includes(key)).sort(
    (a, b) => a.unlocks.length - b.unlocks.length,
  );
  const tagged = phases.filter((p) => (p.elements ?? []).includes(key));
  const phasesDone = tagged.filter((p) => p.status === 'done').length;
  const delivered = Boolean(row?.delivered_at) || (tagged.length > 0 && phasesDone === tagged.length);

  let state: ElementState = ownedBy.length === 0 ? 'locked' : delivered ? 'unlocked' : 'building';
  if (delivered && ownedBy.length === 0) state = 'unlocked';
  if (row?.state_override) state = row.state_override;

  return {
    key,
    state,
    score: row?.score ?? null,
    ownedBy,
    unlockers,
    phasesDone,
    phasesTotal: tagged.length,
  };
}

export interface ChainStatus {
  elements: Array<LayerStatus & { key: ElementKey; element: ChainElement }>;
  foundation: LayerStatus;
  /** The element to work on next: lowest-scoring not-yet-unlocked one, upstream on ties. */
  constraint: ElementKey | null;
  answered: number;
  unlocked: number;
}

export function chainStatus(owned: string[], rows: ElementRow[], phases: PhaseRow[]): ChainStatus {
  const elements = ELEMENTS.map((el) => ({ ...layerStatus(el.key, owned, rows, phases), key: el.key, element: el }));
  const open = elements.filter((e) => e.state !== 'unlocked');

  // With scores, the weakest open element; without any, the first open one in chain order.
  let constraint: ElementKey | null = null;
  for (const e of open) {
    if (constraint === null) {
      constraint = e.key;
      continue;
    }
    const cur = open.find((x) => x.key === constraint)!;
    if ((e.score ?? 101) < (cur.score ?? 101)) constraint = e.key;
  }

  return {
    elements,
    foundation: layerStatus('br', owned, rows, phases),
    constraint,
    answered: elements.filter((e) => e.score !== null).length,
    unlocked: elements.filter((e) => e.state === 'unlocked').length,
  };
}
