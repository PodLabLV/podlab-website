'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { PortalProvider, usePortal } from '@/lib/portal-data';
import TipTop from '@/components/portal/tiptop/TipTop';
import { PotatoSmoke } from '@/components/portal/HotPotato';
import NotificationBell from '@/components/portal/NotificationBell';
import ProfileMenu from '@/components/portal/ProfileMenu';
import { BottomTabs, TopTabs } from '@/components/portal/PortalTabs';
import { usePortalTheme, logoFor } from '@/components/portal/theme';
import { exitViewAs, installViewAs, viewAsClientId } from '@/lib/portal/view-as';
import { beakerOnlyAllowed } from '@/lib/portal/tabs';


interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  initials: string;
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [theme, toggleTheme] = usePortalTheme();
  const [viewAs] = useState(() => viewAsClientId());
  const { client, isStaff, isBeaker, loading } = usePortal();
  const businessName = client?.business_name ?? '';
  // A Beaker (PodLab affiliate) with no client account: the Beaker tab and their
  // profile, nothing else. Client pages would only be empty for them.
  const beakerOnly = !loading && !client && isBeaker && !viewAs;
  const misplaced = beakerOnly && !beakerOnlyAllowed(pathname);

  useEffect(() => {
    if (misplaced) router.replace('/portal/beaker');
  }, [misplaced, router]);

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

  const menu = user && {
    user,
    businessName: beakerOnly ? 'PodLab Beaker' : businessName,
    isStaff,
    beakerOnly,
    theme,
    onToggleTheme: toggleTheme,
    onSignOut: handleLogout,
  };

  return (
    <div data-theme={theme} className="portal portal-v2 min-h-svh bg-p-paper">
      {/* Header: logo, the four tabs (desktop), the hot potato. Mobile adds the avatar. */}
      <header className="sticky top-0 z-40 border-b border-p-line bg-p-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-8 lg:px-12">
          <Link href={beakerOnly ? '/portal/beaker' : '/portal'} aria-label="PodLab Portal home" className="shrink-0">
            <Image src={logoFor(theme)} alt="PodLab Portal" width={720} height={229} unoptimized className="h-auto w-[136px] lg:w-[150px]" />
          </Link>
          <TopTabs />
          <div className="ml-auto flex items-center gap-2">
            {!beakerOnly && <NotificationBell />}
            {menu && (
              <div className="lg:hidden">
                <ProfileMenu {...menu} direction="down" compact />
              </div>
            )}
          </div>
        </div>
      </header>

      {viewAs && (
        <div role="status" className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-p-warn/50 bg-p-warn/10 px-4 py-3 backdrop-blur sm:px-8 lg:px-12">
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

      <main className="min-w-0">
        <div className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-8 lg:px-12 lg:pb-28 lg:pt-12">{misplaced ? null : children}</div>
      </main>

      {/* Profile: bottom left on desktop. Avatar only until the side gutter is wide enough for the name card. */}
      {menu && (
        <div className="fixed bottom-4 left-4 z-40 hidden lg:block">
          <div className="2xl:hidden">
            <ProfileMenu {...menu} direction="up" compact />
          </div>
          <div className="hidden w-52 2xl:block">
            <ProfileMenu {...menu} direction="up" />
          </div>
        </div>
      )}

      <BottomTabs />

      {!isStaff && !beakerOnly && <PotatoSmoke />}
      {/* TipTop acts for the client; never in a staff preview, and a Beaker-only account has no client for her to act for. */}
      {!viewAs && !beakerOnly && <TipTop />}
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
