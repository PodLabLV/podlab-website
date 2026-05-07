'use client';

import { useState, useCallback, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';

interface LinkConfig {
  label: string;
  basePath: string;
  utmContent?: string;
}

const LINK_CONFIGS: LinkConfig[] = [
  { label: 'Homepage', basePath: '' },
  { label: 'Assessment', basePath: '/assessment/start' },
  { label: 'Services', basePath: '/services' },
  { label: 'AssetsLab', basePath: '/labs/assets', utmContent: 'assetslab' },
  { label: 'BrandLab', basePath: '/labs/brand', utmContent: 'brandlab' },
  { label: 'SiteLab', basePath: '/labs/site', utmContent: 'sitelab' },
  { label: 'VideoSalesLab', basePath: '/labs/video-sales', utmContent: 'videosaleslab' },
  { label: 'ExpansionLab', basePath: '/labs/expansion', utmContent: 'expansionlab' },
  { label: 'Contact', basePath: '/contact' },
];

const SWIPE_COPIES = [
  {
    label: 'LinkedIn DM',
    icon: '',
    getTemplate: (id: string) =>
      `Hey — I came across your profile and thought of something that might help. PodLab helps founders like us turn our expertise into video assets that sell 24/7, so you're not the bottleneck anymore. Worth a look: https://podlablv.com?utm_source=beaker&utm_medium=referral&utm_campaign=${id}`,
  },
  {
    label: 'Email',
    icon: '',
    getTemplate: (id: string) =>
      `Subject: Quick thought on scaling without burning out\n\nHey,\n\nI've been working with PodLab — they help $1M–$8M founders duplicate themselves through strategic video assets. Record once, sell forever. No more being the bottleneck in every deal.\n\nIf you're tired of being the face AND the closer AND the educator, check them out:\nhttps://podlablv.com/assessment/start?utm_source=beaker&utm_medium=referral&utm_campaign=${id}\n\nWorth 5 minutes of your time.\n\nCheers`,
  },
  {
    label: 'Text Message',
    icon: '',
    getTemplate: (id: string) =>
      `Hey! Check out PodLab — they help founders turn their expertise into video assets that close deals on autopilot. Thought of you: https://podlablv.com?utm_source=beaker&utm_medium=referral&utm_campaign=${id}`,
  },
];

const BASE_URL = 'https://podlablv.com';

function buildUtmUrl(basePath: string, beakerId: string, utmContent?: string): string {
  const separator = basePath === '' ? '?' : '?';
  const url = `${BASE_URL}${basePath}${separator}utm_source=beaker&utm_medium=referral&utm_campaign=${encodeURIComponent(beakerId)}`;
  return utmContent ? `${url}&utm_content=${utmContent}` : url;
}

function appendUtmToUrl(rawUrl: string, beakerId: string): string {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set('utm_source', 'beaker');
    url.searchParams.set('utm_medium', 'referral');
    url.searchParams.set('utm_campaign', beakerId);
    return url.toString();
  } catch {
    return '';
  }
}

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
        copied
          ? 'bg-accent/20 text-accent border border-accent/40'
          : 'bg-white/5 text-text-secondary hover:text-accent hover:bg-accent/10 border border-border hover:border-accent/30'
      } ${className}`}
    >
      {copied ? (
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </span>
      ) : (
        'Copy'
      )}
    </button>
  );
}

export default function BeakerUtmPage() {
  const [beakerId, setBeakerId] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [allCopied, setAllCopied] = useState(false);

  const sanitizedId = beakerId.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const hasId = sanitizedId.length > 0;

  const generatedLinks = useMemo(() => {
    if (!hasId) return [];
    return LINK_CONFIGS.map((config) => ({
      ...config,
      url: buildUtmUrl(config.basePath, sanitizedId, config.utmContent),
    }));
  }, [sanitizedId, hasId]);

  const customUtmUrl = useMemo(() => {
    if (!hasId || !customUrl.trim()) return '';
    const trimmed = customUrl.trim();
    if (!trimmed.startsWith('https://podlablv.com')) return '';
    return appendUtmToUrl(trimmed, sanitizedId);
  }, [customUrl, sanitizedId, hasId]);

  const handleCopyAll = useCallback(async () => {
    const allText = generatedLinks.map((l) => `${l.label}: ${l.url}`).join('\n');
    try {
      await navigator.clipboard.writeText(allText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = allText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  }, [generatedLinks]);

  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />

        {/* Hero */}
        <section className="pt-32 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-accent font-mono text-sm tracking-widest uppercase mb-4">
              Beaker Tools
            </p>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[0.95] tracking-tight">
              Your{' '}
              <span className="text-accent drop-shadow-[0_0_25px_rgba(42,221,27,0.5)]">
                Beaker Links
              </span>
            </h1>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Generate your personalized tracking links for every PodLab page. Share them anywhere — we&apos;ll track every referral back to you.
            </p>
          </div>
        </section>

        {/* ID Input */}
        <section className="px-6 pb-8">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-6 md:p-8">
              <label className="block text-text-primary font-semibold text-lg mb-3">
                Your Beaker ID
              </label>
              <p className="text-text-secondary text-sm mb-4">
                Enter your unique Beaker name (e.g. &quot;john-smith&quot;). This will be embedded in all your tracking links.
              </p>
              <input
                type="text"
                value={beakerId}
                onChange={(e) => setBeakerId(e.target.value)}
                placeholder="john-smith"
                className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition font-mono text-lg"
              />
              {beakerId && sanitizedId !== beakerId.trim() && (
                <p className="text-text-secondary text-xs mt-2 font-mono">
                  Formatted as: <span className="text-accent">{sanitizedId}</span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Generated Links */}
        {hasId && (
          <section className="px-6 pb-12">
            <div className="max-w-4xl mx-auto">
              {/* Copy All Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">Your Tracking Links</h2>
                <button
                  onClick={handleCopyAll}
                  className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                    allCopied
                      ? 'bg-accent/20 text-accent border border-accent/40'
                      : 'bg-accent text-black hover:bg-accent-hover'
                  }`}
                >
                  {allCopied ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      All Copied!
                    </span>
                  ) : (
                    'Copy All Links'
                  )}
                </button>
              </div>

              {/* Link Cards */}
              <div className="grid gap-3">
                {generatedLinks.map((link) => (
                  <div
                    key={link.label}
                    className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-semibold text-sm mb-1">{link.label}</p>
                      <p className="text-text-secondary text-xs font-mono truncate">{link.url}</p>
                    </div>
                    <CopyButton text={link.url} />
                  </div>
                ))}
              </div>

              {/* Custom URL */}
              <div className="mt-8">
                <h3 className="text-xl font-bold text-text-primary mb-4">Custom URL</h3>
                <div className="glass-card p-6">
                  <p className="text-text-secondary text-sm mb-3">
                    Paste any <span className="text-accent font-mono">podlablv.com</span> URL and we&apos;ll auto-append your UTM params.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://podlablv.com/any-page"
                      className="flex-1 bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition font-mono text-sm"
                    />
                    {customUtmUrl && <CopyButton text={customUtmUrl} />}
                  </div>
                  {customUrl.trim() && !customUrl.trim().startsWith('https://podlablv.com') && (
                    <p className="text-red-400 text-xs mt-2">
                      URL must start with https://podlablv.com
                    </p>
                  )}
                  {customUtmUrl && (
                    <p className="text-text-secondary text-xs font-mono mt-3 break-all">
                      {customUtmUrl}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Swipe Copy Section */}
        {hasId && (
          <section className="px-6 pb-24">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-primary">Swipe Copy</h2>
                <p className="text-text-secondary text-sm mt-1">
                  Pre-written messages with your tracking link baked in. Copy, paste, send.
                </p>
              </div>

              <div className="grid gap-4">
                {SWIPE_COPIES.map((swipe) => {
                  const content = swipe.getTemplate(sanitizedId);
                  return (
                    <div key={swipe.label} className="glass-card p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-text-primary font-semibold flex items-center gap-2">
                          <span className="text-xl">{swipe.icon}</span>
                          {swipe.label}
                        </h3>
                        <CopyButton text={content} />
                      </div>
                      <pre className="text-text-secondary text-sm whitespace-pre-wrap font-sans leading-relaxed bg-bg-tertiary rounded-lg p-4 border border-border">
                        {content}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Empty State */}
        {!hasId && (
          <section className="px-6 pb-24">
            <div className="max-w-4xl mx-auto text-center py-16">
              <div className="text-6xl mb-4">🧪</div>
              <p className="text-text-secondary text-lg">
                Enter your Beaker ID above to generate your tracking links.
              </p>
            </div>
          </section>
        )}
      </div>
    </HomePageWrapper>
  );
}
