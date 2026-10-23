import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/portal-server';
import { resolvePublisher, recordActivity } from '@/lib/portal/server';
import { createAccessLink } from '@/lib/portal-invite';
import { emailLayout, EMAIL_STYLE, escapeHtml, sendPortalEmail, SITE_URL } from '@/lib/portal-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Payload {
  email?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  website?: string;
  crmLeadId?: string;
  planLabel?: string;
  kind?: 'new' | 'revised';
  dryRun?: boolean;
}

const COPY = {
  new: {
    subject: 'Your video scripts are ready to review',
    kicker: 'Scripts ready',
    lead:
      'Your scripts are in your portal: the main video, five openings to test, three short FAQ videos, and the full pack as a PDF. Read them, leave a note on any line you want changed, and approve the ones that sound like you.',
    button: 'Review your scripts',
  },
  revised: {
    subject: 'Your revised scripts are ready',
    kicker: 'Revised',
    lead:
      'We made the changes from your notes. The new version is in your portal, and the old one is still there to compare. Approve it, or leave another note.',
    button: 'See the new version',
  },
} as const;

/**
 * POST — publish key or staff. The delivery step for the Lab automations
 * (vsllab via Hermes): make sure the client has a portal and a login, then email
 * them from info@ that their scripts are ready.
 *
 * Creates the portal_clients row when the email is new, and a login when there
 * isn't one. A client who has never set a password gets a set-password link in
 * this same email (one email, not an invite plus a notice). A client who has
 * signed in before gets a plain link to their scripts.
 *
 * kind "revised" respects notify_email; the first delivery always sends, since
 * it carries the only way in.
 */
export async function POST(req: Request) {
  const db = admin();
  const publisher = await resolvePublisher(req, db);
  if (!publisher) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let p: Payload;
  try {
    p = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const email = (p.email ?? '').trim().toLowerCase();
  if (!EMAIL_OK.test(email) || email.endsWith('.invalid')) {
    return NextResponse.json({ error: 'A real email address is required.' }, { status: 400 });
  }
  const kind = p.kind === 'revised' ? 'revised' : 'new';
  const businessName = (p.businessName ?? '').trim().slice(0, 200);

  // ── find or create the client ───────────────────────────────────────
  const { data: found } = await db
    .from('portal_clients')
    .select('id, email, first_name, last_name, business_name, user_id, notify_email')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();

  let client = found;
  let created = false;
  if (!client) {
    if (!businessName) return NextResponse.json({ error: 'businessName is required for a new client.' }, { status: 400 });
    if (p.dryRun) return NextResponse.json({ dryRun: true, wouldCreate: true, email, kind });
    const { data: row, error } = await db
      .from('portal_clients')
      .insert({
        email,
        first_name: p.firstName?.trim() || null,
        last_name: p.lastName?.trim() || null,
        business_name: businessName,
        phone: p.phone?.trim() || null,
        website: p.website?.trim() || null,
        crm_lead_id: p.crmLeadId || null,
        plan_label: p.planLabel?.trim() || null,
      })
      .select('id, email, first_name, last_name, business_name, user_id, notify_email')
      .single();
    if (error || !row) {
      reportError('[portal] deliver: client insert failed', error?.message);
      return NextResponse.json({ error: 'Could not create the client.' }, { status: 500 });
    }
    client = row;
    created = true;
  } else if (p.crmLeadId) {
    await db.from('portal_clients').update({ crm_lead_id: p.crmLeadId }).eq('id', client.id).is('crm_lead_id', null);
  }

  if (p.dryRun) return NextResponse.json({ dryRun: true, clientId: client.id, kind, hasLogin: Boolean(client.user_id) });

  if (kind === 'revised' && client.notify_email === false) {
    return NextResponse.json({ clientId: client.id, created, emailed: false, skipped: 'notify_email is off' });
  }

  // ── a way in: set-password link if they've never signed in ───────────
  let url = `${SITE_URL}/portal/scripts`;
  let needsPassword = true;
  if (client.user_id) {
    const { data } = await db.auth.admin.getUserById(client.user_id);
    needsPassword = !data?.user?.last_sign_in_at;
  }
  if (needsPassword) {
    const link = await createAccessLink(db, {
      email,
      firstName: client.first_name,
      lastName: client.last_name,
      forceRecovery: Boolean(client.user_id),
    });
    if (!link) return NextResponse.json({ error: 'Could not create the sign-in link.' }, { status: 500 });

    const { data: owner } = await db
      .from('portal_clients')
      .select('id, business_name')
      .eq('user_id', link.userId)
      .neq('id', client.id)
      .maybeSingle();
    if (owner) {
      return NextResponse.json({ error: `That login already opens ${owner.business_name}'s portal.` }, { status: 409 });
    }
    const update = { user_id: link.userId, invited_at: new Date().toISOString(), invited_by: publisher.email ?? 'automation' };
    const { error } = await db.from('portal_clients').update(update).eq('id', client.id);
    if (error) reportError('[portal] deliver: link-up failed', error.message);
    url = link.url;
  }

  // ── the email ───────────────────────────────────────────────────────
  const c = COPY[kind];
  const hello = client.first_name ? `Hi ${escapeHtml(client.first_name)},` : 'Hi there,';
  const foot = needsPassword
    ? 'The button takes you to a page where you set a password. After that, sign in at podlablv.com/login.'
    : 'Questions? Reply to this email.';
  const html = emailLayout({
    title: c.subject,
    content: [
      `        <p style="${EMAIL_STYLE.kicker}">${c.kicker}</p>`,
      `        <p style="${EMAIL_STYLE.hello}">${hello}</p>`,
      `        <p style="${EMAIL_STYLE.lead}">${c.lead}</p>`,
      `        <a href="${url}" style="${EMAIL_STYLE.button}">${c.button} &rarr;</a>`,
      `        <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#777777;">${foot}</p>`,
      `        <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#555555;word-break:break-all;">Button not working? Paste this into your browser:<br><a href="${url}" style="${EMAIL_STYLE.link}">${url}</a></p>`,
    ].join('\n'),
  });
  const text = `${hello.replace(/&#39;/g, "'")}\n\n${c.lead}\n\n${c.button}: ${url}\n\n${foot}`;
  const sent = await sendPortalEmail({ to: email, subject: c.subject, html, text });
  if (!sent.ok) reportError('[portal] deliver: email failed', sent.error);

  await recordActivity(db, client.id, 'update', kind === 'new' ? 'Your scripts are ready to review' : 'Revised scripts are ready');

  return NextResponse.json({
    clientId: client.id,
    created,
    emailed: sent.ok,
    needsPassword,
    // Returned so the automation can text it if the email bounces.
    link: url,
  });
}
