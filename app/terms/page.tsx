import Navigation from "@/components/Navigation";
import Link from "next/link";
import HomePageWrapper from '@/components/HomePageWrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'PodLab LV terms of service. Terms and conditions for using our website and services.',
  openGraph: {
    title: 'Terms of Service',
    description: 'Terms and conditions for using PodLab services.',
    url: 'https://podlablv.com/terms',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfServicePage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />

        <section className="relative z-10 pt-32 pb-24 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-black mb-4 font-display">TERMS OF SERVICE</h1>
            <p className="text-text-secondary mb-12">Last updated: August 13, 2026</p>

            <div className="glass-card p-8 md:p-12 space-y-10 text-text-secondary leading-relaxed">

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">1. Agreement to Terms</h2>
                <p>
                  By accessing or using the PodLab LV website (<a href="https://podlablv.com" className="text-accent hover:underline">podlablv.com</a>) and our services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our site or services.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">2. Services</h2>
                <p className="mb-3">
                  PodLab LV provides content production, brand development, website design, and marketing services for service-based businesses. Our core offerings include:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">AssetsLab</strong> — Strategic clarity and messaging foundation</li>
                  <li><strong className="text-white">BrandLab</strong> — Complete brand identity development</li>
                  <li><strong className="text-white">SiteLab</strong> — High-converting website design and development</li>
                  <li><strong className="text-white">VideoSalesLab</strong> — Strategic 4K video asset production</li>
                  <li><strong className="text-white">ExpansionLab</strong> — Ongoing marketing and growth management</li>
                </ul>
                <p className="mt-3">
                  Specific deliverables, timelines, and pricing are outlined in individual client agreements and statements of work.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">3. Client Engagements</h2>
                <p className="mb-3">All paid engagements are governed by a separate client agreement that includes:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Scope of work and deliverables</li>
                  <li>Timeline and milestones</li>
                  <li>Payment terms and schedule</li>
                  <li>Revision policy</li>
                  <li>Intellectual property rights</li>
                </ul>
                <p className="mt-3">
                  These Terms of Service apply to website usage. Client agreements take precedence for paid service engagements.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">4. Payments & Refunds</h2>
                <p className="mb-3">
                  All payments are processed securely through Stripe. By making a payment, you agree to Stripe&apos;s terms of service.
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Deposits:</strong> A deposit is required to begin any Lab engagement. Deposits are non-refundable once work has commenced.</li>
                  <li><strong className="text-white">Recurring services:</strong> ExpansionLab retainers are billed monthly. Cancellation requires 30 days written notice.</li>
                  <li><strong className="text-white">Refunds:</strong> Refunds are evaluated on a case-by-case basis. No refunds are issued for completed deliverables.</li>
                  <li><strong className="text-white">Late payments:</strong> Invoices not paid within 15 days of the due date may incur a late fee of 1.5% per month.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">5. Intellectual Property</h2>
                <h3 className="text-lg font-semibold text-white mt-4 mb-2">Our Content</h3>
                <p>
                  All content on this website — including text, graphics, logos, images, videos, and software — is the property of PodLab LV or its content providers and is protected by copyright and trademark laws. You may not reproduce, distribute, or create derivative works without written permission.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-2">Client Deliverables</h3>
                <p>
                  Upon full payment, clients receive ownership of deliverables as specified in their client agreement. PodLab retains the right to showcase completed work in our portfolio and marketing materials unless otherwise agreed in writing.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">6. Website Use</h2>
                <p className="mb-3">When using our website, you agree not to:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Use the site for any unlawful purpose</li>
                  <li>Attempt to gain unauthorized access to any part of the site</li>
                  <li>Scrape, data mine, or harvest content without permission</li>
                  <li>Submit false information through our forms or assessment</li>
                  <li>Interfere with the proper functioning of the site</li>
                  <li>Use automated systems to access the site without permission</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">7. Assessment & Lead Information</h2>
                <p>
                  Our Founder Bottleneck Assessment is a free diagnostic tool. By completing the assessment, you consent to PodLab storing your responses and contact information for the purpose of providing results and follow-up recommendations. See our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link> for details on data handling.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">8. SMS / Text Messaging</h2>
                <p className="mb-3">
                  By providing your mobile phone number and opting in, you consent to receive text messages from PodLab LV related to your inquiry, including appointment reminders, scheduling confirmations, and follow-up about services you requested. Message frequency varies. Message and data rates may apply.
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Reply <strong className="text-white">STOP</strong> at any time to opt out of text messages</li>
                  <li>Reply <strong className="text-white">HELP</strong> for assistance</li>
                  <li>Opt-in is not a condition of purchasing any goods or services</li>
                </ul>
                <p className="mt-3">
                  <strong className="text-white">Mobile information and messaging consent will not be shared with third parties or affiliates for marketing or promotional purposes.</strong> Text messaging originator opt-in data and consent will not be shared with any third parties. For full details, see our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">9. Affiliate Program (Beaker Program)</h2>
                <p className="mb-3">
                  Participation in our affiliate program is subject to separate affiliate terms. Key points:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Commission rates are outlined in the affiliate agreement</li>
                  <li>PodLab reserves the right to modify or terminate the affiliate program at any time</li>
                  <li>Affiliates must not make false or misleading claims about PodLab services</li>
                  <li>PodLab reserves the right to reject affiliate applications at its discretion</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">10. Third-Party Services</h2>
                <p>
                  Our site integrates with third-party services including Calendly, YouTube, Stripe, and social media platforms. Your use of these services is subject to their respective terms. PodLab is not responsible for third-party service availability, content, or practices.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">11. Disclaimer of Warranties</h2>
                <p>
                  Our website and services are provided &quot;as is&quot; without warranties of any kind, either express or implied. We do not guarantee that our website will be uninterrupted, error-free, or free of viruses. Results from our services vary and are not guaranteed — your success depends on multiple factors including your implementation, market conditions, and business fundamentals.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">12. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, PodLab LV shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our website or services. Our total liability for any claim shall not exceed the amount you paid to PodLab in the twelve (12) months preceding the claim.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">13. Indemnification</h2>
                <p>
                  You agree to indemnify and hold harmless PodLab LV, its officers, employees, and agents from any claims, damages, losses, or expenses arising from your use of our website or violation of these terms.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">14. Governing Law</h2>
                <p>
                  These Terms are governed by the laws of the State of Nevada, without regard to conflict of law principles. Any disputes shall be resolved in the courts located in Clark County, Nevada.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">15. Changes to Terms</h2>
                <p>
                  We reserve the right to update these Terms at any time. Changes will be posted on this page with an updated date. Continued use of the site constitutes acceptance of modified terms.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">16. Contact</h2>
                <p>
                  Questions about these Terms? Contact us:
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
              <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
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
