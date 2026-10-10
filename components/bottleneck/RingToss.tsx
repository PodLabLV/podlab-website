'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The ring toss.
 *
 * A marker sweeps the bar; stopping it inside the sweet spot lands the ring.
 * The marker is driven by rAF writing straight to the DOM rather than React
 * state — at 60fps a state update per frame would stall the whole game.
 *
 * Difficulty is a function of `level` (one level per prize won): the window
 * narrows and the sweep speeds up, both clamped so it stays winnable. The
 * sweet spot also moves every throw, so the player is timing a target rather
 * than memorising a spot on the screen.
 */

export interface ThrowResult {
  made: boolean;
  nearMiss: boolean;
}

const BASE_HALF_WIDTH = 0.07;
const MIN_HALF_WIDTH = 0.035;
const BASE_SPEED = 0.95; // sweeps per second
const MAX_SPEED = 1.9;

function difficulty(level: number) {
  return {
    halfWidth: Math.max(MIN_HALF_WIDTH, BASE_HALF_WIDTH * Math.pow(0.88, level)),
    speed: Math.min(MAX_SPEED, BASE_SPEED * Math.pow(1.08, level)),
  };
}

const FLASKS = [0, 1, 2, 3, 4, 5, 6];

export default function RingToss({
  level,
  disabled,
  ringsLanded,
  onResult,
}: {
  level: number;
  disabled: boolean;
  ringsLanded: number;
  onResult: (result: ThrowResult) => void;
}) {
  const [phase, setPhase] = useState<'aiming' | 'flying'>('aiming');
  const [flight, setFlight] = useState<{ made: boolean; target: number } | null>(null);

  const markerRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const sweetRef = useRef(0.5);
  const runningRef = useRef(false);

  const { halfWidth, speed } = difficulty(level);

  // New sweet spot each throw, kept off the edges where the sweep reverses.
  const reseat = useCallback(() => {
    sweetRef.current = 0.2 + Math.random() * 0.6;
    if (zoneRef.current) {
      zoneRef.current.style.left = `${(sweetRef.current - halfWidth) * 100}%`;
      zoneRef.current.style.width = `${halfWidth * 2 * 100}%`;
    }
  }, [halfWidth]);

  useEffect(() => {
    reseat();
  }, [reseat]);

  // Sweep loop.
  useEffect(() => {
    if (disabled || phase !== 'aiming') {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
      return;
    }

    runningRef.current = true;
    const tick = (t: number) => {
      if (!runningRef.current) return;
      if (lastRef.current == null) lastRef.current = t;
      const dt = Math.min(64, t - lastRef.current) / 1000;
      lastRef.current = t;

      posRef.current += dirRef.current * speed * dt;
      if (posRef.current >= 1) {
        posRef.current = 1;
        dirRef.current = -1;
      } else if (posRef.current <= 0) {
        posRef.current = 0;
        dirRef.current = 1;
      }

      if (markerRef.current) {
        markerRef.current.style.left = `${posRef.current * 100}%`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [disabled, phase, speed]);

  const release = useCallback(() => {
    if (disabled || phase !== 'aiming') return;

    const delta = Math.abs(posRef.current - sweetRef.current);
    const made = delta <= halfWidth;
    const nearMiss = !made && delta <= halfWidth * 1.9;

    // Which flask the ring flies at: the one under the sweet spot on a make,
    // a neighbour on a miss so the ring visibly sails past.
    const sweetFlask = Math.min(FLASKS.length - 1, Math.round(sweetRef.current * (FLASKS.length - 1)));
    const target = made
      ? sweetFlask
      : Math.min(FLASKS.length - 1, Math.max(0, sweetFlask + (posRef.current > sweetRef.current ? 1 : -1)));

    setFlight({ made, target });
    setPhase('flying');

    window.setTimeout(() => {
      setPhase('aiming');
      setFlight(null);
      reseat();
      onResult({ made, nearMiss });
    }, 780);
  }, [disabled, phase, halfWidth, onResult, reseat]);

  // Space / enter to throw.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        release();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [release]);

  return (
    <div className="select-none">
      {/* rack */}
      <div className="relative h-44 sm:h-52">
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-2 sm:gap-4 px-2">
          {FLASKS.map((i) => {
            const isTarget = flight?.target === i;
            const ringed = i < Math.min(FLASKS.length, ringsLanded);
            return (
              <div key={i} className="relative" style={{ width: 46 }}>
                {/* landed ring sits on the neck */}
                {ringed && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 rounded-full border-[3px] border-[#d33]"
                    style={{ top: 16, width: 30, height: 9, boxShadow: '0 0 10px rgba(221,51,51,.5)' }}
                  />
                )}
                <svg viewBox="0 0 60 92" className="w-full drop-shadow-[0_0_14px_rgba(42,221,27,0.35)]">
                  <rect
                    x="24"
                    y="4"
                    width="12"
                    height="22"
                    rx="2"
                    fill="none"
                    stroke="rgba(180,255,180,.45)"
                    strokeWidth="2"
                  />
                  <path
                    d="M22 26 C22 40 6 44 6 62 C6 79 18 88 30 88 C42 88 54 79 54 62 C54 44 38 40 38 26 Z"
                    fill="rgba(42,221,27,0.13)"
                    stroke="rgba(180,255,180,.5)"
                    strokeWidth="2"
                  />
                  <path
                    d="M10 58 C10 74 20 84 30 84 C40 84 50 74 50 58 C50 50 44 46 30 46 C16 46 10 50 10 58 Z"
                    fill="rgba(42,221,27,0.42)"
                  />
                  <path d="M25 55 L38 63 L25 71 Z" fill="#9BFF8F" opacity={isTarget ? 1 : 0.85} />
                </svg>
              </div>
            );
          })}
        </div>

        {/* the thrown ring */}
        {flight && (
          <div
            key={`${flight.target}-${flight.made}`}
            className="absolute left-1/2 bottom-0 rounded-full border-[4px] border-[#e23b3b] pointer-events-none"
            style={{
              width: 38,
              height: 38,
              marginLeft: -19,
              boxShadow: '0 0 16px rgba(226,59,59,.6)',
              animation: `${flight.made ? 'ring-hit' : 'ring-sail'} 780ms cubic-bezier(.3,.7,.5,1) forwards`,
              // travel distance toward the chosen flask, in rack-relative units
              ['--dx' as string]: `${(flight.target - (FLASKS.length - 1) / 2) * 54}px`,
            }}
          />
        )}
      </div>

      {/* throw bar */}
      <div className="mt-6">
        <div className="relative h-11 rounded-lg bg-[#111] border border-[#2a2a2a] overflow-hidden">
          {/* sweet spot */}
          <div
            ref={zoneRef}
            className="absolute inset-y-0 bg-accent/25 border-x-2 border-accent"
            style={{ left: '43%', width: '14%' }}
          />
          {/* tick marks */}
          <div className="absolute inset-0 flex justify-between px-1 items-center opacity-25">
            {Array.from({ length: 21 }).map((_, i) => (
              <span key={i} className="block w-px h-3 bg-white/40" />
            ))}
          </div>
          {/* marker */}
          <div
            ref={markerRef}
            className="absolute inset-y-0 w-[3px] -ml-[1.5px] bg-white"
            style={{ left: '0%', boxShadow: '0 0 12px rgba(255,255,255,.9)' }}
          />
        </div>

        <button
          type="button"
          onClick={release}
          disabled={disabled || phase !== 'aiming'}
          className="mt-4 w-full py-4 rounded-lg font-display text-sm uppercase tracking-[0.2em] bg-accent text-black
                     hover:bg-accent-hover active:scale-[.99] transition disabled:opacity-35 disabled:cursor-not-allowed"
        >
          {phase === 'flying' ? 'In the air...' : 'Throw'}
        </button>
        <p className="mt-2 text-center text-[11px] text-text-tertiary">
          Stop the marker inside the green. Spacebar works too.
        </p>
      </div>

      <style>{`
        @keyframes ring-hit {
          0%   { transform: translate(0,0) scale(1) rotateX(0deg); opacity: 1; }
          70%  { transform: translate(calc(var(--dx) * .95), -128px) scale(.82) rotateX(55deg); opacity: 1; }
          100% { transform: translate(var(--dx), -108px) scale(.78) rotateX(78deg); opacity: 1; }
        }
        @keyframes ring-sail {
          0%   { transform: translate(0,0) scale(1) rotate(0deg); opacity: 1; }
          60%  { transform: translate(calc(var(--dx) * 1.3), -142px) scale(.8) rotate(160deg); opacity: 1; }
          100% { transform: translate(calc(var(--dx) * 1.8), -36px) scale(.72) rotate(300deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="ring-hit"], [style*="ring-sail"] { animation-duration: 1ms !important; }
        }
      `}</style>
    </div>
  );
}
