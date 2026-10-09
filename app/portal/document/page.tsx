'use client';

import { useEffect, useState } from 'react';
import { usePortal, formatDate, type PortalComment } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState, StatusBadge } from '@/components/portal/Shared';
import DocumentHistory from '@/components/portal/DocumentHistory';

/** Matches the deliverable's own section numbering so notes are unambiguous. */
const SECTIONS = [
  'General',
  '01 Brand Voice DNA',
  '02 Mission, Vision & Core Values',
  '03 Ideal Client Avatar',
  '04 Dialed-In Core Offer',
  '05 Customer Journey Map',
  '06 Market Research',
  '07 Website Analysis',
  '08 Positioning & Competitive Brief',
  '09 50 Hooks',
  '10 Content Pillars',
  '11 Internal DNA',
  '12 Three Immediate Action Steps',
  '13 90-Day Roadmap',
];

export default function DocumentPage() {
  const { loading, client, comments, addComment, accessToken } = usePortal();
  // The document is private: fetch a short-lived signed link for this client.
  const [docUrl, setDocUrl] = useState<string | null>(null);
  // Bumped when the document changes (a restore here, or an edit by TipTop) to re-mint the link.
  const [docRev, setDocRev] = useState(0);
  useEffect(() => {
    const bump = () => setDocRev((n) => n + 1);
    window.addEventListener('portal:document-changed', bump);
    return () => window.removeEventListener('portal:document-changed', bump);
  }, []);
  useEffect(() => {
    if (!client?.document_url || !accessToken) return;
    let alive = true;
    fetch('/api/portal/document-link', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { url: null }))
      .then((j: { url: string | null }) => { if (alive) setDocUrl(j.url); })
      .catch(() => { if (alive) setDocUrl(null); });
    return () => { alive = false; };
  }, [client?.document_url, accessToken, docRev]);
  const [section, setSection] = useState(SECTIONS[0]);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (loading) return <p className="text-p-ink/40 text-sm">Loading...</p>;

  if (!client) {
    return (
      <>
        <PageHeader title="Clarity Document" />
        <EmptyState
          title="Nothing published yet"
          body="Your strategy document will appear here once it is ready."
        />
      </>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken ?? ''}`,
        },
        body: JSON.stringify({ section, body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save that.');
      addComment(json.comment as PortalComment);
      setBody('');
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Clarity Document"
        subtitle="Your full AssetsLab deliverable. Read it here, and flag anything you want changed."
      />

      {client.document_url ? (
        <Card className="overflow-hidden mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-p-ink/10">
            <p className="font-display text-[10px] uppercase tracking-widest text-p-ink/40">
              Business DNA — Clarity Document
            </p>
            <a
              href={docUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-p-brandink text-xs hover:underline"
            >
              Open full screen
            </a>
          </div>
          <div className="overflow-x-auto bg-p-card">
            <iframe
              src={docUrl ?? 'about:blank'}
              title="Clarity Document"
              className="block w-full border-0"
              style={{ minWidth: 880, height: '80vh' }}
            />
          </div>
        </Card>
      ) : (
        <EmptyState
          title="Document not attached"
          body="Your deliverable has not been linked to this portal yet. Let us know and we will publish it."
          cta={{ label: 'Email PodLab', href: 'mailto:info@podlablv.com' }}
        />
      )}

      {client.document_url && (
        <DocumentHistory accessToken={accessToken} onChanged={() => window.dispatchEvent(new Event('portal:document-changed'))} />
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-display text-p-ink text-sm uppercase tracking-wider mb-4">
            Request a Change
          </h2>
          <Card className="p-5">
            <form onSubmit={submit}>
              <label className="block font-display text-[10px] uppercase tracking-widest text-p-ink/40 mb-2">
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full bg-p-card border border-p-ink/10 rounded-xl px-3 py-2.5 text-sm text-p-ink mb-4 focus:outline-none focus:border-p-brandink/40"
              >
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <label className="block font-display text-[10px] uppercase tracking-widest text-p-ink/40 mb-2">
                What should change?
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="Be as specific as you like — quote the line you want changed and tell us what it should say instead."
                className="w-full bg-p-card border border-p-ink/10 rounded-xl px-3 py-2.5 text-sm text-p-ink placeholder:text-p-ink/25 resize-y focus:outline-none focus:border-p-brandink/40"
              />

              {error && <p className="text-p-bad text-xs mt-3">{error}</p>}
              {sent && (
                <p className="text-p-brandink text-xs mt-3">
                  Sent. The team has been notified.
                </p>
              )}

              <button
                type="submit"
                disabled={saving || !body.trim()}
                className="mt-4 w-full px-5 py-2.5 rounded-xl bg-p-brand text-black text-sm font-semibold hover:bg-p-brand/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Sending...' : 'Send to PodLab'}
              </button>
            </form>
          </Card>
        </div>

        <div>
          <h2 className="font-display text-p-ink text-sm uppercase tracking-wider mb-4">
            Your Notes
          </h2>
          {comments.length === 0 ? (
            <EmptyState
              title="No change requests yet"
              body="Anything you send lands here so you can track what you have already flagged."
            />
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-[10px] uppercase tracking-widest text-p-brandink">
                      {c.section || 'General'}
                    </p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-p-ink/80 text-sm mt-2.5 whitespace-pre-wrap leading-relaxed">
                    {c.body}
                  </p>
                  {c.resolution && (
                    <p className="text-p-ink/50 text-xs mt-3 pt-3 border-t border-p-ink/10">
                      <span className="text-p-brandink">PodLab: </span>
                      {c.resolution}
                    </p>
                  )}
                  <p className="text-p-ink/25 text-[11px] mt-3">
                    {formatDate(c.created_at)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
