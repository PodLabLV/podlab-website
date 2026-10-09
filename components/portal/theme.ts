'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Portal light/dark switch. Dark is the brand default. The choice is a
 * per-browser convenience, so it lives in localStorage; when storage is
 * blocked the portal just stays dark.
 */
export type PortalTheme = 'dark' | 'light';
const KEY = 'podlab:theme';

export function usePortalTheme(): [PortalTheme, () => void] {
  const [theme, setTheme] = useState<PortalTheme>('dark');
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === 'light') setTheme('light');
    } catch {}
    // Another tab switched: follow it.
    const onStorage = (e: StorageEvent) => e.key === KEY && setTheme(e.newValue === 'light' ? 'light' : 'dark');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(KEY, next);
      } catch {}
      return next;
    });
  }, []);
  return [theme, toggle];
}

export const logoFor = (theme: PortalTheme) => (theme === 'light' ? '/portal/podlab-portal-ink.png' : '/portal/podlab-portal-green.png');
