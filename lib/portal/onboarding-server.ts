import type { SupabaseClient } from '@supabase/supabase-js';
import { reportError } from '@/lib/alerts';
import {
  BRAND_QUESTIONS,
  INTAKE_QUESTIONS,
  isAnswered,
  prefillFromLead,
  toSkillFields,
  type Answers,
  type OnboardingQuestion,
} from '@/lib/portal/onboarding-questions';

/**
 * Onboarding (/portal/welcome): load with CRM prefill, validate saves, and queue
 * the generation jobs on submit. Shared by app/api/portal/onboarding and the
 * Assets tab's profile summary.
 */

export type BrandMode = 'upload' | 'help';
export type JobKind = 'assetslab' | 'vsl_pack' | 'brand_kit';

export interface VslBooking {
  startAt: string;
  eventName: string;
}

export interface OnboardingState {
  /** False until migration 20261018_portal_v2_c.sql has run. */
  ready: boolean;
  answers: Answers;
  brandAnswers: Answers;
  /** Question ids whose current value came from the free-VSL application and hasn't been saved yet. */
  prefilled: string[];
  brandMode: BrandMode | null;
  submittedAt: string | null;
  completedAt: string | null;
  vslBooking: VslBooking | null;
  profile: Record<string, unknown> | null;
  profileApprovedAt: string | null;
  jobs: Array<{ id: string; kind: JobKind; status: string; created_at: string; finished_at: string | null }>;
}

const LEAD_COLUMNS =
  'id, website, annual_revenue, years_in_business, top_3_goals, target_6mo, business_description, core_offer, offer_price, services_offered, biggest_blocker, marketing_gap, tried_already, raw_responses, booked_for, business_name';

export async function leadFor(db: SupabaseClient, crmLeadId: string | null): Promise<Record<string, unknown> | null> {
  if (!crmLeadId) return null;
  const { data, error } = await db.schema('crm').from('leads').select(LEAD_COLUMNS).eq('id', crmLeadId).maybeSingle();
  if (error) reportError('[onboarding] lead read failed', error.message);
  return (data as Record<string, unknown> | null) ?? null;
}

/** Their next VSL shoot: a booked crm.bookings VSL/Studio Session, or the free-VSL seat's booked_for. */
export async function upcomingVsl(db: SupabaseClient, crmLeadId: string | null, lead?: Record<string, unknown> | null): Promise<VslBooking | null> {
  if (!crmLeadId) return null;
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data, error } = await db
    .schema('crm')
    .from('bookings')
    .select('start_at, event_name, kind')
    .eq('lead_id', crmLeadId)
    .eq('status', 'booked')
    .gte('start_at', since)
    .order('start_at', { ascending: true })
    .limit(20);
  if (error) reportError('[onboarding] bookings read failed', error.message);
  const hit = (data ?? []).find(
    (b: { kind: string | null; event_name: string | null }) =>
      b.kind === 'vsl' || /\bvsl\b|studio session/i.test(b.event_name ?? ''),
  );
  if (hit) return { startAt: hit.start_at as string, eventName: (hit.event_name as string) || 'VSL shoot' };
  const bookedFor = lead?.booked_for as string | null | undefined;
  if (bookedFor && Date.parse(bookedFor) >= Date.parse(since)) return { startAt: bookedFor, eventName: 'Studio Session' };
  return null;
}

function missingTable(msg: string | undefined): boolean {
  return Boolean(msg && /relation .* does not exist|could not find the table|schema cache/i.test(msg));
}

export async function loadOnboarding(db: SupabaseClient, clientId: string, crmLeadId: string | null): Promise<OnboardingState> {
  const [{ data: row, error }, { data: client }, lead, { data: jobs }] = await Promise.all([
    db.from('portal_onboarding').select('*').eq('client_id', clientId).maybeSingle(),
    db.from('portal_clients').select('onboarding_completed_at, website').eq('id', clientId).maybeSingle(),
    leadFor(db, crmLeadId),
    db.from('portal_jobs').select('id, kind, status, created_at, finished_at').eq('client_id', clientId).order('created_at', { ascending: false }),
  ]);
  if (error && !missingTable(error.message)) reportError('[onboarding] load failed', error.message);

  const saved = ((row?.answers as Answers) ?? {}) as Answers;
  const savedBrand = ((row?.brand_answers as Answers) ?? {}) as Answers;
  const prefill = prefillFromLead(lead, INTAKE_QUESTIONS);
  if (!prefill.website && client?.website) prefill.website = client.website as string;
  const brandPrefill = prefillFromLead(lead, BRAND_QUESTIONS);

  // Saved answers win; prefill only fills what the client hasn't touched.
  const answers: Answers = { ...prefill, ...saved };
  const prefilled = Object.keys(prefill).filter((k) => !(k in saved));

  return {
    ready: !error,
    answers,
    brandAnswers: { ...brandPrefill, ...savedBrand },
    prefilled,
    brandMode: (row?.brand_mode as BrandMode | null) ?? null,
    submittedAt: (row?.submitted_at as string | null) ?? null,
    completedAt: (client?.onboarding_completed_at as string | null) ?? null,
    vslBooking: await upcomingVsl(db, crmLeadId, lead),
    profile: (row?.profile as Record<string, unknown> | null) ?? null,
    profileApprovedAt: (row?.profile_approved_at as string | null) ?? null,
    jobs: (jobs ?? []) as OnboardingState['jobs'],
  };
}

const MAX_ANSWER = 4000;

/**
 * Keep only known questions with valid values. Unknown ids are dropped, choices
 * must be one of the options, and text is capped, so the jsonb only ever holds
 * what the form can show.
 */
export function cleanAnswers(questions: OnboardingQuestion[], input: unknown): Answers {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out: Answers = {};
  for (const q of questions) {
    const v = src[q.id];
    if (v === undefined || v === null) continue;
    if (q.kind === 'multi') {
      const list = Array.isArray(v) ? v.map(String) : [];
      out[q.id] = (q.options ?? []).filter((o) => list.includes(o)).slice(0, q.max ?? 99);
    } else if (q.kind === 'files') {
      // "name::https://…" entries: an uploaded Drive file or a pasted link. Nothing else.
      const list = Array.isArray(v) ? v.map(String) : [];
      out[q.id] = list
        .filter((e) => /::https:\/\/\S+$/.test(e))
        .map((e) => e.slice(0, 600))
        .slice(0, 12);
    } else if (q.kind === 'choice') {
      const s = String(v);
      if ((q.options ?? []).includes(s) || s === '') out[q.id] = s;
    } else {
      out[q.id] = String(v).slice(0, MAX_ANSWER);
    }
  }
  return out;
}

export interface QueueContext {
  clientId: string;
  businessName: string;
  displayName: string;
  email: string;
  crmLeadId: string | null;
}

/**
 * Queue the generation jobs for a submitted onboarding: AssetsLab always, a VSL
 * pack when a VSL shoot is booked, a brand kit when they asked for help. Each
 * job carries everything the worker needs, so it never has to reach back into
 * the portal. Keyed by ref, so a second submit queues nothing new.
 */
export async function queueOnboardingJobs(db: SupabaseClient, ctx: QueueContext, state: OnboardingState): Promise<JobKind[]> {
  const { data: client } = await db
    .from('portal_clients')
    .select('id, business_name, first_name, last_name, email, website, timezone, drive_folder_url')
    .eq('id', ctx.clientId)
    .maybeSingle();

  const intake = toSkillFields(INTAKE_QUESTIONS, state.answers);
  const base = {
    client: {
      id: ctx.clientId,
      business_name: client?.business_name ?? ctx.businessName,
      full_name: [client?.first_name, client?.last_name].filter(Boolean).join(' ') || ctx.displayName,
      email: client?.email ?? ctx.email,
      website: (state.answers.website as string) || client?.website || null,
      drive_folder_url: client?.drive_folder_url ?? null,
    },
    crm_lead_id: ctx.crmLeadId,
    submitted_at: new Date().toISOString(),
    intake: { full_name: undefined as string | undefined, business_name: client?.business_name ?? ctx.businessName, email: client?.email ?? ctx.email, ...intake },
  };
  base.intake.full_name = base.client.full_name;

  const kinds: JobKind[] = ['assetslab'];
  if (state.vslBooking) kinds.push('vsl_pack');
  if (state.brandMode === 'help') kinds.push('brand_kit');

  const rows = kinds.map((kind) => ({
    client_id: ctx.clientId,
    kind,
    status: 'queued',
    ref: `onboarding:${ctx.clientId}:${kind}`,
    input: {
      ...base,
      ...(kind === 'vsl_pack' ? { vsl_booking: state.vslBooking } : {}),
      ...(kind === 'brand_kit' ? { brand: toSkillFields(BRAND_QUESTIONS, state.brandAnswers) } : {}),
    },
  }));

  const { data, error } = await db
    .from('portal_jobs')
    .upsert(rows, { onConflict: 'ref', ignoreDuplicates: true })
    .select('kind');
  if (error) {
    reportError('[onboarding] queue jobs failed', error.message);
    return [];
  }
  return ((data ?? []) as Array<{ kind: JobKind }>).map((r) => r.kind);
}

export function answeredCount(questions: OnboardingQuestion[], answers: Answers): number {
  return questions.filter((q) => isAnswered(answers[q.id])).length;
}
