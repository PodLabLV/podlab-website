import { NextResponse } from 'next/server';
import { admin, resolveCaller, notifySlack, logToCrm } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY = 4000;

export async function POST(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  let payload: { section?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const body = (payload.body || '').trim();
  const section = (payload.section || 'General').trim().slice(0, 120);

  if (!body) {
    return NextResponse.json({ error: 'Write a note first.' }, { status: 400 });
  }
  if (body.length > MAX_BODY) {
    return NextResponse.json(
      { error: `Keep it under ${MAX_BODY} characters.` },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from('portal_comments')
    .insert({ client_id: caller.clientId, section, body })
    .select('id, section, body, status, created_at')
    .single();

  if (error) {
    console.error('[portal] comment insert failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  const summary = body.length > 400 ? `${body.slice(0, 400)}...` : body;
  await Promise.all([
    notifySlack(
      `*Portal revision note* — ${caller.businessName}\n*Section:* ${section}\n${summary}`,
    ),
    logToCrm(db, caller, `Portal revision note on "${section}": ${summary}`),
  ]);

  return NextResponse.json({ comment: data });
}
