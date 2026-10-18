import { reportError } from '@/lib/alerts';
import { admin } from '@/lib/portal-server';

/**
 * Portal notifications (the hot potato): one row per thing a client should
 * know. Minimal version from track C; track A owns the full one. The signature
 * is the shared contract, so swapping implementations changes no caller.
 *
 * notify()  upserts on (client_id, ref): the same event twice is one row, and a
 *           'waiting' row that comes back reopens (resolved_at cleared).
 * resolve() closes the open 'waiting' row with that ref (the client did it).
 *
 * Both are best effort: a notification must never fail the action behind it.
 */

export interface NotifyInput {
  kind: string;
  direction: 'done' | 'waiting';
  title: string;
  body?: string;
  link?: string;
  ref?: string;
}

export async function notify(clientId: string, n: NotifyInput): Promise<void> {
  try {
    const row = {
      client_id: clientId,
      kind: n.kind,
      direction: n.direction,
      title: n.title.slice(0, 200),
      body: n.body ? n.body.slice(0, 2000) : null,
      link: n.link ?? null,
      ref: n.ref ?? null,
      read_at: null,
      resolved_at: null,
    };
    const db = admin();
    const { error } = n.ref
      ? await db.from('portal_notifications').upsert(row, { onConflict: 'client_id,ref' })
      : await db.from('portal_notifications').insert(row);
    if (error) reportError('[portal] notify failed', error.message);
  } catch (err) {
    reportError('[portal] notify threw', err);
  }
}

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
