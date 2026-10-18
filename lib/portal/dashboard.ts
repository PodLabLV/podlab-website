/**
 * Portal v2 Dashboard: payload types and the pure helpers shared by the
 * /api/portal/dashboard route and the page. No server imports here.
 */

import type { GamePlan } from '@/lib/portal/game-plan';
import type { PortalNotification } from '@/lib/portal/notify';

/**
 * The CRM's board-stage ladder (podlab-crm src/data/contentStages.ts, mirrored
 * in crm.content_boards_stage_check). Keys match the CRM; labels are the
 * client's words, so "internal review" reads as our quality check.
 */
export const BOARD_STAGES = [
  { key: 'raw', label: 'Footage in' },
  { key: 'editing', label: 'Editing' },
  { key: 'internal_review', label: 'Quality check' },
  { key: 'client_review', label: 'Ready for your review' },
  { key: 'revisions', label: 'Revising' },
  { key: 'approved', label: 'Approved' },
  { key: 'delivered', label: 'Delivered' },
] as const;

export type BoardStage = (typeof BOARD_STAGES)[number]['key'];

export function boardStageIndex(stage: string | null): number {
  return BOARD_STAGES.findIndex((s) => s.key === stage);
}

export function boardStageLabel(stage: string | null): string {
  return BOARD_STAGES.find((s) => s.key === stage)?.label ?? 'Getting started';
}

export interface DashboardBoard {
  id: string;
  name: string;
  stage: string | null;
  stageChangedAt: string | null;
}

export interface DashboardInvoice {
  id: string;
  invoiceNo: string | null;
  description: string | null;
  amountCents: number;
  status: string;
  issuedOn: string | null;
  dueOn: string | null;
  paidAt: string | null;
  payUrl: string | null;
  receiptUrl: string | null;
}

export interface InvoiceSummary {
  paidCents: number;
  openCents: number;
  openCount: number;
  /** The open invoice due soonest (overdue first). */
  next: DashboardInvoice | null;
}

export type ReferralCard =
  | { state: 'beaker'; beakerId: string; link: string; ratePct: number; recurringMonths: number; earnedCents: number; onHoldCents: number; referrals: number }
  | { state: 'join'; ratePct: number; recurringMonths: number }
  | { state: 'member' };

export interface DashboardPayload {
  boards: DashboardBoard[];
  credits: { ready: boolean; balance: number };
  waiting: PortalNotification[];
  plans: GamePlan[];
  invoices: DashboardInvoice[];
  invoiceSummary: InvoiceSummary;
  referral: ReferralCard;
}

const isPaid = (s: string) => /^paid/i.test(s);
const isVoid = (s: string) => /^void/i.test(s);

export function summarizeInvoices(list: DashboardInvoice[]): InvoiceSummary {
  const live = list.filter((i) => !isVoid(i.status));
  const paid = live.filter((i) => isPaid(i.status));
  const open = live.filter((i) => !isPaid(i.status));
  const due = (i: DashboardInvoice) => i.dueOn ?? i.issuedOn ?? '9999-12-31';
  const next = [...open].sort((a, b) => due(a).localeCompare(due(b)))[0] ?? null;
  return {
    paidCents: paid.reduce((s, i) => s + i.amountCents, 0),
    openCents: open.reduce((s, i) => s + i.amountCents, 0),
    openCount: open.length,
    next,
  };
}
