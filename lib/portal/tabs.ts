/**
 * Portal v2: the tabs and which older routes live under each. Older pages
 * still work by URL and light up the tab they now belong to. Pure, so tests and
 * the shell agree.
 *
 * Clients see the four client tabs. An approved Beaker (PodLab affiliate) gets
 * a fifth, Beaker; a Beaker with no client record sees Beaker alone (their
 * profile sits in the account menu, like everyone's).
 */

export interface TabRoute {
  href: string;
  label: string;
  /** Older routes that belong under this tab. */
  owns: string[];
}

export const TAB_ROUTES: TabRoute[] = [
  {
    href: '/portal',
    label: 'Dashboard',
    owns: ['/portal/delivery', '/portal/progress', '/portal/reports', '/portal/invoices', '/portal/plan', '/portal/growth', '/portal/actions'],
  },
  { href: '/portal/tiptop', label: 'TipTop', owns: [] },
  { href: '/portal/assets', label: 'Assets', owns: ['/portal/brand', '/portal/document', '/portal/answers', '/portal/intake', '/portal/content'] },
  { href: '/portal/projects', label: 'Projects', owns: ['/portal/production', '/portal/scripts', '/portal/deliverables'] },
];

export const BEAKER_TAB: TabRoute = { href: '/portal/beaker', label: 'Beaker', owns: ['/portal/referrals'] };

export interface Viewer {
  /** Has a portal client record (owner or teammate). */
  client: boolean;
  /** Is an approved Beaker. */
  beaker: boolean;
}

/** The tabs this viewer sees. Not a Beaker = exactly the four client tabs, as before. */
export function tabsFor(v: Viewer): TabRoute[] {
  if (!v.beaker) return TAB_ROUTES;
  if (!v.client) return [BEAKER_TAB];
  return [...TAB_ROUTES, BEAKER_TAB];
}

/** Beaker-only accounts: the routes they may open. Everything else sends them to /portal/beaker. */
export const BEAKER_ONLY_ROUTES = ['/portal/beaker', '/portal/profile', '/portal/referrals'];

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

export function beakerOnlyAllowed(pathname: string): boolean {
  return BEAKER_ONLY_ROUTES.some((r) => under(pathname, r));
}

export function activeTab(pathname: string, tabs: TabRoute[] = [...TAB_ROUTES, BEAKER_TAB]): string | null {
  if (pathname === '/portal') return tabs.some((t) => t.href === '/portal') ? '/portal' : null;
  for (const t of tabs) {
    if (t.href !== '/portal' && under(pathname, t.href)) return t.href;
    if (t.owns.some((o) => under(pathname, o))) return t.href;
  }
  return null;
}
