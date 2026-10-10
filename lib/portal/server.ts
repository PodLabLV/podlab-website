import { reportError } from '@/lib/alerts';
import { timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveCaller, resolveStaff, type PortalCaller } from '@/lib/portal-server';

/**
 * Server helpers for the Scripts and Deliverables routes. Built on top of
 * lib/portal-server.ts rather than inside it, so that file stays untouched.
 */

export interface Publisher {
  name: string;
  email: string | null;
  via: 'staff' | 'key';
}

/**
 * Who may publish scripts and deliverable versions: a signed-in staff member, or
 * an automation (the vsllab / assetslab skills) holding PORTAL_PUBLISH_KEY in
 * the x-portal-publish-key header. With the env var unset, only staff can.
 */
export async function resolvePublisher(req: Request, db: SupabaseClient): Promise<Publisher | null> {
  const key = process.env.PORTAL_PUBLISH_KEY;
  const sent = req.headers.get('x-portal-publish-key');
  if (key && sent && key.length >= 24) {
    const a = Buffer.from(sent);
    const b = Buffer.from(key);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return { name: 'PodLab', email: null, via: 'key' };
    }
  }
  const staff = await resolveStaff(req, db);
  return staff ? { name: staff.name, email: staff.email, via: 'staff' } : null;
}

/**
 * A client acting on their own account, or staff acting on any. Staff wins: a
 * staff member who also happens to have a client row is replying as PodLab,
 * not commenting as that client.
 */
export async function resolveActor(
  req: Request,
  db: SupabaseClient,
): Promise<{ staff: { name: string; email: string } | null; caller: PortalCaller | null }> {
  const staff = await resolveStaff(req, db);
  if (staff) return { staff, caller: null };
  return { staff: null, caller: await resolveCaller(req, db) };
}

/** Accept a client by id or by login email, so a skill can publish knowing only the email. */
export async function resolveClientId(
  db: SupabaseClient,
  p: { clientId?: string; clientEmail?: string },
): Promise<string | null> {
  if (p.clientId) {
    const { data } = await db.from('portal_clients').select('id').eq('id', p.clientId).maybeSingle();
    return data?.id ?? null;
  }
  if (p.clientEmail) {
    const { data } = await db
      .from('portal_clients')
      .select('id')
      .ilike('email', p.clientEmail.trim())
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }
  return null;
}

/** Client-visible milestone on the dashboard feed. Best effort. */
export async function recordActivity(
  db: SupabaseClient,
  clientId: string,
  kind: 'deliverable' | 'update',
  title: string,
): Promise<void> {
  const { error } = await db.from('portal_activity').insert({ client_id: clientId, kind, title });
  if (error) reportError('[portal] activity insert failed', error.message);
}

/** Vercel puts the caller first in x-forwarded-for; the rest are proxies. */
export function clientIp(req: Request): string | null {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null
  );
}

/** Next version number from what actually exists, not from a counter column. */
export async function nextVersionNo(
  db: SupabaseClient,
  table: 'portal_script_versions' | 'portal_asset_versions',
  parentCol: 'script_id' | 'asset_id',
  parentId: string,
): Promise<number> {
  const { data } = await db
    .from(table)
    .select('version_no')
    .eq(parentCol, parentId)
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.version_no ?? 0) + 1;
}

export function trimTo(text: string, n: number): string {
  return text.length > n ? `${text.slice(0, n)}...` : text;
}

export const MAX_NOTE = 4000;
