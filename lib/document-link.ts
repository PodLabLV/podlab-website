import crypto from 'node:crypto';

/**
 * Short-lived signed links for client documents (security fix 2026-10-01).
 *
 * Clarity documents used to live in /public, readable by anyone with the URL and
 * indexable. They now live in /private and are only served through
 * /api/portal/document with a signature minted for a logged-in client who owns
 * the document. The portal stores the old-style path in portal_clients.document_url
 * (/portal/<slug>/clarity-document.html); the slug is the lookup key.
 */
const TTL_SECONDS = 10 * 60;
const LOCAL_DOC = /^\/portal\/([a-z0-9-]+)\/clarity-document\.html$/;

function secret(): string {
  const s = process.env.DOCUMENT_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('document link secret missing');
  // Derive a purpose-specific key so the service key itself is never the HMAC key.
  return crypto.createHash('sha256').update(`podlab-document-link:${s}`).digest('hex');
}

function sign(slug: string, exp: number): string {
  return crypto.createHmac('sha256', secret()).update(`${slug}.${exp}`).digest('base64url');
}

/** For a client's stored document_url, the URL the portal should actually load. */
export function documentLinkFor(documentUrl: string | null): string | null {
  if (!documentUrl) return null;
  const m = LOCAL_DOC.exec(documentUrl);
  if (!m) return /^https:\/\//.test(documentUrl) ? documentUrl : null;
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const q = new URLSearchParams({ d: m[1], e: String(exp), s: sign(m[1], exp) });
  return `/api/portal/document?${q}`;
}

/** Returns the slug if the signature is valid and unexpired, else null. */
export function verifyDocumentLink(d: string | null, e: string | null, s: string | null): string | null {
  if (!d || !e || !s || !/^[a-z0-9-]+$/.test(d) || !/^\d+$/.test(e)) return null;
  if (Number(e) < Math.floor(Date.now() / 1000)) return null;
  const expected = Buffer.from(sign(d, Number(e)));
  const got = Buffer.from(s);
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return null;
  return d;
}
