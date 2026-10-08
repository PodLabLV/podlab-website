import { NextResponse } from 'next/server';
import { admin, resolveCaller, notifySlack, logToCrm } from '@/lib/portal-server';
import { recordActivity, trimTo, MAX_NOTE } from '@/lib/portal/server';
import { unsentClientNotes } from '@/lib/portal/scripts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Revision request: the client sends their notes on the current version.
 *
 * This is the one place a script revision pings Slack and the CRM timeline, with
 * every unsent note in the message, so the producer gets a single readable
 * brief instead of a drip of alerts.
 */
export async function POST(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: { scriptId?: string; message?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!p.scriptId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const message = (p.message || '').trim().slice(0, MAX_NOTE);

  const { data: script } = await db
    .from('portal_scripts')
    .select('id, client_id, title, status, current_version, changes_requested_at')
    .eq('id', p.scriptId)
    .maybeSingle();
  if (!script) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (script.client_id !== caller.clientId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  if (['approved', 'shot', 'published'].includes((script.status || '').toLowerCase())) {
    return NextResponse.json({ error: 'This script is already approved.' }, { status: 409 });
  }

  const { data: version } = await db
    .from('portal_script_versions')
    .select('id, version_no')
    .eq('script_id', script.id)
    .eq('version_no', script.current_version)
    .maybeSingle();
  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: notes } = await db
    .from('portal_script_comments')
    .select('id, quoted_text, body, author_kind, status, created_at')
    .eq('version_id', version.id)
    .order('created_at');

  const unsent = unsentClientNotes(notes ?? [], script.changes_requested_at);

  // A general message is saved as a whole-script note so it lives with the rest.
  if (message) {
    await db.from('portal_script_comments').insert({
      version_id: version.id,
      script_id: script.id,
      client_id: script.client_id,
      body: message,
      author_name: caller.displayName,
      author_kind: 'client',
    });
  }

  if (unsent.length === 0 && !message) {
    return NextResponse.json(
      { error: 'Leave at least one note so we know what to change.' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const { error } = await db
    .from('portal_scripts')
    .update({ status: 'changes requested', changes_requested_at: now, updated_at: now })
    .eq('id', script.id);
  if (error) {
    console.error('[portal] script changes update failed', error.message);
    return NextResponse.json({ error: 'Could not send that.' }, { status: 500 });
  }

  const lines = [
    ...(message ? [`Overall: ${trimTo(message, 400)}`] : []),
    ...unsent.map((n) =>
      n.quoted_text ? `On "${trimTo(n.quoted_text, 80)}": ${trimTo(n.body, 300)}` : trimTo(n.body, 300),
    ),
  ];
  const count = unsent.length + (message ? 1 : 0);
  const label = `${script.title} v${version.version_no}`;
  const shown = lines.slice(0, 12).map((l) => `• ${l}`).join('\n');
  const more = lines.length > 12 ? `\n…and ${lines.length - 12} more in the portal.` : '';

  await Promise.all([
    notifySlack(`*Script revision requested* — ${caller.businessName}\n*${label}* · ${count} note${count === 1 ? '' : 's'}\n${shown}${more}`),
    logToCrm(db, caller, `Requested script changes in portal on ${label} (${count} note${count === 1 ? '' : 's'}): ${trimTo(lines.join(' | '), 1500)}`),
    recordActivity(db, caller.clientId, 'update', `You sent ${count} note${count === 1 ? '' : 's'} on ${label}`),
  ]);

  return NextResponse.json({ status: 'changes requested', sent: count });
}
