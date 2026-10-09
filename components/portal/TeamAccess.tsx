'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StaffMember } from '@/app/api/portal/admin/members/route';

interface TeamAccessProps {
  clientId: string;
  accessToken: string;
}

const FIELD = 'w-full border border-p-line bg-p-paper px-4 py-3 text-base text-p-ink placeholder:text-p-ink/50 focus:border-p-brandink focus:outline-none';

/** Staff: extra logins (an assistant, a partner) that open this client's portal under their own name. */
export default function TeamAccess({ clientId, accessToken }: TeamAccessProps) {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'Assistant' });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/portal/admin/members?clientId=${encodeURIComponent(clientId)}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) setNote(j.error || 'Could not load the team.');
    else setMembers(j.members);
  }, [clientId, accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function post(body: object, ok: (j: { emailed?: boolean; link?: string; email?: string }) => string) {
    setBusy(true);
    setNote(null);
    setLink(null);
    try {
      const r = await fetch('/api/portal/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ clientId, ...body }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not save that.');
      setNote(ok(j));
      if (j.link) setLink(j.link);
      await load();
      return true;
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not save that.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  const sent = (j: { emailed?: boolean; email?: string }) =>
    j.emailed ? `Invite sent to ${j.email}.` : `The email didn't go out. Text or email them the link below.`;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (await post(form, sent)) setForm({ firstName: '', lastName: '', email: '', role: 'Assistant' });
  }

  return (
    <div>
      {note && <p className="mb-4 border-l-2 border-p-brandink bg-p-brand/5 px-4 py-3 text-base text-p-ink/90">{note}</p>}
      {link && (
        <p className="mb-4 break-all border border-p-line bg-p-card px-4 py-3 text-sm text-p-ink/85">
          {link}
        </p>
      )}

      {members.length > 0 && (
        <ul className="mb-4 divide-y divide-p-line border border-p-line">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 bg-p-paper px-4 py-3">
              <span className="min-w-0">
                <span className="block break-words text-base text-p-ink">
                  {m.name} · {m.role}
                </span>
                <span className="portal-label mt-1 block break-words !text-[11px] text-p-ink/65">
                  {m.email} · {m.access === 'active' ? 'Signed in' : 'Invited, not in yet'}
                </span>
              </span>
              <span className="flex shrink-0 gap-4">
                <button
                  disabled={busy}
                  onClick={() => post({ email: m.email, firstName: m.name.split(' ')[0], lastName: m.name.split(' ').slice(1).join(' '), role: m.role }, sent)}
                  className="portal-label !text-[11px] text-p-brandink transition hover:text-p-ink disabled:opacity-40"
                >
                  Resend link
                </button>
                <button
                  disabled={busy}
                  onClick={() => post({ memberId: m.id, remove: true }, () => `${m.name} no longer has access.`)}
                  className="portal-label !text-[11px] text-p-ink/70 transition hover:text-p-bad disabled:opacity-40"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={invite} className="grid gap-3 sm:grid-cols-2">
        <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="First name" aria-label="First name" className={FIELD} />
        <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" aria-label="Last name" className={FIELD} />
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" aria-label="Email" className={FIELD} />
        <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Role, e.g. Assistant" aria-label="Role" className={FIELD} />
        <button disabled={busy} className="portal-label bg-p-brand px-5 py-3 !text-[13px] text-black transition hover:bg-p-pop disabled:opacity-40 sm:col-span-2 sm:justify-self-start">
          Invite teammate
        </button>
      </form>
    </div>
  );
}
