'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePortal, formatDate, formatMoney } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState, StatusBadge } from '@/components/portal/Shared';
import TeamAccess from '@/components/portal/TeamAccess';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { exitViewAs, viewAsClientId } from '@/lib/portal/view-as';
import type { TeamMember } from '@/lib/portal/members';

type Field = 'first_name' | 'last_name' | 'business_name' | 'phone' | 'website' | 'timezone';

interface Profile {
  email: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string;
  phone: string | null;
  website: string | null;
  timezone: string | null;
  extendedReady: boolean;
  digestOptOut?: boolean;
  digestReady?: boolean;
}

interface LedgerEntry {
  id: string;
  delta: number;
  reason: string;
  note: string | null;
  expiresOn: string | null;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNo: string | null;
  description: string | null;
  amountCents: number;
  status: string;
  issuedOn: string | null;
  dueOn: string | null;
  paidAt: string | null;
  payUrl: string | null;
  receiptUrl: string | null;
}

interface Account {
  email: string;
  loginEmail: string;
  isOwner: boolean;
  phone: string | null;
  prefs: { ready: boolean; notifyEmail: boolean; notifySms: boolean };
  credits: { ready: boolean; balance: number; ledger: LedgerEntry[] };
  invoices: Invoice[];
}

const FIELDS: Array<{ key: Field; label: string; placeholder: string; type?: string; autoComplete?: string }> = [
  { key: 'first_name', label: 'First name', placeholder: 'First name', autoComplete: 'given-name' },
  { key: 'last_name', label: 'Last name', placeholder: 'Last name', autoComplete: 'family-name' },
  { key: 'business_name', label: 'Business name', placeholder: 'Your business', autoComplete: 'organization' },
  { key: 'phone', label: 'Mobile', placeholder: '(702) 555-0101', type: 'tel', autoComplete: 'tel' },
  { key: 'website', label: 'Website', placeholder: 'yourbusiness.com', type: 'url', autoComplete: 'url' },
  { key: 'timezone', label: 'Timezone', placeholder: 'America/Los_Angeles' },
];

const COMMON_ZONES = ['America/Los_Angeles', 'America/Denver', 'America/Phoenix', 'America/Chicago', 'America/New_York', 'Pacific/Honolulu', 'America/Anchorage'];

const SECTIONS = [
  { id: 'details', label: 'Details' },
  { id: 'login', label: 'Login' },
  { id: 'credits', label: 'Credits' },
  { id: 'payments', label: 'Payments' },
  { id: 'team', label: 'Team' },
  { id: 'notifications', label: 'Notifications' },
];

const FIELD = 'mt-2 w-full border bg-p-paper px-4 py-3 text-[17px] text-p-ink placeholder:text-p-ink/50 focus:outline-none';
const BTN = 'portal-label bg-p-brand px-6 py-3.5 !text-[13px] text-black transition hover:bg-p-pop disabled:cursor-not-allowed disabled:opacity-40';

const REASON: Record<string, string> = {
  purchase: 'Credits bought',
  submission: 'Footage sent to edit',
  refund: 'Refunded',
  adjustment: 'Adjustment',
  expired: 'Expired',
  monthly: 'Monthly credits',
};

function zones(): string[] {
  try {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
    return [...COMMON_ZONES, ...all.filter((z) => !COMMON_ZONES.includes(z))];
  } catch {
    return COMMON_ZONES;
  }
}

function Block({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-p-line pt-10">
      <h2 className="text-2xl font-bold tracking-tight text-p-ink">{title}</h2>
      {hint && <p className="mt-2 max-w-2xl text-base leading-relaxed text-p-ink/75">{hint}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Toggle({ checked, disabled, onChange, label, help }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-p-brand" />
      <span>
        <span className="block text-base leading-relaxed text-p-ink">{label}</span>
        {help && <span className="mt-0.5 block text-sm leading-relaxed text-p-ink/65">{help}</span>}
      </span>
    </label>
  );
}

// ── details (name, phone, business…) ─────────────────────────────────────

function Details({ profile, onSaved, readOnly }: { profile: Profile | null; onSaved: (p: Profile) => void; readOnly: boolean }) {
  const { accessToken } = usePortal();
  const [form, setForm] = useState<Record<Field, string>>({ first_name: '', last_name: '', business_name: '', phone: '', website: '', timezone: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const zoneList = useMemo(zones, []);

  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      business_name: profile.business_name ?? '',
      phone: profile.phone ?? '',
      website: profile.website ?? '',
      timezone: profile.timezone ?? '',
    });
  }, [profile]);

  const dirty = profile && FIELDS.some(({ key }) => (form[key] ?? '').trim() !== ((profile[key] as string | null) ?? '').trim());

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!profile || !dirty || status === 'saving' || readOnly) return;
    setStatus('saving');
    setErrors({});
    setMessage(null);
    const patch: Record<string, string | null> = {};
    for (const { key } of FIELDS) {
      const v = form[key].trim();
      if (v !== ((profile[key] as string | null) ?? '').trim()) patch[key] = v || null;
    }
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` },
        body: JSON.stringify(patch),
      });
      const j = await res.json();
      if (!res.ok) {
        setErrors(j.errors ?? {});
        setMessage(j.error ?? 'Could not save that.');
        setStatus('error');
        return;
      }
      if (j.profile) onSaved(j.profile);
      setMessage(
        j.pending?.length
          ? `Saved. ${j.pending.length === 1 ? 'One field' : 'Some fields'} (${j.pending.join(', ').replace(/_/g, ' ')}) went to the team to update by hand.`
          : 'Saved.',
      );
      setStatus('saved');
      window.dispatchEvent(new Event('portal:refresh'));
    } catch {
      setMessage('Could not save that.');
      setStatus('error');
    }
  }

  return (
    <Card className="p-6 md:p-8">
      <form onSubmit={save} noValidate>
        <div className="grid gap-6 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className={f.key === 'business_name' || f.key === 'website' ? 'sm:col-span-2' : ''}>
              <span className="portal-label block !text-[12px] text-p-ink/70">{f.label}</span>
              <input
                type={f.type ?? 'text'}
                value={form[f.key]}
                autoComplete={f.autoComplete}
                list={f.key === 'timezone' ? 'tz-list' : undefined}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }));
                  if (status !== 'saving') setStatus('idle');
                }}
                placeholder={f.placeholder}
                disabled={!profile || readOnly}
                aria-invalid={Boolean(errors[f.key])}
                className={`${FIELD} ${errors[f.key] ? 'border-red-500/60' : 'border-p-line focus:border-p-brandink/60'}`}
              />
              {errors[f.key] && <span className="mt-1.5 block text-sm text-p-bad">{errors[f.key]}</span>}
            </label>
          ))}
          <datalist id="tz-list">
            {zoneList.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </div>
        {profile && !profile.extendedReady && (
          <p className="mt-6 text-sm leading-relaxed text-p-ink/70">
            Phone, website and timezone are being switched on. Anything you enter now goes straight to the team, and shows here once it&apos;s live.
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button type="submit" disabled={!dirty || status === 'saving' || readOnly} className={BTN}>
            {status === 'saving' ? 'Saving' : 'Save changes'}
          </button>
          {message && <p className={`text-base ${status === 'error' ? 'text-p-bad' : 'text-p-brandink'}`}>{message}</p>}
        </div>
      </form>
    </Card>
  );
}

// ── login: email + password ──────────────────────────────────────────────

function Login({ email, readOnly }: { email: string; readOnly: boolean }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function change(e: FormEvent) {
    e.preventDefault();
    if (readOnly || status === 'saving') return;
    setMessage(null);
    if (pw.length < 8) {
      setStatus('error');
      setMessage('Use at least 8 characters.');
      return;
    }
    if (pw !== pw2) {
      setStatus('error');
      setMessage('The two passwords don’t match.');
      return;
    }
    setStatus('saving');
    try {
      const { error } = await getSupabaseBrowser().auth.updateUser({ password: pw });
      if (error) throw error;
      setPw('');
      setPw2('');
      setStatus('saved');
      setMessage('Password changed. Use it next time you sign in.');
    } catch (err) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : '';
      setMessage(/reauth|recent/i.test(msg) ? 'For your security, sign out and back in, then change it.' : msg || 'Could not change your password.');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <p className="portal-label !text-[12px] text-p-ink/70">Login email</p>
        <p className="mt-3 break-all text-[17px] text-p-ink">{email}</p>
        <p className="mt-3 text-sm leading-relaxed text-p-ink/70">
          This is how you sign in, so it moves with care. To change it, email{' '}
          <a href="mailto:info@podlablv.com" className="text-p-brandink hover:underline">
            info@podlablv.com
          </a>
          .
        </p>
      </Card>
      <Card className="p-6">
        <form onSubmit={change} noValidate>
          <p className="portal-label !text-[12px] text-p-ink/70">Change password</p>
          {/* Hidden username helps password managers file the new one under the right login. */}
          <input type="email" value={email} autoComplete="username" readOnly hidden />
          <label className="mt-3 block">
            <span className="sr-only">New password</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" autoComplete="new-password" disabled={readOnly} className={`${FIELD} border-p-line focus:border-p-brandink/60`} />
          </label>
          <label className="mt-3 block">
            <span className="sr-only">Confirm new password</span>
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" disabled={readOnly} className={`${FIELD} border-p-line focus:border-p-brandink/60`} />
          </label>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button type="submit" disabled={readOnly || !pw || !pw2 || status === 'saving'} className={BTN}>
              {status === 'saving' ? 'Saving' : 'Change password'}
            </button>
            {message && <p className={`text-sm ${status === 'error' ? 'text-p-bad' : 'text-p-brandink'}`}>{message}</p>}
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── credits + payments ───────────────────────────────────────────────────

function Credits({ credits }: { credits: Account['credits'] | null }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="p-6">
        <p className="portal-label !text-[12px] text-p-ink/70">Balance</p>
        <p className="mt-3 text-5xl font-bold tracking-tight text-p-ink">{credits?.ready ? credits.balance : '–'}</p>
        <p className="mt-2 text-sm leading-relaxed text-p-ink/70">1 credit = a short-form edit. Long-form or VSL edits take 2, premium edits with FAQs take 4.</p>
        <Link href="/portal/projects?buy=1" className="portal-label mt-5 inline-flex bg-p-brand px-5 py-3 !text-[13px] text-black transition hover:bg-p-pop">
          Buy credits
        </Link>
      </Card>
      <Card>
        <p className="portal-label border-b border-p-line px-5 py-3 !text-[12px] text-p-ink/70">History</p>
        {!credits?.ledger.length ? (
          <p className="px-5 py-6 text-base text-p-ink/70">No credit activity yet. Buy credits, then spend them on edits from Projects.</p>
        ) : (
          <ul className="divide-y divide-p-line">
            {credits.ledger.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-base text-p-ink">{r.note || REASON[r.reason] || r.reason}</span>
                  <span className="mt-0.5 block text-sm text-p-ink/60">
                    {formatDate(r.createdAt)}
                    {r.delta > 0 && r.expiresOn ? ` · expires ${formatDate(r.expiresOn)}` : ''}
                  </span>
                </span>
                <span className={`shrink-0 text-lg font-bold tabular-nums ${r.delta > 0 ? 'text-p-brandink' : 'text-p-ink/80'}`}>
                  {r.delta > 0 ? `+${r.delta}` : r.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Payments({ invoices }: { invoices: Invoice[] | null }) {
  if (!invoices) return <div className="h-32 animate-pulse border border-p-line bg-p-card" />;
  if (!invoices.length) return <EmptyState title="No invoices yet" body="Every payment shows here with its receipt." />;
  const paid = invoices.filter((i) => /^paid/i.test(i.status)).reduce((s, i) => s + i.amountCents, 0);
  const open = invoices.filter((i) => !/^paid/i.test(i.status)).reduce((s, i) => s + i.amountCents, 0);
  return (
    <Card>
      <div className="grid grid-cols-2 gap-px border-b border-p-line bg-p-line">
        <div className="bg-p-card p-5">
          <p className="portal-label !text-[11px] text-p-ink/65">Paid</p>
          <p className="mt-2 text-2xl font-bold text-p-ink">{formatMoney(paid)}</p>
        </div>
        <div className="bg-p-card p-5">
          <p className="portal-label !text-[11px] text-p-ink/65">Open</p>
          <p className="mt-2 text-2xl font-bold text-p-ink">{formatMoney(open)}</p>
        </div>
      </div>
      <ul className="divide-y divide-p-line">
        {invoices.map((i) => {
          const isPaid = /^paid/i.test(i.status);
          return (
            <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
              <span className="min-w-0 flex-1">
                <span className="block break-words text-base text-p-ink">{i.description || i.invoiceNo || 'Invoice'}</span>
                <span className="mt-0.5 block text-sm text-p-ink/60">
                  {[i.invoiceNo, isPaid && i.paidAt ? `Paid ${formatDate(i.paidAt)}` : i.dueOn ? `Due ${formatDate(i.dueOn)}` : i.issuedOn ? `Issued ${formatDate(i.issuedOn)}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className="text-lg font-bold tabular-nums text-p-ink">{formatMoney(i.amountCents)}</span>
              <StatusBadge status={i.status} />
              {!isPaid && i.payUrl && (
                <a href={i.payUrl} target="_blank" rel="noopener noreferrer" className="portal-label bg-p-brand px-3 py-2 !text-[11px] text-black transition hover:bg-p-pop">
                  Pay
                </a>
              )}
              {isPaid && i.receiptUrl && (
                <a href={i.receiptUrl} target="_blank" rel="noopener noreferrer" className="portal-label !text-[11px] text-p-brandink hover:underline">
                  Receipt
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ── team ─────────────────────────────────────────────────────────────────

function Team({ token, readOnly }: { token: string; readOnly: boolean }) {
  const [state, setState] = useState<{ members: TeamMember[]; canManage: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/portal/team', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Could not load your team.');
        setState(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your team.'));
  }, [token]);

  if (error) return <p className="text-base text-p-ink/70">{error}</p>;
  if (!state) return <div className="h-24 animate-pulse border border-p-line bg-p-card" />;
  if (state.canManage && !readOnly) {
    return (
      <Card className="p-6">
        <TeamAccess mode="owner" accessToken={token} />
      </Card>
    );
  }
  return (
    <Card>
      {state.members.length ? (
        <ul className="divide-y divide-p-line">
          {state.members.map((m) => (
            <li key={m.id} className="px-5 py-3.5">
              <span className="block text-base text-p-ink">
                {m.name} · {m.role}
              </span>
              <span className="portal-label mt-1 block !text-[11px] text-p-ink/60">{m.email}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-5 text-base text-p-ink/70">Only the account owner has access.</p>
      )}
      <p className="border-t border-p-line px-5 py-3 text-sm text-p-ink/65">
        {readOnly ? 'Read-only preview.' : 'The account owner adds and removes teammates.'}
      </p>
    </Card>
  );
}

// ── page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { loading, client, accessToken, isBeaker, viewerEmail } = usePortal();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [prefNote, setPrefNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [readOnly] = useState(() => Boolean(viewAsClientId()));

  const loadProfile = useCallback(() => {
    if (!accessToken) return;
    fetch('/api/portal/profile', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { profile?: Profile } | null) => j?.profile && setProfile(j.profile))
      .catch(() => {});
  }, [accessToken]);

  const loadAccount = useCallback(() => {
    if (!accessToken) return;
    fetch('/api/portal/account', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Account | null) => j && setAccount(j))
      .catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    if (!client) return;
    loadProfile();
    loadAccount();
  }, [client, loadProfile, loadAccount]);

  // TipTop may have just changed something.
  useEffect(() => {
    const reload = () => {
      loadProfile();
      loadAccount();
    };
    window.addEventListener('portal:refresh', reload);
    return () => window.removeEventListener('portal:refresh', reload);
  }, [loadProfile, loadAccount]);

  // Arriving from the profile menu at #credits etc.: the sections render after
  // the data loads, so jump once they exist.
  useEffect(() => {
    if (!account) return;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [account]);

  if (loading) return <p className="text-base text-p-ink/70">Loading...</p>;
  // A Beaker with no client account: their login, and the way out. Nothing client-only.
  if (!client && isBeaker) {
    return (
      <>
        <PageHeader eyebrow="Account" title="Your" accent="profile." subtitle="Your login. Your Beaker link, referrals and payouts are on the Beaker tab." />
        <div className="space-y-14">
          <Block id="login" title="Login">
            <Login email={viewerEmail ?? ''} readOnly={readOnly} />
          </Block>
          <section className="border-t border-p-line pt-10">
            <button
              type="button"
              onClick={async () => {
                exitViewAs();
                await getSupabaseBrowser().auth.signOut();
                router.replace('/');
              }}
              className="portal-label border border-p-line px-6 py-3.5 !text-[13px] text-p-ink/85 transition hover:border-p-bad hover:text-p-bad"
            >
              Sign out
            </button>
          </section>
        </div>
      </>
    );
  }
  if (!client) {
    return (
      <>
        <PageHeader title="Profile" />
        <EmptyState title="Account not set up yet" body="Once PodLab sets up your portal, your details will show here." />
      </>
    );
  }

  async function savePref(patch: { notifyEmail?: boolean; notifySms?: boolean; digestOptOut?: boolean }) {
    if (!account || saving || readOnly) return;
    setSaving(true);
    setPrefNote(null);
    try {
      const digest = patch.digestOptOut !== undefined;
      const res = await fetch(digest ? '/api/portal/profile' : '/api/portal/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` },
        body: JSON.stringify(patch),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Could not save that.');
      if (digest && j.profile) setProfile(j.profile);
      if (!digest) {
        setAccount({
          ...account,
          prefs: {
            ...account.prefs,
            ...(patch.notifyEmail !== undefined ? { notifyEmail: patch.notifyEmail } : {}),
            ...(patch.notifySms !== undefined ? { notifySms: patch.notifySms } : {}),
          },
        });
      }
      setPrefNote({ ok: true, text: 'Saved.' });
    } catch (err) {
      setPrefNote({ ok: false, text: err instanceof Error ? err.message : 'Could not save that.' });
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    exitViewAs();
    await getSupabaseBrowser().auth.signOut();
    router.replace('/');
  }

  const prefs = account?.prefs;

  return (
    <>
      <PageHeader eyebrow="Account" title="Your" accent="profile." subtitle="Your details, login, credits, payments, team and how we reach you." />

      <nav aria-label="Profile sections" className="-mt-4 mb-10 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="portal-label border border-p-line px-3 py-2 !text-[11px] text-p-ink/75 transition hover:border-p-brandink hover:text-p-brandink">
            {s.label}
          </a>
        ))}
      </nav>

      <div className="space-y-14">
        <Block id="details" title="Details" hint="How we reach you and what we call you. The team sees changes right away.">
          <Details profile={profile} onSaved={setProfile} readOnly={readOnly} />
        </Block>

        <Block id="login" title="Login">
          <Login email={account?.loginEmail ?? profile?.email ?? client.email} readOnly={readOnly} />
        </Block>

        <Block id="credits" title="Credits" hint="Edit credits pay for the edits you send from Projects. Packs last 90 days.">
          <Credits credits={account?.credits ?? null} />
        </Block>

        <Block id="payments" title="Payments">
          <Payments invoices={account?.invoices ?? null} />
        </Block>

        <Block id="team" title="Team" hint="Give an assistant or partner their own login to this portal. Notes and approvals they send go out under their own name.">
          {accessToken && <Team token={accessToken} readOnly={readOnly} />}
        </Block>

        <Block id="notifications" title="Notifications" hint="How we tell you something moved or is waiting on you. The hot potato in the corner always shows it too.">
          <Card className="space-y-5 p-6">
            <Toggle
              checked={prefs?.notifyEmail ?? true}
              disabled={!prefs?.ready || saving || readOnly}
              onChange={(v) => savePref({ notifyEmail: v })}
              label="Email me when something needs me or is done"
              help="Batched, so a busy afternoon is one email, not ten."
            />
            <Toggle
              checked={prefs?.notifySms ?? false}
              disabled={!prefs?.ready || saving || readOnly}
              onChange={(v) => savePref({ notifySms: v })}
              label="Text me too"
              help={
                account?.phone
                  ? `To ${account.phone}, between 8am and 9pm your time. Reply STOP any time. Message and data rates may apply.`
                  : 'Add a mobile number in Details first.'
              }
            />
            <Toggle
              checked={profile ? !profile.digestOptOut : true}
              disabled={!profile?.digestReady || saving || readOnly}
              onChange={(v) => savePref({ digestOptOut: !v })}
              label="Daily update email"
              help="At most one a day, only when there's news: a new cut, a note fixed, a version to review."
            />
            {prefNote && <p className={`text-sm ${prefNote.ok ? 'text-p-brandink' : 'text-p-bad'}`}>{prefNote.text}</p>}
          </Card>
        </Block>

        <section className="border-t border-p-line pt-10">
          <button type="button" onClick={signOut} className="portal-label border border-p-line px-6 py-3.5 !text-[13px] text-p-ink/85 transition hover:border-p-bad hover:text-p-bad">
            Sign out
          </button>
        </section>
      </div>
    </>
  );
}
