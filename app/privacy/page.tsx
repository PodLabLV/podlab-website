import Navigation from "@/components/Navigation";
import Link from "next/link";
import HomePageWrapper from '@/components/HomePageWrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'PodLab LV privacy policy. How we collect, use, and protect your data.',
  openGraph: {
    title: 'Privacy Policy',
    description: 'How PodLab collects, uses, and protects your data.',
    url: 'https://podlablv.com/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />

        <section className="relative z-10 pt-32 pb-24 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-black mb-4 font-display">PRIVACY POLICY</h1>
            <p className="text-text-secondary mb-12">Last updated: August 12, 2026</p>

            <div className="glass-card p-8 md:p-12 space-y-10 text-text-secondary leading-relaxed">

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">1. Who We Are</h2>
                <p>
                  PodLab LV (&quot;PodLab,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is a content studio and growth lab based in Las Vegas, Nevada. We help service-based founders duplicate their expertise through strategic video assets and marketing systems.
                </p>
                <p className="mt-3">
                  <strong className="text-white">Website:</strong> <a href="https://podlablv.com" className="text-accent hover:underline">podlablv.com</a><br />
                  <strong className="text-white">Contact:</strong> <a href="mailto:info@podlablv.com" className="text-accent hover:underline">info@podlablv.com</a>
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
                <p className="mb-3">We collect information you provide directly and information collected automatically when you visit our site.</p>
                
                <h3 className="text-lg font-semibold text-white mt-6 mb-2">Information You Provide</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Contact forms:</strong> Name, email address, phone number, company name, and message content</li>
                  <li><strong className="text-white">Bottleneck Assessment:</strong> Your assessment responses, scores, name, email, and optional phone/company info</li>
                  <li><strong className="text-white">Booking:</strong> Scheduling information through our Calendly integration</li>
                  <li><strong className="text-white">Podcast/Affiliate applications:</strong> Name, email, business details</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">Information Collected Automatically</h3>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Analytics:</strong> Pages visited, time on site, referral source, device type, browser type (via Google Analytics and Microsoft Clarity)</li>
                  <li><strong className="text-white">Cookies:</strong> Session cookies, analytics cookies, and advertising cookies (see Section 7)</li>
                  <li><strong className="text-white">Log data:</strong> IP address, access times, pages viewed</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
                <ul className="list-disc ml-6 space-y-2">
                  <li>To respond to your inquiries and provide our services</li>
                  <li>To process and deliver assessment results</li>
                  <li>To schedule and manage consultation calls</li>
                  <li>To send follow-up communications related to your inquiry (you can opt out at any time)</li>
                  <li>To improve our website, services, and user experience</li>
                  <li>To analyze site traffic and usage patterns</li>
                  <li>To run targeted advertising campaigns (with your consent where required)</li>
                  <li>To comply with legal obligations</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">4. SMS / Text Messaging</h2>
                <p className="mb-3">
                  If you provide your mobile number and opt in, PodLab LV may send you text messages related to your inquiry, including appointment reminders, scheduling confirmations, and follow-up about services you asked about. Message frequency varies. Message and data rates may apply. Reply <strong className="text-white">STOP</strong> to opt out at any time, or <strong className="text-white">HELP</strong> for assistance.
                </p>
                <p>
                  <strong className="text-white">No mobile information will be shared with third parties or affiliates for marketing or promotional purposes.</strong> Information sharing to subcontractors in support services, such as customer service, is permitted. All other use case categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">5. How We Share Your Information</h2>
                <p className="mb-3">We do not sell your personal information. We may share data with:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Service providers:</strong> Vercel (hosting), Supabase (database), Calendly (scheduling), Stripe (payments), Resend (email), Google (analytics), Microsoft (analytics), Meta (advertising)</li>
                  <li><strong className="text-white">Business operations:</strong> Our internal team for client management and project delivery</li>
                  <li><strong className="text-white">Legal requirements:</strong> When required by law, subpoena, or legal process</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">6. Data Security</h2>
                <p>
                  We use industry-standard security measures including encrypted connections (SSL/TLS), secure database hosting with row-level security, and access controls. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">7. Cookies &amp; Tracking</h2>
                <p className="mb-3">Our site uses the following tracking technologies:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Google Tag Manager (GTM-PMJQL5VL):</strong> Manages analytics and advertising tags</li>
                  <li><strong className="text-white">Google Analytics 4:</strong> Tracks site usage, conversions, and traffic sources</li>
                  <li><strong className="text-white">Microsoft Clarity:</strong> Session recordings and heatmaps to improve user experience</li>
                  <li><strong className="text-white">Meta Pixel:</strong> Tracks conversions from Facebook/Instagram advertising</li>
                </ul>
                <p className="mt-3">
                  You can manage cookies through your browser settings. Disabling cookies may affect site functionality.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">8. Your Rights</h2>
                <p className="mb-3">Depending on your location, you may have the right to:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Access the personal data we hold about you</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Opt out of marketing communications</li>
                  <li>Opt out of the sale or sharing of your personal information (California residents under CCPA)</li>
                </ul>
                <p className="mt-3">
                  To exercise any of these rights, email us at <a href="mailto:info@podlablv.com" className="text-accent hover:underline">info@podlablv.com</a>. We will respond within 30 days.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">9. California Privacy Rights (CCPA)</h2>
                <p>
                  If you are a California resident, you have the right to know what personal information we collect, request deletion, and opt out of the sale of your data. PodLab does not sell personal information. To make a request, contact <a href="mailto:info@podlablv.com" className="text-accent hover:underline">info@podlablv.com</a>.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">10. Data Retention</h2>
                <p>
                  We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. Assessment data and lead information is retained indefinitely unless you request deletion.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">11. Third-Party Links</h2>
                <p>
                  Our site may contain links to third-party websites (YouTube, Calendly, social media). We are not responsible for the privacy practices of these sites. We encourage you to review their privacy policies.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">12. Children&apos;s Privacy</h2>
                <p>
                  Our services are not directed to individuals under 18. We do not knowingly collect personal information from children. If you believe we have collected data from a minor, please contact us immediately.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">13. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated &quot;Last updated&quot; date. Continued use of our site after changes constitutes acceptance of the updated policy.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">14. Contact Us</h2>
                <p>
                  If you have questions about this Privacy Policy, contact us at:
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
              <Link href="/cookies" className="text-accent hover:underline">Cookie Policy</Link>
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
