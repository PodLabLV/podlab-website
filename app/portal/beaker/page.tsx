'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePortal } from '@/lib/portal-data';
import { EmptyState } from '@/components/portal/Shared';
import BeakerView from '@/components/portal/BeakerView';
import type { BeakerPayload } from '@/lib/portal/beaker-view';

/** Portal v2 track E: the Beaker tab. Data from /api/portal/beaker; the screen is components/portal/BeakerView. */
export default function BeakerPage() {
  const { accessToken, loading } = usePortal();
  const [data, setData] = useState<BeakerPayload | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'not' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const r = await fetch('/api/portal/beaker', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
      const j = await r.json();
      if (j.beaker === false) return setState('not');
      if (!r.ok) throw new Error(j.error || 'Could not load your Beaker account.');
      setData(j as BeakerPayload);
      setState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your Beaker account.');
      setState('error');
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function post(body: Record<string, unknown> | FormData): Promise<{ ok: boolean; message: string }> {
    const form = body instanceof FormData;
    try {
      const r = await fetch('/api/portal/beaker', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken ?? ''}`, ...(form ? {} : { 'Content-Type': 'application/json' }) },
        body: form ? body : JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) return { ok: false, message: j.error || 'That didn’t go through. Try again.' };
      load();
      return { ok: true, message: String(j.message ?? '') };
    } catch {
      return { ok: false, message: 'That didn’t go through. Check your connection and try again.' };
    }
  }

  if (loading || state === 'loading') return <p className="portal-label !text-[12px] text-p-ink/70">Loading your Beaker account</p>;
  if (state === 'not')
    return (
      <EmptyState
        title="Not a Beaker yet"
        body="Beakers earn 10% when a founder they send becomes a PodLab client. Apply in two minutes; once PodLab approves you, this tab shows your link, your referrals and your money."
        cta={{ label: 'Apply to be a Beaker', href: 'https://podlablv.com/affiliate/apply' }}
      />
    );
  if (state === 'error' || !data) return <EmptyState title="Could not load your Beaker account" body={error ?? 'Try again in a minute.'} />;

  return <BeakerView data={data} onAction={post} />;
}
