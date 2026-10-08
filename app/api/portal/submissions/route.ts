import { NextResponse } from 'next/server';
import { admin, resolveCaller } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface SubmissionSection {
  title: string;
  submittedAt: string | null;
  fields: Array<{ label: string; value: string }>;
}

// The application and intake answers that live on the client's CRM lead
// (free-VSL application, studio intake), in the order a person would read them.
const APPLICATION: Array<[string, string]> = [
  ['business_name', 'Business'],
  ['business_description', 'What you do'],
  ['services_offered', 'Services'],
  ['location', 'Location'],
  ['years_in_business', 'Years in business'],
  ['annual_revenue', 'Annual revenue'],
  ['top_3_goals', 'Top three goals'],
  ['marketing_gap', 'Biggest marketing gap'],
  ['on_camera', 'On camera'],
];
const INTAKE: Array<[string, string]> = [
  ['target_6mo', 'Where you want to be in six months'],
  ['biggest_blocker', 'Biggest blocker'],
  ['tried_already', 'What you have already tried'],
];

function text(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(text).filter(Boolean).join(', ');
  if (typeof v === 'object') return '';
  return String(v).trim();
}

/** The free-VSL application keeps every original answer in raw_responses; show the ones not already above. */
function rawFields(raw: unknown, shown: Set<string>): Array<{ label: string; value: string }> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>)
    .filter(([k]) => !shown.has(k) && !/email|phone|token|consent|utm|ip|user_agent|^id$/i.test(k))
    .map(([k, v]) => ({ label: k.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), value: text(v) }))
    .filter((f) => f.value && f.value.length < 4000)
    .slice(0, 40);
}

/** GET — what this client told us, read-only. Their own record only. */
export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const sections: SubmissionSection[] = [];

  if (caller.crmLeadId) {
    const { data: lead } = await db.schema('crm').from('leads').select('*').eq('id', caller.crmLeadId).maybeSingle();
    if (lead) {
      const app = APPLICATION.map(([k, label]) => ({ label, value: text(lead[k]) })).filter((f) => f.value);
      const extra = rawFields(lead.raw_responses, new Set(APPLICATION.map(([k]) => k)));
      if (app.length || extra.length) {
        sections.push({ title: 'Your application', submittedAt: lead.application_at ?? null, fields: [...app, ...extra] });
      }
      const intake = INTAKE.map(([k, label]) => ({ label, value: text(lead[k]) })).filter((f) => f.value);
      if (intake.length) sections.push({ title: 'Your studio intake', submittedAt: lead.intake_at ?? null, fields: intake });
    }
  }

  // The portal's own intake questionnaire.
  const [items, answers] = await Promise.all([
    db.from('portal_intake_items').select('id, section, prompt, sort_order').eq('client_id', caller.clientId).order('sort_order'),
    db.from('portal_intake_answers').select('item_id, value, updated_at').eq('client_id', caller.clientId),
  ]);
  const byItem = new Map((answers.data ?? []).map((a: { item_id: string; value: string | null; updated_at: string }) => [a.item_id, a]));
  const portalFields = (items.data ?? [])
    .map((i: { id: string; prompt: string }) => ({ label: i.prompt, value: text(byItem.get(i.id)?.value) }))
    .filter((f) => f.value);
  if (portalFields.length) {
    const latest = (answers.data ?? []).map((a: { updated_at: string }) => a.updated_at).sort().pop() ?? null;
    sections.push({ title: 'Portal intake', submittedAt: latest, fields: portalFields });
  }

  return NextResponse.json({ sections });
}
