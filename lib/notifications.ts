/**
 * Notification utilities for PodLab form submissions.
 * Sends Slack messages and email notifications via Resend.
 * Fails gracefully — form data always saves even if notifications fail.
 */

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'info@podlablv.com'
const FROM_EMAIL = 'info@podlablv.com'

// ─── Slack ───────────────────────────────────────────────────────────────────

interface SlackMessage {
  title: string
  fields: Record<string, string>
  color?: string
  url?: string
}

export async function notifySlack(message: SlackMessage): Promise<void> {
  if (!SLACK_WEBHOOK_URL || SLACK_WEBHOOK_URL.startsWith('placeholder')) {
    console.warn('[notifications] SLACK_WEBHOOK_URL not configured — skipping Slack notification')
    return
  }

  try {
    const fieldBlocks = Object.entries(message.fields).map(([key, value]) => ({
      type: 'section' as const,
      fields: [
        { type: 'mrkdwn' as const, text: `*${key}:*` },
        { type: 'mrkdwn' as const, text: String(value) },
      ],
    }))

    const blocks = [
      {
        type: 'header' as const,
        text: { type: 'plain_text' as const, text: message.title, emoji: true },
      },
      { type: 'divider' as const },
      ...fieldBlocks,
    ]

    if (message.url) {
      blocks.push({
        type: 'section' as const,
        fields: [
          { type: 'mrkdwn' as const, text: `<${message.url}|View in Supabase →>` },
        ],
      })
    }

    const payload = {
      attachments: [
        {
          color: message.color || '#2ADD1B',
          blocks,
        },
      ],
    }

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('[notifications] Slack webhook failed:', response.status, await response.text())
    }
  } catch (error) {
    console.error('[notifications] Slack notification error:', error)
  }
}

// ─── Email (Resend) ──────────────────────────────────────────────────────────

interface EmailAttachment {
  filename: string
  /** Raw bytes; base64-encoded here so callers never think about transport. */
  content: Buffer
}

interface NotifyEmailOpts {
  text?: string
  replyTo?: string
  fromName?: string
  unsubscribeUrl?: string
  tags?: { name: string; value: string }[]
  attachments?: EmailAttachment[]
  /** Blind-copy the team on a message addressed to someone else. */
  bcc?: string[]
}

/**
 * Send a transactional email via Resend with deliverability hygiene baked in.
 *
 * Modern (2026+) inbox providers — Gmail, Outlook, Yahoo — junk or block
 * messages without:
 *   - List-Unsubscribe + List-Unsubscribe-Post headers (one-click unsub)
 *   - Reply-To set to a real human inbox
 *   - Plain-text alternative alongside HTML
 *   - Sender Authentication (SPF/DKIM via verified domain — handled at DNS)
 *
 * notifyEmail handles all of these defensibly.
 */
export async function notifyEmail(
  to: string,
  subject: string,
  html: string,
  opts: NotifyEmailOpts = {}
): Promise<void> {
  if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('placeholder')) {
    console.warn('[notifications] RESEND_API_KEY not configured — skipping email notification')
    return
  }

  const fromName = opts.fromName || 'PodLab'
  const replyTo = opts.replyTo || FROM_EMAIL
  const unsubscribeUrl = opts.unsubscribeUrl

  // Strip HTML to plaintext fallback when caller didn't provide one.
  const text =
    opts.text ||
    html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

  const requestHeaders: Record<string, string> = {}
  if (unsubscribeUrl) {
    requestHeaders['List-Unsubscribe'] = `<${unsubscribeUrl}>, <mailto:${replyTo}?subject=unsubscribe>`
    requestHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  } else {
    requestHeaders['List-Unsubscribe'] = `<mailto:${replyTo}?subject=unsubscribe>`
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${FROM_EMAIL}>`,
        to: [to],
        reply_to: replyTo,
        subject,
        html,
        text,
        headers: requestHeaders,
        ...(opts.bcc?.length ? { bcc: opts.bcc } : {}),
        ...(opts.attachments?.length
          ? {
              attachments: opts.attachments.map((a) => ({
                filename: a.filename,
                content: a.content.toString('base64'),
              })),
            }
          : {}),
        ...(opts.tags ? { tags: opts.tags } : {}),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[notifications] Resend email failed:', response.status, errorText)
    }
  } catch (error) {
    console.error('[notifications] Email notification error:', error)
  }
}

// ─── Combined ────────────────────────────────────────────────────────────────

interface NotifyTeamOpts {
  title: string
  fields: Record<string, string>
  emailSubject: string
  emailHtml: string
  slackColor?: string
  urgency?: 'high' | 'normal'
  supabaseUrl?: string
}

export async function notifyTeam(opts: NotifyTeamOpts): Promise<void> {
  const promises: Promise<void>[] = []

  promises.push(
    notifySlack({
      title: opts.title,
      fields: opts.fields,
      color: opts.slackColor,
      url: opts.supabaseUrl,
    })
  )

  promises.push(
    notifyEmail(NOTIFICATION_EMAIL, opts.emailSubject, opts.emailHtml, {
      fromName: 'PodLab Notifications',
      tags: [{ name: 'kind', value: 'team_notification' }],
    })
  )

  // Fire both in parallel, don't block on either
  await Promise.allSettled(promises)
}

// ─── Email HTML Builder ──────────────────────────────────────────────────────

export function buildEmailHtml(title: string, fields: Record<string, string>): string {
  const rows = Object.entries(fields)
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;color:#c0c0c0;font-weight:600;white-space:nowrap;vertical-align:top;">${key}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;color:#fafafa;">${value}</td>
      </tr>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
      <h1 style="margin:0;color:#2ADD1B;font-size:14px;text-transform:uppercase;letter-spacing:2px;">PodLab</h1>
    </div>
    
    <!-- Content -->
    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;">
      <h2 style="margin:0 0 20px;color:#fafafa;font-size:20px;">${title}</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
    </div>
    
    <!-- Footer -->
    <div style="text-align:center;padding:24px;color:#666;font-size:12px;">
      <p style="margin:0;">PodLab LV · Las Vegas, NV</p>
      <p style="margin:4px 0 0;"><a href="https://podlablv.com" style="color:#2ADD1B;text-decoration:none;">podlablv.com</a></p>
    </div>
  </div>
</body>
</html>`
}
