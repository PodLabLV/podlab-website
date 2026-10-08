// TipTop (portal) unit tests: document find/replace + sanitizing, profile
// validation, and tool scoping against an in-memory stand-in for Supabase.
//
//   npm run test:tiptop

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyEdits, diffSummary, findSnippets, outline, sanitizeFragment, sectionSource } from '@/lib/tiptop/doc-edit';
import { normalizePhone, normalizeWebsite, validateProfilePatch } from '@/lib/portal/profile';
import { approvalPolicy, bookingUrl, makeTools } from '@/lib/tiptop/tools';

const DOC = `<!doctype html><html><head><title>Doc</title><style>.a{color:red}</style></head><body>
<button class="dl-btn" onclick="window.print()">Download PDF</button>
<h2>Mission</h2><p>We help <strong>founders</strong> grow.</p>
<h3>Vision</h3><p>A world where founders rest.</p>
<p>Repeat line.</p><p>Repeat line.</p>
<p>Price is $3,000 &amp; worth it.</p>
<script>var x = 1;</script>
</body></html>`;

// ── document edits ──────────────────────────────────────────────────

test('exact single match is replaced', () => {
  const r = applyEdits(DOC, [{ find: 'A world where founders rest.', replace: 'A world where founders sleep.' }]);
  assert.ok(r.ok);
  assert.ok(r.ok && r.html.includes('founders sleep.'));
  assert.ok(r.ok && !r.html.includes('founders rest.'));
});

test('zero matches refuse and return nearby source', () => {
  const r = applyEdits(DOC, [{ find: 'We help founders grow.', replace: 'x' }]);
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.reason, 'not_found');
  assert.ok(!r.ok && 'near' in r && r.near.length > 0 && r.near[0].includes('<strong>founders</strong>'));
});

test('several matches refuse', () => {
  const r = applyEdits(DOC, [{ find: '<p>Repeat line.</p>', replace: '<p>Once.</p>' }]);
  assert.equal(!r.ok && r.reason, 'ambiguous');
});

test('a failing edit refuses the whole batch', () => {
  const r = applyEdits(DOC, [
    { find: 'A world where founders rest.', replace: 'ok' },
    { find: 'not in the doc at all', replace: 'x' },
  ]);
  assert.equal(r.ok, false);
});

test('edits inside head, style or script are refused', () => {
  const h = applyEdits(DOC, [{ find: 'color:red', replace: 'color:blue' }]);
  assert.equal(!h.ok && h.reason, 'protected_region');
  const r = applyEdits(DOC, [{ find: 'var x = 1;', replace: 'var x = 2;' }]);
  assert.equal(!r.ok && r.reason, 'protected_region');
});

test('edits inside a tag (an existing handler) are refused', () => {
  const r = applyEdits(DOC, [{ find: 'window.print()', replace: 'alert(document.cookie)' }]);
  assert.equal(!r.ok && r.reason, 'protected_region');
});

test('scripts, handlers and javascript: URLs are stripped from replacements', () => {
  const r = applyEdits(DOC, [
    {
      find: 'A world where founders rest.',
      replace: 'Hi<script>alert(1)</script> <img src=x onerror="alert(1)"> <a href="javascript:alert(1)">x</a> <a href="jav&#x09;ascript:alert(1)">y</a>',
    },
  ]);
  assert.ok(r.ok);
  if (r.ok) {
    assert.ok(!/<script>alert/.test(r.html));
    assert.ok(!/onerror/i.test(r.html));
    assert.ok(!/javascript:alert/i.test(r.html));
  }
  assert.equal(sanitizeFragment('<iframe src="https://evil"></iframe>ok'), 'ok');
  assert.equal(sanitizeFragment('<svg onload=alert(1)>'), '');
  assert.ok(!/expression/.test(sanitizeFragment('<span style="width:expression(alert(1))">t</span>')));
  assert.ok(sanitizeFragment('<span style="color:#2add1b">t</span>').includes('color:#2add1b'));
});

test('an edit that would add code anywhere is refused', () => {
  const r = applyEdits(DOC, [{ find: 'Download PDF</button>', replace: 'Download PDF</button><scr' }]);
  assert.equal(r.ok, false);
});

test('unclosed tags in a replacement are refused', () => {
  const r = applyEdits(DOC, [{ find: 'A world where founders rest.', replace: 'text <a href="x' }]);
  assert.equal(!r.ok && r.reason, 'unsafe');
});

test('entities and markup survive an edit that keeps them', () => {
  const r = applyEdits(DOC, [{ find: 'Price is $3,000 &amp; worth it.', replace: 'Price is $3,500 &amp; worth it.' }]);
  assert.ok(r.ok && r.html.includes('$3,500 &amp; worth it.'));
  assert.ok(r.ok && r.changes[0].before.includes('$3,000 & worth it'));
  assert.match(diffSummary(r.ok ? r.changes : []), /3,000.*→.*3,500/);
});

test('outline, section source and loose search find the right source', () => {
  assert.deepEqual(outline(DOC).map((s) => s.trim()), ['Mission', 'Vision']);
  assert.ok(sectionSource(DOC, 'mission')?.includes('<strong>founders</strong>'));
  assert.ok(!sectionSource(DOC, 'vision')?.includes('We help'));
  const hits = findSnippets(DOC, 'we help founders grow');
  assert.equal(hits.length, 1);
  assert.ok(hits[0].includes('We help <strong>founders</strong> grow.'));
});

// ── profile ─────────────────────────────────────────────────────────

test('profile validation cleans, normalises and refuses the login email', () => {
  const ok = validateProfilePatch({ first_name: ' Zed <b>x</b> ', phone: '(702) 555-0101', website: 'acme.com', timezone: 'America/Los_Angeles' });
  assert.ok(ok.ok);
  assert.deepEqual(ok.ok && ok.patch, { first_name: 'Zed x', phone: '+17025550101', website: 'https://acme.com', timezone: 'America/Los_Angeles' });
  const bad = validateProfilePatch({ email: 'new@x.com', phone: '12', website: 'javascript:alert(1)', timezone: 'Mars/Base', business_name: '' });
  assert.equal(bad.ok, false);
  assert.deepEqual(Object.keys(!bad.ok ? bad.errors : {}).sort(), ['business_name', 'email', 'phone', 'timezone', 'website']);
  assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958');
  assert.equal(normalizeWebsite('http://user:pw@acme.com'), null);
});

test('booking links are prefilled and tagged', () => {
  const u = new URL(bookingUrl('clarity', 'Zed Test', 'zed@acme.com'));
  assert.equal(u.origin + u.pathname, 'https://calendly.com/podlablv/essentialslab-clarity-call');
  assert.equal(u.searchParams.get('name'), 'Zed Test');
  assert.equal(u.searchParams.get('email'), 'zed@acme.com');
  assert.equal(new URL(bookingUrl('strategy', undefined, 'zz@x.invalid')).searchParams.get('email'), null);
});

// ── tool scoping (in-memory Supabase) ───────────────────────────────

type Row = Record<string, unknown>;
function fakeDb(tables: Record<string, Row[]>) {
  const missing = (t: string) => ({ data: null, error: { code: 'PGRST205', message: `Could not find the table '${t}' in the schema cache` } });
  function q(table: string) {
    const filters: Array<(r: Row) => boolean> = [];
    let op: 'select' | 'update' | 'insert' | 'delete' = 'select';
    let payload: Row | Row[] | null = null;
    let order: { col: string; asc: boolean } | null = null;
    let limit = Infinity;
    const run = (mode: 'many' | 'maybe' | 'single') => {
      const rows = tables[table];
      if (!rows) return missing(table);
      if (op === 'insert') {
        const list = (Array.isArray(payload) ? payload : [payload]) as Row[];
        const made = list.map((r) => ({ id: `row-${Math.random().toString(16).slice(2)}`, created_at: new Date().toISOString(), ...r }));
        rows.push(...made);
        return { data: mode === 'many' ? made : made[0], error: null };
      }
      let hit = rows.filter((r) => filters.every((f) => f(r)));
      if (op === 'update') hit.forEach((r) => Object.assign(r, payload));
      if (op === 'delete') tables[table] = rows.filter((r) => !hit.includes(r));
      if (order) hit = [...hit].sort((a, b) => ((a[order!.col] as number) > (b[order!.col] as number) ? 1 : -1) * (order!.asc ? 1 : -1));
      hit = hit.slice(0, limit);
      if (mode === 'many') return { data: hit, error: null };
      return { data: hit[0] ?? null, error: mode === 'single' && !hit[0] ? { code: 'PGRST116', message: 'none' } : null };
    };
    const b = {
      select: () => b,
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
      in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(r[c])), b),
      is: (c: string, v: unknown) => (filters.push((r) => (r[c] ?? null) === v), b),
      ilike: (c: string, v: string) => (filters.push((r) => String(r[c]).toLowerCase() === v.toLowerCase()), b),
      order: (col: string, o?: { ascending?: boolean }) => ((order = { col, asc: o?.ascending !== false }), b),
      limit: (n: number) => ((limit = n), b),
      update: (p: Row) => ((op = 'update'), (payload = p), b),
      insert: (p: Row | Row[]) => ((op = 'insert'), (payload = p), b),
      delete: () => ((op = 'delete'), b),
      maybeSingle: async () => run('maybe'),
      single: async () => run('single'),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run('many')).then(res, rej),
    };
    return b;
  }
  const db = { from: q, schema: () => ({ from: (t: string) => q(`crm.${t}`) }) };
  return db as unknown as Parameters<typeof makeTools>[0]['db'];
}

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const callerA = { clientId: A, businessName: 'Acme', displayName: 'Ann Acme', crmLeadId: null, email: 'ann@acme.test', isStaff: false };

function world() {
  return fakeDb({
    portal_clients: [
      { id: A, email: 'ann@acme.test', first_name: 'Ann', last_name: 'Acme', business_name: 'Acme', document_url: null, user_id: null },
      { id: B, email: 'bob@other.test', first_name: 'Bob', last_name: 'Other', business_name: 'Other Co', document_url: null, user_id: null },
    ],
    portal_action_items: [
      { id: 'aaaaaaaa-0000-4000-8000-000000000001', client_id: A, title: 'Send logo', status: 'open' },
      { id: 'bbbbbbbb-0000-4000-8000-000000000002', client_id: B, title: 'Bob secret task', status: 'open' },
    ],
    portal_scripts: [{ id: 'bbbbbbbb-0000-4000-8000-000000000003', client_id: B, title: 'Bob VSL', status: 'in review', current_version: 1 }],
    portal_assets: [{ id: 'bbbbbbbb-0000-4000-8000-000000000004', client_id: B, title: 'Bob file', status: 'in review', current_version: 1 }],
    portal_client_boards: [{ client_id: B, board_id: 'board-b' }],
    'crm.content_cards': [{ id: 'bbbbbbbb-0000-4000-8000-000000000005', board_id: 'board-b', title: 'Bob video' }],
    portal_client_products: [],
    portal_document_versions: [
      { client_id: B, doc_key: 'clarity', version_no: 1, html: '<p>Bob private strategy</p>', author_kind: 'staff', note: 'As delivered', created_at: '2026-10-01' },
    ],
  });
}

const opts = { toolCallId: 't', messages: [] } as never;

test('approvals refuse another client\'s rows, by id', async () => {
  const db = world();
  const policy = approvalPolicy({ db, caller: callerA, priorRecommendations: 0 });
  const denied = (s: unknown) => typeof s === 'object' && s !== null && (s as { type: string }).type === 'denied';

  assert.ok(denied(await policy.complete_action_item({ id: 'bbbbbbbb-0000-4000-8000-000000000002', done: true })));
  assert.ok(denied(await policy.send_revision({ target: 'script', id: 'bbbbbbbb-0000-4000-8000-000000000003', note: 'x y' })));
  assert.ok(denied(await policy.send_revision({ target: 'deliverable', id: 'bbbbbbbb-0000-4000-8000-000000000004', note: 'x y' })));
  assert.ok(denied(await policy.send_revision({ target: 'video', id: 'bbbbbbbb-0000-4000-8000-000000000005', note: 'x y' })));
  assert.ok(denied(await policy.edit_document({ edits: [{ find: 'Bob private', replace: 'Hacked' }], summary: 'try' })));
  assert.ok(denied(await policy.restore_document_version({ version_no: 1 })));

  const mine = await policy.complete_action_item({ id: 'aaaaaaaa-0000-4000-8000-000000000001', done: true });
  assert.equal((mine as { type: string }).type, 'user-approval');
  assert.match((mine as { reason: string }).reason, /Send logo/);
});

test('tools execute only against the caller\'s rows, even if approval were skipped', async () => {
  const db = world();
  const tools = makeTools({ db, caller: callerA, priorRecommendations: 0 });

  const other = await tools.complete_action_item.execute!({ id: 'bbbbbbbb-0000-4000-8000-000000000002', done: true }, opts);
  assert.equal((other as { saved: boolean }).saved, false);
  const tbl = (db as unknown as { from: (t: string) => { select: () => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: Row }> } } } }).from('portal_action_items');
  assert.equal((await tbl.select().eq('id', 'bbbbbbbb-0000-4000-8000-000000000002').maybeSingle()).data.status, 'open');

  const rev = await tools.send_revision.execute!({ target: 'script', id: 'bbbbbbbb-0000-4000-8000-000000000003', note: 'change it' }, opts);
  assert.equal((rev as { sent: boolean }).sent, false);
  const vid = await tools.send_revision.execute!({ target: 'video', id: 'bbbbbbbb-0000-4000-8000-000000000005', note: 'change it' }, opts);
  assert.equal((vid as { sent: boolean }).sent, false);

  const doc = (await tools.read_document.execute!({}, opts)) as { available: boolean };
  assert.equal(doc.available, false, 'client A must not see client B\'s document');

  const mine = await tools.complete_action_item.execute!({ id: 'aaaaaaaa-0000-4000-8000-000000000001', done: true }, opts);
  assert.equal((mine as { saved: boolean }).saved, true);
});

test('recommend_product: once per conversation unless asked, never what they own', async () => {
  const db = world();
  const first = await makeTools({ db, caller: callerA, priorRecommendations: 0 }).recommend_product.execute!({ product: 'assetslab', why: 'Targets are locked.', client_asked: false }, opts);
  assert.equal((first as { shown: boolean }).shown, true);
  assert.equal((first as { href: string }).href, 'https://crm.podlablv.com/api/buy/assetslab');
  const second = await makeTools({ db, caller: callerA, priorRecommendations: 1 }).recommend_product.execute!({ product: 'sitelab', why: 'Destination is locked.', client_asked: false }, opts);
  assert.equal((second as { shown: boolean }).shown, false);
  const asked = await makeTools({ db, caller: callerA, priorRecommendations: 1 }).recommend_product.execute!({ product: 'sitelab', why: 'They asked.', client_asked: true }, opts);
  assert.equal((asked as { shown: boolean; href: string }).shown, true);
  assert.match((asked as { href: string }).href, /calendly\.com\/podlablv\/strategy-call/);
});

test('go_to only links inside the portal', async () => {
  const tools = makeTools({ db: world(), caller: callerA, priorRecommendations: 0 });
  const r = (await tools.go_to.execute!({ page: 'scripts', script_id: 'aaaaaaaa-0000-4000-8000-000000000009' }, opts)) as { href: string };
  assert.equal(r.href, '/portal/scripts/aaaaaaaa-0000-4000-8000-000000000009');
});
