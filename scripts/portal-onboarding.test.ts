import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRAND_QUESTIONS,
  INTAKE_QUESTIONS,
  fitAnswer,
  isShown,
  missingRequired,
  normalizeRevenue,
  prefillFromLead,
  toSkillFields,
} from '@/lib/portal/onboarding-questions';
import { cleanAnswers } from '@/lib/portal/onboarding-server';
import { libraryFor, mergeKit } from '@/lib/portal/on-approved';

const q = (id: string) => INTAKE_QUESTIONS.find((x) => x.id === id)!;

test('question ids are unique and every question feeds something', () => {
  const ids = [...INTAKE_QUESTIONS, ...BRAND_QUESTIONS].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const x of [...INTAKE_QUESTIONS, ...BRAND_QUESTIONS]) assert.ok(x.feeds.length, x.id);
});

test('revenue normalizes to the pathway buckets, and refuses to guess "under $1M"', () => {
  assert.equal(normalizeRevenue('$350k'), '$250K–$1M');
  assert.equal(normalizeRevenue('1.2M'), '$1M–$3M');
  assert.equal(normalizeRevenue('250-500K'), '$250K–$1M');
  assert.equal(normalizeRevenue('$8,500,000'), '$8M+');
  assert.equal(normalizeRevenue('Under $1M'), null);
  assert.equal(normalizeRevenue('under 200k'), 'Under $250K');
  assert.equal(normalizeRevenue('pre-revenue'), 'Pre-revenue');
  assert.equal(normalizeRevenue('a lot'), null);
});

test('prefill reads crm.leads columns first, then raw_responses, and fits choices', () => {
  const lead = {
    website: 'acme.com',
    annual_revenue: '$400k',
    years_in_business: '7',
    core_offer: 'Done-for-you bookkeeping',
    offer_price: '',
    raw_responses: { dreamClient: 'Dentists', customerChannels: ['Instagram', 'nonsense'], brandAdjectives: 'Direct, Warm' },
  };
  const a = prefillFromLead(lead, INTAKE_QUESTIONS);
  assert.equal(a.website, 'acme.com');
  assert.equal(a.annual_revenue, '$250K–$1M');
  assert.equal(a.years_in_business, '3–10 years');
  assert.equal(a.core_offer, 'Done-for-you bookkeeping');
  assert.equal(a.offer_price, undefined, 'empty values never prefill');
  assert.deepEqual(a.customer_channels, ['Instagram']);
  assert.deepEqual(a.brand_adjectives, ['Direct', 'Warm']);
  assert.equal(fitAnswer(q('brand_tone'), 'Something else'), null);
});

test('conditional questions only count when shown', () => {
  const mvv = q('mvv_files');
  assert.equal(isShown(mvv, { has_mvv: 'No' }), false);
  assert.equal(isShown(mvv, { has_mvv: 'Yes, written down' }), true);
  assert.equal(isShown(q('materials_files'), { materials: ['None yet'] }), false);
  assert.equal(isShown(q('materials_files'), { materials: ['Pitch or sales deck'] }), true);
  const missing = missingRequired(INTAKE_QUESTIONS, {}).map((x) => x.id);
  assert.ok(missing.includes('mechanism'));
  assert.ok(!missing.includes('mvv_files'));
});

test('cleanAnswers drops unknown ids, bad choices, over-max multis and non-https files', () => {
  const out = cleanAnswers(INTAKE_QUESTIONS, {
    nope: 'x',
    brand_tone: 'Not an option',
    years_in_business: '1–3 years',
    brand_adjectives: ['Direct', 'Warm', 'Bold', 'Calm', 'Expert', 'Witty', 'Made up'],
    mvv_files: ['values.pdf::https://drive.google.com/file/d/abc/view', 'evil::javascript:alert(1)', 'plain text'],
    top_3_goals: 'x'.repeat(5000),
  });
  assert.equal(out.nope, undefined);
  assert.equal(out.brand_tone, undefined);
  assert.equal(out.years_in_business, '1–3 years');
  assert.deepEqual(out.brand_adjectives, ['Direct', 'Warm', 'Bold', 'Calm', 'Expert']);
  assert.deepEqual(out.mvv_files, ['values.pdf::https://drive.google.com/file/d/abc/view']);
  assert.equal((out.top_3_goals as string).length, 4000);
});

test('skill fields use the assetslab schema names and skip hidden questions', () => {
  const f = toSkillFields(INTAKE_QUESTIONS, {
    core_offer: 'Repipes',
    proof: 'Saved the Smiths $40K',
    has_mvv: 'No',
    mvv_files: ['v.pdf::https://drive.google.com/file/d/abc/view'],
    customer_channels: ['Google search', 'Referrals'],
  });
  assert.equal(f.core_offer_description, 'Repipes');
  assert.equal(f.best_client_feedback, 'Saved the Smiths $40K');
  assert.equal(f.customer_channels, 'Google search, Referrals');
  assert.equal(f.mvv_upload, undefined);
});

test('approved brand kit merges into the client kit without clobbering it', () => {
  const merged = mergeKit(
    { colors: [{ hex: '#000000', name: 'Their black' }], fonts: [{ name: 'Inter', use: 'Body' }] },
    { colors: [{ hex: '#000000', name: 'Dup' }, { hex: '#2add1b', name: 'Green' }, { hex: 'green', name: 'Bad' }], fonts: [{ name: 'inter', use: 'x' }, { name: 'Michroma', use: 'Headings' }] },
  );
  assert.deepEqual(merged.colors, [{ hex: '#000000', name: 'Their black' }, { hex: '#2ADD1B', name: 'Green' }]);
  assert.deepEqual(merged.fonts.map((f) => f.name), ['Inter', 'Michroma']);
});

test('approved items are filed in the right library section', () => {
  const base = { id: 'a', client_id: 'c', title: 't' };
  assert.equal(libraryFor({ ...base, file_type: 'PDF' }, 'brand_kit'), 'branding');
  assert.equal(libraryFor({ ...base, file_type: 'PDF' }, 'assetslab'), 'docs');
  assert.equal(libraryFor({ ...base, file_type: 'VIDEO' }, null), 'videos');
  assert.equal(libraryFor({ ...base, lab: 'BrandLab', file_type: 'PDF' }, null), 'branding');
});
