import type { SupabaseClient } from '@supabase/supabase-js';
import { isElite, pickStudioBooking, studioDayState, type BookingRow, type StudioDayState } from '@/lib/portal/studio-day';

/** Escape LIKE wildcards so an email with "_" matches only itself. */
const likeExact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * The client's Studio Day state, read server-side with the service role.
 * crm.* has no client policies; only the derived state leaves this function.
 *
 * Booked = a non-canceled crm.bookings row for the ELITE Studio Day event
 * (written by the CRM's Calendly webhook), matched on the client's CRM lead or,
 * failing that, the invitee email. The el-studio-booked tag the EL pipeline adds
 * counts too, as a backstop for a booking made under another lead.
 */
export async function loadStudioDay(db: SupabaseClient, clientId: string): Promise<StudioDayState> {
  const none: StudioDayState = { eligible: false, booked: false, startAt: null, url: null };
  const { data: client } = await db
    .from('portal_clients')
    .select('email, first_name, last_name, plan_label, crm_lead_id')
    .eq('id', clientId)
    .maybeSingle();
  if (!client) return none;

  const crm = db.schema('crm');
  const leadId: string | null = client.crm_lead_id ?? null;
  const email = (client.email ?? '').trim().toLowerCase();

  const [products, payments] = await Promise.all([
    db.from('portal_client_products').select('product').eq('client_id', clientId),
    leadId ? crm.from('payments').select('lab_key').eq('lead_id', leadId).eq('status', 'paid').like('lab_key', 'essentialslab%') : Promise.resolve({ data: [] }),
  ]);
  const elite = isElite({
    planLabel: client.plan_label,
    products: ((products.data ?? []) as { product: string | null }[]).map((r) => r.product),
    labKeys: ((payments.data ?? []) as { lab_key: string | null }[]).map((r) => r.lab_key),
  });
  if (!elite) return none;

  const cols = 'event_name, status, start_at, event_deleted_at';
  const [byLead, byEmail, lead] = await Promise.all([
    leadId ? crm.from('bookings').select(cols).eq('lead_id', leadId).ilike('event_name', '%studio%') : Promise.resolve({ data: [] }),
    email ? crm.from('bookings').select(cols).ilike('invitee_email', likeExact(email)).ilike('event_name', '%studio%') : Promise.resolve({ data: [] }),
    leadId ? crm.from('leads').select('tags').eq('id', leadId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const rows = [...((byLead.data ?? []) as BookingRow[]), ...((byEmail.data ?? []) as BookingRow[])];

  return studioDayState({
    elite,
    booking: pickStudioBooking(rows),
    tags: ((lead.data as { tags?: string[] | null } | null)?.tags) ?? [],
    name: [client.first_name, client.last_name].filter(Boolean).join(' '),
    email,
  });
}
