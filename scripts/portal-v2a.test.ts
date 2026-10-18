import test from 'node:test';
import assert from 'node:assert/strict';
import { notify, resolve, safeLink } from '@/lib/portal/notify';
import { summarizeInvoices, boardStageIndex, boardStageLabel, type DashboardInvoice } from '@/lib/portal/dashboard';
import { activeTab } from '@/lib/portal/tabs';
import { beakerLink } from '@/lib/beaker-ref';

const CLIENT = '11111111-2222-3333-4444-555555555555';

/** Records what notify()/resolve() send to PostgREST. */
function fakeDb() {
  const calls: Array<{ op: string; row?: Record<string, unknown>; opts?: unknown; filters: Array<[string, unknown]> }> = [];
  const db = {
    from: () => {
      const call: (typeof calls)[number] = { op: '', filters: [] };
      calls.push(call);
      const q = {
        upsert: async (row: Record<string, unknown>, opts: unknown) => ((call.op = 'upsert'), (call.row = row), (call.opts = opts), { error: null }),
        insert: async (row: Record<string, unknown>) => ((call.op = 'insert'), (call.row = row), { error: null }),
        update: (row: Record<string, unknown>) => ((call.op = 'update'), (call.row = row), q),
        eq: (c: string, v: unknown) => (call.filters.push([c, v]), q),
        is: (c: string, v: unknown) => (call.filters.push([c, v]), q),
        select: async () => ({ data: [{ id: 'x' }], error: null }),
      };
      return q;
    },
  };
  return { db: db as never, calls };
}

test('notify upserts on (client_id, ref) and only sends content columns', async () => {
  const { db, calls } = fakeDb();
  const ok = await notify(CLIENT, { kind: 'review_ready', direction: 'waiting', title: '  Approve   your script ', link: '/portal/projects?item=1', ref: 'script:1:v2' }, db);
  assert.equal(ok, true);
  assert.equal(calls[0].op, 'upsert');
  assert.deepEqual(calls[0].opts, { onConflict: 'client_id,ref' });
  assert.equal(calls[0].row?.title, 'Approve your script');
  // read_at / resolved_at are never sent, so a retry can't re-open or re-alert.
  assert.ok(!('read_at' in (calls[0].row ?? {})));
  assert.ok(!('resolved_at' in (calls[0].row ?? {})));
});

test('notify without a ref inserts; bad input writes nothing', async () => {
  const { db, calls } = fakeDb();
  assert.equal(await notify(CLIENT, { kind: 'delivered', direction: 'done', title: 'Your VSL is live' }, db), true);
  assert.equal(calls[0].op, 'insert');
  assert.equal(await notify('not-a-uuid', { kind: 'x', direction: 'done', title: 'y' }, db), false);
  assert.equal(await notify(CLIENT, { kind: 'x', direction: 'done', title: '   ' }, db), false);
  assert.equal(await notify(CLIENT, { kind: 'x', direction: 'maybe' as 'done', title: 'y' }, db), false);
  assert.equal(calls.length, 1);
});

test('resolve closes only the open row with that ref', async () => {
  const { db, calls } = fakeDb();
  assert.equal(await resolve(CLIENT, 'script:1:v2', db), true);
  assert.equal(calls[0].op, 'update');
  assert.ok(calls[0].row?.resolved_at);
  assert.deepEqual(calls[0].filters, [['client_id', CLIENT], ['ref', 'script:1:v2'], ['resolved_at', null]]);
});

test('links: portal paths and https only', () => {
  assert.equal(safeLink('/portal/projects?item=1'), '/portal/projects?item=1');
  assert.equal(safeLink('https://drive.google.com/x'), 'https://drive.google.com/x');
  assert.equal(safeLink('javascript:alert(1)'), null);
  assert.equal(safeLink('//evil.com'), null);
  assert.equal(safeLink('http://plain.com'), null);
  assert.equal(safeLink(''), null);
});

test('invoice summary: paid, open, next due (overdue first), void ignored', () => {
  const inv = (id: string, status: string, cents: number, dueOn: string | null): DashboardInvoice => ({
    id, invoiceNo: null, description: null, amountCents: cents, status, issuedOn: null, dueOn, paidAt: null, payUrl: null, receiptUrl: null,
  });
  const s = summarizeInvoices([inv('a', 'Paid', 100000, '2026-09-01'), inv('b', 'Open', 50000, '2026-11-01'), inv('c', 'Overdue', 25000, '2026-10-01'), inv('d', 'Void', 999, null)]);
  assert.equal(s.paidCents, 100000);
  assert.equal(s.openCents, 75000);
  assert.equal(s.openCount, 2);
  assert.equal(s.next?.id, 'c');
  assert.equal(summarizeInvoices([inv('a', 'Paid', 1, null)]).next, null);
});

test('board stages follow the CRM ladder', () => {
  assert.equal(boardStageIndex('raw'), 0);
  assert.equal(boardStageIndex('delivered'), 6);
  assert.equal(boardStageIndex(null), -1);
  assert.equal(boardStageLabel('client_review'), 'Ready for your review');
  assert.equal(boardStageLabel(null), 'Getting started');
});

test('tabs: old routes light up the tab they now live under', () => {
  assert.equal(activeTab('/portal'), '/portal');
  assert.equal(activeTab('/portal/invoices'), '/portal');
  assert.equal(activeTab('/portal/scripts/abc'), '/portal/projects');
  assert.equal(activeTab('/portal/production'), '/portal/projects');
  assert.equal(activeTab('/portal/brand'), '/portal/assets');
  assert.equal(activeTab('/portal/tiptop'), '/portal/tiptop');
  assert.equal(activeTab('/portal/profile'), null);
});

test('beaker link carries the ref podlablv.com middleware reads', () => {
  assert.equal(beakerLink('Jane-Doe'), 'https://podlablv.com/?ref=jane-doe');
  assert.equal(beakerLink('bad id!'), null);
});
