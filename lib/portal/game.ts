import type { Overview } from '@/lib/tiptop/overview';

/**
 * Build level: the portal's game layer. Points come from things that actually
 * move a client's build (their inputs, their approvals, elements we unlock), so
 * chasing the bar is the same as unblocking the team. Pure, so the sidebar,
 * TipTop and tests all read the same numbers.
 */

export interface Mission {
  key: string;
  title: string;
  points: number;
  done: boolean;
  href: string;
  /** For repeatable missions: how many times it has been earned. */
  count?: number;
  /** Earned by PodLab's delivery, not the client's action: never the "next mission". */
  ours?: boolean;
}

export interface Level {
  n: number;
  name: string;
  floor: number;
  /** Points needed for the next level; null at the top. */
  next: number | null;
}

export interface Game {
  score: number;
  level: Level;
  /** 0–100 through the current level. */
  pct: number;
  nextMission: Mission | null;
  missions: Mission[];
}

const LEVELS: Array<[number, string]> = [
  [0, 'Kickoff'],
  [100, 'Foundation'],
  [250, 'Building'],
  [450, 'Momentum'],
  [700, 'Launch'],
  [1000, 'Scale'],
  [1400, 'Systemized'],
  [1900, 'Duplicated'],
  [2500, 'Legacy'],
];

export function levelFor(score: number): Level {
  let i = 0;
  while (i + 1 < LEVELS.length && score >= LEVELS[i + 1][0]) i++;
  return { n: i + 1, name: LEVELS[i][1], floor: LEVELS[i][0], next: LEVELS[i + 1]?.[0] ?? null };
}

const APPROVED_SCRIPT = new Set(['approved', 'shot', 'published']);

/** Missions in the order a client should do them; the first undone one is "next". */
export function missions(o: Overview): Mission[] {
  const out: Mission[] = [];
  const b = o.brand;

  if (o.intake.total > 0) out.push({ key: 'intake', title: 'Submit your intake', points: 100, done: o.intake.submitted, href: '/portal/intake' });
  if (o.chain.available) out.push({ key: 'chain-check', title: 'Take the Growth Chain check', points: 50, done: o.chain.answered >= 8, href: '/portal/growth' });

  if (b.available) {
    out.push({ key: 'logo', title: 'Upload your main logo', points: 60, done: b.logos.includes('primary'), href: '/portal/brand#logos' });
    out.push({ key: 'logo-set', title: 'Add your icon and white logo', points: 40, done: b.logos.includes('icon') && b.logos.includes('white'), href: '/portal/brand#logos' });
    out.push({ key: 'kit', title: 'Add your brand colors and fonts', points: 40, done: b.colors.length > 0 && b.fonts.length > 0, href: '/portal/brand#kit' });
    out.push({ key: 'broll', title: 'Send us b-roll', points: 60, done: b.broll.files + b.broll.links > 0, href: '/portal/brand#broll' });
  }

  // Repeatable: earned per item, and "done" while nothing is waiting on them.
  if (o.scripts.available && o.scripts.items.length) {
    const approved = o.scripts.items.filter((s) => APPROVED_SCRIPT.has(s.status)).length;
    const waiting = o.scripts.items.filter((s) => s.waitingOnYou).length;
    out.push({ key: 'scripts', title: waiting ? (waiting === 1 ? 'Review your script' : `Review ${waiting} scripts`) : 'Approve your scripts', points: 30, count: approved, done: waiting === 0, href: '/portal/scripts' });
  }
  if (o.deliverables.available && o.deliverables.items.length) {
    const approved = o.deliverables.items.filter((d) => d.status.toLowerCase() === 'approved').length;
    const waiting = o.deliverables.items.filter((d) => d.waitingOnYou).length;
    out.push({ key: 'deliverables', title: waiting ? (waiting === 1 ? 'Review your deliverable' : `Review ${waiting} deliverables`) : 'Approve your deliverables', points: 20, count: approved, done: waiting === 0, href: '/portal/deliverables' });
  }
  const totalActions = o.actionItems.open.length + o.actionItems.done;
  if (totalActions) {
    const open = o.actionItems.open.length;
    out.push({ key: 'actions', title: open ? (open === 1 ? 'Close your open action item' : `Close ${open} action items`) : 'Close your action items', points: 15, count: o.actionItems.done, done: open === 0, href: '/portal/actions' });
  }
  // Earned by delivery, not by the client: the build moving counts as progress too,
  // so a client whose videos are in the can doesn't sit at zero.
  if (o.document.has) out.push({ key: 'document', title: 'Clarity Document delivered', points: 100, done: true, ours: true, href: '/portal/document' });
  const phasesDone = o.phases.filter((p) => p.status === 'done').length;
  if (o.phases.length) out.push({ key: 'phases', title: 'Delivery phases finished', points: 25, count: phasesDone, done: phasesDone === o.phases.length, ours: true, href: '/portal/delivery' });
  const videosDone = o.production.videos.filter((v) => v.done).length;
  if (o.production.videos.length) out.push({ key: 'videos', title: 'Videos approved or posted', points: 10, count: videosDone, done: videosDone === o.production.videos.length, ours: true, href: '/portal/production' });
  if (o.chain.available) out.push({ key: 'elements', title: 'Growth Chain elements unlocked', points: 100, count: o.chain.unlocked, done: o.chain.unlocked >= 8, ours: true, href: '/portal/growth' });

  return out;
}

export function scoreOf(ms: Mission[]): number {
  return ms.reduce((n, m) => n + (m.count !== undefined ? m.count * m.points : m.done ? m.points : 0), 0);
}

export function gameFor(o: Overview): Game {
  const ms = missions(o);
  const score = scoreOf(ms);
  const level = levelFor(score);
  const pct = level.next === null ? 100 : Math.round(((score - level.floor) / (level.next - level.floor)) * 100);
  const nextMission = ms.find((m) => !m.done && !m.ours) ?? null;
  return { score, level, pct, nextMission, missions: ms };
}
