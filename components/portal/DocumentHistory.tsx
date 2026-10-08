'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/portal/Shared';

interface Version {
  version_no: number;
  author_kind: 'client' | 'staff' | 'ai';
  author_name: string | null;
  note: string | null;
  created_at: string;
}

const WHO: Record<Version['author_kind'], string> = { client: 'You', staff: 'PodLab', ai: 'TipTop' };

function when(iso: string): string {
  const t = new Date(iso);
  return Number.isNaN(t.getTime())
    ? ''
    : t.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Version history for the Clarity Document. Every change (TipTop's, the
 * team's, a restore) is a version; restoring copies an old one forward as the
 * newest, so nothing is ever lost and a restore can itself be undone.
 */
export default function DocumentHistory({ accessToken, onChanged }: { accessToken: string | null; onChanged: () => void }) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/portal/document/versions', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
      const j = res.ok ? await res.json() : { ready: false, versions: [] };
      setReady(Boolean(j.ready));
      setVersions(Array.isArray(j.versions) ? j.versions : []);
    } catch {
      setReady(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
    const again = () => void load();
    window.addEventListener('portal:document-changed', again);
    return () => window.removeEventListener('portal:document-changed', again);
  }, [load]);

  async function restore(versionNo: number) {
    setBusy(versionNo);
    setError(null);
    try {
      const res = await fetch('/api/portal/document/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` },
        body: JSON.stringify({ versionNo }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not restore that.');
      setVersions(Array.isArray(j.versions) ? j.versions : versions);
      setConfirm(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore that.');
    } finally {
      setBusy(null);
    }
  }

  // Before the history table exists, or before the first change, there is nothing to show.
  if (!ready || versions.length === 0) return null;
  const current = versions[0]?.version_no;

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="portal-label text-[#eeeeee]">Version history</h2>
        <p className="text-xs text-[#eeeeee]/40">Restoring never deletes anything. It saves that version as the newest.</p>
      </div>
      <Card>
        <ol className="divide-y divide-[#1a1a1a]">
          {versions.map((v) => (
            <li key={v.version_no} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
              <span className={`portal-label w-10 !text-[10px] ${v.version_no === current ? 'text-[#2add1b]' : 'text-[#eeeeee]/40'}`}>v{v.version_no}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[#eeeeee]">{v.note || 'Edit'}</p>
                <p className="mt-0.5 text-xs text-[#eeeeee]/40">
                  {WHO[v.author_kind] ?? 'PodLab'}
                  {v.author_kind === 'ai' && v.author_name ? ` · ${v.author_name.replace(/^TipTop for /, 'for ')}` : ''} · {when(v.created_at)}
                </p>
              </div>
              {v.version_no === current ? (
                <span className="portal-label !text-[9px] text-[#2add1b]">Current</span>
              ) : confirm === v.version_no ? (
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => restore(v.version_no)}
                    className="portal-label bg-[#2add1b] px-3 py-2 !text-[9px] text-black transition hover:bg-[#eeeeee] disabled:opacity-40"
                  >
                    {busy === v.version_no ? 'Restoring' : `Restore v${v.version_no}`}
                  </button>
                  <button type="button" onClick={() => setConfirm(null)} className="portal-label px-2 py-2 !text-[9px] text-[#eeeeee]/50 hover:text-[#eeeeee]">
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirm(v.version_no)}
                  className="portal-label border border-[#1a1a1a] px-3 py-2 !text-[9px] text-[#eeeeee]/70 transition hover:border-[#2add1b] hover:text-[#2add1b]"
                >
                  Restore
                </button>
              )}
            </li>
          ))}
        </ol>
      </Card>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </section>
  );
}
