import type { SupabaseClient } from '@supabase/supabase-js';
import { upsertCrmLead } from '@/lib/portal/crm';

/**
 * Form tracking.
 *
 * The six public marketing routes and the Typeform webhook each already write
 * public.clients, public.leads, Monday, and an email. None of that changes —
 * those are live lead-capture paths and breaking them to improve reporting
 * would be a bad trade. This records a submission ALONGSIDE them.
 *
 * Which is why recordSubmission never throws and never blocks: a reporting row
 * failing must not cost a lead.
 */

export type FormKey =
  | 'client-intake'
  | 'bottleneck'
  | 'essentialslab'
  | 'assetslab-intake'
  | 'contact'
  | 'affiliate-apply'
  | 'podcast-apply'
  | 'typeform';

export interface SubmissionInput {
  formKey: FormKey;
  email?: string | null;
  name?: string | null;
  /** Everything the route received. Shapes differ per form on purpose. */
  raw?: unknown;
  source?: string;
  status?: 'sent' | 'opened' | 'in progress' | 'submitted' | 'reviewed';
  // ── CRM sync (Phase 5). All optional; anything absent is simply not set.
  company?: string | null;
  phone?: string | null;
  website?: string | null;
  message?: string | null;
  smsConsentAt?: string | null;
}

/**
 * Record that a form was submitted. Returns the submission id, or null if
 * anything went wrong — callers should ignore the result, not branch on it.
 */
export async function recordSubmission(
  db: SupabaseClient,
  input: SubmissionInput,
): Promise<string | null> {
  try {
    const email = input.email?.trim().toLowerCase() || null;

    // CRM sync FIRST, and deliberately outside the form-row check below: the
    // CRM is canonical and must receive every capture whether or not the Phase 4
    // forms migration has been applied.
    const crmLeadId = await upsertCrmLead(db, {
      email,
      name: input.name,
      company: input.company,
      phone: input.phone,
      website: input.website,
      message: input.message,
      source: `website:${input.formKey}`,
      leadMagnet: input.formKey,
      smsConsentAt: input.smsConsentAt,
    });

    const { data: form } = await db
      .from('portal_forms')
      .select('id')
      .eq('form_key', input.formKey)
      .maybeSingle();

    // No form row means the Phase 4 migration has not been applied yet. Not an
    // error worth shouting about — the lead reached the CRM above and every
    // place it used to go.
    if (!form) return null;

    // Link to a portal client when one already exists for this address.
    let clientId: string | null = null;
    if (email) {
      const { data: client } = await db
        .from('portal_clients')
        .select('id')
        .ilike('email', email)
        .maybeSingle();
      clientId = client?.id ?? null;
    }

    const now = new Date().toISOString();
    const status = input.status ?? 'submitted';

    const { data, error } = await db
      .from('portal_form_submissions')
      .insert({
        form_id: form.id,
        client_id: clientId,
        crm_lead_id: crmLeadId,
        email,
        name: input.name ?? null,
        status,
        source: input.source ?? input.formKey,
        raw: input.raw ?? null,
        submitted_at: status === 'submitted' ? now : null,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[portal] form submission failed', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.error('[portal] form submission threw', err);
    return null;
  }
}

// ── shared shapes for the portal intake UI ───────────────────────────

export interface IntakeQuestion {
  id: string;
  /** Nullable: form-engine fields may be unsectioned, legacy items never are. */
  section: string | null;
  prompt: string;
  help: string | null;
  kind: string;
  options: string[] | null;
  required: boolean;
  sort_order: number;
}

/**
 * The portal intake reads from the form engine once the migration has landed,
 * and from the legacy portal_intake_* tables until then.
 *
 * A dual read rather than a hard switch: the legacy tables hold 25 live
 * questions today, and a page that goes blank between deploying the code and
 * running the migration is a page the client sees broken.
 */
export function resolveIntake(args: {
  fields: IntakeQuestion[];
  fieldAnswers: Record<string, string>;
  legacyItems: IntakeQuestion[];
  legacyAnswers: Record<string, string>;
  submissionId: string | null;
}): {
  questions: IntakeQuestion[];
  answers: Record<string, string>;
  submissionId: string | null;
  usingEngine: boolean;
} {
  const usingEngine = args.fields.length > 0 && Boolean(args.submissionId);

  return usingEngine
    ? {
        questions: args.fields,
        answers: args.fieldAnswers,
        submissionId: args.submissionId,
        usingEngine: true,
      }
    : {
        questions: args.legacyItems,
        answers: args.legacyAnswers,
        submissionId: null,
        usingEngine: false,
      };
}

/** Group questions into sections, preserving sort order within each. */
export function bySection(questions: IntakeQuestion[]): Array<[string, IntakeQuestion[]]> {
  const map = new Map<string, IntakeQuestion[]>();
  for (const q of [...questions].sort((a, b) => a.sort_order - b.sort_order)) {
    const key = q.section || 'General';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(q);
  }
  return Array.from(map.entries());
}

/** Completion for a progress read-out. Required questions only. */
export function completion(
  questions: IntakeQuestion[],
  answers: Record<string, string>,
): { done: number; total: number; pct: number } {
  const required = questions.filter((q) => q.required);
  const pool = required.length > 0 ? required : questions;
  const done = pool.filter((q) => (answers[q.id] || '').trim().length > 0).length;
  const total = pool.length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
