'use client';

/**
 * Scripts index. The client's own queue comes first: a founder opening this
 * page should see what they are holding up before what we are doing.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePortal } from '@/lib/portal-data';
import { PageHeader, EmptyState } from '@/components/portal/Shared';
import ScriptStatusBadge from '@/components/portal/ScriptStatusBadge';
import { loadScriptIndex, type ScriptIndexData } from '@/lib/portal/browser';
import { formatRuntime, isWaitingOnClient, type PortalScript } from '@/lib/portal/scripts';

interface ScriptRowProps {
  script: PortalScript;
  data: ScriptIndexData;
}

function ScriptRow({ script, data }: ScriptRowProps) {
  const current = data.versions.find((v) => v.script_id === script.id && v.version_no === script.current_version);
  const open = data.openNotes.filter((c) => c.version_id === current?.id).length;
  const meta = [
    script.kind?.toUpperCase(),
    script.lab,
    `v${script.current_version}`,
    current?.runtime_seconds ? `${formatRuntime(current.runtime_seconds)} read` : null,
  ].filter(Boolean);

  return (
    <li>
      <Link
        href={`/portal/scripts/${script.id}`}
        className="group flex flex-col gap-3 py-5 transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-6 sm:px-4"
      >
        <span className="min-w-0 flex-1">
          <span className="portal-label block !text-[9px] text-[#eeeeee]/40">{meta.join('  ·  ')}</span>
          <span className="mt-1.5 block text-base font-semibold text-[#eeeeee] transition group-hover:text-[#2add1b] sm:text-lg">
            {script.title}
          </span>
          {open > 0 && (
            <span className="mt-1 block text-xs text-[#eeeeee]/50">
              {open} open note{open === 1 ? '' : 's'}
            </span>
          )}
        </span>
        <span className="sm:hidden"><ScriptStatusBadge status={script.status} showPlain /></span>
        <span className="hidden sm:block"><ScriptStatusBadge status={script.status} showPlain align="end" /></span>
        <span className="hidden shrink-0 text-[#eeeeee]/30 transition group-hover:translate-x-1 group-hover:text-[#2add1b] sm:block" aria-hidden="true">
          →
        </span>
      </Link>
    </li>
  );
}

export default function ScriptsPage() {
  const { loading: portalLoading, client } = usePortal();
  const [data, setData] = useState<ScriptIndexData | null>(null);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    loadScriptIndex().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  if (portalLoading || (client && !data)) {
    return <p className="portal-label !text-[9px] text-[#eeeeee]/40">Loading scripts</p>;
  }

  if (!client || !data || data.scripts.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Scripts & Revisions" title="Every word," accent="before we shoot it." />
        <EmptyState
          title="No scripts yet"
          body="Every script we write for you lands here: VSLs, hooks, FAQ videos. You read it, leave a note on any line, and approve it when it's right. Nothing gets filmed until you have."
          cta={{ label: 'Email PodLab', href: 'mailto:info@podlablv.com' }}
        />
      </>
    );
  }

  const waiting = data.scripts.filter((s) => isWaitingOnClient(s.status));
  const rest = data.scripts.filter((s) => !isWaitingOnClient(s.status));

  return (
    <>
      <PageHeader
        eyebrow="Scripts & Revisions"
        title="Every word,"
        accent="before we shoot it."
        subtitle="Read it, mark up any line, approve it. What you approve is locked, and it's what goes on the teleprompter."
      />

      {waiting.length > 0 ? (
        <div>
          <div className="flex items-baseline gap-3">
            <span className="portal-label text-yellow-300">Waiting on you</span>
            <span className="portal-label !text-[9px] text-[#eeeeee]/40">{waiting.length}</span>
          </div>
          <ul className="mt-4 divide-y divide-[#1a1a1a] border-y border-[#1a1a1a]">
            {waiting.map((s) => (
              <ScriptRow key={s.id} script={s} data={data} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="border-l-2 border-[#2add1b] pl-5 text-sm leading-relaxed text-[#eeeeee]/70">
          Nothing is waiting on you. The moment a script is ready to read, it shows up here and on your dashboard.
        </p>
      )}

      {rest.length > 0 && (
        <div className="mt-12">
          <span className="portal-label block text-[#2add1b]">{waiting.length > 0 ? 'Everything else' : 'All scripts'}</span>
          <ul className="mt-4 divide-y divide-[#1a1a1a] border-y border-[#1a1a1a]">
            {rest.map((s) => (
              <ScriptRow key={s.id} script={s} data={data} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
