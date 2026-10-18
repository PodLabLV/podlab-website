// Portal notifications (docs/PORTAL-V2.md): the hot potato's feed and what the
// delivery cron emails / texts. Server only (service role).
//
// Minimal version written by track D against track A's signature; track A owns
// this file and its fuller version replaces this one on merge.

import { reportError } from '@/lib/alerts';
import { admin } from '@/lib/portal-server';

export type NotificationDirection = 'done' | 'waiting';

export interface NotifyInput {
  kind: string;
  direction: NotificationDirection;
  title: string;
  body?: string;
  link?: string;
  /** Dedupe key: the same ref for the same client updates the row instead of adding one. */
  ref?: string;
}

/**
 * Upsert one notification on (client_id, ref). Never throws: a notification
 * that fails to write must not fail the action that triggered it.
 */
export async function notify(clientId: string, n: NotifyInput): Promise<{ ok: boolean; id?: string }> {
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
    const q = n.ref
      ? db.from('portal_notifications').upsert(row, { onConflict: 'client_id,ref' }).select('id').single()
      : db.from('portal_notifications').insert(row).select('id').single();
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true, id: (data as { id: string }).id };
  } catch (err) {
    reportError('[notify] write failed', clientId, n.kind, err instanceof Error ? err.message : String(err));
    return { ok: false };
  }
}

/** Close a 'waiting' notification: the client did the thing. Never throws. */
export async function resolve(clientId: string, ref: string): Promise<void> {
  try {
    const { error } = await admin()
      .from('portal_notifications')
      .update({ resolved_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('ref', ref)
      .is('resolved_at', null);
    if (error) throw new Error(error.message);
  } catch (err) {
    reportError('[notify] resolve failed', clientId, ref, err instanceof Error ? err.message : String(err));
  }
}
