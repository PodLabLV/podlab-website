'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Auto-focus email field on mount
  useEffect(() => {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    if (emailInput) emailInput.focus();
  }, []);

  // Handle Enter key submit
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && email && password && !loading) {
        handleLogin(e as any);
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [email, password, loading]);

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
        // Store token
        localStorage.setItem('supabase_token', data.access_token);
        localStorage.setItem('supabase_user', JSON.stringify(data.user));
        
        if (rememberMe) {
          localStorage.setItem('remember_email', email);
        } else {
          localStorage.removeItem('remember_email');
        }
        
        // Success animation
        setSuccess(true);
        
        // Redirect after animation
        setTimeout(() => {
          window.location.href = 'https://podlab-portal.vercel.app/dashboard';
        }, 1500);
      } else {
        // Better error messages
        if (data.error === 'invalid_grant' || data.error_description?.includes('Invalid')) {
          setError('Invalid email or password. Please try again.');
        } else if (data.error_description?.includes('Email not confirmed')) {
          setError('Please check your email and confirm your account first.');
        } else if (data.error_description?.includes('not found')) {
          setError('No account found with this email address.');
        } else {
          setError(data.error_description || 'Login failed. Please try again.');
        }
      }
    } catch (err) {
      setError('Connection error. Please check your internet and try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('remember_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      <div className="relative min-h-screen flex items-center justify-center px-6 py-32">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-bg-secondary to-black opacity-80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(57,255,20,0.1),transparent_50%)] animate-pulse"></div>
        </div>
        
        {/* Success overlay */}
        {success && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-accent flex items-center justify-center animate-in zoom-in duration-500">
                <svg className="w-10 h-10 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white">Welcome Back!</h2>
                <p className="text-text-secondary">Redirecting to your portal...</p>
              </div>
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Login form */}
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-bg-secondary/80 backdrop-blur-xl border-2 border-accent/20 rounded-2xl p-8 shadow-[0_0_80px_rgba(57,255,20,0.15)] transition-all hover:shadow-[0_0_100px_rgba(57,255,20,0.25)] hover:border-accent/30">
            {/* Logo/Branding */}
            <div className="text-center mb-8 space-y-3">
              <div className="inline-block p-4 bg-black/50 rounded-2xl border border-accent/30 mb-4">
                <svg className="w-12 h-12 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h1 className="text-4xl font-black text-white font-display">
                Client <span className="text-accent">Portal</span>
              </h1>
              <p className="text-text-secondary text-sm">
                Access your projects, deliverables, and roadmap
              </p>
            </div>

            {/* Error message with animation */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg animate-in slide-in-from-top duration-300">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-white">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-black/50 border-2 border-accent/30 rounded-lg text-white focus:outline-none focus:border-accent focus:bg-black transition-all placeholder:text-text-secondary/50"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-white">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-12 py-3.5 bg-black/50 border-2 border-accent/30 rounded-lg text-white focus:outline-none focus:border-accent focus:bg-black transition-all placeholder:text-text-secondary/50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-secondary hover:text-accent transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me checkbox */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-accent/30 bg-black/50 text-accent focus:ring-2 focus:ring-accent/50 focus:ring-offset-0 transition-all cursor-pointer"
                  />
                  <span className="text-sm text-text-secondary group-hover:text-white transition-colors">
                    Remember me
                  </span>
                </label>
                <a href="mailto:support@podlablv.com?subject=Password%20Reset%20Request" className="text-sm text-accent hover:underline">
                  Forgot password?
                </a>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="relative w-full px-6 py-4 bg-accent text-black font-black text-lg rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(57,255,20,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none uppercase tracking-wide overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <>
                      <span>Access Portal</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              </button>
            </form>

            {/* Footer links */}
            <div className="mt-8 pt-6 border-t border-accent/10 space-y-4">
              <div className="text-center">
                <p className="text-sm text-text-secondary mb-3">
                  Not a client yet?
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link 
                    href="/assessment" 
                    className="px-4 py-2 border-2 border-accent/30 text-accent text-sm font-semibold rounded-lg hover:bg-accent/10 hover:border-accent transition-all text-center"
                  >
                    Take Assessment
                  </Link>
                  <Link 
                    href="/contact" 
                    className="px-4 py-2 bg-white/5 border-2 border-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/10 hover:border-white/20 transition-all text-center"
                  >
                    Book Strategy Call
                  </Link>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-text-secondary">
                  Need help?{' '}
                  <a href="mailto:support@podlablv.com" className="text-accent hover:underline">
                    Contact support
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Security badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-text-secondary">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>256-bit SSL encrypted • Your data is secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
