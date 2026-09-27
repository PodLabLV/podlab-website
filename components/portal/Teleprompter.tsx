'use client';

/**
 * Teleprompter — validated scripts only.
 *
 * Built for a tablet on a stand at arm's length, which is why the type is huge,
 * the ground is pure black, and the controls are large enough to hit without
 * looking. Auto-scroll runs on requestAnimationFrame at a real pixels-per-second
 * rate rather than a CSS animation, so speed changes take effect immediately
 * instead of restarting the scroll.
 *
 * Spec: PORTAL-EXPERIENCE.md §7.3
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const SPEEDS = [20, 30, 45, 60, 80]; // pixels per second

export default function Teleprompter({
  title,
  body,
  onClose,
}: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);

  // Held in refs so the animation loop never restarts when they change.
  const playingRef = useRef(playing);
  const speedRef = useRef(SPEEDS[speedIdx]);
  playingRef.current = playing;
  speedRef.current = SPEEDS[speedIdx];

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    // Fractional pixels accumulate here; scrollTop is integer-truncated, so
    // without this the slowest speeds would round to zero and never move.
    let carry = 0;

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      if (playingRef.current && scroller.current) {
        carry += speedRef.current * dt;
        const whole = Math.floor(carry);
        if (whole > 0) {
          scroller.current.scrollTop += whole;
          carry -= whole;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const close = useCallback(() => {
    setPlaying(false);
    onClose();
  }, [onClose]);

  // Space toggles, Escape exits — the two things you need without looking down.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <p className="truncate font-display text-[10px] uppercase tracking-widest text-white/40">
          {title}
        </p>
        <button
          onClick={close}
          className="rounded-lg border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/60 hover:border-white/35 hover:text-white"
        >
          Close
        </button>
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto px-6 py-[40vh] sm:px-12">
        <p className="mx-auto max-w-4xl whitespace-pre-wrap text-center text-3xl font-medium leading-[1.6] text-white sm:text-5xl sm:leading-[1.5]">
          {body}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-white/10 px-5 py-4">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="rounded-xl bg-[#2ADD1B] px-8 py-3 text-base font-semibold text-black transition hover:bg-[#85FF78]"
        >
          {playing ? 'Pause' : 'Play'}
        </button>

        <button
          onClick={() => setSpeedIdx((i) => Math.max(0, i - 1))}
          disabled={speedIdx === 0}
          className="rounded-xl border border-white/15 px-4 py-3 text-white/70 disabled:opacity-30"
          aria-label="Slower"
        >
          −
        </button>
        <span className="portal-num w-16 text-center font-mono text-xs text-white/50">
          {SPEEDS[speedIdx]}
        </span>
        <button
          onClick={() => setSpeedIdx((i) => Math.min(SPEEDS.length - 1, i + 1))}
          disabled={speedIdx === SPEEDS.length - 1}
          className="rounded-xl border border-white/15 px-4 py-3 text-white/70 disabled:opacity-30"
          aria-label="Faster"
        >
          +
        </button>

        <button
          onClick={() => {
            if (scroller.current) scroller.current.scrollTop = 0;
          }}
          className="rounded-xl border border-white/15 px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-white/50 hover:text-white"
        >
          Top
        </button>
      </div>
    </div>
  );
}
