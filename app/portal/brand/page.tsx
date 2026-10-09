'use client';

/* eslint-disable @next/next/no-img-element */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePortal } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';
import { LogoPreview, MediaThumb, FileRow, VARIANT_LABEL, downloadHref } from '@/components/portal/BrandParts';
import {
  ACCEPT,
  LOGO_VARIANTS,
  NEEDED_LOGOS,
  brandGaps,
  formatBytes,
  type BrandAsset,
  type BrandColor,
  type BrandFont,
  type BrandKind,
  type BrandPayload,
} from '@/lib/portal/brand';

interface Upload {
  key: string;
  kind: BrandKind;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

const FONT_USES = ['Headings', 'Body', 'Accent', 'Logo only'];
const inputCls =
  'w-full border border-[#1a1a1a] bg-black px-3 py-2.5 text-sm text-[#eeeeee] placeholder:text-[#eeeeee]/25 focus:border-[#2add1b] focus:outline-none';
const btnPrimary = 'portal-label bg-[#2add1b] px-5 py-3 !text-[10px] text-black transition hover:bg-[#eeeeee] disabled:cursor-not-allowed disabled:opacity-40';
const btnGhost =
  'portal-label border border-[#1a1a1a] px-4 py-2.5 !text-[9px] text-[#eeeeee]/70 transition hover:border-[#2add1b] hover:text-[#2add1b] disabled:opacity-40';

/** PUT straight to storage with progress; the file never touches our functions. */
function putFile(signedUrl: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anon) xhr.setRequestHeader('apikey', anon);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(xhr.status === 413 ? 'Too big to upload here. Paste a Drive or Dropbox link instead.' : `Upload failed (${xhr.status}).`));
    xhr.onerror = () => reject(new Error('Connection dropped. Try that file again.'));
    xhr.send(file);
  });
}

// Google wants chunks in multiples of 256 KB; 16 MB keeps progress smooth and retries cheap.
const DRIVE_CHUNK = 64 * 256 * 1024;

function drivePut(url: string, body: Blob | null, range: string, onProgress?: (loaded: number) => void): Promise<XMLHttpRequest> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Range', range);
    if (onProgress) xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => resolve(xhr);
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(body);
  });
}

/**
 * Resumable upload straight to the client's Drive folder. A dropped connection
 * asks Google how much arrived and carries on from there, up to six times.
 * Returns the new Drive file id.
 */
async function uploadToDrive(sessionUrl: string, file: File, onProgress: (pct: number) => void): Promise<string> {
  let offset = 0;
  let failures = 0;
  const done = (xhr: XMLHttpRequest) => {
    const id = (JSON.parse(xhr.responseText || '{}') as { id?: string }).id;
    if (!id) throw new Error('Upload finished but Google did not return the file.');
    return id;
  };
  const nextOffset = (xhr: XMLHttpRequest, fallback: number) => {
    const range = xhr.getResponseHeader('Range');
    return range ? Number(range.split('-')[1]) + 1 : fallback;
  };
  while (true) {
    const end = Math.min(offset + DRIVE_CHUNK, file.size);
    try {
      const xhr = await drivePut(sessionUrl, file.slice(offset, end), `bytes ${offset}-${end - 1}/${file.size}`, (loaded) =>
        onProgress(Math.min(99, Math.round(((offset + loaded) / file.size) * 100))),
      );
      if (xhr.status === 200 || xhr.status === 201) return done(xhr);
      if (xhr.status === 308) {
        offset = nextOffset(xhr, end);
        failures = 0;
        continue;
      }
      if (xhr.status === 404 || xhr.status === 410) throw new Error('The upload expired. Try that file again.');
      if (xhr.status < 500) throw new Error(`Google refused the upload (${xhr.status}).`);
    } catch (err) {
      if (err instanceof Error && err.message !== 'network') throw err;
    }
    // Network drop or a 5xx: back off, ask Google where it got to, carry on.
    if (++failures > 6) throw new Error('Connection kept dropping. Try that file again on a steadier connection.');
    await new Promise((r) => setTimeout(r, Math.min(30_000, 1000 * 2 ** failures)));
    try {
      const status = await drivePut(sessionUrl, null, `bytes */${file.size}`);
      if (status.status === 200 || status.status === 201) return done(status);
      if (status.status === 308) offset = nextOffset(status, 0);
    } catch {
      // Still offline; the loop will try again.
    }
  }
}

function Section({ id, title, hint, children, aside }: { id: string; title: string; hint?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="portal-label block text-[#2add1b]">{title}</span>
          {hint && <p className="mt-2 max-w-2xl text-sm text-[#eeeeee]/50">{hint}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function RemoveButton({ onConfirm }: { onConfirm: () => void }) {
  const [ask, setAsk] = useState(false);
  if (!ask)
    return (
      <button onClick={() => setAsk(true)} className="portal-label !text-[9px] text-[#eeeeee]/35 hover:text-red-400">
        Remove
      </button>
    );
  return (
    <span className="portal-label flex items-center gap-2 !text-[9px]">
      <span className="text-[#eeeeee]/50">Remove?</span>
      <button onClick={onConfirm} className="text-red-400 hover:text-[#eeeeee]">
        Yes
      </button>
      <button onClick={() => setAsk(false)} className="text-[#eeeeee]/40 hover:text-[#eeeeee]">
        No
      </button>
    </span>
  );
}

function UploadQueue({ items }: { items: Upload[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-4 space-y-2">
      {items.map((u) => (
        <li key={u.key} className="border border-[#1a1a1a] bg-black px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-[#eeeeee]/80">{u.name}</span>
            <span className={`portal-label shrink-0 !text-[9px] ${u.status === 'error' ? 'text-red-400' : u.status === 'done' ? 'text-[#2add1b]' : 'text-[#eeeeee]/45'}`}>
              {u.status === 'error' ? 'Failed' : u.status === 'done' ? 'Done' : `${u.progress}% · ${formatBytes(u.size)}`}
            </span>
          </div>
          <div className="mt-2 h-px bg-[#1a1a1a]">
            <div className={`h-full transition-all ${u.status === 'error' ? 'bg-red-400' : 'bg-[#2add1b]'}`} style={{ width: `${u.status === 'error' ? 100 : u.progress}%` }} />
          </div>
          {u.error && <p className="mt-2 text-xs text-red-400">{u.error}</p>}
        </li>
      ))}
    </ul>
  );
}

function DropZone({ kind, onFiles, label, sub, disabled }: { kind: BrandKind; onFiles: (f: File[]) => void; label: string; sub: string; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) onFiles(Array.from(e.dataTransfer.files));
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={`flex flex-col items-center justify-center gap-3 border border-dashed px-6 py-10 text-center transition ${
        over ? 'border-[#2add1b] bg-[#2add1b]/5' : 'border-[#eeeeee]/15'
      }`}
    >
      <p className="text-[15px] text-[#eeeeee]">{label}</p>
      <p className="text-xs text-[#eeeeee]/40">{sub}</p>
      <button onClick={() => input.current?.click()} disabled={disabled} className={btnPrimary}>
        Choose files
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </div>
  );
}

function BrandPageInner() {
  const { loading, client, accessToken, isStaff } = usePortal();
  const params = useSearchParams();
  const staffClient = isStaff ? params.get('client') : null;

  const [data, setData] = useState<BrandPayload | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [logoVariant, setLogoVariant] = useState<string>('primary');
  const [colors, setColors] = useState<BrandColor[]>([]);
  const [fonts, setFonts] = useState<BrandFont[]>([]);
  const [notes, setNotes] = useState('');
  const [kitStatus, setKitStatus] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [savingKit, setSavingKit] = useState(false);
  const [link, setLink] = useState({ url: '', label: '' });
  const [flash, setFlash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const qs = staffClient ? `?clientId=${encodeURIComponent(staffClient)}` : '';
  const headers = useMemo(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` }), [accessToken]);

  const api = useCallback(
    async (method: string, body?: object, query = qs) => {
      const res = await fetch(`/api/portal/brand${query}`, {
        method,
        headers,
        body: body ? JSON.stringify({ ...body, clientId: staffClient ?? undefined }) : undefined,
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong.');
      return json;
    },
    [headers, qs, staffClient],
  );

  // Unsaved edits to colors, fonts or notes. A refresh (after an upload, a
  // TipTop change or a silent token refresh) must never overwrite them.
  const edited = useRef(false);
  const fillKit = (b: BrandPayload) => {
    edited.current = false;
    setColors(b.kit.colors);
    setFonts(b.kit.fonts);
    setNotes(b.kit.notes);
  };
  const editColors = (v: BrandColor[]) => {
    edited.current = true;
    setColors(v);
  };
  const editFonts = (v: BrandFont[]) => {
    edited.current = true;
    setFonts(v);
  };
  const editNotes = (v: string) => {
    edited.current = true;
    setNotes(v);
  };

  const load = useCallback(
    async (refillKit = false) => {
      if (!accessToken) return;
      try {
        const j = await api('GET');
        setData(j.brand);
        setShareUrl(j.shareUrl ?? null);
        if (refillKit && !edited.current) fillKit(j.brand);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load your brand page.');
      }
    },
    [accessToken, api],
  );

  useEffect(() => {
    if (isStaff && !staffClient) return;
    load(true);
  }, [load, isStaff, staffClient]);

  async function uploadFiles(kind: BrandKind, files: File[], variant?: string) {
    if (!files.length) return;
    const batch: Upload[] = files.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, kind, name: f.name, size: f.size, progress: 0, status: 'uploading' }));
    setUploads((prev) => [...batch, ...prev.filter((u) => u.status === 'uploading')]);
    const set = (key: string, patch: Partial<Upload>) => setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, ...patch } : u)));

    let ok = 0;
    let bytes = 0;
    // One at a time: phone b-roll is big, and parallel PUTs just split the same pipe.
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const key = batch[i].key;
      try {
        const signed = await api('POST', { intent: 'sign', kind, filename: f.name, sizeBytes: f.size, mimeType: f.type });
        if (signed.target === 'drive') {
          const driveFileId = await uploadToDrive(signed.sessionUrl, f, (pct) => set(key, { progress: pct }));
          await api('POST', { intent: 'register', kind, variant, driveFileId });
        } else {
          await putFile(signed.signedUrl, f, (pct) => set(key, { progress: pct }));
          await api('POST', { intent: 'register', kind, variant, path: signed.path, filename: f.name, sizeBytes: f.size, mimeType: f.type });
        }
        set(key, { status: 'done', progress: 100 });
        ok++;
        bytes += f.size;
      } catch (e) {
        set(key, { status: 'error', error: e instanceof Error ? e.message : 'Upload failed.' });
      }
    }
    if (ok) {
      api('POST', { intent: 'announce', kind, count: ok, sizeBytes: bytes }).catch(() => {});
      await load();
      window.dispatchEvent(new Event('portal:refresh'));
    }
    // Finished rows clear themselves; failures stay so they can be retried.
    setTimeout(() => setUploads((prev) => prev.filter((u) => u.status !== 'done')), 2500);
  }

  async function addLink(kind: BrandKind) {
    setFlash(null);
    try {
      await api('POST', { intent: 'register', kind, externalUrl: link.url, label: link.label });
      api('POST', { intent: 'announce', kind, count: 1 }).catch(() => {});
      setLink({ url: '', label: '' });
      await load();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Could not add that link.');
    }
  }

  async function patchAsset(assetId: string, patch: { label?: string; variant?: string }) {
    try {
      await api('PATCH', { assetId, ...patch });
      await load();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Could not save that.');
    }
  }

  async function remove(assetId: string) {
    try {
      await api('DELETE', undefined, `${qs ? `${qs}&` : '?'}assetId=${encodeURIComponent(assetId)}`);
      await load();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Could not remove that.');
    }
  }

  async function saveKit() {
    setSavingKit(true);
    setKitStatus(null);
    try {
      const j = await api('POST', { intent: 'kit', colors, fonts, notes });
      setData(j.brand);
      fillKit(j.brand);
      setKitStatus({ tone: 'ok', text: 'Saved. Your editors see this now.' });
      window.dispatchEvent(new Event('portal:refresh'));
    } catch (e) {
      setKitStatus({ tone: 'err', text: e instanceof Error ? e.message : 'Could not save that.' });
    } finally {
      setSavingKit(false);
    }
  }

  async function staffShare(intent: 'share' | 'cards', rotate = false) {
    setFlash(null);
    try {
      const j = await api('POST', { intent, rotate });
      setShareUrl(j.shareUrl);
      if (intent === 'cards') setFlash(j.boards ? `Link added to ${j.cards} card${j.cards === 1 ? '' : 's'} on ${j.boards} board${j.boards === 1 ? '' : 's'}.` : 'No production boards are linked to this client yet.');
      else if (rotate) setFlash('New link made. The old one no longer works; run "Put it on their cards" again.');
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Could not do that.');
    }
  }

  // Leaving with unsaved colors or fonts: let the browser ask first.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!edited.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // TipTop may have changed something.
  useEffect(() => {
    const reload = () => load(true);
    window.addEventListener('portal:refresh', reload);
    return () => window.removeEventListener('portal:refresh', reload);
  }, [load]);

  if (loading) return <p className="text-sm text-[#eeeeee]/40">Loading...</p>;
  if (isStaff && !staffClient) {
    return (
      <>
        <PageHeader title="Brand" />
        <EmptyState title="Pick a client" body="Open a client from Clients · staff, then Brand kit, to see or add to their brand page." />
        <Link href="/portal/clients" className={`${btnGhost} mt-6 inline-block`}>
          Go to clients
        </Link>
      </>
    );
  }
  if (!client && !staffClient) {
    return (
      <>
        <PageHeader title="Brand" />
        <EmptyState title="Account not set up yet" body="Once PodLab sets up your portal, you can add your logos and brand kit here." />
      </>
    );
  }
  if (error) {
    return (
      <>
        <PageHeader title="Brand" />
        <EmptyState title="Could not load your brand page" body={error} />
      </>
    );
  }
  if (!data) return <p className="portal-label !text-[9px] text-[#eeeeee]/40">Loading your brand</p>;
  if (!data.ready) {
    return (
      <>
        <PageHeader title="Brand" />
        <EmptyState title="Almost ready" body="The Brand page is being switched on for your account. Check back shortly." />
      </>
    );
  }

  const by = (k: BrandKind) => data.assets.filter((a) => a.kind === k);
  const logos = by('logo');
  const broll = by('broll');
  const haveVariants = new Set(logos.map((l) => l.variant));
  const gaps = brandGaps(data);
  const kitDirty =
    JSON.stringify({ colors: data.kit.colors, fonts: data.kit.fonts, notes: data.kit.notes }) !==
    JSON.stringify({ colors: colors.filter((c) => c.hex.trim()), fonts: fonts.filter((f) => f.name.trim()), notes: notes.trim() });
  const brollBytes = broll.reduce((n, a) => n + (a.sizeBytes ?? 0), 0);
  const brollLinks = broll.filter((a) => a.externalUrl).length;
  const queue = (k: BrandKind) => uploads.filter((u) => u.kind === k);
  const busy = uploads.some((u) => u.status === 'uploading');

  return (
    <div>
      {staffClient && (
        <Link href={`/portal/clients/${staffClient}`} className="portal-label !text-[9px] text-[#eeeeee]/40 transition hover:text-[#2add1b]">
          ← Back to the client
        </Link>
      )}
      <div className={staffClient ? 'mt-6' : ''}>
        <PageHeader
          eyebrow={staffClient ? 'Staff · their brand page' : 'Brand'}
          title="Your brand,"
          accent="in one place."
          subtitle="Logos, colors, fonts and b-roll. Add them once and every editor on your account works from the same kit, so nobody has to ask you twice."
        />
      </div>

      {/* Where they stand */}
      <div className={`border-l-2 px-5 py-4 ${gaps.length ? 'border-yellow-300 bg-yellow-300/5' : 'border-[#2add1b] bg-[#2add1b]/5'}`}>
        <p className="portal-label !text-[9px] text-[#eeeeee]/50">{gaps.length ? 'Still needed' : 'Kit complete'}</p>
        {gaps.length ? (
          <ul className="mt-2 space-y-1 text-sm text-[#eeeeee]/80">
            {gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[#eeeeee]/80">Your editors have everything they need to brand your videos. Keep adding b-roll whenever you have it.</p>
        )}
      </div>

      {staffClient && (
        <Card className="mt-6 p-5">
          <p className="portal-label !text-[9px] text-[#2add1b]">Editor link</p>
          <p className="mt-2 text-sm text-[#eeeeee]/55">A read-only page with this kit and download links. No login needed, so editors outside the portal can use it.</p>
          {shareUrl && <p className="mt-3 break-all font-mono text-xs text-[#eeeeee]/70">{shareUrl}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {shareUrl ? (
              <button
                className={btnGhost}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {}
                }}
              >
                {copied ? 'Copied' : 'Copy editor link'}
              </button>
            ) : (
              <button className={btnGhost} onClick={() => staffShare('share')}>
                Make editor link
              </button>
            )}
            <button className={btnGhost} onClick={() => staffShare('cards')}>
              Put it on their cards
            </button>
            {shareUrl && (
              <button className={btnGhost} onClick={() => staffShare('share', true)}>
                New link (kills the old one)
              </button>
            )}
          </div>
        </Card>
      )}

      {flash && <p className="mt-6 border-l-2 border-[#2add1b] bg-[#2add1b]/5 px-4 py-3 text-sm text-[#eeeeee]/80">{flash}</p>}

      <nav aria-label="Brand sections" className="mt-8 flex flex-wrap gap-2">
        {[
          ['logos', `Logos · ${logos.length}`],
          ['kit', 'Colors, fonts, guide'],
          ['broll', `B-roll · ${broll.length}`],
        ].map(([href, label]) => (
          <a key={href} href={`#${href}`} className={btnGhost}>
            {label}
          </a>
        ))}
      </nav>

      {/* ── Logos */}
      <Section
        id="logos"
        title="Logos"
        hint="PNG with a transparent background or SVG is best. Each logo shows on a light and a dark background, so you can see which versions are missing."
      >
        <div className="mb-5 flex flex-wrap gap-2">
          {NEEDED_LOGOS.map((n) => (
            <span
              key={n.variant}
              title={n.why}
              className={`portal-label border px-3 py-1.5 !text-[9px] ${haveVariants.has(n.variant) ? 'border-[#2add1b] bg-[#2add1b] text-black' : 'border-[#eeeeee]/15 text-[#eeeeee]/45'}`}
            >
              <span className="inline-flex items-center gap-1.5">
                {haveVariants.has(n.variant) && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                )}
                {n.label}
              </span>
            </span>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="grid gap-px border border-[#1a1a1a] bg-[#1a1a1a] sm:grid-cols-2">
            {logos.length === 0 && <p className="bg-black p-6 text-sm text-[#eeeeee]/45 sm:col-span-2">No logos yet. Start with your main logo.</p>}
            {logos.map((a) => (
              <LogoTile key={a.id} asset={a} onPatch={patchAsset} onRemove={remove} />
            ))}
          </div>
          <div>
            <label className="block">
              <span className="portal-label block !text-[9px] text-[#eeeeee]/45">What are you uploading?</span>
              <select value={logoVariant} onChange={(e) => setLogoVariant(e.target.value)} className={`${inputCls} mt-2`}>
                {LOGO_VARIANTS.map((v) => (
                  <option key={v} value={v}>
                    {VARIANT_LABEL[v]}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3">
              <DropZone kind="logo" label="Drop logo files" sub="PNG, SVG, EPS, AI, PDF" onFiles={(f) => uploadFiles('logo', f, logoVariant)} disabled={busy} />
            </div>
          </div>
        </div>
        <UploadQueue items={queue('logo')} />
      </Section>

      {/* ── Kit */}
      <Section id="kit" title="Colors, fonts and guide" hint="The hex codes and font names your editors match. Not sure of the codes? Upload your brand guide and we'll pull them out.">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <p className="portal-label !text-[9px] text-[#eeeeee]/45">Colors</p>
            <ul className="mt-3 space-y-2">
              {colors.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Pick color"
                    value={/^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : '#000000'}
                    onChange={(e) => editColors(colors.map((x, j) => (j === i ? { ...x, hex: e.target.value.toUpperCase() } : x)))}
                    className="h-10 w-10 shrink-0 cursor-pointer border border-[#1a1a1a] bg-black p-0.5"
                  />
                  <input
                    value={c.hex}
                    onChange={(e) => editColors(colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))}
                    placeholder="#2ADD1B"
                    aria-label="Hex code"
                    className={`${inputCls} w-28 shrink-0 font-mono`}
                  />
                  <input
                    value={c.name}
                    onChange={(e) => editColors(colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    placeholder="Name (Primary, Accent…)"
                    aria-label="Color name"
                    className={`${inputCls} min-w-0`}
                  />
                  <button onClick={() => editColors(colors.filter((_, j) => j !== i))} aria-label="Remove color" className="px-2 text-[#eeeeee]/35 hover:text-red-400">
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={() => editColors([...colors, { hex: '', name: '' }])} disabled={colors.length >= 16} className={`${btnGhost} mt-3`}>
              Add a color
            </button>
          </Card>

          <Card className="p-5">
            <p className="portal-label !text-[9px] text-[#eeeeee]/45">Fonts</p>
            <ul className="mt-3 space-y-2">
              {fonts.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    value={f.name}
                    onChange={(e) => editFonts(fonts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    placeholder="Font name"
                    aria-label="Font name"
                    className={`${inputCls} min-w-0`}
                  />
                  <input
                    value={f.use}
                    list="font-uses"
                    onChange={(e) => editFonts(fonts.map((x, j) => (j === i ? { ...x, use: e.target.value } : x)))}
                    placeholder="Used for"
                    aria-label="Used for"
                    className={`${inputCls} w-32 shrink-0`}
                  />
                  <button onClick={() => editFonts(fonts.filter((_, j) => j !== i))} aria-label="Remove font" className="px-2 text-[#eeeeee]/35 hover:text-red-400">
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <datalist id="font-uses">
              {FONT_USES.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <button onClick={() => editFonts([...fonts, { name: '', use: '' }])} disabled={fonts.length >= 8} className={`${btnGhost} mt-3`}>
              Add a font
            </button>
          </Card>
        </div>

        <Card className="mt-6 p-5">
          <label className="block">
            <span className="portal-label block !text-[9px] text-[#eeeeee]/45">Do&apos;s and don&apos;ts</span>
            <textarea
              value={notes}
              onChange={(e) => editNotes(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Never stretch the logo. Green only as an accent. Always say 'The Collected View', never 'TCV'…"
              className={`${inputCls} mt-2 resize-y`}
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button onClick={saveKit} disabled={!kitDirty || savingKit} className={btnPrimary}>
              {savingKit ? 'Saving' : 'Save colors, fonts and notes'}
            </button>
            {kitDirty && !savingKit && <span className="text-sm text-yellow-300">Unsaved changes</span>}
            {kitStatus && (kitStatus.tone === 'err' || !kitDirty) && <span className={`text-sm ${kitStatus.tone === 'ok' ? 'text-[#2add1b]' : 'text-red-400'}`}>{kitStatus.text}</span>}
            {!kitStatus && data.kit.updatedAt && (
              <span className="text-xs text-[#eeeeee]/35">
                Last saved {new Date(data.kit.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {data.kit.updatedBy ? ` by ${data.kit.updatedBy}` : ''}
              </span>
            )}
          </div>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {(['guide', 'font'] as const).map((k) => (
            <div key={k}>
              <p className="portal-label mb-3 !text-[9px] text-[#eeeeee]/45">{k === 'guide' ? 'Brand guide' : 'Font files'}</p>
              {by(k).length > 0 && (
                <ul className="mb-3 divide-y divide-[#1a1a1a] border border-[#1a1a1a]">
                  {by(k).map((a) => (
                    <FileRow key={a.id} asset={a} actions={<RemoveButton onConfirm={() => remove(a.id)} />} />
                  ))}
                </ul>
              )}
              <DropZone
                kind={k}
                label={k === 'guide' ? 'Drop your brand guide' : 'Drop font files'}
                sub={k === 'guide' ? 'PDF, slides, images or a zip' : 'OTF, TTF, WOFF or a zip. Only fonts you have a licence to share.'}
                onFiles={(f) => uploadFiles(k, f)}
                disabled={busy}
              />
              <UploadQueue items={queue(k)} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── B-roll */}
      <Section
        id="broll"
        title="B-roll"
        hint="Your space, your team at work, your product, before-and-afters. Phone footage is fine; shoot it horizontal and hold for five seconds. Large files are fine: they go straight to your PodLab folder and pick up where they left off if your connection drops. For whole folders, paste a link."
        aside={
          broll.length > 0 && (
            <p className="portal-label !text-[9px] text-[#eeeeee]/40">
              {broll.length - brollLinks} file{broll.length - brollLinks === 1 ? '' : 's'}
              {brollBytes ? ` · ${formatBytes(brollBytes)}` : ''}
              {brollLinks ? ` · ${brollLinks} link${brollLinks === 1 ? '' : 's'}` : ''}
            </p>
          )
        }
      >
        <DropZone kind="broll" label="Drop videos and photos" sub="MP4, MOV, JPG, PNG, HEIC. Keep this tab open until every file says Done." onFiles={(f) => uploadFiles('broll', f)} disabled={busy} />
        <UploadQueue items={queue('broll')} />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="Or paste a Google Drive, Dropbox or WeTransfer link" aria-label="Link to b-roll" className={`${inputCls} min-w-0 flex-[2]`} />
          <input value={link.label} onChange={(e) => setLink({ ...link, label: e.target.value })} placeholder="What's in it?" aria-label="What's in the link" className={`${inputCls} min-w-0 flex-1`} />
          <button onClick={() => addLink('broll')} disabled={!link.url.trim()} className={btnPrimary}>
            Add link
          </button>
        </div>

        {broll.length > 0 && (
          <div className="mt-6 grid gap-px border border-[#1a1a1a] bg-[#1a1a1a] sm:grid-cols-2 lg:grid-cols-3">
            {broll.map((a) => (
              <BrollTile key={a.id} asset={a} onPatch={patchAsset} onRemove={remove} team={Boolean(staffClient)} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function LabelInput({ asset, onPatch, placeholder }: { asset: BrandAsset; onPatch: (id: string, p: { label: string }) => void; placeholder: string }) {
  const [v, setV] = useState(asset.label ?? '');
  useEffect(() => setV(asset.label ?? ''), [asset.label]);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() !== (asset.label ?? '') && onPatch(asset.id, { label: v })}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      placeholder={placeholder}
      aria-label="Label"
      className="w-full border-0 border-b border-transparent bg-transparent px-0 py-1 text-sm text-[#eeeeee] placeholder:text-[#eeeeee]/30 focus:border-[#2add1b] focus:outline-none"
    />
  );
}

function LogoTile({ asset, onPatch, onRemove }: { asset: BrandAsset; onPatch: (id: string, p: { label?: string; variant?: string }) => void; onRemove: (id: string) => void }) {
  const href = downloadHref(asset);
  return (
    <div className="bg-black">
      <LogoPreview asset={asset} />
      <div className="space-y-2 p-4">
        <select
          value={asset.variant ?? 'other'}
          onChange={(e) => onPatch(asset.id, { variant: e.target.value })}
          aria-label="Logo type"
          className="w-full border border-[#1a1a1a] bg-black px-2 py-1.5 text-xs text-[#eeeeee]/80 focus:border-[#2add1b] focus:outline-none"
        >
          {LOGO_VARIANTS.map((v) => (
            <option key={v} value={v}>
              {VARIANT_LABEL[v]}
            </option>
          ))}
        </select>
        <LabelInput asset={asset} onPatch={onPatch} placeholder={asset.filename ?? 'Add a note'} />
        <div className="flex items-center justify-between">
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="portal-label !text-[9px] text-[#2add1b] hover:text-[#eeeeee]">
              Download
            </a>
          ) : (
            <span />
          )}
          <RemoveButton onConfirm={() => onRemove(asset.id)} />
        </div>
      </div>
    </div>
  );
}

function BrollTile({ asset, onPatch, onRemove, team }: { asset: BrandAsset; onPatch: (id: string, p: { label?: string }) => void; onRemove: (id: string) => void; team: boolean }) {
  // Big Drive files only open in Drive, which the client isn't a member of.
  const teamOnly = Boolean(asset.driveUrl && !asset.url);
  const href = teamOnly && !team ? null : downloadHref(asset);
  return (
    <div className="bg-black">
      <MediaThumb asset={asset} />
      <div className="space-y-1 p-4">
        <LabelInput asset={asset} onPatch={onPatch} placeholder="What's in it? (office, team, product…)" />
        <p className="truncate text-xs text-[#eeeeee]/35">{[asset.filename, formatBytes(asset.sizeBytes)].filter(Boolean).join(' · ') || asset.externalUrl}</p>
        <div className="flex items-center justify-between pt-1">
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="portal-label !text-[9px] text-[#2add1b] hover:text-[#eeeeee]">
              {asset.externalUrl ? 'Open ↗' : teamOnly ? 'Open in Drive ↗' : 'Download'}
            </a>
          ) : (
            <span className="portal-label !text-[9px] text-[#eeeeee]/35">{asset.driveUrl ? 'In your PodLab folder' : ''}</span>
          )}
          <RemoveButton onConfirm={() => onRemove(asset.id)} />
        </div>
      </div>
    </div>
  );
}

export default function BrandPage() {
  return (
    <Suspense fallback={<p className="portal-label !text-[9px] text-[#eeeeee]/40">Loading your brand</p>}>
      <BrandPageInner />
    </Suspense>
  );
}
