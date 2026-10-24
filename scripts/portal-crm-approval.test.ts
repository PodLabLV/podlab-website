import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allApproved } from '@/lib/portal/crm-approval';

test('every visible script approved or shot → approved', () => {
  assert.equal(allApproved(['approved', 'Approved', 'shot', 'published']), true);
});

test('anything still in review or with changes requested → not yet', () => {
  assert.equal(allApproved(['approved', 'in review']), false);
  assert.equal(allApproved(['approved', 'changes requested']), false);
});

test('drafts are invisible to the client, so they are ignored', () => {
  assert.equal(allApproved(['approved', 'draft', null]), true);
});

test('no visible scripts at all → not approved', () => {
  assert.equal(allApproved([]), false);
  assert.equal(allApproved(['draft', null]), false);
});
