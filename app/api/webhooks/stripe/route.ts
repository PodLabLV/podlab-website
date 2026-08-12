import { NextRequest, NextResponse } from 'next/server'

const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN!
const MONDAY_BOARD_ID = '18400694687'
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// Stripe signature verification using Web Crypto (no SDK dependency)
async function verifyStripeSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const parts = Object.fromEntries(
    signature.split(',').map((part) => {
      const [k, v] = part.split('=')
      return [k, v]
    })
  )
  const timestamp = parts['t']
  const receivedSig = parts['v1']
  if (!timestamp || !receivedSig) return false

  // Reject payloads older than 5 minutes
  const tolerance = 300
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > tolerance) return false

  const payload = `${timestamp}.${rawBody}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return expected === receivedSig
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

async function promoteMondayLeadToClient(itemId: string) {
  const mutation = `
    mutation {
      change_simple_column_value(
        board_id: ${MONDAY_BOARD_ID},
        item_id: ${itemId},
        column_id: "status",
        value: "Client"
      ) { id }
    }
  `
  await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      Authorization: MONDAY_API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation }),
  })
}

async function createMondayClientItem(name: string, email: string, amount: number, description: string) {
  const columnValues = {
    email_mm1h2bvd: { email, text: email },
    status: { label: 'Client' },
    dropdown_mm1hf1ez: { labels: ['Stripe'] },
    long_text_mm1hknfy: { text: `Payment received: $${(amount / 100).toFixed(2)}\n${description}` },
    date4: { date: new Date().toISOString().slice(0, 10) },
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
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''

  if (STRIPE_WEBHOOK_SECRET) {
    const valid = await verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event.type as string

  // Handle checkout.session.completed (preferred — has customer email directly)
  if (eventType === 'checkout.session.completed') {
    const session = event.data as Record<string, unknown>
    const obj = session?.object as Record<string, unknown>
    const email = (obj?.customer_details as Record<string, unknown>)?.email as string
    const customerName = ((obj?.customer_details as Record<string, unknown>)?.name as string) ?? email
    const amountTotal = (obj?.amount_total as number) ?? 0
    const lineItems = (obj?.display_items as Array<Record<string, unknown>>)?.[0]
    const description = (lineItems?.description as string) ?? 'PodLab service'

    if (!email) return NextResponse.json({ ok: true, skipped: 'no_email' })

    const existingId = await findMondayItemByEmail(email)
    if (existingId) {
      await promoteMondayLeadToClient(existingId)
      return NextResponse.json({ ok: true, action: 'promoted', mondayItemId: existingId })
    } else {
      const result = await createMondayClientItem(customerName, email, amountTotal, description)
      const mondayItemId = result?.data?.create_item?.id ?? null
      return NextResponse.json({ ok: true, action: 'created', mondayItemId })
    }
  }

  // Handle payment_intent.succeeded (fallback for direct payment intents)
  if (eventType === 'payment_intent.succeeded') {
    const piData = event.data as Record<string, unknown>
    const obj = piData?.object as Record<string, unknown>
    const email = (obj?.receipt_email as string) ?? ''
    const amountReceived = (obj?.amount_received as number) ?? 0
    const description = (obj?.description as string) ?? 'PodLab service'

    if (!email) return NextResponse.json({ ok: true, skipped: 'no_email' })

    const existingId = await findMondayItemByEmail(email)
    if (existingId) {
      await promoteMondayLeadToClient(existingId)
      return NextResponse.json({ ok: true, action: 'promoted', mondayItemId: existingId })
    } else {
      const result = await createMondayClientItem(email, email, amountReceived, description)
      const mondayItemId = result?.data?.create_item?.id ?? null
      return NextResponse.json({ ok: true, action: 'created', mondayItemId })
    }
  }

  // All other event types — acknowledge receipt
  return NextResponse.json({ ok: true, skipped: true })
}
