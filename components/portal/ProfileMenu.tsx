'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export interface MenuUser {
  firstName: string;
  lastName: string;
  email: string;
  initials: string;
}

interface ProfileMenuProps {
  user: MenuUser;
  businessName: string;
  isStaff: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSignOut: () => void;
  /** 'up' for the desktop bottom-left button, 'down' for the mobile header. */
  direction: 'up' | 'down';
  /** Mobile header: avatar only. */
  compact?: boolean;
}

const ITEMS: Array<{ href: string; label: string }> = [
  { href: '/portal/profile', label: 'Profile' },
  { href: '/portal/profile#credits', label: 'Credits' },
  { href: '/portal/profile#payments', label: 'Payments' },
  { href: '/portal/profile#team', label: 'Team' },
  { href: '/portal/profile#notifications', label: 'Notifications' },
];

const STAFF: Array<{ href: string; label: string }> = [
  { href: '/portal/clients', label: 'Clients · staff' },
  { href: '/portal/potatoes', label: 'Hot potatoes · staff' },
];

/** Avatar + name. Opens the account menu: profile sections, theme, sign out. */
export default function ProfileMenu({ user, businessName, isStaff, theme, onToggleTheme, onSignOut, direction, compact }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const name = `${user.firstName} ${user.lastName}`.trim() || user.email;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const link = 'block px-4 py-2.5 text-[15px] text-p-ink/85 transition hover:bg-p-ink/[0.04] hover:text-p-brandink';

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className={
          compact
            ? 'flex h-10 w-10 items-center justify-center border border-p-brandink/40 bg-p-paper/90 text-sm font-bold text-p-brandink backdrop-blur transition hover:border-p-brandink'
            : 'flex w-full items-center gap-3 border border-p-line bg-p-paper/90 px-3 py-2.5 text-left backdrop-blur transition hover:border-p-brandink'
        }
      >
        {compact ? (
          user.initials
        ) : (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-p-brandink/40 text-sm font-bold text-p-brandink">{user.initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-p-ink">{name}</span>
              <span className="block truncate text-sm text-p-ink/65">{businessName || user.email}</span>
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={`shrink-0 text-p-ink/60 transition ${open ? 'rotate-180' : ''}`}>
              <path d="M6 15l6-6 6 6" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-[80] w-64 border border-p-line bg-p-paper py-2 shadow-[0_20px_60px_rgba(0,0,0,.45)] ${
            direction === 'up' ? 'bottom-full left-0 mb-2' : 'right-0 top-12'
          }`}
        >
          <div className="border-b border-p-line px-4 pb-3 pt-1">
            <p className="truncate text-[15px] font-medium text-p-ink">{name}</p>
            <p className="truncate text-sm text-p-ink/65">{user.email}</p>
          </div>
          <div className="py-1">
            {ITEMS.map((i) => (
              <Link key={i.href} href={i.href} role="menuitem" onClick={close} className={link}>
                {i.label}
              </Link>
            ))}
          </div>
          {isStaff && (
            <div className="border-t border-p-line py-1">
              {STAFF.map((i) => (
                <Link key={i.href} href={i.href} role="menuitem" onClick={close} className={link}>
                  {i.label}
                </Link>
              ))}
            </div>
          )}
          <div className="border-t border-p-line py-1">
            <button type="button" role="menuitem" onClick={onToggleTheme} className={`${link} w-full text-left`}>
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onSignOut();
              }}
              className={`${link} w-full text-left`}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
