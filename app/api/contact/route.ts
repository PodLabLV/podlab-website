import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyTeam, buildEmailHtml } from '@/lib/notifications'
import { sanitize } from '@/lib/sanitize'
import { handleCors, corsHeaders, rateLimit } from '@/lib/api-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request) || NextResponse.json({}, { headers: corsHeaders(request) })
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request)
  const { limited } = rateLimit(request, { maxRequests: 5, windowMs: 60_000 })
  if (limited) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers })
  }

  try {
    const body = await request.json()

    const name = sanitize(body.name)
    const email = sanitize(body.email)
    const phone = sanitize(body.phone)
    const company = sanitize(body.company)
    const message = sanitize(body.message)

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      )
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Save to leads table
    const { error: dbError } = await supabase.from('leads').insert({
      first_name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      source: 'website',
      source_detail: 'Contact Form',
      status: 'new',
      raw_data: { message: message.trim() },
      tags: ['contact-form', 'website'],
    })

    if (dbError) {
      console.error('Contact form DB error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save your message. Please try again.' },
        { status: 500 }
      )
    }

    // Send notifications (non-blocking)
    const notifFields: Record<string, string> = {
      Name: name.trim(),
      Email: email.trim(),
      ...(phone?.trim() ? { Phone: phone.trim() } : {}),
      ...(company?.trim() ? { Company: company.trim() } : {}),
      Message: message.trim(),
    }

    notifyTeam({
      title: ' New Contact Form',
      fields: notifFields,
      emailSubject: ` Contact Form: ${name.trim()}${company?.trim() ? ` - ${company.trim()}` : ''}`,
      emailHtml: buildEmailHtml(' New Contact Form Submission', notifFields),
      slackColor: '#e67e22',
      supabaseUrl: 'https://supabase.com/dashboard/project/tncipuxobcbkwkmpcevt/editor',
    }).catch((err) => console.error('Notification error:', err))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
