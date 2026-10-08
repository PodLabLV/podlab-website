'use client';

import { useCallback, useEffect, useState } from 'react';
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
      ? 'border-[#2add1b] bg-[#2add1b] text-black'
      : access === 'invited'
        ? 'border-[#2add1b]/50 text-[#2add1b]'
        : 'border-[#eeeeee]/15 text-[#eeeeee]/45';
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
    <li className="grid gap-4 bg-black p-5 lg:grid-cols-[1.2fr_1.4fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <p className="truncate text-[15px] font-semibold text-[#eeeeee]">{c.businessName}</p>
          <AccessTag access={c.access} />
        </div>
        <p className="mt-1 truncate text-xs text-[#eeeeee]/45">
          {[c.name, c.planLabel].filter(Boolean).join(' · ') || ' '}
        </p>
        <p className="portal-label mt-2 !text-[8.5px] text-[#eeeeee]/30">{when}</p>
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
          className="w-full border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2.5 text-sm text-[#eeeeee] placeholder:text-[#eeeeee]/25 focus:border-[#2add1b] focus:outline-none"
        />
      </div>

      <button
        onClick={invite}
        disabled={busy || !email.trim()}
        className={`portal-label px-5 py-3 !text-[9.5px] transition disabled:cursor-not-allowed disabled:opacity-40 ${
          c.access === 'none' ? 'bg-[#2add1b] text-black hover:bg-[#eeeeee]' : 'border border-[#1a1a1a] text-[#eeeeee]/70 hover:border-[#2add1b] hover:text-[#2add1b]'
        }`}
      >
        {busy ? 'Sending' : c.access === 'none' ? 'Send invite' : 'Send new link'}
      </button>

      {result && (
        <div className={`lg:col-span-3 border-l-2 px-4 py-3 text-sm ${result.ok ? 'border-[#2add1b] bg-[#2add1b]/5 text-[#eeeeee]/80' : 'border-yellow-300 bg-yellow-300/5 text-[#eeeeee]/80'}`}>
          <p>{result.text}</p>
          {result.link && (
            <button onClick={() => copy(result.link!)} className="portal-label mt-2 !text-[9px] text-[#2add1b] hover:text-[#eeeeee]">
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

  if (loading || (!clients && !error)) return <p className="portal-label !text-[9px] text-[#eeeeee]/40">Loading clients</p>;

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

      <div className="grid grid-cols-3 gap-px border border-[#1a1a1a] bg-[#1a1a1a]">
        {(['active', 'invited', 'none'] as const).map((a) => (
          <div key={a} className="bg-black p-5">
            <p className="portal-label !text-[9px] text-[#eeeeee]/40">{ACCESS_LABEL[a]}</p>
            <p className={`mt-3 text-3xl font-bold tracking-tight ${a === 'active' ? 'text-[#2add1b]' : 'text-[#eeeeee]'}`}>{count(a)}</p>
          </div>
        ))}
      </div>

      <ul className="mt-8 divide-y divide-[#1a1a1a] border border-[#1a1a1a]">
        {clients!.map((c) => (
          <ClientRow key={c.id} c={c} token={accessToken!} onDone={load} />
        ))}
      </ul>
    </div>
  );
}
