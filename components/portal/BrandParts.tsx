'use client';

/* eslint-disable @next/next/no-img-element -- signed storage URLs expire hourly; next/image would cache them */

import type { ReactNode } from 'react';
import { extOf, formatBytes, isImage, isVideo, type BrandAsset, type BrandColor, type BrandFont } from '@/lib/portal/brand';

export const VARIANT_LABEL: Record<string, string> = {
  primary: 'Main logo',
  icon: 'Icon / mark',
  white: 'White version',
  dark: 'Dark version',
  other: 'Other',
};

/** A signed URL that downloads instead of opening (Supabase honours ?download=). */
export function downloadHref(a: BrandAsset): string | null {
  if (!a.url) return null;
  if (a.externalUrl) return a.url;
  return `${a.url}${a.url.includes('?') ? '&' : '?'}download=${encodeURIComponent(a.filename ?? 'file')}`;
}

function ExtMark({ name }: { name: string | null }) {
  const ext = extOf(name ?? '').toUpperCase() || 'FILE';
  return <span className="portal-label border border-[#eeeeee]/20 px-2 py-1 !text-[9px] text-[#eeeeee]/60">{ext.slice(0, 5)}</span>;
}

/** The logo on a light and a dark ground, side by side, so a missing version is obvious. */
export function LogoPreview({ asset }: { asset: BrandAsset }) {
  const img = asset.url && isImage(asset.filename, asset.mimeType);
  const cell = (bg: string) => (
    <div className={`flex h-28 items-center justify-center p-4 ${bg}`}>
      {img ? <img src={asset.url!} alt="" className="max-h-full max-w-full object-contain" loading="lazy" /> : <ExtMark name={asset.filename} />}
    </div>
  );
  return (
    <div className="grid grid-cols-2 border-b border-[#1a1a1a]">
      {cell('bg-[#f2f2f2]')}
      {cell('bg-black')}
    </div>
  );
}

export function MediaThumb({ asset }: { asset: BrandAsset }) {
  if (asset.externalUrl) {
    let host = 'Link';
    try {
      host = new URL(asset.externalUrl).hostname.replace(/^www\./, '');
    } catch {}
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-black">
        <span className="portal-label border border-[#2add1b]/40 px-2 py-1 !text-[9px] text-[#2add1b]">Link</span>
        <span className="text-xs text-[#eeeeee]/40">{host}</span>
      </div>
    );
  }
  if (asset.url && isImage(asset.filename, asset.mimeType)) {
    return <img src={asset.url} alt="" loading="lazy" className="aspect-video w-full bg-black object-cover" />;
  }
  if (asset.url && isVideo(asset.filename, asset.mimeType)) {
    return <video src={`${asset.url}#t=0.5`} preload="metadata" muted playsInline controls className="aspect-video w-full bg-black object-cover" />;
  }
  return (
    <div className="flex aspect-video items-center justify-center bg-black">
      <ExtMark name={asset.filename} />
    </div>
  );
}

export function Swatches({ colors }: { colors: BrandColor[] }) {
  if (!colors.length) return null;
  return (
    <div className="grid grid-cols-2 gap-px border border-[#1a1a1a] bg-[#1a1a1a] sm:grid-cols-4">
      {colors.map((c, i) => (
        <div key={`${c.hex}-${i}`} className="bg-black">
          <div className="h-16" style={{ backgroundColor: c.hex }} />
          <div className="p-3">
            <p className="font-mono text-sm text-[#eeeeee]">{c.hex}</p>
            {c.name && <p className="mt-0.5 truncate text-xs text-[#eeeeee]/45">{c.name}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FontList({ fonts }: { fonts: BrandFont[] }) {
  if (!fonts.length) return null;
  return (
    <ul className="divide-y divide-[#1a1a1a] border border-[#1a1a1a]">
      {fonts.map((f, i) => (
        <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-4 bg-black px-4 py-3">
          <span className="text-[15px] text-[#eeeeee]">{f.name}</span>
          {f.use && <span className="portal-label !text-[9px] text-[#eeeeee]/40">{f.use}</span>}
        </li>
      ))}
    </ul>
  );
}

/** One row for a guide or font file. `actions` lets the owner page add relabel/remove. */
export function FileRow({ asset, actions }: { asset: BrandAsset; actions?: ReactNode }) {
  const href = downloadHref(asset);
  return (
    <li className="flex flex-wrap items-center gap-3 bg-black px-4 py-3">
      <ExtMark name={asset.filename ?? (asset.externalUrl ? 'link' : null)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[#eeeeee]">{asset.label || asset.filename || asset.externalUrl}</p>
        <p className="text-xs text-[#eeeeee]/35">{[formatBytes(asset.sizeBytes), asset.uploadedBy].filter(Boolean).join(' · ')}</p>
      </div>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className="portal-label !text-[9px] text-[#2add1b] hover:text-[#eeeeee]">
          {asset.externalUrl ? 'Open ↗' : 'Download'}
        </a>
      )}
      {actions}
    </li>
  );
}
