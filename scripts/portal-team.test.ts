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

test('Beaker referrals: the owner only, under their portal email and their own login', async () => {
  const { beakerEmails } = await import('@/lib/portal/beaker');
  const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { email: 'Uday@Bond.ai' } }) }) }) }) } as never;
  const owner = { clientId: 'c', businessName: 'b', displayName: 'Uday', crmLeadId: null, email: 'uday@bond.ai', isStaff: false, member: null };
  assert.deepEqual(await beakerEmails(db, owner, false), ['uday@bond.ai']);
  assert.deepEqual(await beakerEmails(db, { ...owner, email: 'other@x.com' }, false), ['uday@bond.ai', 'other@x.com']);
  // Staff previewing: never the staffer's own email.
  assert.deepEqual(await beakerEmails(db, { ...owner, email: 'info@podlablv.com' }, true), ['uday@bond.ai']);
  // A teammate's login is not the Beaker.
  assert.deepEqual(await beakerEmails(db, { ...owner, member: { name: 'Jane', role: 'Assistant' } }, false), []);
});
