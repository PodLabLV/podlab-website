// Notification delivery, the pure half: which pending portal_notifications go
// out now, to whom, by which channel, and what the message says. No I/O here,
// so the batching, rate limit and quiet hours are unit-tested
// (scripts/test-notify-delivery.ts, `npm run test:notify`).
//
// Rules (docs/PORTAL-V2.md, Notifications):
// - One message per burst: wait until the client's newest pending row is
//   QUIET_MS old (the burst has settled), but never hold the oldest longer
//   than MAX_HOLD_MS.
// - At most one email and one text per client per RATE_MS.
// - Only rows from the last WINDOW_MS; anything older is never sent late.
// - Skip rows already read in the portal, and 'waiting' rows already resolved.
// - Email: notify_email on, digest_opt_out off (the client's "no update
//   emails" switch), a real address.
// - SMS: notify_sms on, a recorded consent, no STOP, a phone that normalizes
//   to E.164, and 8am–9pm in the client's timezone (default America/Los_Angeles).

import { EMAIL_STYLE, SITE_URL, emailLayout, escapeHtml } from '@/lib/portal-email';
import { digestEligible } from '@/lib/portal/digest';

export const QUIET_MS = 10 * 60_000;
export const MAX_HOLD_MS = 60 * 60_000;
export const RATE_MS = 60 * 60_000;
export const WINDOW_MS = 48 * 60 * 60_000;
export const SMS_START_HOUR = 8;
export const SMS_END_HOUR = 21;
export const DEFAULT_TZ = 'America/Los_Angeles';

export interface NotificationRow {
  id: string;
  client_id: string;
  kind: string;
  direction: 'done' | 'waiting';
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
  read_at: string | null;
  resolved_at: string | null;
  emailed_at: string | null;
  texted_at: string | null;
}

export interface ClientPrefs {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  business_name: string;
  phone: string | null;
  timezone: string | null;
  notify_email?: boolean | null;
  notify_sms?: boolean | null;
  digest_opt_out?: boolean | null;
  sms_consent_at?: string | null;
  sms_opted_out_at?: string | null;
}

export type Skip =
  | 'nothing-pending'
  | 'burst-open'
  | 'rate-limited'
  | 'email-off'
  | 'sms-off'
  | 'no-consent'
  | 'opted-out'
  | 'no-phone'
  | 'quiet-hours'
  | 'sms-unconfigured';

export interface ChannelPlan {
  send: boolean;
  /** Rows this message covers (stamped on success). */
  rowIds: string[];
  skip?: Skip;
}

export interface DeliveryPlan {
  clientId: string;
  email: ChannelPlan;
  sms: ChannelPlan;
}

const t = (s: string | null | undefined) => (s ? Date.parse(s) : NaN);

/** Is this row still worth telling them about, on this channel? */
export function pending(r: NotificationRow, channel: 'email' | 'sms', now: number): boolean {
  if ((channel === 'email' ? r.emailed_at : r.texted_at) !== null) return false;
  if (r.read_at) return false;
  if (r.direction === 'waiting' && r.resolved_at) return false;
  const created = t(r.created_at);
  return Number.isFinite(created) && now - created <= WINDOW_MS && created <= now;
}

/** The burst has settled (or has been held long enough). */
export function burstReady(rows: NotificationRow[], now: number): boolean {
  if (!rows.length) return false;
  const times = rows.map((r) => t(r.created_at));
  const newest = Math.max(...times);
  const oldest = Math.min(...times);
  return now - newest >= QUIET_MS || now - oldest >= MAX_HOLD_MS;
}

/** No message on this channel in the last hour. `all` is every recent row for the client, sent or not. */
export function rateOk(all: NotificationRow[], channel: 'email' | 'sms', now: number): boolean {
  const last = Math.max(0, ...all.map((r) => t(channel === 'email' ? r.emailed_at : r.texted_at)).filter(Number.isFinite));
  return now - last >= RATE_MS;
}

/** Hour of the day (0–23) in a timezone; falls back to Los Angeles for a bad name. */
export function localHour(now: number, timezone: string | null | undefined): number {
  const fmt = (tz: string) => Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date(now)));
  try {
    return fmt(timezone || DEFAULT_TZ);
  } catch {
    return fmt(DEFAULT_TZ);
  }
}

export function inSmsHours(now: number, timezone: string | null | undefined): boolean {
  const h = localHour(now, timezone);
  return h >= SMS_START_HOUR && h < SMS_END_HOUR;
}

/** US-first E.164: 10 digits → +1, 11 starting with 1 → +, anything already +country kept. Null if it isn't a phone. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const digits = s.replace(/\D/g, '');
  if (s.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/**
 * Decide, for one client, what goes out now. `rows` = that client's
 * notifications from the last WINDOW_MS (sent or not).
 */
export function planDelivery(client: ClientPrefs, rows: NotificationRow[], now: number, opts: { smsConfigured: boolean }): DeliveryPlan {
  const channel = (ch: 'email' | 'sms'): ChannelPlan => {
    const due = rows.filter((r) => pending(r, ch, now)).sort((a, b) => t(a.created_at) - t(b.created_at));
    const ids = due.map((r) => r.id);
    const no = (skip: Skip): ChannelPlan => ({ send: false, rowIds: ids, skip });
    if (!due.length) return no('nothing-pending');
    if (ch === 'email') {
      if (client.notify_email === false || !digestEligible(client)) return no('email-off');
    } else {
      if (client.notify_sms !== true) return no('sms-off');
      if (client.sms_opted_out_at) return no('opted-out');
      if (!client.sms_consent_at) return no('no-consent');
      if (!toE164(client.phone)) return no('no-phone');
      if (!opts.smsConfigured) return no('sms-unconfigured');
    }
    if (!burstReady(due, now)) return no('burst-open');
    if (!rateOk(rows, ch, now)) return no('rate-limited');
    if (ch === 'sms' && !inSmsHours(now, client.timezone)) return no('quiet-hours');
    return { send: true, rowIds: ids };
  };
  return { clientId: client.id, email: channel('email'), sms: channel('sms') };
}

// ── the messages ──────────────────────────────────────────────────────────

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function portalUrl(link: string | null): string {
  if (!link) return `${SITE_URL}/portal`;
  if (/^https?:\/\//i.test(link)) return link.startsWith(SITE_URL) ? link : `${SITE_URL}/portal`;
  return `${SITE_URL}${link.startsWith('/') ? '' : '/'}${link}`;
}

/** Waiting rows first (what's on them), then done, newest first within each. */
export function ordered(rows: NotificationRow[]): NotificationRow[] {
  return [...rows].sort((a, b) => (a.direction === b.direction ? t(b.created_at) - t(a.created_at) : a.direction === 'waiting' ? -1 : 1));
}

export function emailSubject(rows: NotificationRow[]): string {
  if (rows.length === 1) return rows[0].title.slice(0, 120);
  const waiting = rows.filter((r) => r.direction === 'waiting').length;
  if (waiting) return `${plural(waiting, 'thing')} waiting on you in your PodLab portal`;
  return `${plural(rows.length, 'update')} in your PodLab portal`;
}

export function notificationEmail(rows: NotificationRow[], who: { firstName: string | null }): { subject: string; html: string; text: string } {
  const list = ordered(rows);
  const subject = emailSubject(list);
  const waiting = list.filter((r) => r.direction === 'waiting');
  const done = list.filter((r) => r.direction === 'done');
  const hello = who.firstName ? `${escapeHtml(who.firstName)},` : 'Hi,';

  const item = (r: NotificationRow) =>
    `<tr><td style="padding:14px 0;border-top:1px solid #1a1a1a;">
      <a href="${escapeHtml(portalUrl(r.link))}" style="color:#eeeeee;text-decoration:none;font-size:15px;font-weight:600;">${escapeHtml(r.title)}</a>
      ${r.body ? `<div style="margin-top:4px;font-size:14px;line-height:1.5;color:#bdbdbd;">${escapeHtml(r.body.slice(0, 400))}</div>` : ''}
    </td></tr>`;
  const section = (label: string, items: NotificationRow[]) =>
    items.length
      ? `<p style="${EMAIL_STYLE.kicker}margin-top:8px;">${label}</p><table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">${items.map(item).join('')}</table>`
      : '';

  const content = `
        <p style="${EMAIL_STYLE.hello}">${hello}</p>
        <p style="${EMAIL_STYLE.lead}">${waiting.length ? `PodLab is waiting on you for ${plural(waiting.length, 'thing')}.` : 'Here is what moved in your portal.'}</p>
        ${section('Waiting on you', waiting)}
        ${section('Done by PodLab', done)}
        <a href="${escapeHtml(portalUrl(waiting[0]?.link ?? done[0]?.link ?? null))}" style="${EMAIL_STYLE.button}">Open your portal</a>`;
  const footer = `You get these because notifications are on in your portal. Turn them off any time: <a href="${SITE_URL}/portal/profile" style="color:#888888;">Profile</a>. PodLab · Las Vegas`;
  const html = emailLayout({ title: subject, content, footer });

  const text = [
    who.firstName ? `${who.firstName},` : 'Hi,',
    '',
    ...(waiting.length ? ['Waiting on you:', ...waiting.map((r) => `- ${r.title}${r.body ? ` (${r.body.slice(0, 160)})` : ''}: ${portalUrl(r.link)}`), ''] : []),
    ...(done.length ? ['Done by PodLab:', ...done.map((r) => `- ${r.title}: ${portalUrl(r.link)}`), ''] : []),
    `Turn these off on your Profile: ${SITE_URL}/portal/profile`,
  ].join('\n');
  return { subject, html, text };
}

/** One short text per burst. Always ends with the opt-out line. */
export function notificationSms(rows: NotificationRow[]): string {
  const list = ordered(rows);
  const waiting = list.filter((r) => r.direction === 'waiting');
  const head = list[0];
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
  const lead =
    list.length === 1
      ? clip(head.title, 110)
      : waiting.length
        ? `${plural(waiting.length, 'thing')} waiting on you, starting with: ${clip(waiting[0].title, 70)}`
        : `${plural(list.length, 'update')} in your portal, including: ${clip(head.title, 70)}`;
  return `PodLab: ${lead}. ${portalUrl(list.length === 1 ? head.link : (waiting[0] ?? head).link)} Reply STOP to opt out.`;
}
