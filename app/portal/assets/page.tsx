import ComingSoon from '@/components/portal/ComingSoon';

// Placeholder: track C replaces this with the Assets library.
export default function AssetsTab() {
  return (
    <ComingSoon
      title="Your"
      accent="assets."
      body="Your docs, branding, b-roll and finished videos are moving into one library here. Your brand kit is still where it was."
      cta={{ label: 'Open your brand kit', href: '/portal/brand' }}
    />
  );
}
