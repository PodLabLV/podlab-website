import Navigation from "@/components/Navigation";
import Link from "next/link";
import HomePageWrapper from '@/components/HomePageWrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'PodLab LV cookie policy. How we use cookies and tracking technologies on our website.',
  openGraph: {
    title: 'Cookie Policy',
    description: 'How PodLab uses cookies and tracking technologies.',
    url: 'https://podlablv.com/cookies',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiePolicyPage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />

        <section className="relative z-10 pt-32 pb-24 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-black mb-4 font-display">COOKIE POLICY</h1>
            <p className="text-text-secondary mb-12">Last updated: April 2, 2026</p>

            <div className="glass-card p-8 md:p-12 space-y-10 text-text-secondary leading-relaxed">

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">1. What Are Cookies</h2>
                <p>
                  Cookies are small text files that are placed on your device when you visit a website. They help websites remember your preferences, understand how you use the site, and improve your experience. Some cookies are essential for the site to function, while others help us analyze traffic and personalize content.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Cookies</h2>
                <p className="mb-3">
                  PodLab LV (<a href="https://podlablv.com" className="text-accent hover:underline">podlablv.com</a>) uses cookies and similar tracking technologies for the following purposes:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Site functionality:</strong> Ensuring the website works correctly, maintaining your session, and remembering your preferences</li>
                  <li><strong className="text-white">Analytics:</strong> Understanding how visitors interact with our site so we can improve the experience</li>
                  <li><strong className="text-white">Advertising:</strong> Measuring the effectiveness of our advertising campaigns and delivering relevant ads</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">3. Types of Cookies We Use</h2>

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">Essential Cookies</h3>
                <p className="mb-3">These cookies are necessary for the website to function and cannot be switched off.</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Session cookies:</strong> Maintain your browsing session as you navigate between pages</li>
                  <li><strong className="text-white">Authentication cookies:</strong> Keep you logged in to the client portal (portal.podlablv.com) via Supabase</li>
                  <li><strong className="text-white">Security cookies:</strong> Help protect against cross-site request forgery and other threats</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">Analytics Cookies</h3>
                <p className="mb-3">These cookies help us understand how visitors use our website.</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Google Analytics 4 (G-F32FR2PPTT):</strong> Tracks page views, session duration, traffic sources, device type, and user behavior. Data is aggregated and anonymized. Retention: up to 26 months.</li>
                  <li><strong className="text-white">Google Tag Manager (GTM-PMJQL5VL):</strong> Manages the loading of analytics and advertising tags. Does not collect data directly but facilitates other tracking tools.</li>
                  <li><strong className="text-white">Microsoft Clarity:</strong> Records session replays and heatmaps to help us understand how users navigate the site. Personal data is masked. Retention: up to 30 days.</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">Advertising Cookies</h3>
                <p className="mb-3">These cookies are used to measure and improve our advertising campaigns.</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Meta Pixel (Facebook/Instagram):</strong> Tracks conversions from our social media advertising campaigns. Helps us understand which ads lead to actions on our site. Retention: up to 180 days.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">4. Third-Party Cookies</h2>
                <p className="mb-3">Some cookies are set by third-party services that appear on our pages:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Calendly:</strong> When you interact with our scheduling widget, Calendly may set cookies to manage your booking session</li>
                  <li><strong className="text-white">YouTube:</strong> Embedded videos may set cookies to track viewing preferences and analytics</li>
                  <li><strong className="text-white">Stripe:</strong> When processing payments, Stripe sets cookies for fraud prevention and session management</li>
                </ul>
                <p className="mt-3">
                  These third-party services have their own cookie and privacy policies. We encourage you to review them.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">5. Managing Cookies</h2>
                <p className="mb-3">You have several options for managing cookies:</p>

                <h3 className="text-lg font-semibold text-white mt-4 mb-2">Browser Settings</h3>
                <p className="mb-3">
                  Most browsers allow you to control cookies through their settings. You can typically find these under &quot;Privacy&quot; or &quot;Security&quot; in your browser&apos;s preferences. Common options include:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Block all cookies</li>
                  <li>Block third-party cookies only</li>
                  <li>Delete cookies when you close your browser</li>
                  <li>Receive a notification before a cookie is set</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">Opt-Out Links</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Google Analytics:</strong> Install the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google Analytics Opt-out Browser Add-on</a></li>
                  <li><strong className="text-white">Meta (Facebook):</strong> Adjust your <a href="https://www.facebook.com/settings/?tab=ads" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Facebook Ad Preferences</a></li>
                  <li><strong className="text-white">Microsoft Clarity:</strong> You can opt out via your browser&apos;s Do Not Track setting</li>
                  <li><strong className="text-white">General opt-out:</strong> Visit <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">aboutads.info/choices</a> or <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Network Advertising Initiative</a></li>
                </ul>

                <p className="mt-4">
                  <strong className="text-white">Note:</strong> Disabling cookies may affect the functionality of our website. Essential cookies cannot be disabled without breaking core features like the client portal login.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">6. Do Not Track</h2>
                <p>
                  Some browsers offer a &quot;Do Not Track&quot; (DNT) setting. There is currently no industry standard for how websites should respond to DNT signals. Our site does not currently respond to DNT signals, but you can use the opt-out methods described above to manage tracking.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">7. Updates to This Policy</h2>
                <p>
                  We may update this Cookie Policy from time to time to reflect changes in the cookies we use or for other operational, legal, or regulatory reasons. Please check this page periodically for updates. The &quot;Last updated&quot; date at the top indicates when the policy was last revised.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">8. Contact Us</h2>
                <p>
                  If you have questions about our use of cookies, contact us at:
                </p>
                <p className="mt-3">
                  <strong className="text-white">PodLab LV</strong><br />
                  Las Vegas, Nevada<br />
                  <a href="mailto:info@podlablv.com" className="text-accent hover:underline">info@podlablv.com</a><br />
                  <a href="https://podlablv.com" className="text-accent hover:underline">podlablv.com</a>
                </p>
              </div>

            </div>

            <div className="mt-12 text-center flex flex-wrap justify-center gap-x-4 gap-y-2">
              <Link href="/" className="text-accent hover:underline">← Back to Home</Link>
              <span className="text-text-secondary">|</span>
              <Link href="/terms" className="text-accent hover:underline">Terms of Service</Link>
              <span className="text-text-secondary">|</span>
              <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
              <span className="text-text-secondary">|</span>
              <Link href="/acceptable-use" className="text-accent hover:underline">Acceptable Use</Link>
              <span className="text-text-secondary">|</span>
              <Link href="/refund" className="text-accent hover:underline">Refund Policy</Link>
            </div>
          </div>
        </section>
      </div>
    </HomePageWrapper>
  );
}
