'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { PortalProvider, usePortal } from '@/lib/portal-data';
import TipTop from '@/components/portal/tiptop/TipTop';
import SidebarNav from '@/components/portal/SidebarNav';
import { PotatoBadge, PotatoSmoke } from '@/components/portal/HotPotato';
import { usePortalTheme, logoFor } from '@/components/portal/theme';
import { exitViewAs, installViewAs, viewAsClientId } from '@/lib/portal/view-as';


interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  initials: string;
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [theme, toggleTheme] = usePortalTheme();
  const [viewAs] = useState(() => viewAsClientId());
  const { client, isStaff } = usePortal();
  const businessName = client?.business_name ?? '';

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }

      const meta = session.user.user_metadata || {};
      const firstName = meta.first_name || '';
      const lastName = meta.last_name || '';
      const email = session.user.email || '';
      const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || email.charAt(0).toUpperCase();

      setUser({ firstName, lastName, email, initials });
      setChecking(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    exitViewAs();
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (checking) {
    return (
      <div data-theme={theme} className="portal flex min-h-svh items-center justify-center bg-p-paper">
        <div className="w-40">
          <div className="h-px overflow-hidden bg-p-line">
            <div className="h-full w-1/3 animate-pulse bg-p-brand" />
          </div>
          <p className="portal-label mt-4 text-center !text-[12px] text-p-ink/70">Opening portal</p>
        </div>
      </div>
    );
  }

  return (
    <div data-theme={theme} className="portal flex min-h-svh bg-p-paper">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-p-paper/70 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-svh w-72 flex-col border-r border-p-line bg-p-paper transition-transform duration-300 lg:sticky ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-p-line px-6 pb-5 pt-6">
          <Link href="/" aria-label="PodLab home" className="block">
            <Image src={logoFor(theme)} alt="PodLab Portal" width={720} height={229} unoptimized className="h-auto w-[184px]" />
          </Link>
        </div>

        <SidebarNav isStaff={isStaff} onNavigate={() => setSidebarOpen(false)} />

        <div className="border-t border-p-line px-6 py-5">
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-p-brandink/40 text-sm font-bold text-p-brandink">
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-base font-medium text-p-ink">
                  {user.firstName} {user.lastName}
                </p>
                <p className="break-words text-sm text-p-ink/70">{businessName || user.email}</p>
              </div>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={handleLogout}
              className="portal-label !text-[12px] text-p-ink/70 transition hover:text-p-brandink"
            >
              Sign out
            </button>
            <button
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              title={theme === 'light' ? 'Dark mode' : 'Light mode'}
              className="portal-label flex items-center gap-1.5 border border-p-line px-2.5 py-1.5 !text-[11px] text-p-ink/75 transition hover:border-p-brandink hover:text-p-brandink"
            >
              {theme === 'light' ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              )}
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="min-h-svh min-w-0 flex-1">
        {/* Top bar (mobile) */}
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-p-line bg-p-paper/80 px-4 backdrop-blur lg:hidden">
          <Link href="/portal" aria-label="PodLab Portal home">
            <Image src={logoFor(theme)} alt="PodLab Portal" width={720} height={229} unoptimized className="h-auto w-[136px]" />
          </Link>
          <div className="flex items-center gap-2">
          {!isStaff && <PotatoBadge onOpen={() => setSidebarOpen(true)} />}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open portal menu"
            className="flex h-10 w-10 items-center justify-center border border-p-line text-p-ink transition hover:border-p-brandink hover:text-p-brandink"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 6h14M3 10h14M3 14h14" />
            </svg>
          </button>
          </div>
        </div>

        {viewAs && (
          <div role="status" className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-p-warn/50 bg-p-warn/10 px-4 py-3 backdrop-blur sm:px-8 lg:top-0 lg:px-12">
            <p className="text-base text-p-ink">
              <span className="portal-label mr-2 !text-[12px] text-p-warn">Viewing as client</span>
              {client?.business_name ?? 'Loading…'} · read-only, nothing you click changes their account.
            </p>
            <button
              onClick={() => {
                exitViewAs();
                window.location.href = `/portal/clients/${viewAs}`;
              }}
              className="portal-label border border-p-ink/40 px-4 py-2 !text-[12px] text-p-ink transition hover:border-p-brandink hover:text-p-brandink"
            >
              Exit
            </button>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</div>
      </main>

      {!isStaff && <PotatoSmoke />}
      {/* TipTop acts for the client; never in a staff preview. */}
      {!viewAs && <TipTop />}
    </div>
  );
}

export default function PortalShellRoot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Staff preview: wrap fetch during render, before PortalProvider's effects read anything.
  if (typeof window !== 'undefined') installViewAs();
  // The editors' brand kit link is public (the token is the credential): no
  // session check, no sidebar, no TipTop.
  if (pathname?.startsWith('/portal/kit/')) return <div className="portal min-h-svh bg-p-paper">{children}</div>;
  return (
    <PortalProvider>
      <PortalShell>{children}</PortalShell>
    </PortalProvider>
  );
}
