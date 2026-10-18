// Notification delivery, the I/O half: read the pending rows, plan per client
// (lib/portal/notify-delivery.ts), send, stamp emailed_at / texted_at.
//
// - Rows are claimed (stamped) before sending and un-stamped if the send
//   fails, so two overlapping runs can't send the same burst twice and a
//   failed send is retried next run.
// - A Twilio "unsubscribed" error (the number texted STOP) turns notify_sms
//   off and records sms_opted_out_at.
// - dry: plans and renders, sends nothing, writes nothing.
// - One client failing never stops the others.

import type { SupabaseClient } from '@supabase/supabase-js';
import { reportError } from '@/lib/alerts';
import { sendPortalEmail } from '@/lib/portal-email';
import {
  WINDOW_MS,
  notificationEmail,
  notificationSms,
  planDelivery,
  toE164,
  type ClientPrefs,
  type DeliveryPlan,
  type NotificationRow,
} from './notify-delivery';
import { sendSms, smsConfigured } from './sms';

export class NotifyNotReady extends Error {}

export interface NotifyResult {
  clientId: string;
  businessName: string;
  email: { outcome: 'sent' | 'would-send' | 'skipped' | 'failed'; reason?: string; rows: number; subject?: string; to?: string; html?: string; error?: string };
  sms: { outcome: 'sent' | 'would-send' | 'skipped' | 'failed'; reason?: string; rows: number; body?: string; error?: string };
}

const ROW_COLS = 'id, client_id, kind, direction, title, body, link, created_at, read_at, resolved_at, emailed_at, texted_at';

export async function runNotify(
  db: SupabaseClient,
  opts: { dry?: boolean; clientId?: string; now?: number; sendGapMs?: number } = {},
): Promise<{ startedAt: string; clients: number; results: NotifyResult[] }> {
  const now = opts.now ?? Date.now();
  const startedAt = new Date(now).toISOString();
  const since = new Date(now - WINDOW_MS).toISOString();

  let q = db.from('portal_notifications').select(ROW_COLS).gte('created_at', since).order('created_at').limit(5000);
  if (opts.clientId) q = q.eq('client_id', opts.clientId);
  const { data: rowData, error: rowErr } = await q;
  if (rowErr) throw new NotifyNotReady(`portal_notifications unavailable: ${rowErr.message}`);
  const rows = (rowData ?? []) as NotificationRow[];

  const byClient = new Map<string, NotificationRow[]>();
  // Every recent row, sent or not: the sent ones drive the once-an-hour limit.
  for (const r of rows) {
    const list = byClient.get(r.client_id) ?? [];
    list.push(r);
    byClient.set(r.client_id, list);
  }
  // Only clients with something not yet delivered on some channel.
  const ids = [...byClient.entries()].filter(([, list]) => list.some((r) => r.emailed_at === null || r.texted_at === null)).map(([id]) => id);
  if (!ids.length) return { startedAt, clients: 0, results: [] };

  // select('*') so a column a later migration adds (sms consent) reads as absent rather than failing.
  const { data: clientData, error: clientErr } = await db.from('portal_clients').select('*').in('id', ids);
  if (clientErr) throw new Error(`clients: ${clientErr.message}`);
  const clients = (clientData ?? []) as ClientPrefs[];

  const smsOn = smsConfigured();
  const gap = opts.sendGapMs ?? 600;
  const results: NotifyResult[] = [];
  let sentAny = false;
  const pause = async () => {
    if (sentAny && gap > 0) await new Promise((r) => setTimeout(r, gap));
    sentAny = true;
  };

  for (const c of clients) {
    const list = byClient.get(c.id) ?? [];
    const plan: DeliveryPlan = planDelivery(c, list, now, { smsConfigured: smsOn });
    const result: NotifyResult = {
      clientId: c.id,
      businessName: c.business_name,
      email: { outcome: 'skipped', reason: plan.email.skip, rows: plan.email.rowIds.length },
      sms: { outcome: 'skipped', reason: plan.sms.skip, rows: plan.sms.rowIds.length },
    };
    try {
      if (plan.email.send) {
        const batch = list.filter((r) => plan.email.rowIds.includes(r.id));
        const mail = notificationEmail(batch, { firstName: c.first_name });
        if (opts.dry) {
          result.email = { outcome: 'would-send', rows: batch.length, subject: mail.subject, to: c.email, html: mail.html };
        } else {
          const claimed = await claim(db, 'emailed_at', batch.map((r) => r.id), startedAt);
          if (claimed.length) {
            await pause();
            const sent = await sendPortalEmail({ to: c.email, subject: mail.subject, html: mail.html, text: mail.text });
            if (sent.ok) {
              result.email = { outcome: 'sent', rows: claimed.length, subject: mail.subject };
              await copyTeam(db, c, batch, pause);
            } else {
              await unclaim(db, 'emailed_at', claimed, startedAt);
              result.email = { outcome: 'failed', rows: claimed.length, subject: mail.subject, error: sent.error };
            }
          } else {
            result.email = { outcome: 'skipped', reason: 'claimed-elsewhere', rows: 0 };
          }
        }
      }

      if (plan.sms.send) {
        const batch = list.filter((r) => plan.sms.rowIds.includes(r.id));
        const body = notificationSms(batch);
        const to = toE164(c.phone)!;
        if (opts.dry) {
          result.sms = { outcome: 'would-send', rows: batch.length, body };
        } else {
          const claimed = await claim(db, 'texted_at', batch.map((r) => r.id), startedAt);
          if (claimed.length) {
            const sent = await sendSms(to, body);
            if (sent.ok) {
              result.sms = { outcome: 'sent', rows: claimed.length };
            } else {
              await unclaim(db, 'texted_at', claimed, startedAt);
              if (!sent.skipped && sent.optedOut) {
                await db.from('portal_clients').update({ notify_sms: false, sms_opted_out_at: startedAt }).eq('id', c.id);
              }
              result.sms = { outcome: 'failed', rows: claimed.length, error: sent.error };
            }
          } else {
            result.sms = { outcome: 'skipped', reason: 'claimed-elsewhere', rows: 0 };
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      reportError('[portal-notify] client failed', c.id, message);
      if (plan.email.send && result.email.outcome === 'skipped') result.email = { ...result.email, outcome: 'failed', error: message };
      else if (plan.sms.send && result.sms.outcome === 'skipped') result.sms = { ...result.sms, outcome: 'failed', error: message };
    }
    results.push(result);
  }
  return { startedAt, clients: clients.length, results };
}

/** Stamp the rows still unstamped; returns the ids this run now owns. */
async function claim(db: SupabaseClient, col: 'emailed_at' | 'texted_at', ids: string[], at: string): Promise<string[]> {
  const { data, error } = await db.from('portal_notifications').update({ [col]: at }).in('id', ids).is(col, null).select('id');
  if (error) throw new Error(`claim ${col}: ${error.message}`);
  return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
}

async function unclaim(db: SupabaseClient, col: 'emailed_at' | 'texted_at', ids: string[], at: string): Promise<void> {
  const { error } = await db.from('portal_notifications').update({ [col]: null }).in('id', ids).eq(col, at);
  if (error) reportError('[portal-notify] unclaim failed', col, error.message);
}

/** Teammates get the same email, addressed to them. Best effort. */
async function copyTeam(db: SupabaseClient, c: ClientPrefs, batch: NotificationRow[], pause: () => Promise<void>): Promise<void> {
  try {
    const { data } = await db.from('portal_client_members').select('email, first_name').eq('client_id', c.id);
    for (const m of (data ?? []) as Array<{ email: string; first_name: string | null }>) {
      if (!m.email || m.email.toLowerCase() === c.email.toLowerCase() || m.email.endsWith('.invalid')) continue;
      await pause();
      const own = notificationEmail(batch, { firstName: m.first_name });
      const res = await sendPortalEmail({ to: m.email, subject: own.subject, html: own.html, text: own.text });
      if (!res.ok) reportError('[portal-notify] teammate send failed', c.id, res.error);
    }
  } catch (err) {
    reportError('[portal-notify] teammates failed', c.id, err instanceof Error ? err.message : String(err));
  }
}
