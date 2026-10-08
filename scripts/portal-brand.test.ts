import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateKit, brandGaps, allowedFile, formatBytes, type BrandPayload, type BrandAsset } from '@/lib/portal/brand';

const asset = (kind: BrandAsset['kind'], variant: BrandAsset['variant'] = null): BrandAsset => ({
  id: Math.random().toString(36),
  kind,
  variant,
  label: null,
  filename: 'x.png',
  sizeBytes: 1,
  mimeType: 'image/png',
  externalUrl: null,
  uploadedBy: 'Test',
  uploadedByKind: 'client',
  createdAt: '2026-10-08T00:00:00Z',
  url: null,
});
const payload = (assets: BrandAsset[], colors = 0, fonts = 0): BrandPayload => ({
  ready: true,
  assets,
  kit: {
    colors: Array.from({ length: colors }, () => ({ hex: '#000000', name: '' })),
    fonts: Array.from({ length: fonts }, () => ({ name: 'Inter', use: '' })),
    notes: '',
    updatedAt: null,
    updatedBy: null,
  },
});

test('validateKit normalises hex codes and drops empty rows', () => {
  const { kit, error } = validateKit({
    colors: [{ hex: '2add1b', name: ' Green ' }, { hex: '#fff' }, { hex: '' }],
    fonts: [{ name: 'Michroma', use: 'Headings' }, { name: '  ' }],
    notes: '  Never stretch it.  ',
  });
  assert.equal(error, undefined);
  assert.deepEqual(kit!.colors, [
    { hex: '#2ADD1B', name: 'Green' },
    { hex: '#FFFFFF', name: '' },
  ]);
  assert.deepEqual(kit!.fonts, [{ name: 'Michroma', use: 'Headings' }]);
  assert.equal(kit!.notes, 'Never stretch it.');
});

test('validateKit rejects a non-hex color in plain words', () => {
  const { kit, error } = validateKit({ colors: [{ hex: 'green' }] });
  assert.equal(kit, undefined);
  assert.match(error!, /not a color code/);
});

test('brandGaps: empty kit asks for the logo first', () => {
  assert.deepEqual(brandGaps(payload([])), ['No logo uploaded yet', 'Brand colors not added', 'Brand fonts not added']);
});

test('brandGaps: names the missing logo versions', () => {
  const gaps = brandGaps(payload([asset('logo', 'primary')], 2, 1));
  assert.deepEqual(gaps, ['Logo set missing: icon or mark, white version']);
});

test('brandGaps: complete kit has no gaps, b-roll is optional', () => {
  const full = [asset('logo', 'primary'), asset('logo', 'icon'), asset('logo', 'white')];
  assert.deepEqual(brandGaps(payload(full, 1, 1)), []);
});

test('allowedFile is per kind and case-insensitive', () => {
  assert.ok(allowedFile('logo', 'Logo-FINAL.SVG'));
  assert.ok(allowedFile('broll', 'IMG_0042.MOV'));
  assert.ok(!allowedFile('logo', 'clip.mov'));
  assert.ok(!allowedFile('font', 'setup.exe'));
});

test('formatBytes', () => {
  assert.equal(formatBytes(0), '');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(2.5 * 1024 ** 3), '2.5 GB');
});
