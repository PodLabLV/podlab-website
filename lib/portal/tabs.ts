/**
 * Portal v2: the four tabs and which older routes live under each. Older pages
 * still work by URL and light up the tab they now belong to. Pure, so tests and
 * the shell agree.
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
    owns: ['/portal/delivery', '/portal/progress', '/portal/reports', '/portal/invoices', '/portal/plan', '/portal/growth', '/portal/actions', '/portal/referrals'],
  },
  { href: '/portal/tiptop', label: 'TipTop', owns: [] },
  { href: '/portal/assets', label: 'Assets', owns: ['/portal/brand', '/portal/document', '/portal/answers', '/portal/intake', '/portal/content'] },
  { href: '/portal/projects', label: 'Projects', owns: ['/portal/production', '/portal/scripts', '/portal/deliverables'] },
];

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

export function activeTab(pathname: string): string | null {
  if (pathname === '/portal') return '/portal';
  for (const t of TAB_ROUTES) {
    if (t.href !== '/portal' && under(pathname, t.href)) return t.href;
    if (t.owns.some((o) => under(pathname, o))) return t.href;
  }
  return null;
}
