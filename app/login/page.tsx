'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

// PodLab Portal sign-in, in the podlablv.com brand system: the lab still on the
// left (behind the form on phones), the form on true black on the right.

/** Only same-site paths, so ?redirect= can't bounce a client off to another domain. */
function redirectTarget(): string {
  const raw = new URLSearchParams(window.location.search).get('redirect') || '';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/portal';
}

const inputClass =
  'w-full border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3.5 text-[15px] text-[#eeeeee] placeholder:text-[#eeeeee]/25 transition focus:border-[#2add1b] focus:outline-none';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);

  // Already signed in: straight through.
  useEffect(() => {
    getSupabaseBrowser()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (session) window.location.href = redirectTarget();
      });
  }, []);

  useEffect(() => {
    try {
      const remembered = localStorage.getItem('remember_email');
      if (remembered) {
        setEmail(remembered);
        setRememberMe(true);
      }
    } catch {
      // Storage blocked (private window): nothing to prefill.
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await getSupabaseBrowser().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message?.includes('Invalid login')) {
          setError('That email and password don’t match. Try again, or reset your password.');
        } else if (authError.message?.includes('Email not confirmed')) {
          setError('Confirm your account from the email we sent you first.');
        } else {
          setError(authError.message || 'Sign-in failed. Try again.');
        }
        return;
      }

      if (data.session) {
        try {
          if (rememberMe) localStorage.setItem('remember_email', email.trim());
          else localStorage.removeItem('remember_email');
        } catch {
          // Storage blocked: sign-in still works, the email just isn't remembered.
        }
        setSuccess(true);
        window.location.href = redirectTarget();
      }
    } catch (err) {
      setError('Connection problem. Check your internet and try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not send the reset email.');
      } else {
        setResetSent(true);
      }
    } catch (err) {
      setError('Connection problem. Try again.');
      console.error('Reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: 'login' | 'reset') => {
    setMode(next);
    setError('');
    setResetSent(false);
  };

  return (
    <main className="portal relative min-h-svh bg-black lg:grid lg:grid-cols-[1.15fr_1fr]">
      {/* The lab: a panel on desktop, a dimmed backdrop on phones. */}
      <div className="absolute inset-0 lg:relative lg:inset-auto" aria-hidden="true">
        <Image src="/portal/lab.webp" alt="" fill priority unoptimized sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-black/80 lg:bg-transparent lg:bg-gradient-to-r lg:from-black/20 lg:via-transparent lg:to-black/90" />
        <div className="absolute inset-x-0 bottom-0 hidden p-12 lg:block">
          <span className="portal-label text-[#2add1b]">Record once. Sell forever.</span>
        </div>
      </div>

      <section className="relative z-10 flex min-h-svh flex-col px-6 py-6 md:px-12 lg:border-l lg:border-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="PodLab home">
            <Image src="/portal/podlab-wordmark.png" alt="PodLab" width={120} height={43} priority unoptimized className="h-auto w-[104px] md:w-[120px]" />
          </Link>
          <Link href="/" className="portal-label text-[#eeeeee]/50 transition hover:text-[#2add1b]">
            Back to site
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-16">
          <span className="portal-label text-[#2add1b]">PodLab Portal</span>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-[#eeeeee] md:text-5xl">
            {mode === 'login' ? (
              <>
                Your build, <em className="portal-drama text-[#2add1b]">in one place.</em>
              </>
            ) : (
              <>
                Reset your <em className="portal-drama text-[#2add1b]">password.</em>
              </>
            )}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-[#eeeeee]/60">
            {mode === 'login'
              ? 'Your strategy document, delivery schedule, files and invoices. Sign in with the email we set you up with.'
              : 'Enter your email and we’ll send you a link to set a new one.'}
          </p>

          {error && (
            <p role="alert" className="mt-8 border-l-2 border-red-500 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}
          {resetSent && (
            <p role="status" className="mt-8 border-l-2 border-[#2add1b] bg-[#2add1b]/5 px-4 py-3 text-sm text-[#eeeeee]/80">
              Reset link sent. Check your inbox (and spam) for an email from PodLab.
            </p>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleReset} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="portal-label mb-2 block text-[#eeeeee]/50">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputClass}
              />
            </div>

            {mode === 'login' && (
              <>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="password" className="portal-label block text-[#eeeeee]/50">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs text-[#eeeeee]/50 transition hover:text-[#2add1b]"
                    >
                      Forgot it?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} pr-16`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="portal-label absolute inset-y-0 right-0 px-4 !text-[9px] text-[#eeeeee]/40 transition hover:text-[#2add1b]"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 text-sm text-[#eeeeee]/60">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded-none border-[#1a1a1a] bg-[#0a0a0a] accent-[#2add1b]"
                  />
                  Remember my email
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={loading || success || !email || (mode === 'login' && !password)}
              className="portal-label flex w-full items-center justify-center gap-3 bg-[#2add1b] px-6 py-4 !text-[12px] text-black transition hover:bg-[#eeeeee] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mode === 'login'
                ? success
                  ? 'Opening your portal'
                  : loading
                    ? 'Signing in'
                    : 'Sign in'
                : loading
                  ? 'Sending'
                  : 'Send reset link'}
              {!loading && !success && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              )}
            </button>

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="portal-label w-full border border-[#1a1a1a] px-6 py-4 text-[#eeeeee]/70 transition hover:border-[#2add1b] hover:text-[#2add1b]"
              >
                Back to sign in
              </button>
            )}
          </form>
        </div>

        <div className="mx-auto grid w-full max-w-md gap-px border border-[#1a1a1a] bg-[#1a1a1a] text-sm sm:grid-cols-2">
          <Link href="/diagnostic" className="group bg-black p-4 transition hover:bg-[#0a0a0a]">
            <span className="portal-label block !text-[9px] text-[#eeeeee]/40">Not a client yet</span>
            <span className="mt-2 block text-[#eeeeee]/80 transition group-hover:text-[#2add1b]">See if you qualify for a free VSL</span>
          </Link>
          <a href="https://crm.podlablv.com" className="group bg-black p-4 transition hover:bg-[#0a0a0a]">
            <span className="portal-label block !text-[9px] text-[#eeeeee]/40">PodLab team</span>
            <span className="mt-2 block text-[#eeeeee]/80 transition group-hover:text-[#2add1b]">Sign in to the CRM instead</span>
          </a>
        </div>
        <p className="mx-auto mt-5 w-full max-w-md text-xs text-[#eeeeee]/40">
          Trouble signing in?{' '}
          <a href="mailto:info@podlablv.com" className="text-[#eeeeee]/70 underline-offset-4 transition hover:text-[#2add1b] hover:underline">
            info@podlablv.com
          </a>
        </p>
      </section>
    </main>
  );
}
