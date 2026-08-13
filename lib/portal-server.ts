import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side portal helpers.
 *
 * Clients have no write policies in the database. Every mutation lands here
 * instead, so recording the change, pinging Slack, and writing the CRM timeline
 * are one code path that cannot half-happen.
 */

export function admin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export interface PortalCaller {
  clientId: string;
  businessName: string;
  displayName: string;
  crmLeadId: string | null;
  email: string;
  isStaff: boolean;
}

/**
 * Resolve the bearer token to the portal client it belongs to. Returns null for
 * anything unauthenticated or not yet set up — never throws, so routes can
 * answer 401 uniformly without leaking which half failed.
 */
export async function resolveCaller(
  req: Request,
  db: SupabaseClient,
): Promise<PortalCaller | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data: userData, error: userErr } = await db.auth.getUser(token);
  if (userErr || !userData?.user) return null;

  const { data: client } = await db
    .from('portal_clients')
    .select('id, business_name, first_name, last_name, crm_lead_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!client) return null;

  const name = [client.first_name, client.last_name].filter(Boolean).join(' ');
  return {
    clientId: client.id,
    businessName: client.business_name,
    displayName: name || client.business_name,
    crmLeadId: client.crm_lead_id ?? null,
    email: userData.user.email ?? '',
    isStaff: await isStaff(db, userData.user.email),
  };
}

/**
 * Staff check, server-side only. The browser never gets to assert this - a client
 * session that claims to be staff is still just a client session.
 */
export async function isStaff(db: SupabaseClient, email?: string | null): Promise<boolean> {
  if (!email) return false;
  const { data } = await db
    .from('portal_staff')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return Boolean(data);
}

/**
 * Resolve a staff caller acting on any client. Returns null unless the bearer token
 * belongs to a staff email.
 */
export async function resolveStaff(
  req: Request,
  db: SupabaseClient,
): Promise<{ email: string; name: string } | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user?.email) return null;
  if (!(await isStaff(db, data.user.email))) return null;
  const { data: row } = await db
    .from('portal_staff')
    .select('name')
    .eq('email', data.user.email.toLowerCase())
    .maybeSingle();
  return { email: data.user.email, name: row?.name ?? data.user.email };
}

/** Best-effort Slack ping. A webhook failure must never fail the client's action. */
export async function notifySlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error('[portal] slack notify failed', err);
  }
}

/** Drop a line on the CRM lead timeline so it shows up in crm.podlablv.com. */
export async function logToCrm(
  db: SupabaseClient,
  caller: PortalCaller,
  text: string,
): Promise<void> {
  if (!caller.crmLeadId) return;
  try {
    const { error } = await db
      .schema('crm')
      .from('activities')
      .insert({
        lead_id: caller.crmLeadId,
        actor_name: `${caller.displayName} (portal)`,
        text,
      });
    if (error) console.error('[portal] crm activity failed', error.message);
  } catch (err) {
    console.error('[portal] crm activity threw', err);
  }
}
