'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { LogoPreview, MediaThumb, Swatches, FontList, FileRow, VARIANT_LABEL, downloadHref } from '@/components/portal/BrandParts';
import { formatBytes, type BrandPayload } from '@/lib/portal/brand';

/**
 * The editors' read-only brand kit. Rendered outside the portal shell (no
 * login): the token in the URL is the credential, and the file links expire
 * in an hour, so the page re-fetches on load rather than caching.
 */
export default function BrandKitSharePage() {
  const { token } = useParams<{ token: string }>();
  const [d, setD] = useState<{ businessName: string; brand: BrandPayload } | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/kit?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? setD(await r.json()) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [token]);

  const shell = (body: React.ReactNode) => (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:py-14">
      <Image src="/portal/podlab-portal-green.png" alt="PodLab Portal" width={720} height={229} unoptimized className="h-auto w-[150px]" />
      {body}
    </div>
  );

  if (missing) return shell(<p className="mt-12 text-p-ink/60">This brand kit link has expired or been replaced. Ask PodLab for the current one.</p>);
  if (!d) return shell(<p className="portal-label mt-12 !text-[9px] text-p-ink/40">Loading the brand kit</p>);

  const { brand } = d;
  const by = (k: string) => brand.assets.filter((a) => a.kind === k);
  const head = (t: string, sub?: string) => (
    <div className="mb-4 mt-12">
      <span className="portal-label block text-p-brandink">{t}</span>
      {sub && <p className="mt-1 text-sm text-p-ink/45">{sub}</p>}
    </div>
  );

  return shell(
    <>
      <div className="mt-10">
        <span className="portal-label block text-p-brandink">Brand kit · for editors</span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-p-ink md:text-4xl">{d.businessName}</h1>
        <p className="mt-3 max-w-2xl text-p-ink/55">Everything the client has given us. Download links refresh each time this page loads; reload if one has expired.</p>
      </div>

      {head('Logos')}
      {by('logo').length ? (
        <div className="grid gap-px border border-p-line bg-p-line sm:grid-cols-2 lg:grid-cols-3">
          {by('logo').map((a) => (
            <div key={a.id} className="bg-p-paper">
              <LogoPreview asset={a} />
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm text-p-ink">{VARIANT_LABEL[a.variant ?? 'other']}</p>
                  <p className="truncate text-xs text-p-ink/35">{a.label || a.filename}</p>
                </div>
                {downloadHref(a) && (
                  <a href={downloadHref(a)!} className="portal-label shrink-0 !text-[9px] text-p-brandink hover:text-p-ink">
                    Download
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-p-ink/40">No logos yet.</p>
      )}

      {head('Colors')}
      {brand.kit.colors.length ? <Swatches colors={brand.kit.colors} /> : <p className="text-sm text-p-ink/40">No colors yet.</p>}

      {head('Fonts')}
      {brand.kit.fonts.length ? <FontList fonts={brand.kit.fonts} /> : <p className="text-sm text-p-ink/40">No fonts named yet.</p>}
      {by('font').length > 0 && (
        <ul className="mt-3 divide-y divide-p-line border border-p-line">
          {by('font').map((a) => (
            <FileRow key={a.id} asset={a} />
          ))}
        </ul>
      )}

      {brand.kit.notes && (
        <>
          {head("Do's and don'ts")}
          <p className="whitespace-pre-wrap border-l-2 border-p-brandink pl-4 text-[15px] leading-relaxed text-p-ink/80">{brand.kit.notes}</p>
        </>
      )}

      {by('guide').length > 0 && (
        <>
          {head('Brand guide')}
          <ul className="divide-y divide-p-line border border-p-line">
            {by('guide').map((a) => (
              <FileRow key={a.id} asset={a} />
            ))}
          </ul>
        </>
      )}

      {head('B-roll', by('broll').length ? `${by('broll').length} items · ${formatBytes(by('broll').reduce((n, a) => n + (a.sizeBytes ?? 0), 0)) || 'links'}` : undefined)}
      {by('broll').length ? (
        <div className="grid gap-px border border-p-line bg-p-line sm:grid-cols-2 lg:grid-cols-3">
          {by('broll').map((a) => (
            <div key={a.id} className="bg-p-paper">
              <MediaThumb asset={a} />
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-p-ink">{a.label || a.filename || 'Link'}</p>
                  <p className="truncate text-xs text-p-ink/35">{[formatBytes(a.sizeBytes), a.uploadedBy].filter(Boolean).join(' · ')}</p>
                </div>
                {downloadHref(a) && (
                  <a href={downloadHref(a)!} target="_blank" rel="noopener noreferrer" className="portal-label shrink-0 !text-[9px] text-p-brandink hover:text-p-ink">
                    {a.externalUrl ? 'Open ↗' : a.driveUrl && !a.url ? 'Open in Drive ↗' : 'Download'}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-p-ink/40">No b-roll yet.</p>
      )}
    </>,
  );
}
