import type { SupabaseClient } from '@supabase/supabase-js';
import type { PortalCaller } from '@/lib/portal-server';

/**
 * Beaker (PodLab's referral program) inside the portal. The CRM owns every
 * rule and number; the portal asks it through a server-to-server bridge
 * (crm.podlablv.com/api/beaker/portal, Bearer PORTAL_BRIDGE_SECRET), passing
 * the client's verified email and their own deal id. Only the account owner
 * sees it (a teammate's login isn't the Beaker), and only approved Beakers.
 */

const CRM = process.env.CRM_BASE_URL || 'https://crm.podlablv.com';

/** The emails this client's Beaker record could be under: their portal email, and their own login's. */
export async function beakerEmails(db: SupabaseClient, caller: PortalCaller, viewAs: boolean): Promise<string[]> {
  if (caller.member) return [];
  const { data } = await db.from('portal_clients').select('email').eq('id', caller.clientId).maybeSingle();
  const out = [data?.email, viewAs ? null : caller.email].filter((e): e is string => Boolean(e)).map((e) => e.trim().toLowerCase());
  return [...new Set(out)];
}

/** Cheap check for the sidebar: is any of these an approved Beaker? Reads the CRM table directly. */
export async function isBeaker(db: SupabaseClient, emails: string[]): Promise<string | null> {
  for (const e of emails) {
    const { data } = await db.schema('crm').from('affiliates').select('email').ilike('email', e.replace(/[%_]/g, '')).eq('status', 'approved').limit(1).maybeSingle();
    if (data) return e;
  }
  return null;
}

export function bridgeReady(): boolean {
  return (process.env.PORTAL_BRIDGE_SECRET ?? '').length >= 32;
}

export async function bridge(body: Record<string, unknown> | FormData): Promise<{ status: number; data: Record<string, unknown> }> {
  const form = body instanceof FormData;
  const res = await fetch(`${CRM}/api/beaker/portal`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PORTAL_BRIDGE_SECRET}`, ...(form ? {} : { 'Content-Type': 'application/json' }) },
    body: form ? body : JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, data };
}
