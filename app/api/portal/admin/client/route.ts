import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { admin, resolveStaff } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface StaffClientDetail {
  client: {
    id: string;
    businessName: string;
    name: string;
    email: string;
    planLabel: string | null;
    hasLogin: boolean;
    crmLeadId: string | null;
    /** Their folder in the PodLab OS Shared Drive (staff only). */
    driveFolderUrl: string | null;
  };
  products: string[];
  elements: Array<{ element: string; score: number | null; delivered_at: string | null; state_override: string | null }>;
  phases: Array<{ status: string; elements: string[] | null }>;
  boards: Array<{ id: string; name: string; type: string; linked: boolean }>;
  /** Video deliverables, and the editor card each is tied to. */
  videoAssets: Array<{ id: string; title: string; crmCardId: string | null }>;
  /** Cards on this client's linked boards, to tie a video deliverable to. */
  cards: Array<{ id: string; title: string; board: string }>;
  /** Scripts TipTop drafted with the client, waiting on PodLab review. */
  drafts: Array<{ id: string; title: string; kind: string | null; createdAt: string; body: string; note: string | null; words: number | null }>;
  /** Published by the automation with held: true. The client can't see these until staff releases them. */
  held: HeldItem[];
  /** Tables whose migration hasn't run yet; the page says so instead of failing. */
  missing: string[];
}

export interface HeldItem {
  id: string;
  type: 'script' | 'asset';
  title: string;
  status: string | null;
  version: number;
  updatedAt: string | null;
  /** Script: the current version's text. */
  body: string | null;
  words: number | null;
  /** Asset: the current version, opened through GET /api/portal/deliverables?versionId=. */
  versionId: string | null;
  fileType: string | null;
  mimeType: string | null;
  externalUrl: string | null;
  hasFile: boolean;
  /** Open internal notes (Hiram's change requests). Never shown to the client. */
  notes: Array<{ id: string; body: string; author: string; createdAt: string }>;
}

/**
 * GET ?id=<clientId> — staff only. Everything the client-manager page edits:
 * purchases, Growth Chain rows, delivery phases (for computed states), and every
 * live CRM content board with whether it's linked to this client.
 */
export async function GET(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: c } = await db.from('portal_clients').select('*').eq('id', id).maybeSingle();
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [products, elements, phases, links, boards] = await Promise.all([
    db.from('portal_client_products').select('product').eq('client_id', id),
    db.from('portal_client_elements').select('element, score, delivered_at, state_override').eq('client_id', id),
    db.from('portal_delivery_phases').select('*').eq('client_id', id),
    db.from('portal_client_boards').select('board_id').eq('client_id', id),
    db.schema('crm').from('content_boards').select('id, name, board_type').eq('archived', false).order('name'),
  ]);

  const missing: string[] = [];
  if (products.error) missing.push('portal_client_products');
  if (elements.error) missing.push('portal_client_elements');
  if (links.error) missing.push('portal_client_boards');

  const linked = new Set((links.data ?? []).map((l: { board_id: string }) => l.board_id));
  const [assets, cards, draftRows] = await Promise.all([
    db.from('portal_assets').select('*').eq('client_id', id).order('sort_order'),
    linked.size
      ? db.schema('crm').from('content_cards').select('id, title, board_id').in('board_id', [...linked]).eq('archived', false).eq('is_template', false).order('sort')
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; board_id: string }> }),
    db.from('portal_scripts').select('id, title, kind, created_at').eq('client_id', id).eq('status', 'draft').eq('source', 'tiptop').order('created_at'),
  ]);
  const draftList = (draftRows.data ?? []) as Array<{ id: string; title: string; kind: string | null; created_at: string }>;
  const { data: draftVersions } = draftList.length
    ? await db.from('portal_script_versions').select('script_id, body, note, word_count').in('script_id', draftList.map((d) => d.id)).eq('version_no', 1)
    : { data: [] as Array<{ script_id: string; body: string; note: string | null; word_count: number | null }> };
  const held = await loadHeld(db, id);
  if (held === null) missing.push('held_for (20261024)');
  const boardName = new Map((boards.data ?? []).map((b: { id: string; name: string }) => [b.id, b.name]));
  const detail: StaffClientDetail = {
    client: {
      id: c.id,
      businessName: c.business_name ?? '',
      name: [c.first_name, c.last_name].filter(Boolean).join(' '),
      email: c.email ?? '',
      planLabel: c.plan_label ?? null,
      hasLogin: Boolean(c.user_id),
      crmLeadId: c.crm_lead_id ?? null,
      driveFolderUrl: c.drive_folder_url ?? null,
    },
    products: (products.data ?? []).map((p: { product: string }) => p.product),
    elements: elements.data ?? [],
    phases: (phases.data ?? []).map((p: { status: string; elements?: string[] | null }) => ({ status: p.status, elements: p.elements ?? [] })),
    boards: (boards.data ?? []).map((b: { id: string; name: string; board_type: string }) => ({
      id: b.id,
      name: b.name,
      type: b.board_type,
      linked: linked.has(b.id),
    })),
    missing,
    held: held ?? [],
    drafts: draftList.map((d) => {
      const v = (draftVersions ?? []).find((x: { script_id: string }) => x.script_id === d.id) as { body: string; note: string | null; word_count: number | null } | undefined;
      return { id: d.id, title: d.title, kind: d.kind, createdAt: d.created_at, body: v?.body ?? '', note: v?.note ?? null, words: v?.word_count ?? null };
    }),
    videoAssets: (assets.data ?? [])
      .filter((a: { file_type?: string | null }) => (a.file_type || '').toUpperCase() === 'VIDEO')
      .map((a: { id: string; title: string; crm_card_id?: string | null }) => ({ id: a.id, title: a.title, crmCardId: a.crm_card_id ?? null })),
    cards: ((cards.data ?? []) as Array<{ id: string; title: string; board_id: string }>).map((c) => ({
      id: c.id,
      title: c.title,
      board: String(boardName.get(c.board_id) ?? ''),
    })),
  };
  return NextResponse.json(detail);
}

/** Held scripts and assets for one client. null = the 20261024 migration hasn't run. */
async function loadHeld(db: ReturnType<typeof admin>, clientId: string): Promise<HeldItem[] | null> {
  const [s, a] = await Promise.all([
    db.from('portal_scripts').select('id, title, status, current_version, updated_at').eq('client_id', clientId).not('held_for', 'is', null).order('created_at'),
    db.from('portal_assets').select('id, title, status, current_version, file_type, updated_at').eq('client_id', clientId).not('held_for', 'is', null).order('created_at'),
  ]);
  if (s.error || a.error) {
    const msg = s.error?.message ?? a.error?.message ?? '';
    if (!/held_for/.test(msg)) reportError('[portal] held load failed', msg);
    return null;
  }
  type S = { id: string; title: string; status: string | null; current_version: number; updated_at: string | null };
  type A = S & { file_type: string | null };
  const scripts = (s.data ?? []) as S[];
  const assets = (a.data ?? []) as A[];
  if (!scripts.length && !assets.length) return [];

  const [sv, av, sn, an] = await Promise.all([
    scripts.length
      ? db.from('portal_script_versions').select('script_id, version_no, body, word_count').in('script_id', scripts.map((r) => r.id))
      : Promise.resolve({ data: [] }),
    assets.length
      ? db.from('portal_asset_versions').select('id, asset_id, version_no, external_url, storage_path, mime_type').in('asset_id', assets.map((r) => r.id))
      : Promise.resolve({ data: [] }),
    scripts.length
      ? db.from('portal_script_comments').select('id, script_id, body, author_name, created_at').in('script_id', scripts.map((r) => r.id)).eq('internal', true).eq('status', 'open').order('created_at')
      : Promise.resolve({ data: [] }),
    assets.length
      ? db.from('portal_asset_comments').select('id, asset_id, body, author_name, created_at').in('asset_id', assets.map((r) => r.id)).eq('internal', true).eq('status', 'open').order('created_at')
      : Promise.resolve({ data: [] }),
  ]);
  type N = { id: string; body: string; author_name: string; created_at: string; script_id?: string; asset_id?: string };
  const notes = (rows: N[] | null, key: 'script_id' | 'asset_id', id: string) =>
    (rows ?? []).filter((n) => n[key] === id).map((n) => ({ id: n.id, body: n.body, author: n.author_name, createdAt: n.created_at }));
  const sVers = (sv.data ?? []) as Array<{ script_id: string; version_no: number; body: string; word_count: number | null }>;
  const aVers = (av.data ?? []) as Array<{ id: string; asset_id: string; version_no: number; external_url: string | null; storage_path: string | null; mime_type: string | null }>;

  return [
    ...scripts.map((r): HeldItem => {
      const v = sVers.find((x) => x.script_id === r.id && x.version_no === r.current_version);
      return {
        id: r.id, type: 'script', title: r.title, status: r.status, version: r.current_version, updatedAt: r.updated_at,
        body: v?.body ?? '', words: v?.word_count ?? null,
        versionId: null, fileType: null, mimeType: null, externalUrl: null, hasFile: false,
        notes: notes(sn.data as N[] | null, 'script_id', r.id),
      };
    }),
    ...assets.map((r): HeldItem => {
      const v = aVers.find((x) => x.asset_id === r.id && x.version_no === r.current_version);
      return {
        id: r.id, type: 'asset', title: r.title, status: r.status, version: r.current_version ?? 0, updatedAt: r.updated_at,
        body: null, words: null,
        versionId: v?.id ?? null, fileType: r.file_type, mimeType: v?.mime_type ?? null, externalUrl: v?.external_url ?? null, hasFile: Boolean(v?.storage_path),
        notes: notes(an.data as N[] | null, 'asset_id', r.id),
      };
    }),
  ];
}

const DRIVE_URL = /^https:\/\/drive\.google\.com\/(drive\/(u\/\d+\/)?folders\/|open\?id=)[\w-]{10,}/;

/** PATCH { id, driveFolderUrl } — staff only. Sets or clears the client's Drive folder link. */
export async function PATCH(req: Request) {
  const db = admin();
  if (!(await resolveStaff(req, db))) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  let p: { id?: string; driveFolderUrl?: string | null };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!p.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const url = (p.driveFolderUrl ?? '').trim() || null;
  if (url && !DRIVE_URL.test(url)) {
    return NextResponse.json({ error: 'Paste a Google Drive folder link (drive.google.com/drive/folders/…).' }, { status: 400 });
  }
  const { error } = await db.from('portal_clients').update({ drive_folder_url: url }).eq('id', p.id);
  if (error) {
    reportError('[portal] drive folder save failed', error.message);
    return NextResponse.json({ error: /drive_folder_url/.test(error.message) ? 'Run migration 20261011 first.' : 'Could not save that.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, driveFolderUrl: url });
}
