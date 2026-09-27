import { NextRequest, NextResponse } from 'next/server'
import { handleCors, corsHeaders, rateLimit } from '@/lib/api-utils'
import { createClient } from '@supabase/supabase-js'
import { consentRecord, consentTags } from '@/lib/smsConsent'
import { notifyTeam, notifyEmail, buildEmailHtml } from '@/lib/notifications'
import { recordSubmission } from '@/lib/portal/forms'
import { sanitize } from '@/lib/sanitize'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface EssentialsLabPayload {
  // Step 1 — You & your business
  firstName: string
  lastName: string
  email: string
  businessName?: string
  website?: string
  yearsInBusiness?: string
  revenueBand: string
  phone?: string
  sms_consent?: boolean
  // Step 2 — What you sell & to whom
  whatYouDo?: string
  coreOffer?: string
  dreamClient?: string
  topPain?: string
  outcome?: string
  differentiators?: string
  topCompetitors?: string
  clientFeedback?: string
  // Step 3 — Where you're stuck
  topGoal?: string
  marketingGap?: string
  biggestBottleneck?: string
  channels?: string[]
  // Step 4 — Voice & wrap
  brandWords?: string
  anythingElse?: string
  contactPref?: string
  // Attribution (e.g. business-card QR)
  utm_source?: string
  utm_medium?: string
  utm_content?: string
  utm_campaign?: string
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request) || NextResponse.json({}, { headers: corsHeaders(request) })
}

export async function POST(request: NextRequest) {
  const { limited } = rateLimit(request, { maxRequests: 5, windowMs: 60_000 })
  if (limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  try {
    const body: EssentialsLabPayload = await request.json()

    const firstName = sanitize(body.firstName)
    const lastName = sanitize(body.lastName)
    const email = sanitize(body.email)
    const revenueBand = sanitize(body.revenueBand)

    if (!firstName || !lastName || !email || !revenueBand) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: firstName, lastName, email, revenueBand',
        },
        { status: 400 }
      )
    }

    const businessName = sanitize(body.businessName) || ''
    const website = sanitize(body.website) || ''
    const phone = sanitize(body.phone) || ''
    const normalizedEmail = email.toLowerCase().trim()

    const supabase = getSupabase()

    // 1. Upsert into clients table
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .upsert(
        {
          first_name: firstName,
          last_name: lastName,
          email: normalizedEmail,
          phone: phone || null,
          company_name: businessName,
          status: 'lead',
          lead_source: 'essentialslab_assessment',
        },
        { onConflict: 'email' }
      )
      .select('id')
      .single()

    if (clientError) {
      console.error('Client upsert error:', clientError)
      return NextResponse.json(
        { success: false, error: 'Failed to save client data' },
        { status: 500 }
      )
    }

    const clientId = clientData.id

    // 2. Insert into leads table (columns matched to the Bottleneck route — no invented columns)
    const consent = consentRecord(phone, body.sms_consent, 'website/essentialslab-assessment')

    const { error: leadError } = await supabase.from('leads').insert({
      client_id: clientId,
      first_name: firstName,
      last_name: lastName,
      email: normalizedEmail,
      phone: phone || null,
      company: businessName || null,
      source: 'website',
      source_detail: 'EssentialsLab Assessment',
      status: 'new',
      tags: ['assessment', 'essentialslab', 'website', ...consentTags(consent),
        ...(typeof body.utm_source === 'string' && body.utm_source ? [`src:${sanitize(body.utm_source)}`] : []),
        ...(typeof body.utm_content === 'string' && body.utm_content ? [`card:${sanitize(body.utm_content)}`] : []),
      ],
      raw_responses: {
        ...consent,
        utm_source: sanitize(body.utm_source) || null,
        utm_medium: sanitize(body.utm_medium) || null,
        utm_content: sanitize(body.utm_content) || null,
        utm_campaign: sanitize(body.utm_campaign) || null,
        revenueBand,
        yearsInBusiness: sanitize(body.yearsInBusiness) || null,
        website: website || null,
        whatYouDo: sanitize(body.whatYouDo) || null,
        coreOffer: sanitize(body.coreOffer) || null,
        dreamClient: sanitize(body.dreamClient) || null,
        topPain: sanitize(body.topPain) || null,
        outcome: sanitize(body.outcome) || null,
        differentiators: sanitize(body.differentiators) || null,
        topCompetitors: sanitize(body.topCompetitors) || null,
        clientFeedback: sanitize(body.clientFeedback) || null,
        topGoal: sanitize(body.topGoal) || null,
        marketingGap: sanitize(body.marketingGap) || null,
        biggestBottleneck: sanitize(body.biggestBottleneck) || null,
        channels: Array.isArray(body.channels) ? body.channels : [],
        brandWords: sanitize(body.brandWords) || null,
        anythingElse: sanitize(body.anythingElse) || null,
        contactPref: sanitize(body.contactPref) || null,
      },
    })

    if (leadError) {
      console.error('Lead insert error:', leadError)
      console.warn('Lead insert failed but client was saved successfully')
    }

    // 3. Send team notification (non-blocking). Full discovery is persisted in
    //    leads.raw_responses; these fields make the Slack/email instantly readable.
    const fullName = `${firstName} ${lastName}`
    const channelsStr = Array.isArray(body.channels) ? body.channels.join(', ') : ''

    const notifFields: Record<string, string> = {
      Name: fullName,
      Email: email,
      ...(phone ? { Phone: phone } : {}),
      ...(businessName ? { Business: businessName } : {}),
      ...(website ? { Website: website } : {}),
      Revenue: revenueBand,
      ...(body.utm_content || body.utm_source ? { Source: `${sanitize(body.utm_source) || '—'} / ${sanitize(body.utm_content) || '—'}` } : {}),
      ...(body.yearsInBusiness ? { 'Years in Business': sanitize(body.yearsInBusiness) } : {}),
      ...(body.whatYouDo ? { 'What They Do': sanitize(body.whatYouDo) } : {}),
      ...(body.coreOffer ? { 'Core Offer': sanitize(body.coreOffer) } : {}),
      ...(body.dreamClient ? { 'Dream Client': sanitize(body.dreamClient) } : {}),
      ...(body.topPain ? { 'Top Pain': sanitize(body.topPain) } : {}),
      ...(body.outcome ? { 'Desired Outcome': sanitize(body.outcome) } : {}),
      ...(body.differentiators ? { Differentiators: sanitize(body.differentiators) } : {}),
      ...(body.topCompetitors ? { Competitors: sanitize(body.topCompetitors) } : {}),
      ...(body.clientFeedback ? { 'Client Feedback': sanitize(body.clientFeedback) } : {}),
      ...(body.topGoal ? { 'Top Goal': sanitize(body.topGoal) } : {}),
      ...(body.marketingGap ? { 'Marketing Gap': sanitize(body.marketingGap) } : {}),
      ...(body.biggestBottleneck ? { Bottleneck: sanitize(body.biggestBottleneck) } : {}),
      ...(channelsStr ? { Channels: channelsStr } : {}),
      ...(body.brandWords ? { 'Brand Words': sanitize(body.brandWords) } : {}),
      ...(body.anythingElse ? { 'Anything Else': sanitize(body.anythingElse) } : {}),
      ...(body.contactPref ? { 'Contact Preference': sanitize(body.contactPref) } : {}),
    }

    notifyTeam({
      title: '🚀 New EssentialsLab Assessment',
      fields: notifFields,
      emailSubject: `🚀 New EssentialsLab Assessment: ${fullName} (${revenueBand})`,
      emailHtml: buildEmailHtml('🚀 New EssentialsLab Assessment', notifFields),
      slackColor: '#2ADD1B',
      supabaseUrl: `https://supabase.com/dashboard/project/tncipuxobcbkwkmpcevt/editor`,
    }).catch((err) => console.error('Team notification error:', err))

    // 4. Send confirmation email to customer (non-blocking)
    const calendlyUrl = 'https://calendly.com/podlablv/essentialslab-clarity-call'
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://podlablv.com'

    const customerHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
      <h1 style="margin:0;color:#2ADD1B;font-size:14px;text-transform:uppercase;letter-spacing:2px;">PodLab</h1>
    </div>
    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:32px;">
      <h2 style="margin:0 0 16px;color:#fafafa;font-size:22px;">Got it, ${firstName} — $1M is the starting line.</h2>
      <p style="margin:0 0 16px;color:#c0c0c0;font-size:15px;line-height:1.6;">
        Thanks for completing your EssentialsLab Assessment. We'll review your answers and reach out with next steps.
      </p>
      <p style="margin:0 0 24px;color:#c0c0c0;font-size:15px;line-height:1.6;">
        Want to fast-track? Book a strategy call and we'll walk through your bottleneck live.
      </p>
      <div style="text-align:center;margin:8px 0 8px;">
        <a href="${calendlyUrl}" style="display:inline-block;background:#2ADD1B;color:#000;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;">Book a Strategy Call →</a>
      </div>
    </div>
    <div style="text-align:center;padding:24px;color:#666;font-size:12px;">
      <p style="margin:0;">PodLab LV · Las Vegas, NV</p>
      <p style="margin:4px 0 0;"><a href="${siteUrl}" style="color:#2ADD1B;text-decoration:none;">podlablv.com</a></p>
    </div>
  </div>
</body>
</html>`

    const customerPlaintext = `Got it, ${firstName} — $1M is the starting line.

Thanks for completing your EssentialsLab Assessment. We'll review your answers and reach out with next steps.

Want to fast-track? Book a strategy call: ${calendlyUrl}

— Hiram at PodLab
Las Vegas, NV
${siteUrl}

To unsubscribe, reply to this email with "unsubscribe".`

    notifyEmail(
      normalizedEmail,
      `${firstName}, we got your EssentialsLab Assessment`,
      customerHtml,
      {
        text: customerPlaintext,
        replyTo: 'info@podlablv.com',
        fromName: 'Hiram at PodLab',
        tags: [{ name: 'kind', value: 'essentialslab_assessment' }],
      }
    ).catch((err) => console.error('Customer confirmation email error:', err))


    // Form tracking (Phase 4). Additive and non-blocking: the lead has already
    // landed everywhere it used to by this point, and a reporting row must
    // never cost one.
    recordSubmission(supabase, {
      formKey: 'essentialslab',
      email: email,
      name: firstName,
      raw: body,
      source: 'essentialslab',
      company: businessName,
    }).catch((err) => console.error('Form tracking error:', err))

    return NextResponse.json({ success: true, clientId })
  } catch (error) {
    console.error('EssentialsLab Assessment API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
