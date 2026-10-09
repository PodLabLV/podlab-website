import test from 'node:test';
import assert from 'node:assert/strict';
import { cardVisible, cardsInScope, scopeBoardIds, type CardScope } from '@/lib/production-server';

type Row = { id: string; board_id: string; archived?: boolean };

// Just enough of supabase-js for cardsInScope: schema().from().select().in().eq()...order().
function fakeDb(rows: Row[]) {
  const query = () => {
    let out = rows;
    const q = {
      select: () => q,
      in: (col: keyof Row, vals: string[]) => ((out = out.filter((r) => vals.includes(r[col] as string))), q),
      eq: (col: string, v: unknown) => ((out = out.filter((r) => (col === 'archived' ? Boolean(r.archived) === v : true))), q),
      order: () => Promise.resolve({ data: out, error: null }),
    };
    return q;
  };
  return { schema: () => ({ from: query }) } as never;
}

const scope: CardScope = { boardIds: ['b1'], sharedIds: ['c3', 'c1'] };

test('a card is visible on a linked board or when shared one by one', () => {
  assert.equal(cardVisible(scope, { id: 'cx', board_id: 'b1' }), true);
  assert.equal(cardVisible(scope, { id: 'c3', board_id: 'dfr' }), true);
  assert.equal(cardVisible(scope, { id: 'c4', board_id: 'dfr' }), false);
});

test('cardsInScope merges boards and shared ids, once each, skipping archived', async () => {
  const db = fakeDb([
    { id: 'c1', board_id: 'b1' },
    { id: 'c2', board_id: 'b1' },
    { id: 'c3', board_id: 'dfr' },
    { id: 'c4', board_id: 'dfr' },
    { id: 'c5', board_id: 'b1', archived: true },
  ]);
  const { data, error } = await cardsInScope<Row>(db, scope, 'id, board_id');
  assert.equal(error, null);
  assert.deepEqual(data.map((c) => c.id).sort(), ['c1', 'c2', 'c3']);
  assert.deepEqual(scopeBoardIds(scope, data).sort(), ['b1', 'dfr']);
});

test('an empty scope reads nothing', async () => {
  const { data } = await cardsInScope<Row>(fakeDb([{ id: 'c1', board_id: 'b1' }]), { boardIds: [], sharedIds: [] }, 'id, board_id');
  assert.deepEqual(data, []);
});
