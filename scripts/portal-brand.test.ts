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
  thumbUrl: null,
  driveUrl: null,
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

test('Drive helpers: folder ids, row encoding, signed preview links', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-secret';
  const { folderIdFromUrl, driveIdOf, previewUrl, verifyPreview } = await import('@/lib/portal/drive');
  assert.equal(folderIdFromUrl('https://drive.google.com/drive/folders/1KIGdnIsLADohoSXuGAF196ewcd00Z2KT?usp=sharing'), '1KIGdnIsLADohoSXuGAF196ewcd00Z2KT');
  assert.equal(folderIdFromUrl('https://drive.google.com/open?id=1KIGdnIsLADohoSXuGAF196'), '1KIGdnIsLADohoSXuGAF196');
  assert.equal(folderIdFromUrl(null), null);
  assert.equal(driveIdOf('drive:abc123'), 'abc123');
  assert.equal(driveIdOf('client/logo/1-a.png'), null);

  const u = new URL(previewUrl('asset-1', 'thumb', 60), 'https://podlablv.com');
  const q = u.searchParams;
  assert.ok(verifyPreview('asset-1', 'thumb', q.get('exp')!, q.get('sig')!));
  assert.ok(!verifyPreview('asset-2', 'thumb', q.get('exp')!, q.get('sig')!), 'another asset');
  assert.ok(!verifyPreview('asset-1', 'file', q.get('exp')!, q.get('sig')!), 'thumb link cannot fetch the file');
  assert.ok(!verifyPreview('asset-1', 'thumb', String(Math.floor(Date.now() / 1000) - 1), q.get('sig')!), 'expired');
});

test('driveFileId: file links only, never folders or other hosts', async () => {
  const { driveFileId } = await import('@/lib/chapters');
  assert.equal(driveFileId('https://drive.google.com/file/d/1ACAk5liw8f4MifH8SyavFbU_VkwTCG62/view?usp=drive_link'), '1ACAk5liw8f4MifH8SyavFbU_VkwTCG62');
  assert.equal(driveFileId('https://drive.google.com/open?id=1ACAk5liw8f4MifH8SyavFbU_VkwTCG62'), '1ACAk5liw8f4MifH8SyavFbU_VkwTCG62');
  assert.equal(driveFileId('https://drive.google.com/uc?id=1ACAk5liw8f4MifH8SyavFbU_VkwTCG62&export=download'), '1ACAk5liw8f4MifH8SyavFbU_VkwTCG62');
  assert.equal(driveFileId('https://drive.google.com/drive/folders/1KIGdnIsLADohoSXuGAF196ewcd00Z2KT'), null);
  assert.equal(driveFileId('https://evil.example.com/file/d/1ACAk5liw8f4MifH8SyavFbU_VkwTCG62/view'), null);
  assert.equal(driveFileId('https://youtu.be/dQw4w9WgXcQ'), null);
});

test('stream links are scoped to one card or version and expire', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-secret';
  const { streamUrl, verifyStream, previewUrl, verifyPreview } = await import('@/lib/portal/drive');
  const q = new URL(streamUrl('card', 'card-1', 60), 'https://podlablv.com').searchParams;
  assert.ok(verifyStream('card', 'card-1', q.get('exp')!, q.get('sig')!));
  assert.ok(!verifyStream('version', 'card-1', q.get('exp')!, q.get('sig')!), 'card link cannot open a version');
  assert.ok(!verifyStream('card', 'card-2', q.get('exp')!, q.get('sig')!), 'another card');
  assert.ok(!verifyStream('asset', 'card-1', q.get('exp')!, q.get('sig')!), 'unknown kind');
  // A brand preview signature is not a stream signature (different scope).
  const p = new URL(previewUrl('card-1', 'file', 60), 'https://podlablv.com').searchParams;
  assert.ok(!verifyStream('card', 'card-1', p.get('exp')!, p.get('sig')!));
  assert.ok(verifyPreview('card-1', 'file', p.get('exp')!, p.get('sig')!));
});

test('brand pings: one post per run of uploads, from the last upload in it', async () => {
  const { brandBurst } = await import('@/lib/portal/brand');
  const t0 = Date.parse('2026-10-09T21:28:00Z');
  const at = (s: number) => ({ created_at: new Date(t0 + s * 1000).toISOString() });
  // John's three drops at 2:28: 0s, 40s, 90s. Yesterday's file is a separate run.
  const rows = [at(-86_400), at(0), at(1), at(40), at(90)];
  // The first two announces see newer files and stay quiet.
  assert.equal(brandBurst(rows, t0 + 5_000).post, false);
  assert.equal(brandBurst(rows, t0 + 45_000).post, false);
  // The last one posts all four from today, not yesterday's.
  const last = brandBurst(rows, t0 + 95_000);
  assert.equal(last.post, true);
  assert.equal(last.rows.length, 4);
  // A lone upload posts itself.
  assert.deepEqual(brandBurst([at(0)], t0 + 5_000).rows.length, 1);
  assert.equal(brandBurst([], t0).post, false);
});
