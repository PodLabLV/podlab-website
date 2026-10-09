// TipTop (portal edition): limits and tool input schemas. Pure, so the route,
// the tools, the panel and the unit tests share them.

import { z } from 'zod';
import { PRODUCT_KEYS } from '@/lib/growth-chain';

/** Hard limits the route enforces. Mirrored in the panel so the client is told first. */
export const LIMITS = {
  maxUserTurns: 40,
  maxMessageChars: 2000,
  /** Room for a draft_script call carrying a full script, or a batch of intake answers. */
  maxOutputTokens: 4500,
  /** Read the file, read a section or two, then plan, draft and save: a guide turn is several steps. */
  maxSteps: 12,
  requestsPerMinute: 20,
  timeoutMs: 240_000,
  /** Cap on the history the browser may send back. */
  maxMessages: 160,
} as const;

export const STRATEGY_CALL_URL = 'https://calendly.com/podlablv/strategy-call';
export const CLARITY_CALL_URL = 'https://calendly.com/podlablv/essentialslab-clarity-call';

/** Portal pages TipTop can send someone to. */
export const PAGES = {
  dashboard: { href: '/portal', label: 'Dashboard' },
  growth: { href: '/portal/growth', label: 'Growth Chain' },
  document: { href: '/portal/document', label: 'Clarity Document' },
  intake: { href: '/portal/intake', label: 'Intake' },
  delivery: { href: '/portal/delivery', label: 'Delivery' },
  production: { href: '/portal/production', label: 'Production' },
  brand: { href: '/portal/brand', label: 'Brand' },
  actions: { href: '/portal/actions', label: 'Action Items' },
  deliverables: { href: '/portal/deliverables', label: 'Deliverables' },
  scripts: { href: '/portal/scripts', label: 'Scripts' },
  progress: { href: '/portal/progress', label: 'Progress' },
  reports: { href: '/portal/reports', label: 'Reports' },
  invoices: { href: '/portal/invoices', label: 'Invoices' },
  profile: { href: '/portal/profile', label: 'Profile' },
  plan: { href: '/portal/plan', label: 'Game Plan' },
} as const;
export type PageKey = keyof typeof PAGES;
const PAGE_KEYS = Object.keys(PAGES) as [PageKey, ...PageKey[]];

const id = z.string().trim().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Use an id from the overview.');

export const getOverviewInput = z.object({});

export const goToInput = z.object({
  page: z.enum(PAGE_KEYS).describe('Which portal page.'),
  script_id: id.optional().describe('With page "scripts": open this one script directly.'),
  label: z.string().trim().max(60).optional().describe('Button text, if the default page name is not clear enough.'),
});

export const bookingInput = z.object({
  call: z.enum(['strategy', 'clarity']).describe('"strategy" for a strategy call with Hiram (default); "clarity" for the EssentialsLab clarity call.'),
});

export const readDocumentInput = z.object({
  heading: z.string().trim().max(120).optional().describe('Return the raw HTML of the section under this heading.'),
  search: z.string().trim().max(300).optional().describe('Return raw HTML snippets around where this phrase appears.'),
});

export const documentHistoryInput = z.object({});

export const editDocumentInput = z.object({
  edits: z
    .array(
      z.object({
        find: z.string().min(3).max(3000).describe('Exact text copied from the document SOURCE (as read_document returns it), tags and entities included. Must occur exactly once.'),
        replace: z.string().max(6000).describe('What replaces it. Keep the same markup around the words; text only, no scripts or styling.'),
      }),
    )
    .min(1)
    .max(12),
  summary: z.string().trim().min(3).max(300).describe('One line, in plain words, of what changes and why (shown to the client and the team).'),
});

export const restoreVersionInput = z.object({
  version_no: z.number().int().min(1).describe('The version to bring back. Restoring creates a new version; nothing is deleted.'),
});

export const updateProfileInput = z.object({
  first_name: z.string().trim().max(80).optional(),
  last_name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  business_name: z.string().trim().max(200).optional(),
  website: z.string().trim().max(300).optional(),
  timezone: z.string().trim().max(64).optional().describe('IANA name, e.g. America/Los_Angeles.'),
});

export const sendRevisionInput = z.object({
  target: z.enum(['video', 'script', 'deliverable']).describe('video = a Production card; script = a script; deliverable = a file in Deliverables.'),
  id: id.describe('The id from the overview.'),
  note: z.string().trim().min(2).max(4000).describe("The client's note, in their words. Do not embellish."),
  timestamp: z.string().trim().max(12).optional().describe('For a video or a video deliverable: the moment, like "0:42" or "1:05:10".'),
  quote: z.string().trim().max(240).optional().describe('For a script: the exact line the note is about, copied from the script.'),
});

export const completeActionItemInput = z.object({
  id: id.describe('The action item id from the overview.'),
  done: z.boolean().default(true).describe('false reopens it.'),
});

export const recommendInput = z.object({
  product: z.enum(PRODUCT_KEYS as [string, ...string[]]).describe('The product key that unlocks what they need.'),
  why: z.string().trim().min(5).max(300).describe('One sentence tying it to their constraint or question.'),
  client_asked: z.boolean().describe('True only if the client asked about buying, upgrading, pricing or what would get them results.'),
});

export const flagInput = z.object({
  summary: z.string().trim().min(5).max(1500).describe('What the team needs to know or answer, with any ids or titles involved.'),
  urgency: z.enum(['normal', 'high']).default('normal'),
});

// ── Business guide ─────────────────────────────────────────────────────

export const readIntakeInput = z.object({
  section: z.string().trim().max(120).optional().describe('Only this section (as shown in the result). Omit for all.'),
});

export const saveIntakeAnswersInput = z.object({
  answers: z
    .array(
      z.object({
        item_id: id.describe('The question id from read_intake.'),
        value: z.string().trim().min(1).max(8000).describe("The answer, in the client's voice, built from what they told you. Never invent facts or numbers."),
      }),
    )
    .min(1)
    .max(12),
  submit: z.boolean().default(false).describe('Also submit the intake. Only when every required question is answered and the client said to submit.'),
});

export const updateBrandKitInput = z.object({
  colors: z.array(z.object({ hex: z.string().trim().max(9), name: z.string().trim().max(40).default('') })).max(16).optional(),
  fonts: z.array(z.object({ name: z.string().trim().max(60), use: z.string().trim().max(40).default('') })).max(8).optional(),
  notes: z.string().trim().max(4000).optional().describe("Do's and don'ts, in their words."),
  mode: z.enum(['merge', 'replace']).default('merge').describe('merge adds to what is there (same hex or font name is updated); replace swaps the list.'),
});

import { PILLARS } from '@/lib/portal/game-plan';
export { PILLARS };

export const createActionItemsInput = z.object({
  pillar: z.enum(PILLARS).describe('Which part of the game plan these belong to.'),
  coaching: z
    .string()
    .trim()
    .min(60)
    .max(900)
    .describe('Shown to the client above the actions: the goal as a number, the math behind it (e.g. 4 seats ≈ 12 calls ≈ 40 conversations), why this order, and the first move today. 3 to 6 short lines, second person, energetic, no fluff.'),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(3).max(160).describe('A verb-first, finishable action: "Write the 3 objections you hear most".'),
        detail: z.string().trim().max(600).default('').describe('Why it matters and what done looks like, in one or two sentences.'),
        effort: z.string().trim().max(40).default('').describe('Rough size, e.g. "30 min", "2 hours".'),
        due: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('YYYY-MM-DD, agreed with the client.'),
      }),
    )
    .min(1)
    .max(8),
});

export const setGamePlanInput = z.object({
  pillar: z.enum(PILLARS),
  outcome: z.string().trim().min(8).max(200).describe('The 90-day outcome as a sentence with a number: "4 more cohort seats by Nov 30".'),
  metric: z.string().trim().max(60).optional().describe('What gets counted, plural noun: "seats sold", "booked calls", "videos posted".'),
  baseline: z.number().optional().describe('Where it stands today.'),
  target: z.number().optional().describe('The number to hit.'),
  due_on: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('The finish line, YYYY-MM-DD (about 90 days out unless they chose otherwise).'),
  priorities: z.array(z.string().trim().min(3).max(160)).min(1).max(5).describe('Three priorities, the big rocks, in order.'),
  coaching: z.string().trim().min(60).max(900).describe('Shown to the client on the card: why this number, the math, why these priorities in this order.'),
});

export const checkInGamePlanInput = z.object({
  pillar: z.enum(PILLARS),
  current: z.number().nullable().describe('The number now, in the plan\'s metric. null if they don\'t have it.'),
  note: z.string().trim().min(10).max(500).describe('One or two lines: what moved, what didn\'t, the next move. Their words, tightened.'),
});

export const SCRIPT_KINDS = ['hook', 'faq', 'short', 'social', 'ad', 'vsl', 'email', 'founder'] as const;

export const draftScriptInput = z.object({
  title: z.string().trim().min(3).max(160),
  kind: z.enum(SCRIPT_KINDS),
  body: z.string().trim().min(40).max(12000).describe('The script, spoken-word, blocks separated by blank lines. PodLab voice rules apply.'),
  note: z.string().trim().max(400).default('').describe('One line for the PodLab reviewer: the goal, the angle, what it is built from.'),
});

export const readScriptInput = z.object({ id: id.describe('Script id from the overview.') });

export const readClientFileInput = z.object({});

/** Tools that change something. Each one shows the client a confirm card first. */
export const WRITE_TOOLS = [
  'edit_document',
  'restore_document_version',
  'update_profile',
  'send_revision',
  'complete_action_item',
  'save_intake_answers',
  'update_brand_kit',
  'create_action_items',
  'draft_script',
  'set_game_plan',
  'check_in_game_plan',
] as const;
export type WriteTool = (typeof WRITE_TOOLS)[number];
