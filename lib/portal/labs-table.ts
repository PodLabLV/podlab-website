/**
 * The Periodic Table of Labs — data half.
 *
 * Kept out of the component so the state rules are readable in one place and
 * can be reasoned about without JSX in the way.
 *
 * `lib/labs.ts` holds the five Labs the marketing site sells. EssentialsLab is
 * the entry bundle and lives outside that list, so it is added here rather than
 * by editing labs.ts, which the public site renders from.
 *
 * Z is position in the growth system, not an atomic number. Si for SiteLab is
 * silicon, and that one is a keeper.
 */

import { LABS } from '@/lib/labs';
import type { PortalAsset, PortalProject, PortalPhase } from '@/lib/portal-data';

export type LabState = 'complete' | 'running' | 'waiting' | 'owned' | 'locked';

export interface LabElement {
  z: number;
  symbol: string;
  name: string;
  /** One line, shown on hover for a Lab the client does not own yet. */
  unlocks: string;
  href: string | null;
  state: LabState;
  /** 0-100. Only meaningful while running. */
  progress: number;
}

interface Blueprint {
  z: number;
  symbol: string;
  name: string;
  unlocks: string;
  href: string | null;
}

const ESSENTIALS: Blueprint = {
  z: 1,
  symbol: 'Es',
  name: 'EssentialsLab',
  unlocks: 'Brand, site, studio day and ads — the whole foundation in one build.',
  href: '/essentialslab-assessment',
};

const SYMBOLS: Record<string, { z: number; symbol: string }> = {
  AssetsLab: { z: 2, symbol: 'As' },
  BrandLab: { z: 3, symbol: 'Br' },
  SiteLab: { z: 4, symbol: 'Si' },
  VideoSalesLab: { z: 5, symbol: 'Vs' },
  ExpansionLab: { z: 6, symbol: 'Ex' },
};

/** The full table, in growth-system order, before any client state is applied. */
export const LAB_TABLE: Blueprint[] = [
  ESSENTIALS,
  ...LABS.map((lab) => ({
    z: SYMBOLS[lab.name]?.z ?? 99,
    symbol: SYMBOLS[lab.name]?.symbol ?? lab.name.slice(0, 2),
    name: lab.name,
    unlocks: lab.unlockOutcome,
    href: lab.href,
  })),
].sort((a, b) => a.z - b.z);

/** Loose match: plan labels and lab columns are hand-entered and drift. */
function mentions(haystack: string | null | undefined, labName: string): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().replace(/\s+/g, '').includes(labName.toLowerCase());
}

export interface LabTableInput {
  planLabel: string | null;
  projects: PortalProject[];
  assets: PortalAsset[];
  phases: PortalPhase[];
}

/**
 * Resolve every Lab to a state for this client.
 *
 * Ownership is inferred from three places because no single column records it:
 * the plan label, the labs on their projects, and the labs on their delivered
 * assets. A Lab counts as owned if any of the three name it.
 */
export function buildLabTable({ planLabel, projects, assets, phases }: LabTableInput): LabElement[] {
  // One client-wide signal: the team is blocked on them. Phases carry an owner,
  // so this is real rather than inferred from silence.
  const blockedOnClient = phases.some(
    (p) => (p.owner || '').toLowerCase() === 'client' && (p.status || '').toLowerCase() !== 'done',
  );

  return LAB_TABLE.map((bp) => {
    const labProjects = projects.filter((p) => mentions(p.lab, bp.name));
    const labAssets = assets.filter((a) => mentions(a.lab, bp.name));
    const owned =
      mentions(planLabel, bp.name) || labProjects.length > 0 || labAssets.length > 0;

    if (!owned) {
      return { ...bp, state: 'locked' as LabState, progress: 0 };
    }

    const progress = labProjects.length
      ? Math.round(labProjects.reduce((sum, p) => sum + (p.progress_pct || 0), 0) / labProjects.length)
      : 0;

    const running = labProjects.some((p) => (p.progress_pct || 0) < 100);

    let state: LabState;
    if (running) state = blockedOnClient ? 'waiting' : 'running';
    else if (labProjects.length > 0) state = 'complete';
    else if (labAssets.length > 0) state = 'complete';
    else state = 'owned';

    return { ...bp, state, progress: running ? progress : 100 };
  });
}
