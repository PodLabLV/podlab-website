/**
 * The 20-question Founder Bottleneck bank, shared by the ring-toss game.
 *
 * Copy and point values are identical to /assessment/start — the game is a new
 * way to ask the same questions, not a new diagnostic. If a question changes it
 * must change in both places or two leads with the same answers will score
 * differently.
 *
 * Scoring: 5 = the business runs this without the founder, 1 = only the founder
 * can do it. Category = 4 questions, 4–20 points. Total 20–100.
 */

export const CATEGORIES = [
  'Founder Dependency',
  'Brand & Perception',
  'Marketing Systems',
  'Sales Infrastructure',
  'Strategic Clarity',
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Zone = 'Red' | 'Yellow' | 'Green';

export interface QuestionOption {
  text: string;
  points: number;
}

export interface Question {
  id: number;
  category: Category;
  text: string;
  subtext: string;
  options: QuestionOption[];
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    category: 'Founder Dependency',
    text: 'How many hours per week do you personally spend on sales activities?',
    subtext: 'Calls, proposals, follow-ups, closing — anything sales-related.',
    options: [
      { text: 'Less than 5 hours — my team handles it', points: 5 },
      { text: "5–10 hours — I'm involved but not driving every deal", points: 4 },
      { text: "10–20 hours — I'm in most deals", points: 2 },
      { text: '20+ hours — nothing moves without me', points: 1 },
    ],
  },
  {
    id: 2,
    category: 'Founder Dependency',
    text: 'What percentage of deals close WITHOUT your direct involvement?',
    subtext: 'Be honest — not what you want it to be, what it actually is.',
    options: [
      { text: '75–100% close without me', points: 5 },
      { text: '50–74% close without me', points: 4 },
      { text: '25–49% close without me', points: 2 },
      { text: "Less than 25% — I'm the closer", points: 1 },
    ],
  },
  {
    id: 3,
    category: 'Founder Dependency',
    text: 'If you disappeared for 2 weeks — no calls, no emails, nothing — what happens to sales?',
    subtext: 'The vacation test. Most founders already know the answer.',
    options: [
      { text: 'Business runs normally', points: 5 },
      { text: "Slows down but doesn't stop", points: 3 },
      { text: 'Freezes — pipeline goes cold', points: 2 },
      { text: "We'd lose active deals", points: 1 },
    ],
  },
  {
    id: 4,
    category: 'Founder Dependency',
    text: '"Why should I hire you over your competitor?" — can your team answer that without you?',
    subtext: 'Not a rehearsed pitch. A real, convincing answer.',
    options: [
      { text: 'Yes — everyone delivers it consistently', points: 5 },
      { text: 'Mostly — with minor variations', points: 3 },
      { text: 'Inconsistent — depends who they talk to', points: 2 },
      { text: 'Only I can articulate it well', points: 1 },
    ],
  },
  {
    id: 5,
    category: 'Brand & Perception',
    text: 'When was the last time you invested in professional brand development?',
    subtext: 'Logo, visual identity, brand guidelines — not a quick Canva job.',
    options: [
      { text: 'Within the last 12 months', points: 5 },
      { text: '1–2 years ago', points: 4 },
      { text: '3–5 years ago', points: 2 },
      { text: '5+ years ago or never', points: 1 },
    ],
  },
  {
    id: 6,
    category: 'Brand & Perception',
    text: 'Do prospects ever mention a competitor looking "more professional" than you?',
    subtext: 'Their website, their videos, their overall presence.',
    options: [
      { text: "Never — we're the premium option", points: 5 },
      { text: 'Rarely — maybe once a quarter', points: 4 },
      { text: 'Sometimes — comes up a few times a quarter', points: 2 },
      { text: "Frequently — it's a real objection", points: 1 },
    ],
  },
  {
    id: 7,
    category: 'Brand & Perception',
    text: 'Google your company right now. Does the top result reflect who you actually are today?',
    subtext: 'Not who you were 3 years ago. Who you are now.',
    options: [
      { text: 'Spot-on — exactly how we want to be seen', points: 5 },
      { text: 'Mostly accurate — room for improvement', points: 3 },
      { text: 'Outdated or unclear', points: 2 },
      { text: "Doesn't match our actual value at all", points: 1 },
    ],
  },
  {
    id: 8,
    category: 'Brand & Perception',
    text: 'Does your brand justify premium pricing — or are you underselling yourself visually?',
    subtext: "If your website looked like your competitor's, could you charge more?",
    options: [
      { text: 'Our brand is a competitive advantage', points: 5 },
      { text: "It's fine but not a differentiator", points: 3 },
      { text: "It undersells us — we're better than we look", points: 2 },
      { text: "It's actively holding us back", points: 1 },
    ],
  },
  {
    id: 9,
    category: 'Marketing Systems',
    text: 'Where do most of your leads actually come from?',
    subtext: 'Not where you want them to come from. Where they come from today.',
    options: [
      { text: 'Automated systems — content, SEO, ads', points: 5 },
      { text: 'Mix of referrals and some marketing', points: 4 },
      { text: 'Mostly referrals and word-of-mouth', points: 2 },
      { text: 'My personal outreach and networking', points: 1 },
    ],
  },
  {
    id: 10,
    category: 'Marketing Systems',
    text: 'How often do you publish content that attracts your ideal clients?',
    subtext:
      'Strategic content — not random posts. Content that makes the right people say "I need to talk to them."',
    options: [
      { text: 'Multiple times per week — we have a system', points: 5 },
      { text: 'Weekly or a few times per month', points: 4 },
      { text: 'Monthly or less — very inconsistent', points: 2 },
      { text: 'Rarely or never — no time', points: 1 },
    ],
  },
  {
    id: 11,
    category: 'Marketing Systems',
    text: 'Do you have marketing systems that run without your daily involvement?',
    subtext: 'SOPs, scheduled content, automations, a person or team who owns it.',
    options: [
      { text: 'Yes — systems, SOPs, and a team', points: 5 },
      { text: 'Partially — some systems but needs my oversight', points: 3 },
      { text: 'Minimal — mostly ad-hoc when I find time', points: 2 },
      { text: 'Marketing only happens when I personally do it', points: 1 },
    ],
  },
  {
    id: 12,
    category: 'Marketing Systems',
    text: 'What percentage of leads come from sources OTHER than referrals?',
    subtext:
      "Content, SEO, ads, partnerships — anything that doesn't require someone knowing you personally.",
    options: [
      { text: '75%+ from non-referral sources', points: 5 },
      { text: '50–74% from non-referral sources', points: 4 },
      { text: '25–49% from non-referral sources', points: 2 },
      { text: 'Less than 25% — almost all referrals', points: 1 },
    ],
  },
  {
    id: 13,
    category: 'Sales Infrastructure',
    text: 'Do you have video assets that pre-sell prospects before they talk to you?',
    subtext:
      'Not a corporate sizzle reel. Videos that handle objections, explain your process, and build trust — before the call.',
    options: [
      { text: 'Yes — 5+ strategic videos working for us', points: 5 },
      { text: '1–2 basic videos', points: 3 },
      { text: "We've talked about it but haven't done it", points: 2 },
      { text: 'No — every prospect hears it from us live', points: 1 },
    ],
  },
  {
    id: 14,
    category: 'Sales Infrastructure',
    text: 'Could a new salesperson follow your process without shadowing you for months?',
    subtext:
      'Talk tracks, objection handling, qualification criteria, close scripts — documented and usable.',
    options: [
      { text: 'Fully documented — SOPs, scripts, the works', points: 5 },
      { text: 'Partially documented — some resources exist', points: 3 },
      { text: 'Minimally — mostly in my head', points: 2 },
      { text: 'Not documented — pure tribal knowledge', points: 1 },
    ],
  },
  {
    id: 15,
    category: 'Sales Infrastructure',
    text: 'How long does it take from first contact to signed contract?',
    subtext: 'Your average sales cycle — not your best deal, your average.',
    options: [
      { text: 'Less than 2 weeks', points: 5 },
      { text: '2–4 weeks', points: 4 },
      { text: '1–2 months', points: 2 },
      { text: '2+ months', points: 1 },
    ],
  },
  {
    id: 16,
    category: 'Sales Infrastructure',
    text: "When prospects get on a call with you, do they already understand what you do and why you're different?",
    subtext: 'Or are you starting from scratch every time?',
    options: [
      { text: '75%+ already get it before the call', points: 5 },
      { text: '50–74% have a good understanding', points: 4 },
      { text: '25–49% have some understanding', points: 2 },
      { text: 'Less than 25% — I explain from scratch every time', points: 1 },
    ],
  },
  {
    id: 17,
    category: 'Strategic Clarity',
    text: 'Can you describe your ideal client in two sentences?',
    subtext:
      "Revenue range, industry, team size, specific problems. If it takes a paragraph, you don't have clarity.",
    options: [
      { text: 'Crystal clear — I can say it in my sleep', points: 5 },
      { text: 'Pretty clear — I know generally who they are', points: 3 },
      { text: "Somewhat — it's broad or evolving", points: 2 },
      { text: 'Not clear — we work with whoever pays us', points: 1 },
    ],
  },
  {
    id: 18,
    category: 'Strategic Clarity',
    text: 'What makes you different from your competitors?',
    subtext: 'Not "better service." What\'s your specific methodology, framework, or unfair advantage?',
    options: [
      { text: 'Clear, defensible, and proven', points: 5 },
      { text: "We're different but it's hard to articulate", points: 3 },
      { text: "We're similar to competitors honestly", points: 2 },
      { text: 'We compete on relationships and price', points: 1 },
    ],
  },
  {
    id: 19,
    category: 'Strategic Clarity',
    text: 'Do you have documented brand positioning that guides all your marketing and sales?',
    subtext: 'Mission, vision, brand voice, customer journey — written down and used, not just in your head.',
    options: [
      { text: 'Fully documented and consistently used', points: 5 },
      { text: 'Partially documented', points: 3 },
      { text: 'Exists informally but not written down', points: 2 },
      { text: 'Never formalized', points: 1 },
    ],
  },
  {
    id: 20,
    category: 'Strategic Clarity',
    text: 'How often do you revisit your positioning, messaging, and go-to-market strategy?',
    subtext: 'Markets shift. Competitors evolve. Are you keeping up?',
    options: [
      { text: 'Quarterly or more — we actively refine', points: 5 },
      { text: 'Annually — once a year review', points: 3 },
      { text: 'Every few years when something breaks', points: 2 },
      { text: 'Set it and forget it', points: 1 },
    ],
  },
];

/** Zone thresholds, identical to the existing assessment. */
export function getZone(totalScore: number): Zone {
  if (totalScore <= 49) return 'Red';
  if (totalScore <= 74) return 'Yellow';
  return 'Green';
}

export const ZONE_LABEL: Record<Zone, string> = {
  Red: 'Founder-Dependent',
  Yellow: 'Building Momentum',
  Green: 'Systems-Driven',
};

export const ZONE_COLOR: Record<Zone, string> = {
  Red: '#FF4444',
  Yellow: '#FFB800',
  Green: '#2ADD1B',
};

/**
 * Category totals from a sparse answer map. Unanswered questions contribute
 * nothing, so this is safe to call mid-game to find the current weakest area.
 */
export function categoryScores(answers: Record<number, number>): Record<Category, number> {
  const out = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const q of QUESTIONS) {
    const pts = answers[q.id];
    if (pts) out[q.category] += pts;
  }
  return out;
}

export function totalScore(answers: Record<number, number>): number {
  return Object.values(answers).reduce((sum, pts) => sum + pts, 0);
}

/**
 * Categories worst-first. Ties break toward the category with more answered
 * questions, so an untouched category can't masquerade as the weakest one
 * early in the game.
 */
export function rankedWeakest(answers: Record<number, number>): Category[] {
  const scores = categoryScores(answers);
  const answeredCount = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const q of QUESTIONS) {
    if (answers[q.id]) answeredCount[q.category] += 1;
  }
  return [...CATEGORIES].sort((a, b) => {
    if (answeredCount[a] === 0 && answeredCount[b] === 0) return 0;
    if (answeredCount[a] === 0) return 1;
    if (answeredCount[b] === 0) return -1;
    const aAvg = scores[a] / answeredCount[a];
    const bAvg = scores[b] / answeredCount[b];
    return aAvg - bAvg;
  });
}
