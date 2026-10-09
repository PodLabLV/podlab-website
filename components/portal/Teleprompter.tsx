'use client';

/**
 * Teleprompter for an approved script.
 *
 * Built for a tablet on a stand at arm's length: huge type, pure black, big
 * targets. Scroll runs on requestAnimationFrame at a real pixels-per-second
 * rate, so a speed change applies at once instead of restarting the scroll.
 * Space plays and pauses, arrow keys change speed, Escape closes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SPEEDS = [20, 30, 45, 60, 80, 110]; // px per second

interface TeleprompterProps {
  title: string;
  body: string;
  onClose: () => void;
}

export default function Teleprompter({ title, body, onClose }: TeleprompterProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [mirror, setMirror] = useState(false);

  // Refs so the animation loop never restarts when these change.
  const playingRef = useRef(playing);
  const speedRef = useRef(SPEEDS[speedIdx]);
  playingRef.current = playing;
  speedRef.current = SPEEDS[speedIdx];

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    // scrollTop truncates to whole pixels; carry the fraction or slow speeds never move.
    let carry = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const el = scroller.current;
      if (playingRef.current && el) {
        carry += speedRef.current * dt;
        const whole = Math.floor(carry);
        if (whole > 0) {
          el.scrollTop += whole;
          carry -= whole;
        }
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) setPlaying(false);
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.code === 'Space') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        setSpeedIdx((i) => Math.min(SPEEDS.length - 1, i + 1));
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setSpeedIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    // Lock the page behind so a swipe scrolls the prompter, not the portal.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [close]);

  const ctrl =
    'portal-label flex h-12 min-w-12 items-center justify-center border border-p-line px-4 !text-[10px] text-p-ink/70 transition hover:border-p-brandink hover:text-p-brandink disabled:opacity-30';

  // Portaled to <body>: an ancestor in the portal layout is transformed, which
  // would otherwise trap position:fixed inside the content column.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Teleprompter: ${title}`} className="fixed inset-0 bg-p-paper" style={{ zIndex: 2147483000 }}>
      {/* .portal sets position:relative, so it goes on the inner box, not the fixed one. */}
      <div className="portal flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-p-line px-4 py-3 sm:px-6">
        <p className="portal-label truncate !text-[9px] text-p-ink/40">{title}</p>
        <button onClick={close} className={ctrl}>
          Close
        </button>
      </div>

      {/* Center reading line */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-p-brand/25" aria-hidden="true" />

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-12">
        {/* Padding lives inside the scroller; on the scroller itself it can't shrink and pushes the controls off screen. */}
        <div className="py-[45vh]">
        <p
          className="mx-auto max-w-4xl whitespace-pre-wrap text-center text-[34px] font-semibold leading-[1.5] text-p-ink sm:text-6xl sm:leading-[1.45]"
          style={mirror ? { transform: 'scaleX(-1)' } : undefined}
        >
          {body}
        </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-p-line px-4 py-3 sm:gap-3">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="portal-label flex h-12 min-w-28 items-center justify-center bg-p-brand px-6 !text-[11px] text-black transition hover:bg-p-pop"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={() => setSpeedIdx((i) => Math.max(0, i - 1))} disabled={speedIdx === 0} className={ctrl} aria-label="Slower">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 7h10" /></svg>
        </button>
        <span className="portal-label w-14 text-center !text-[10px] text-p-ink/50" aria-live="polite">
          {speedIdx + 1}/{SPEEDS.length}
        </span>
        <button onClick={() => setSpeedIdx((i) => Math.min(SPEEDS.length - 1, i + 1))} disabled={speedIdx === SPEEDS.length - 1} className={ctrl} aria-label="Faster">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 7h10M7 2v10" /></svg>
        </button>
        <button
          onClick={() => {
            if (scroller.current) scroller.current.scrollTop = 0;
            setPlaying(false);
          }}
          className={ctrl}
        >
          Top
        </button>
        <button onClick={() => setMirror((m) => !m)} aria-pressed={mirror} className={`${ctrl} ${mirror ? '!border-p-brandink !text-p-brandink' : ''}`}>
          Mirror
        </button>
      </div>
      </div>
    </div>,
    document.body,
  );
}
