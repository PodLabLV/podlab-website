/**
 * Discoveries — rare milestone unlocks.
 *
 * Six, not sixty. If these fire weekly they are worthless; four a year and a
 * founder screenshots one. Every criterion below is a real business outcome —
 * PORTAL-EXPERIENCE.md §5.5 forbids awarding one for logging in, filling a
 * field, or clicking anything.
 *
 * Derived, not stored. A discovery is a fact about the data, so computing it
 * means it can never drift out of sync with the thing it claims happened, and
 * a correction to the underlying row corrects the discovery for free.
 */

import type {
  PortalAsset,
  PortalScript,
  PortalScriptApproval,
  PortalMetric,
  PortalEvent,
} from '@/lib/portal-data';
import type { LabElement } from '@/lib/portal/labs-table';

export interface Discovery {
  key: string;
  name: string;
  /** Shown once unlocked — what actually happened. */
  earned: string;
  /** Shown while locked — what would unlock it. Never a nag. */
  pending: string;
  unlockedAt: string | null;
}

export interface DiscoveryInput {
  assets: PortalAsset[];
  scripts: PortalScript[];
  approvals: PortalScriptApproval[];
  metrics: PortalMetric[];
  events: PortalEvent[];
  labs: LabElement[];
}

/** Earliest timestamp in a set, or null when the set is empty. */
function earliest(dates: Array<string | null | undefined>): string | null {
  const valid = dates.filter((d): d is string => Boolean(d)).sort();
  return valid[0] ?? null;
}

/** Pull a dollar figure out of a metric value like "$14,700" or "14700". */
function parseMoney(value: string): number {
  const n = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function buildDiscoveries(input: DiscoveryInput): Discovery[] {
  const { assets, scripts, approvals, metrics, events, labs } = input;

  // First Synthesis — first deliverable the client actually approved.
  const firstApprovedAsset = earliest(
    assets.filter((a) => a.approved_at).map((a) => a.approved_at),
  );

  // Ignition — first ad live. Read from the event log rather than inferred, so
  // it means what the team said it means.
  const ignition = earliest(
    events
      .filter((e) => /ad.*(live|launched)|campaign.*live/i.test(`${e.kind} ${e.title}`))
      .map((e) => e.created_at),
  );

  // First Signal — first attributed booked call.
  const firstSignal = earliest(
    events
      .filter((e) => /booked call|call booked|first lead|appointment/i.test(`${e.kind} ${e.title}`))
      .map((e) => e.created_at),
  );

  // Critical Mass — $10k attributed pipeline in any reported period.
  const criticalMass = metrics.some(
    (m) => /pipeline|attributed|revenue/i.test(m.label) && parseMoney(m.value) >= 10_000,
  );

  // Full Compound — every Lab they own, delivered.
  const owned = labs.filter((l) => l.state !== 'locked');
  const fullCompound = owned.length > 0 && owned.every((l) => l.state === 'complete');

  // Chain Reaction — a referral that closed.
  const chainReaction = earliest(
    events
      .filter((e) => /referral.*(closed|won)|closed.*referral/i.test(`${e.kind} ${e.title}`))
      .map((e) => e.created_at),
  );

  // Validated scripts are the shot pipeline; used for First Synthesis fallback
  // when a client's first win was a script rather than a file.
  const firstValidated = earliest(
    approvals
      .filter((a) => scripts.some((s) => s.id === a.script_id))
      .map((a) => a.approved_at),
  );

  return [
    {
      key: 'first-synthesis',
      name: 'First Synthesis',
      earned: 'Your first deliverable, approved.',
      pending: 'Unlocks when you approve your first deliverable.',
      unlockedAt: firstApprovedAsset ?? firstValidated,
    },
    {
      key: 'ignition',
      name: 'Ignition',
      earned: 'Your first ad went live.',
      pending: 'Unlocks when your first ad goes live.',
      unlockedAt: ignition,
    },
    {
      key: 'first-signal',
      name: 'First Signal',
      earned: 'Your first call booked from this work.',
      pending: 'Unlocks on the first call booked from this work.',
      unlockedAt: firstSignal,
    },
    {
      key: 'critical-mass',
      name: 'Critical Mass',
      earned: '$10,000 in attributed pipeline.',
      pending: 'Unlocks at $10,000 in attributed pipeline.',
      unlockedAt: criticalMass ? 'reported' : null,
    },
    {
      key: 'full-compound',
      name: 'Full Compound',
      earned: 'Every Lab you own, delivered.',
      pending: 'Unlocks when every Lab you own is delivered.',
      unlockedAt: fullCompound ? 'reported' : null,
    },
    {
      key: 'chain-reaction',
      name: 'Chain Reaction',
      earned: 'Your first referral closed.',
      pending: 'Unlocks when someone you referred signs.',
      unlockedAt: chainReaction,
    },
  ];
}
