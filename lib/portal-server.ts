import { reportError } from '@/lib/alerts';
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
  /** Signed in as a teammate (assistant, partner) rather than the owner. */
  member?: { name: string; role: string } | null;
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

  // Staff "view as client": a staff session plus x-portal-view-as answers as
  // that client, for reads only. Any write in view-as mode is refused here,
  // so no route can act on a client's account from a preview.
  const viewAs = viewAsId(req);
  if (viewAs) {
    if (!['GET', 'HEAD'].includes(req.method) || !(await isStaff(db, userData.user.email))) return null;
  }

  const { data: client } = await (viewAs
    ? db.from('portal_clients').select('id, business_name, first_name, last_name, crm_lead_id').eq('id', viewAs).maybeSingle()
    : db
        .from('portal_clients')
        .select('id, business_name, first_name, last_name, crm_lead_id')
        .eq('user_id', userData.user.id)
        .maybeSingle());

  // Not the owner: maybe a teammate (assistant, partner) of one client.
  let member: PortalCaller['member'] = null;
  let owned = client;
  if (!owned && !viewAs) {
    const { data: m } = await db
      .from('portal_client_members')
      .select('first_name, last_name, role, portal_clients(id, business_name, first_name, last_name, crm_lead_id)')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    const c = (m as { portal_clients?: typeof client } | null)?.portal_clients ?? null;
    if (m && c) {
      owned = c;
      member = { name: [m.first_name, m.last_name].filter(Boolean).join(' ') || (userData.user.email ?? 'Team member'), role: m.role || 'Assistant' };
    }
  }
  if (!owned) return null;

  const name = [owned.first_name, owned.last_name].filter(Boolean).join(' ');
  return {
    clientId: owned.id,
    businessName: owned.business_name,
    // Notes and approvals carry who actually sent them.
    displayName: member ? `${member.name} (${member.role})` : name || owned.business_name,
    crmLeadId: owned.crm_lead_id ?? null,
    email: userData.user.email ?? '',
    isStaff: viewAs ? false : await isStaff(db, userData.user.email),
    member,
  };
}

/** The client id a staff session is previewing as, from the x-portal-view-as header. */
export function viewAsId(req: Request): string | null {
  const v = req.headers.get('x-portal-view-as');
  return v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v : null;
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
  // Previewing as a client: every route should see the client, not the staffer.
  if (viewAsId(req)) return null;
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
export async function notifySlack(text: string, channel: 'default' | 'revisions' = 'default'): Promise<void> {
  // Revision notes can go to their own channel (#revisions) so editors see them
  // without the rest of the portal's traffic; until that webhook exists they
  // fall back to the main one.
  const url = (channel === 'revisions' && process.env.REVISIONS_SLACK_WEBHOOK_URL) || process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    reportError('[portal] slack notify failed', err);
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
    if (error) reportError('[portal] crm activity failed', error.message);
  } catch (err) {
    reportError('[portal] crm activity threw', err);
  }
}
