'use client';

/**
 * Watch a cut, jump by chapter, and pin revision notes to the exact moment.
 *
 * Used by Production (videos on the CRM boards) and Deliverables (versioned
 * cuts). Uploaded files and YouTube play inline with a live clock, so pausing
 * fills in the time. Other hosts (Drive, Frame.io, Vimeo) open in a new tab and
 * the client picks the moment by chapter or types it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chapterAt, momentLabel, type Chapter, type VideoSource } from '@/lib/chapters';
import { clock, parseClock } from '@/lib/portal/scripts';

export interface ReviewNote {
  id: string;
  t: number | null;
  body: string;
  author: string;
  fromClient: boolean;
  /** Small trailing tag, e.g. "Resolved" or a date. */
  meta?: string;
}

interface Props {
  source: VideoSource | null;
  chapters: Chapter[];
  notes: ReviewNote[];
  /** Null hides the composer (approved, or read-only). */
  onAddNote: ((t: number | null, body: string) => Promise<void>) | null;
  /** A signed file URL expired; the parent mints a fresh one. */
  onSourceError?: () => void;
  emptyText?: string;
}

// ── YouTube IFrame API, loaded once per page ─────────────────────────────

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(t: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  getPlayerState(): number;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: { videoId: string; playerVars?: Record<string, number | string>; events?: Record<string, (e: { data: number }) => void> },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytLoading: Promise<YTNamespace> | null = null;
function loadYouTube(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytLoading) {
    ytLoading = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT!);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return ytLoading;
}

const inputClass =
  'border border-[#1a1a1a] bg-black px-3 py-2.5 text-[15px] text-[#eeeeee] placeholder:text-[#eeeeee]/25 focus:border-[#2add1b] focus:outline-none';

export default function VideoReview({ source, chapters, notes, onAddNote, onSourceError, emptyText }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytHost = useRef<HTMLDivElement>(null);
  const ytPlayer = useRef<YTPlayer | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [stamp, setStamp] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const inline = source?.kind === 'file' || source?.kind === 'youtube';
  // Keyed on the id, not the object: parents rebuild `source` every render.
  const ytId = source?.kind === 'youtube' ? source.id : null;

  // YouTube: mount the player, and poll its clock while it plays.
  useEffect(() => {
    if (!ytId || !ytHost.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const host = document.createElement('div');
    ytHost.current.replaceChildren(host);
    loadYouTube().then((YT) => {
      if (cancelled) return;
      ytPlayer.current = new YT.Player(host, {
        videoId: ytId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => setDuration(ytPlayer.current?.getDuration() || null),
          onStateChange: (e) => {
            const p = ytPlayer.current;
            if (!p) return;
            if (timer) clearInterval(timer);
            timer = null;
            if (e.data === 1) timer = setInterval(() => setNow(p.getCurrentTime()), 400); // playing
            if (e.data === 2) {
              const t = p.getCurrentTime();
              setNow(t);
              setStamp(clock(t)); // paused: that's the moment
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      ytPlayer.current?.destroy();
      ytPlayer.current = null;
    };
  }, [ytId]);

  const seek = useCallback(
    (t: number) => {
      if (source?.kind === 'file' && videoRef.current) {
        videoRef.current.currentTime = t;
        videoRef.current.play().catch(() => {});
      } else if (source?.kind === 'youtube' && ytPlayer.current) {
        ytPlayer.current.seekTo(t, true);
        ytPlayer.current.playVideo();
      }
      setNow(t);
      setStamp(clock(t));
    },
    [source],
  );

  const sorted = useMemo(
    () => [...notes].sort((a, b) => (a.t ?? -1) - (b.t ?? -1) || a.id.localeCompare(b.id)),
    [notes],
  );
  const activeChapter = chapterAt(chapters, now)?.index ?? -1;
  const span = duration ?? (chapters.length ? chapters[chapters.length - 1].t + 30 : null);
  const stampSeconds = parseClock(stamp);

  async function save() {
    if (!onAddNote) return;
    let t: number | null = null;
    if (stamp.trim()) {
      t = parseClock(stamp);
      if (t === null) {
        setErr('Write the time as 1:23, or leave it blank for a note on the whole video.');
        return;
      }
    }
    setBusy(true);
    setErr(null);
    try {
      await onAddNote(t, draft.trim());
      setDraft('');
      setStamp('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save that note.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Player */}
      {source?.kind === 'file' && (
        <video
          ref={videoRef}
          src={source.url}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-black"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || null)}
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
          onPause={(e) => setStamp(clock(e.currentTarget.currentTime))}
          onError={onSourceError}
        />
      )}
      {source?.kind === 'youtube' && (
        <>
          <div ref={ytHost} className="aspect-video w-full bg-black [&>iframe]:h-full [&>iframe]:w-full" />
          {/* Some videos refuse to embed (owner settings, private links); never leave the client stuck. */}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="portal-label mt-2 inline-block !text-[8.5px] text-[#eeeeee]/35 transition hover:text-[#2add1b]"
          >
            Won&apos;t play here? Open on YouTube ↗
          </a>
        </>
      )}
      {source?.kind === 'link' && (
        <div className="flex flex-col gap-3 border border-[#1a1a1a] bg-[#0a0a0a] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#eeeeee]/60">
            This cut plays on {source.host}. Watch it there, then pick the chapter or type the time for each note.
          </p>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="portal-label inline-flex shrink-0 items-center gap-2 border border-[#2add1b]/50 px-4 py-2.5 !text-[9.5px] text-[#2add1b] transition hover:bg-[#2add1b] hover:text-black"
          >
            Open the cut ↗
          </a>
        </div>
      )}

      {/* Chapter rail: segments sized by length, notes marked where they fall. */}
      {chapters.length > 0 && span && (
        <div className="relative mt-3" aria-hidden="true">
          <div className="flex h-2 gap-0.5">
            {chapters.map((c, i) => {
              const end = chapters[i + 1]?.t ?? span;
              return (
                <span
                  key={c.t}
                  className={`h-full ${i === activeChapter ? 'bg-[#2add1b]' : 'bg-[#1a1a1a]'}`}
                  style={{ flexGrow: Math.max(end - c.t, 1), flexBasis: 0 }}
                />
              );
            })}
          </div>
          {sorted
            .filter((n) => n.t !== null && n.t <= span)
            .map((n) => (
              <span
                key={n.id}
                className={`absolute top-[-3px] h-[14px] w-[2px] ${n.fromClient ? 'bg-[#eeeeee]' : 'bg-[#2add1b]'}`}
                style={{ left: `${Math.min(99.5, ((n.t as number) / span) * 100)}%` }}
              />
            ))}
        </div>
      )}

      {/* Chapters */}
      {chapters.length > 0 && (
        <ol className="mt-4 grid gap-px border border-[#1a1a1a] bg-[#1a1a1a] sm:grid-cols-2">
          {chapters.map((c, i) => {
            const end = chapters[i + 1]?.t ?? Infinity;
            const count = notes.filter((n) => n.t !== null && n.t >= c.t && n.t < end).length;
            return (
              <li key={c.t}>
                <button
                  type="button"
                  onClick={() => (inline ? seek(c.t) : setStamp(clock(c.t)))}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    i === activeChapter ? 'bg-[#2add1b]/[0.08]' : 'bg-black hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="portal-label w-12 shrink-0 !text-[9px] !tracking-[0.1em] text-[#2add1b]">{clock(c.t)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-[#eeeeee]">{c.title}</span>
                  {count > 0 && <span className="portal-label shrink-0 !text-[8.5px] text-[#eeeeee]/40">{count} note{count === 1 ? '' : 's'}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {/* Notes */}
      <span className="portal-label mt-6 block !text-[9px] text-[#eeeeee]/45">
        Notes{notes.length ? ` · ${notes.length}` : ''}
      </span>
      {sorted.length > 0 ? (
        <ul className="mt-3 divide-y divide-[#1a1a1a] border-y border-[#1a1a1a]">
          {sorted.map((n) => (
            <li key={n.id} className="flex gap-3 py-3">
              {n.t !== null ? (
                <button
                  type="button"
                  onClick={() => (inline ? seek(n.t as number) : setStamp(clock(n.t as number)))}
                  className="portal-label h-fit shrink-0 border border-[#2add1b]/40 px-1.5 py-1 !text-[9px] !tracking-[0.1em] text-[#2add1b] transition hover:bg-[#2add1b] hover:text-black"
                  aria-label={`Jump to ${momentLabel(chapters, n.t)}`}
                >
                  {clock(n.t)}
                </button>
              ) : (
                <span className="portal-label h-fit shrink-0 border border-[#eeeeee]/15 px-1.5 py-1 !text-[9px] text-[#eeeeee]/35">All</span>
              )}
              <div className="min-w-0 flex-1">
                {n.t !== null && chapterAt(chapters, n.t) && (
                  <p className="portal-label !text-[8.5px] text-[#eeeeee]/35">{chapterAt(chapters, n.t)!.chapter.title}</p>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#eeeeee]/85">{n.body}</p>
                <p className="portal-label mt-1.5 !text-[8px] text-[#eeeeee]/30">
                  {n.fromClient ? 'You' : `${n.author} · PodLab`}
                  {n.meta ? `  ·  ${n.meta}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#eeeeee]/40">
          {emptyText ?? (inline ? 'Pause where something should change and leave a note. The time and chapter fill in for you.' : 'Pick a chapter or type the time, then say what should change.')}
        </p>
      )}

      {/* Composer */}
      {onAddNote && (
        <div className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex gap-2">
              <input
                value={stamp}
                onChange={(e) => setStamp(e.target.value)}
                inputMode="numeric"
                placeholder="0:42"
                aria-label="Time in the video"
                className={`${inputClass} w-24`}
              />
              {inline && (
                <button
                  type="button"
                  onClick={() => now !== null && setStamp(clock(now))}
                  disabled={now === null}
                  className="portal-label shrink-0 border border-[#1a1a1a] px-3 !text-[9px] text-[#eeeeee]/60 transition hover:border-[#2add1b] hover:text-[#2add1b] disabled:opacity-30"
                >
                  Now
                </button>
              )}
            </div>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && draft.trim() && !busy) save();
              }}
              maxLength={4000}
              placeholder="What should change at that moment?"
              aria-label="Revision note"
              className={`${inputClass} min-w-0 flex-1`}
            />
            <button
              type="button"
              onClick={save}
              disabled={busy || !draft.trim()}
              className="portal-label inline-flex items-center justify-center bg-[#2add1b] px-5 py-3 !text-[10px] text-black transition hover:bg-[#eeeeee] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Saving' : 'Add note'}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#eeeeee]/35">
            {stamp.trim() ? (stampSeconds === null ? 'Write the time as 1:23.' : `Pinned to ${momentLabel(chapters, stampSeconds)}`) : 'No time: the note covers the whole video.'}
          </p>
          {err && <p role="alert" className="mt-2 text-sm text-red-300">{err}</p>}
        </div>
      )}
    </div>
  );
}
