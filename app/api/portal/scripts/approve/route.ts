import { NextResponse } from 'next/server';
import { admin, resolveCaller, recordEvent } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Script approval — the client validating a version.
 *
 * Captures the same evidence shape the executed Beaker agreements use
 * (20260819): who approved, from what address, on what browser, at what moment,
 * against a specific immutable version. "The script we shot is not the script I
 * approved" is a conversation this is designed to end.
 *
 * Client-only on purpose. Staff cannot approve on a client's behalf — an
 * approval nobody made is worth less than no approval at all.
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
    .select('id, title, current_version')
    .eq('id', version.script_id)
    .maybeSingle();

  // Only the current version can be approved. Approving a superseded draft
  // would produce evidence pointing at text nobody intends to shoot.
  if (script && script.current_version !== version.version_no) {
    return NextResponse.json(
      { error: 'That version has been superseded. Refresh to see the latest.' },
      { status: 409 },
    );
  }

  // Vercel puts the client address in x-forwarded-for; the first entry is the
  // caller, the rest are proxies.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null;

  const { data: approval, error } = await db
    .from('portal_script_approvals')
    .upsert(
      {
        version_id: version.id,
        script_id: version.script_id,
        client_id: version.client_id,
        approved_by_name: caller.displayName,
        approved_by_email: caller.email,
        approved_ip: ip,
        approved_user_agent: req.headers.get('user-agent'),
      },
      { onConflict: 'version_id', ignoreDuplicates: true },
    )
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[portal] approval failed', error.message);
    return NextResponse.json({ error: 'Could not record that.' }, { status: 500 });
  }

  await db
    .from('portal_scripts')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', version.script_id);

  // Resolve every open note on this script: approving the text is a statement
  // that the outstanding feedback has been dealt with.
  await db
    .from('portal_script_comments')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('script_id', version.script_id)
    .eq('status', 'open');

  await recordEvent(db, {
    clientId: version.client_id,
    module: 'scripts',
    kind: 'script.approved',
    title: `Script validated — ${script?.title ?? 'script'} v${version.version_no}`,
    detail: `Approved by ${caller.displayName}`,
    actorName: caller.displayName,
    actorKind: 'client',
    refId: version.script_id,
    crmLeadId: caller.crmLeadId,
    businessName: caller.businessName,
    slack: true,
  });

  return NextResponse.json({ approval: approval ?? { version_id: version.id } });
}
