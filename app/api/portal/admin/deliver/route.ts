import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/portal-server';
import { resolvePublisher, recordActivity } from '@/lib/portal/server';
import { createAccessLink } from '@/lib/portal-invite';
import { emailLayout, EMAIL_STYLE, escapeHtml, sendPortalEmail, SITE_URL } from '@/lib/portal-email';
import { isElite, studioDayUrl } from '@/lib/portal/studio-day';
import { EL_WELCOME_ON_FILE, studioDayEmailBlock } from '@/lib/portal/studio-day-email';

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
  kind?: Kind;
  /** For kind "revised": what was revised ("scripts", "AssetsLab", "storyboard", "website"). */
  label?: string;
  /** el_welcome: the AssetsLab intake form. */
  intakeUrl?: string;
  /** assetslab_ready: where they book their studio day. */
  bookingUrl?: string;
  /**
   * el_welcome: "core" | "elite". ELITE adds the Studio Day booking button. When
   * missing, the plan label decides ("EssentialsLab ELITE ..."), payload first.
   */
  tier?: string;
  /** el_welcome, ELITE: the Studio Day link. Default: ELITE_STUDIO_DAY_URL. Name and email are prefilled. */
  studioUrl?: string;
  /** el_welcome: the intake is already on file, so no intake request (intakeUrl not needed). */
  intakeOnFile?: boolean;
  /** site_ready: the preview site. */
  previewUrl?: string;
  /** reminder: which step the client is holding up, and which nudge (1 = day 2, 2 = day 5). */
  step?: 'intake' | 'assetslab' | 'scripts' | 'storyboard' | 'site';
  nudge?: number;
  dryRun?: boolean;
  /** false = create/link the client only, no login and no email (publish first, then call again). */
  send?: boolean;
}

type Kind = 'new' | 'revised' | 'reminder' | 'el_welcome' | 'assetslab_ready' | 'assets_ready' | 'storyboard_ready' | 'site_ready';

interface Copy {
  subject: string;
  kicker: string;
  lead: string;
  button: string;
  /** Where the button goes once they're signed in. */
  path: string;
  activity: string;
  /** The button opens this payload URL instead of the portal (the portal link moves to the footer). */
  primary?: 'intakeUrl' | 'previewUrl';
}

const COPY: Record<Exclude<Kind, 'revised' | 'reminder'>, Copy> = {
  new: {
    subject: 'Your video scripts are ready to review',
    kicker: 'Scripts ready',
    lead:
      'Your scripts are in your portal: the main video, five openings to test, three short FAQ videos, and the full pack as a PDF. Read them, leave a note on any line you want changed, and approve the ones that sound like you.',
    button: 'Review your scripts',
    path: '/portal/scripts',
    activity: 'Your scripts are ready to review',
  },
  el_welcome: {
    subject: 'Welcome to EssentialsLab. Step one is your intake',
    kicker: 'Welcome',
    lead:
      "You're in. Step one is a short intake about your business, your clients, and your offer. It takes about 20 minutes, and everything we build for you starts from your answers. Use this email address when you fill it in so it lands in the right place.",
    button: 'Start your intake',
    path: '/portal',
    activity: 'EssentialsLab started. Next step: your intake',
    primary: 'intakeUrl',
  },
  assetslab_ready: {
    subject: 'Your AssetsLab is ready to review',
    kicker: 'AssetsLab ready',
    lead:
      'Your AssetsLab is in your portal: your ideal client, your offer, your brand voice, your customer journey, and the 90-day plan. Read it, leave a note on anything that is off, and approve it when it is right. Everything we film and build comes from this document.',
    button: 'Review your AssetsLab',
    path: '/portal/deliverables',
    activity: 'Your AssetsLab is ready to review',
  },
  assets_ready: {
    subject: 'Your EssentialsLab scripts and assets are ready',
    kicker: 'Assets ready',
    lead:
      'Your scripts and assets are in your portal: the videos we will film, your ads, and the rest of your package. Leave a note on any line you want changed, and approve each one when it sounds like you.',
    button: 'Review your assets',
    path: '/portal/scripts',
    activity: 'Your EssentialsLab assets are ready to review',
  },
  storyboard_ready: {
    subject: 'Your website storyboard is ready',
    kicker: 'Storyboard',
    lead:
      'Here is the plan for your website, section by section: what each part says and what it shows. Nothing is built yet, so this is the cheapest moment to change it. Leave notes or approve it.',
    button: 'Review the storyboard',
    path: '/portal/deliverables',
    activity: 'Your website storyboard is ready to review',
  },
  site_ready: {
    subject: 'Your website is ready to review',
    kicker: 'Website preview',
    lead:
      'Your new website is built and waiting for your review. It is a private preview, so nobody else can see it yet. Click through it on your phone and your computer, then approve it or leave notes in your portal.',
    button: 'Open the preview',
    path: '/portal/deliverables',
    activity: 'Your website preview is ready to review',
    primary: 'previewUrl',
  },
};

const REMINDER_STEP = {
  intake: { thing: 'your intake', action: 'fill it in', path: '/portal', primary: 'intakeUrl' as const, button: 'Finish your intake' },
  assetslab: { thing: 'your AssetsLab', action: 'approve it or leave a note on what to change', path: '/portal/deliverables', primary: undefined, button: 'Review your AssetsLab' },
  scripts: { thing: 'your scripts', action: 'approve them or leave a note on any line', path: '/portal/scripts', primary: undefined, button: 'Review your scripts' },
  storyboard: { thing: 'your website storyboard', action: 'approve it or leave notes', path: '/portal/deliverables', primary: undefined, button: 'Review the storyboard' },
  site: { thing: 'your website preview', action: 'approve it or leave notes', path: '/portal/deliverables', primary: 'previewUrl' as const, button: 'Open the preview' },
};

function reminderCopy(step: keyof typeof REMINDER_STEP, nudge: number): Copy {
  const r = REMINDER_STEP[step];
  const second = nudge >= 2;
  return {
    subject: second ? `Still waiting on ${r.thing}` : `A quick reminder: ${r.thing} is ready for you`,
    kicker: second ? 'Second reminder' : 'Reminder',
    lead: second
      ? `Everything after this step waits on ${r.thing}. When you have a few minutes, ${r.action}. If something is in the way, reply to this email and we will help.`
      : `${r.thing.charAt(0).toUpperCase() + r.thing.slice(1)} is ready and waiting in your portal. When you have a few minutes, ${r.action}, and we will take it from there.`,
    button: r.button,
    path: r.path,
    activity: second ? `Second reminder: ${r.thing}` : `Reminder: ${r.thing}`,
    primary: r.primary,
  };
}

function revisedCopy(label: string): Copy {
  const what = label.trim().slice(0, 40) || 'scripts';
  return {
    subject: `Your revised ${what} ${/s$/i.test(what) ? 'are' : 'is'} ready`,
    kicker: 'Revised',
    lead:
      'We made the changes from your notes. The new version is in your portal, and the old one is still there to compare. Approve it, or leave another note.',
    button: 'See the new version',
    path: /script/i.test(what) ? '/portal/scripts' : '/portal/deliverables',
    activity: `Revised ${what} ready`,
  };
}

const HTTPS = /^https:\/\/[^\s"<>]+$/i;

/**
 * POST — publish key or staff. The delivery step for the Lab automations
 * (vsllab and the EssentialsLab pipeline via Hermes): make sure the client has a
 * portal and a login, then send one email from info@ for the step they're on
 * (see COPY: scripts, EL welcome + intake, AssetsLab + studio day, assets,
 * storyboard, site preview, or a revision).
 *
 * Creates the portal_clients row when the email is new, and a login when there
 * isn't one. A client who has never set a password gets a set-password link in
 * this same email (one email, not an invite plus a notice). A client who has
 * signed in before gets a plain link to their scripts.
 *
 * send:false only ensures the client row, so scripts can be published before the
 * email goes out. kind "revised" respects notify_email; the first delivery always sends, since
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
  const kinds: Kind[] = ['new', 'revised', 'reminder', 'el_welcome', 'assetslab_ready', 'assets_ready', 'storyboard_ready', 'site_ready'];
  const kind: Kind = p.kind && kinds.includes(p.kind) ? p.kind : 'new';
  if (kind === 'reminder' && !(p.step && p.step in REMINDER_STEP)) {
    return NextResponse.json({ error: 'reminder needs step: intake | assetslab | scripts | storyboard | site' }, { status: 400 });
  }
  const onFile = kind === 'el_welcome' && p.intakeOnFile === true;
  const c: Copy =
    kind === 'revised' ? revisedCopy(p.label ?? 'scripts')
    : kind === 'reminder' ? reminderCopy(p.step as keyof typeof REMINDER_STEP, Number(p.nudge) || 1)
    : onFile ? EL_WELCOME_ON_FILE
    : COPY[kind];
  for (const k of ['intakeUrl', 'bookingUrl', 'previewUrl', 'studioUrl'] as const) {
    if (p[k] && !HTTPS.test(p[k]!)) return NextResponse.json({ error: `${k} must be an https URL.` }, { status: 400 });
  }
  if (c.primary && !p[c.primary]) return NextResponse.json({ error: `${c.primary} is required for ${kind}.` }, { status: 400 });
  const businessName = (p.businessName ?? '').trim().slice(0, 200);

  // ── find or create the client ───────────────────────────────────────
  const { data: found } = await db
    .from('portal_clients')
    .select('id, email, first_name, last_name, business_name, user_id, notify_email, plan_label')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();

  let client = found;
  let created = false;
  if (!client) {
    if (!businessName) return NextResponse.json({ error: 'businessName is required for a new client.' }, { status: 400 });
    if (p.dryRun) return NextResponse.json({ dryRun: true, wouldCreate: true, email, kind, studioDay: true });
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
      .select('id, email, first_name, last_name, business_name, user_id, notify_email, plan_label')
      .single();
    if (error || !row) {
      reportError('[portal] deliver: client insert failed', error?.message);
      return NextResponse.json({ error: 'Could not create the client.' }, { status: 500 });
    }
    client = row;
    created = true;
  } else {
    if (p.crmLeadId) {
      await db.from('portal_clients').update({ crm_lead_id: p.crmLeadId }).eq('id', client.id).is('crm_lead_id', null);
    }
    // An upgrade (EssentialsLab -> ELITE) is the one case worth overwriting the plan.
    if (p.planLabel?.trim() && !p.dryRun) {
      await db.from('portal_clients').update({ plan_label: p.planLabel.trim() }).eq('id', client.id);
    }
  }

  // studioDay: tells the automation this route takes tier / studioUrl / intakeOnFile.
  if (p.dryRun) return NextResponse.json({ dryRun: true, clientId: client.id, kind, hasLogin: Boolean(client.user_id), studioDay: true });
  if (p.send === false) return NextResponse.json({ clientId: client.id, created, emailed: false });

  if ((kind === 'revised' || kind === 'reminder') && client.notify_email === false) {
    return NextResponse.json({ clientId: client.id, created, emailed: false, skipped: 'notify_email is off' });
  }

  // ── a way in: set-password link if they've never signed in ───────────
  let url = `${SITE_URL}${c.path}`;
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
  const hello = client.first_name ? `Hi ${escapeHtml(client.first_name)},` : 'Hi there,';
  const portalUrl = url;
  // ELITE welcome: the Studio Day link goes out now, not with the AssetsLab.
  const tier = (p.tier ?? '').trim().toLowerCase();
  const elite =
    kind === 'el_welcome' &&
    (tier === 'elite' || (tier !== 'core' && isElite({ planLabel: p.planLabel?.trim() || client.plan_label })));
  const studioUrl = elite
    ? studioDayUrl([client.first_name, client.last_name].filter(Boolean).join(' '), email, p.studioUrl || undefined)
    : null;
  // On file + ELITE: booking the Studio Day is the one thing to do, so it is the button.
  const studioIsButton = Boolean(studioUrl && onFile);
  const button = studioIsButton ? 'Book your Studio Day' : c.button;
  const buttonUrl = studioIsButton ? studioUrl! : c.primary ? (p[c.primary] as string) : portalUrl;
  const external = Boolean(c.primary) || studioIsButton;
  const small = 'margin:28px 0 0;font-size:12px;line-height:1.6;color:#777777;';
  const extra: string[] = [];
  const extraText: string[] = [];
  if (kind === 'assetslab_ready' && p.bookingUrl) {
    extra.push(`        <p style="${EMAIL_STYLE.lead}margin-top:28px;">While you review, pick your studio day: <a href="${p.bookingUrl}" style="${EMAIL_STYLE.link}">book your studio session</a>.</p>`);
    extraText.push(`Pick your studio day: ${p.bookingUrl}`);
  }
  if (studioUrl && !studioIsButton) {
    const block = studioDayEmailBlock(studioUrl);
    extra.push(...block.html);
    extraText.push(...block.text);
  }
  let foot: string;
  if (external) {
    foot = needsPassword
      ? `Your client portal is set up too. <a href="${portalUrl}" style="${EMAIL_STYLE.link}">Set your password here</a>, then sign in any time at podlablv.com/login.`
      : `Everything we make for you will appear in <a href="${portalUrl}" style="${EMAIL_STYLE.link}">your portal</a>.`;
  } else {
    foot = needsPassword
      ? 'The button takes you to a page where you set a password. After that, sign in at podlablv.com/login.'
      : 'Questions? Reply to this email.';
  }
  const html = emailLayout({
    title: c.subject,
    content: [
      `        <p style="${EMAIL_STYLE.kicker}">${c.kicker}</p>`,
      `        <p style="${EMAIL_STYLE.hello}">${hello}</p>`,
      `        <p style="${EMAIL_STYLE.lead}">${c.lead}</p>`,
      `        <a href="${escapeHtml(buttonUrl)}" style="${EMAIL_STYLE.button}">${button} &rarr;</a>`,
      ...extra,
      `        <p style="${small}">${foot}</p>`,
      `        <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#555555;word-break:break-all;">Button not working? Paste this into your browser:<br><a href="${escapeHtml(buttonUrl)}" style="${EMAIL_STYLE.link}">${escapeHtml(buttonUrl)}</a></p>`,
    ].join('\n'),
  });
  const plainFoot = foot.replace(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '$2 ($1)');
  const text = [hello.replace(/&#39;/g, "'"), c.lead, `${button}: ${buttonUrl}`, ...extraText, plainFoot].join('\n\n');
  const sent = await sendPortalEmail({ to: email, subject: c.subject, html, text });
  if (!sent.ok) reportError('[portal] deliver: email failed', sent.error);

  await recordActivity(db, client.id, 'update', c.activity);

  return NextResponse.json({
    clientId: client.id,
    created,
    emailed: sent.ok,
    needsPassword,
    // Returned so the automation can text it if the email bounces.
    link: url,
    ...(studioUrl ? { studioUrl } : {}),
  });
}
