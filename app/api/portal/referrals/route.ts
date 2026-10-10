import { NextResponse } from 'next/server';
import { admin, resolveCaller, viewAsId } from '@/lib/portal-server';
import { beakerEmails, bridge, bridgeReady, isBeaker } from '@/lib/portal/beaker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The client's Beaker page. GET: their link, money and referrals (from the
 * CRM). POST: payout setup (Whop username, payout terms, W-9), refer someone,
 * or turn available earnings into PodLab credit. Owner only.
 */
async function who(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return { err: NextResponse.json({ error: 'Not authorized' }, { status: 401 }) };
  if (caller.member) return { err: NextResponse.json({ error: 'Referrals belong to the account owner.' }, { status: 403 }) };
  if (!bridgeReady()) return { err: NextResponse.json({ beaker: false, error: 'Referrals are being switched on.' }, { status: 503 }) };
  const email = await isBeaker(db, await beakerEmails(db, caller, Boolean(viewAsId(req))));
  if (!email) return { err: NextResponse.json({ beaker: false }) };
  const { data: client } = await db.from('portal_clients').select('crm_lead_id').eq('id', caller.clientId).maybeSingle();
  return { email, leadId: (client?.crm_lead_id as string | null) ?? null };
}

const evidence = (req: Request) => ({
  ip: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim(),
  ua: (req.headers.get('user-agent') ?? '').slice(0, 400),
});

export async function GET(req: Request) {
  const w = await who(req);
  if (w.err) return w.err;
  try {
    const { status, data } = await bridge({ action: 'summary', email: w.email, leadId: w.leadId });
    return NextResponse.json(data, { status });
  } catch (e) {
    console.error('[portal] beaker summary failed', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Could not reach the referral system. Try again in a minute.' }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const w = await who(req);
  if (w.err) return w.err;
  try {
    if ((req.headers.get('content-type') ?? '').includes('multipart/form-data')) {
      const f = await req.formData();
      const file = f.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'No file.' }, { status: 400 });
      const out = new FormData();
      out.set('email', w.email);
      if (w.leadId) out.set('leadId', w.leadId);
      out.set('file', file);
      const { status, data } = await bridge(out);
      return NextResponse.json(data, { status });
    }
    let p: Record<string, unknown>;
    try {
      p = await req.json();
    } catch {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    const action = String(p.action ?? '');
    if (!['linkWhop', 'acceptTerms', 'refer', 'redeem'].includes(action)) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    const body: Record<string, unknown> = { action, email: w.email, leadId: w.leadId, ...evidence(req) };
    if (action === 'linkWhop') body.username = String(p.username ?? '').slice(0, 80);
    if (action === 'acceptTerms') body.accept = p.accept === true;
    if (action === 'redeem') Object.assign(body, { accept: p.accept === true, termsVersion: String(p.termsVersion ?? '') });
    if (action === 'refer') {
      Object.assign(body, {
        name: String(p.name ?? '').slice(0, 120),
        company: String(p.company ?? '').slice(0, 120),
        email_referral: String(p.referralEmail ?? '').slice(0, 160),
        phone: String(p.phone ?? '').slice(0, 40),
        notes: String(p.notes ?? '').slice(0, 1000),
      });
    }
    const { status, data } = await bridge(body);
    return NextResponse.json(data, { status });
  } catch (e) {
    console.error('[portal] beaker action failed', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Could not reach the referral system. Nothing changed; try again.' }, { status: 502 });
  }
}
