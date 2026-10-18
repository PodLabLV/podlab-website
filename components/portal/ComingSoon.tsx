'use client';

import { PageHeader, EmptyState } from '@/components/portal/Shared';

interface ComingSoonProps {
  title: string;
  accent: string;
  body: string;
  cta?: { label: string; href: string };
}

/** Placeholder for a v2 tab another track is building, so the nav never 404s. */
export default function ComingSoon({ title, accent, body, cta }: ComingSoonProps) {
  return (
    <>
      <PageHeader eyebrow="Coming soon" title={title} accent={accent} />
      <EmptyState title="This tab is on its way" body={body} cta={cta} />
    </>
  );
}
