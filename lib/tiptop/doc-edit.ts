/**
 * TipTop's document edits: exact-match find/replace on a client's HTML
 * document, plus the sanitizing that keeps an edit a text edit.
 *
 * Pure (no env, no network), so it is unit-tested directly and shared by the
 * edit_document tool and the version-restore route.
 *
 * Rules:
 *   - every `find` must occur exactly once in the document as it stands when
 *     that edit is applied; zero or several matches refuse the whole batch;
 *   - a match may not sit inside <head>, <script> or <style>;
 *   - the replacement is sanitized (no script/style/iframe/object/embed/form
 *     tags, no on* handlers, no javascript:/vbscript:/data: URLs);
 *   - after all edits, nothing dangerous may have been added anywhere in the
 *     document (counts compared before/after), which also catches an edit that
 *     assembles a tag across the boundary of a match.
 */

export interface DocEdit {
  find: string;
  replace: string;
}

export type EditFailure =
  | { ok: false; reason: 'empty' | 'too_many' | 'too_long' | 'no_change'; index?: number; message: string }
  | { ok: false; reason: 'not_found'; index: number; message: string; near: string[] }
  | { ok: false; reason: 'ambiguous'; index: number; message: string; count: number; near: string[] }
  | { ok: false; reason: 'protected_region' | 'unsafe'; index?: number; message: string };

export type EditResult = { ok: true; html: string; changes: Array<{ before: string; after: string }> } | EditFailure;

export const EDIT_LIMITS = {
  maxEdits: 12,
  maxFind: 3000,
  maxReplace: 6000,
  minFind: 3,
} as const;

// ── sanitizing ───────────────────────────────────────────────────────

const BLOCKED_TAGS = 'script|style|iframe|frame|frameset|object|embed|applet|link|meta|base|form|input|button|textarea|select|svg|math|template|noscript';

/** Make a replacement safe to splice into the document. Text stays text. */
export function sanitizeFragment(input: string): string {
  let s = String(input ?? '');
  // Whole blocked elements, content included.
  s = s.replace(new RegExp(`<\\s*(${BLOCKED_TAGS})\\b[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`, 'gi'), '');
  // Any stray opening or closing blocked tag.
  s = s.replace(new RegExp(`<\\s*\\/?\\s*(${BLOCKED_TAGS})\\b[^>]*>?`, 'gi'), '');
  // Comments can hide conditional markup.
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  // Event handler attributes, quoted or not.
  s = s.replace(/[\s/"']on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, ' ');
  // Script-capable URLs in any attribute (entity-encoded colons included).
  s = s.replace(
    /((?:href|src|xlink:href|action|formaction|poster|background|srcset|data)\s*=\s*["']?)\s*(?:j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t|v\s*b\s*s\s*c\s*r\s*i\s*p\s*t|d\s*a\s*t\s*a)\s*(?::|&colon;|&#0*58;?|&#x0*3a;?)[^"'\s>]*/gi,
    '$1#',
  );
  // Inline styles stay (an edit often keeps the original markup), unless they can load or run something.
  s = s.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (attr) =>
    /expression|url\s*\(|javascript|@import|behavior|-moz-binding/i.test(attr) ? '' : attr,
  );
  return s;
}

/** Counts of everything a text edit must never add. */
export function dangerProfile(html: string): Record<string, number> {
  const count = (re: RegExp) => (html.match(re) ?? []).length;
  return {
    blockedTags: count(new RegExp(`<\\s*(${BLOCKED_TAGS})\\b`, 'gi')),
    handlers: count(/[\s/"']on[a-z]+\s*=/gi),
    scriptUrls: count(/(?:j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t|v\s*b\s*s\s*c\s*r\s*i\s*p\s*t)\s*(?::|&colon;|&#0*58;?|&#x0*3a;?)/gi),
    dataUrls: count(/=\s*["']?\s*data\s*:/gi),
  };
}

function addsDanger(before: string, after: string): boolean {
  const a = dangerProfile(before);
  const b = dangerProfile(after);
  return Object.keys(b).some((k) => b[k] > a[k]);
}

// ── matching ─────────────────────────────────────────────────────────

function occurrences(hay: string, needle: string): number[] {
  const out: number[] = [];
  if (!needle) return out;
  let i = hay.indexOf(needle);
  while (i !== -1) {
    out.push(i);
    if (out.length > 50) break;
    i = hay.indexOf(needle, i + needle.length);
  }
  return out;
}

/** [start, end) ranges where edits are not allowed: <head>, <script>, <style>. */
function protectedRanges(html: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const re of [/<head\b[\s\S]*?<\/head\s*>/gi, /<script\b[\s\S]*?<\/script\s*>/gi, /<style\b[\s\S]*?<\/style\s*>/gi]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) out.push([m.index, m.index + m[0].length]);
  }
  return out;
}

/** True when offset `i` sits inside a tag's angle brackets (attributes included). */
function insideTag(html: string, i: number): boolean {
  const lt = html.lastIndexOf('<', i - 1);
  const gt = html.lastIndexOf('>', i - 1);
  return lt > gt;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
  '&rsquo;': "'", '&lsquo;': "'", '&ldquo;': '"', '&rdquo;': '"', '&mdash;': '-', '&ndash;': '-', '&hellip;': '...',
};

/** Loose form for "did you mean": no tags, entities decoded, quotes/dashes/space flattened, lowercased. */
export function looseText(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? ' ')
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Raw-source snippets around where `query` loosely appears, so the model can
 * copy an exact `find` string. Works on the visible text, maps back to source.
 */
export function findSnippets(html: string, query: string, max = 4, radius = 220): string[] {
  const q = looseText(query);
  if (q.length < 3) return [];
  const body = bodyRange(html);
  // Walk source text nodes, building a loose text stream with a map back to source offsets.
  const map: number[] = [];
  let stream = '';
  const re = /<[^>]*>|&[a-z#0-9]+;|[\s\S]/gi;
  re.lastIndex = body[0];
  let m: RegExpExecArray | null;
  let lastSpace = true;
  while ((m = re.exec(html)) && m.index < body[1]) {
    const tok = m[0];
    let piece: string;
    if (tok.startsWith('<')) piece = ' ';
    else if (tok.length > 1 && tok.startsWith('&')) piece = ENTITIES[tok.toLowerCase()] ?? ' ';
    else piece = tok;
    piece = looseChar(piece);
    for (const ch of piece) {
      if (/\s/.test(ch)) {
        if (lastSpace) continue;
        lastSpace = true;
        stream += ' ';
      } else {
        lastSpace = false;
        stream += ch;
      }
      map.push(m.index);
    }
  }
  const out: string[] = [];
  let from = 0;
  while (out.length < max) {
    const at = stream.indexOf(q, from);
    if (at === -1) break;
    const srcStart = map[at];
    const srcEnd = map[Math.min(at + q.length, map.length - 1)];
    const a = Math.max(body[0], srcStart - radius);
    const b = Math.min(body[1], srcEnd + radius);
    out.push(html.slice(a, b));
    from = at + q.length;
  }
  return out;
}

function looseChar(s: string): string {
  return s
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .toLowerCase();
}

function bodyRange(html: string): [number, number] {
  const open = /<body\b[^>]*>/i.exec(html);
  const close = html.search(/<\/body\s*>/i);
  return [open ? open.index + open[0].length : 0, close === -1 ? html.length : close];
}

/** Visible text of a fragment, for summaries. */
export function plainText(html: string, max = 160): string {
  const t = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

// ── apply ────────────────────────────────────────────────────────────

export function applyEdits(html: string, edits: DocEdit[]): EditResult {
  if (!Array.isArray(edits) || edits.length === 0) return { ok: false, reason: 'empty', message: 'No edits given.' };
  if (edits.length > EDIT_LIMITS.maxEdits) {
    return { ok: false, reason: 'too_many', message: `At most ${EDIT_LIMITS.maxEdits} edits at once.` };
  }

  let doc = html;
  const changes: Array<{ before: string; after: string }> = [];

  for (let i = 0; i < edits.length; i++) {
    const find = String(edits[i]?.find ?? '');
    const replace = sanitizeFragment(String(edits[i]?.replace ?? ''));
    if (find.trim().length < EDIT_LIMITS.minFind) {
      return { ok: false, reason: 'empty', index: i, message: `Edit ${i + 1}: the text to find is empty or too short to be unique.` };
    }
    if (find.length > EDIT_LIMITS.maxFind || replace.length > EDIT_LIMITS.maxReplace) {
      return { ok: false, reason: 'too_long', index: i, message: `Edit ${i + 1} is too long. Split it into smaller edits.` };
    }
    if (/<[^>]*$/.test(replace) || /<[^>]*</.test(replace)) {
      return { ok: false, reason: 'unsafe', index: i, message: `Edit ${i + 1} has an unclosed tag. Use plain text, or whole tags.` };
    }
    if (find === replace) return { ok: false, reason: 'no_change', index: i, message: `Edit ${i + 1} changes nothing.` };

    const hits = occurrences(doc, find);
    if (hits.length === 0) {
      return {
        ok: false,
        reason: 'not_found',
        index: i,
        message: `Edit ${i + 1}: that exact text is not in the document. Copy it exactly from the source (tags and entities included).`,
        near: findSnippets(doc, find, 3),
      };
    }
    if (hits.length > 1) {
      return {
        ok: false,
        reason: 'ambiguous',
        index: i,
        count: hits.length,
        message: `Edit ${i + 1}: that text appears ${hits.length} times. Include more surrounding text so it matches exactly once.`,
        near: hits.slice(0, 3).map((h) => doc.slice(Math.max(0, h - 120), h + find.length + 120)),
      };
    }
    const at = hits[0];
    if (protectedRanges(doc).some(([a, b]) => at < b && at + find.length > a)) {
      return { ok: false, reason: 'protected_region', index: i, message: `Edit ${i + 1} touches the page's code or styling, which is off limits. Edit the visible text only.` };
    }
    if (insideTag(doc, at) || insideTag(doc, at + find.length)) {
      return { ok: false, reason: 'protected_region', index: i, message: `Edit ${i + 1} starts or ends inside an HTML tag. Edit visible text: begin and end the find on text, or include whole tags.` };
    }
    doc = doc.slice(0, at) + replace + doc.slice(at + find.length);
    changes.push({ before: plainText(find), after: plainText(replace) });
  }

  if (addsDanger(html, doc)) {
    return { ok: false, reason: 'unsafe', message: 'That edit would add code to the document. Edits must be text.' };
  }
  return { ok: true, html: doc, changes };
}

/** One line per change, for Slack and the CRM timeline. */
export function diffSummary(changes: Array<{ before: string; after: string }>, max = 6): string {
  const lines = changes.slice(0, max).map((c) => `"${c.before || '(markup)'}" → "${c.after || '(removed)'}"`);
  if (changes.length > max) lines.push(`…and ${changes.length - max} more`);
  return lines.join('\n');
}

/** Headings, for the outline the model navigates by. */
export function outline(html: string, max = 80): string[] {
  const out: string[] = [];
  const re = /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < max) {
    const t = plainText(m[2], 90);
    if (t) out.push(`${'  '.repeat(Number(m[1]) - 1)}${t}`);
  }
  return out;
}

/** Raw source of the section under the first heading matching `heading` (to the next heading of the same or higher level). */
export function sectionSource(html: string, heading: string, cap = 7000): string | null {
  const want = looseText(heading);
  if (!want) return null;
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!looseText(m[2]).includes(want)) continue;
    const level = Number(m[1]);
    const rest = html.slice(m.index + m[0].length);
    const next = new RegExp(`<h([1-${level}])\\b`, 'i').exec(rest);
    const end = next ? m.index + m[0].length + next.index : bodyRange(html)[1];
    const src = html.slice(m.index, end);
    return src.length > cap ? `${src.slice(0, cap)}\n<!-- section continues; search for a phrase to see more -->` : src;
  }
  return null;
}
