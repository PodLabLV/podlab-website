'use client';

import { useCallback, useEffect, useState } from 'react';

interface StaffTeamProps {
  accessToken: string;
}

const FIELD = 'w-full border border-p-line bg-p-paper px-4 py-3 text-base text-p-ink placeholder:text-p-ink/50 focus:border-p-brandink focus:outline-none';

/** Staff: who can see every client in the portal. */
export default function StaffTeam({ accessToken }: StaffTeamProps) {
  const [staff, setStaff] = useState<Array<{ email: string; name: string | null }>>([]);
  const [me, setMe] = useState('');
  const [form, setForm] = useState({ name: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch('/api/portal/admin/staff', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    const j = await r.json();
    if (r.ok) {
      setStaff(j.staff);
      setMe(j.me);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function post(body: object, ok: string) {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch('/api/portal/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not save that.');
      setNote(ok);
      await load();
      return true;
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not save that.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {note && <p className="mb-4 border-l-2 border-p-brandink bg-p-brand/5 px-4 py-3 text-base text-p-ink/90">{note}</p>}
      <ul className="divide-y divide-p-line border border-p-line">
        {staff.map((s) => (
          <li key={s.email} className="flex flex-wrap items-center justify-between gap-3 bg-p-paper px-4 py-3">
            <span className="min-w-0">
              <span className="block text-base text-p-ink">{s.name || s.email}</span>
              <span className="block break-words text-sm text-p-ink/65">{s.email}</span>
            </span>
            {s.email.toLowerCase() === me ? (
              <span className="portal-label !text-[11px] text-p-ink/65">You</span>
            ) : (
              <button disabled={busy} onClick={() => post({ email: s.email, remove: true }, `${s.name || s.email} no longer has staff access.`)} className="portal-label !text-[11px] text-p-ink/70 transition hover:text-p-bad disabled:opacity-40">
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          post(form, `${form.name || form.email} is now staff. They sign in with their CRM login.`).then((ok) => ok && setForm({ name: '', email: '' }));
        }}
        className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
      >
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" aria-label="Name" className={FIELD} />
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Their CRM login email" aria-label="Email" className={FIELD} />
        <button disabled={busy} className="portal-label bg-p-brand px-5 py-3 !text-[13px] text-black transition hover:bg-p-pop disabled:opacity-40">
          Add staff
        </button>
      </form>
    </div>
  );
}
