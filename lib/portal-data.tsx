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
  setActionItem: () => {},
  addComment: () => {},
  accessToken: null,
};

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
        setData({ ...EMPTY, loading: false });
        return;
      }

      const [assets, projects, invoices, activity, metrics, comments, actions, session] =
        await Promise.all([
          db.from('portal_assets').select('*').order('sort_order'),
          db.from('portal_projects').select('*').order('sort_order'),
          db.from('portal_invoices').select('*').order('sort_order'),
          db.from('portal_activity').select('*').order('happened_at', { ascending: false }),
          db.from('portal_report_metrics').select('*').order('sort_order'),
          db.from('portal_comments').select('*').order('created_at', { ascending: false }),
          db.from('portal_action_items').select('*').order('sort_order'),
          db.auth.getSession(),
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
        setActionItem,
        addComment,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [setActionItem, addComment]);

  return <PortalContext.Provider value={data}>{children}</PortalContext.Provider>;
}

/** $21,000 — whole dollars, since PodLab never invoices cents. */
export function formatMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

/** "Aug 11, 2026" from a date-only column, without tripping over timezones. */
export function formatDate(value: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
