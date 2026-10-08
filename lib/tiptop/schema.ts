// TipTop (portal edition): limits and tool input schemas. Pure, so the route,
// the tools, the panel and the unit tests share them.

import { z } from 'zod';
import { PRODUCT_KEYS } from '@/lib/growth-chain';

/** Hard limits the route enforces. Mirrored in the panel so the client is told first. */
export const LIMITS = {
  maxUserTurns: 40,
  maxMessageChars: 2000,
  /** Room for an edit_document call carrying a few find/replace pairs. */
  maxOutputTokens: 1600,
  maxSteps: 5,
  requestsPerMinute: 20,
  timeoutMs: 50_000,
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
  actions: { href: '/portal/actions', label: 'Action Items' },
  deliverables: { href: '/portal/deliverables', label: 'Deliverables' },
  scripts: { href: '/portal/scripts', label: 'Scripts' },
  progress: { href: '/portal/progress', label: 'Progress' },
  reports: { href: '/portal/reports', label: 'Reports' },
  invoices: { href: '/portal/invoices', label: 'Invoices' },
  profile: { href: '/portal/profile', label: 'Profile' },
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

/** Tools that change something. Each one shows the client a confirm card first. */
export const WRITE_TOOLS = ['edit_document', 'restore_document_version', 'update_profile', 'send_revision', 'complete_action_item'] as const;
export type WriteTool = (typeof WRITE_TOOLS)[number];
