'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lab } from '@/lib/labs';

interface Props {
  lab: Lab;
  variant: 'priority' | 'locked';
  reason?: string;
  bookHref: string;
}

export default function LabTeaserCard({ lab, variant, reason, bookHref }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (variant !== 'priority') return;
    const v = videoRef.current;
    if (!v) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        } else {
          v.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(v);
    return () => observer.disconnect();
  }, [variant]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  if (variant === 'priority') {
    return (
      <div className="bg-gradient-to-b from-[#1A1A1A] to-[#0F0F0F] border-2 border-[#2ADD1B]/40 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(42,221,27,0.15)]">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-[0.2em] text-[#2ADD1B] uppercase">
              ★ Your Priority Lab
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-wider text-white/40 uppercase">
            🔒 Locked
          </span>
        </div>

        <div className="relative aspect-video bg-black overflow-hidden">
          <video
            ref={videoRef}
            src={`/labs/teasers/${lab.slug}.mp4`}
            poster={`/labs/teasers/${lab.slug}.jpg`}
            muted={muted}
            playsInline
            loop
            preload="metadata"
            className="w-full h-full object-cover cursor-pointer"
            onClick={togglePlay}
          />

          <button
            type="button"
            aria-label={playing ? 'Pause teaser' : 'Play teaser'}
            onClick={togglePlay}
            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              playing ? 'opacity-0 hover:opacity-100' : 'opacity-100'
            }`}
          >
            <span className="w-16 h-16 rounded-full bg-[#2ADD1B] flex items-center justify-center shadow-[0_0_40px_rgba(42,221,27,0.6)]">
              {playing ? (
                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </span>
          </button>

          <button
            type="button"
            aria-label={muted ? 'Unmute teaser' : 'Mute teaser'}
            onClick={toggleMute}
            className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
          >
            {muted ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>

          <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur-sm text-[10px] tracking-wider text-white/80 uppercase">
            {lab.presenter} · {lab.name}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-black text-white">{lab.name}</h3>
            <p className="text-xs text-[#2ADD1B] font-bold tracking-wider uppercase mt-1">
              {lab.subtitle}
            </p>
          </div>

          {reason && (
            <div className="bg-[#2ADD1B]/5 border border-[#2ADD1B]/20 rounded-lg p-3">
              <p className="text-xs text-[#2ADD1B]/90 font-medium leading-relaxed">{reason}</p>
            </div>
          )}

          <p className="text-sm text-white/70 leading-relaxed">{lab.teaser}</p>

          <div className="pt-2 border-t border-white/5">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Outcome</p>
            <p className="text-sm text-white/80">{lab.unlockOutcome}</p>
          </div>

          <a
            href={bookHref}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-6 py-4 bg-[#2ADD1B] text-black text-center text-sm font-black rounded-xl hover:bg-[#85FF78] transition-all uppercase tracking-wider"
          >
            Unlock with Foundation Call →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A]/80 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors">
      <div className="relative aspect-video bg-black overflow-hidden">
        <video
          src={`/labs/teasers/${lab.slug}.mp4`}
          poster={`/labs/teasers/${lab.slug}.jpg`}
          muted
          playsInline
          loop
          preload="none"
          className="w-full h-full object-cover opacity-50"
          onMouseEnter={(e) => {
            const v = e.currentTarget;
            v.play().catch(() => {});
            v.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            const v = e.currentTarget;
            v.pause();
            v.currentTime = 0;
            v.style.opacity = '0.5';
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white/80 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 backdrop-blur-sm text-[9px] tracking-wider text-white/80 uppercase">
          🔒 Locked
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div>
          <h3 className="text-base font-bold text-white">{lab.name}</h3>
          <p className="text-[10px] text-white/50 font-bold tracking-wider uppercase mt-0.5">
            {lab.subtitle}
          </p>
        </div>
        <p className="text-xs text-white/60 leading-relaxed line-clamp-3">{lab.teaser}</p>
        <a
          href={bookHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#2ADD1B] hover:text-[#85FF78] transition-colors mt-1"
        >
          Unlock with Foundation Call →
        </a>
      </div>
    </div>
  );
}
