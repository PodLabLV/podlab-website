import type { Metadata } from 'next';
import PortalShellRoot from './portal-shell';

export const metadata: Metadata = {
  title: { absolute: 'PodLab Portal' },
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShellRoot>{children}</PortalShellRoot>;
}
