import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN!
const MONDAY_BOARD_ID = '18400694687'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function findMondayItemByEmail(email: string): Promise<string | null> {
  // Values go in as GraphQL variables, never pasted into the query text.
  const query = `
    query ($board: [ID!], $email: CompareValue!) {
      boards(ids: $board) {
        items_page(limit: 1, query_params: {
          rules: [{ column_id: "email_mm1h2bvd", compare_value: $email }]
        }) {
          items { id }
        }
      }
    }
  `
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      Authorization: MONDAY_API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { board: [MONDAY_BOARD_ID], email: [email] } }),
  })
  const data = await res.json()
  return data?.data?.boards?.[0]?.items_page?.items?.[0]?.id ?? null
}

async function updateMondayItemStatus(itemId: string, statusLabel: string) {
  if (!/^\d+$/.test(itemId)) throw new Error('unexpected Monday item id')
  const mutation = `
    mutation ($board: ID!, $item: ID!, $value: String!) {
      change_simple_column_value(board_id: $board, item_id: $item, column_id: "status", value: $value) { id }
    }
  `
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      Authorization: MONDAY_API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation, variables: { board: MONDAY_BOARD_ID, item: itemId, value: statusLabel } }),
  })
  return res.json()
}

async function createMondayItemForBooking(name: string, email: string, eventType: string, startTime: string) {
  const dateOnly = startTime.slice(0, 10)
  const columnValues = {
    email_mm1h2bvd: { email, text: email },
    status: { label: 'Call Booked' },
    dropdown_mm1hf1ez: { labels: ['Calendly'] },
    dropdown_mm1hx0sm: { labels: ['VideoSalesLab'] },
    long_text_mm1hknfy: { text: `Calendly booking: ${eventType}\nCall date: ${startTime}` },
    date4: { date: dateOnly },
  }
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

// Calendly signs every delivery: "t=<unix>,v1=<hex HMAC-SHA256 of `${t}.${rawBody}`>"
// (same check as the CRM's Calendly webhook). Older than 5 minutes = replay.
function verifyCalendly(rawBody: string, header: string | null, key: string): boolean {
  if (!header) return false
  const parts = Object.fromEntries(header.split(',').map((kv) => {
    const i = kv.indexOf('=')
    return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()]
  })) as Record<string, string>
  if (!parts.t || !parts.v1) return false
  const age = Date.now() / 1000 - Number(parts.t)
  if (!isFinite(age) || Math.abs(age) > 300) return false
  const expected = Buffer.from(crypto.createHmac('sha256', key).update(`${parts.t}.${rawBody}`).digest('hex'))
  const got = Buffer.from(parts.v1)
  return expected.length === got.length && crypto.timingSafeEqual(expected, got)
}

export async function POST(request: NextRequest) {
  // Fail closed: without a signing key anyone could write clients, leads and Monday items.
  const key = process.env.CALENDLY_WEBHOOK_SIGNING_KEY
  if (!key) return NextResponse.json({ error: 'webhook not configured' }, { status: 503 })
  const raw = await request.text()
  if (!verifyCalendly(raw, request.headers.get('calendly-webhook-signature'), key)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 403 })
  }
  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = body.event as string
  // Only handle invitee.created (new booking)
  if (event !== 'invitee.created') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const payload = body.payload as Record<string, unknown>
  const scheduledEvent = payload?.scheduled_event as Record<string, unknown>

  // Support Calendly v2 (email/name at payload root) and v1 (nested under payload.invitee)
  const inviteeLegacy = payload?.invitee as Record<string, unknown> | undefined
  const name = (payload?.name as string) ?? (inviteeLegacy?.name as string) ?? 'Unknown'
  const email = (payload?.email as string) ?? (inviteeLegacy?.email as string) ?? ''

  // Event type name: v2 uses scheduled_event.name, v1 used payload.event_type.name
  const eventTypeDetailsLegacy = payload?.event_type as Record<string, unknown> | undefined
  const eventTypeName = (scheduledEvent?.name as string) ?? (eventTypeDetailsLegacy?.name as string) ?? 'Discovery Call'
  const startTime = (scheduledEvent?.start_time as string) ?? new Date().toISOString()

  if (!email) {
    return NextResponse.json({ error: 'No email in payload' }, { status: 400 })
  }

  // Always save to Supabase — this is the source of truth regardless of Monday.com status
  const normalizedEmail = email.toLowerCase().trim()
  const supabase = getSupabase()
  const { data: clientData } = await supabase
    .from('clients')
    .upsert(
      {
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || '',
        email: normalizedEmail,
        company_name: '',
        status: 'lead',
        lead_source: 'calendly',
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
      source: 'calendly',
      source_detail: eventTypeName,
      status: 'call_booked',
      tags: ['calendly', 'video-sales-lab'],
      raw_responses: { name, email, eventTypeName, startTime },
    })
  }

  // Attempt Monday.com update (best-effort, fails gracefully on Free plan)
  const existingItemId = await findMondayItemByEmail(email)

  if (existingItemId) {
    await updateMondayItemStatus(existingItemId, 'Call Booked')
    return NextResponse.json({ ok: true, action: 'updated', mondayItemId: existingItemId })
  } else {
    const result = await createMondayItemForBooking(name, email, eventTypeName, startTime)
    const mondayItemId = result?.data?.create_item?.id ?? null
    return NextResponse.json({ ok: true, action: 'created', mondayItemId })
  }
}
