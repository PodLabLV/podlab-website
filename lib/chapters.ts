/**
 * Video chapters and timestamped review notes.
 *
 * Chapters use the format YouTube (and Google's "key moments") read from a
 * video description, so an editor writes them once and they work everywhere:
 *
 *   0:00 Hook
 *   0:18 The problem
 *   1:02 Proof
 *
 * Clients pin notes to a moment; a note's chapter is derived from its time, so
 * re-chaptering a cut never orphans anything.
 */

import { clock, parseClock } from '@/lib/portal/scripts';

export interface Chapter {
  /** Seconds from the start. */
  t: number;
  title: string;
}

const LINE = /^\s*[[(]?(\d{1,2}(?::\d{1,2}){1,2})[\])]?\s*(?:[-–—:|•·]\s*)?(.+?)\s*$/;
const MAX_CHAPTERS = 60;

/** Chapters from free text (one "0:00 Title" per line) or an array. Unsorted input is fine; bad lines are skipped. */
export function parseChapters(input: unknown): Chapter[] {
  let raw: Chapter[] = [];
  if (typeof input === 'string') {
    for (const line of input.split(/\r?\n/)) {
      const m = LINE.exec(line);
      if (!m) continue;
      const t = parseClock(m[1]);
      const title = m[2].replace(/\s+/g, ' ').trim().slice(0, 80);
      if (t !== null && title) raw.push({ t, title });
    }
  } else if (Array.isArray(input)) {
    raw = input
      .map((c) => {
        const r = c as { t?: unknown; title?: unknown };
        const t = typeof r.t === 'number' ? r.t : typeof r.t === 'string' ? parseClock(r.t) : null;
        const title = typeof r.title === 'string' ? r.title.trim().slice(0, 80) : '';
        return t !== null && Number.isFinite(t) && t >= 0 && title ? { t, title } : null;
      })
      .filter((c): c is Chapter => c !== null);
  }
  // One chapter per second, in order.
  const seen = new Set<number>();
  return raw
    .sort((a, b) => a.t - b.t)
    .filter((c) => (seen.has(Math.floor(c.t)) ? false : (seen.add(Math.floor(c.t)), true)))
    .slice(0, MAX_CHAPTERS);
}

/** The chapter playing at `t`. Before the first chapter there is none. */
export function chapterAt(chapters: Chapter[], t: number | null): { chapter: Chapter; index: number } | null {
  if (t === null || chapters.length === 0) return null;
  let found = -1;
  for (let i = 0; i < chapters.length; i++) if (chapters[i].t <= t) found = i;
  return found === -1 ? null : { chapter: chapters[found], index: found };
}

/** "Ch 2 · Hook" style label for a time, or just the clock when there are no chapters. */
export function momentLabel(chapters: Chapter[], t: number | null): string {
  if (t === null) return 'Whole video';
  const at = chapterAt(chapters, t);
  return at ? `${clock(t)} · ${at.chapter.title}` : clock(t);
}

// ── notes written into CRM card comments ─────────────────────────────────

const TAG = /^\[(\d{1,2}(?::\d{1,2}){1,2})(?:\s*·\s*([^\]]*))?\]\s*/;

/** "[0:42 · Hook] cut the pause": what a timestamped note looks like on an editor's card. */
export function tagNote(body: string, t: number | null, chapters: Chapter[]): string {
  if (t === null) return body;
  const at = chapterAt(chapters, t);
  return `[${clock(t)}${at ? ` · ${at.chapter.title}` : ''}] ${body}`;
}

/** Splits a tagged comment back into its time and text. Untagged comments have no time. */
export function readNote(body: string): { t: number | null; text: string } {
  const m = TAG.exec(body);
  if (!m) return { t: null, text: body };
  return { t: parseClock(m[1]), text: body.slice(m[0].length) };
}

// ── where a cut lives ────────────────────────────────────────────────────

export type VideoSource =
  // `fallback`: where to send the viewer if inline playback fails (a Drive cut
  // streamed through our proxy falls back to opening it on Drive).
  | { kind: 'file'; url: string; fallback?: { url: string; host: string } }
  | { kind: 'youtube'; id: string; url: string }
  | { kind: 'link'; url: string; host: string };

/** The file id in a Google Drive file link (…/file/d/<id>/…, open?id=, uc?id=), or null. Folders don't count. */
export function driveFileId(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!/(^|\.)drive\.google\.com$|(^|\.)docs\.google\.com$/.test(u.hostname)) return null;
  const id = u.pathname.match(/\/file\/d\/([\w-]{20,})/)?.[1] ?? (/^\/(open|uc)$/.test(u.pathname) ? u.searchParams.get('id') : null);
  return id && /^[\w-]{20,}$/.test(id) ? id : null;
}

/**
 * Uploaded files and YouTube play inline with a readable clock (so pausing
 * stamps the note). Anything else (Drive, Frame.io, Vimeo, Dropbox) opens in a
 * new tab and the client picks the moment by chapter or by typing the time.
 */
export function videoSource(url: string | null | undefined, opts: { direct?: boolean } = {}): VideoSource | null {
  if (!url) return null;
  if (opts.direct) return { kind: 'file', url };
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    if (/^[\w-]{11}$/.test(id)) return { kind: 'youtube', id, url };
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1] ?? '';
    if (/^[\w-]{11}$/.test(id)) return { kind: 'youtube', id, url };
  }
  if (/\.(mp4|mov|m4v|webm)$/i.test(u.pathname)) return { kind: 'file', url };
  return { kind: 'link', url, host };
}
