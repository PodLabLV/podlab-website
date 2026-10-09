'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortal, formatDate } from '@/lib/portal-data';
import { PageHeader, EmptyState } from '@/components/portal/Shared';
import type { SubmissionSection } from '@/app/api/portal/submissions/route';

// What the client told us (application, studio intake, portal intake), and
// where the work built from it lives. Read-only: answers are changed through
// the intake page or by asking the team.
export default function AnswersPage() {
  const { loading, client, accessToken, assets } = usePortal();
  const [sections, setSections] = useState<SubmissionSection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !client) return;
    fetch('/api/portal/submissions', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'Could not load your answers.');
        setSections(json.sections as SubmissionSection[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your answers.'));
  }, [accessToken, client]);

  if (loading || (client && !sections && !error)) return <p className="portal-label !text-[12px] text-p-ink/70">Loading your answers</p>;

  const header = (
    <PageHeader
      eyebrow="Your answers"
      title="What you told us,"
      accent="and what we built."
      subtitle="Everything we make for you starts here. If something has changed since you wrote it, tell us. It changes the work."
    />
  );

  if (!client || error || !sections || sections.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title={error ? 'Could not load your answers' : 'Nothing on file yet'}
          body={error ?? 'Your application and intake answers show here once they are linked to your account.'}
          cta={{ label: 'Open the intake', href: '/portal/intake' }}
        />
      </>
    );
  }

  return (
    <div>
      {header}

      <div className="grid gap-px border border-p-line bg-p-line sm:grid-cols-3">
        {[
          { href: '/portal/scripts', label: 'Scripts', body: 'Written from these answers. Review and approve.' },
          { href: '/portal/deliverables', label: 'Deliverables', body: `${assets.length} file${assets.length === 1 ? '' : 's'} built for you so far.` },
          { href: '/portal/document', label: 'Clarity Document', body: 'Your strategy, in full.' },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="group bg-p-paper p-5 transition hover:bg-p-card">
            <span className="portal-label block !text-[12px] text-p-brandink">{l.label}</span>
            <span className="mt-2 block text-base text-p-ink/85 group-hover:text-p-ink">{l.body}</span>
          </Link>
        ))}
      </div>

      {sections.map((sec) => (
        <div key={sec.title} className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <span className="portal-label block text-p-brandink">{sec.title}</span>
            {sec.submittedAt && <span className="portal-label !text-[12px] text-p-ink/65">Submitted {formatDate(sec.submittedAt)}</span>}
          </div>
          <dl className="mt-4 divide-y divide-p-line border-y border-p-line">
            {sec.fields.map((f, i) => (
              <div key={`${f.label}-${i}`} className="grid gap-1 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-6">
                <dt className="text-base text-p-ink/75">{f.label}</dt>
                <dd className="whitespace-pre-wrap text-[17px] leading-relaxed text-p-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      <p className="mt-10 text-base text-p-ink/70">
        Something changed? <a href="mailto:info@podlablv.com" className="text-p-ink/85 hover:text-p-brandink">Tell the team</a> and we will update the work built on it.
      </p>
    </div>
  );
}
