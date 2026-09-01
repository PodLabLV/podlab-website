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
import { usePortalRealtime, type PortalChange } from '@/lib/portal/realtime';

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
  due_on: string | null;
  paid_at: string | null;
  currency: string | null;
  amount_paid_cents: number | null;
  /** Stripe-hosted payment page. The only "pay now" path — we never take a card. */
  hosted_invoice_url: string | null;
  pdf_url: string | null;
}

export interface PortalSubscription {
  id: string;
  product_label: string | null;
  amount_cents: number;
  interval: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  started_on: string | null;
}

export interface PortalPayment {
  id: string;
  invoice_id: string | null;
  kind: string | null;
  amount_cents: number;
  status: string | null;
  method_label: string | null;
  failure_reason: string | null;
  occurred_at: string | null;
}

export interface PortalActivity {
  id: string;
  kind: string | null;
  title: string;
  happened_at: string | null;
}

/**
 * The event log (20260831b). One table every module writes; the Lab Notebook,
 * the activity feed, and the CRM timeline all read from it. Rows with
 * visible_to_client = false never reach the browser — RLS drops them on read
 * and the broadcast trigger refuses to put them on the wire.
 */
export interface PortalEvent {
  id: string;
  module: string;
  kind: string;
  title: string;
  detail: string | null;
  actor_name: string | null;
  actor_kind: string | null;
  ref_id: string | null;
  created_at: string;
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
}

export interface PortalScript {
  id: string;
  title: string;
  lab: string | null;
  kind: string | null;
  status: string | null;
  current_version: number;
  shoot_date: string | null;
  source: string | null;
  trial_group: string | null;
  sort_order: number;
  updated_at: string | null;
}

/** Immutable. A revision is a new row, never an edit to this one. */
export interface PortalScriptVersion {
  id: string;
  script_id: string;
  version_no: number;
  body: string;
  word_count: number | null;
  runtime_seconds: number | null;
  author_name: string | null;
  author_kind: string | null;
  note: string | null;
  created_at: string;
}

export interface PortalScriptComment {
  id: string;
  version_id: string;
  script_id: string;
  parent_id: string | null;
  block_index: number | null;
  quoted_text: string | null;
  body: string;
  author_name: string;
  author_kind: string;
  status: string | null;
  orphaned: boolean | null;
  resolved_at: string | null;
  created_at: string;
}

export interface PortalScriptApproval {
  id: string;
  version_id: string;
  script_id: string;
  approved_by_name: string;
  approved_at: string;
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
  subscriptions: PortalSubscription[];
  payments: PortalPayment[];
  activity: PortalActivity[];
  events: PortalEvent[];
  metrics: PortalMetric[];
  comments: PortalComment[];
  scripts: PortalScript[];
  scriptVersions: PortalScriptVersion[];
  scriptComments: PortalScriptComment[];
  scriptApprovals: PortalScriptApproval[];
  actionItems: PortalActionItem[];
  intakeItems: PortalIntakeItem[];
  answers: Record<string, string>;
  phases: PortalPhase[];
  isStaff: boolean;
  setAnswer: (itemId: string, value: string) => void;
  setPhaseStatus: (id: string, status: string) => void;
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
  subscriptions: [],
  payments: [],
  activity: [],
  events: [],
  metrics: [],
  comments: [],
  scripts: [],
  scriptVersions: [],
  scriptComments: [],
  scriptApprovals: [],
  actionItems: [],
  intakeItems: [],
  answers: {},
  phases: [],
  isStaff: false,
  setAnswer: () => {},
  setPhaseStatus: () => {},
  setActionItem: () => {},
  addComment: () => {},
  accessToken: null,
};

/** Display-only hint. Every write re-checks staff status server-side. */
const STAFF_EMAILS = ['info@podlablv.com'];

/**
 * Which broadcast table patches which slice of state. Table names arrive from
 * the bus already stripped of their portal_ prefix.
 */
const LIST_KEYS = {
  assets: 'assets',
  projects: 'projects',
  invoices: 'invoices',
  activity: 'activity',
  report_metrics: 'metrics',
  comments: 'comments',
  action_items: 'actionItems',
  delivery_phases: 'phases',
  events: 'events',
  subscriptions: 'subscriptions',
  payments: 'payments',
  scripts: 'scripts',
  script_versions: 'scriptVersions',
  script_comments: 'scriptComments',
  script_approvals: 'scriptApprovals',
} as const;

type ListKey = (typeof LIST_KEYS)[keyof typeof LIST_KEYS];

interface Row {
  id: string;
  sort_order?: number;
  created_at?: string;
  happened_at?: string;
}

/**
 * Apply one broadcast change to a list, keeping it in the order the initial
 * fetch used: by sort_order where the table has one, newest-first where it does
 * not. Re-sorting locally rather than refetching is what makes an update land
 * in well under a second.
 */
function applyToList<T extends Row>(list: T[], change: PortalChange): T[] {
  const incoming = change.record as unknown as T | null;
  const gone = change.old as unknown as T | null;

  if (change.op === 'DELETE') {
    return gone ? list.filter((r) => r.id !== gone.id) : list;
  }
  if (!incoming) return list;

  const without = list.filter((r) => r.id !== incoming.id);
  const next = [...without, incoming];

  if (incoming.sort_order !== undefined) {
    return next.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }
  const stamp = (r: T) => r.happened_at ?? r.created_at ?? '';
  return next.sort((a, b) => stamp(b).localeCompare(stamp(a)));
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

      const [assets, projects, invoices, activity, metrics, comments, actions, session,
             intake, intakeAnswers, phases, events, subscriptions, payments,
             scripts, scriptVersions, scriptComments, scriptApprovals] =
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
          db.from('portal_events').select('*').order('created_at', { ascending: false }).limit(100),
          db.from('portal_subscriptions').select('*').order('created_at', { ascending: false }),
          db.from('portal_payments').select('*').order('occurred_at', { ascending: false }).limit(100),
          db.from('portal_scripts').select('*').order('sort_order'),
          db.from('portal_script_versions').select('*').order('version_no', { ascending: false }),
          db.from('portal_script_comments').select('*').order('created_at'),
          db.from('portal_script_approvals').select('*'),
        ]);

      if (cancelled) return;

      setData({
        loading: false,
        error: null,
        client,
        assets: (assets.data as PortalAsset[]) ?? [],
        projects: (projects.data as PortalProject[]) ?? [],
        invoices: (invoices.data as PortalInvoice[]) ?? [],
        subscriptions: (subscriptions.data as PortalSubscription[]) ?? [],
        payments: (payments.data as PortalPayment[]) ?? [],
        activity: (activity.data as PortalActivity[]) ?? [],
        events: (events.data as PortalEvent[]) ?? [],
        metrics: (metrics.data as PortalMetric[]) ?? [],
        comments: (comments.data as PortalComment[]) ?? [],
        scripts: (scripts.data as PortalScript[]) ?? [],
        scriptVersions: (scriptVersions.data as PortalScriptVersion[]) ?? [],
        scriptComments: (scriptComments.data as PortalScriptComment[]) ?? [],
        scriptApprovals: (scriptApprovals.data as PortalScriptApproval[]) ?? [],
        actionItems: (actions.data as PortalActionItem[]) ?? [],
        accessToken: session.data.session?.access_token ?? null,
        intakeItems: (intake.data as PortalIntakeItem[]) ?? [],
        answers: Object.fromEntries(
          ((intakeAnswers.data as PortalIntakeAnswer[]) ?? []).map((a) => [a.item_id, a.value ?? '']),
        ),
        phases: (phases.data as PortalPhase[]) ?? [],
        // Staff is asserted by the server on every write; this only decides
        // whether the edit controls render.
        isStaff: Boolean(session.data.session?.user?.email &&
          STAFF_EMAILS.includes(session.data.session.user.email.toLowerCase())),
        setActionItem,
        addComment,
        setAnswer,
        setPhaseStatus,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [setActionItem, addComment, setAnswer, setPhaseStatus]);

  /**
   * One channel, every table. The provider stays the shared cache and each
   * module hook will split off as that module lands — doing both in one change
   * would make a live-update bug indistinguishable from a refactor bug.
   */
  const applyChange = useCallback((change: PortalChange) => {
    setData((prev) => {
      // The client's own row: merge, never replace, so a partial payload cannot
      // blank out fields the initial fetch had.
      if (change.table === 'clients') {
        if (!change.record || !prev.client) return prev;
        return { ...prev, client: { ...prev.client, ...(change.record as Partial<PortalClient>) } };
      }

      // Intake answers are keyed by item_id, not held as a list.
      if (change.table === 'intake_answers') {
        const row = (change.record ?? change.old) as PortalIntakeAnswer | null;
        if (!row?.item_id) return prev;
        const answers = { ...prev.answers };
        if (change.op === 'DELETE') delete answers[row.item_id];
        else answers[row.item_id] = row.value ?? '';
        return { ...prev, answers };
      }

      const key = LIST_KEYS[change.table as keyof typeof LIST_KEYS] as ListKey | undefined;
      if (!key) return prev;

      return {
        ...prev,
        [key]: applyToList(prev[key] as unknown as Row[], change),
      } as PortalData;
    });
  }, []);

  usePortalRealtime(data.client?.id, applyChange);

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
