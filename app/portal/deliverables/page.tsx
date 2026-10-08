'use client';

/**
 * Deliverables & Files.
 *
 * Two kinds of row live here. Legacy rows are a title and a url (everything
 * published before versions existed) and render exactly as they always have.
 * Versioned rows carry immutable versions in a private bucket or at an external
 * url, timestamped notes, and the client's approval. Every bucket file opens
 * through a short-lived signed URL minted server-side after an ownership check.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePortal, formatDate, type PortalAsset } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState, FileMark } from '@/components/portal/Shared';
import ScriptStatusBadge from '@/components/portal/ScriptStatusBadge';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { loadAssetReview, portalCall, type AssetReviewData } from '@/lib/portal/browser';
import {
  clock,
  parseClock,
  humanSize,
  unsentClientNotes,
  type AssetReviewFields,
  type PortalAssetComment,
  type PortalAssetVersion,
} from '@/lib/portal/scripts';

type Asset = PortalAsset & AssetReviewFields;

const inputClass =
  'border border-[#1a1a1a] bg-black px-3 py-2.5 text-[15px] text-[#eeeeee] placeholder:text-[#eeeeee]/25 focus:border-[#2add1b] focus:outline-none';
const primaryBtn =
  'portal-label inline-flex items-center justify-center gap-3 bg-[#2add1b] px-5 py-3 !text-[10px] text-black transition hover:bg-[#eeeeee] disabled:cursor-not-allowed disabled:opacity-40';
const ghostBtn =
  'portal-label inline-flex items-center justify-center gap-3 border border-[#1a1a1a] px-5 py-3 !text-[10px] text-[#eeeeee]/75 transition hover:border-[#2add1b] hover:text-[#2add1b] disabled:cursor-not-allowed disabled:opacity-40';

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 4h6v6M20 4L10 14M18 14v6H4V6h6" />
    </svg>
  );
}

async function signedUrl(versionId: string): Promise<{ url: string; external: boolean }> {
  const res = await portalCall<{ url: string | null; external?: boolean }>(
    `/api/portal/deliverables?versionId=${encodeURIComponent(versionId)}`,
    'GET',
  );
  if (!res.url) throw new Error('Could not open that file.');
  return { url: res.url, external: Boolean(res.external) };
}

// ── review panel ────────────────────────────────────────────────────────

interface ReviewPanelProps {
  asset: Asset;
  versions: PortalAssetVersion[];
  comments: PortalAssetComment[];
  onChanged: () => Promise<void>;
}

function ReviewPanel({ asset, versions, comments, onChanged }: ReviewPanelProps) {
  const current = versions[0];
  const isVideo = (asset.file_type || '').toUpperCase() === 'VIDEO';
  const inlineVideo = isVideo && Boolean(current.storage_path);
  const approved = (asset.status || '').toLowerCase() === 'approved';

  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [retried, setRetried] = useState(false);
  const [draft, setDraft] = useState('');
  const [stamp, setStamp] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const notes = useMemo(
    () =>
      comments
        .filter((c) => c.version_id === current.id)
        .sort((a, b) => (a.time_seconds ?? -1) - (b.time_seconds ?? -1) || a.created_at.localeCompare(b.created_at)),
    [comments, current.id],
  );
  const unsent = unsentClientNotes(notes, asset.changes_requested_at);

  const mint = useCallback(async () => {
    try {
      setSrc((await signedUrl(current.id)).url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load the video.');
    }
  }, [current.id]);

  useEffect(() => {
    if (inlineVideo) mint();
  }, [inlineVideo, mint]);

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    setErr(null);
    setFlash(null);
    try {
      await fn();
      await onChanged();
      if (ok) setFlash(ok);
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  function seek(t: number | null) {
    if (t === null || !videoRef.current) return;
    videoRef.current.currentTime = t;
    videoRef.current.play().catch(() => {});
  }

  async function saveNote() {
    let timeSeconds: number | null = null;
    if (isVideo && stamp.trim()) {
      timeSeconds = parseClock(stamp);
      if (timeSeconds === null) {
        setErr('Write the time as 1:23, or leave it blank.');
        return;
      }
    }
    const ok = await run(() =>
      portalCall('/api/portal/deliverables/comments', 'POST', { versionId: current.id, timeSeconds, body: draft.trim() }),
    );
    if (ok) {
      setDraft('');
      setStamp('');
    }
  }

  return (
    <div className="border-t border-[#1a1a1a] p-5 md:p-6">
      {inlineVideo && (
        <div className="mb-5 bg-black">
          {src ? (
            <video
              ref={videoRef}
              src={src}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full bg-black"
              onPause={() => setStamp(clock(videoRef.current?.currentTime ?? 0))}
              onError={() => {
                // A signed URL expires; mint once more before giving up.
                if (!retried) {
                  setRetried(true);
                  mint();
                }
              }}
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center border border-[#1a1a1a]">
              <span className="portal-label !text-[9px] text-[#eeeeee]/35">Loading video</span>
            </div>
          )}
        </div>
      )}

      {current.note && (
        <div className="mb-5 border-l-2 border-[#2add1b] pl-4">
          <span className="portal-label block !text-[9px] text-[#2add1b]">What changed in v{current.version_no}</span>
          <p className="mt-1.5 text-sm leading-relaxed text-[#eeeeee]/75">{current.note}</p>
        </div>
      )}

      <span className="portal-label block !text-[9px] text-[#eeeeee]/45">
        Notes on v{current.version_no}
        {notes.length ? ` · ${notes.length}` : ''}
      </span>
      {notes.length > 0 ? (
        <ul className="mt-3 divide-y divide-[#1a1a1a] border-y border-[#1a1a1a]">
          {notes.map((c) => (
            <li key={c.id} className="flex gap-3 py-3">
              {c.time_seconds !== null ? (
                <button
                  onClick={() => seek(Number(c.time_seconds))}
                  disabled={!inlineVideo}
                  className="portal-label h-fit shrink-0 border border-[#2add1b]/40 px-1.5 py-1 !text-[9px] !tracking-[0.1em] text-[#2add1b] transition enabled:hover:bg-[#2add1b] enabled:hover:text-black"
                  aria-label={`Jump to ${clock(Number(c.time_seconds))}`}
                >
                  {clock(Number(c.time_seconds))}
                </button>
              ) : (
                <span className="portal-label h-fit shrink-0 border border-[#eeeeee]/15 px-1.5 py-1 !text-[9px] text-[#eeeeee]/35">ALL</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#eeeeee]/80">{c.body}</p>
                <p className="portal-label mt-1.5 !text-[8px] text-[#eeeeee]/30">
                  {c.author_kind === 'client' ? c.author_name : `${c.author_name} · PodLab`}
                  {c.status === 'resolved' ? '  ·  Resolved' : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#eeeeee]/40">
          {approved ? 'No notes on this version.' : isVideo ? 'Pause the video where something should change and leave a note. The time fills in for you.' : 'Nothing yet. Open the file, then leave a note here.'}
        </p>
      )}

      {!approved && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {isVideo && (
            <input
              value={stamp}
              onChange={(e) => setStamp(e.target.value)}
              inputMode="numeric"
              placeholder="0:42"
              aria-label="Time in the video"
              className={`${inputClass} w-full sm:w-24`}
            />
          )}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim() && !busy) saveNote();
            }}
            maxLength={4000}
            placeholder={isVideo ? 'What should change at that moment?' : 'What should change?'}
            aria-label="Note"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <button onClick={saveNote} disabled={busy || !draft.trim()} className={ghostBtn}>
            {busy ? 'Saving' : 'Save note'}
          </button>
        </div>
      )}

      {err && <p role="alert" className="mt-4 border-l-2 border-red-500 bg-red-500/5 px-4 py-3 text-sm text-red-300">{err}</p>}
      {flash && <p role="status" className="mt-4 border-l-2 border-[#2add1b] bg-[#2add1b]/5 px-4 py-3 text-sm text-[#eeeeee]/85">{flash}</p>}

      <div className="mt-6 border-t border-[#1a1a1a] pt-5">
        {approved ? (
          <p className="text-sm leading-relaxed text-[#eeeeee]/70">
            <span className="portal-label mr-2 !text-[9px] text-[#2add1b]">Approved</span>
            {asset.approved_by ? `${asset.approved_by} approved v${asset.approved_version ?? current.version_no}` : `v${current.version_no} approved`}
            {asset.approved_at ? ` on ${formatDate(asset.approved_at)}` : ''}.
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => run(() => portalCall('/api/portal/deliverables', 'PATCH', { assetId: asset.id, decision: 'approved' }), `v${current.version_no} approved.`)}
              disabled={busy}
              className={unsent.length ? ghostBtn : primaryBtn}
            >
              Approve v{current.version_no}
            </button>
            {unsent.length > 0 && (
              <button
                onClick={() =>
                  run(
                    () => portalCall('/api/portal/deliverables', 'PATCH', { assetId: asset.id, decision: 'changes requested' }),
                    "Notes sent. We'll post the next version here.",
                  )
                }
                disabled={busy}
                className={primaryBtn}
              >
                Send {unsent.length} note{unsent.length === 1 ? '' : 's'} to PodLab
              </button>
            )}
          </div>
        )}
      </div>

      {versions.length > 1 && (
        <div className="mt-6">
          <span className="portal-label block !text-[9px] text-[#eeeeee]/35">Earlier versions</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {versions.slice(1).map((v) => (
              <button
                key={v.id}
                onClick={async () => {
                  try {
                    window.open((await signedUrl(v.id)).url, '_blank', 'noopener,noreferrer');
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : 'Could not open that file.');
                  }
                }}
                className="portal-label border border-[#1a1a1a] px-3 py-2 !text-[9px] text-[#eeeeee]/50 transition hover:border-[#2add1b] hover:text-[#2add1b]"
              >
                v{v.version_no} · {formatDate(v.created_at)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── one row ─────────────────────────────────────────────────────────────

interface AssetCardProps {
  asset: Asset;
  versions: PortalAssetVersion[];
  comments: PortalAssetComment[];
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
}

function AssetCard({ asset, versions, comments, expanded, onToggle, onChanged }: AssetCardProps) {
  const current = versions[0] ?? null;
  const isVideo = (asset.file_type || '').toUpperCase() === 'VIDEO';
  const [openErr, setOpenErr] = useState<string | null>(null);
  const openNotes = current ? comments.filter((c) => c.version_id === current.id && c.status === 'open').length : 0;

  const legacyReady = !current && (asset.status || '').toLowerCase() === 'ready' && asset.url;
  const meta = [
    asset.lab,
    current ? `v${current.version_no}` : null,
    humanSize(current?.size_bytes ?? null) ?? asset.size_label,
    current ? formatDate(current.created_at) : null,
  ].filter(Boolean);

  async function open() {
    if (!current) return;
    setOpenErr(null);
    // Open the tab synchronously so popup blockers allow it, then point it at the signed URL.
    const tab = window.open('', '_blank');
    try {
      const { url } = await signedUrl(current.id);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (e) {
      tab?.close();
      setOpenErr(e instanceof Error ? e.message : 'Could not open that file.');
    }
  }

  return (
    <Card className={expanded ? 'border-[#2add1b]/40' : ''}>
      <div className="flex items-start gap-4 p-5">
        <FileMark type={asset.file_type} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {meta.length > 0 && <p className="portal-label !text-[9px] text-[#eeeeee]/40">{meta.join('  ·  ')}</p>}
              <p className="mt-1.5 text-base font-semibold leading-snug text-[#eeeeee]">{asset.title}</p>
            </div>
            <ScriptStatusBadge status={asset.status} />
          </div>
          {asset.description && <p className="mt-2 text-sm leading-relaxed text-[#eeeeee]/55">{asset.description}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            {current && !(isVideo && current.storage_path && expanded) && (
              <button onClick={open} className={primaryBtn}>
                {isVideo ? 'Watch' : 'Open'}
                {current.external_url && <ExternalIcon />}
              </button>
            )}
            {legacyReady && (
              <a href={asset.url!} target="_blank" rel="noopener noreferrer" className={primaryBtn}>
                Open <ExternalIcon />
              </a>
            )}
            {current && (
              <button
                onClick={onToggle}
                aria-expanded={expanded}
                className="portal-label !text-[9px] text-[#eeeeee]/50 transition hover:text-[#2add1b]"
              >
                {expanded ? 'Close review' : `Review${openNotes ? ` · ${openNotes} note${openNotes === 1 ? '' : 's'}` : ''}`}
              </button>
            )}
          </div>
          {openErr && <p role="alert" className="mt-3 text-sm text-red-300">{openErr}</p>}
        </div>
      </div>
      {expanded && current && <ReviewPanel asset={asset} versions={versions} comments={comments} onChanged={onChanged} />}
    </Card>
  );
}

// ── page ────────────────────────────────────────────────────────────────

export default function DeliverablesPage() {
  const { loading, client, assets: baseAssets } = usePortal();
  const [review, setReview] = useState<AssetReviewData>({ versions: [], comments: [] });
  // Re-read assets after a decision, since status lives on the row.
  const [assetOverride, setAssetOverride] = useState<Asset[] | null>(null);
  const [lab, setLab] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);

  const assets: Asset[] = assetOverride ?? (baseAssets as Asset[]);

  const refresh = useCallback(async () => {
    const [r, a] = await Promise.all([
      loadAssetReview(),
      getSupabaseBrowser().from('portal_assets').select('*').order('sort_order'),
    ]);
    setReview(r);
    if (!a.error && a.data) setAssetOverride(a.data as Asset[]);
  }, []);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    loadAssetReview().then((r) => {
      if (!cancelled) setReview(r);
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const versionsByAsset = useMemo(() => {
    const m = new Map<string, PortalAssetVersion[]>();
    for (const v of review.versions) m.set(v.asset_id, [...(m.get(v.asset_id) ?? []), v]);
    for (const list of m.values()) list.sort((a, b) => b.version_no - a.version_no);
    return m;
  }, [review.versions]);

  if (loading) return <p className="portal-label !text-[9px] text-[#eeeeee]/40">Loading deliverables</p>;

  const header = (
    <PageHeader
      eyebrow="Deliverables & Files"
      title="Everything we've made,"
      accent="in one place."
      subtitle="Open it, watch it, leave a note at the exact second something should change, and approve it when it's right."
    />
  );

  if (!client || assets.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="No deliverables yet"
          body="Every file we produce for you lands here: strategy documents, video cuts, brand assets. Nothing has been published to your account yet."
          cta={{ label: 'Email PodLab', href: 'mailto:info@podlablv.com' }}
        />
      </>
    );
  }

  const labs = ['All', ...Array.from(new Set(assets.map((a) => a.lab).filter(Boolean) as string[]))];
  const shown = lab === 'All' ? assets : assets.filter((a) => a.lab === lab);
  const waiting = shown.filter((a) => (a.status || '').toLowerCase() === 'in review' && versionsByAsset.has(a.id));
  const rest = shown.filter((a) => !waiting.includes(a));

  const card = (a: Asset) => (
    <AssetCard
      key={a.id}
      asset={a}
      versions={versionsByAsset.get(a.id) ?? []}
      comments={review.comments.filter((c) => c.asset_id === a.id)}
      expanded={openId === a.id}
      onToggle={() => setOpenId(openId === a.id ? null : a.id)}
      onChanged={refresh}
    />
  );

  return (
    <>
      {header}

      {labs.length > 2 && (
        <div className="mb-8 flex flex-wrap gap-px border border-[#1a1a1a] bg-[#1a1a1a] sm:w-fit" role="tablist" aria-label="Filter by Lab">
          {labs.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={lab === l}
              onClick={() => setLab(l)}
              className={`portal-label flex-1 px-4 py-2.5 !text-[9px] transition sm:flex-none ${
                lab === l ? 'bg-[#2add1b] text-black' : 'bg-black text-[#eeeeee]/50 hover:text-[#eeeeee]'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {waiting.length > 0 && (
        <div className="mb-12">
          <div className="flex items-baseline gap-3">
            <span className="portal-label text-yellow-300">Waiting on your review</span>
            <span className="portal-label !text-[9px] text-[#eeeeee]/40">{waiting.length}</span>
          </div>
          <div className="mt-4 grid gap-4">{waiting.map(card)}</div>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          {waiting.length > 0 && <span className="portal-label block text-[#2add1b]">Everything else</span>}
          <div className={`grid gap-4 md:grid-cols-2 ${waiting.length > 0 ? 'mt-4' : ''}`}>
            {rest.map((a) => (
              <div key={a.id} className={openId === a.id ? 'md:col-span-2' : ''}>
                {card(a)}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
