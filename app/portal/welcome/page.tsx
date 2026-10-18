'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePortal } from '@/lib/portal-data';
import { portalCall } from '@/lib/portal/browser';
import { uploadToDrive } from '@/lib/portal/drive-upload';
import { PageHeader, EmptyState } from '@/components/portal/Shared';
import BrandManager from '@/components/portal/BrandManager';
import OnboardingFlow, { type OnboardingApi } from '@/components/portal/OnboardingFlow';
import type { OnboardingState } from '@/lib/portal/onboarding-server';

/** First-login onboarding: AssetsLab intake → branding → confirm. Not a tab. */
export default function WelcomePage() {
  const { loading, client, isStaff } = usePortal();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    portalCall<{ onboarding: OnboardingState }>('/api/portal/onboarding', 'GET')
      .then((r) => setState(r.onboarding))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your onboarding.'));
  }, [client]);

  const api: OnboardingApi = useMemo(
    () => ({
      save: async (p) => {
        await portalCall('/api/portal/onboarding', 'POST', { intent: 'save', ...p });
      },
      brandMode: async (mode) => {
        await portalCall('/api/portal/onboarding', 'POST', { intent: 'brand-mode', mode });
      },
      submit: async () => {
        const r = await portalCall<{ queued: string[] }>('/api/portal/onboarding', 'POST', { intent: 'submit' });
        window.dispatchEvent(new Event('portal:refresh'));
        return r;
      },
      upload: async (questionId, file, onProgress) => {
        const s = await portalCall<{ target: 'drive' | 'none'; sessionUrl?: string }>('/api/portal/onboarding', 'POST', {
          intent: 'upload-session',
          questionId,
          filename: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
        });
        if (s.target !== 'drive' || !s.sessionUrl) return null;
        const driveFileId = await uploadToDrive(s.sessionUrl, file, onProgress);
        const r = await portalCall<{ answers: Record<string, string[]> }>('/api/portal/onboarding', 'POST', { intent: 'upload-register', questionId, driveFileId });
        return r.answers[questionId] ?? [];
      },
    }),
    [],
  );

  if (loading) return <p className="text-base text-p-ink/70">Loading...</p>;
  if (!client) {
    return (
      <>
        <PageHeader title="Welcome" />
        <EmptyState
          title={isStaff ? 'Clients see this on first login' : 'Account not set up yet'}
          body={isStaff ? 'Open a client with View as client to see their onboarding.' : 'Once PodLab sets up your portal, your onboarding starts here.'}
        />
      </>
    );
  }
  if (error) {
    return (
      <>
        <PageHeader title="Welcome" />
        <EmptyState title="Could not load your onboarding" body={error} />
      </>
    );
  }
  if (!state) return <p className="portal-label !text-[12px] text-p-ink/70">Loading your onboarding</p>;
  if (!state.ready) {
    return (
      <>
        <PageHeader title="Welcome" />
        <EmptyState title="Almost ready" body="Onboarding is being switched on for your account. Check back shortly." />
      </>
    );
  }

  return (
    <OnboardingFlow
      initial={state}
      firstName={client.first_name ?? ''}
      api={api}
      brandUpload={<BrandManager embedded sections={['logos', 'kit']} />}
    />
  );
}
