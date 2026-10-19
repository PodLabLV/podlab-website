import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formspreeValue } from '@/lib/portal/formspree';

test('links lose their scheme so Formshield does not quarantine the submission', () => {
  assert.equal(formspreeValue('See https://www.acme.com/about and http://x.io'), 'See acme.com/about and x.io');
  assert.equal(formspreeValue('www.acme.com'), 'acme.com');
});
test('uploads become a count, choices a list', () => {
  assert.equal(formspreeValue([{ url: 'https://drive.google.com/x', name: 'a.pdf' }, { url: 'https://y', name: 'b.pdf' }]), '2 files uploaded (in their Drive)');
  assert.equal(formspreeValue(['Direct', 'Warm']), 'Direct, Warm');
  assert.equal(formspreeValue(null), '');
});
