/**
 * The onboarding intake: one definition shared by the welcome page, the
 * onboarding API (prefill, validation) and the generation
 * worker (which reads `skillField` to hand the assetslab / vsllab skills the
 * names they expect).
 *
 * Rebuilt from the AssetsLab Assessment Typeform (eo02fkmp03f.typeform.com/essentials,
 * 34 questions). What was kept, merged, dropped and added, and why:
 * docs/ONBOARDING-INTAKE.md. Rule for adding one: it must feed a named section
 * of a deliverable (`feeds`), or it doesn't go in.
 *
 * Pure data + pure helpers: no imports, safe on both server and client.
 */

export type QuestionKind = 'text' | 'long' | 'choice' | 'multi' | 'url' | 'files';

/** Where a prefill can come from on the client's CRM lead (the free-VSL application). */
export interface PrefillSource {
  /** A crm.leads column. */
  column?: string;
  /** A key inside crm.leads.raw_responses (the application's own field names). */
  raw?: string;
}

export interface OnboardingQuestion {
  id: string;
  group: string;
  prompt: string;
  help?: string;
  placeholder?: string;
  kind: QuestionKind;
  options?: string[];
  required?: boolean;
  /** Multi-select: the most they can pick. */
  max?: number;
  /** Already known from the application? Then it shows as "on file" with an Edit link instead of a question. */
  askIfMissing?: boolean;
  /** Only shown (and only required) when another answer is one of these. */
  showIf?: { id: string; in: string[] };
  /** The field name in the assetslab intake schema (~/.claude/skills/assetslab/references/intake-schema.md). */
  skillField: string;
  /** Deliverable sections this answer feeds. Documentation, and the reason the question exists. */
  feeds: string[];
  /** Tried in order; the first non-empty value prefills the answer. */
  prefill?: PrefillSource[];
  /** The Typeform question(s) this replaces, for the rationale doc. */
  typeform?: number[];
}

export interface QuestionGroup {
  id: string;
  title: string;
  intro: string;
}

export const REVENUE_OPTIONS = ['Pre-revenue', 'Under $250K', '$250K–$1M', '$1M–$3M', '$3M–$8M', '$8M+'];
export const YEARS_OPTIONS = ['Under 1 year', '1–3 years', '3–10 years', '10+ years'];
export const CHANNEL_OPTIONS = ['Instagram', 'Facebook', 'LinkedIn', 'YouTube', 'TikTok', 'Google search', 'Podcasts', 'Email', 'Referrals', 'Events', 'Other'];
export const TONE_OPTIONS = ['Professional and polished', 'Bold and direct', 'Warm and approachable', 'Playful and energetic', 'Authoritative and expert'];
export const ADJECTIVE_OPTIONS = ['Direct', 'Warm', 'Premium', 'Bold', 'Calm', 'Expert', 'Friendly', 'Playful', 'Polished', 'Gritty', 'Inspiring', 'Rebellious', 'Trustworthy', 'Witty'];
export const MATERIAL_OPTIONS = ['Logo', 'Brand guide', 'Pitch or sales deck', 'Website copy', 'Testimonials', 'Case studies', 'Past videos', 'Email sequences', 'Social content', 'None yet'];
export const MVV_OPTIONS = ['Yes, written down', 'Sort of, in my head', 'No'];
export const RESEARCH_OPTIONS = ['Yes, in the last 6 months', 'Informally (conversations)', 'Not yet'];

export const INTAKE_GROUPS: QuestionGroup[] = [
  { id: 'basics', title: 'The basics', intro: 'Where the business is today and where it is going.' },
  { id: 'offer', title: 'What you sell', intro: 'The offer, the price, and why it works.' },
  { id: 'buyer', title: 'Who you serve', intro: 'The client you want more of, in their words and yours.' },
  { id: 'market', title: 'Your market', intro: 'Who you are up against and what has not worked.' },
  { id: 'voice', title: 'How you sound', intro: 'Your voice, and anything you already have. Logos and colors come next.' },
];

export const INTAKE_QUESTIONS: OnboardingQuestion[] = [
  // ── The basics
  {
    id: 'website', group: 'basics', kind: 'url', skillField: 'website', askIfMissing: true, typeform: [4],
    prompt: 'Your website', placeholder: 'yourcompany.com',
    help: 'No site yet? Leave it blank. We will plan one instead of auditing one.',
    feeds: ['Website Analysis', 'Market Research'],
    prefill: [{ column: 'website' }, { raw: 'website' }],
  },
  {
    id: 'annual_revenue', group: 'basics', kind: 'choice', options: REVENUE_OPTIONS, required: true, skillField: 'annual_revenue', askIfMissing: true, typeform: [7],
    prompt: 'Annual revenue, roughly',
    help: 'Decides which roadmap we recommend. It never appears in anything public.',
    feeds: ['90-Day Roadmap (pathway + ROI math)', 'Internal DNA'],
    prefill: [{ column: 'annual_revenue' }, { raw: 'annualRevenue' }],
  },
  {
    id: 'years_in_business', group: 'basics', kind: 'choice', options: YEARS_OPTIONS, skillField: 'years_in_business', askIfMissing: true, typeform: [6],
    prompt: 'How long have you been in business?',
    feeds: ['Customer Journey', '90-Day Roadmap (pacing)'],
    prefill: [{ column: 'years_in_business' }, { raw: 'yearsInBusiness' }],
  },
  {
    id: 'top_3_goals', group: 'basics', kind: 'long', required: true, skillField: 'top_3_goals', typeform: [10],
    prompt: 'Your top 3 goals for the next 6–12 months',
    placeholder: 'Numbers beat adjectives: "$1.2M → $2M", "4 new cohort seats a month".',
    feeds: ['90-Day Roadmap (north star)', '3 Immediate Action Steps'],
    prefill: [{ column: 'top_3_goals' }, { raw: 'topGoals' }, { column: 'target_6mo' }],
  },
  {
    id: 'why_now', group: 'basics', kind: 'long', skillField: 'why_assetslab_now', typeform: [11],
    prompt: 'Why now? What made this the moment?',
    feeds: ['Internal DNA (motivation; never client-facing)'],
  },
  {
    id: 'deadlines', group: 'basics', kind: 'text', skillField: 'deadlines', typeform: [34],
    prompt: 'Any dates we should build toward?',
    placeholder: 'A launch, an event, a busy season',
    feeds: ['90-Day Roadmap (calendar)'],
  },

  // ── What you sell
  {
    id: 'business_description', group: 'offer', kind: 'long', required: true, skillField: 'business_description', typeform: [5],
    prompt: 'In 1–2 sentences, what does your business do?',
    feeds: ['Dialed-In Offer (one-liner)', 'Internal DNA'],
    prefill: [{ column: 'business_description' }, { raw: 'businessDescription' }],
  },
  {
    id: 'core_offer', group: 'offer', kind: 'long', required: true, skillField: 'core_offer_description', typeform: [19],
    prompt: 'Your core offer, in 1–2 sentences',
    placeholder: 'What they get, how long it takes, how it is delivered.',
    feeds: ['Dialed-In Offer (canonical statement)', 'VSL (offer block)'],
    prefill: [{ column: 'core_offer' }, { raw: 'coreOfferDescription' }],
  },
  {
    id: 'offer_price', group: 'offer', kind: 'text', required: true, skillField: 'offer_price',
    prompt: 'What does it cost?',
    placeholder: '$4,500, or $1,500/month, or a range',
    help: 'The VSL says the price out loud. A range is fine for now.',
    feeds: ['Dialed-In Offer (value stack)', 'VSL (price beat)'],
    prefill: [{ column: 'offer_price' }],
  },
  {
    id: 'services_offered', group: 'offer', kind: 'long', skillField: 'services_offered', typeform: [9],
    prompt: 'Everything else you sell',
    placeholder: 'Other services or products, and roughly what each costs.',
    feeds: ['Dialed-In Offer (value stack)', 'Positioning (revenue streams)'],
    prefill: [{ column: 'services_offered' }, { raw: 'servicesOffered' }],
  },
  {
    id: 'mechanism', group: 'offer', kind: 'long', required: true, skillField: 'mechanism',
    prompt: 'Why does your way work when the obvious alternative does not?',
    placeholder: 'The method, the step everyone else skips, the thing you know that they do not.',
    help: 'The most important answer here. Your VSL is built on it, and it is the one thing we cannot invent for you.',
    feeds: ['Positioning', 'VSL (mechanism block)'],
    prefill: [{ raw: 'mechanism' }],
  },
  {
    id: 'differentiators', group: 'offer', kind: 'long', skillField: 'differentiators', typeform: [20],
    prompt: 'What makes you different from competitors?',
    feeds: ['Positioning', 'Core Values', 'Value stack'],
    prefill: [{ raw: 'differentiators' }],
  },

  // ── Who you serve
  {
    id: 'dream_client', group: 'buyer', kind: 'long', required: true, skillField: 'dream_client', typeform: [13, 8],
    prompt: 'Describe your dream client like a person',
    placeholder: 'Job, situation, personality, what they need. And how close your current clients are to that.',
    feeds: ['Ideal Client Avatar', 'VSL (callout)'],
    prefill: [{ raw: 'dreamClient' }, { raw: 'currentCustomers' }],
  },
  {
    id: 'pain_points', group: 'buyer', kind: 'long', required: true, skillField: 'pain_points', typeform: [14],
    prompt: 'What problems do they have before they find you?',
    feeds: ['Ideal Client Avatar', '50 Hooks (pain)', 'VSL (problem block)'],
    prefill: [{ raw: 'painPoints' }, { column: 'biggest_blocker' }],
  },
  {
    id: 'outcome_delivered', group: 'buyer', kind: 'long', required: true, skillField: 'outcome_delivered', typeform: [15],
    prompt: 'What outcome do you help them achieve?',
    feeds: ['Dialed-In Offer (outcome)', 'Mission', '50 Hooks (transformation)'],
    prefill: [{ raw: 'outcomeDelivered' }],
  },
  {
    id: 'proof', group: 'buyer', kind: 'long', skillField: 'best_client_feedback', typeform: [16],
    prompt: 'What do your best clients say about you? Your best result?',
    placeholder: 'A quote, the thing they always tell you, a named client and a number.',
    help: 'Real proof only. If you have none yet, say so and we will leave a slot for it.',
    feeds: ['Brand Voice (their words)', 'Core Values', 'VSL (proof block)'],
    prefill: [{ raw: 'bestClientFeedback' }],
  },
  {
    id: 'common_objections', group: 'buyer', kind: 'long', skillField: 'common_objections', typeform: [17],
    prompt: 'What hesitations do leads have before buying?',
    placeholder: '"Too expensive", "not the right time", "I can do it myself"…',
    feeds: ['Positioning (counter-narrative)', 'VSL (objections)', 'FAQ videos'],
  },
  {
    id: 'customer_channels', group: 'buyer', kind: 'multi', options: CHANNEL_OPTIONS, skillField: 'customer_channels', typeform: [18],
    prompt: 'Where do your ideal clients spend time?',
    feeds: ['Customer Journey', 'Content Pillars (platforms)'],
    prefill: [{ raw: 'customerChannels' }],
  },

  // ── Your market
  {
    id: 'top_competitors', group: 'market', kind: 'long', skillField: 'top_competitors', typeform: [23, 24],
    prompt: 'Your top 3 competitors, and what they do well',
    placeholder: 'Names or sites. What you admire, and what you would do differently.',
    feeds: ['Competitive Matrix', 'Positioning', 'Market Research'],
    prefill: [{ raw: 'topCompetitors' }],
  },
  {
    id: 'marketing_gap', group: 'market', kind: 'long', skillField: 'marketing_gap', typeform: [12],
    prompt: 'What should your marketing do that it is not doing today?',
    feeds: ['3 Immediate Action Steps', '50 Hooks', 'Content Pillars'],
    prefill: [{ column: 'marketing_gap' }, { raw: 'marketingGap' }],
  },
  {
    id: 'tried_already', group: 'market', kind: 'long', skillField: 'tried_already',
    prompt: 'What have you already tried that did not work?',
    feeds: ['Internal DNA', 'VSL (the "without" clause)'],
    prefill: [{ column: 'tried_already' }],
  },
  {
    id: 'customer_research', group: 'market', kind: 'choice', options: RESEARCH_OPTIONS, skillField: 'customer_research_status', typeform: [27],
    prompt: 'Have you interviewed or surveyed clients recently?',
    feeds: ['Internal DNA (flag)', '3 Immediate Action Steps'],
    prefill: [{ raw: 'customerResearchStatus' }],
  },

  // ── How you sound
  {
    id: 'brand_adjectives', group: 'voice', kind: 'multi', options: ADJECTIVE_OPTIONS, max: 5, required: true, skillField: 'brand_adjectives', typeform: [29, 28],
    prompt: 'Pick 3–5 words for how your brand should sound',
    feeds: ['Brand Voice (personality)', 'Internal DNA'],
    prefill: [{ raw: 'brandAdjectives' }],
  },
  {
    id: 'brand_tone', group: 'voice', kind: 'choice', options: TONE_OPTIONS, skillField: 'brand_tone', typeform: [30],
    prompt: 'Which tone fits best?',
    feeds: ['Brand Voice (tone spectrum)'],
    prefill: [{ raw: 'brandTone' }],
  },
  {
    id: 'brands_admired', group: 'voice', kind: 'long', skillField: 'brands_admired', typeform: [31],
    prompt: 'Brands or voices you admire, and why',
    feeds: ['Brand Voice (reference voices)', 'Positioning'],
    prefill: [{ raw: 'brandsAdmired' }],
  },
  {
    id: 'has_mvv', group: 'voice', kind: 'choice', options: MVV_OPTIONS, skillField: 'has_mvv', typeform: [21],
    prompt: 'Do you have a mission, vision or values written down?',
    feeds: ['Mission, Vision, Values (refine vs build)'],
    prefill: [{ raw: 'hasMvv' }],
  },
  {
    id: 'mvv_files', group: 'voice', kind: 'files', skillField: 'mvv_upload', showIf: { id: 'has_mvv', in: ['Yes, written down'] }, typeform: [22],
    prompt: 'Add them here',
    help: 'Upload the file, or paste a link or the text into "Anything else". We refine what you have instead of starting over.',
    feeds: ['Mission, Vision, Values'],
  },
  {
    id: 'materials', group: 'voice', kind: 'multi', options: MATERIAL_OPTIONS, skillField: 'existing_materials', typeform: [25],
    prompt: 'What do you already have that we should review?',
    feeds: ['Website Analysis (working assets)', 'Internal DNA'],
  },
  {
    id: 'materials_files', group: 'voice', kind: 'files', skillField: 'materials_upload', typeform: [26],
    showIf: { id: 'materials', in: MATERIAL_OPTIONS.filter((o) => o !== 'None yet') },
    prompt: 'Upload or link them (optional)',
    help: 'Decks, copy, testimonials. Logos and brand guides can wait for the next step.',
    feeds: ['Website Analysis', 'Internal DNA'],
  },
  {
    id: 'anything_else', group: 'voice', kind: 'long', skillField: 'anything_else',
    prompt: 'Anything else we should know?',
    feeds: ['Internal DNA'],
    prefill: [{ raw: 'anythingElse' }],
  },
];

// ── Brand questionnaire ("I need help with my brand") ─────────────────
// Built from what the brandkit skill reasons about before it draws anything:
// category, audience, emotional promise, visual world, metaphor, palette
// discipline and what to avoid (~/.claude/skills/brandkit/SKILL.md).

export const VISUAL_MODES = [
  'Dark and cinematic',
  'Light and editorial',
  'Luxury and minimal',
  'Bold and energetic',
  'Warm and natural',
  'Technical and precise',
];

export const BRAND_START_OPTIONS = ['Start fresh', 'Refresh the logo I have', 'Keep my logo, build the rest'];

export const BRAND_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'brand_start', group: 'brand', kind: 'choice', options: BRAND_START_OPTIONS, required: true, skillField: 'brand_start',
    prompt: 'Where are we starting from?',
    help: 'If you have a logo, upload it anyway. We build around it.',
    feeds: ['Logo concept'],
  },
  {
    id: 'brand_feeling', group: 'brand', kind: 'long', required: true, skillField: 'emotional_promise',
    prompt: 'How should someone feel after dealing with you?',
    placeholder: 'Relieved, taken care of, ahead of everyone else…',
    feeds: ['Brand essence', 'Tagline'],
  },
  {
    id: 'visual_mode', group: 'brand', kind: 'choice', options: VISUAL_MODES, required: true, skillField: 'visual_mode',
    prompt: 'Which world should it look like?',
    feeds: ['Visual mode', 'Image direction'],
  },
  {
    id: 'colors_like', group: 'brand', kind: 'text', skillField: 'colors_like',
    prompt: 'Colors you love, or already use',
    placeholder: 'Navy and gold, the green in our signage',
    feeds: ['Color system'],
  },
  {
    id: 'colors_avoid', group: 'brand', kind: 'text', skillField: 'colors_avoid',
    prompt: 'Colors to avoid',
    placeholder: 'A competitor’s red, anything neon',
    feeds: ['Color system'],
  },
  {
    id: 'symbol', group: 'brand', kind: 'long', skillField: 'core_metaphor',
    prompt: 'Anything that means something to the business?',
    placeholder: 'A place, an object, a story, the reason behind the name.',
    help: 'Good logos come from meaning, not decoration. This is where the mark comes from.',
    feeds: ['Core metaphor', 'Logo concept'],
  },
  {
    id: 'brand_looks_admired', group: 'brand', kind: 'long', skillField: 'brands_admired_visual',
    prompt: 'Brands whose look you admire, in or out of your industry',
    feeds: ['Reference quality bar'],
  },
  {
    id: 'brand_never', group: 'brand', kind: 'text', skillField: 'avoid',
    prompt: 'Your brand should never look…',
    placeholder: 'Cheap, corporate, cartoonish',
    feeds: ['Anti-patterns'],
  },
  {
    id: 'tagline', group: 'brand', kind: 'text', skillField: 'tagline',
    prompt: 'A tagline you use or like (optional)',
    feeds: ['Tagline'],
  },
];

// ── helpers ───────────────────────────────────────────────────────────
export type Answers = Record<string, string | string[]>;

export function isAnswered(v: string | string[] | undefined | null): boolean {
  return Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim());
}

/** A question is live when it has no condition, or its condition's answer matches. */
export function isShown(q: OnboardingQuestion, answers: Answers): boolean {
  if (!q.showIf) return true;
  const v = answers[q.showIf.id];
  const list = Array.isArray(v) ? v : v ? [v] : [];
  return list.some((x) => q.showIf!.in.includes(x));
}

export function missingRequired(questions: OnboardingQuestion[], answers: Answers): OnboardingQuestion[] {
  return questions.filter((q) => q.required && isShown(q, answers) && !isAnswered(answers[q.id]));
}

export function questionById(id: string): OnboardingQuestion | undefined {
  return INTAKE_QUESTIONS.find((q) => q.id === id) ?? BRAND_QUESTIONS.find((q) => q.id === id);
}

/** A 'files' answer entry: "name::url". The url is a Drive link or a pasted one. */
export function parseFileEntry(entry: string): { name: string; url: string } {
  const i = entry.lastIndexOf('::');
  return i === -1 ? { name: entry, url: entry } : { name: entry.slice(0, i), url: entry.slice(i + 2) };
}

/** "$350k", "250-500K", "1.2M" → one of REVENUE_OPTIONS, or null when it can't tell. */
export function normalizeRevenue(raw: string): string | null {
  const s = raw.toLowerCase().replace(/,/g, '');
  const exact = REVENUE_OPTIONS.find((o) => o.toLowerCase() === s.trim());
  if (exact) return exact;
  if (/pre[- ]?rev|no revenue|^\$?0$/.test(s)) return 'Pre-revenue';
  const nums = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(k|m|mm|million|thousand)?/g)]
    .map((m) => {
      const n = Number(m[1]);
      const unit = m[2] ?? '';
      return unit.startsWith('m') ? n * 1_000_000 : unit === 'k' || unit === 'thousand' ? n * 1000 : n;
    })
    .filter((n) => n >= 1000);
  if (!nums.length) return null;
  // "Under $1M" could be $90K or $900K: only an "under" at or below $250K is decisive.
  if (/under|less than|below|</.test(s)) return Math.max(...nums) <= 250_000 ? 'Under $250K' : null;
  // A range uses its midpoint, so "250K-500K" lands in $250K–$1M.
  const v = nums.length > 1 ? (nums[0] + nums[nums.length - 1]) / 2 : nums[0];
  if (v < 250_000) return 'Under $250K';
  if (v < 1_000_000) return '$250K–$1M';
  if (v < 3_000_000) return '$1M–$3M';
  if (v < 8_000_000) return '$3M–$8M';
  return '$8M+';
}

/** Fit a raw CRM value to the question: choices must match an option, multi-selects become arrays. */
export function fitAnswer(q: OnboardingQuestion, raw: unknown): string | string[] | null {
  if (raw === null || raw === undefined) return null;
  if (q.kind === 'files') return null;
  if (q.kind === 'multi') {
    const list = Array.isArray(raw) ? raw.map(String) : String(raw).split(/[,;/]/).map((x) => x.trim());
    const picked = (q.options ?? []).filter((o) => list.some((x) => x.toLowerCase() === o.toLowerCase()));
    return picked.length ? picked.slice(0, q.max ?? picked.length) : null;
  }
  const s = (Array.isArray(raw) ? raw.join(', ') : String(raw)).trim();
  if (!s) return null;
  if (q.id === 'annual_revenue') return normalizeRevenue(s);
  if (q.kind === 'choice') {
    const hit = (q.options ?? []).find((o) => o.toLowerCase() === s.toLowerCase());
    if (hit) return hit;
    if (q.id === 'years_in_business') {
      const n = Number(s.match(/\d+(\.\d+)?/)?.[0]);
      if (!Number.isFinite(n)) return null;
      return n < 1 ? YEARS_OPTIONS[0] : n < 3 ? YEARS_OPTIONS[1] : n < 10 ? YEARS_OPTIONS[2] : YEARS_OPTIONS[3];
    }
    return null;
  }
  return s.slice(0, 4000);
}

/** Prefill from a crm.leads row (columns + raw_responses). Only fills what has a real value. */
export function prefillFromLead(lead: Record<string, unknown> | null, questions: OnboardingQuestion[]): Answers {
  if (!lead) return {};
  const raw = (lead.raw_responses && typeof lead.raw_responses === 'object' ? lead.raw_responses : {}) as Record<string, unknown>;
  const out: Answers = {};
  for (const q of questions) {
    for (const src of q.prefill ?? []) {
      const v = fitAnswer(q, src.column ? lead[src.column] : src.raw ? raw[src.raw] : null);
      if (v !== null && isAnswered(v)) {
        out[q.id] = v;
        break;
      }
    }
  }
  return out;
}

function flat(q: OnboardingQuestion, v: string | string[]): string {
  if (q.kind === 'files') return (v as string[]).map((e) => { const f = parseFileEntry(e); return `${f.name} (${f.url})`; }).join('; ');
  return Array.isArray(v) ? v.join(', ') : String(v);
}

/** Answers keyed by the skill's own field names, for the generation worker. */
export function toSkillFields(questions: OnboardingQuestion[], answers: Answers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of questions) {
    const v = answers[q.id];
    if (isShown(q, answers) && isAnswered(v)) out[q.skillField] = flat(q, v);
  }
  return out;
}
