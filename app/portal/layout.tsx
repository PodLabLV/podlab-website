'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';

const portalNav = [
  { href: '/portal', label: 'Dashboard', icon: '📊' },
  { href: '/portal/deliverables', label: 'Deliverables', icon: '📦' },
  { href: '/portal/progress', label: 'Progress', icon: '🚀' },
  { href: '/portal/reports', label: 'Reports', icon: '📈' },
  { href: '/portal/invoices', label: 'Invoices', icon: '💰' },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Client info */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#2ADD1B]/20 flex items-center justify-center text-[#2ADD1B] font-bold text-xs">
              MS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">Marcus Simonian</p>
              <p className="text-xs text-white/40 truncate">ExpansionLab Client</p>
            </div>
          </div>
          <Link
            href="/"
            className="mt-3 flex items-center justify-center gap-2 px-3 py-2 text-xs text-white/40 hover:text-white/60 transition rounded-lg hover:bg-white/5"
          >
            ← Back to PodLab
          </Link>
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
