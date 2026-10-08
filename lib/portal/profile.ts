import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitize } from '@/lib/sanitize';

/**
 * Client profile: the fields a client may change about themselves.
 *
 * Validation is pure (validateProfilePatch) so the /api/portal/profile route,
 * the /portal/profile page and TipTop's update_profile tool share one rule set.
 * The login email is deliberately not here: changing it moves the account, and
 * that goes through info@.
 *
 * phone, website and timezone arrive with the 20261009 migration. Before it
 * runs, saveProfile stores what it can and reports the rest as `pending`.
 */

export const PROFILE_FIELDS = ['first_name', 'last_name', 'phone', 'business_name', 'website', 'timezone'] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type ProfilePatch = Partial<Record<ProfileField, string | null>>;

/** Columns that exist on every portal_clients row since the first migration. */
const CORE: ProfileField[] = ['first_name', 'last_name', 'business_name'];

export const FIELD_LABELS: Record<ProfileField, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone',
  business_name: 'Business name',
  website: 'Website',
  timezone: 'Timezone',
};

export interface ClientProfile {
  email: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string;
  phone: string | null;
  website: string | null;
  timezone: string | null;
  /** False until the migration adds phone / website / timezone. */
  extendedReady: boolean;
}

function isTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(tz) || tz === 'UTC';
  } catch {
    return false;
  }
}

/** "(702) 555-0101" → "+17025550101"; other countries keep their + form. */
export function normalizePhone(raw: string): string | null {
  const s = raw.trim();
  if (s.startsWith('+')) {
    const d = s.slice(1).replace(/\D/g, '');
    return /^[1-9]\d{7,14}$/.test(d) ? `+${d}` : null;
  }
  const d = s.replace(/\D/g, '');
  if (d.length === 10 && /^[2-9]\d{2}[2-9]\d{6}$/.test(d)) return `+1${d}`;
  if (d.length === 11 && /^1[2-9]\d{2}[2-9]\d{6}$/.test(d)) return `+${d}`;
  return null;
}

/** "acme.com" → "https://acme.com"; anything that isn't a plain http(s) site is refused. */
export function normalizeWebsite(raw: string): string | null {
  let s = raw.trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname)) return null;
    if (u.username || u.password) return null;
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export type PatchCheck =
  | { ok: true; patch: Record<string, string | null> }
  | { ok: false; errors: Partial<Record<ProfileField | 'email', string>> };

/** Accepts only known fields, cleans each one, and says exactly what's wrong. */
export function validateProfilePatch(raw: unknown): PatchCheck {
  if (!raw || typeof raw !== 'object') return { ok: false, errors: { first_name: 'Nothing to update.' } };
  const r = raw as Record<string, unknown>;
  const errors: Partial<Record<ProfileField | 'email', string>> = {};
  const patch: Record<string, string | null> = {};

  if ('email' in r && r.email !== undefined) {
    errors.email = 'Your login email can only be changed by the team. Email info@podlablv.com.';
  }

  for (const f of PROFILE_FIELDS) {
    if (!(f in r) || r[f] === undefined) continue;
    const v = r[f];
    if (v !== null && typeof v !== 'string') {
      errors[f] = 'Must be text.';
      continue;
    }
    const text = v === null ? '' : sanitize(v).replace(/\s+/g, ' ').trim();

    switch (f) {
      case 'first_name':
      case 'last_name':
        if (text.length > 80) errors[f] = 'Keep it under 80 characters.';
        else if (f === 'first_name' && !text) errors[f] = 'First name cannot be empty.';
        else patch[f] = text || null;
        break;
      case 'business_name':
        if (!text) errors[f] = 'Business name cannot be empty.';
        else if (text.length > 200) errors[f] = 'Keep it under 200 characters.';
        else patch[f] = text;
        break;
      case 'phone':
        if (!text) patch[f] = null;
        else {
          const p = normalizePhone(text);
          if (p) patch[f] = p;
          else errors[f] = 'That does not look like a phone number. Use a 10-digit US number or +country code.';
        }
        break;
      case 'website':
        if (!text) patch[f] = null;
        else {
          const w = text.length <= 300 ? normalizeWebsite(text) : null;
          if (w) patch[f] = w;
          else errors[f] = 'That does not look like a website address.';
        }
        break;
      case 'timezone':
        if (!text) patch[f] = null;
        else if (isTimezone(text)) patch[f] = text;
        else errors[f] = 'Use a timezone name like America/Los_Angeles.';
        break;
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  if (Object.keys(patch).length === 0) return { ok: false, errors: { first_name: 'Nothing to update.' } };
  return { ok: true, patch };
}

function columnMissing(err: { code?: string; message?: string } | null): boolean {
  return Boolean(err && (err.code === 'PGRST204' || err.code === '42703' || /column .* does not exist|schema cache/i.test(err.message ?? '')));
}

export async function loadProfile(db: SupabaseClient, clientId: string): Promise<ClientProfile | null> {
  // select('*') so the read works before and after the migration.
  const { data, error } = await db.from('portal_clients').select('*').eq('id', clientId).maybeSingle();
  if (error || !data) return null;
  return {
    email: data.email,
    first_name: data.first_name ?? null,
    last_name: data.last_name ?? null,
    business_name: data.business_name,
    phone: data.phone ?? null,
    website: data.website ?? null,
    timezone: data.timezone ?? null,
    extendedReady: 'phone' in data && 'website' in data && 'timezone' in data,
  };
}

export type SaveProfileResult =
  | { ok: true; saved: ProfileField[]; pending: ProfileField[]; before: Partial<Record<ProfileField, string | null>> }
  | { ok: false; message: string };

/**
 * Save a validated patch. Only fields that actually change are written. If the
 * extended columns are missing, the core ones still save and the rest come back
 * as `pending` (the caller tells the team, so nothing the client said is lost).
 */
export async function saveProfile(
  db: SupabaseClient,
  clientId: string,
  patch: Record<string, string | null>,
): Promise<SaveProfileResult> {
  const current = await loadProfile(db, clientId);
  if (!current) return { ok: false, message: 'Could not find your profile.' };

  const changed: Record<string, string | null> = {};
  const before: Partial<Record<ProfileField, string | null>> = {};
  for (const [k, v] of Object.entries(patch)) {
    const f = k as ProfileField;
    if ((current[f] ?? null) !== v) {
      changed[f] = v;
      before[f] = current[f] ?? null;
    }
  }
  if (Object.keys(changed).length === 0) return { ok: true, saved: [], pending: [], before };

  let pending: ProfileField[] = [];
  let { error } = await db.from('portal_clients').update(changed).eq('id', clientId);
  if (columnMissing(error)) {
    const core = Object.fromEntries(Object.entries(changed).filter(([k]) => CORE.includes(k as ProfileField)));
    pending = Object.keys(changed).filter((k) => !CORE.includes(k as ProfileField)) as ProfileField[];
    error = Object.keys(core).length ? (await db.from('portal_clients').update(core).eq('id', clientId)).error : null;
  }
  if (error) {
    console.error('[portal] profile update failed', error.message);
    return { ok: false, message: 'Could not save that.' };
  }

  // The portal header reads the name from auth metadata; keep it in step.
  const { data: owner } = await db.from('portal_clients').select('user_id').eq('id', clientId).maybeSingle();
  const userId: string | null = owner?.user_id ?? null;
  if (userId && ('first_name' in changed || 'last_name' in changed)) {
    const { data: u } = await db.auth.admin.getUserById(userId);
    const meta = { ...(u?.user?.user_metadata ?? {}) };
    if ('first_name' in changed) meta.first_name = changed.first_name ?? '';
    if ('last_name' in changed) meta.last_name = changed.last_name ?? '';
    const { error: metaErr } = await db.auth.admin.updateUserById(userId, { user_metadata: meta });
    if (metaErr) console.error('[portal] profile metadata sync failed', metaErr.message);
  }

  const saved = Object.keys(changed).filter((k) => !pending.includes(k as ProfileField)) as ProfileField[];
  return { ok: true, saved, pending, before };
}

/** "Phone: (none) → +17025550101" lines for Slack / the CRM timeline. */
export function describeChange(
  patch: Record<string, string | null>,
  before: Partial<Record<ProfileField, string | null>>,
  fields: ProfileField[],
): string {
  return fields.map((f) => `${FIELD_LABELS[f]}: ${before[f] || '(none)'} → ${patch[f] || '(none)'}`).join('\n');
}
