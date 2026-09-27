/**
 * Logo loading for generated PDFs, including partner co-branding.
 *
 * Logos are read from /public at render time and cached per process. A missing
 * logo returns null rather than throwing — a branding asset must never be the
 * reason a contract fails to generate.
 */

import fs from 'node:fs';
import path from 'node:path';

const cache = new Map<string, Buffer | null>();

/** Reads a logo from /public by filename. Returns null if it isn't there. */
export function loadLogo(filename: string): Buffer | null {
  if (cache.has(filename)) return cache.get(filename)!;
  let buf: Buffer | null;
  try {
    buf = fs.readFileSync(path.join(process.cwd(), 'public', filename));
  } catch {
    buf = null;
  }
  cache.set(filename, buf);
  return buf;
}

export const PODLAB_LOGO = 'podlab-logo-print.png';

/**
 * A co-branding partner shown alongside PodLab in the document header.
 *
 * Co-branding is a claim about who is party to the document. Only set it when
 * the partner is genuinely involved in the arrangement being papered — not to
 * decorate a page with a logo you happen to have.
 */
export interface BrandPartner {
  /** Legal or trading name, printed in the footer. */
  name: string;
  /** Filename in /public, e.g. "4better-logo-print.png". */
  logo: string;
}
