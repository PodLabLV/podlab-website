import { NextResponse } from 'next/server';
import { admin, resolveCaller } from '@/lib/portal-server';
import { LIMITS } from '@/lib/tiptop/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The client's TipTop conversation, one row per client
 * (portal_tiptop_threads), so it follows them across tabs and devices. The
 * panel falls back to sessionStorage when the table isn't there yet
 * (`ready: false`). Whatever is stored is re-validated by the chat route on
 * every turn, like anything else the browser sends.
 */

const MAX_BYTES = 400_000;

function missingTable(err: { code?: string; message?: string } | null): boolean {
  return Boolean(err && (err.code === 'PGRST205' || err.code === '42P01' || /schema cache|does not exist/i.test(err.message ?? '')));
}

export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const { data, error } = await db
    .from('portal_tiptop_threads')
    .select('messages, updated_at')
    .eq('client_id', caller.clientId)
    .maybeSingle();
  if (error) {
    if (!missingTable(error)) console.error('[tiptop-portal] thread read failed', error.message);
    return NextResponse.json({ ready: !missingTable(error), messages: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json(
    { ready: true, messages: Array.isArray(data?.messages) ? data.messages : [], updatedAt: data?.updated_at ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function PUT(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: 'Too large' }, { status: 413 });
  let body: { messages?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!Array.isArray(body.messages)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  // Keep the most recent stretch; the model never needs more than the caps allow.
  const messages = body.messages.slice(-LIMITS.maxMessages);

  const { error } = await db
    .from('portal_tiptop_threads')
    .upsert({ client_id: caller.clientId, messages, updated_at: new Date().toISOString() }, { onConflict: 'client_id' });
  if (error) {
    if (missingTable(error)) return NextResponse.json({ ready: false });
    console.error('[tiptop-portal] thread save failed', error.message);
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }
  return NextResponse.json({ ready: true });
}

export async function DELETE(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const { error } = await db.from('portal_tiptop_threads').delete().eq('client_id', caller.clientId);
  if (error && !missingTable(error)) console.error('[tiptop-portal] thread clear failed', error.message);
  return NextResponse.json({ ok: true });
}
