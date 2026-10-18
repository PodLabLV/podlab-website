import type { SupabaseClient } from '@supabase/supabase-js';
import { reportError } from '@/lib/alerts';
import { admin } from '@/lib/portal-server';

/**
 * Portal v2 notifications: the rows behind the hot potato (top right) and,
 * later, the email / SMS delivery (track D reads emailed_at / texted_at).
 *
 *   notify(clientId, { kind, direction, title, body?, link?, ref? })
 *   resolve(clientId, ref)
 *
 * direction 'done'    = something PodLab did ("Your VSL cut is ready").
 * direction 'waiting' = something we're waiting on the client for; it stays
 *                       open until resolve() is called with the same ref.
 *
 * `ref` is the dedupe key (e.g. `asset:<id>:v3`, `script:<id>:review`). Calling
 * notify again with the same ref updates the wording but keeps read_at,
 * resolved_at and the delivery stamps, so a retry never re-alerts anyone. Use a
 * new ref (a new version) when it really is a new event.
 *
 * Server-only (service role). Never throws: a failed notification must never
 * fail the action that caused it. Returns false when nothing was written.
 */

export type NotifyDirection = 'done' | 'waiting';

export interface NotifyInput {
  /** review_ready, approved, payment, credits, onboarding, message, delivered… */
  kind: string;
  direction: NotifyDirection;
  title: string;
  body?: string | null;
  /** Portal path (`/portal/projects?item=…`) or an https URL. */
  link?: string | null;
  /** Dedupe key, unique per client. */
  ref?: string | null;
}

export interface PortalNotification {
  id: string;
  kind: string;
  direction: NotifyDirection;
  title: string;
  body: string | null;
  link: string | null;
  ref: string | null;
  created_at: string;
  read_at: string | null;
  resolved_at: string | null;
}

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clip = (v: string | null | undefined, n: number): string | null => {
  const s = (v ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, n) : null;
};

/** Only portal paths and https links: a notification can never carry a javascript: URL. */
export function safeLink(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  if (!s) return null;
  if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 500);
  try {
    const u = new URL(s);
    return u.protocol === 'https:' ? u.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

export async function notify(clientId: string, n: NotifyInput, db: SupabaseClient = admin()): Promise<boolean> {
  const title = clip(n.title, 200);
  if (!ID.test(clientId) || !title || !n.kind || !['done', 'waiting'].includes(n.direction)) {
    reportError('[portal] notify refused bad input', { clientId, kind: n.kind, direction: n.direction });
    return false;
  }
  const row = {
    client_id: clientId,
    kind: clip(n.kind, 40)!,
    direction: n.direction,
    title,
    body: clip(n.body, 1000),
    link: safeLink(n.link),
    ref: clip(n.ref, 200),
  };
  try {
    // With a ref: upsert on (client_id, ref). Only the columns sent are updated
    // on conflict, so read_at / resolved_at / emailed_at survive a retry.
    const { error } = row.ref
      ? await db.from('portal_notifications').upsert(row, { onConflict: 'client_id,ref' })
      : await db.from('portal_notifications').insert(row);
    if (error) {
      reportError('[portal] notify failed', error.message);
      return false;
    }
    return true;
  } catch (err) {
    reportError('[portal] notify threw', err);
    return false;
  }
}

/** Close an open 'waiting' row (the client did the thing). True when a row was closed. */
export async function resolve(clientId: string, ref: string, db: SupabaseClient = admin()): Promise<boolean> {
  if (!ID.test(clientId) || !ref) return false;
  try {
    const { data, error } = await db
      .from('portal_notifications')
      .update({ resolved_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('ref', ref.slice(0, 200))
      .is('resolved_at', null)
      .select('id');
    if (error) {
      reportError('[portal] notify resolve failed', error.message);
      return false;
    }
    return (data ?? []).length > 0;
  } catch (err) {
    reportError('[portal] notify resolve threw', err);
    return false;
  }
}

/** The bell's feed: unread 'done' rows, recently read ones, and every open 'waiting' row. */
export async function loadFeed(
  db: SupabaseClient,
  clientId: string,
): Promise<{ ready: boolean; done: PortalNotification[]; earlier: PortalNotification[]; waiting: PortalNotification[] }> {
  const cols = 'id, kind, direction, title, body, link, ref, created_at, read_at, resolved_at';
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [done, earlier, waiting] = await Promise.all([
    db.from('portal_notifications').select(cols).eq('client_id', clientId).eq('direction', 'done').is('read_at', null).order('created_at', { ascending: false }).limit(30),
    db.from('portal_notifications').select(cols).eq('client_id', clientId).eq('direction', 'done').not('read_at', 'is', null).gte('created_at', since).order('created_at', { ascending: false }).limit(8),
    db.from('portal_notifications').select(cols).eq('client_id', clientId).eq('direction', 'waiting').is('resolved_at', null).order('created_at', { ascending: true }).limit(30),
  ]);
  if (done.error || waiting.error) return { ready: false, done: [], earlier: [], waiting: [] };
  return {
    ready: true,
    done: (done.data ?? []) as PortalNotification[],
    earlier: (earlier.data ?? []) as PortalNotification[],
    waiting: (waiting.data ?? []) as PortalNotification[],
  };
}
