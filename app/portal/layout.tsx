'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { PortalProvider, usePortal } from '@/lib/portal-data';

// SVG marks, not emoji - this sits in front of clients.
const portalNav = [
  { href: '/portal', label: 'Dashboard', d: 'M4 5h6v6H4zM14 5h6v4h-6zM14 13h6v6h-6zM4 15h6v4H4z' },
  { href: '/portal/document', label: 'Clarity Document', d: 'M6 3h9l5 5v13H6zM15 3v5h5M9 12h8M9 16h5' },
  { href: '/portal/intake', label: 'Intake', d: 'M4 5h16v14H4zM8 9h8M8 13h8M8 17h4' },
  { href: '/portal/delivery', label: 'Delivery', d: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10' },
  { href: '/portal/actions', label: 'Action Items', d: 'M4 6h2l1.5 1.5L11 4M4 12h2l1.5 1.5L11 10M4 18h2l1.5 1.5L11 16M14 6h6M14 12h6M14 18h6' },
  { href: '/portal/deliverables', label: 'Deliverables', d: 'M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10' },
  { href: '/portal/progress', label: 'Progress', d: 'M4 18V9M10 18V5M16 18v-6M22 18H2' },
  { href: '/portal/reports', label: 'Reports', d: 'M4 19h16M6 16V9M11 16V5M16 16v-4' },
  { href: '/portal/invoices', label: 'Invoices', d: 'M6 3h9l5 5v13H6zM15 3v5h5M9 13h8M9 17h5' },
];

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  initials: string;
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const { client } = usePortal();
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
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#2ADD1B] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white/40 text-sm">Loading portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#0F0F0F] border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo area */}
        <div className="h-20 flex items-center px-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-[#2ADD1B] flex items-center justify-center text-black font-bold text-sm">
              P
            </div>
            <span className="font-display text-white text-sm uppercase tracking-wider">
              Client Portal
            </span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {portalNav.map((item) => {
            const isActive =
              item.href === '/portal'
                ? pathname === '/portal'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-[#2ADD1B]/10 text-[#2ADD1B] border border-[#2ADD1B]/20'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d={item.d} /></svg>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Client info + Logout */}
        <div className="px-4 py-4 border-t border-white/5">
          {user && (
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-[#2ADD1B]/20 flex items-center justify-center text-[#2ADD1B] font-bold text-xs">
                {user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-white/40 truncate">
                  {businessName || user.email}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-red-400/70 hover:text-red-400 transition rounded-lg hover:bg-red-500/10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 min-h-screen">
        {/* Top bar (mobile) */}
        <div className="lg:hidden sticky top-0 z-30 h-16 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5 flex items-center px-4 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 text-white/60"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h14M3 10h14M3 14h14" />
            </svg>
          </button>
          <span className="font-display text-white text-xs uppercase tracking-wider">
            Client Portal
          </span>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalProvider>
      <PortalShell>{children}</PortalShell>
    </PortalProvider>
  );
}
