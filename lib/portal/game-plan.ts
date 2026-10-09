/**
 * Game Plan: one 90-day plan per pillar. The outcome is a number with a finish
 * line; the weekly actions live in Action Items (source "Game Plan · <pillar>").
 * Pure helpers here; the reads and writes are in game-plan-server.ts.
 */

export const PILLARS = ['People', 'Operations', 'Sales', 'Marketing', 'Content'] as const;
export type Pillar = (typeof PILLARS)[number];
export type PlanStatus = 'on track' | 'at risk' | 'off track' | 'done';

export const PILLAR_BLURB: Record<Pillar, string> = {
  People: 'Who owns what, what only you can do, and the next seat to fill.',
  Operations: 'How work moves from first contact to result, and where it waits.',
  Sales: 'Offer, pipeline math, follow-up. The number of yeses.',
  Marketing: 'One message, a few channels, and leads you can count.',
  Content: 'What you record, how often, and what each piece is for.',
};

/** The question TipTop opens with when a client starts a pillar from the page. */
export const PILLAR_STARTER: Record<Pillar, string> = {
  People: "Let's build my People game plan for the next 90 days.",
  Operations: "Let's build my Operations game plan for the next 90 days.",
  Sales: "Let's build my Sales game plan for the next 90 days.",
  Marketing: "Let's build my Marketing game plan for the next 90 days.",
  Content: "Let's plan my content for the next 90 days.",
};

export interface GamePlan {
  id: string;
  pillar: Pillar;
  outcome: string;
  metric: string | null;
  baseline: number | null;
  target: number | null;
  current: number | null;
  dueOn: string | null;
  priorities: string[];
  status: PlanStatus;
  lastCheckInAt: string | null;
  lastCheckIn: string | null;
  createdAt: string;
  updatedAt: string;
}

const DAY = 86_400_000;

/** 0–1 of the way from baseline to target. Null when there's no number to read. */
export function progress(p: Pick<GamePlan, 'baseline' | 'target' | 'current'>): number | null {
  if (p.target === null || p.current === null) return null;
  const base = p.baseline ?? 0;
  if (p.target === base) return p.current >= p.target ? 1 : 0;
  return Math.max(0, Math.min(1, (p.current - base) / (p.target - base)));
}

/** 0–1 of the way from the plan's start to its finish line. */
export function elapsed(p: Pick<GamePlan, 'createdAt' | 'dueOn'>, now = Date.now()): number | null {
  if (!p.dueOn) return null;
  const start = Date.parse(p.createdAt);
  const end = Date.parse(`${p.dueOn}T23:59:59Z`);
  if (!(end > start)) return 1;
  return Math.max(0, Math.min(1, (now - start) / (end - start)));
}

/**
 * Pace, not vibes: compare how far the number has moved with how much of the
 * clock has run. Hit the target → done. Within 15 points of pace → on track;
 * within 35 → at risk; worse → off track. No number yet → on track until a
 * third of the clock has gone, then at risk.
 */
export function paceStatus(p: Pick<GamePlan, 'baseline' | 'target' | 'current' | 'createdAt' | 'dueOn'>, now = Date.now()): PlanStatus {
  const prog = progress(p);
  if (prog !== null && prog >= 1) return 'done';
  const time = elapsed(p, now);
  if (time === null) return 'on track';
  if (prog === null) return time > 0.34 ? 'at risk' : 'on track';
  const gap = time - prog;
  if (gap <= 0.15) return 'on track';
  if (gap <= 0.35) return 'at risk';
  return 'off track';
}

/** A weekly check-in is due once a week has passed since the last one (or since the plan was set). */
export function checkInDue(p: Pick<GamePlan, 'lastCheckInAt' | 'createdAt' | 'status'>, now = Date.now()): boolean {
  if (p.status === 'done') return false;
  const last = Date.parse(p.lastCheckInAt ?? p.createdAt);
  return now - last >= 7 * DAY;
}

export function fmtNumber(n: number | null): string {
  if (n === null) return '–';
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
