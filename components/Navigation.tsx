'use client';

import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import ImageWithHover from './ImageWithHover';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center group">
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
          <Link href="/services" className="text-text-secondary hover:text-accent transition">
            Services
          </Link>
          <Link href="/assessment" className="text-text-secondary hover:text-accent transition font-semibold">
            Assessment
          </Link>
          <Link href="/case-studies" className="text-text-secondary hover:text-accent transition">
            Case Studies
          </Link>
          <Link href="/about" className="text-text-secondary hover:text-accent transition">
            About
          </Link>
          <Link href="/how-it-started" className="text-text-secondary hover:text-accent transition">
            Podcast
          </Link>
          <Link href="/affiliate" className="text-text-secondary hover:text-accent transition">
            Beaker
          </Link>
          <Link href="/blog" className="text-text-secondary hover:text-accent transition">
            Blog
          </Link>
          <Link href="/login" className="text-text-secondary hover:text-accent transition font-semibold">
            Client Login
          </Link>
          <Link href="/about" className="group flex items-center gap-3">
            <Image 
              src="/about/hiram-hero.png"
              alt="Hiram Andino"
              width={40}
              height={40}
              className="rounded-full border-2 border-border group-hover:border-accent transition"
            />
          </Link>
          <a
            href="https://calendly.com/podlablv/strategy-call"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover transition"
          >
            Schedule Clarity
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
        <div className="md:hidden bg-bg-secondary border-b border-border">
          <div className="px-6 py-4 flex flex-col gap-4">
            <Link href="/services" className="text-text-secondary hover:text-accent transition">
              Services
            </Link>
            <Link href="/assessment" className="text-text-secondary hover:text-accent transition font-semibold">
              Assessment
            </Link>
            <Link href="/case-studies" className="text-text-secondary hover:text-accent transition">
              Case Studies
            </Link>
            <Link href="/about" className="text-text-secondary hover:text-accent transition">
              About
            </Link>
            <Link href="/how-it-started" className="text-text-secondary hover:text-accent transition">
              Podcast
            </Link>
            <Link href="/affiliate" className="text-text-secondary hover:text-accent transition">
              Beaker
            </Link>
            <Link href="/blog" className="text-text-secondary hover:text-accent transition">
              Blog
            </Link>
            <Link href="/login" className="text-text-secondary hover:text-accent transition font-semibold">
              Client Login
            </Link>
            <a
              href="https://calendly.com/podlablv/strategy-call"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-accent text-black font-semibold rounded-lg hover:bg-accent-hover transition text-center"
            >
              Schedule Clarity
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
