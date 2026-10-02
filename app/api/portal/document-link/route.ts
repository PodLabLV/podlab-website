import { NextResponse } from 'next/server';
import { admin, resolveCaller } from '@/lib/portal-server';
import { documentLinkFor } from '@/lib/document-link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The logged-in client's own clarity document, as a link that expires in minutes.
export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const { data } = await db.from('portal_clients').select('document_url').eq('id', caller.clientId).maybeSingle();
  const url = documentLinkFor(data?.document_url ?? null);
  return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
}
