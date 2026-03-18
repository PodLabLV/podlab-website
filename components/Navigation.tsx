'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import ImageWithHover from './ImageWithHover';

const servicesMenu = {
  growthSystem: {
    label: 'GROWTH SYSTEM',
    items: [
      { name: 'The Business Growth System', href: '/services' },
      { name: 'AssetsLab', href: '/labs/assets' },
      { name: 'BrandLab', href: '/labs/brand' },
      { name: 'SiteLab', href: '/labs/site' },
      { name: 'VideoSalesLab', href: '/labs/video-sales' },
      { name: 'ExpansionLab', href: '/labs/expansion' },
    ],
  },
  otherServices: {
    label: 'OTHER SERVICES',
    items: [
      { name: 'How It Started', href: '/how-it-started' },
      { name: 'Become a Beaker', href: '/affiliate' },
    ],
  },
  resources: {
    label: 'RESOURCES',
    items: [
      { name: 'Founder Bottleneck Assessment', href: '/assessment' },
      { name: 'Blog', href: '/blog' },
      { name: 'Case Studies', href: '/case-studies' },
    ],
  },
};

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDesktopDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdownEnter = () => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setDesktopDropdownOpen(true);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setDesktopDropdownOpen(false);
    }, 200);
  };

  const closeMobile = () => {
    setMobileMenuOpen(false);
    setServicesOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center group" onClick={closeMobile}>
          <ImageWithHover
            src="/PodLab-logo-menu.png"
            alt="PodLab"
            width={200}
            height={57}
            className="h-14 w-auto"
          />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/about" className="text-text-secondary hover:text-accent transition">
            About
          </Link>

          {/* Services Dropdown */}
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={handleDropdownEnter}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              className="text-text-secondary hover:text-accent transition flex items-center gap-1"
              onClick={() => setDesktopDropdownOpen(!desktopDropdownOpen)}
            >
              Services
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform duration-200 ${desktopDropdownOpen ? 'rotate-180' : ''}`}
              >
                <path d="M3 5l3 3 3-3" />
              </svg>
            </button>

            {/* Desktop Dropdown Panel */}
            <div
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[600px] bg-[#0a0a0a]/95 backdrop-blur-xl border border-border rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-8 transition-all duration-200 ${
                desktopDropdownOpen
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}
            >
              <div className="grid grid-cols-2 gap-8">
                {/* Column 1: Growth System */}
                <div>
                  <div className="text-xs font-bold text-accent uppercase tracking-widest mb-4">
                    {servicesMenu.growthSystem.label}
                  </div>
                  <div className="space-y-2">
                    {servicesMenu.growthSystem.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block text-text-secondary hover:text-accent hover:translate-x-1 transition-all duration-200 py-1"
                        onClick={() => setDesktopDropdownOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Column 2: Other Services + Resources */}
                <div className="space-y-8">
                  <div>
                    <div className="text-xs font-bold text-accent uppercase tracking-widest mb-4">
                      {servicesMenu.otherServices.label}
                    </div>
                    <div className="space-y-2">
                      {servicesMenu.otherServices.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block text-text-secondary hover:text-accent hover:translate-x-1 transition-all duration-200 py-1"
                          onClick={() => setDesktopDropdownOpen(false)}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-accent uppercase tracking-widest mb-4">
                      {servicesMenu.resources.label}
                    </div>
                    <div className="space-y-2">
                      {servicesMenu.resources.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block text-text-secondary hover:text-accent hover:translate-x-1 transition-all duration-200 py-1"
                          onClick={() => setDesktopDropdownOpen(false)}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Link href="/login" className="text-text-secondary hover:text-accent transition font-semibold">
            Client Login
          </Link>
          <Link
            href="/assessment/start"
            className="px-6 py-2.5 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover transition"
          >
            Calculate Bottleneck
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => {
            setMobileMenuOpen(!mobileMenuOpen);
            if (mobileMenuOpen) setServicesOpen(false);
          }}
          className="md:hidden text-text-primary"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0a0a0a] border-b border-border min-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="px-6 py-6 flex flex-col gap-2">
            <Link
              href="/about"
              onClick={closeMobile}
              className="text-text-secondary hover:text-accent transition py-3 text-lg"
            >
              About
            </Link>

            {/* Services Accordion */}
            <div>
              <button
                onClick={() => setServicesOpen(!servicesOpen)}
                className="w-full flex items-center justify-between text-text-secondary hover:text-accent transition py-3 text-lg"
              >
                Services
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform duration-300 ${servicesOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  servicesOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="pl-4 pb-4 space-y-6">
                  {/* Growth System */}
                  <div>
                    <div className="text-xs font-bold text-accent uppercase tracking-widest mb-3 mt-2">
                      {servicesMenu.growthSystem.label}
                    </div>
                    <div className="space-y-1">
                      {servicesMenu.growthSystem.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMobile}
                          className="block text-text-secondary hover:text-accent transition py-2 pl-2"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Other Services */}
                  <div>
                    <div className="text-xs font-bold text-accent uppercase tracking-widest mb-3">
                      {servicesMenu.otherServices.label}
                    </div>
                    <div className="space-y-1">
                      {servicesMenu.otherServices.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMobile}
                          className="block text-text-secondary hover:text-accent transition py-2 pl-2"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Resources */}
                  <div>
                    <div className="text-xs font-bold text-accent uppercase tracking-widest mb-3">
                      {servicesMenu.resources.label}
                    </div>
                    <div className="space-y-1">
                      {servicesMenu.resources.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMobile}
                          className="block text-text-secondary hover:text-accent transition py-2 pl-2"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/login"
              onClick={closeMobile}
              className="text-text-secondary hover:text-accent transition font-semibold py-3 text-lg"
            >
              Client Login
            </Link>

            <Link
              href="/assessment/start"
              onClick={closeMobile}
              className="px-6 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover transition text-center text-lg mt-4"
            >
              Calculate Bottleneck
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
