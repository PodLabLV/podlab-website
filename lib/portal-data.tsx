'use client';

/**
 * Portal data layer.
 *
 * Tables live in `public` with a portal_ prefix rather than their own schema:
 * this project's PostgREST does not pick up exposed-schema config changes
 * without a full restart, which would interrupt crm.podlablv.com.
 *
 * One fetch per session, shared by every portal page through context. All reads
 * go through Supabase RLS — a logged-in client can only ever see their own row
 * and its children, so there is no client-side filtering to get wrong.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import type { ElementState, LayerKey } from '@/lib/growth-chain';

export interface PortalClient {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string;
  plan_label: string | null;
  stage: string | null;
  welcome_note: string | null;
  crm_lead_id: string | null;
  document_url: string | null;
}

export interface PortalAsset {
  id: string;
  title: string;
  description: string | null;
  lab: string | null;
  file_type: string | null;
  url: string | null;
  status: string | null;
  size_label: string | null;
  sort_order: number;
}

export interface PortalProject {
  id: string;
  name: string;
  lab: string | null;
  stage_index: number;
  total_stages: number;
  progress_pct: number;
  started_on: string | null;
  eta: string | null;
  owner: string | null;
}

export interface PortalInvoice {
  id: string;
  invoice_no: string | null;
  issued_on: string | null;
  description: string | null;
  amount_cents: number;
  status: string | null;
  receipt_url: string | null;
}

export interface PortalActivity {
  id: string;
  kind: string | null;
  title: string;
  happened_at: string | null;
}

export interface PortalComment {
  id: string;
  section: string | null;
  body: string;
  status: string | null;
  resolution: string | null;
  created_at: string;
}

export interface PortalActionItem {
  id: string;
  title: string;
  detail: string | null;
  effort: string | null;
  source: string | null;
  status: string | null;
  completed_at: string | null;
  sort_order: number;
}

export interface PortalIntakeItem {
  id: string;
  section: string;
  prompt: string;
  help: string | null;
  kind: string;
  options: string[] | null;
  required: boolean;
  sort_order: number;
}

export interface PortalIntakeAnswer {
  item_id: string;
  value: string | null;
}

export interface PortalPhase {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  owner: string | null;
  due_label: string | null;
  sort_order: number;
  updated_at: string | null;
  /** Growth Chain layers this phase builds (lib/growth-chain.ts). */
  elements: string[] | null;
}

export interface PortalProduct {
  product: string;
  purchased_on: string | null;
}

export interface PortalElementRow {
  element: LayerKey;
  score: number | null;
  answer: unknown;
  delivered_at: string | null;
  state_override: ElementState | null;
}

export interface PortalMetric {
  id: string;
  period_label: string;
  label: string;
  value: string;
  sub: string | null;
}

interface PortalData {
  loading: boolean;
  error: string | null;
  client: PortalClient | null;
  assets: PortalAsset[];
  projects: PortalProject[];
  invoices: PortalInvoice[];
  activity: PortalActivity[];
  metrics: PortalMetric[];
  comments: PortalComment[];
  actionItems: PortalActionItem[];
  intakeItems: PortalIntakeItem[];
  answers: Record<string, string>;
  phases: PortalPhase[];
  products: PortalProduct[];
  elementRows: PortalElementRow[];
  isStaff: boolean;
  /** Signed-in email, so an account with no client row can be told where to go. */
  viewerEmail: string | null;
  setAnswer: (itemId: string, value: string) => void;
  setPhaseStatus: (id: string, status: string) => void;
  setElementRows: (rows: PortalElementRow[]) => void;
  /** Optimistic local updates, then a background refetch. */
  setActionItem: (id: string, done: boolean) => void;
  addComment: (comment: PortalComment) => void;
  accessToken: string | null;
}

const EMPTY: PortalData = {
  loading: true,
  error: null,
  client: null,
  assets: [],
  projects: [],
  invoices: [],
  activity: [],
  metrics: [],
  comments: [],
  actionItems: [],
  intakeItems: [],
  answers: {},
  phases: [],
  products: [],
  elementRows: [],
  isStaff: false,
  viewerEmail: null,
  setAnswer: () => {},
  setPhaseStatus: () => {},
  setElementRows: () => {},
  setActionItem: () => {},
  addComment: () => {},
  accessToken: null,
};

/** Display-only: decides whether staff tools render. Every staff route re-checks server-side. */
async function checkStaff(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch('/api/portal/whoami', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    return res.ok && Boolean((await res.json()).staff);
  } catch {
    return false;
  }
}

const PortalContext = createContext<PortalData>(EMPTY);

export function usePortal() {
  return useContext(PortalContext);
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PortalData>(EMPTY);

  const setActionItem = useCallback((id: string, done: boolean) => {
    setData((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((i) =>
        i.id === id
          ? { ...i, status: done ? 'done' : 'open', completed_at: done ? new Date().toISOString() : null }
          : i,
      ),
    }));
  }, []);

  const addComment = useCallback((comment: PortalComment) => {
    setData((prev) => ({ ...prev, comments: [comment, ...prev.comments] }));
  }, []);

  const setAnswer = useCallback((itemId: string, value: string) => {
    setData((prev) => ({ ...prev, answers: { ...prev.answers, [itemId]: value } }));
  }, []);

  const setPhaseStatus = useCallback((id: string, status: string) => {
    setData((prev) => ({
      ...prev,
      phases: prev.phases.map((p) => (p.id === id ? { ...p, status } : p)),
    }));
  }, []);

  const setElementRows = useCallback((rows: PortalElementRow[]) => {
    setData((prev) => {
      const merged = prev.elementRows.filter((r) => !rows.some((n) => n.element === r.element));
      return { ...prev, elementRows: [...merged, ...rows] };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const db = getSupabaseBrowser();

    async function load() {
      const { data: clientRows, error: clientErr } = await db
        .from('portal_clients')
        .select('*')
        .limit(1);

      if (cancelled) return;

      if (clientErr) {
        setData({ ...EMPTY, loading: false, error: clientErr.message });
        return;
      }

      const client = (clientRows?.[0] as PortalClient) ?? null;

      // Signed in, but nobody has set this account up yet. Pages render an
      // explanatory empty state rather than a wall of zeroes.
      if (!client) {
        const { data: { session: s } } = await db.auth.getSession();
        if (cancelled) return;
        const viewer = s?.user?.email ?? null;
        setData({
          ...EMPTY,
          loading: false,
          viewerEmail: viewer,
          accessToken: s?.access_token ?? null,
          isStaff: await checkStaff(s?.access_token),
        });
        return;
      }

      const [assets, projects, invoices, activity, metrics, comments, actions, session,
             intake, intakeAnswers, phases, products, elementRows] =
        await Promise.all([
          db.from('portal_assets').select('*').order('sort_order'),
          db.from('portal_projects').select('*').order('sort_order'),
          db.from('portal_invoices').select('*').order('sort_order'),
          db.from('portal_activity').select('*').order('happened_at', { ascending: false }),
          db.from('portal_report_metrics').select('*').order('sort_order'),
          db.from('portal_comments').select('*').order('created_at', { ascending: false }),
          db.from('portal_action_items').select('*').order('sort_order'),
          db.auth.getSession(),
          db.from('portal_intake_items').select('*').order('sort_order'),
          db.from('portal_intake_answers').select('item_id, value'),
          db.from('portal_delivery_phases').select('*').order('sort_order'),
          db.from('portal_client_products').select('product, purchased_on'),
          db.from('portal_client_elements').select('element, score, answer, delivered_at, state_override'),
        ]);

      if (cancelled) return;

      setData({
        loading: false,
        error: null,
        client,
        assets: (assets.data as PortalAsset[]) ?? [],
        projects: (projects.data as PortalProject[]) ?? [],
        invoices: (invoices.data as PortalInvoice[]) ?? [],
        activity: (activity.data as PortalActivity[]) ?? [],
        metrics: (metrics.data as PortalMetric[]) ?? [],
        comments: (comments.data as PortalComment[]) ?? [],
        actionItems: (actions.data as PortalActionItem[]) ?? [],
        accessToken: session.data.session?.access_token ?? null,
        intakeItems: (intake.data as PortalIntakeItem[]) ?? [],
        answers: Object.fromEntries(
          ((intakeAnswers.data as PortalIntakeAnswer[]) ?? []).map((a) => [a.item_id, a.value ?? '']),
        ),
        phases: (phases.data as PortalPhase[]) ?? [],
        // Both tables are new; before the migration runs they error and read as empty.
        products: (products.data as PortalProduct[]) ?? [],
        elementRows: (elementRows.data as PortalElementRow[]) ?? [],
        // Staff is asserted by the server on every write; this only decides
        // whether the edit controls render.
        viewerEmail: session.data.session?.user?.email ?? null,
        isStaff: await checkStaff(session.data.session?.access_token),
        setActionItem,
        addComment,
        setAnswer,
        setPhaseStatus,
        setElementRows,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [setActionItem, addComment, setAnswer, setPhaseStatus, setElementRows]);

  return <PortalContext.Provider value={data}>{children}</PortalContext.Provider>;
}

/** $21,000 — whole dollars, since PodLab never invoices cents. */
export function formatMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

/**
 * "Aug 11, 2026". A date-only column is read as written, without tripping over
 * timezones; a full timestamp is shown in the viewer's local day, so a note left
 * at 6pm in Las Vegas doesn't read as tomorrow (UTC).
 */
export function formatDate(value: string | null): string {
  if (!value) return '—';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  if (value.length > 10 && value.includes('T')) {
    const t = new Date(value);
    return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString('en-US', opts);
  }
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
