import { verifyDocumentLink, documentUrlForSlug } from '@/lib/document-link';
import { admin } from '@/lib/portal-server';
import { CLARITY, readClarityFile } from '@/lib/portal/documents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'no-referrer',
};

/**
 * The newest saved version of this slug's document (portal_document_versions),
 * if any; null when there is none or the table doesn't exist yet.
 */
async function latestVersion(slug: string): Promise<string | null> {
  try {
    const db = admin();
    const { data: clients } = await db.from('portal_clients').select('id').eq('document_url', documentUrlForSlug(slug)).limit(2);
    // A slug shared by two client rows is ambiguous; serve the delivered file rather than guess.
    if (!clients || clients.length !== 1) return null;
    const { data, error } = await db
      .from('portal_document_versions')
      .select('html')
      .eq('client_id', clients[0].id)
      .eq('doc_key', CLARITY)
      .order('version_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data?.html ?? null;
  } catch {
    return null;
  }
}

// Serves a private clarity document only for a valid, unexpired signed link
// (minted by /api/portal/document-link for the document's own client): the
// newest saved version when one exists, else the delivered file.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = verifyDocumentLink(u.searchParams.get('d'), u.searchParams.get('e'), u.searchParams.get('s'));
  if (!slug) return new Response('This link has expired. Open the document from your portal.', { status: 403 });

  const html = (await latestVersion(slug)) ?? (await readClarityFile(slug));
  if (!html) return new Response('Not found', { status: 404 });
  return new Response(html, { headers: HEADERS });
}
