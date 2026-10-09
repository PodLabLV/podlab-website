/**
 * Hot Potato: whoever's turn it is holds the potato, and it heats up by the day.
 * A potato passes when the item changes hands (client sends notes → editor;
 * editor posts the new cut → client). Pure, so the portal, Slack, TipTop and
 * tests all agree on who holds what and how hot it is.
 */

export type Holder = 'client' | 'team';
export type Heat = 'warm' | 'hot' | 'fire' | 'smoke';

export interface Potato {
  /** Stable per item and holder, e.g. "card:<id>:client". */
  key: string;
  holder: Holder;
  /** Who has it: the editor's name, "PodLab", or the client's first name. */
  who: string;
  title: string;
  /** What passes it, in the holder's words: "Watch the new cut", "Fixing your notes". */
  why: string;
  since: string;
  href: string;
  days: number;
  heat: Heat;
  clientId?: string;
  clientName?: string;
}

/**
 * Clocks start at launch: items that were already open (September action items,
 * old cuts) start warm instead of smoking out every client on day one.
 */
export const POTATO_EPOCH = Date.parse('2026-10-09T07:00:00Z');

const DAY = 86_400_000;

export function daysHeld(since: string | number, now = Date.now()): number {
  const start = Math.max(typeof since === 'number' ? since : Date.parse(since) || now, POTATO_EPOCH);
  return Math.max(0, Math.floor((now - start) / DAY));
}

/** Day 0–1 warm, 2–3 glowing, 4–6 on fire, 7+ smoke. */
export function heatFor(days: number): Heat {
  if (days >= 7) return 'smoke';
  if (days >= 4) return 'fire';
  if (days >= 2) return 'hot';
  return 'warm';
}

export const HEAT_LABEL: Record<Heat, string> = {
  warm: 'Warm',
  hot: 'Getting hot',
  fire: 'On fire',
  smoke: 'Smoking',
};

export function makePotato(p: Omit<Potato, 'days' | 'heat'>, now = Date.now()): Potato {
  const days = daysHeld(p.since, now);
  return { ...p, days, heat: heatFor(days) };
}

/** Hottest first; ties go to the oldest. */
export function byHeat(a: Potato, b: Potato): number {
  return b.days - a.days || Date.parse(a.since) - Date.parse(b.since);
}

/** The body of the comment the "Looks good" button leaves on the editor's card. */
export const LOOKS_GOOD_NOTE = 'Looks good. Approved in the portal.';

/**
 * Who holds a cut, from its history:
 * - unresolved client notes → the editor (since the oldest one)
 * - the client's last word was "Looks good" → the team, to move it along
 * - a cut newer than the client's last note → the client, to watch it
 * - client notes all resolved but no newer cut → the editor, to post it
 * - no cut and past due → the editor
 */
export function cutHolder(c: {
  hasCut: boolean;
  cutAt: number | null;
  dueOn: string | null;
  clientNotes: Array<{ at: number; resolved: boolean; looksGood: boolean }>;
  now?: number;
}): { holder: Holder; why: string; since: number } | null {
  const now = c.now ?? Date.now();
  const open = c.clientNotes.filter((n) => !n.resolved && !n.looksGood);
  if (open.length) return { holder: 'team', why: 'Fixing your notes', since: Math.min(...open.map((n) => n.at)) };

  const last = c.clientNotes.reduce<{ at: number; looksGood: boolean } | null>((m, n) => (!m || n.at > m.at ? n : m), null);
  if (c.hasCut) {
    if (last?.looksGood && (c.cutAt === null || last.at >= c.cutAt)) return { holder: 'team', why: 'You approved it: moving it along', since: last.at };
    if (!last || (c.cutAt !== null && c.cutAt > last.at)) return { holder: 'client', why: 'Watch the cut: notes or "Looks good"', since: c.cutAt ?? now };
    // They noted, the notes are resolved, and no newer cut has landed yet.
    return { holder: 'team', why: 'Posting the new cut', since: last.at };
  }
  if (c.dueOn && Date.parse(`${c.dueOn}T23:59:59Z`) < now) return { holder: 'team', why: 'Cut is past due', since: Date.parse(`${c.dueOn}T23:59:59Z`) };
  return null;
}

const HEAT_MARK: Record<Heat, string> = { warm: 'warm', hot: '*hot*', fire: '*ON FIRE*', smoke: '*SMOKING*' };

/**
 * The morning Slack scoreboard. Team first (that's who reads it), grouped by
 * holder, hottest first; then a one-line-per-client tally of what's on them.
 */
export function scoreboard(all: Potato[], siteUrl: string): string {
  const team = all.filter((p) => p.holder === 'team');
  const clients = all.filter((p) => p.holder === 'client');
  const burning = all.filter((p) => p.heat === 'fire' || p.heat === 'smoke').length;
  const L: string[] = [`*Hot Potato* · team holding ${team.length}, clients holding ${clients.length}${burning ? ` · ${burning} on fire or smoking` : ''}`];

  if (team.length) {
    const byWho = new Map<string, Potato[]>();
    for (const p of team) byWho.set(p.who, [...(byWho.get(p.who) ?? []), p]);
    for (const [who, ps] of [...byWho].sort((a, b) => b[1][0].days - a[1][0].days)) {
      L.push(`\n*${who}* · ${ps.length}`);
      for (const p of ps.slice(0, 6)) L.push(`• ${HEAT_MARK[p.heat]} day ${p.days} · ${p.clientName}: ${p.title} (${p.why})`);
      if (ps.length > 6) L.push(`• …and ${ps.length - 6} more`);
    }
  } else {
    L.push('\nTeam is holding nothing. Every open item is on a client.');
  }

  if (clients.length) {
    L.push('\n*On clients*');
    const byClient = new Map<string, Potato[]>();
    for (const p of clients) byClient.set(p.clientName ?? 'Client', [...(byClient.get(p.clientName ?? 'Client') ?? []), p]);
    for (const [name, ps] of [...byClient].sort((a, b) => b[1][0].days - a[1][0].days).slice(0, 12)) {
      L.push(`• ${name}: ${ps.length} · hottest ${HEAT_MARK[ps[0].heat]} day ${ps[0].days} (${ps[0].title})`);
    }
  }
  L.push(`\n${siteUrl}/portal/potatoes`);
  return L.join('\n');
}
