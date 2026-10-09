'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';

// App surfaces with their own scroll panes feel laggy under smoothing.
const NATIVE_SCROLL_PREFIXES = ['/portal', '/login'];

export default function SmoothScroll() {
  const pathname = usePathname();
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  if (reducedMotion) return null;
  if (NATIVE_SCROLL_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        wheelMultiplier: 1,
        // Offset matches the fixed h-20 nav so #anchors don't land under it.
        anchors: { offset: -80 },
      }}
    />
  );
}
