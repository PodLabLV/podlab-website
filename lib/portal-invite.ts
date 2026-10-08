import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Portal access links: the invite a new client gets, and the reset link for a
 * forgotten password. Both land on /login/set-password, which verifies the
 * token and asks for a password in one step.
 *
 * The link carries Supabase's hashed token to OUR server instead of Supabase's
 * own /verify redirect:
 * - /api/portal/access parks the token in an httpOnly cookie and redirects to a
 *   clean /login/set-password, so the token never sits in a page URL that the
 *   site's analytics (GA, Clarity, PostHog, Meta) would record.
 * - The token is only spent when the client submits a password, so an email
 *   scanner prefetching the link burns nothing.
 * - The old redirect-to-/login flow logged people in without ever setting a
 *   password, so "forgot password" quietly never worked.
 */

export const ACCESS_COOKIE = 'portal_access';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://podlablv.com';

export type AccessKind = 'invite' | 'recovery';

export interface AccessLink {
  userId: string;
  kind: AccessKind;
  url: string;
}

function linkFor(kind: AccessKind, tokenHash: string): string {
  const u = new URL('/api/portal/access', SITE_URL);
  u.searchParams.set('token_hash', tokenHash);
  u.searchParams.set('type', kind);
  return u.toString();
}

/**
 * An invite for someone with no login yet; a recovery link for someone who has
 * one (re-inviting, or an auth user that already existed for that email).
 */
export async function createAccessLink(
  db: SupabaseClient,
  opts: { email: string; firstName?: string | null; lastName?: string | null; forceRecovery?: boolean },
): Promise<AccessLink | null> {
  const meta = { first_name: opts.firstName ?? '', last_name: opts.lastName ?? '' };

  if (!opts.forceRecovery) {
    const invite = await db.auth.admin.generateLink({ type: 'invite', email: opts.email, options: { data: meta } });
    if (!invite.error && invite.data?.properties?.hashed_token && invite.data.user) {
      return { userId: invite.data.user.id, kind: 'invite', url: linkFor('invite', invite.data.properties.hashed_token) };
    }
    // Already registered falls through to a recovery link; anything else is a real failure.
    if (invite.error && !/already/i.test(invite.error.message)) {
      console.error('[portal] invite link failed', invite.error.message);
      return null;
    }
  }

  const rec = await db.auth.admin.generateLink({ type: 'recovery', email: opts.email });
  if (rec.error || !rec.data?.properties?.hashed_token || !rec.data.user) {
    console.error('[portal] recovery link failed', rec.error?.message);
    return null;
  }
  return { userId: rec.data.user.id, kind: 'recovery', url: linkFor('recovery', rec.data.properties.hashed_token) };
}

// ── email ────────────────────────────────────────────────────────────────

const COPY: Record<AccessKind | 'reset', { subject: string; kicker: string; lead: string; button: string; foot: string }> = {
  invite: {
    subject: 'Your PodLab Portal is ready',
    kicker: 'Welcome',
    lead: 'Your PodLab Portal is set up. It is where your strategy, your videos in production, your deliverables and your next steps all live. Set a password to get in.',
    button: 'Set my password',
    foot: 'This link works once. If it has expired, use “Forgot it?” on the sign-in page and we will send a fresh one.',
  },
  recovery: {
    subject: 'Your PodLab Portal sign-in link',
    kicker: 'Sign in',
    lead: 'Here is a fresh link to your PodLab Portal. Set a password and you are in.',
    button: 'Set my password',
    foot: 'This link works once and expires soon.',
  },
  reset: {
    subject: 'PodLab Portal — reset your password',
    kicker: 'Password reset',
    lead: 'We received a request to reset your PodLab Portal password. Choose a new one below.',
    button: 'Choose a new password',
    foot: 'This link works once and expires in an hour. If you did not ask for this, ignore this email.',
  },
};

function emailHtml(kind: AccessKind | 'reset', url: string, firstName?: string | null): string {
  const c = COPY[kind];
  const hello = firstName ? `Hi ${firstName},` : 'Hi there,';
  const logo = `${SITE_URL}/portal/podlab-portal-green.png`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${c.subject}</title></head>
<body style="margin:0;padding:0;background:#000000;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 16px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0a0a0a;border:1px solid #1a1a1a;">
      <tr><td style="padding:28px 32px;border-bottom:1px solid #1a1a1a;">
        <img src="${logo}" width="168" alt="PodLab Portal" style="display:block;width:168px;height:auto;border:0;">
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 10px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#2add1b;">${c.kicker}</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#eeeeee;">${hello}</p>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#bdbdbd;">${c.lead}</p>
        <a href="${url}" style="display:inline-block;padding:15px 28px;background:#2add1b;color:#000000;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;">${c.button} &rarr;</a>
        <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#777777;">${c.foot}</p>
        <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#555555;word-break:break-all;">Button not working? Paste this into your browser:<br><a href="${url}" style="color:#2add1b;">${url}</a></p>
      </td></tr>
      <tr><td style="padding:18px 32px;border-top:1px solid #1a1a1a;font-size:11px;color:#555555;">
        PodLab · Las Vegas · <a href="mailto:info@podlablv.com" style="color:#888888;">info@podlablv.com</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/** Send through Resend from info@. Returns false when unconfigured or rejected; callers fall back to showing the link. */
export async function sendAccessEmail(
  kind: AccessKind | 'reset',
  to: string,
  url: string,
  firstName?: string | null,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PodLab <info@podlablv.com>',
        to,
        reply_to: 'info@podlablv.com',
        subject: COPY[kind].subject,
        html: emailHtml(kind, url, firstName),
      }),
    });
    if (!res.ok) console.error('[portal] access email rejected', res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (err) {
    console.error('[portal] access email threw', err);
    return false;
  }
}
