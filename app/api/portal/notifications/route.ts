import { NextResponse } from 'next/server';
import { admin, resolveCaller } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Mark notifications read.
 *
 * Reading them is a plain RLS select through the browser client — the policy
 * already scopes to the individual. Only the write needs to come through here.
 */
export async function PATCH(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: { ids?: string[]; all?: boolean };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Scoped by client_id in both branches, so a guessed id from another account
  // marks nothing. The service role bypasses RLS — the filter is the guard.
  let q = db
    .from('portal_notifications')
    .update({ read_at: now })
    .eq('client_id', caller.clientId)
    .is('read_at', null);

  if (!p.all) {
    if (!Array.isArray(p.ids) || p.ids.length === 0) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    q = q.in('id', p.ids.slice(0, 200));
  }

  const { error } = await q;
  if (error) {
    console.error('[portal] notification read failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
