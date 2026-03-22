import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/api-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY = process.env.RESEND_API_KEY
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://podlablv.com'

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function buildResetEmailHtml(resetLink: string, firstName?: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PodLab Client Portal — Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#1A1A1A;border:1px solid #2E2E2E;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #2E2E2E;">
              <div style="display:inline-block;width:48px;height:48px;background-color:#2ADD1B;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:#000;">P</div>
              <h1 style="margin:16px 0 4px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">
                PodLab Client Portal
              </h1>
              <p style="margin:0;font-size:14px;color:#888;font-weight:500;">Password Reset</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.6;">
                ${greeting}
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#ccc;line-height:1.6;">
                We received a request to reset your PodLab Client Portal password. Click the button below to set a new password.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${resetLink}" 
                       style="display:inline-block;padding:14px 32px;background-color:#2ADD1B;color:#000;font-size:15px;font-weight:800;text-decoration:none;border-radius:10px;letter-spacing:0.5px;text-transform:uppercase;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:0 0 16px;font-size:13px;color:#666;line-height:1.6;">
                This link expires in 1 hour. If you didn't request this reset, you can safely ignore this email.
              </p>
              
              <p style="margin:0;font-size:12px;color:#444;line-height:1.6;word-break:break-all;">
                Can't click the button? Copy this link:<br/>
                <a href="${resetLink}" style="color:#2ADD1B;">${resetLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #2E2E2E;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555;">
                PodLab LV — Growth Lab for Founders
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#444;">
                <a href="${SITE_URL}" style="color:#2ADD1B;text-decoration:none;">podlablv.com</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  const { limited } = rateLimit(request, { maxRequests: 3, windowMs: 60_000 })
  if (limited) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
  }

  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const supabase = getSupabase()

    // Generate a password reset link via admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: {
        redirectTo: `${SITE_URL}/login`,
      },
    })

    if (error) {
      // Don't reveal whether the email exists
      console.error('Reset link generation error:', error.message)
      return NextResponse.json({ success: true })
    }

    const resetLink = data?.properties?.action_link
    if (!resetLink) {
      console.error('No action_link in reset response')
      return NextResponse.json({ success: true })
    }

    // Look up client name for personalization
    let firstName: string | undefined
    const { data: clientData } = await supabase
      .from('clients')
      .select('first_name')
      .eq('email', cleanEmail)
      .single()

    if (clientData?.first_name) {
      firstName = clientData.first_name
    }

    // Send branded email via Resend
    if (RESEND_API_KEY) {
      const emailHtml = buildResetEmailHtml(resetLink, firstName)

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PodLab <info@podlablv.com>',
          to: cleanEmail,
          subject: 'PodLab Client Portal — Password Reset',
          html: emailHtml,
        }),
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Password reset error:', err)
    return NextResponse.json({ success: true }) // Don't reveal errors
  }
}
