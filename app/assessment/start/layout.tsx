import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Founder Bottleneck Assessment | Free 5-Minute Test | PodLab',
  description: 'Discover exactly where founder dependency is costing you time and revenue. Take our free 20-question assessment and get your personalized bottleneck score in 5 minutes.',
  openGraph: {
    title: 'Founder Bottleneck Assessment | Free 5-Minute Test',
    description: 'Discover exactly where founder dependency is costing you time and revenue. Free 20-question assessment.',
    url: 'https://podlablv.com/assessment',
  },
  twitter: {
    title: 'Founder Bottleneck Assessment | Free 5-Minute Test',
    description: 'Discover exactly where founder dependency is costing you time and revenue.',
  },
};

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
