import { NextResponse } from 'next/server';
import { admin, resolveCaller, notifySlack, logToCrm } from '@/lib/portal-server';
import { recordActivity, clientIp } from '@/lib/portal/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Script approval: the client signing off on one immutable version.
 *
 * Same evidence shape as the executed Beaker agreements: who, from what
 * address, on what browser, when, against which version. Client-only on
 * purpose; an approval nobody made is worth less than none.
 */
export async function POST(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: { versionId?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!p.versionId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const { data: version } = await db
    .from('portal_script_versions')
    .select('id, script_id, client_id, version_no')
    .eq('id', p.versionId)
    .maybeSingle();
  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (version.client_id !== caller.clientId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { data: script } = await db
    .from('portal_scripts')
    .select('id, title, status, current_version')
    .eq('id', version.script_id)
    .maybeSingle();
  if (!script) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Evidence must point at the text that will actually be shot.
  if (script.current_version !== version.version_no) {
    return NextResponse.json(
      { error: 'That version has been replaced. Refresh to see the latest.' },
      { status: 409 },
    );
  }

  const { data: existing } = await db
    .from('portal_script_approvals')
    .select('*')
    .eq('version_id', version.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ approval: existing });

  const { data: approval, error } = await db
    .from('portal_script_approvals')
    .insert({
      version_id: version.id,
      script_id: version.script_id,
      client_id: version.client_id,
      approved_by_name: caller.displayName,
      approved_by_email: caller.email,
      approved_ip: clientIp(req),
      approved_user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[portal] script approval failed', error.message);
    return NextResponse.json({ error: 'Could not record that.' }, { status: 500 });
  }

  const now = new Date().toISOString();
  // Don't drag a script that's already been filmed back to "approved".
  if (!['shot', 'published'].includes((script.status || '').toLowerCase())) {
    await db.from('portal_scripts').update({ status: 'approved', updated_at: now }).eq('id', script.id);
  }
  // Approving the text says the outstanding notes are dealt with.
  await db
    .from('portal_script_comments')
    .update({ status: 'resolved', resolved_at: now })
    .eq('script_id', script.id)
    .eq('status', 'open');

  const label = `${script.title} v${version.version_no}`;
  await Promise.all([
    notifySlack(`*Script approved* — ${caller.businessName}\n${label}, approved by ${caller.displayName}. Ready to shoot.`),
    logToCrm(db, caller, `Approved script in portal: ${label}`),
    recordActivity(db, caller.clientId, 'update', `You approved ${label}`),
  ]);

  return NextResponse.json({ approval });
}
