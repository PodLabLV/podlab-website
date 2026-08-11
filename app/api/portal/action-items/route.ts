import { NextResponse } from 'next/server';
import { admin, resolveCaller, notifySlack, logToCrm } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  let payload: { id?: string; done?: boolean };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { id, done } = payload;
  if (!id || typeof done !== 'boolean') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // Scoped by client_id as well as id: a guessed uuid from another account
  // updates nothing rather than someone else's checklist.
  const { data, error } = await db
    .from('portal_action_items')
    .update({
      status: done ? 'done' : 'open',
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('client_id', caller.clientId)
    .select('id, title, status, completed_at')
    .maybeSingle();

  if (error) {
    console.error('[portal] action item update failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (done) {
    await Promise.all([
      notifySlack(
        `*Action item completed* — ${caller.businessName}\n${data.title}`,
      ),
      logToCrm(db, caller, `Completed action item: ${data.title}`),
    ]);
  }

  return NextResponse.json({ item: data });
}
