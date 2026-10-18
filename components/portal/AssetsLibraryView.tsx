'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card, FileMark } from '@/components/portal/Shared';
import type { AssetsLibrary, LibraryDoc } from '@/lib/portal/assets-library';

/**
 * The Assets tab's sections. Pure UI: the page passes the library, the branding
 * and b-roll blocks (the Brand manager), and how to open a document.
 */

interface AssetsLibraryViewProps {
  library: AssetsLibrary;
  branding: ReactNode;
  broll: ReactNode;
  onOpenDoc: (doc: LibraryDoc) => void;
  opening?: string | null;
}

const SECTIONS = [
  ['profile', 'Profile'],
  ['docs', 'Docs'],
  ['branding', 'Branding'],
  ['broll', 'B-roll'],
  ['videos', 'Videos'],
] as const;

function fmt(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function Block({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-p-line pt-10">
      <h2 className="text-2xl font-bold tracking-tight text-p-ink">{title}</h2>
      {hint && <p className="mt-1 max-w-2xl text-base text-p-ink/70">{hint}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-p-line px-5 py-6 text-base text-p-ink/70">{children}</p>;
}

export default function AssetsLibraryView({ library, branding, broll, onOpenDoc, opening }: AssetsLibraryViewProps) {
  const { profile, docs, scripts, videos } = library;

  return (
    <div className="space-y-12">
      <nav aria-label="Asset sections" className="flex flex-wrap gap-2">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="portal-label border border-p-line px-4 py-2.5 !text-[12px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink">
            {label}
          </a>
        ))}
      </nav>

      <Block
        id="profile"
        title="Your business, in one place"
        hint={
          profile.source === 'assetslab'
            ? `From your approved AssetsLab${profile.approvedAt ? `, ${fmt(profile.approvedAt)}` : ''}. Every script and edit is built from this.`
            : 'From your intake. Once you approve your AssetsLab, its sharper version replaces this.'
        }
      >
        {profile.fields.length ? (
          <dl className="grid gap-px border border-p-line bg-p-line md:grid-cols-2">
            {profile.fields.map((f) => (
              <div key={f.label} className="bg-p-card p-5">
                <dt className="portal-label !text-[11px] text-p-brandink">{f.label}</dt>
                <dd className="mt-2 whitespace-pre-line break-words text-base leading-relaxed text-p-ink/90">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <Empty>
            Nothing here yet.{' '}
            {!library.onboardingDone && (
              <Link href="/portal/welcome" className="text-p-brandink underline-offset-4 hover:underline">
                Finish onboarding
              </Link>
            )}{' '}
            and your profile fills in.
          </Empty>
        )}
        {profile.source && (
          <Link href="/portal/welcome" className="portal-label mt-4 inline-block !text-[12px] text-p-ink/70 hover:text-p-brandink">
            Update your answers
          </Link>
        )}
      </Block>

      <Block id="docs" title="Docs" hint="Strategy documents and scripts you've approved. The team works from these.">
        <Card className="divide-y divide-p-line">
          {library.clarity.available && (
            <Link href="/portal/document" className="flex items-center gap-4 p-5 transition hover:bg-p-ink/[0.02]">
              <FileMark type="LINK" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-p-ink">Clarity Document</span>
                <span className="block text-sm text-p-ink/70">Your strategy, with comments</span>
              </span>
            </Link>
          )}
          {docs.map((d) => (
            <button key={d.id} onClick={() => onOpenDoc(d)} className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-p-ink/[0.02]">
              <FileMark type={d.fileType} />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-p-ink">{d.title}</span>
                <span className="block text-sm text-p-ink/70">
                  {[d.lab, d.approvedAt ? `Approved ${fmt(d.approvedAt)}` : null].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="portal-label shrink-0 !text-[11px] text-p-brandink">{opening === d.id ? 'Opening' : 'Open'}</span>
            </button>
          ))}
          {scripts.map((s) => (
            <Link key={s.href} href={s.href} className="flex items-center gap-4 p-5 transition hover:bg-p-ink/[0.02]">
              <FileMark type="LINK" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-p-ink">{s.title}</span>
                <span className="block text-sm text-p-ink/70">Script approved{s.at ? ` · ${fmt(s.at)}` : ''}</span>
              </span>
            </Link>
          ))}
          {!library.clarity.available && !docs.length && !scripts.length && (
            <p className="p-5 text-base text-p-ink/70">Your AssetsLab and other documents land here once you approve them in Projects.</p>
          )}
        </Card>
      </Block>

      <Block id="branding" title="Branding" hint="Logos, colors, fonts and your style guide. Editors brand every video from this.">
        {branding}
      </Block>

      <Block id="broll" title="B-roll" hint="Footage of your space, your team and your work. It goes straight to your PodLab folder.">
        {broll}
      </Block>

      <Block id="videos" title="Finished videos" hint="Everything approved or posted.">
        {videos.length ? (
          <Card className="divide-y divide-p-line">
            {videos.map((v, i) => (
              <div key={`${v.title}-${i}`} className="flex items-center gap-4 p-5">
                <FileMark type="VIDEO" />
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold text-p-ink">{v.title}</span>
                  <span className="block text-sm text-p-ink/70">{[v.detail, fmt(v.at)].filter(Boolean).join(' · ')}</span>
                </span>
                <Link href={v.href} className="portal-label shrink-0 !text-[11px] text-p-brandink">
                  Watch
                </Link>
              </div>
            ))}
          </Card>
        ) : (
          <Empty>Approved and posted videos collect here.</Empty>
        )}
      </Block>
    </div>
  );
}
