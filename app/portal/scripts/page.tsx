'use client';

/**
 * Scripts index.
 *
 * Grouped so the client's own queue comes first: anything waiting on their
 * notes, then everything else. A founder opening this page should see what
 * they are blocking before they see what we are doing.
 */

import Link from 'next/link';
import { usePortal } from '@/lib/portal-data';
import type { PortalScript } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';
import ScriptStatusBadge from '@/components/portal/ScriptStatusBadge';
import { formatRuntime } from '@/lib/portal/scripts';

export default function ScriptsPage() {
  const { loading, client, scripts, scriptVersions, scriptComments } = usePortal();

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-white/40">
        <span className="portal-stir inline-block h-4 w-4 rounded-full border border-white/10 border-t-[#2ADD1B]" />
        Loading...
      </div>
    );
  }

  if (!client || scripts.length === 0) {
    return (
      <>
        <PageHeader title="Scripts" />
        <EmptyState
          title="No scripts yet"
          body="Every script we write for you lands here — hooks, VSLs, FAQ videos. You read it, leave notes on any line, and validate it when it is right. Nothing gets filmed before you have."
        />
      </>
    );
  }

  const waiting = scripts.filter((s) => (s.status || '').toLowerCase() === 'in review');
  const rest = scripts.filter((s) => (s.status || '').toLowerCase() !== 'in review');

  function Row({ script }: { script: PortalScript }) {
    const current = scriptVersions.find(
      (v) => v.script_id === script.id && v.version_no === script.current_version,
    );
    const open = scriptComments.filter(
      (c) => c.script_id === script.id && c.status === 'open',
    ).length;

    return (
      <Link
        href={`/portal/scripts/${script.id}`}
        className="block rounded-2xl border border-white/10 bg-[#1A1A1A]/80 p-5 backdrop-blur-sm transition hover:border-[#2ADD1B]/30"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-white">{script.title}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/30">
              {[
                script.kind,
                script.lab,
                `v${script.current_version}`,
                current?.runtime_seconds ? formatRuntime(current.runtime_seconds) : null,
                open > 0 ? `${open} open note${open === 1 ? '' : 's'}` : null,
              ]
                .filter(Boolean)
                .join('  ·  ')}
            </p>
          </div>
          <ScriptStatusBadge status={script.status} />
        </div>
      </Link>
    );
  }

  return (
    <>
      <PageHeader title="Scripts" subtitle="Read it, mark it up, validate it before we shoot." />

      {waiting.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="font-display text-sm uppercase tracking-wider text-white">
              Waiting on you
            </h2>
            <span className="portal-num font-mono text-[10px] text-[#FFB020]">{waiting.length}</span>
          </div>
          <div className="space-y-3">
            {waiting.map((s) => (
              <Row key={s.id} script={s} />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-sm uppercase tracking-wider text-white">
            {waiting.length > 0 ? 'Everything else' : 'All scripts'}
          </h2>
          <div className="space-y-3">
            {rest.map((s) => (
              <Row key={s.id} script={s} />
            ))}
          </div>
        </section>
      )}

      {waiting.length === 0 && rest.length > 0 && (
        <Card className="mt-6 border-[#2ADD1B]/20 bg-[#2ADD1B]/[0.05] p-5">
          <p className="text-sm text-white/80">
            Nothing is waiting on you. We will let you know the moment something is ready to read.
          </p>
        </Card>
      )}
    </>
  );
}
