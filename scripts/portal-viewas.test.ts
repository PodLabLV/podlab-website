// Staff "view as client" security tests: who may preview, and that previews never write.
//
//   npm run test:viewas

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveCaller, resolveStaff, viewAsId } from '@/lib/portal-server';

const CLIENT = '3f1c2b9e-1111-4a2b-9c3d-123456789abc';
const STAFF_EMAIL = 'info@podlablv.com';

/** Just enough of the Supabase client for resolveCaller/resolveStaff/isStaff. */
function fakeDb(userEmail: string, ownClient: string | null = null): SupabaseClient {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    portal_staff: [{ email: STAFF_EMAIL, name: 'Hiram' }],
    portal_clients: [
      { id: CLIENT, user_id: 'someone-else', business_name: 'Uday Akkaraju - 101 plus', first_name: 'Uday', last_name: null, crm_lead_id: null },
      ...(ownClient ? [{ id: ownClient, user_id: 'u1', business_name: 'Own Co', first_name: 'Own', last_name: null, crm_lead_id: null }] : []),
    ],
  };
  const query = (table: string) => {
    const filters: Array<[string, unknown]> = [];
    const q = {
      select: () => q,
      eq: (col: string, val: unknown) => (filters.push([col, val]), q),
      maybeSingle: async () => ({ data: (tables[table] ?? []).find((r) => filters.every(([c, v]) => r[c] === v)) ?? null, error: null }),
    };
    return q;
  };
  return { auth: { getUser: async () => ({ data: { user: { id: 'u1', email: userEmail } }, error: null }) }, from: query } as unknown as SupabaseClient;
}

const req = (method: string, viewAs?: string) =>
  new Request('https://podlablv.com/api/portal/x', { method, headers: { Authorization: 'Bearer t', ...(viewAs ? { 'x-portal-view-as': viewAs } : {}) } });

test('staff + GET + view-as → answers as that client, not as staff', async () => {
  const c = await resolveCaller(req('GET', CLIENT), fakeDb(STAFF_EMAIL));
  assert.equal(c?.clientId, CLIENT);
  assert.equal(c?.businessName, 'Uday Akkaraju - 101 plus');
  assert.equal(c?.isStaff, false);
});

test('view-as never writes: POST, PATCH and DELETE are refused', async () => {
  for (const m of ['POST', 'PATCH', 'DELETE', 'PUT']) assert.equal(await resolveCaller(req(m, CLIENT), fakeDb(STAFF_EMAIL)), null, m);
});

test('a client login cannot use view-as to read someone else', async () => {
  assert.equal(await resolveCaller(req('GET', CLIENT), fakeDb('client@example.com', 'aaaaaaaa-1111-4a2b-9c3d-123456789abc')), null);
});

test('without the header nothing changes: a client still resolves to their own account', async () => {
  const own = 'aaaaaaaa-1111-4a2b-9c3d-123456789abc';
  assert.equal((await resolveCaller(req('POST'), fakeDb('client@example.com', own)))?.clientId, own);
});

test('in view-as, staff routes see no staffer', async () => {
  assert.equal(await resolveStaff(req('GET', CLIENT), fakeDb(STAFF_EMAIL)), null);
  assert.equal((await resolveStaff(req('GET'), fakeDb(STAFF_EMAIL)))?.email, STAFF_EMAIL);
});

test('view-as header must be a real id', () => {
  assert.equal(viewAsId(req('GET', 'not-an-id')), null);
  assert.equal(viewAsId(req('GET', `${CLIENT}' or 1=1`)), null);
  assert.equal(viewAsId(req('GET', CLIENT)), CLIENT);
});

test('browser reads go through the proxy even when the env URL has a stray newline or slash', async () => {
  const { viewAsSupabaseFetch } = await import('@/lib/portal/view-as');
  const seen: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seen.push(String(input));
    return new Response('[]');
  }) as typeof fetch;
  try {
    for (const env of ['https://abc.supabase.co', 'https://abc.supabase.co\n', 'https://abc.supabase.co/']) {
      seen.length = 0;
      const f = viewAsSupabaseFetch(env, '11111111-1111-1111-1111-111111111111');
      await f('https://abc.supabase.co/rest/v1/portal_clients?select=*&limit=1', { headers: { authorization: 'Bearer t' } });
      assert.equal(seen[0], '/api/portal/view-as/rest?t=portal_clients&q=select%3D*%26limit%3D1', JSON.stringify(env));
    }
    // Writes never leave the browser; auth calls pass straight through.
    const f = viewAsSupabaseFetch('https://abc.supabase.co', '11111111-1111-1111-1111-111111111111');
    assert.equal((await f('https://abc.supabase.co/rest/v1/portal_clients', { method: 'PATCH' })).status, 403);
    seen.length = 0;
    await f('https://abc.supabase.co/auth/v1/user');
    assert.equal(seen[0], 'https://abc.supabase.co/auth/v1/user');
  } finally {
    globalThis.fetch = realFetch;
  }
});
