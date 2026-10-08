import { NextResponse } from 'next/server';
import { admin, resolveStaff, notifySlack } from '@/lib/portal-server';
import { recordActivity } from '@/lib/portal/server';
import { runtimeSeconds, wordCount } from '@/lib/portal/scripts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Beat { name?: string; text?: string }
interface Generated { title?: string; beats?: Beat[] }

const KINDS: Array<['vsl' | 'faq' | 'organic', string]> = [
  ['vsl', 'vsl'],
  ['faq', 'faq'],
  ['organic', 'short'],
];

/** Beats become paragraphs: each is a block the client can comment on. */
function bodyOf(s: Generated): string {
  return (s.beats ?? []).map((b) => (b.text ?? '').trim()).filter(Boolean).join('\n\n');
}

async function load(db: ReturnType<typeof admin>, clientId: string) {
  const { data: client } = await db.from('portal_clients').select('id, business_name, crm_lead_id').eq('id', clientId).maybeSingle();
  if (!client?.crm_lead_id) return { client, scripts: [] as Array<{ kind: string; s: Generated }> };
  const { data: lead } = await db.schema('crm').from('leads').select('scripts').eq('id', client.crm_lead_id).maybeSingle();
  const raw = (lead?.scripts ?? {}) as Record<string, Generated[] | undefined>;
  const scripts = KINDS.flatMap(([key, kind]) => (raw[key] ?? []).map((s) => ({ kind, s }))).filter(({ s }) => s.title && bodyOf(s));
  return { client, scripts };
}

/**
 * GET ?clientId= — staff only. How many generated scripts the client's CRM lead
 * holds and how many are already in their portal.
 *
 * POST { clientId } — staff only. Publishes the scripts generated from the
 * client's application (crm.leads.scripts, the free-VSL pipeline) into their
 * portal as v1, ready for review. Run it AFTER the team has edited the drafts in
 * the CRM: the generator's output is a draft by design. Already-published titles
 * are skipped, so it is safe to press twice.
 */
export async function GET(req: Request) {
  const db = admin();
  if (!(await resolveStaff(req, db))) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const clientId = new URL(req.url).searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });
  const { scripts } = await load(db, clientId);
  const { data: existing } = await db.from('portal_scripts').select('title').eq('client_id', clientId);
  const have = new Set((existing ?? []).map((r: { title: string }) => r.title));
  return NextResponse.json({ generated: scripts.length, published: scripts.filter(({ s }) => have.has(s.title!.slice(0, 200))).length });
}

export async function POST(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let clientId = '';
  try {
    clientId = String((await req.json())?.clientId ?? '');
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const { client, scripts } = await load(db, clientId);
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  if (!scripts.length) return NextResponse.json({ error: 'No generated scripts on this client’s CRM lead.' }, { status: 404 });

  const { data: existing, error: exErr } = await db.from('portal_scripts').select('title').eq('client_id', clientId);
  if (exErr) return NextResponse.json({ error: 'Scripts are not live yet (migration 20261008).' }, { status: 503 });
  const have = new Set((existing ?? []).map((r: { title: string }) => r.title));

  let published = 0;
  for (const [i, { kind, s }] of scripts.entries()) {
    const title = s.title!.slice(0, 200);
    if (have.has(title)) continue;
    const body = bodyOf(s);
    const { data: script, error } = await db
      .from('portal_scripts')
      .insert({ client_id: clientId, title, kind, source: 'the57', status: 'in review', current_version: 1, sort_order: i })
      .select('id')
      .single();
    if (error || !script) {
      console.error('[portal] publish script failed', error?.message);
      continue;
    }
    const { error: vErr } = await db.from('portal_script_versions').insert({
      script_id: script.id,
      client_id: clientId,
      version_no: 1,
      body,
      word_count: wordCount(body),
      runtime_seconds: runtimeSeconds(body),
      author_name: staff.name,
      author_kind: 'podlab',
      note: 'Written from your application.',
    });
    if (vErr) {
      await db.from('portal_scripts').delete().eq('id', script.id);
      console.error('[portal] publish script version failed', vErr.message);
      continue;
    }
    published++;
  }

  if (published) {
    await recordActivity(db, clientId, 'update', `${published} script${published === 1 ? '' : 's'} ready for your review`);
    await notifySlack(`*Scripts published to the portal* — ${client.business_name}: ${published} by ${staff.name}`);
  }
  return NextResponse.json({ published, skipped: scripts.length - published });
}
