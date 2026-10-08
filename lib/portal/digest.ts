/**
 * Daily client digest: one email a day, only when something changed.
 *
 * How a change is detected without history tables: portal_digest_state keeps,
 * per client, a snapshot of every card on their linked CRM boards (its column,
 * its video_url, and which of the client's own notes are resolved). Each run
 * reads the live state, diffs it against the snapshot, emails the difference,
 * and stores the new snapshot. Script and deliverable versions are rows with a
 * created_at, so those are simply "created since last_sent_at".
 *
 * This file is the pure part (snapshot, diff, email copy) so it can be unit
 * tested; lib/portal/digest-run.ts does the reading, sending and saving.
 */

import { readNote } from '@/lib/chapters';
import { isDoneColumn, stageFor } from '@/lib/production';
import { EMAIL_FOOTER, EMAIL_STYLE, SITE_URL, emailLayout, escapeHtml } from '@/lib/portal-email';

// ── shapes ───────────────────────────────────────────────────────────────

export interface CardState {
  column: string;
  video_url: string | null;
  resolved_client_comment_ids: string[];
}

export interface DigestSnapshot {
  v: 1;
  /** Boards linked when the snapshot was taken. Cards on a board linked later are baselined, not announced. */
  boards: string[];
  cards: Record<string, CardState>;
}

export interface LiveCard {
  id: string;
  boardId: string;
  title: string;
  column: string;
  videoUrl: string | null;
  /** The client's own notes on this card that are marked resolved. */
  resolvedClientComments: Array<{ id: string; body: string }>;
}

export interface LiveVersion {
  id: string;
  /** portal_scripts.id or portal_assets.id */
  parentId: string;
  title: string;
  versionNo: number;
  createdAt: string;
}

export interface LiveState {
  boards: string[];
  cards: LiveCard[];
  scriptVersions: LiveVersion[];
  assetVersions: LiveVersion[];
  waiting: { scripts: number; deliverables: number; actions: number };
}

export interface DigestChanges {
  cuts: Array<{ cardId: string; title: string }>;
  fixed: Array<{ cardId: string; title: string; note: string }>;
  done: Array<{ cardId: string; title: string; stage: string }>;
  scripts: Array<{ scriptId: string; title: string; versionNo: number }>;
  deliverables: Array<{ assetId: string; title: string; versionNo: number }>;
  waiting: { scripts: number; deliverables: number; actions: number };
}

// ── snapshot + diff ──────────────────────────────────────────────────────

export function snapshotOf(live: Pick<LiveState, 'boards' | 'cards'>): DigestSnapshot {
  const cards: Record<string, CardState> = {};
  for (const c of live.cards) {
    cards[c.id] = {
      column: c.column,
      video_url: c.videoUrl,
      resolved_client_comment_ids: c.resolvedClientComments.map((m) => m.id).sort(),
    };
  }
  return { v: 1, boards: [...live.boards].sort(), cards };
}

/** Accepts whatever is stored; anything unrecognisable counts as "no snapshot yet". */
export function parseSnapshot(raw: unknown): DigestSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<DigestSnapshot>;
  if (r.v !== 1 || !Array.isArray(r.boards) || !r.cards || typeof r.cards !== 'object') return null;
  return r as DigestSnapshot;
}

const norm = (s: string) => s.trim().toLowerCase();
const NOTE_MAX = 180;

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/**
 * What changed since `prev`. Returns null on a first run (no snapshot), which
 * means "baseline only, send nothing". Versions count when created strictly
 * after `since`.
 */
export function diffDigest(prev: DigestSnapshot | null, live: LiveState, since: string | null): DigestChanges | null {
  if (!prev) return null;
  const knownBoards = new Set(prev.boards);
  const out: DigestChanges = { cuts: [], fixed: [], done: [], scripts: [], deliverables: [], waiting: live.waiting };

  for (const c of live.cards) {
    if (!knownBoards.has(c.boardId)) continue; // board linked since the last run: baseline it quietly
    const before: CardState = prev.cards[c.id] ?? { column: '', video_url: null, resolved_client_comment_ids: [] };

    if (c.videoUrl && c.videoUrl !== before.video_url) out.cuts.push({ cardId: c.id, title: c.title });

    if (isDoneColumn(c.column) && norm(c.column) !== norm(before.column)) {
      out.done.push({ cardId: c.id, title: c.title, stage: stageFor(c.column) });
    }

    const wasResolved = new Set(before.resolved_client_comment_ids);
    for (const m of c.resolvedClientComments) {
      if (wasResolved.has(m.id)) continue;
      out.fixed.push({ cardId: c.id, title: c.title, note: clip(readNote(m.body).text, NOTE_MAX) });
    }
  }

  const after = (v: LiveVersion) => !since || new Date(v.createdAt).getTime() > new Date(since).getTime();
  out.scripts = live.scriptVersions.filter(after).map((v) => ({ scriptId: v.parentId, title: v.title, versionNo: v.versionNo }));
  out.deliverables = live.assetVersions.filter(after).map((v) => ({ assetId: v.parentId, title: v.title, versionNo: v.versionNo }));
  return out;
}

/** "Waiting on you" never counts: it only rides along with a real change. */
export function hasChanges(c: DigestChanges | null): c is DigestChanges {
  return Boolean(c && (c.cuts.length || c.fixed.length || c.done.length || c.scripts.length || c.deliverables.length));
}

// ── email ────────────────────────────────────────────────────────────────

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function digestSubject(c: DigestChanges): string {
  const bits: string[] = [];
  if (c.cuts.length) bits.push(plural(c.cuts.length, 'new cut', 'new cuts'));
  if (c.fixed.length) bits.push(plural(c.fixed.length, 'note fixed', 'notes fixed'));
  if (c.done.length) bits.push(plural(c.done.length, `video ${doneWord(c.done)}`, `videos ${doneWord(c.done)}`));
  const versions = c.scripts.length + c.deliverables.length;
  if (versions) bits.push(plural(versions, 'new version to review', 'new versions to review'));
  return `Your PodLab update: ${bits.join(', ')}`;
}

/** "approved", "posted", or "approved or posted" for a mix. */
function doneWord(done: DigestChanges['done']): string {
  const words = [...new Set(done.map((d) => norm(d.stage)))];
  if (words.length === 1 && (words[0] === 'approved' || words[0] === 'posted')) return words[0];
  return 'approved or posted';
}

export interface DigestEmail {
  subject: string;
  html: string;
  text: string;
}

const url = (path: string) => new URL(path, SITE_URL).toString();

/** Group by video so "3 notes fixed on Episode 4" reads as one block, not three. */
function groupFixed(fixed: DigestChanges['fixed']): Array<{ title: string; notes: string[] }> {
  const by = new Map<string, { title: string; notes: string[] }>();
  for (const f of fixed) {
    const g = by.get(f.cardId) ?? { title: f.title, notes: [] };
    g.notes.push(f.note);
    by.set(f.cardId, g);
  }
  return [...by.values()];
}

export function digestEmail(c: DigestChanges, opts: { firstName?: string | null }): DigestEmail {
  const subject = digestSubject(c);
  const production = url('/portal/production');
  const deliverables = url('/portal/deliverables');
  const profile = url('/portal/profile');

  type Item = { text: string; html: string };
  const sections: Array<{ heading: string; items: Item[]; link: { href: string; label: string } }> = [];
  const e = escapeHtml;

  if (c.cuts.length) {
    sections.push({
      heading: c.cuts.length === 1 ? 'A new cut is ready to watch' : 'New cuts are ready to watch',
      items: c.cuts.map((x) => ({ text: x.title, html: e(x.title) })),
      link: { href: production, label: 'Watch in Production' },
    });
  }
  if (c.fixed.length) {
    sections.push({
      heading: c.fixed.length === 1 ? 'Your note was fixed' : 'Your notes were fixed',
      items: groupFixed(c.fixed).map((g) => ({
        text: `${g.title}: ${g.notes.map((n) => `"${n}"`).join('; ')}`,
        html: `${e(g.title)}${g.notes
          .map((n) => `<br><span style="color:#888888;font-style:italic;">&ldquo;${e(n)}&rdquo;</span>`)
          .join('')}`,
      })),
      link: { href: production, label: 'See the new cut' },
    });
  }
  if (c.done.length) {
    sections.push({
      heading: (() => {
        const w = doneWord(c.done);
        return w === 'approved or posted' ? 'Approved and posted' : `${w[0].toUpperCase()}${w.slice(1)}`;
      })(),
      items: c.done.map((x) => ({ text: `${x.title} (${x.stage})`, html: `${e(x.title)} <span style="color:#2add1b;">&middot; ${e(x.stage)}</span>` })),
      link: { href: production, label: 'Open Production' },
    });
  }
  if (c.scripts.length || c.deliverables.length) {
    const items: Item[] = [
      ...c.scripts.map((x) => ({
        text: `Script: ${x.title} (v${x.versionNo}) ${url(`/portal/scripts/${x.scriptId}`)}`,
        html: `<a href="${e(url(`/portal/scripts/${x.scriptId}`))}" style="color:#eeeeee;text-decoration:underline;">${e(x.title)}</a> <span style="color:#888888;">&middot; script v${x.versionNo}</span>`,
      })),
      ...c.deliverables.map((x) => ({
        text: `${x.title} (v${x.versionNo})`,
        html: `${e(x.title)} <span style="color:#888888;">&middot; v${x.versionNo}</span>`,
      })),
    ];
    // Script items carry their own links; the section link goes where the rest live.
    const link = c.deliverables.length
      ? { href: deliverables, label: 'Open Deliverables' }
      : c.scripts.length === 1
        ? { href: url(`/portal/scripts/${c.scripts[0].scriptId}`), label: 'Read the script' }
        : { href: url('/portal/scripts'), label: 'Open Scripts' };
    sections.push({ heading: items.length === 1 ? 'A new version to review' : 'New versions to review', items, link });
  }

  const w = c.waiting;
  const waitingBits = [
    w.scripts ? plural(w.scripts, 'script to approve', 'scripts to approve') : '',
    w.deliverables ? plural(w.deliverables, 'deliverable to review', 'deliverables to review') : '',
    w.actions ? plural(w.actions, 'open action item', 'open action items') : '',
  ].filter(Boolean);

  const hello = opts.firstName ? `Hi ${opts.firstName},` : 'Hi there,';
  const lead = 'Here is what moved on your project since we last wrote.';

  const sectionHtml = sections
    .map(
      (s) => `        <p style="margin:0 0 10px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#2add1b;">${e(s.heading)}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">${s.items
          .map(
            (i) =>
              `<tr><td style="padding:10px 0;border-top:1px solid #1a1a1a;font-size:14px;line-height:1.55;color:#eeeeee;">${i.html}</td></tr>`,
          )
          .join('')}</table>
        <p style="margin:0 0 28px;font-size:13px;"><a href="${e(s.link.href)}" style="${EMAIL_STYLE.link}text-decoration:none;">${e(s.link.label)} &rarr;</a></p>`,
    )
    .join('\n');

  const waitingHtml = waitingBits.length
    ? `        <table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 28px;"><tr><td style="padding:16px 18px;border:1px solid #1a1a1a;background:#000000;font-size:13px;line-height:1.6;color:#bdbdbd;"><span style="color:#eeeeee;">Waiting on you:</span> ${e(waitingBits.join(', '))}.</td></tr></table>`
    : '';

  const content = [
    `        <p style="${EMAIL_STYLE.kicker}">Your update</p>`,
    `        <p style="${EMAIL_STYLE.hello}">${e(hello)}</p>`,
    `        <p style="${EMAIL_STYLE.lead}">${lead}</p>`,
    sectionHtml,
    waitingHtml,
    `        <a href="${e(url('/portal'))}" style="${EMAIL_STYLE.button}">Open my portal &rarr;</a>`,
    `        <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#777777;">Reply to this email if anything looks off. It comes straight to the team.</p>`,
  ]
    .filter(Boolean)
    .join('\n');

  const footer = `${EMAIL_FOOTER}<br><a href="${e(profile)}" style="color:#888888;">Turn these off in your Profile</a>`;

  const text = [
    hello,
    '',
    lead,
    '',
    ...sections.flatMap((s) => [s.heading.toUpperCase(), ...s.items.map((i) => `- ${i.text}`), `${s.link.label}: ${s.link.href}`, '']),
    ...(waitingBits.length ? [`Waiting on you: ${waitingBits.join(', ')}.`, ''] : []),
    `Open your portal: ${url('/portal')}`,
    '',
    '- PodLab',
    '',
    `Turn these off in your Profile: ${profile}`,
  ].join('\n');

  return { subject, html: emailLayout({ title: e(subject), content, footer }), text };
}

// ── who gets it ──────────────────────────────────────────────────────────

/** A login, a deliverable address, and not opted out. */
export function digestEligible(c: { user_id?: string | null; email?: string | null; digest_opt_out?: boolean | null }): boolean {
  if (!c.user_id || !c.email) return false;
  const email = c.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (email.endsWith('.invalid')) return false; // covers @unassigned.invalid placeholders
  return c.digest_opt_out !== true;
}
