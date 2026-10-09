'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePortal } from '@/lib/portal-data';
import { HEAT_LABEL, type Heat, type Potato } from '@/lib/portal/potato';

// ── the potato ───────────────────────────────────────────────────────────

const BODY: Record<Heat, string> = { warm: '#c99a5b', hot: '#e0683a', fire: '#d9452b', smoke: '#5b3a2a' };
const SPOT: Record<Heat, string> = { warm: '#a77b42', hot: '#b84a25', fire: '#a8301d', smoke: '#2e1d15' };

/** A potato that shows its heat: steam, a red glow, flames, then charred and smoking. */
export function PotatoIcon({ heat, size = 22 }: { heat: Heat; size?: number }) {
  const flames = heat === 'fire' || heat === 'smoke';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={heat === 'hot' ? 'potato-hot' : undefined} style={{ overflow: 'visible' }}>
      {heat === 'warm' && (
        <g className="text-p-ink" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path className="potato-steam" d="M12 9c-1.5-2 1.5-3 0-5" />
          <path className="potato-steam potato-steam-2" d="M19 9c-1.5-2 1.5-3 0-5" />
        </g>
      )}
      {flames && (
        <g>
          <path className="potato-flame" d="M9 15c-2-4 1-6 1-9 2 2 4 4 3 8z" fill="#ff8a1f" />
          <path className="potato-flame potato-flame-2" d="M15 14c-2-5 2-7 1-12 3 3 6 7 3 12z" fill="#ffb321" />
          <path className="potato-flame" d="M21 15c0-3 2-4 2-7 2 2 3 5 0 8z" fill="#ff6a13" />
          <path className="potato-flame potato-flame-2" d="M14 15c-1-2 1-3 1-5 1 1 3 3 1 5z" fill="#fff1a8" />
        </g>
      )}
      {heat === 'smoke' && (
        <g fill="#d4d4d4" fillOpacity=".72">
          <circle className="potato-steam" cx="10" cy="5" r="2.4" />
          <circle className="potato-steam potato-steam-2" cx="16" cy="1.5" r="3" />
          <circle className="potato-steam" cx="22" cy="4" r="2.2" />
        </g>
      )}
      <path d="M6 20c0-5 5-8 11-8s10 3 10 8-5 9-11 9S6 25 6 20z" fill={BODY[heat]} />
      <circle cx="12" cy="19" r="1.1" fill={SPOT[heat]} />
      <circle cx="19" cy="23" r="1.3" fill={SPOT[heat]} />
      <circle cx="22" cy="17.5" r=".9" fill={SPOT[heat]} />
      <circle cx="14.5" cy="24.5" r=".8" fill={SPOT[heat]} />
    </svg>
  );
}

// ── shared data: one fetch for the tray and the smoke ────────────────────

type Listener = (p: Potato[] | null) => void;
let current: Potato[] | null = null;
const listeners = new Set<Listener>();
let inflight: Promise<void> | null = null;

async function refresh(token: string) {
  if (inflight) return inflight;
  inflight = fetch('/api/portal/potatoes', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { potatoes?: Potato[]; staff?: boolean } | null) => {
      // Staff see every client's potatoes on their own board, not in their sidebar.
      current = j && !j.staff ? j.potatoes ?? [] : null;
      listeners.forEach((l) => l(current));
    })
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function usePotatoes(): Potato[] | null {
  const { accessToken, client } = usePortal();
  const pathname = usePathname();
  const [list, setList] = useState<Potato[] | null>(current);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  const reload = useCallback(() => {
    if (accessToken && client) refresh(accessToken);
  }, [accessToken, client]);
  // Changing page is when potatoes get passed (approved, uploaded, submitted).
  useEffect(reload, [reload, pathname]);
  useEffect(() => {
    window.addEventListener('portal:refresh', reload);
    return () => window.removeEventListener('portal:refresh', reload);
  }, [reload]);
  return list;
}

const dayWord = (d: number) => (d === 0 ? 'today' : d === 1 ? 'day 1' : `day ${d}`);

// ── sidebar tray ─────────────────────────────────────────────────────────

const TRAY_KEY = 'podlab:potato-tray';

export function PotatoTray({ onNavigate }: { onNavigate: () => void }) {
  const potatoes = usePotatoes();
  // Open by default; folding it is a per-browser preference.
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(TRAY_KEY) === 'closed') setOpen(false);
    } catch {}
  }, []);
  const toggle = () =>
    setOpen((o) => {
      try {
        localStorage.setItem(TRAY_KEY, o ? 'closed' : 'open');
      } catch {}
      return !o;
    });
  if (!potatoes || !potatoes.length) return null;
  const mine = potatoes.filter((p) => p.holder === 'client');
  const ours = potatoes.filter((p) => p.holder === 'team');
  const row = (p: Potato) => (
    <li key={p.key}>
      <Link href={p.href} onClick={onNavigate} className="group flex items-center gap-2.5 py-1.5" title={`${HEAT_LABEL[p.heat]} · ${p.why}`}>
        <PotatoIcon heat={p.heat} size={20} />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[15px] text-p-ink/90 group-hover:text-p-brandink">{p.title}</span>
          <span className="block break-words text-[13px] text-p-ink/65">
            {p.holder === 'team' ? `${p.who} · ` : ''}
            {p.why} · {dayWord(p.days)}
          </span>
        </span>
      </Link>
    </li>
  );
  const hottest = potatoes[0];
  return (
    <div className="mx-4 mt-3 border border-p-line bg-p-card px-4 py-3">
      <button onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-2 text-left">
        <span className="portal-label flex-1 !text-[12px] text-[#ff8a1f]">Hot potatoes</span>
        {!open && (
          <span className="flex items-center gap-1.5">
            <PotatoIcon heat={hottest.heat} size={16} />
            <span className="portal-label !text-[11px] text-p-ink/75">
              {mine.length} on you{ours.length ? ` · ${ours.length} on us` : ''}
            </span>
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={`shrink-0 text-p-ink/70 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
      <>
      {mine.length > 0 && (
        <>
          <p className="portal-label mt-2.5 !text-[11px] text-p-ink/65">On you · {mine.length}</p>
          <ul>{mine.slice(0, 4).map(row)}</ul>
        </>
      )}
      {ours.length > 0 && (
        <>
          <p className="portal-label mt-2.5 !text-[11px] text-p-ink/65">On PodLab · {ours.length}</p>
          <ul>{ours.slice(0, 4).map(row)}</ul>
        </>
      )}
      {!mine.length && <p className="mt-2 text-[14px] text-p-ink/70">Nothing on you. The ball is in our court.</p>}
      </>
      )}
    </div>
  );
}

// ── the smoke ────────────────────────────────────────────────────────────

const PUFFS = [
  { left: '-10%', top: '10%', size: 70, delay: 0 },
  { left: '30%', top: '-15%', size: 80, delay: 2.2 },
  { left: '65%', top: '20%', size: 75, delay: 4.1 },
  { left: '5%', top: '55%', size: 85, delay: 1.3 },
  { left: '50%', top: '60%', size: 90, delay: 3.4 },
  { left: '80%', top: '-5%', size: 60, delay: 5.6 },
  { left: '-5%', top: '80%', size: 70, delay: 6.8 },
  { left: '70%', top: '75%', size: 80, delay: 7.5 },
];

/**
 * Day 7+: smoke rolls over the whole portal. It parts around the one button
 * that passes the potato. "Wave it away" clears it for this visit; it's back
 * next session until the potato moves. TipTop stays reachable above it.
 */
export function PotatoSmoke() {
  const potatoes = usePotatoes();
  const pathname = usePathname();
  const [waved, setWaved] = useState<string | null>(null);

  const target = potatoes?.find((p) => p.holder === 'client' && p.heat === 'smoke') ?? null;
  const key = target ? `podlab:smoke:${target.key}` : null;

  useEffect(() => {
    if (!key) return;
    try {
      setWaved(sessionStorage.getItem(key) ? key : null);
    } catch {
      setWaved(null);
    }
  }, [key]);

  // On the page where they'd act, the smoke would only be in the way.
  const onIt = target && target.href !== '/portal' && pathname.startsWith(target.href.split('#')[0]);
  if (!target || !key || waved === key || onIt) return null;

  const wave = () => {
    try {
      sessionStorage.setItem(key, '1');
    } catch {}
    setWaved(key);
  };

  return (
    <div className="potato-smoke-screen fixed inset-0 z-[55] overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="potato-smoke-title">
      <div
        className="absolute inset-0 bg-[#111]/[0.86]"
        style={{
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 0, transparent 170px, black 360px)',
          maskImage: 'radial-gradient(circle at 50% 50%, transparent 0, transparent 170px, black 360px)',
        }}
      >
        {PUFFS.map((p, i) => (
          <span
            key={i}
            className="potato-smoke-puff absolute rounded-full"
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}vmax`,
              height: `${p.size}vmax`,
              animationDelay: `${p.delay}s`,
              background: 'radial-gradient(circle, rgba(175,175,175,.72) 0%, rgba(120,120,120,.38) 40%, transparent 70%)',
              filter: 'blur(18px)',
            }}
          />
        ))}
      </div>

      <div className="relative flex h-full items-center justify-center px-4">
        <div className="w-full max-w-sm border border-[#ff8a1f]/40 bg-p-paper/95 p-6 text-center shadow-[0_0_80px_rgba(255,106,19,.25)]">
          <div className="flex justify-center">
            <PotatoIcon heat="smoke" size={72} />
          </div>
          <p className="portal-label mt-4 !text-[12px] text-[#ff8a1f]">Hot potato · {dayWord(target.days)}</p>
          <h2 id="potato-smoke-title" className="mt-2 text-2xl font-bold leading-tight text-p-ink">
            {target.title}
          </h2>
          <p className="mt-2 text-base text-p-ink/80">
            This one has been on you for {target.days} days and it&apos;s smoking up the place. {target.why}.
          </p>
          <Link
            href={target.href}
            onClick={wave}
            className="portal-label mt-5 inline-flex w-full items-center justify-center bg-p-brand px-5 py-3.5 !text-[13px] text-black transition hover:bg-p-pop"
          >
            Pass the potato
          </Link>
          <button onClick={wave} className="portal-label mt-3 !text-[12px] text-p-ink/70 transition hover:text-p-ink">
            Wave the smoke away for now
          </button>
        </div>
      </div>
    </div>
  );
}

/** Mobile top bar: the hottest potato on the client and how many they hold. Opens the menu. */
export function PotatoBadge({ onOpen }: { onOpen: () => void }) {
  const potatoes = usePotatoes();
  const mine = potatoes?.filter((p) => p.holder === 'client') ?? [];
  if (!mine.length) return null;
  return (
    <button onClick={onOpen} aria-label={`${mine.length} hot potato${mine.length === 1 ? '' : 'es'} on you`} className="flex h-10 items-center gap-1.5 border border-p-line px-2.5">
      <PotatoIcon heat={mine[0].heat} size={20} />
      <span className="portal-label !text-[12px] text-p-ink/85">{mine.length}</span>
    </button>
  );
}
