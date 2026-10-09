import { cardsInScope, clientCardScope, scopeBoardIds } from '@/lib/production-server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PORTAL_COMMENT_SUFFIX } from '@/lib/production';
import { sendPortalEmail } from '@/lib/portal-email';
import { LOOKS_GOOD_NOTE } from '@/lib/portal/potato';
import {
  diffDigest,
  digestEligible,
  digestEmail,
  hasChanges,
  parseSnapshot,
  snapshotOf,
  type DigestChanges,
  type DigestSnapshot,
  type LiveCard,
  type LiveState,
  type LiveVersion,
} from '@/lib/portal/digest';

/**
 * The daily digest run: for each eligible client, read their live state, diff
 * it against portal_digest_state, email what changed, save the new snapshot.
 *
 * - First run for a client only takes the snapshot.
 * - A client whose email fails keeps their old snapshot, so tomorrow's digest
 *   still carries today's changes.
 * - One client failing never stops the others.
 */

export class DigestNotReady extends Error {}

export interface DigestStateRow {
  client_id: string;
  last_sent_at: string | null;
  snapshot: unknown;
}

/** Where snapshots live. Production: the portal_digest_state table. */
export interface DigestStore {
  ready(): Promise<void>;
  load(clientIds: string[]): Promise<Map<string, DigestStateRow>>;
  save(row: { client_id: string; snapshot: DigestSnapshot; last_sent_at: string | null }): Promise<void>;
}

export function tableStore(db: SupabaseClient): DigestStore {
  return {
    async ready() {
      const { error } = await db.from('portal_digest_state').select('client_id').limit(1);
      if (error) throw new DigestNotReady(`portal_digest_state unavailable (run the 20261010 migration): ${error.message}`);
    },
    async load(clientIds) {
      const out = new Map<string, DigestStateRow>();
      for (const ids of chunks(clientIds, 100)) {
        const { data, error } = await db.from('portal_digest_state').select('client_id, last_sent_at, snapshot').in('client_id', ids);
        if (error) throw new Error(`digest state read failed: ${error.message}`);
        for (const r of (data ?? []) as DigestStateRow[]) out.set(r.client_id, r);
      }
      return out;
    },
    async save(row) {
      const { error } = await db
        .from('portal_digest_state')
        .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'client_id' });
      if (error) throw new Error(`digest state write failed: ${error.message}`);
    },
  };
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return (res.data ?? ([] as unknown)) as T;
}

/** Everything the digest compares, for one client, as of now. */
export async function loadLiveState(
  db: SupabaseClient,
  clientId: string,
  window: { since: string | null; until: string },
): Promise<LiveState> {
  const crm = db.schema('crm');

  // Their boards' cards plus cards shared with them one by one.
  const scope = await clientCardScope(db, clientId);
  if (!scope) throw new Error('board links unreadable');
  const inScope = await cardsInScope<{ id: string; board_id: string; list_id: string; title: string; video_url: string | null }>(db, scope, 'id, board_id, list_id, title, video_url');
  if (inScope.error) throw new Error(`cards: ${inScope.error}`);

  let boards: string[] = [];
  let cards: LiveCard[] = [];
  const touched = scopeBoardIds(scope, inScope.data);
  if (touched.length) {
    const boardRows = must(await crm.from('content_boards').select('id').in('id', touched).eq('archived', false), 'boards');
    boards = (boardRows as Array<{ id: string }>).map((b) => b.id);
  }
  if (boards.length) {
    const lists = await crm.from('content_lists').select('id, name').in('board_id', boards);
    const listName = new Map((must(lists, 'lists') as Array<{ id: string; name: string }>).map((l) => [l.id, l.name]));
    const rows = inScope.data.filter((c) => boards.includes(c.board_id));

    const resolved = new Map<string, Array<{ id: string; body: string }>>();
    for (const ids of chunks(rows.map((c) => c.id), 150)) {
      const comments = must(
        await crm.from('content_comments').select('id, card_id, author_name, body').in('card_id', ids).eq('resolved', true),
        'comments',
      ) as Array<{ id: string; card_id: string; author_name: string | null; body: string }>;
      for (const m of comments) {
        if (!(m.author_name ?? '').endsWith(PORTAL_COMMENT_SUFFIX)) continue;
        // "Looks good" is saved resolved so it never blocks Revising; it isn't a fixed note.
        if (m.body.trim() === LOOKS_GOOD_NOTE) continue;
        const list = resolved.get(m.card_id) ?? [];
        list.push({ id: m.id, body: m.body });
        resolved.set(m.card_id, list);
      }
    }

    cards = rows.map((c) => ({
      id: c.id,
      boardId: c.board_id,
      title: c.title,
      column: listName.get(c.list_id) ?? '',
      videoUrl: c.video_url || null,
      resolvedClientComments: resolved.get(c.id) ?? [],
    }));
  }

  // Versions only matter once there is a last_sent_at to compare against.
  let scriptVersions: LiveVersion[] = [];
  let assetVersions: LiveVersion[] = [];
  if (window.since) {
    const [sv, av] = await Promise.all([
      db
        .from('portal_script_versions')
        .select('id, script_id, version_no, created_at')
        .eq('client_id', clientId)
        .gt('created_at', window.since)
        .lte('created_at', window.until),
      db
        .from('portal_asset_versions')
        .select('id, asset_id, version_no, created_at')
        .eq('client_id', clientId)
        .gt('created_at', window.since)
        .lte('created_at', window.until),
    ]);
    const svRows = must(sv, 'script versions') as Array<{ id: string; script_id: string; version_no: number; created_at: string }>;
    const avRows = must(av, 'asset versions') as Array<{ id: string; asset_id: string; version_no: number; created_at: string }>;

    if (svRows.length) {
      const scripts = must(
        await db.from('portal_scripts').select('id, title, status').in('id', [...new Set(svRows.map((v) => v.script_id))]),
        'scripts',
      ) as Array<{ id: string; title: string; status: string | null }>;
      const byId = new Map(scripts.map((s) => [s.id, s]));
      scriptVersions = svRows
        .filter((v) => byId.has(v.script_id) && (byId.get(v.script_id)!.status ?? '').toLowerCase() !== 'draft')
        .map((v) => ({ id: v.id, parentId: v.script_id, title: byId.get(v.script_id)!.title, versionNo: v.version_no, createdAt: v.created_at }));
    }
    if (avRows.length) {
      const assets = must(
        await db.from('portal_assets').select('id, title').in('id', [...new Set(avRows.map((v) => v.asset_id))]),
        'assets',
      ) as Array<{ id: string; title: string }>;
      const byId = new Map(assets.map((a) => [a.id, a.title]));
      assetVersions = avRows
        .filter((v) => byId.has(v.asset_id))
        .map((v) => ({ id: v.id, parentId: v.asset_id, title: byId.get(v.asset_id)!, versionNo: v.version_no, createdAt: v.created_at }));
    }
  }

  const count = async (table: string, status: string) => {
    const { count: n, error } = await db.from(table).select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', status);
    if (error) throw new Error(`${table} count: ${error.message}`);
    return n ?? 0;
  };
  const [scripts, deliverables, actions] = await Promise.all([
    count('portal_scripts', 'in review'),
    count('portal_assets', 'in review'),
    count('portal_action_items', 'open'),
  ]);

  return { boards, cards, scriptVersions, assetVersions, waiting: { scripts, deliverables, actions } };
}

export type DigestOutcome = 'baseline' | 'quiet' | 'sent' | 'would-send' | 'failed';

export interface DigestResult {
  clientId: string;
  businessName: string;
  email: string;
  outcome: DigestOutcome;
  subject?: string;
  changes?: DigestChanges;
  /** Dry runs only. */
  html?: string;
  text?: string;
  error?: string;
}

export interface DigestRunOptions {
  /** Compute and return the emails; send nothing, save nothing. */
  dry?: boolean;
  /** Limit the run to one client (staff previews). */
  clientId?: string;
  store?: DigestStore;
  /** Pause between sends; Resend's default limit is 2 requests a second. */
  sendGapMs?: number;
  /** Override who qualifies (tests only). */
  eligible?: (row: ClientRow) => boolean;
}

interface ClientRow {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  business_name: string;
  digest_opt_out?: boolean | null;
}

export async function runDigest(
  db: SupabaseClient,
  opts: DigestRunOptions = {},
): Promise<{ startedAt: string; eligible: number; skipped: number; results: DigestResult[] }> {
  const store = opts.store ?? tableStore(db);
  await store.ready();
  const startedAt = new Date().toISOString();

  // select('*') so a missing digest_opt_out column reads as "not opted out" rather than failing.
  let q = db.from('portal_clients').select('*').not('user_id', 'is', null);
  if (opts.clientId) q = q.eq('id', opts.clientId);
  const all = must(await q, 'clients') as ClientRow[];
  const clients = all.filter(opts.eligible ?? digestEligible);
  const state = await store.load(clients.map((c) => c.id));

  const results: DigestResult[] = [];
  let sentOne = false;
  for (const c of clients) {
    const base = { clientId: c.id, businessName: c.business_name, email: c.email };
    try {
      const row = state.get(c.id);
      const prev = parseSnapshot(row?.snapshot);
      const since = row?.last_sent_at ?? null;
      const live = await loadLiveState(db, c.id, { since, until: startedAt });
      const next = snapshotOf(live);

      // First run (or an unreadable snapshot): baseline only.
      if (!prev) {
        if (!opts.dry) await store.save({ client_id: c.id, snapshot: next, last_sent_at: startedAt });
        results.push({ ...base, outcome: 'baseline' });
        continue;
      }

      const changes = diffDigest(prev, live, since);
      if (!hasChanges(changes)) {
        if (!opts.dry) await store.save({ client_id: c.id, snapshot: next, last_sent_at: since });
        results.push({ ...base, outcome: 'quiet' });
        continue;
      }

      const mail = digestEmail(changes, { firstName: c.first_name });
      if (opts.dry) {
        results.push({ ...base, outcome: 'would-send', subject: mail.subject, changes, html: mail.html, text: mail.text });
        continue;
      }

      if (sentOne && opts.sendGapMs !== 0) await new Promise((r) => setTimeout(r, opts.sendGapMs ?? 600));
      const sent = await sendPortalEmail({ to: c.email, subject: mail.subject, html: mail.html, text: mail.text });
      sentOne = true;
      if (!sent.ok) {
        // Keep the old snapshot: tomorrow's digest carries today's changes.
        console.error('[digest] send failed', c.id, sent.error);
        results.push({ ...base, outcome: 'failed', subject: mail.subject, changes, error: sent.error });
        continue;
      }
      await store.save({ client_id: c.id, snapshot: next, last_sent_at: startedAt });
      results.push({ ...base, outcome: 'sent', subject: mail.subject, changes });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[digest] client failed', c.id, message);
      results.push({ ...base, outcome: 'failed', error: message });
    }
  }

  return { startedAt, eligible: clients.length, skipped: all.length - clients.length, results };
}
