'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

// Where invite and reset emails land (via /api/portal/access, which parked the
// token in a cookie). One step: choose a password, and you are in.

const inputClass =
  'w-full border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3.5 text-[17px] text-[#eeeeee] placeholder:text-[#eeeeee]/65 transition focus:border-[#2add1b] focus:outline-none';

function SetPassword() {
  const params = useSearchParams();
  const invite = params.get('kind') === 'invite';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(params.get('state') === 'invalid');
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Those two passwords don’t match.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/portal/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.error === 'expired') {
        setExpired(true);
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Could not set that password.');
      const { error: sessionError } = await getSupabaseBrowser().auth.setSession({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
      });
      if (sessionError) throw new Error('Password saved. Sign in with it to continue.');
      window.location.href = '/portal';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set that password.');
    } finally {
      setSaving(false);
    }
  }

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setResent(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-16">
      <span className="portal-label text-[#2add1b]">{expired ? 'Link expired' : invite ? 'Welcome' : 'Password'}</span>
      <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-[#eeeeee] md:text-5xl">
        {expired ? (
          <>
            Let&apos;s get you <em className="portal-drama text-[#2add1b]">a fresh link.</em>
          </>
        ) : invite ? (
          <>
            Set a password, <em className="portal-drama text-[#2add1b]">you&apos;re in.</em>
          </>
        ) : (
          <>
            Choose a <em className="portal-drama text-[#2add1b]">new password.</em>
          </>
        )}
      </h1>

      {expired ? (
        resent ? (
          <p role="status" className="mt-8 border-l-2 border-[#2add1b] bg-[#2add1b]/5 px-4 py-3 text-base text-[#eeeeee]/80">
            If that email has a PodLab Portal account, a new link is on its way. Check your inbox and spam.
          </p>
        ) : (
          <>
            <p className="mt-5 text-lg leading-relaxed text-[#eeeeee]/80">
              That link has expired or was already used. Enter your email and we&apos;ll send a new one.
            </p>
            <form onSubmit={resend} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="portal-label mb-2 block text-[#eeeeee]/75">
                  Email
                </label>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={inputClass} />
              </div>
              <button
                type="submit"
                disabled={saving || !email}
                className="portal-label flex w-full items-center justify-center bg-[#2add1b] px-6 py-4 !text-[12px] text-black transition hover:bg-[#eeeeee] disabled:opacity-50"
              >
                {saving ? 'Sending' : 'Send a new link'}
              </button>
            </form>
          </>
        )
      ) : (
        <>
          <p className="mt-5 text-lg leading-relaxed text-[#eeeeee]/80">
            {invite
              ? 'Your strategy, your videos in production, your deliverables and your next steps, all in one place. Pick a password to open it.'
              : 'Pick a new password and you’ll go straight to your portal.'}
          </p>
          {error && (
            <p role="alert" className="mt-8 border-l-2 border-red-500 bg-red-500/5 px-4 py-3 text-base text-red-300">
              {error}
            </p>
          )}
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="password" className="portal-label mb-2 block text-[#eeeeee]/75">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="portal-label absolute inset-y-0 right-0 px-4 !text-[12px] text-[#eeeeee]/70 transition hover:text-[#2add1b]"
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-2 text-sm text-[#eeeeee]/65">At least 8 characters.</p>
            </div>
            <div>
              <label htmlFor="confirm" className="portal-label mb-2 block text-[#eeeeee]/75">
                Confirm password
              </label>
              <input
                id="confirm"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={saving || password.length < 8 || !confirm}
              className="portal-label flex w-full items-center justify-center gap-3 bg-[#2add1b] px-6 py-4 !text-[12px] text-black transition hover:bg-[#eeeeee] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Opening your portal' : invite ? 'Set password and enter' : 'Save and sign in'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <main className="portal relative flex min-h-svh flex-col bg-black px-6 py-6 md:px-12">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="PodLab home">
          <Image src="/portal/podlab-portal-green.png" alt="PodLab Portal" width={720} height={229} priority unoptimized className="h-auto w-[132px] md:w-[156px]" />
        </Link>
        <Link href="/login" className="portal-label text-[#eeeeee]/75 transition hover:text-[#2add1b]">
          Sign in
        </Link>
      </div>
      <Suspense fallback={null}>
        <SetPassword />
      </Suspense>
      <p className="mx-auto w-full max-w-md text-sm text-[#eeeeee]/70">
        Trouble?{' '}
        <a href="mailto:info@podlablv.com" className="text-[#eeeeee]/85 hover:text-[#2add1b]">
          info@podlablv.com
        </a>
      </p>
    </main>
  );
}
