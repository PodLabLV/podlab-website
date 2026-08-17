// Server-side half of the A2P 10DLC opt-in.
//
// The checkbox is the part a campaign reviewer looks at; this is the part that
// matters if a carrier ever audits. What has to survive is a timestamp tied to
// the contact record and the method that produced it.
//
// Deliberately written into the existing `raw_data` / `raw_responses` jsonb and
// the `tags` array rather than into new columns. A first-class
// `sms_consent_at timestamptz` on public.leads would be better to query, but it
// needs a migration, and an insert naming a column that doesn't exist fails the
// whole row — which would take down live lead capture on six forms. Storing it
// in a column that already exists is the version that can ship today. Promoting
// it to a real column is a follow-up, not a blocker.

export const SMS_CONSENT_TAG = 'sms-consent'

export interface ConsentRecord {
  sms_consent: boolean
  sms_consent_at: string | null
  sms_consent_source: string | null
}

/**
 * Build the consent record for a submission.
 *
 * Consent without a phone number is discarded on purpose: a stored "yes" against
 * a contact we have no way to text is a record that can only ever mislead.
 *
 * @param phone   raw phone as submitted (may be empty)
 * @param checked whether the visitor ticked the box
 * @param source  which form this came from, e.g. "website/contact"
 */
export function consentRecord(phone: string | null | undefined, checked: unknown, source: string): ConsentRecord {
  const has = Boolean(phone && String(phone).trim() && checked === true)
  return {
    sms_consent: has,
    sms_consent_at: has ? new Date().toISOString() : null,
    sms_consent_source: has ? source : null,
  }
}

/** Tags to merge into the lead's tag array — lets consented leads be found without a jsonb scan. */
export function consentTags(rec: ConsentRecord): string[] {
  return rec.sms_consent ? [SMS_CONSENT_TAG] : []
}
