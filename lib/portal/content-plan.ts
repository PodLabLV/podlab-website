/**
 * Content plan: the client's calendar of what goes out when. Pure helpers and
 * types; reads and writes are in content-plan-server.ts.
 *
 * A piece moves planned → scripted → recorded → in edit → posted. It becomes a
 * CRM card (editing work) only when it's recorded and staff send it on.
 */

export const FORMATS = ['short', 'hook', 'faq', 'authority', 'story', 'ad', 'long', 'carousel', 'email'] as const;
export type Format = (typeof FORMATS)[number];
export const JOBS = ['attract', 'educate', 'convert', 'retain'] as const;
export type Job = (typeof JOBS)[number];
export const CONTENT_STATUSES = ['planned', 'scripted', 'recorded', 'in edit', 'posted', 'skipped'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const FORMAT_LABEL: Record<Format, string> = {
  short: 'Short',
  hook: 'Hook',
  faq: 'FAQ',
  authority: 'Authority',
  story: 'Story',
  ad: 'Ad',
  long: 'Long form',
  carousel: 'Carousel',
  email: 'Email',
};

export const JOB_LABEL: Record<Job, string> = { attract: 'Attract', educate: 'Educate', convert: 'Convert', retain: 'Retain' };

export interface ContentItem {
  id: string;
  publishOn: string;
  pillar: string;
  format: Format;
  title: string;
  hook: string | null;
  job: Job;
  cta: string | null;
  status: ContentStatus;
  scriptId: string | null;
  crmCardId: string | null;
  notes: string | null;
  updatedAt: string;
}

/** Monday of the item's week (UTC), as YYYY-MM-DD: the calendar groups by week. */
export function weekOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function groupByWeek(items: ContentItem[]): Array<{ week: string; items: ContentItem[] }> {
  const m = new Map<string, ContentItem[]>();
  for (const i of [...items].sort((a, b) => a.publishOn.localeCompare(b.publishOn))) {
    const w = weekOf(i.publishOn);
    m.set(w, [...(m.get(w) ?? []), i]);
  }
  return [...m].map(([week, list]) => ({ week, items: list }));
}

/** A piece going out within `days` that has no script yet and isn't recorded: the plan is behind. */
export function needsScript(i: ContentItem, now = Date.now(), days = 5): boolean {
  if (i.status !== 'planned') return false;
  const due = Date.parse(`${i.publishOn}T23:59:59Z`);
  return due - now <= days * 86_400_000;
}

/** Share of each job across the plan, so TipTop can spot a calendar that's all attract and no convert. */
export function jobMix(items: ContentItem[]): Record<Job, number> {
  const live = items.filter((i) => i.status !== 'skipped');
  const out = { attract: 0, educate: 0, convert: 0, retain: 0 } as Record<Job, number>;
  for (const i of live) out[i.job] += 1;
  return out;
}
