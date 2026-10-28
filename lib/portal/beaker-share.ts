// Pure helpers for the Beaker dashboard: the share messages, the 4-step
// referral track, the next points goal and the get-paid checklist. No fetch,
// no React, so scripts/beaker-share.test.ts can run them as they ship.
// A copy of podlab-crm src/lib/beakerShare.ts. Keep the two in step.

export const TRACK = ["Sent", "Applied", "Filmed", "Bought"] as const;
export type TrackStep = 0 | 1 | 2 | 3;

// Every stage a referred lead can sit on, across the podcast, sales and FREE
// VSL boards (src/data/stages.ts). Anything not listed reads as "Sent".
const APPLIED = new Set([
  "S0-APPLIED", "S1-QUALIFIED", "S2-BOOKED", "S3-RESEARCH", "S4-SCRIPTS", "S5-APPROVED", "NO-SHOW", "DECLINED", "EXPIRED",
  "DISCOVERY CALL BOOKED", "RESCHEDULE", "DISCOVERY CALL COMPLETE", "INVITED TO PODCAST", "BOOKED PODCAST",
]);
const FILMED = new Set([
  "S6-FILMED", "S7-FINISH", "PENDING-NEG", "CLOSED-LOST",
  "SHOT PODCAST", "SALES OPPORTUNITY", "OPPORTUNITY", "INVITED TO SALES CALL", "SALES CALL BOOKED", "PENDING/NEGOTIATIONS", "CLOSED LOST",
]);
const BOUGHT = new Set(["CLOSED-WON", "CLOSED WON"]);

export function trackStep(stage: string | null | undefined, earnedCents = 0): TrackStep {
  const s = String(stage || "").trim().toUpperCase();
  if (earnedCents > 0 || BOUGHT.has(s)) return 3;
  if (FILMED.has(s)) return 2;
  if (APPLIED.has(s)) return 1;
  return 0;
}

// "Ashley Hall — Flame Entertainment" → "Ashley H.", the same rule the points
// events use, so a referral row can be matched to its points.
export function shortName(name: string | null | undefined): string {
  const person = String(name || "").split(/\s+[—–-]\s+/)[0].trim();
  const parts = person.split(/\s+/).filter(Boolean);
  if (!parts.length) return "Someone you sent";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

// A points event is proof of a step even when the card's stage lags behind.
export function referralStep(
  r: { name: string; stage: string; earnedCents?: number },
  recent: Array<{ name: string; kind: "filmed" | "bought" }> = [],
): TrackStep {
  let step = trackStep(r.stage, r.earnedCents || 0);
  const short = shortName(r.name);
  for (const e of recent) {
    if (e.name !== short) continue;
    if (e.kind === "bought") step = 3;
    else if (step < 2) step = 2;
  }
  return step;
}

// ── sharing ──
const DISCLOSURE = "(Full disclosure: I may earn a referral fee if you work with them.)";

export function shareText(url: string): string {
  return `PodLab is a video studio in Las Vegas. They film owners once and turn it into sales videos that do the explaining for you. Their free Business Diagnostic takes about 4 minutes: ${url} ${DISCLOSURE}`;
}

export function smsHref(url: string): string {
  return `sms:?&body=${encodeURIComponent(shareText(url))}`;
}

export function mailtoHref(url: string, firstName = ""): string {
  const subject = "Worth 5 minutes";
  const body = [
    "Hi,",
    "",
    "PodLab is a studio in Las Vegas. They record you once and build the videos and pages that sell for you.",
    "",
    "Their free Business Diagnostic takes about 4 minutes and names the one thing holding the business back:",
    url,
    "",
    "Happy to introduce you to Hiram, the founder, if you'd rather talk first.",
    "",
    DISCLOSURE,
    ...(firstName ? ["", firstName] : []),
  ].join("\n");
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// The one link the big button copies: the Diagnostic, as the starter kit uses.
export function primaryLink(links: Array<{ label: string; url: string }>): string | null {
  return links.find((l) => /diagnostic/i.test(l.label))?.url || links[0]?.url || null;
}

// Quick refer takes one contact box. An @ makes it an email, anything else a phone.
export function contactField(v: string): { email: string; phone: string } {
  const t = v.trim();
  return t.includes("@") ? { email: t, phone: "" } : { email: "", phone: t };
}

// ── points ──
export interface RewardView { key: string; label: string; points: number; ok: boolean }
export interface PointsView {
  balance: number; buyers: number; funnelLockedUntil: string | null;
  rewards: RewardView[];
}

// The cheapest reward still out of reach on points. Null once every reward's
// points are covered. `pct` is 0..1 for the meter.
export function nextGoal(p: PointsView): { label: string; points: number; toGo: number; pct: number } | null {
  const next = [...p.rewards].sort((a, b) => a.points - b.points).find((r) => r.points > p.balance);
  if (!next) return null;
  return { label: next.label, points: next.points, toGo: next.points - p.balance, pct: Math.max(0, Math.min(1, p.balance / next.points)) };
}

// What a locked badge says. Short enough for a badge.
export function lockedText(r: RewardView, p: PointsView, minBuyers = 2): string {
  const gap = r.points - p.balance;
  if (gap > 0) return `${gap} more point${gap === 1 ? "" : "s"}`;
  if (r.key === "funnel" && p.buyers < minBuyers) {
    const b = minBuyers - p.buyers;
    return `${b} more buyer${b === 1 ? "" : "s"}`;
  }
  if (r.key === "funnel" && p.funnelLockedUntil) {
    return `Again ${new Date(p.funnelLockedUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
  }
  return "Locked";
}

// ── get paid ──
export function payoutSetup(a: { termsCurrent: boolean; w9: string; whopLinked: boolean }) {
  const steps = [
    { key: "agreement", done: a.termsCurrent },
    { key: "w9", done: a.w9 !== "missing" },
    { key: "whop", done: a.whopLinked },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length, complete: done === steps.length };
}
