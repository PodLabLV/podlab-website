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

test('game plan pace: progress vs clock', async () => {
  const { paceStatus, progress, checkInDue } = await import('@/lib/portal/game-plan');
  const start = '2026-10-01T00:00:00Z';
  const due = '2026-12-29'; // ~90 days
  const at = (d: string) => Date.parse(d);
  const plan = (current: number | null) => ({ baseline: 0, target: 4, current, createdAt: start, dueOn: due });
  assert.equal(progress(plan(2)), 0.5);
  assert.equal(paceStatus(plan(4), at('2026-10-20T00:00:00Z')), 'done');
  // ~45% of the clock gone
  assert.equal(paceStatus(plan(2), at('2026-11-10T00:00:00Z')), 'on track');
  assert.equal(paceStatus(plan(1), at('2026-11-10T00:00:00Z')), 'at risk');
  assert.equal(paceStatus(plan(0), at('2026-11-10T00:00:00Z')), 'off track');
  // no number yet: fine early, at risk after a third of the clock
  assert.equal(paceStatus(plan(null), at('2026-10-10T00:00:00Z')), 'on track');
  assert.equal(paceStatus(plan(null), at('2026-11-15T00:00:00Z')), 'at risk');
  // shrinking targets work too (cost down from 10 to 6)
  assert.equal(progress({ baseline: 10, target: 6, current: 8 }), 0.5);
  // weekly check-in
  assert.ok(!checkInDue({ lastCheckInAt: '2026-10-05T00:00:00Z', createdAt: start, status: 'on track' }, at('2026-10-10T00:00:00Z')));
  assert.ok(checkInDue({ lastCheckInAt: '2026-10-05T00:00:00Z', createdAt: start, status: 'on track' }, at('2026-10-12T01:00:00Z')));
  assert.ok(!checkInDue({ lastCheckInAt: null, createdAt: start, status: 'done' }, at('2026-12-01T00:00:00Z')));
});

test('set_game_plan input: a number-shaped outcome, 1–5 priorities, coaching', async () => {
  const { setGamePlanInput } = await import('@/lib/tiptop/schema');
  const ok = { pillar: 'Sales', outcome: '4 more cohort seats by Nov 30', metric: 'seats sold', baseline: 0, target: 4, due_on: '2026-11-30', priorities: ['Offer page', 'Warm list', 'Follow-up'], coaching: 'x'.repeat(70) };
  assert.ok(setGamePlanInput.safeParse(ok).success);
  assert.ok(!setGamePlanInput.safeParse({ ...ok, priorities: [] }).success);
  assert.ok(!setGamePlanInput.safeParse({ ...ok, coaching: 'short' }).success);
  assert.ok(!setGamePlanInput.safeParse({ ...ok, pillar: 'Finance' }).success);
});

test('content plan: weeks start Monday, scripts flagged 5 days out, job mix', async () => {
  const { weekOf, groupByWeek, needsScript, jobMix } = await import('@/lib/portal/content-plan');
  assert.equal(weekOf('2026-10-14'), '2026-10-12'); // Wednesday → Monday
  assert.equal(weekOf('2026-10-18'), '2026-10-12'); // Sunday → same week
  assert.equal(weekOf('2026-10-19'), '2026-10-19');
  const base = { id: 'x', pillar: 'P', format: 'short' as const, title: 'T', hook: null, cta: null, scriptId: null, crmCardId: null, notes: null, updatedAt: '2026-10-01T00:00:00Z' };
  const items = [
    { ...base, id: 'a', publishOn: '2026-10-20', job: 'attract' as const, status: 'planned' as const },
    { ...base, id: 'b', publishOn: '2026-10-13', job: 'convert' as const, status: 'planned' as const },
    { ...base, id: 'c', publishOn: '2026-10-14', job: 'educate' as const, status: 'scripted' as const },
    { ...base, id: 'd', publishOn: '2026-10-15', job: 'attract' as const, status: 'skipped' as const },
  ];
  assert.deepEqual(groupByWeek(items).map((w) => [w.week, w.items.map((i) => i.id).join('')]), [['2026-10-12', 'bcd'], ['2026-10-19', 'a']]);
  const now = Date.parse('2026-10-10T12:00:00Z');
  assert.ok(needsScript(items[1], now), 'planned, 3 days out');
  assert.ok(!needsScript(items[0], now), '10 days out');
  assert.ok(!needsScript(items[2], now), 'already scripted');
  assert.deepEqual(jobMix(items), { attract: 1, educate: 1, convert: 1, retain: 0 });
});

test('plan_content input guards', async () => {
  const { planContentInput, updateContentInput } = await import('@/lib/tiptop/schema');
  const piece = { publish_on: '2026-10-20', pillar: 'The whole picture', format: 'short', title: 'Stuck vs scattered', job: 'attract' };
  assert.ok(planContentInput.safeParse({ coaching: 'x'.repeat(70), items: [piece] }).success);
  assert.ok(!planContentInput.safeParse({ coaching: 'x'.repeat(70), items: [{ ...piece, format: 'tiktok' }] }).success);
  assert.ok(!planContentInput.safeParse({ coaching: 'x'.repeat(70), items: Array(25).fill(piece) }).success, 'max 24');
  assert.ok(!updateContentInput.safeParse({ changes: [{ id: '3f1c2b9e-1111-4a2b-9c3d-123456789abc', status: 'in edit' }] }).success, 'in edit is system-set');
});
