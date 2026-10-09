import type { SupabaseClient } from '@supabase/supabase-js';
import { SITE_URL, EMAIL_STYLE, emailLayout } from '@/lib/portal-email';

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

export { SITE_URL };

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

const esc = (v: string) => v.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

function emailHtml(kind: AccessKind | 'reset', url: string, firstName?: string | null, teamOf?: string): string {
  const c = { ...COPY[kind] };
  // A teammate (assistant, partner) is joining someone else's portal.
  if (teamOf && kind !== 'reset') {
    c.subject = `You have access to ${esc(teamOf)}'s PodLab Portal`;
    c.lead = `You've been given access to ${esc(teamOf)}'s PodLab Portal: the strategy, the videos in production, the deliverables and the next steps. Notes and approvals you send go out under your own name. Set a password to get in.`;
  }
  const hello = firstName ? `Hi ${firstName},` : 'Hi there,';
  return emailLayout({
    title: c.subject,
    content: [
      `        <p style="${EMAIL_STYLE.kicker}">${c.kicker}</p>`,
      `        <p style="${EMAIL_STYLE.hello}">${hello}</p>`,
      `        <p style="${EMAIL_STYLE.lead}">${c.lead}</p>`,
      `        <a href="${url}" style="${EMAIL_STYLE.button}">${c.button} &rarr;</a>`,
      `        <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#777777;">${c.foot}</p>`,
      `        <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#555555;word-break:break-all;">Button not working? Paste this into your browser:<br><a href="${url}" style="${EMAIL_STYLE.link}">${url}</a></p>`,
    ].join('\n'),
  });
}

/** Send through Resend from info@. Returns false when unconfigured or rejected; callers fall back to showing the link. */
export async function sendAccessEmail(
  kind: AccessKind | 'reset',
  to: string,
  url: string,
  firstName?: string | null,
  teamOf?: string,
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
        subject: teamOf && kind !== 'reset' ? `You have access to ${teamOf}'s PodLab Portal` : COPY[kind].subject,
        html: emailHtml(kind, url, firstName, teamOf),
      }),
    });
    if (!res.ok) console.error('[portal] access email rejected', res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (err) {
    console.error('[portal] access email threw', err);
    return false;
  }
}
