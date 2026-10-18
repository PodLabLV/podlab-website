import { reportError } from '@/lib/alerts';
import { admin } from '@/lib/portal-server';
import { SITE_URL } from '@/lib/portal-email';
import { toE164 } from '@/lib/portal/notify-delivery';
import { keywordIntent, validTwilioSignature } from '@/lib/portal/sms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Inbound texts to the portal Messaging Service (set as its incoming-message
 * webhook in Twilio). Only consent keywords matter here: STOP turns portal
 * texts off and records sms_opted_out_at; START turns them back on as a fresh
 * opt-in. Twilio's own opt-out management already blocks sends after STOP and
 * replies to the texter; this keeps portal_clients in step so the portal
 * shows the truth. Requests must carry a valid X-Twilio-Signature.
 */

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const twiml = (status = 200) => new Response(EMPTY_TWIML, { status, headers: { 'Content-Type': 'text/xml' } });

export async function POST(req: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return twiml(503);

  const params = Object.fromEntries(new URLSearchParams(await req.text())) as Record<string, string>;
  const path = new URL(req.url).pathname;
  const urls = [req.url, `${SITE_URL}${path}`];
  if (!validTwilioSignature(token, req.headers.get('x-twilio-signature'), urls, params)) return twiml(403);

  const intent = keywordIntent(params.Body);
  const from = toE164(params.From);
  if (!intent || !from) return twiml();

  try {
    const db = admin();
    const { data } = await db.from('portal_clients').select('id, phone').not('phone', 'is', null);
    const ids = ((data ?? []) as Array<{ id: string; phone: string | null }>).filter((c) => toE164(c.phone) === from).map((c) => c.id);
    if (!ids.length) return twiml();
    const now = new Date().toISOString();
    const patch = intent === 'stop' ? { notify_sms: false, sms_opted_out_at: now } : { notify_sms: true, sms_opted_out_at: null, sms_consent_source: 'sms/START' };
    const { error } = await db.from('portal_clients').update(patch).in('id', ids);
    if (error) throw new Error(error.message);
    console.log('[portal-sms] consent', intent, ids.length);
  } catch (err) {
    reportError('[portal-sms] consent update failed', err instanceof Error ? err.message : String(err));
  }
  return twiml();
}
