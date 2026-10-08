'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { PortalProvider, usePortal } from '@/lib/portal-data';
import TipTop from '@/components/portal/tiptop/TipTop';
import SidebarNav from '@/components/portal/SidebarNav';


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
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (checking) {
    return (
      <div className="portal flex min-h-svh items-center justify-center bg-black">
        <div className="w-40">
          <div className="h-px overflow-hidden bg-[#1a1a1a]">
            <div className="h-full w-1/3 animate-pulse bg-[#2add1b]" />
          </div>
          <p className="portal-label mt-4 text-center !text-[9px] text-[#eeeeee]/40">Opening portal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal flex min-h-svh bg-black">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-svh w-64 flex-col border-r border-[#1a1a1a] bg-black transition-transform duration-300 lg:sticky ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-[#1a1a1a] px-6 pb-5 pt-6">
          <Link href="/" aria-label="PodLab home" className="block">
            <Image src="/portal/podlab-portal-green.png" alt="PodLab Portal" width={720} height={229} unoptimized className="h-auto w-[184px]" />
          </Link>
        </div>

        <SidebarNav isStaff={isStaff} onNavigate={() => setSidebarOpen(false)} />

        <div className="border-t border-[#1a1a1a] px-6 py-5">
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#2add1b]/40 text-xs font-bold text-[#2add1b]">
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#eeeeee]">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-[#eeeeee]/40">{businessName || user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="portal-label mt-4 !text-[9px] text-[#eeeeee]/40 transition hover:text-[#2add1b]"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="min-h-svh min-w-0 flex-1">
        {/* Top bar (mobile) */}
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#1a1a1a] bg-black/80 px-4 backdrop-blur lg:hidden">
          <Link href="/portal" aria-label="PodLab Portal home">
            <Image src="/portal/podlab-portal-green.png" alt="PodLab Portal" width={720} height={229} unoptimized className="h-auto w-[136px]" />
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open portal menu"
            className="flex h-10 w-10 items-center justify-center border border-[#1a1a1a] text-[#eeeeee] transition hover:border-[#2add1b] hover:text-[#2add1b]"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 6h14M3 10h14M3 14h14" />
            </svg>
          </button>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</div>
      </main>

      <TipTop />
    </div>
  );
}

export default function PortalShellRoot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The editors' brand kit link is public (the token is the credential): no
  // session check, no sidebar, no TipTop.
  if (pathname?.startsWith('/portal/kit/')) return <div className="portal min-h-svh bg-black">{children}</div>;
  return (
    <PortalProvider>
      <PortalShell>{children}</PortalShell>
    </PortalProvider>
  );
}
