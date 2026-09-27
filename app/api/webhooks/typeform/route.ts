import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recordSubmission } from '@/lib/portal/forms'

const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN!
const MONDAY_BOARD_ID = process.env.MONDAY_BOARD_ID || '18400694687'
const TYPEFORM_WEBHOOK_SECRET = process.env.TYPEFORM_WEBHOOK_SECRET

// Typeform sends HMAC-SHA256 signature as "sha256=<hex>" in Typeform-Signature header
async function verifyTypeformSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  if (!signature.startsWith('sha256=')) return false
  const receivedHex = signature.slice(7)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return expected === receivedHex
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Extract answer value from a Typeform answer object
function extractAnswer(answers: TypeformAnswer[], ref: string): string {
  const a = answers.find((a) => a.field?.ref === ref)
  if (!a) return ''
  return a.text ?? a.email ?? a.number?.toString() ?? a.choice?.label ?? ''
}

interface TypeformAnswer {
  field?: { ref?: string; type?: string }
  type?: string
  text?: string
  email?: string
  number?: number
  choice?: { label?: string }
}

async function createMondayItem(name: string, columnValues: Record<string, unknown>) {
  const mutation = `
    mutation {
      create_item(
        board_id: ${MONDAY_BOARD_ID},
        item_name: ${JSON.stringify(name)},
        column_values: ${JSON.stringify(JSON.stringify(columnValues))}
      ) { id }
    }
  `
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      Authorization: MONDAY_API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation }),
  })
  return res.json()
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('typeform-signature') ?? ''

  if (TYPEFORM_WEBHOOK_SECRET) {
    const valid = await verifyTypeformSignature(rawBody, signature, TYPEFORM_WEBHOOK_SECRET)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const response = (body as Record<string, unknown>).form_response as Record<string, unknown>
  if (!response) {
    return NextResponse.json({ error: 'Not a form_response event' }, { status: 400 })
  }

  const answers = (response.answers as TypeformAnswer[]) ?? []
  const hidden = (response.hidden as Record<string, string>) ?? {}

  const name = extractAnswer(answers, 'name') || hidden['name'] || 'Unknown'
  const email = extractAnswer(answers, 'email') || hidden['email'] || ''
  const company = extractAnswer(answers, 'company') || hidden['company'] || ''
  const revenue = extractAnswer(answers, 'revenue') || ''
  const contentChallenge = extractAnswer(answers, 'content_challenge') || ''
  const bestTime = extractAnswer(answers, 'best_time') || ''

  const notes = [
    company ? `Company: ${company}` : '',
    revenue ? `Revenue: ${revenue}` : '',
    contentChallenge ? `Challenge: ${contentChallenge}` : '',
    bestTime ? `Best time: ${bestTime}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const submittedAt = (response.submitted_at as string) ?? new Date().toISOString()
  const dateOnly = submittedAt.slice(0, 10)

  // Create Monday.com item
  const mondayResult = await createMondayItem(name, {
    email_mm1h2bvd: { email, text: email },
    status: { label: 'New Lead' },
    dropdown_mm1hf1ez: { labels: ['VSL Typeform'] },
    dropdown_mm1hx0sm: { labels: ['VideoSalesLab'] },
    long_text_mm1hknfy: { text: notes },
    date4: { date: dateOnly },
  })

  const mondayItemId = mondayResult?.data?.create_item?.id ?? null

  // Also persist to Supabase leads table
  if (email) {
    const supabase = getSupabase()
    const normalizedEmail = email.toLowerCase().trim()

    const { data: clientData } = await supabase
      .from('clients')
      .upsert(
        {
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' ') || '',
          email: normalizedEmail,
          company_name: company || '',
          status: 'lead',
          lead_source: 'vsl_typeform',
        },
        { onConflict: 'email' }
      )
      .select('id')
      .single()

    if (clientData?.id) {
      await supabase.from('leads').insert({
        client_id: clientData.id,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || '',
        email: normalizedEmail,
        company: company || null,
        source: 'typeform',
        source_detail: 'VSL Typeform',
        status: 'new',
        tags: ['vsl', 'typeform', 'video-sales-lab'],
        raw_responses: { name, email, company, revenue, contentChallenge, bestTime },
      })
    }
  }

  // Form tracking (Phase 4). Additive and non-blocking — the lead has already
  // reached Monday and the leads table by here.
  if (email) {
    await recordSubmission(getSupabase(), {
      formKey: 'typeform',
      email,
      name,
      raw: response,
      source: 'typeform-webhook',
    })
  }

  return NextResponse.json({ ok: true, mondayItemId })
}
