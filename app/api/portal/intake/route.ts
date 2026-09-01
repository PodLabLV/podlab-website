import { NextResponse } from 'next/server';
import { admin, resolveCaller, notifySlack, logToCrm } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX = 8000;

/** Autosave a single answer. Kept to one field per call so a long form never loses work. */
export async function POST(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let payload: {
    itemId?: string;
    value?: string;
    submit?: boolean;
    fieldId?: string;
    submissionId?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // Marking the intake complete rather than saving a field.
  if (payload.submit) {
    const { count } = await db
      .from('portal_intake_answers')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', caller.clientId);

    await db
      .from('portal_delivery_phases')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('client_id', caller.clientId)
      .eq('sort_order', 1);

    await Promise.all([
      notifySlack(
        `*Intake submitted* - ${caller.businessName}\n${count ?? 0} answers. Kickoff phase closed.`,
      ),
      logToCrm(db, caller, `Submitted the portal intake (${count ?? 0} answers).`),
    ]);
    await db
      .from('portal_form_submissions')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('client_id', caller.clientId)
      .neq('status', 'submitted');

    return NextResponse.json({ ok: true, answered: count ?? 0 });
  }

  const { itemId, value, fieldId, submissionId } = payload;

  // Form-engine path (Phase 4). The page sends fieldId once the migration has
  // landed and a submission exists; until then it sends itemId and the legacy
  // tables answer. A dual write beats a hard cutover here — the legacy tables
  // hold live questions, and a client should never meet a blank intake between
  // a deploy and a migration.
  if (fieldId && submissionId) {
    if ((value ?? '').length > MAX) {
      return NextResponse.json({ error: `Keep it under ${MAX} characters.` }, { status: 400 });
    }

    // Scoped by client so a guessed submission id from another account saves nothing.
    const { data: sub } = await db
      .from('portal_form_submissions')
      .select('id')
      .eq('id', submissionId)
      .eq('client_id', caller.clientId)
      .maybeSingle();

    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { error: fErr } = await db.from('portal_form_answers').upsert(
      {
        submission_id: submissionId,
        field_id: fieldId,
        client_id: caller.clientId,
        value: value ?? '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'submission_id,field_id' },
    );

    if (fErr) {
      console.error('[portal] form answer save failed', fErr.message);
      return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!itemId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  if ((value ?? '').length > MAX) {
    return NextResponse.json({ error: `Keep it under ${MAX} characters.` }, { status: 400 });
  }

  // Scoped by client_id so a guessed item id from another account saves nothing.
  const { data: item } = await db
    .from('portal_intake_items')
    .select('id')
    .eq('id', itemId)
    .eq('client_id', caller.clientId)
    .maybeSingle();

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await db.from('portal_intake_answers').upsert(
    {
      client_id: caller.clientId,
      item_id: itemId,
      value: value ?? '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'item_id' },
  );

  if (error) {
    console.error('[portal] intake save failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
