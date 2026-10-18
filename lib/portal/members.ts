import type { SupabaseClient } from '@supabase/supabase-js';
import { reportError } from '@/lib/alerts';
import { createAccessLink, sendAccessEmail } from '@/lib/portal-invite';
import { recordActivity } from '@/lib/portal/server';

/**
 * Team logins (portal_client_members): one code path for staff (Manage →
 * Team access, /api/portal/admin/members) and the account owner (Profile →
 * Team, /api/portal/team). A login opens exactly one portal, owner or member.
 */

export const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MEMBERS_MISSING = 'Run migration 20261017 first.';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  invitedAt: string | null;
  access: 'active' | 'invited';
}

export async function listMembers(db: SupabaseClient, clientId: string): Promise<TeamMember[] | null> {
  const { data, error } = await db.from('portal_client_members').select('*').eq('client_id', clientId).order('created_at');
  if (error) return null;
  return Promise.all(
    (data ?? []).map(async (m) => {
      const { data: u } = await db.auth.admin.getUserById(m.user_id);
      return {
        id: m.id,
        email: m.email,
        name: [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email,
        role: m.role,
        invitedAt: m.invited_at,
        access: u?.user?.last_sign_in_at ? ('active' as const) : ('invited' as const),
      };
    }),
  );
}

export async function removeMember(db: SupabaseClient, clientId: string, memberId: string): Promise<{ ok: true; email: string | null } | { ok: false; error: string }> {
  const { data: gone, error } = await db.from('portal_client_members').delete().eq('id', memberId).eq('client_id', clientId).select('email').maybeSingle();
  if (error) return { ok: false, error: 'Could not remove that.' };
  // Their login stays, but opens nothing now; any open session loses access on its next request.
  return { ok: true, email: gone?.email ?? null };
}

export interface InviteInput {
  clientId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  /** Who sent it: a staff email, or "<owner name> (owner)". */
  invitedBy: string;
}

export type InviteResult =
  | { ok: true; emailed: boolean; kind: string; link: string; email: string }
  | { ok: false; status: number; error: string };

/** Invite a teammate, or re-send their link when they're already on this client. */
export async function inviteMember(db: SupabaseClient, p: InviteInput): Promise<InviteResult> {
  const email = (p.email ?? '').trim().toLowerCase();
  const firstName = (p.firstName ?? '').trim().slice(0, 60);
  const lastName = (p.lastName ?? '').trim().slice(0, 60);
  const role = (p.role ?? '').trim().slice(0, 40) || 'Assistant';
  if (!EMAIL_OK.test(email)) return { ok: false, status: 400, error: 'Enter a real email address.' };
  if (!firstName) return { ok: false, status: 400, error: 'First name required: it labels their notes.' };

  const { data: client } = await db.from('portal_clients').select('id, business_name, email').eq('id', p.clientId).maybeSingle();
  if (!client) return { ok: false, status: 404, error: 'Client not found' };
  if ((client.email ?? '').toLowerCase() === email) return { ok: false, status: 409, error: 'That is the account owner’s email.' };

  // A PodLab team login is never a client's teammate (it would open their portal as them).
  const { data: staff } = await db.from('portal_staff').select('email').eq('email', email).maybeSingle();
  if (staff || email.endsWith('@podlablv.com')) return { ok: false, status: 409, error: 'That is a PodLab team address. Invite someone from your business.' };

  const { data: existing } = await db.from('portal_client_members').select('id, user_id, client_id').eq('email', email).maybeSingle();
  if (existing && existing.client_id !== client.id) return { ok: false, status: 409, error: 'That email is already a teammate on another PodLab account.' };

  const link = await createAccessLink(db, { email, firstName, lastName, forceRecovery: Boolean(existing) });
  if (!link) return { ok: false, status: 500, error: 'Could not create the sign-in link.' };

  // One login, one portal: refuse a login that already owns a client.
  const { data: owner } = await db.from('portal_clients').select('business_name').eq('user_id', link.userId).maybeSingle();
  if (owner) return { ok: false, status: 409, error: `That login already opens ${owner.business_name}'s portal.` };

  const row = { client_id: client.id, user_id: link.userId, email, first_name: firstName, last_name: lastName || null, role, invited_at: new Date().toISOString(), invited_by: p.invitedBy };
  const { error } = await db.from('portal_client_members').upsert(row, { onConflict: 'user_id' });
  if (error) {
    reportError('[portal] member invite failed', error.message);
    return { ok: false, status: 500, error: /portal_client_members/.test(error.message) ? MEMBERS_MISSING : 'Could not save the invite.' };
  }
  if (!existing) await recordActivity(db, client.id, 'update', `${firstName} (${role}) now has access to this portal`);

  const emailed = await sendAccessEmail(link.kind, email, link.url, firstName, client.business_name);
  return { ok: true, emailed, kind: link.kind, link: link.url, email };
}
