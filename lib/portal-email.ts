/**
 * The PodLab Portal email frame: black, square, the green Portal lockup on top
 * and the PodLab · Las Vegas line at the bottom. Invites, password resets and
 * the daily digest all render inside it, so they look like one product.
 *
 * Email clients ignore <style> blocks unevenly, so every style is inline.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://podlablv.com';

/** Escape text going into HTML. Anything a client or editor typed must pass through this. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const EMAIL_STYLE = {
  kicker: 'margin:0 0 10px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#2add1b;',
  hello: 'margin:0 0 16px;font-size:15px;line-height:1.6;color:#eeeeee;',
  lead: 'margin:0 0 28px;font-size:15px;line-height:1.6;color:#bdbdbd;',
  button:
    'display:inline-block;padding:15px 28px;background:#2add1b;color:#000000;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;',
  link: 'color:#2add1b;',
  muted: 'color:#888888;',
} as const;

export const EMAIL_FOOTER = `PodLab · Las Vegas · <a href="mailto:info@podlablv.com" style="color:#888888;">info@podlablv.com</a>`;

/**
 * Wraps `content` (the HTML inside the padded body cell) in the Portal frame.
 * `footer` replaces the default footer line; it is raw HTML.
 */
export function emailLayout(opts: { title: string; content: string; footer?: string }): string {
  const logo = `${SITE_URL}/portal/podlab-portal-green.png`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${opts.title}</title></head>
<body style="margin:0;padding:0;background:#000000;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 16px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0a0a0a;border:1px solid #1a1a1a;">
      <tr><td style="padding:28px 32px;border-bottom:1px solid #1a1a1a;">
        <img src="${logo}" width="168" alt="PodLab Portal" style="display:block;width:168px;height:auto;border:0;">
      </td></tr>
      <tr><td style="padding:32px;">
${opts.content}
      </td></tr>
      <tr><td style="padding:18px 32px;border-top:1px solid #1a1a1a;font-size:11px;color:#555555;">
        ${opts.footer ?? EMAIL_FOOTER}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export type SendResult = { ok: true; logged?: boolean } | { ok: false; error: string };

/**
 * Send one email through Resend from info@. Without RESEND_API_KEY, local dev
 * prints the subject instead and reports success (so flows can be exercised
 * without mailing anyone); production reports a failure.
 */
export async function sendPortalEmail(msg: { to: string; subject: string; html: string; text?: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[portal-email] RESEND_API_KEY unset; not sending "${msg.subject}" to ${msg.to}`);
      return { ok: true, logged: true };
    }
    return { ok: false, error: 'RESEND_API_KEY is not set' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PodLab <info@podlablv.com>',
        to: msg.to,
        reply_to: 'info@podlablv.com',
        subject: msg.subject,
        html: msg.html,
        ...(msg.text ? { text: msg.text } : {}),
      }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
