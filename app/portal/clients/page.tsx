'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortal, formatDate } from '@/lib/portal-data';
import { PageHeader, EmptyState } from '@/components/portal/Shared';
import type { StaffClientRow } from '@/app/api/portal/admin/clients/route';

const ACCESS_LABEL: Record<StaffClientRow['access'], string> = {
  active: 'Active',
  invited: 'Invited',
  none: 'No login',
};

function AccessTag({ access }: { access: StaffClientRow['access'] }) {
  const tone =
    access === 'active'
      ? 'border-p-brandink bg-p-brand text-black'
      : access === 'invited'
        ? 'border-p-brandink/50 text-p-brandink'
        : 'border-p-ink/15 text-p-ink/45';
  return <span className={`portal-label inline-block shrink-0 border px-2 py-1 !text-[8.5px] ${tone}`}>{ACCESS_LABEL[access]}</span>;
}

interface Result {
  ok: boolean;
  text: string;
  link?: string;
}

function ClientRow({ c, token, onDone }: { c: StaffClientRow; token: string; onDone: () => void }) {
  const [email, setEmail] = useState(c.email.endsWith('.invalid') ? '' : c.email);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  async function invite() {
    setBusy(true);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch('/api/portal/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clientId: c.id, email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not send that.');
      setResult(
        json.emailed
          ? { ok: true, text: `Emailed to ${json.email} from info@.`, link: json.link }
          : { ok: false, text: 'The email did not send. Copy the link and text it to them.', link: json.link },
      );
      onDone();
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : 'Could not send that.' });
    } finally {
      setBusy(false);
    }
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const when =
    c.access === 'active'
      ? `Last in ${formatDate(c.lastSignInAt)}`
      : c.invitedAt
        ? `Invited ${formatDate(c.invitedAt)}${c.invitedBy ? ` by ${c.invitedBy.split('@')[0]}` : ''}`
        : c.access === 'invited'
          ? 'Login created, never signed in'
          : 'Never invited';

  return (
    <li className="grid gap-4 bg-p-paper p-5 lg:grid-cols-[1.2fr_1.4fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <p className="truncate text-[15px] font-semibold text-p-ink">{c.businessName}</p>
          <AccessTag access={c.access} />
        </div>
        <p className="mt-1 truncate text-xs text-p-ink/45">
          {[c.name, c.planLabel].filter(Boolean).join(' · ') || ' '}
        </p>
        <p className="portal-label mt-2 !text-[8.5px] text-p-ink/30">
          {when} ·{' '}
          <Link href={`/portal/clients/${c.id}`} className="text-p-brandink hover:text-p-ink">
            Manage
          </Link>
          {c.driveFolderUrl && (
            <>
              {' · '}
              <a href={c.driveFolderUrl} target="_blank" rel="noopener noreferrer" className="text-p-brandink hover:text-p-ink">
                Drive ↗
              </a>
            </>
          )}
        </p>
      </div>

      <div>
        <label htmlFor={`email-${c.id}`} className="sr-only">
          Email for {c.businessName}
        </label>
        <input
          id={`email-${c.id}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@company.com"
          className="w-full border border-p-line bg-p-card px-3 py-2.5 text-sm text-p-ink placeholder:text-p-ink/25 focus:border-p-brandink focus:outline-none"
        />
      </div>

      <button
        onClick={invite}
        disabled={busy || !email.trim()}
        className={`portal-label px-5 py-3 !text-[9.5px] transition disabled:cursor-not-allowed disabled:opacity-40 ${
          c.access === 'none' ? 'bg-p-brand text-black hover:bg-p-pop' : 'border border-p-line text-p-ink/70 hover:border-p-brandink hover:text-p-brandink'
        }`}
      >
        {busy ? 'Sending' : c.access === 'none' ? 'Send invite' : 'Send new link'}
      </button>

      {result && (
        <div className={`lg:col-span-3 border-l-2 px-4 py-3 text-sm ${result.ok ? 'border-p-brandink bg-p-brand/5 text-p-ink/80' : 'border-p-warn bg-p-warn/5 text-p-ink/80'}`}>
          <p>{result.text}</p>
          {result.link && (
            <button onClick={() => copy(result.link!)} className="portal-label mt-2 !text-[9px] text-p-brandink hover:text-p-ink">
              {copied ? 'Link copied' : 'Copy the link'}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function StaffClientsPage() {
  const { accessToken, loading } = usePortal();
  const [clients, setClients] = useState<StaffClientRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!accessToken) return;
    fetch('/api/portal/admin/clients', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(r.status === 401 ? 'staff' : json.error || 'Could not load clients.');
        setClients(json.clients as StaffClientRow[]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load clients.'));
  }, [accessToken]);

  useEffect(load, [load]);

  if (loading || (!clients && !error)) return <p className="portal-label !text-[9px] text-p-ink/40">Loading clients</p>;

  if (error) {
    return (
      <>
        <PageHeader title="Clients" />
        <EmptyState
          title={error === 'staff' ? 'Staff only' : 'Could not load clients'}
          body={error === 'staff' ? 'This page is for the PodLab team.' : error}
        />
      </>
    );
  }

  const count = (a: StaffClientRow['access']) => clients!.filter((c) => c.access === a).length;

  return (
    <div>
      <PageHeader
        eyebrow="Staff"
        title="Clients,"
        accent="and who's in."
        subtitle="Send a client their portal invite, or a fresh link if they're locked out. The email goes from info@; if it doesn't land, copy the link and text it."
      />

      <div className="grid grid-cols-3 gap-px border border-p-line bg-p-line">
        {(['active', 'invited', 'none'] as const).map((a) => (
          <div key={a} className="bg-p-paper p-5">
            <p className="portal-label !text-[9px] text-p-ink/40">{ACCESS_LABEL[a]}</p>
            <p className={`mt-3 text-3xl font-bold tracking-tight ${a === 'active' ? 'text-p-brandink' : 'text-p-ink'}`}>{count(a)}</p>
          </div>
        ))}
      </div>

      <ul className="mt-8 divide-y divide-p-line border border-p-line">
        {clients!.map((c) => (
          <ClientRow key={c.id} c={c} token={accessToken!} onDone={load} />
        ))}
      </ul>
    </div>
  );
}
