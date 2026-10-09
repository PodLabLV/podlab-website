'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePortal } from '@/lib/portal-data';
import type { NavPayload } from '@/app/api/portal/nav/route';
import type { Mission } from '@/lib/portal/game';
import { PotatoTray } from '@/components/portal/HotPotato';

type ShowKey = keyof NavPayload['show'];
type BadgeKey = keyof NavPayload['badges'];

interface Item {
  href: string;
  label: string;
  /** Hidden when the nav payload says this page has nothing in it yet. */
  show?: ShowKey;
  badge?: BadgeKey;
  done?: keyof NavPayload['done'];
}

interface Group {
  key: string;
  label: string | null;
  items: Item[];
  collapsible?: boolean;
}

const GROUPS: Group[] = [
  { key: 'home', label: null, items: [{ href: '/portal', label: 'Dashboard' }] },
  {
    key: 'turn',
    label: 'Your turn',
    items: [
      { href: '/portal/intake', label: 'Intake', show: 'intake', badge: 'intake', done: 'intake' },
      { href: '/portal/scripts', label: 'Scripts', show: 'scripts', badge: 'scripts' },
      { href: '/portal/deliverables', label: 'Deliverables', show: 'deliverables', badge: 'deliverables' },
      { href: '/portal/brand', label: 'Brand', badge: 'brand', done: 'brand' },
      { href: '/portal/actions', label: 'Action Items', show: 'actions', badge: 'actions' },
    ],
  },
  {
    key: 'build',
    label: 'Your build',
    items: [
      { href: '/portal/plan', label: 'Game Plan' },
      { href: '/portal/content', label: 'Content Plan' },
      { href: '/portal/growth', label: 'Growth Chain', show: 'growth' },
      { href: '/portal/production', label: 'Production', show: 'production', badge: 'production' },
      { href: '/portal/document', label: 'Clarity Document', show: 'document' },
      { href: '/portal/delivery', label: 'Delivery', show: 'delivery' },
    ],
  },
  {
    key: 'results',
    label: 'Results',
    items: [
      { href: '/portal/progress', label: 'Progress & Delivered' },
      { href: '/portal/reports', label: 'Reports', show: 'reports' },
    ],
  },
  {
    key: 'account',
    label: 'Account',
    collapsible: true,
    items: [
      { href: '/portal/answers', label: 'Your Answers' },
      { href: '/portal/invoices', label: 'Invoices', show: 'invoices' },
      { href: '/portal/profile', label: 'Profile' },
    ],
  },
];

const Check = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
    <path d="M5 12l5 5 9-10" />
  </svg>
);

const Chevron = ({ open }: { open: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

function useNav(): { nav: NavPayload | null; reload: () => void } {
  const { accessToken, client } = usePortal();
  const pathname = usePathname();
  const [nav, setNav] = useState<NavPayload | null>(null);

  const reload = useCallback(() => {
    if (!accessToken || !client) return;
    fetch('/api/portal/nav', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: NavPayload | null) => j && setNav(j))
      .catch(() => {});
  }, [accessToken, client]);

  // Page changes are when things get done (approved, uploaded, submitted).
  useEffect(reload, [reload, pathname]);
  useEffect(() => {
    window.addEventListener('portal:refresh', reload);
    return () => window.removeEventListener('portal:refresh', reload);
  }, [reload]);

  return { nav, reload };
}

/** A repeatable mission with nothing waiting but nothing earned yet isn't "done" to the eye. */
const earned = (m: Mission) => m.done && (m.count === undefined || m.count > 0);

/** The level card: level, bar, and the one mission that moves it. */
function LevelCard({ nav, clientId, onNavigate }: { nav: NavPayload; clientId: string; onNavigate: () => void }) {
  const { game } = nav;
  const [open, setOpen] = useState(false);
  const [levelUp, setLevelUp] = useState(false);

  // Celebrate once per level, per browser. Storage can be blocked; then we just skip it.
  useEffect(() => {
    const key = `podlab:level:${clientId}`;
    try {
      const seen = Number(localStorage.getItem(key) ?? '0');
      if (seen && game.level.n > seen) {
        setLevelUp(true);
        const t = setTimeout(() => setLevelUp(false), 6000);
        localStorage.setItem(key, String(game.level.n));
        return () => clearTimeout(t);
      }
      if (!seen || game.level.n < seen) localStorage.setItem(key, String(game.level.n));
    } catch {}
  }, [clientId, game.level.n]);

  const left = game.level.next === null ? 0 : game.level.next - game.score;
  const next = game.nextMission;

  return (
    <div className={`mx-4 mt-4 border p-4 transition-colors ${levelUp ? 'border-[#2add1b] bg-[#2add1b]/10' : 'border-[#1a1a1a] bg-[#0a0a0a]'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="portal-label !text-[9px] text-[#2add1b]">
          {levelUp ? 'Level up · ' : ''}Level {game.level.n} · {game.level.name}
        </p>
        <p className="portal-label !text-[8.5px] text-[#eeeeee]/35">{game.score} pts</p>
      </div>
      <div
        className="mt-3 h-1.5 bg-[#1a1a1a]"
        role="progressbar"
        aria-label={`Level ${game.level.n} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={game.pct}
      >
        <div className="h-full bg-[#2add1b] transition-[width] duration-700" style={{ width: `${Math.max(3, game.pct)}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-[#eeeeee]/40">{game.level.next === null ? 'Top level. Record once, sell forever.' : `${left} pts to level ${game.level.n + 1}`}</p>

      {next ? (
        <Link href={next.href} onClick={onNavigate} className="group mt-3 flex items-center justify-between gap-2 border-t border-[#1a1a1a] pt-3">
          <span className="min-w-0">
            <span className="portal-label block !text-[8.5px] text-[#eeeeee]/35">Next mission</span>
            <span className="mt-1 block truncate text-[13px] text-[#eeeeee] group-hover:text-[#2add1b]">{next.title}</span>
          </span>
          <span className="portal-label shrink-0 bg-[#2add1b] px-2 py-1 !text-[8.5px] text-black">+{next.points}</span>
        </Link>
      ) : (
        <p className="mt-3 border-t border-[#1a1a1a] pt-3 text-[12px] text-[#eeeeee]/55">Nothing waiting on you. We&apos;re building.</p>
      )}

      <button onClick={() => setOpen(!open)} aria-expanded={open} className="portal-label mt-3 flex items-center gap-1.5 !text-[8.5px] text-[#eeeeee]/35 hover:text-[#2add1b]">
        All missions <Chevron open={open} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {game.missions.map((m) => (
            <li key={m.key}>
              <Link href={m.href} onClick={onNavigate} className="flex items-center gap-2 text-[12px] hover:text-[#2add1b]">
                <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${earned(m) ? 'border-[#2add1b] bg-[#2add1b] text-black' : 'border-[#eeeeee]/20'}`}>
                  {earned(m) && <Check size={8} />}
                </span>
                <span className={`min-w-0 flex-1 truncate ${earned(m) ? 'text-[#eeeeee]/40' : 'text-[#eeeeee]/75'}`}>
                  {m.title}
                </span>
                <span className="portal-label shrink-0 !text-[8px] text-[#eeeeee]/30">
                  {m.count !== undefined ? `${m.count}×${m.points}` : `+${m.points}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SidebarNav({ isStaff, onNavigate }: { isStaff: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const { client } = usePortal();
  const { nav } = useNav();
  const isActive = (href: string) => (href === '/portal' ? pathname === '/portal' : pathname.startsWith(href));
  const accountActive = GROUPS.find((g) => g.key === 'account')!.items.some((i) => isActive(i.href));
  const [accountOpen, setAccountOpen] = useState(accountActive);
  useEffect(() => {
    if (accountActive) setAccountOpen(true);
  }, [accountActive]);

  // Without a payload (staff, or the call failed) everything shows: hiding is a nicety, never a lockout.
  const visible = (i: Item) => !nav || !i.show || nav.show[i.show] || isActive(i.href);
  const groups = [
    ...GROUPS,
    ...(isStaff
      ? [{ key: 'staff', label: 'Staff', items: [{ href: '/portal/clients', label: 'Clients' }, { href: '/portal/potatoes', label: 'Hot potatoes' }] } as Group]
      : []),
  ];

  return (
    <>
      {nav && client && <LevelCard nav={nav} clientId={client.id} onNavigate={onNavigate} />}
      {client && !isStaff && <PotatoTray onNavigate={onNavigate} />}

      <nav aria-label="Portal" className="flex-1 overflow-y-auto py-4">
        {groups.map((g) => {
          const items = g.items.filter(visible);
          if (!items.length) return null;
          const waiting = nav ? items.reduce((n, i) => n + (i.badge ? nav.badges[i.badge] ?? 0 : 0), 0) : 0;
          const collapsed = g.collapsible && !accountOpen;
          return (
            <div key={g.key} className={g.label ? 'mt-4' : ''}>
              {g.label &&
                (g.collapsible ? (
                  <button
                    onClick={() => setAccountOpen(!accountOpen)}
                    aria-expanded={!collapsed}
                    className="portal-label flex w-full items-center justify-between px-6 pb-1.5 !text-[8.5px] text-[#eeeeee]/30 hover:text-[#eeeeee]/60"
                  >
                    {g.label} <Chevron open={!collapsed} />
                  </button>
                ) : (
                  <p className="portal-label flex items-center justify-between px-6 pb-1.5 !text-[8.5px] text-[#eeeeee]/30">
                    {g.label}
                    {waiting > 0 && <span className="text-[#2add1b]">{waiting} waiting</span>}
                  </p>
                ))}
              {!collapsed &&
                items.map((item) => {
                  const active = isActive(item.href);
                  const badge = nav && item.badge ? nav.badges[item.badge] ?? 0 : 0;
                  const done = Boolean(nav && item.done && nav.done[item.done]);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center justify-between gap-3 border-l-2 px-6 py-2 text-sm transition ${
                        active ? 'border-[#2add1b] bg-[#2add1b]/[0.06] text-[#eeeeee]' : 'border-transparent text-[#eeeeee]/55 hover:bg-white/[0.03] hover:text-[#eeeeee]'
                      }`}
                    >
                      <span className="font-medium">{item.label}</span>
                      {badge > 0 ? (
                        <span className="portal-label flex h-5 min-w-5 items-center justify-center bg-[#2add1b] px-1.5 !text-[9px] text-black" aria-label={`${badge} waiting on you`}>
                          {badge}
                        </span>
                      ) : done ? (
                        <span className="text-[#2add1b]" aria-label="Done">
                          <Check />
                        </span>
                      ) : item.href === '/portal/growth' && nav?.chain.available ? (
                        <span className="portal-label !text-[8.5px] text-[#eeeeee]/35">{nav.chain.unlocked}/8</span>
                      ) : null}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </nav>
    </>
  );
}
