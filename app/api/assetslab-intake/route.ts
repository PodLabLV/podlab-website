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

interface AssetsLabIntakePayload {
  // Step 1 — You & your business
  fullName: string
  email: string
  phone?: string
  sms_consent?: boolean
  businessName: string
  website?: string
  yearsInBusiness?: string
  annualRevenue?: string
  // Step 2 — What you do
  businessDescription?: string
  servicesOffered?: string
  coreOfferDescription?: string
  differentiators?: string
  // Step 3 — Your customers
  currentCustomers?: string
  dreamClient?: string
  painPoints?: string
  outcomeDelivered?: string
  bestClientFeedback?: string
  customerChannels?: string[]
  // Step 4 — Competitors & market
  topCompetitors?: string
  competitorAdmire?: string
  // Step 5 — Brand
  brandPersonality?: string
  brandAdjectives?: string
  brandTone?: string
  brandsAdmired?: string
  hasMvv?: string
  // Step 6 — Wrap
  existingMaterials?: string
  customerResearchStatus?: string
  topGoals?: string
  marketingGap?: string
  anythingElse?: string
  // Attribution
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
    const body: AssetsLabIntakePayload = await request.json()

    const fullName = sanitize(body.fullName)
    const email = sanitize(body.email)
    const businessName = sanitize(body.businessName)

    if (!fullName || !email || !businessName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: fullName, email, businessName',
        },
        { status: 400 }
      )
    }

    // Split full name into first/last for the clients table.
    const nameParts = fullName.split(/\s+/)
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || ''

    const phone = sanitize(body.phone) || ''
    const website = sanitize(body.website) || ''
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
          lead_source: 'assetslab_intake',
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

    // 2. Insert into leads table — the entire deep intake persists in raw_responses
    //    so /assetslab can consume it. Columns matched to the EssentialsLab route.
    const consent = consentRecord(phone, body.sms_consent, 'website/assetslab-intake')

    const { error: leadError } = await supabase.from('leads').insert({
      client_id: clientId,
      first_name: firstName,
      last_name: lastName,
      email: normalizedEmail,
      phone: phone || null,
      company: businessName || null,
      source: 'website',
      source_detail: 'AssetsLab Intake',
      status: 'new',
      tags: ['intake', 'assetslab', 'website', ...consentTags(consent),
        ...(typeof body.utm_source === 'string' && body.utm_source ? [`src:${sanitize(body.utm_source)}`] : []),
        ...(typeof body.utm_content === 'string' && body.utm_content ? [`card:${sanitize(body.utm_content)}`] : []),
      ],
      raw_responses: {
        ...consent,
        // Attribution
        utm_source: sanitize(body.utm_source) || null,
        utm_medium: sanitize(body.utm_medium) || null,
        utm_content: sanitize(body.utm_content) || null,
        utm_campaign: sanitize(body.utm_campaign) || null,
        // Step 1 — You & your business
        fullName,
        email: normalizedEmail,
        phone: phone || null,
        businessName,
        website: website || null,
        yearsInBusiness: sanitize(body.yearsInBusiness) || null,
        annualRevenue: sanitize(body.annualRevenue) || null,
        // Step 2 — What you do
        businessDescription: sanitize(body.businessDescription) || null,
        servicesOffered: sanitize(body.servicesOffered) || null,
        coreOfferDescription: sanitize(body.coreOfferDescription) || null,
        differentiators: sanitize(body.differentiators) || null,
        // Step 3 — Your customers
        currentCustomers: sanitize(body.currentCustomers) || null,
        dreamClient: sanitize(body.dreamClient) || null,
        painPoints: sanitize(body.painPoints) || null,
        outcomeDelivered: sanitize(body.outcomeDelivered) || null,
        bestClientFeedback: sanitize(body.bestClientFeedback) || null,
        customerChannels: Array.isArray(body.customerChannels) ? body.customerChannels : [],
        // Step 4 — Competitors & market
        topCompetitors: sanitize(body.topCompetitors) || null,
        competitorAdmire: sanitize(body.competitorAdmire) || null,
        // Step 5 — Brand
        brandPersonality: sanitize(body.brandPersonality) || null,
        brandAdjectives: sanitize(body.brandAdjectives) || null,
        brandTone: sanitize(body.brandTone) || null,
        brandsAdmired: sanitize(body.brandsAdmired) || null,
        hasMvv: sanitize(body.hasMvv) || null,
        // Step 6 — Wrap
        existingMaterials: sanitize(body.existingMaterials) || null,
        customerResearchStatus: sanitize(body.customerResearchStatus) || null,
        topGoals: sanitize(body.topGoals) || null,
        marketingGap: sanitize(body.marketingGap) || null,
        anythingElse: sanitize(body.anythingElse) || null,
      },
    })

    if (leadError) {
      console.error('Lead insert error:', leadError)
      console.warn('Lead insert failed but client was saved successfully')
    }

    // 3. Send team notification (non-blocking). Full intake is persisted in
    //    leads.raw_responses; these fields make the Slack/email instantly readable.
    const channelsStr = Array.isArray(body.customerChannels) ? body.customerChannels.join(', ') : ''

    const notifFields: Record<string, string> = {
      Name: fullName,
      Email: email,
      ...(phone ? { Phone: phone } : {}),
      Business: businessName,
      ...(website ? { Website: website } : {}),
      ...(body.annualRevenue ? { Revenue: sanitize(body.annualRevenue) } : {}),
      ...(body.yearsInBusiness ? { 'Years in Business': sanitize(body.yearsInBusiness) } : {}),
      ...(body.utm_content || body.utm_source ? { Source: `${sanitize(body.utm_source) || '—'} / ${sanitize(body.utm_content) || '—'}` } : {}),
      ...(body.businessDescription ? { 'Business': sanitize(body.businessDescription) } : {}),
      ...(body.coreOfferDescription ? { 'Core Offer': sanitize(body.coreOfferDescription) } : {}),
      ...(body.differentiators ? { Differentiators: sanitize(body.differentiators) } : {}),
      ...(body.dreamClient ? { 'Dream Client': sanitize(body.dreamClient) } : {}),
      ...(body.painPoints ? { 'Pain Points': sanitize(body.painPoints) } : {}),
      ...(body.outcomeDelivered ? { 'Outcome': sanitize(body.outcomeDelivered) } : {}),
      ...(channelsStr ? { Channels: channelsStr } : {}),
      ...(body.topCompetitors ? { Competitors: sanitize(body.topCompetitors) } : {}),
      ...(body.brandAdjectives ? { 'Brand Words': sanitize(body.brandAdjectives) } : {}),
      ...(body.brandTone ? { 'Brand Tone': sanitize(body.brandTone) } : {}),
      ...(body.hasMvv ? { 'Has MVV': sanitize(body.hasMvv) } : {}),
      ...(body.topGoals ? { 'Top Goals': sanitize(body.topGoals) } : {}),
      ...(body.marketingGap ? { 'Marketing Gap': sanitize(body.marketingGap) } : {}),
      ...(body.existingMaterials ? { 'Existing Materials': sanitize(body.existingMaterials) } : {}),
      ...(body.anythingElse ? { 'Anything Else': sanitize(body.anythingElse) } : {}),
    }

    notifyTeam({
      title: '🧪 New AssetsLab Intake',
      fields: notifFields,
      emailSubject: `🧪 New AssetsLab Intake: ${fullName} (${businessName})`,
      emailHtml: buildEmailHtml('🧪 New AssetsLab Intake', notifFields),
      slackColor: '#2ADD1B',
      supabaseUrl: `https://supabase.com/dashboard/project/tncipuxobcbkwkmpcevt/editor`,
    }).catch((err) => console.error('Team notification error:', err))

    // 4. Send confirmation email to customer (non-blocking)
    const calendlyUrl = 'https://calendly.com/podlablv/strategy-call'
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
      <h2 style="margin:0 0 16px;color:#fafafa;font-size:22px;">Got it, ${firstName} — let's build your foundation.</h2>
      <p style="margin:0 0 16px;color:#c0c0c0;font-size:15px;line-height:1.6;">
        Thanks for completing your AssetsLab Intake. We'll review every answer and turn it into your strategic foundation — your offer, your customer, your voice, your edge.
      </p>
      <p style="margin:0 0 24px;color:#c0c0c0;font-size:15px;line-height:1.6;">
        Want to talk it through? Book a call and we'll walk it live.
      </p>
      <div style="text-align:center;margin:8px 0 8px;">
        <a href="${calendlyUrl}" style="display:inline-block;background:#2ADD1B;color:#000;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;">Book a Call →</a>
      </div>
    </div>
    <div style="text-align:center;padding:24px;color:#666;font-size:12px;">
      <p style="margin:0;">PodLab LV · Las Vegas, NV</p>
      <p style="margin:4px 0 0;"><a href="${siteUrl}" style="color:#2ADD1B;text-decoration:none;">podlablv.com</a></p>
    </div>
  </div>
</body>
</html>`

    const customerPlaintext = `Got it, ${firstName} — let's build your foundation.

Thanks for completing your AssetsLab Intake. We'll review every answer and turn it into your strategic foundation — your offer, your customer, your voice, your edge.

Want to talk it through? Book a call: ${calendlyUrl}

— Hiram at PodLab
Las Vegas, NV
${siteUrl}

To unsubscribe, reply to this email with "unsubscribe".`

    notifyEmail(
      normalizedEmail,
      `${firstName}, we got your AssetsLab Intake`,
      customerHtml,
      {
        text: customerPlaintext,
        replyTo: 'info@podlablv.com',
        fromName: 'Hiram at PodLab',
        tags: [{ name: 'kind', value: 'assetslab_intake' }],
      }
    ).catch((err) => console.error('Customer confirmation email error:', err))


    // Form tracking (Phase 4). Additive and non-blocking: the lead has already
    // landed everywhere it used to by this point, and a reporting row must
    // never cost one.
    recordSubmission(supabase, {
      formKey: 'assetslab-intake',
      email: email,
      name: fullName,
      raw: body,
      source: 'assetslab-intake',
      company: businessName,
    }).catch((err) => console.error('Form tracking error:', err))

    return NextResponse.json({ success: true, clientId })
  } catch (error) {
    console.error('AssetsLab Intake API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
