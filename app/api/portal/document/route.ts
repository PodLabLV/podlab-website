import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { verifyDocumentLink } from '@/lib/document-link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Serves a private clarity document only for a valid, unexpired signed link
// (minted by /api/portal/document-link for the document's own client).
export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = verifyDocumentLink(u.searchParams.get('d'), u.searchParams.get('e'), u.searchParams.get('s'));
  if (!slug) return new Response('This link has expired. Open the document from your portal.', { status: 403 });

  try {
    const html = await readFile(path.join(process.cwd(), 'private', 'clarity', slug, 'clarity-document.html'), 'utf8');
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
