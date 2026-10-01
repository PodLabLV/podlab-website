import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Private client documents are read from disk by /api/portal/document; make sure
  // they ship with that function (they are deliberately not in /public).
  outputFileTracingIncludes: {
    '/api/portal/document': ['./private/clarity/**/*'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'podlablv.com',
      },
      {
        protocol: 'https',
        hostname: 'calendly.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        // The portal frames a client's own clarity document from this origin.
        // The site-wide DENY above blocks same-origin framing too, which would
        // render the document tab blank. SAMEORIGIN still blocks every other site.
        source: '/portal/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
      {
        // Private clarity documents are framed by /portal/document via signed links.
        source: '/api/portal/document',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/bottleneck-assessment',
        destination: '/assessment',
        permanent: true,
      },
      {
        source: '/bottleneck-assessment/start',
        destination: '/assessment/start',
        permanent: true,
      },
      {
        source: '/podcast',
        destination: '/how-it-started',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      // EssentialsLab — proxied from the standalone Vite project at essentialslab.vercel.app.
      // The destination project has its own rewrite that strips the /essentialslab prefix.
      {
        source: '/essentialslab',
        destination: 'https://essentialslab.vercel.app/essentialslab',
      },
      {
        source: '/essentialslab/:path*',
        destination: 'https://essentialslab.vercel.app/essentialslab/:path*',
      },
    ];
  },
};

export default nextConfig;
