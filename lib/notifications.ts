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

export async function notifyEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('placeholder')) {
    console.warn('[notifications] RESEND_API_KEY not configured — skipping email notification')
    return
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `PodLab Notifications <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
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
    notifyEmail(NOTIFICATION_EMAIL, opts.emailSubject, opts.emailHtml)
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
