'use client';

import { useEffect, useState } from 'react';
import { usePortal } from '@/lib/portal-data';
import { portalCall } from '@/lib/portal/browser';
import { PageHeader, EmptyState } from '@/components/portal/Shared';
import BrandManager from '@/components/portal/BrandManager';
import OnboardingBanner from '@/components/portal/OnboardingBanner';
import AssetsLibraryView from '@/components/portal/AssetsLibraryView';
import type { AssetsLibrary, LibraryDoc } from '@/lib/portal/assets-library';

/** Assets tab: the library the team works from. */
export default function AssetsPage() {
  const { loading, client, isStaff } = usePortal();
  const [library, setLibrary] = useState<AssetsLibrary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    const load = () =>
      portalCall<{ library: AssetsLibrary }>('/api/portal/assets', 'GET')
        .then((r) => setLibrary(r.library))
        .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your assets.'));
    load();
    window.addEventListener('portal:refresh', load);
    return () => window.removeEventListener('portal:refresh', load);
  }, [client]);

  async function openDoc(d: LibraryDoc) {
    if (!d.versionId) {
      if (d.url) window.open(d.url, '_blank', 'noopener');
      return;
    }
    setOpening(d.id);
    // Open the tab first so pop-up blockers allow it, then point it at the signed link.
    const tab = window.open('', '_blank');
    try {
      const r = await portalCall<{ url: string; fallback?: string }>(`/api/portal/deliverables?versionId=${encodeURIComponent(d.versionId)}`, 'GET');
      if (tab) tab.location.href = r.url;
      else window.location.href = r.url;
    } catch {
      tab?.close();
      setError('Could not open that file. Try again in a moment.');
    } finally {
      setOpening(null);
    }
  }

  if (loading) return <p className="text-base text-p-ink/70">Loading...</p>;
  if (!client) {
    return (
      <>
        <PageHeader title="Assets" />
        <EmptyState
          title={isStaff ? 'Pick a client' : 'Account not set up yet'}
          body={isStaff ? 'Use View as client on a client to see their Assets tab.' : 'Once PodLab sets up your portal, your library lives here.'}
        />
      </>
    );
  }

  return (
    <div>
      <OnboardingBanner />
      <PageHeader
        eyebrow="Assets"
        title="Everything we build from,"
        accent="in one place."
        subtitle="Your profile, approved documents, brand kit, b-roll and finished videos. Approve something in Projects and it lands here."
      />
      {error && <p className="mb-6 border-l-2 border-p-warn bg-p-warn/5 px-4 py-3 text-base text-p-ink/90">{error}</p>}
      {library ? (
        <AssetsLibraryView
          library={library}
          onOpenDoc={openDoc}
          opening={opening}
          branding={<BrandManager embedded sections={['logos', 'kit']} />}
          broll={<BrandManager embedded sections={['broll']} />}
        />
      ) : (
        !error && <p className="portal-label !text-[12px] text-p-ink/70">Loading your library</p>
      )}
    </div>
  );
}
