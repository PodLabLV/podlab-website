import { reportError } from '@/lib/alerts';
import { admin } from '@/lib/portal-server';

/**
 * Minimal portal notifications writer (track B stand-in).
 *
 * Track A owns this module and its version wins at merge; this one keeps the
 * same signature so callers don't change. It only writes rows into
 * public.portal_notifications (deduped on client_id + ref). Delivery (email,
 * SMS) is track D's and reads those rows; nothing is sent from here.
 */

export interface NotifyInput {
  kind: string;
  direction: 'done' | 'waiting';
  title: string;
  body?: string;
  link?: string;
  ref?: string;
}

/** Upsert one notification. Never throws: a notification must not fail the action that caused it. */
export async function notify(clientId: string, n: NotifyInput): Promise<void> {
  try {
    const row = {
      client_id: clientId,
      kind: n.kind,
      direction: n.direction,
      title: n.title.slice(0, 200),
      body: n.body?.slice(0, 2000) ?? null,
      link: n.link ?? null,
      ref: n.ref ?? null,
    };
    const db = admin();
    const { error } = n.ref
      ? // Same ref again: keep the original row (and its read/resolved state).
        await db.from('portal_notifications').upsert(row, { onConflict: 'client_id,ref', ignoreDuplicates: true })
      : await db.from('portal_notifications').insert(row);
    if (error) reportError('[portal] notify failed', error.message);
  } catch (err) {
    reportError('[portal] notify threw', err);
  }
}

/** Close an open 'waiting' notification: the client did the thing. */
export async function resolve(clientId: string, ref: string): Promise<void> {
  try {
    const { error } = await admin()
      .from('portal_notifications')
      .update({ resolved_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('ref', ref)
      .is('resolved_at', null);
    if (error) reportError('[portal] resolve failed', error.message);
  } catch (err) {
    reportError('[portal] resolve threw', err);
  }
}
