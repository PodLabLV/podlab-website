'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://tncipuxobcbkwkmpcevt.supabase.co/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        // Store token in localStorage
        localStorage.setItem('supabase_token', data.access_token);
        localStorage.setItem('supabase_user', JSON.stringify(data.user));
        
        // Redirect to portal dashboard
        window.location.href = 'https://podlab-portal.vercel.app/dashboard';
      } else {
        setError(data.error_description || 'Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      <div className="relative min-h-screen flex items-center justify-center px-6 py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-bg-secondary to-black opacity-50"></div>
        
        {/* Login form */}
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-bg-secondary border-2 border-accent/20 rounded-2xl p-8 shadow-[0_0_60px_rgba(57,255,20,0.15)]">
            {/* Logo/Branding */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-white mb-2 font-display">
                Client <span className="text-accent">Portal</span>
              </h1>
              <p className="text-text-secondary">
                Access your projects, deliverables, and roadmap
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-text-secondary mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-black border-2 border-accent/30 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-text-secondary mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-black border-2 border-accent/30 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-accent text-black font-black text-lg rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(57,255,20,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none uppercase tracking-wide"
              >
                {loading ? 'Logging in...' : 'Access Portal →'}
              </button>
            </form>

            {/* Footer links */}
            <div className="mt-8 text-center space-y-3">
              <p className="text-sm text-text-secondary">
                Forgot password?{' '}
                <a href="mailto:support@podlablv.com" className="text-accent hover:underline">
                  Contact support
                </a>
              </p>
              <p className="text-sm text-text-secondary">
                Not a client yet?{' '}
                <Link href="/contact" className="text-accent hover:underline font-semibold">
                  Book a strategy call
                </Link>
              </p>
            </div>
          </div>

          {/* Security note */}
          <p className="text-center text-xs text-text-secondary mt-6">
            🔒 Your login is encrypted and secure. We never share your data.
          </p>
        </div>
      </div>
    </div>
  );
}
