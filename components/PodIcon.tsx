import type { SVGProps } from 'react';

/*
 * PodLab custom icon set — replaces emoji throughout the site.
 * Line-art SVGs drawn on a 24×24 grid, colored with the accent
 * green (#2ADD1B) via `currentColor`. Wrap in `text-accent` and
 * an optional glow (drop-shadow) to match the neon aesthetic.
 */

export type PodIconName =
  | 'mic'
  | 'headphones'
  | 'target'
  | 'phone'
  | 'clapper'
  | 'broadcast';

interface PodIconProps extends SVGProps<SVGSVGElement> {
  name: PodIconName;
  /** pixel size for width & height (default 24) */
  size?: number;
}

const paths: Record<PodIconName, React.ReactNode> = {
  // Studio microphone
  mic: (
    <>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </>
  ),
  // Headphones
  headphones: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.5" y="13" width="4" height="7" rx="1.5" />
      <rect x="17.5" y="13" width="4" height="7" rx="1.5" />
    </>
  ),
  // Target / focus
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  // Phone handset (pre-interview call)
  phone: (
    <path d="M6.5 3h3l1.5 4.5-2 1.5a12 12 0 0 0 6 6l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5a2 2 0 0 1 2-2Z" />
  ),
  // Clapperboard (studio session)
  clapper: (
    <>
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <path d="M3 9l2.5-4 18-.5-2.5 4" />
      <line x1="8.5" y1="5" x2="6.5" y2="9" />
      <line x1="14" y1="4.5" x2="12" y2="9" />
      <line x1="19.5" y1="4.5" x2="17.5" y2="9" />
    </>
  ),
  // Broadcast / distribution signal
  broadcast: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M7.7 7.7a6 6 0 0 0 0 8.6M16.3 16.3a6 6 0 0 0 0-8.6" />
      <path d="M4.9 4.9a10 10 0 0 0 0 14.2M19.1 19.1a10 10 0 0 0 0-14.2" />
    </>
  ),
};

export default function PodIcon({ name, size = 24, ...props }: PodIconProps) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
