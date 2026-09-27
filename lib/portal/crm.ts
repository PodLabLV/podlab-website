import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * CRM sync — crm.leads is canonical.
 *
 * It holds 893 rows and backs a shipped app (crm.podlablv.com). public.leads
 * holds 81 rows written by the marketing routes. Same humans, two tables, no
 * key between them.
 *
 * This makes every website capture reach the CRM. It does NOT remove the
 * existing public.leads write — that stays until parity has been confirmed in
 * production, because a lead lost during a cutover is a lead lost for good.
 *
 * THE RULE THAT MATTERS: an existing lead's pipeline position is never
 * overwritten. Someone at DISCOVERY CALL BOOKED who fills in a contact form
 * must not be reset to NEW LEAD. We fill blanks and append a note; we never
 * touch stage, owner, tier, or deal value.
 */

/** Matches the stages already in crm.leads — do not invent new ones. */
const NEW_LEAD_STAGE = 'NEW LEAD';

/** Existing pipelines are podcast / vsl / sales. Website captures are sales. */
const DEFAULT_PIPELINE = 'sales';

export interface CrmLeadInput {
  email?: string | null;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  website?: string | null;
  /** Which form. Prefixed "website:" so these are filterable in the CRM. */
  source: string;
  leadMagnet?: string | null;
  message?: string | null;
  /** Appended to notes with a date, never replacing what is there. */
  note?: string | null;
  smsConsentAt?: string | null;
  smsConsentSource?: string | null;
}

/**
 * Insert or gently update a CRM lead. Returns its id, or null on any failure —
 * callers must not branch on the result. Never throws.
 *
 * Matching is by lowercased email. There is no unique constraint on that column
 * and there cannot be one today: crm.leads already contains a duplicated
 * address, and 752 of its 893 rows have no email at all. So this selects the
 * oldest match rather than relying on a database upsert.
 */
export async function upsertCrmLead(
  db: SupabaseClient,
  input: CrmLeadInput,
): Promise<string | null> {
  const email = input.email?.trim().toLowerCase();
  if (!email) return null;

  try {
    const crm = db.schema('crm');

    const { data: existing } = await crm
      .from('leads')
      .select('id, name, company, phone, website, notes')
      .ilike('email', email)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const stamp = new Date().toISOString().slice(0, 10);
    const line = [`[${stamp}] ${input.source}`, input.note, input.message]
      .filter(Boolean)
      .join(' — ');

    if (existing) {
      // Fill blanks only. Everything that represents sales judgement — stage,
      // owner, tier, deal_value, next_action — is left exactly as it was.
      const patch: Record<string, unknown> = {
        notes: [existing.notes, line].filter(Boolean).join('\n'),
        touched_at: new Date().toISOString(),
      };
      if (!existing.company && input.company) patch.company = input.company;
      if (!existing.phone && input.phone) patch.phone = input.phone;
      if (!existing.website && input.website) patch.website = input.website;
      if (input.smsConsentAt) {
        patch.sms_consent_at = input.smsConsentAt;
        patch.sms_consent_source = input.smsConsentSource ?? input.source;
      }

      const { error } = await crm.from('leads').update(patch).eq('id', existing.id);
      if (error) console.error('[crm] lead update failed', error.message);
      return existing.id;
    }

    const { data, error } = await crm
      .from('leads')
      .insert({
        name: input.name?.trim() || email,
        company: input.company ?? null,
        email,
        phone: input.phone ?? null,
        website: input.website ?? null,
        source: input.source,
        stage: NEW_LEAD_STAGE,
        pipeline: DEFAULT_PIPELINE,
        lead_magnet: input.leadMagnet ?? null,
        message: input.message ?? null,
        notes: line || null,
        sms_consent_at: input.smsConsentAt ?? null,
        sms_consent_source: input.smsConsentAt
          ? (input.smsConsentSource ?? input.source)
          : null,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[crm] lead insert failed', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.error('[crm] lead upsert threw', err);
    return null;
  }
}
