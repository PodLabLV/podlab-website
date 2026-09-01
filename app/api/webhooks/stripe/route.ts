import { NextRequest, NextResponse } from 'next/server'
import { admin, recordEvent } from '@/lib/portal-server'

/**
 * Stripe webhook — the record of money, for both Monday and the portal.
 *
 * Before Phase 1 this route promoted a Monday item and returned, which is why
 * portal_invoices held zero rows while real money had moved. It now writes the
 * portal tables first (they are the record), then keeps the Monday behaviour
 * that already existed so nothing downstream of that board breaks.
 *
 * No card data is ever stored. "Pay now" in the portal is a link to Stripe's
 * hosted invoice page; Stripe renders the form, we render the status.
 */

const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN!
const MONDAY_BOARD_ID = process.env.MONDAY_BOARD_ID || '18400694687'
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────── signature

/** Constant-time compare. A fast-exit === leaks how much of a forgery matched. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Verify per Stripe's scheme. Stripe may send SEVERAL v1 signatures during a
 * secret roll, so every one is checked rather than only the last parsed.
 */
async function verifyStripeSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  let timestamp = ''
  const candidates: string[] = []

  for (const part of signature.split(',')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k === 't') timestamp = v
    else if (k === 'v1') candidates.push(v)
  }

  if (!timestamp || candidates.length === 0) return false

  // Reject payloads older than 5 minutes (replay protection).
  const tolerance = 300
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > tolerance) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`)
  )
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return candidates.some((c) => timingSafeEqual(expected, c))
}

// ─────────────────────────────────────────────── stripe payload helpers

type Obj = Record<string, unknown>

const str = (o: Obj | undefined, k: string): string | null => {
  const v = o?.[k]
  return typeof v === 'string' && v.length > 0 ? v : null
}
const num = (o: Obj | undefined, k: string): number => {
  const v = o?.[k]
  return typeof v === 'number' ? v : 0
}
/** Stripe sends seconds; Postgres wants an ISO string. */
const ts = (o: Obj | undefined, k: string): string | null => {
  const v = o?.[k]
  return typeof v === 'number' ? new Date(v * 1000).toISOString() : null
}
const dateOnly = (iso: string | null): string | null => (iso ? iso.slice(0, 10) : null)

/** Stripe nests the real paid time under status_transitions, not on the invoice. */
const nestedTs = (o: Obj | undefined, parent: string, k: string): string | null =>
  ts(o?.[parent] as Obj | undefined, k)

/** "Visa ending 4242". Brand and last four only — never a full number. */
function methodLabel(charge: Obj | undefined): string | null {
  const details = charge?.payment_method_details as Obj | undefined
  const card = details?.card as Obj | undefined
  const brand = str(card, 'brand')
  const last4 = str(card, 'last4')
  if (!brand || !last4) return null
  return `${brand.charAt(0).toUpperCase()}${brand.slice(1)} ending ${last4}`
}

/** Stripe puts the useful wording on the first line item, not the invoice. */
function firstLineDescription(inv: Obj): string | null {
  const lines = (inv.lines as Obj | undefined)?.data as Obj[] | undefined
  return str(lines?.[0], 'description')
}

// ─────────────────────────────────────────────── client resolution

interface PortalClientRef {
  id: string
  business_name: string | null
  crm_lead_id: string | null
}

/**
 * Find the portal client this money belongs to.
 *
 * Customer id first — it is exact. Email second, and only as a fallback: a
 * founder paying from a personal address would otherwise never match. When the
 * email match succeeds, the customer id is written back so the next event is
 * exact.
 */
async function resolveClient(
  db: ReturnType<typeof admin>,
  customerId: string | null,
  email: string | null
): Promise<PortalClientRef | null> {
  if (customerId) {
    const { data } = await db
      .from('portal_clients')
      .select('id, business_name, crm_lead_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    if (data) return data as PortalClientRef
  }

  if (email) {
    const { data } = await db
      .from('portal_clients')
      .select('id, business_name, crm_lead_id')
      .ilike('email', email)
      .maybeSingle()

    if (data) {
      if (customerId) {
        await db
          .from('portal_clients')
          .update({ stripe_customer_id: customerId })
          .eq('id', (data as PortalClientRef).id)
      }
      return data as PortalClientRef
    }
  }

  // Not an error. Plenty of Stripe activity belongs to people who have no
  // portal account yet; the Monday path below still handles them.
  return null
}

// ─────────────────────────────────────────────── portal writers

async function upsertInvoice(
  db: ReturnType<typeof admin>,
  client: PortalClientRef,
  inv: Obj,
  opts: { status: string; paidAt?: string | null }
): Promise<string | null> {
  const stripeId = str(inv, 'id')
  if (!stripeId) return null

  const row = {
    client_id: client.id,
    stripe_invoice_id: stripeId,
    stripe_customer_id: str(inv, 'customer'),
    invoice_no: str(inv, 'number') ?? stripeId,
    description: str(inv, 'description') ?? firstLineDescription(inv) ?? 'PodLab services',
    amount_cents: num(inv, 'amount_due'),
    amount_paid_cents: num(inv, 'amount_paid'),
    currency: str(inv, 'currency') ?? 'usd',
    issued_on: dateOnly(ts(inv, 'created')),
    due_on: dateOnly(ts(inv, 'due_date')),
    paid_at: opts.paidAt ?? null,
    status: opts.status,
    hosted_invoice_url: str(inv, 'hosted_invoice_url'),
    pdf_url: str(inv, 'invoice_pdf'),
    receipt_url: str(inv, 'invoice_pdf'),
    attempt_count: num(inv, 'attempt_count'),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('portal_invoices')
    .upsert(row, { onConflict: 'stripe_invoice_id' })
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[stripe] invoice upsert failed', error.message)
    throw new Error('invoice upsert failed')
  }
  return (data as { id: string } | null)?.id ?? null
}

async function recordPayment(
  db: ReturnType<typeof admin>,
  client: PortalClientRef,
  row: {
    invoiceId?: string | null
    intentId?: string | null
    chargeId?: string | null
    kind?: string
    amountCents: number
    status: string
    methodLabel?: string | null
    failureReason?: string | null
    occurredAt?: string | null
  }
): Promise<void> {
  const { error } = await db.from('portal_payments').upsert(
    {
      client_id: client.id,
      invoice_id: row.invoiceId ?? null,
      stripe_payment_intent_id: row.intentId ?? null,
      stripe_charge_id: row.chargeId ?? null,
      kind: row.kind ?? 'payment',
      amount_cents: row.amountCents,
      status: row.status,
      method_label: row.methodLabel ?? null,
      failure_reason: row.failureReason ?? null,
      occurred_at: row.occurredAt ?? new Date().toISOString(),
    },
    { onConflict: 'stripe_payment_intent_id,status', ignoreDuplicates: true }
  )
  if (error) console.error('[stripe] payment insert failed', error.message)
}

const money = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100)

// ─────────────────────────────────────────────── monday (existing behaviour)

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
    headers: { Authorization: MONDAY_API_TOKEN, 'Content-Type': 'application/json' },
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
    headers: { Authorization: MONDAY_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: mutation }),
  })
}

async function createMondayClientItem(
  name: string,
  email: string,
  amount: number,
  description: string
) {
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
    headers: { Authorization: MONDAY_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: mutation }),
  })
  return res.json()
}

/** Unchanged from the original route: promote if known, otherwise create. */
async function syncMonday(name: string, email: string, amount: number, description: string) {
  try {
    const existingId = await findMondayItemByEmail(email)
    if (existingId) {
      await promoteMondayLeadToClient(existingId)
      return { action: 'promoted', mondayItemId: existingId }
    }
    const result = await createMondayClientItem(name, email, amount, description)
    return { action: 'created', mondayItemId: result?.data?.create_item?.id ?? null }
  } catch (err) {
    // Monday is downstream. It must never fail the financial record.
    console.error('[stripe] monday sync failed', err)
    return { action: 'monday_failed', mondayItemId: null }
  }
}

// ─────────────────────────────────────────────── route

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''

  // Fail CLOSED. The previous version verified only `if (STRIPE_WEBHOOK_SECRET)`,
  // so with the variable unset — which it was in production — every unsigned
  // POST was accepted. This route now writes financial records, and an endpoint
  // that mints paid invoices for anyone who finds the URL is not acceptable.
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe] STRIPE_WEBHOOK_SECRET is not set — refusing webhook')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }
  if (!(await verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: Obj
  try {
    event = JSON.parse(rawBody) as Obj
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event.type as string
  const obj = ((event.data as Obj | undefined)?.object as Obj) ?? {}
  const db = admin()

  try {
    switch (eventType) {
      // ── invoice finalised: it exists and is payable ──────────────
      case 'invoice.finalized':
      case 'invoice.sent': {
        const client = await resolveClient(db, str(obj, 'customer'), str(obj, 'customer_email'))
        if (!client) return NextResponse.json({ ok: true, skipped: 'no_portal_client' })

        await upsertInvoice(db, client, obj, { status: 'Pending' })
        return NextResponse.json({ ok: true, action: 'invoice_recorded' })
      }

      // ── invoice paid ─────────────────────────────────────────────
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const client = await resolveClient(db, str(obj, 'customer'), str(obj, 'customer_email'))
        if (!client) return NextResponse.json({ ok: true, skipped: 'no_portal_client' })

        const paidAt = nestedTs(obj, 'status_transitions', 'paid_at') ?? new Date().toISOString()
        const invoiceId = await upsertInvoice(db, client, obj, { status: 'Paid', paidAt })
        const amount = num(obj, 'amount_paid')

        await recordPayment(db, client, {
          invoiceId,
          intentId: str(obj, 'payment_intent'),
          amountCents: amount,
          status: 'succeeded',
          occurredAt: paidAt,
        })

        await recordEvent(db, {
          clientId: client.id,
          module: 'payments',
          kind: 'invoice.paid',
          title: `Payment received — ${money(amount, str(obj, 'currency') ?? 'usd')}`,
          detail: str(obj, 'number') ? `Invoice ${str(obj, 'number')}` : null,
          refId: invoiceId,
          crmLeadId: client.crm_lead_id,
          businessName: client.business_name,
          slack: true,
        })

        return NextResponse.json({ ok: true, action: 'invoice_paid' })
      }

      // ── payment failed ───────────────────────────────────────────
      // Always Slack. An invoice quietly sitting unpaid because a card expired
      // is the most expensive silence in the business.
      case 'invoice.payment_failed': {
        const client = await resolveClient(db, str(obj, 'customer'), str(obj, 'customer_email'))
        if (!client) return NextResponse.json({ ok: true, skipped: 'no_portal_client' })

        const invoiceId = await upsertInvoice(db, client, obj, { status: 'Overdue' })
        const amount = num(obj, 'amount_due')

        await recordPayment(db, client, {
          invoiceId,
          intentId: str(obj, 'payment_intent'),
          amountCents: amount,
          status: 'failed',
          failureReason: 'Invoice payment failed',
        })

        await recordEvent(db, {
          clientId: client.id,
          module: 'payments',
          kind: 'invoice.payment_failed',
          title: `Payment failed — ${money(amount, str(obj, 'currency') ?? 'usd')}`,
          detail: `Attempt ${num(obj, 'attempt_count')}. Invoice ${str(obj, 'number') ?? ''}`.trim(),
          refId: invoiceId,
          crmLeadId: client.crm_lead_id,
          businessName: client.business_name,
          // Staff-only: the client sees the invoice go Overdue with a pay link,
          // which is more useful to them than a line reading "you failed".
          visibleToClient: false,
          slack: true,
        })

        return NextResponse.json({ ok: true, action: 'invoice_failed' })
      }

      // ── subscriptions ────────────────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const client = await resolveClient(db, str(obj, 'customer'), null)
        if (!client) return NextResponse.json({ ok: true, skipped: 'no_portal_client' })

        const items = ((obj.items as Obj | undefined)?.data as Obj[] | undefined)?.[0]
        const price = items?.price as Obj | undefined
        const recurring = price?.recurring as Obj | undefined
        const canceled = eventType.endsWith('deleted')

        const { error } = await db.from('portal_subscriptions').upsert(
          {
            client_id: client.id,
            stripe_subscription_id: str(obj, 'id'),
            product_label: str(price, 'nickname') ?? str(obj, 'description') ?? 'PodLab retainer',
            amount_cents: num(price, 'unit_amount'),
            interval: str(recurring, 'interval') ?? 'month',
            status: canceled ? 'canceled' : str(obj, 'status') ?? 'active',
            current_period_end: ts(obj, 'current_period_end'),
            cancel_at: ts(obj, 'cancel_at'),
            started_on: dateOnly(ts(obj, 'start_date')),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_subscription_id' }
        )
        if (error) console.error('[stripe] subscription upsert failed', error.message)

        if (canceled || str(obj, 'status') === 'past_due') {
          await recordEvent(db, {
            clientId: client.id,
            module: 'payments',
            kind: canceled ? 'subscription.canceled' : 'subscription.past_due',
            title: canceled ? 'Retainer canceled' : 'Retainer past due',
            crmLeadId: client.crm_lead_id,
            businessName: client.business_name,
            visibleToClient: false,
            slack: true,
          })
        }

        return NextResponse.json({ ok: true, action: 'subscription_synced' })
      }

      // ── refunds ──────────────────────────────────────────────────
      case 'charge.refunded': {
        const client = await resolveClient(db, str(obj, 'customer'), str(obj, 'receipt_email'))
        if (!client) return NextResponse.json({ ok: true, skipped: 'no_portal_client' })

        const refunded = num(obj, 'amount_refunded')
        await recordPayment(db, client, {
          intentId: str(obj, 'payment_intent'),
          chargeId: str(obj, 'id'),
          kind: 'refund',
          amountCents: -refunded,
          status: 'succeeded',
          methodLabel: methodLabel(obj),
        })

        await recordEvent(db, {
          clientId: client.id,
          module: 'payments',
          kind: 'charge.refunded',
          title: `Refund issued — ${money(refunded, str(obj, 'currency') ?? 'usd')}`,
          crmLeadId: client.crm_lead_id,
          businessName: client.business_name,
          slack: true,
        })

        return NextResponse.json({ ok: true, action: 'refund_recorded' })
      }

      // ── checkout / one-off payments ──────────────────────────────
      // These also carry the lead-promotion behaviour the board depends on.
      case 'checkout.session.completed':
      case 'payment_intent.succeeded': {
        const isCheckout = eventType === 'checkout.session.completed'
        const details = obj.customer_details as Obj | undefined

        const email = isCheckout
          ? str(details, 'email')
          : str(obj, 'receipt_email')
        const name = (isCheckout ? str(details, 'name') : null) ?? email
        const amount = isCheckout ? num(obj, 'amount_total') : num(obj, 'amount_received')
        const description = str(obj, 'description') ?? 'PodLab service'

        if (!email) return NextResponse.json({ ok: true, skipped: 'no_email' })

        const client = await resolveClient(db, str(obj, 'customer'), email)

        if (client) {
          await recordPayment(db, client, {
            intentId: isCheckout ? str(obj, 'payment_intent') : str(obj, 'id'),
            amountCents: amount,
            status: 'succeeded',
          })
          await recordEvent(db, {
            clientId: client.id,
            module: 'payments',
            kind: 'payment.received',
            title: `Payment received — ${money(amount, str(obj, 'currency') ?? 'usd')}`,
            detail: description,
            crmLeadId: client.crm_lead_id,
            businessName: client.business_name,
            slack: true,
          })
        }

        const monday = await syncMonday(name ?? email, email, amount, description)
        return NextResponse.json({ ok: true, portal: Boolean(client), ...monday })
      }

      default:
        return NextResponse.json({ ok: true, skipped: eventType })
    }
  } catch (err) {
    // 500 so Stripe retries. Swallowing this would lose the money record for
    // good — the webhook is the only place some of these events ever arrive.
    console.error('[stripe] handler failed', eventType, err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}
