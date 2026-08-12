import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  const query = `
    {
      boards(ids: [${MONDAY_BOARD_ID}]) {
        items_page(limit: 1, query_params: {
          rules: [{ column_id: "email_mm1h2bvd", compare_value: ["${email}"] }]
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
    body: JSON.stringify({ query }),
  })
  const data = await res.json()
  return data?.data?.boards?.[0]?.items_page?.items?.[0]?.id ?? null
}

async function updateMondayItemStatus(itemId: string, statusLabel: string) {
  const mutation = `
    mutation {
      change_simple_column_value(
        board_id: ${MONDAY_BOARD_ID},
        item_id: ${itemId},
        column_id: "status",
        value: "${statusLabel}"
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

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
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
