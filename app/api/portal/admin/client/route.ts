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
  /** Tables whose migration hasn't run yet; the page says so instead of failing. */
  missing: string[];
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
    console.error('[portal] drive folder save failed', error.message);
    return NextResponse.json({ error: /drive_folder_url/.test(error.message) ? 'Run migration 20261011 first.' : 'Could not save that.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, driveFolderUrl: url });
}
