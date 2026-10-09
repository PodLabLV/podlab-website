'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { usePortal } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';

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

const FIELDS: Array<{ key: Field; label: string; placeholder: string; type?: string; autoComplete?: string }> = [
  { key: 'first_name', label: 'First name', placeholder: 'First name', autoComplete: 'given-name' },
  { key: 'last_name', label: 'Last name', placeholder: 'Last name', autoComplete: 'family-name' },
  { key: 'business_name', label: 'Business name', placeholder: 'Your business', autoComplete: 'organization' },
  { key: 'phone', label: 'Phone', placeholder: '(702) 555-0101', type: 'tel', autoComplete: 'tel' },
  { key: 'website', label: 'Website', placeholder: 'yourbusiness.com', type: 'url', autoComplete: 'url' },
  { key: 'timezone', label: 'Timezone', placeholder: 'America/Los_Angeles' },
];

const COMMON_ZONES = ['America/Los_Angeles', 'America/Denver', 'America/Phoenix', 'America/Chicago', 'America/New_York', 'Pacific/Honolulu', 'America/Anchorage'];

function zones(): string[] {
  try {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
    return [...COMMON_ZONES, ...all.filter((z) => !COMMON_ZONES.includes(z))];
  } catch {
    return COMMON_ZONES;
  }
}

export default function ProfilePage() {
  const { loading, client, accessToken } = usePortal();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Record<Field, string>>({ first_name: '', last_name: '', business_name: '', phone: '', website: '', timezone: '' });
  const [errors, setErrors] = useState<Partial<Record<Field | 'email', string>>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const zoneList = useMemo(zones, []);
  const [digestStatus, setDigestStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [digestMessage, setDigestMessage] = useState<string | null>(null);

  const fill = (p: Profile) => {
    setProfile(p);
    setForm({
      first_name: p.first_name ?? '',
      last_name: p.last_name ?? '',
      business_name: p.business_name ?? '',
      phone: p.phone ?? '',
      website: p.website ?? '',
      timezone: p.timezone ?? '',
    });
  };

  useEffect(() => {
    if (!accessToken || !client) return;
    let alive = true;
    fetch('/api/portal/profile', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { profile?: Profile } | null) => {
        if (alive && j?.profile) fill(j.profile);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [accessToken, client]);

  // TipTop may have just changed something.
  useEffect(() => {
    const reload = () => {
      if (!accessToken) return;
      fetch('/api/portal/profile', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { profile?: Profile } | null) => j?.profile && fill(j.profile))
        .catch(() => {});
    };
    window.addEventListener('portal:refresh', reload);
    return () => window.removeEventListener('portal:refresh', reload);
  }, [accessToken]);

  if (loading) return <p className="text-sm text-p-ink/40">Loading...</p>;
  if (!client) {
    return (
      <>
        <PageHeader title="Profile" />
        <EmptyState title="Account not set up yet" body="Once PodLab sets up your portal, your details will show here." />
      </>
    );
  }

  const dirty =
    profile &&
    FIELDS.some(({ key }) => (form[key] ?? '').trim() !== ((profile[key] as string | null) ?? '').trim());

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!profile || !dirty || status === 'saving') return;
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
      if (j.profile) fill(j.profile);
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

  async function setDigest(on: boolean) {
    if (!profile || digestStatus === 'saving') return;
    setDigestStatus('saving');
    setDigestMessage(null);
    setProfile({ ...profile, digestOptOut: !on });
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` },
        body: JSON.stringify({ digestOptOut: !on }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Could not save that.');
      if (j.profile) setProfile(j.profile);
      setDigestMessage(on ? 'On. You will hear from us when something moves.' : 'Off. We will not email you updates.');
      setDigestStatus('saved');
    } catch (err) {
      setProfile({ ...profile, digestOptOut: profile.digestOptOut });
      setDigestMessage(err instanceof Error ? err.message : 'Could not save that.');
      setDigestStatus('error');
    }
  }

  return (
    <>
      <PageHeader eyebrow="Account" title="Your" accent="profile." subtitle="How we reach you and what we call you. Changes save to your account and the team sees them." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-6 md:p-8">
          <form onSubmit={save} noValidate>
            <div className="grid gap-6 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <label key={f.key} className={f.key === 'business_name' || f.key === 'website' ? 'sm:col-span-2' : ''}>
                  <span className="portal-label block !text-[9px] text-p-ink/45">{f.label}</span>
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
                    disabled={!profile}
                    aria-invalid={Boolean(errors[f.key])}
                    className={`mt-2 w-full border bg-p-paper px-4 py-3 text-[15px] text-p-ink placeholder:text-p-ink/25 focus:outline-none ${
                      errors[f.key] ? 'border-red-500/60' : 'border-p-line focus:border-p-brandink/60'
                    }`}
                  />
                  {errors[f.key] && <span className="mt-1.5 block text-xs text-p-bad">{errors[f.key]}</span>}
                </label>
              ))}
              <datalist id="tz-list">
                {zoneList.map((z) => (
                  <option key={z} value={z} />
                ))}
              </datalist>
            </div>

            {profile && !profile.extendedReady && (
              <p className="mt-6 text-xs leading-relaxed text-p-ink/45">
                Phone, website and timezone are being switched on. Anything you enter now goes straight to the team, and shows here once it&apos;s live.
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={!dirty || status === 'saving'}
                className="portal-label bg-p-brand px-6 py-3.5 !text-[10px] text-black transition hover:bg-p-pop disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === 'saving' ? 'Saving' : 'Save changes'}
              </button>
              {message && <p className={`text-sm ${status === 'error' ? 'text-p-bad' : 'text-p-brandink'}`}>{message}</p>}
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <p className="portal-label !text-[9px] text-p-ink/45">Login email</p>
            <p className="mt-3 break-all text-[15px] text-p-ink">{profile?.email ?? client.email}</p>
            <p className="mt-3 text-xs leading-relaxed text-p-ink/45">
              This is how you sign in, so it moves with care. To change it, email{' '}
              <a href="mailto:info@podlablv.com" className="text-p-brandink hover:underline">
                info@podlablv.com
              </a>
              .
            </p>
          </Card>
          <Card className="p-6">
            <p className="portal-label !text-[9px] text-p-ink/45">Email updates</p>
            <label className={`mt-3 flex items-start gap-3 ${profile?.digestReady ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
              <input
                type="checkbox"
                checked={profile ? !profile.digestOptOut : true}
                disabled={!profile?.digestReady || digestStatus === 'saving'}
                onChange={(e) => setDigest(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-p-brand"
              />
              <span className="text-sm leading-relaxed text-p-ink">Email me a daily update when something changes</span>
            </label>
            <p className="mt-3 text-xs leading-relaxed text-p-ink/45">
              {profile && !profile.digestReady
                ? 'Daily updates are being switched on.'
                : 'At most one a day, and only when there is news: a new cut, a note fixed, a version to review.'}
            </p>
            {digestMessage && <p className={`mt-2 text-xs ${digestStatus === 'error' ? 'text-p-bad' : 'text-p-brandink'}`}>{digestMessage}</p>}
          </Card>
          <Card className="p-6">
            <p className="portal-label !text-[9px] text-p-brandink">Faster</p>
            <p className="mt-3 text-sm leading-relaxed text-p-ink/65">
              Tell TipTop, bottom right: <span className="portal-drama text-p-ink">&ldquo;my new number is…&rdquo;</span> and she updates it for you.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
