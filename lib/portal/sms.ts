// Portal SMS through Twilio's REST API (no SDK). Server only.
//
// Off unless TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SID
// (a Messaging Service on the A2P 10DLC campaign) are all set: unset, every
// send is a no-op that reports `skipped`, so nothing breaks before Hiram
// switches it on. STOP / START are handled by the Messaging Service's opt-out
// management and mirrored into portal_clients by /api/twilio/portal-sms.

import { createHmac, timingSafeEqual } from 'node:crypto';

export function smsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_MESSAGING_SID);
}

export type SmsResult =
  | { ok: true; sid: string }
  | { ok: false; skipped: true; error: string }
  | { ok: false; skipped?: false; error: string; code?: number; optedOut: boolean };

/** Twilio error 21610: the recipient texted STOP to this sender. */
export const TWILIO_UNSUBSCRIBED = 21610;

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_MESSAGING_SID;
  if (!sid || !token || !service) return { ok: false, skipped: true, error: 'Twilio is not configured' };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, MessagingServiceSid: service, Body: body.slice(0, 640) }),
    });
    const j = (await res.json().catch(() => ({}))) as { sid?: string; code?: number; message?: string };
    if (!res.ok || !j.sid) return { ok: false, error: `Twilio ${res.status}: ${j.message ?? 'send failed'}`, code: j.code, optedOut: j.code === TWILIO_UNSUBSCRIBED };
    return { ok: true, sid: j.sid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), optedOut: false };
  }
}

/**
 * X-Twilio-Signature check: base64(HMAC-SHA1(authToken, url + each POST param
 * name+value, sorted by name)). Pure; unit-tested.
 */
export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  return createHmac('sha1', authToken).update(data, 'utf8').digest('base64');
}

export function validTwilioSignature(authToken: string, signature: string | null, urls: string[], params: Record<string, string>): boolean {
  if (!signature) return false;
  const got = Buffer.from(signature);
  return urls.some((u) => {
    const want = Buffer.from(twilioSignature(authToken, u, params));
    return want.length === got.length && timingSafeEqual(want, got);
  });
}

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT', 'REVOKE']);
const START_WORDS = new Set(['START', 'UNSTOP', 'YES', 'OPTIN']);

/** What an inbound text means for consent. Twilio matches the whole message, trimmed, case-insensitive. */
export function keywordIntent(body: string | null | undefined): 'stop' | 'start' | null {
  const w = (body ?? '').trim().toUpperCase().replace(/[.!]+$/, '');
  if (STOP_WORDS.has(w)) return 'stop';
  if (START_WORDS.has(w)) return 'start';
  return null;
}
