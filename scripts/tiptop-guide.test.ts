// TipTop business-guide unit tests: the write inputs' guard rails and helpers.
//
//   npm run test:guide

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createActionItemsInput, draftScriptInput, saveIntakeAnswersInput, updateBrandKitInput, WRITE_TOOLS } from '@/lib/tiptop/schema';
import { dueLabel } from '@/lib/tiptop/guide';

const ID = '3f1c2b9e-1111-4a2b-9c3d-123456789abc';

test('every guide write is a confirm-card write', () => {
  for (const t of ['save_intake_answers', 'update_brand_kit', 'create_action_items', 'draft_script']) {
    assert.ok((WRITE_TOOLS as readonly string[]).includes(t), t);
  }
});

test('game plan: coaching is required and dates must be real dates', () => {
  const item = { title: 'Write the one-page cohort offer', detail: '', effort: '1 hour', due: '2026-10-12' };
  assert.ok(createActionItemsInput.safeParse({ pillar: 'Sales', coaching: 'Goal: 4 seats by Nov 30. 4 seats ≈ 12 calls ≈ 40 invites. Offer first, then the list.', items: [item] }).success);
  assert.ok(!createActionItemsInput.safeParse({ pillar: 'Sales', items: [item] }).success, 'no coaching');
  assert.ok(!createActionItemsInput.safeParse({ pillar: 'Sales', coaching: 'too short', items: [item] }).success, 'thin coaching');
  assert.ok(!createActionItemsInput.safeParse({ pillar: 'Sales', coaching: 'x'.repeat(80), items: [{ ...item, due: 'next friday' }] }).success, 'bad date');
  assert.ok(!createActionItemsInput.safeParse({ pillar: 'Vibes', coaching: 'x'.repeat(80), items: [item] }).success, 'unknown pillar');
  assert.ok(!createActionItemsInput.safeParse({ pillar: 'Sales', coaching: 'x'.repeat(80), items: Array(9).fill(item) }).success, 'max 8');
});

test('intake answers: ids only, batches of up to 12, submit defaults off', () => {
  const ok = saveIntakeAnswersInput.safeParse({ answers: [{ item_id: ID, value: 'Lead with me.' }] });
  assert.ok(ok.success && ok.data.submit === false);
  assert.ok(!saveIntakeAnswersInput.safeParse({ answers: [{ item_id: 'q1', value: 'x' }] }).success, 'not an id');
  assert.ok(!saveIntakeAnswersInput.safeParse({ answers: Array(13).fill({ item_id: ID, value: 'x' }) }).success, 'max 12');
});

test('script drafts: a real body and a known kind', () => {
  assert.ok(draftScriptInput.safeParse({ title: 'Hook: Stuck vs. Scattered', kind: 'short', body: "You're not stuck.\nYou're scattered.\nAnd those need different fixes." }).success);
  assert.ok(!draftScriptInput.safeParse({ title: 'Hook', kind: 'short', body: 'too short' }).success);
  assert.ok(!draftScriptInput.safeParse({ title: 'Hook', kind: 'podcast', body: 'x'.repeat(60) }).success);
});

test('brand kit: merge by default', () => {
  const r = updateBrandKitInput.safeParse({ colors: [{ hex: '#2ADD1B' }] });
  assert.ok(r.success && r.data.mode === 'merge' && r.data.colors?.[0].name === '');
});

test('dueLabel', () => {
  assert.equal(dueLabel('2026-10-12'), 'due Oct 12');
  assert.equal(dueLabel(undefined), '');
  assert.equal(dueLabel('nope'), '');
});
