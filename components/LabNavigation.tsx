'use client';

import Link from 'next/link';
import Image from 'next/image';

const labs = [
  { name: 'AssetsLab', slug: '/labs/assets', icon: '/labs/icons/AssetsLab-icon.png', padding: 'p-1.5' },
  { name: 'BrandLab', slug: '/labs/brand', icon: '/labs/icons/BrandLab-icon.png', padding: 'p-1.5' },
  { name: 'SiteLab', slug: '/labs/site', icon: '/labs/icons/SiteLab-icon.png', padding: 'p-2.5' },
  { name: 'VideoSalesLab', slug: '/labs/video-sales', icon: '/labs/icons/VideoSalesLab-icon.png', padding: 'p-1.5' },
  { name: 'ExpansionLab', slug: '/labs/expansion', icon: '/labs/icons/ExpansionLab-icon.png', padding: 'p-1.5' },
];

interface LabNavigationProps {
  currentLab: string; // e.g. "AssetsLab"
}

export default function LabNavigation({ currentLab }: LabNavigationProps) {
  return (
    <nav className="py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs text-text-secondary uppercase tracking-wider text-center mb-4">Explore All Labs</p>
        <div className="flex justify-center items-end gap-3 sm:gap-4 md:gap-6">
          {labs.map((lab) => {
            const isCurrent = lab.name === currentLab;
            return (
              <Link
                key={lab.name}
                href={lab.slug}
                className={`group flex flex-col items-center gap-1.5 sm:gap-2 transition-all duration-300 ${
                  isCurrent ? '' : 'opacity-50 hover:opacity-100'
                }`}
              >
                <div
                  className={`relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                    isCurrent
                      ? 'border-[#2ADD1B] shadow-[0_0_20px_rgba(42,221,27,0.4)]'
                      : 'border-[#2E2E2E] group-hover:border-[#2ADD1B]/50'
                  }`}
                >
                  <Image
                    src={lab.icon}
                    alt={lab.name}
                    width={64}
                    height={64}
                    className={`w-full h-full object-contain ${lab.padding}`}
                  />
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-semibold text-center leading-tight transition-colors ${
                    isCurrent ? 'text-[#2ADD1B]' : 'text-text-secondary group-hover:text-[#2ADD1B]'
                  }`}
                >
                  {lab.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
