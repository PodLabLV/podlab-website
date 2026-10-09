import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCaller } from '@/lib/portal-server';

const UDAY = { id: 'c-uday', business_name: '101 plus', first_name: 'Uday', last_name: 'Akkaraju', crm_lead_id: null };

// Rows keyed by table; .eq('user_id', x) picks the row whose user_id matches.
function fakeDb(userId: string, email: string, tables: Record<string, Array<Record<string, unknown>>>) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: userId, email } }, error: null }) },
    from: (t: string) => {
      let rows = tables[t] ?? [];
      const q = {
        select: () => q,
        eq: (col: string, v: unknown) => ((rows = rows.filter((r) => r[col] === v)), q),
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      };
      return q;
    },
  } as never;
}

const req = (method = 'GET') => new Request('https://x/api', { method, headers: { authorization: 'Bearer t' } });

test('the owner resolves as themself', async () => {
  const db = fakeDb('u-owner', 'uday@x.com', { portal_clients: [{ ...UDAY, user_id: 'u-owner' }] });
  const c = await resolveCaller(req(), db);
  assert.equal(c?.clientId, 'c-uday');
  assert.equal(c?.displayName, 'Uday Akkaraju');
  assert.equal(c?.member, null);
});

test('a teammate opens the same portal under their own name and role', async () => {
  const db = fakeDb('u-asst', 'jane@x.com', {
    portal_clients: [{ ...UDAY, user_id: 'u-owner' }],
    portal_client_members: [{ user_id: 'u-asst', first_name: 'Jane', last_name: 'Doe', role: 'Assistant', portal_clients: UDAY }],
  });
  const c = await resolveCaller(req('POST'), db);
  assert.equal(c?.clientId, 'c-uday');
  assert.equal(c?.displayName, 'Jane Doe (Assistant)');
  assert.equal(c?.email, 'jane@x.com');
  assert.deepEqual(c?.member, { name: 'Jane Doe', role: 'Assistant' });
});

test('a login that is neither owner nor teammate opens nothing', async () => {
  const db = fakeDb('u-stranger', 's@x.com', { portal_clients: [{ ...UDAY, user_id: 'u-owner' }], portal_client_members: [] });
  assert.equal(await resolveCaller(req(), db), null);
});

test('a removed teammate (or migration not run) opens nothing', async () => {
  const db = fakeDb('u-asst', 'jane@x.com', { portal_clients: [{ ...UDAY, user_id: 'u-owner' }] });
  assert.equal(await resolveCaller(req(), db), null);
});
