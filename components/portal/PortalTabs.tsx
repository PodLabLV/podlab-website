'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { activeTab, tabsFor, type TabRoute } from '@/lib/portal/tabs';
import { usePortal } from '@/lib/portal-data';

/** Portal v2: the four client tabs, plus Beaker for affiliates (routes in lib/portal/tabs.ts). */

/** This viewer's tabs; none until the account has loaded, so nobody sees a tab they don't have. */
function useTabs(): TabRoute[] {
  const { loading, client, isBeaker } = usePortal();
  return loading ? [] : tabsFor({ client: Boolean(client), beaker: isBeaker });
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const ICONS: Record<string, React.ReactNode> = {
  '/portal': (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <rect x="3.5" y="3.5" width="7" height="9" />
      <rect x="13.5" y="3.5" width="7" height="5" />
      <rect x="13.5" y="11.5" width="7" height="9" />
      <rect x="3.5" y="15.5" width="7" height="5" />
    </svg>
  ),
  '/portal/tiptop': (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M4 5.5h16v10H9l-5 4v-14z" />
      <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth="2.2" />
    </svg>
  ),
  '/portal/assets': (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M3.5 6.5h6l2 2h9v11h-17z" />
    </svg>
  ),
  '/portal/projects': (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <rect x="3.5" y="5.5" width="17" height="13" />
      <path d="M10 9.5l4.5 2.5-4.5 2.5z" />
    </svg>
  ),
  // A beaker: the program's name.
  '/portal/beaker': (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M9 3.5h6M10 3.5v6L4.8 18.6A1.3 1.3 0 0 0 6 20.5h12a1.3 1.3 0 0 0 1.2-1.9L14 9.5v-6" />
      <path d="M7.2 14.5h9.6" />
    </svg>
  ),
};

/** Desktop: inline in the header. */
export function TopTabs() {
  const tabs = useTabs();
  const active = activeTab(usePathname() ?? '', tabs);
  return (
    <nav aria-label="Portal" className="hidden items-stretch self-stretch lg:flex">
      {tabs.map((t) => {
        const on = active === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            className={`portal-label relative flex items-center px-4 !text-[13px] transition ${on ? 'text-p-brandink' : 'text-p-ink/70 hover:text-p-ink'}`}
          >
            {t.label}
            <span className={`absolute inset-x-4 -bottom-px h-0.5 ${on ? 'bg-p-brand' : 'bg-transparent'}`} aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile: a fixed bottom bar. */
const COLS: Record<number, string> = { 4: 'grid-cols-4', 5: 'grid-cols-5' };

export function BottomTabs() {
  const tabs = useTabs();
  const active = activeTab(usePathname() ?? '', tabs);
  // One tab (a Beaker with no client account) needs no bar: the header says where they are.
  if (tabs.length < 2) return null;
  return (
    <nav
      aria-label="Portal"
      className={`fixed inset-x-0 bottom-0 z-40 grid ${COLS[tabs.length] ?? 'grid-cols-4'} border-t border-p-line bg-p-paper/95 backdrop-blur lg:hidden`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabs.map((t) => {
        const on = active === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            className={`flex h-16 flex-col items-center justify-center gap-1 transition ${on ? 'text-p-brandink' : 'text-p-ink/65 hover:text-p-ink'}`}
          >
            {ICONS[t.href]}
            <span className="portal-label !text-[10px]">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
