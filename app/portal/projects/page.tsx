import ComingSoon from '@/components/portal/ComingSoon';

// Placeholder: track B replaces this with Projects (reviews, approvals, credits).
export default function ProjectsTab() {
  return (
    <ComingSoon
      title="Your"
      accent="projects."
      body="Everything that needs your review or approval is moving into one list here, along with buying credits and sending footage to edit. Your videos are still where they were."
      cta={{ label: 'Open your videos', href: '/portal/production' }}
    />
  );
}
