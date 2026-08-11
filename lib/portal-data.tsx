'use client';

/**
 * Portal data layer.
 *
 * One fetch per session, shared by every portal page through context. All reads
 * go through Supabase RLS — a logged-in client can only ever see their own row
 * and its children, so there is no client-side filtering to get wrong.
 */

import {
  createContext,
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
};

const PortalContext = createContext<PortalData>(EMPTY);

export function usePortal() {
  return useContext(PortalContext);
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PortalData>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const db = getSupabaseBrowser().schema('portal');

    async function load() {
      const { data: clientRows, error: clientErr } = await db
        .from('clients')
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

      const [assets, projects, invoices, activity, metrics] = await Promise.all([
        db.from('assets').select('*').order('sort_order'),
        db.from('projects').select('*').order('sort_order'),
        db.from('invoices').select('*').order('sort_order'),
        db.from('activity').select('*').order('happened_at', { ascending: false }),
        db.from('report_metrics').select('*').order('sort_order'),
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
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
