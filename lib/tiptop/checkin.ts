// TipTop's weekly check-in, the pure half: which clients get one, and the
// opening message and notification built from their own numbers. No model
// call: the opener is written from the data, so a weekly cron over every
// client costs nothing. She takes it from there when they reply.

import { fmtNumber, paceStatus, type GamePlan, type PlanStatus } from '@/lib/portal/game-plan';

export interface CheckinItem {
  id: string;
  title: string;
  dueOn: string | null;
}

export interface CheckinInput {
  firstName: string | null;
  plans: GamePlan[];
  openItems: CheckinItem[];
  /** YYYY-MM-DD in the client's day. */
  today: string;
  now: number;
}

export interface Checkin {
  message: string;
  title: string;
  body: string;
}

/** ISO week of a date, e.g. 2026-W42. Stable dedupe key for one check-in a week. */
export function weekKey(now: number, timeZone = 'America/Los_Angeles'): string {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
  const d = new Date(`${ymd}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day + 3); // Thursday of this week decides the year
  const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function localDate(now: number, timeZone = 'America/Los_Angeles'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
  }
}

export const isOverdue = (i: CheckinItem, today: string) => Boolean(i.dueOn && i.dueOn < today);

export const activePlans = (plans: GamePlan[]) => plans.filter((p) => p.status !== 'done');

/** Anything to hold them to? A client with no live plan and no open item gets no check-in. */
export function wantsCheckin(plans: GamePlan[], openItems: CheckinItem[]): boolean {
  return activePlans(plans).length > 0 || openItems.length > 0;
}

const shortDate = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const RANK: Record<PlanStatus, number> = { 'off track': 0, 'at risk': 1, 'on track': 2, done: 3 };

function planLine(p: GamePlan, now: number): string {
  const status = paceStatus(p, now);
  const num = p.target !== null ? `${fmtNumber(p.current ?? p.baseline)} of ${fmtNumber(p.target)}${p.metric ? ` ${p.metric}` : ''}` : p.outcome;
  return `${p.pillar}: ${num}${p.dueOn ? ` by ${shortDate(p.dueOn)}` : ''}, ${status}`;
}

export function buildCheckin(x: CheckinInput): Checkin {
  const plans = activePlans(x.plans).sort((a, b) => RANK[paceStatus(a, x.now)] - RANK[paceStatus(b, x.now)]);
  const overdue = x.openItems.filter((i) => isOverdue(i, x.today)).sort((a, b) => (a.dueOn ?? '').localeCompare(b.dueOn ?? ''));
  const L: string[] = [];
  L.push(`${x.firstName ? `${x.firstName}, it's` : "It's"} check-in day. Here's what I'm holding you to this week.`);
  if (plans.length) L.push(['Your numbers:', ...plans.map((p) => `- ${planLine(p, x.now)}`)].join('\n'));
  if (overdue.length) {
    const shown = overdue.slice(0, 4).map((i) => `- "${i.title}" (was due ${shortDate(i.dueOn!)})`);
    L.push([`Past due (${overdue.length}):`, ...shown, ...(overdue.length > 4 ? [`- and ${overdue.length - 4} more`] : [])].join('\n'));
  }
  const upcoming = x.openItems.filter((i) => !isOverdue(i, x.today));
  if (upcoming.length && !plans.length && !overdue.length) {
    // Nothing else to anchor on: name the next few, soonest first.
    const next = [...upcoming].sort((a, b) => (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999')).slice(0, 3);
    L.push(
      [
        `On your list (${upcoming.length}):`,
        ...next.map((i) => `- "${i.title}"${i.dueOn ? ` (due ${shortDate(i.dueOn)})` : ''}`),
        ...(upcoming.length > 3 ? [`- and ${upcoming.length - 3} more`] : []),
      ].join('\n'),
    );
  } else if (upcoming.length) {
    L.push(`${upcoming.length} more open on your action list.`);
  }

  // One question, aimed at the thing most likely to slip.
  const lead = plans[0];
  let ask: string;
  if (lead && lead.target !== null) ask = `Start with ${lead.pillar}: ${lead.metric ? `how many ${lead.metric} so far?` : "what's the number today?"}`;
  else if (overdue.length) ask = `Start with "${overdue[0].title}": done, still on, or should we move it?`;
  else if (lead) ask = `Start with ${lead.pillar}: what moved this week?`;
  else ask = 'Which one gets finished this week?';
  L.push(ask);

  const bits = [
    ...plans.slice(0, 2).map((p) => (p.target !== null ? `${p.pillar} ${fmtNumber(p.current ?? p.baseline)}/${fmtNumber(p.target)} (${paceStatus(p, x.now)})` : `${p.pillar} (${paceStatus(p, x.now)})`)),
    overdue.length ? `${overdue.length} past due` : null,
  ].filter(Boolean);
  return {
    message: L.join('\n\n'),
    title: 'Weekly check-in with TipTop',
    body: bits.length ? `${bits.join(' · ')}. Give her this week's numbers.` : `${x.openItems.length} open on your action list. Give her this week's update.`,
  };
}
