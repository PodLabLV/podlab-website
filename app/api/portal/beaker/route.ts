import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/portal-server';
import { bridge, bridgeReady } from '@/lib/portal/beaker';
import { loadBeaker, resolveBeaker } from '@/lib/portal/beaker-account';
import { contactLooksValid, splitContact } from '@/lib/portal/beaker-view';
import { notify } from '@/lib/portal/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The Beaker tab (/portal/beaker).
 *
 * GET  their link, referrals and money, read with the service role and scoped
 *      to the affiliate the token resolves to (lib/portal/beaker-account.ts).
 *      `{ beaker: false }` for anyone who isn't an approved Beaker.
 * POST { action: 'refer', name, contact, business, note }
 *      { action: 'linkWhop', username } | { action: 'acceptTerms', accept: true }
 *      multipart file → W-9 upload
 *      All writes go through the CRM bridge (crm.podlablv.com/api/beaker/portal),
 *      so a referral is created by the CRM's own addReferral: same dedupe, same
 *      §2.4 "already in our system" rule, same attribution and team alerts.
 *      The affiliate is identified by the email on their CRM record, which this
 *      route looked up from the token; nothing in the body can name another one.
 */

const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } });

// A small per-affiliate brake on referral submits (per server instance).
const recent = new Map<string, number[]>();
function tooMany(key: string, max = 10, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    recent.set(key, hits);
    return true;
  }
  hits.push(now);
  recent.set(key, hits);
  return false;
}

const evidence = (req: Request) => ({
  ip: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim(),
  ua: (req.headers.get('user-agent') ?? '').slice(0, 400),
});

// The CRM bridge secret isn't set (local dev, or a new environment): nothing can be written.
const off = () => json({ error: 'Referrals are being switched on. Try again later today.' }, 503);

const clip = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export async function GET(req: Request) {
  const db = admin();
  const id = await resolveBeaker(req, db).catch(() => null);
  if (!id) return json({ beaker: false });
  try {
    return json(await loadBeaker(db, id));
  } catch (e) {
    reportError('[portal] beaker load failed', e instanceof Error ? e.message : e);
    return json({ error: 'Could not load your Beaker account. Try again in a minute.' }, 502);
  }
}

export async function POST(req: Request) {
  const db = admin();
  const id = await resolveBeaker(req, db).catch(() => null);
  if (!id) return json({ error: 'Not authorized' }, 401);
  if (id.readOnly) return json({ error: "You're viewing as this client. Nothing was changed." }, 403);
  const email = id.affiliate.email;

  try {
    if ((req.headers.get('content-type') ?? '').includes('multipart/form-data')) {
      const f = await req.formData();
      const file = f.get('file');
      if (!(file instanceof File)) return json({ error: 'No file.' }, 400);
      if (!bridgeReady()) return off();
      const out = new FormData();
      out.set('email', email);
      out.set('file', file);
      const { status, data } = await bridge(out);
      return json(data, status);
    }

    let p: Record<string, unknown>;
    try {
      p = await req.json();
    } catch {
      return json({ error: 'Bad request' }, 400);
    }
    const action = String(p.action ?? '');

    if (action === 'refer') {
      const name = clip(p.name, 120);
      const contact = clip(p.contact, 160);
      if (!name) return json({ error: 'Add their name.' }, 400);
      if (!contactLooksValid(contact)) return json({ error: 'Add their email or phone number so PodLab can reach them.' }, 400);
      if (tooMany(id.affiliate.id)) return json({ error: "That's a lot at once. Wait a few minutes, then send the rest." }, 429);
      if (!bridgeReady()) return off();
      const { email: refEmail, phone } = splitContact(contact);
      const { status, data } = await bridge({
        action: 'refer',
        email,
        name,
        company: clip(p.business, 120),
        email_referral: refEmail,
        phone,
        notes: String(p.note ?? '').trim().slice(0, 1000),
        ...evidence(req),
      });
      if (status === 200 && data.ok !== false && id.clientId) {
        const credited = data.credited !== false;
        await notify(id.clientId, {
          kind: 'referral',
          direction: 'done',
          title: credited ? `Referral sent: ${name}` : `Referral noted: ${name}`,
          body: String(data.message ?? ''),
          link: '/portal/beaker',
        });
      }
      return json(data, status);
    }

    if ((action === 'linkWhop' || action === 'acceptTerms') && !bridgeReady()) return off();
    if (action === 'linkWhop') {
      const { status, data } = await bridge({ action, email, username: clip(p.username, 80) });
      return json(data, status);
    }
    if (action === 'acceptTerms') {
      const { status, data } = await bridge({ action, email, accept: p.accept === true, ...evidence(req) });
      return json(data, status);
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    reportError('[portal] beaker action failed', e instanceof Error ? e.message : e);
    return json({ error: 'Could not reach the referral system. Nothing changed; try again.' }, 502);
  }
}
