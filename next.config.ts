import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
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
    ];
  },
};

export default nextConfig;
