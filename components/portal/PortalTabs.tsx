'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TAB_ROUTES, activeTab } from '@/lib/portal/tabs';

/** Portal v2: the four tabs (routes in lib/portal/tabs.ts). */

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
};

/** Desktop: inline in the header. */
export function TopTabs() {
  const active = activeTab(usePathname() ?? '');
  return (
    <nav aria-label="Portal" className="hidden items-stretch self-stretch lg:flex">
      {TAB_ROUTES.map((t) => {
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
export function BottomTabs() {
  const active = activeTab(usePathname() ?? '');
  return (
    <nav
      aria-label="Portal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-p-line bg-p-paper/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TAB_ROUTES.map((t) => {
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
