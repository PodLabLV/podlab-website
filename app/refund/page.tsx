import Navigation from "@/components/Navigation";
import Link from "next/link";
import HomePageWrapper from '@/components/HomePageWrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'PodLab LV refund policy. Our commitment to client satisfaction and how we handle refund requests.',
  openGraph: {
    title: 'Refund Policy',
    description: 'PodLab refund policy and satisfaction guarantee.',
    url: 'https://podlablv.com/refund',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RefundPolicyPage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />

        <section className="relative z-10 pt-32 pb-24 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-black mb-4 font-display">REFUND POLICY</h1>
            <p className="text-text-secondary mb-12">Last updated: April 2, 2026</p>

            <div className="glass-card p-8 md:p-12 space-y-10 text-text-secondary leading-relaxed">

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">1. Our Commitment</h2>
                <p>
                  PodLab LV is committed to delivering high-quality, custom work for every client. We invest significant time, expertise, and resources into every Lab engagement — from strategy and research to production and delivery. Because our services are custom-built for each client, our refund policy reflects the nature of bespoke creative work.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">2. How Our Services Work</h2>
                <p className="mb-3">
                  Every PodLab engagement follows a structured process:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Discovery & Strategy:</strong> We research your business, audience, and goals before any creative work begins</li>
                  <li><strong className="text-white">Production:</strong> Custom deliverables are created specifically for your business</li>
                  <li><strong className="text-white">Review & Revisions:</strong> You review the work and request revisions within the agreed scope</li>
                  <li><strong className="text-white">Delivery:</strong> Final deliverables are handed off with full documentation</li>
                </ul>
                <p className="mt-3">
                  This means that once work begins, significant resources have already been committed to your project.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">3. Refund Policy by Service</h2>

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">AssetsLab ($1,500)</h3>
                <p>
                  Full payment is due before work begins. Once the discovery process has started (intake form completed and strategy session scheduled), no refund is available. If you cancel before any work begins, a full refund will be issued.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">BrandLab ($3,500)</h3>
                <p>
                  A 50% deposit is required to begin. The deposit is non-refundable once the creative brief has been completed. The remaining balance is due upon delivery. If you cancel before any design work begins, the deposit will be refunded.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">SiteLab ($3,500)</h3>
                <p>
                  A 50% deposit is required to begin. The deposit is non-refundable once development has started (wireframes approved or coding has begun). The remaining balance is due upon launch. If you cancel before any development work begins, the deposit will be refunded.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">VideoSalesLab ($10,000)</h3>
                <p>
                  Payment is structured per your client agreement (typically 50% deposit, 50% upon delivery). The deposit is non-refundable once pre-production has begun (scripting, scheduling, or studio preparation). No refunds are issued after the filming session has taken place.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-2">ExpansionLab ($5,000/month)</h3>
                <p>
                  Billed monthly. Cancellation requires 30 days written notice. No refunds are issued for the current billing period. If you cancel mid-month, service continues through the end of that billing cycle. There are no refunds for previous months of service.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">4. Satisfaction Guarantee</h2>
                <p className="mb-3">
                  We stand behind our work. Every Lab engagement includes revisions within the agreed scope:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">AssetsLab:</strong> 1 round of revisions on all deliverables</li>
                  <li><strong className="text-white">BrandLab:</strong> 2 rounds of revisions on logo and brand identity</li>
                  <li><strong className="text-white">SiteLab:</strong> 2 rounds of revisions on design and content</li>
                  <li><strong className="text-white">VideoSalesLab:</strong> 2 rounds of editing revisions per video</li>
                  <li><strong className="text-white">ExpansionLab:</strong> Ongoing revisions as part of monthly retainer</li>
                </ul>
                <p className="mt-3">
                  If you&apos;re not satisfied with the work, we&apos;ll work with you through the revision process to get it right. Additional revisions beyond the agreed scope may incur additional fees, which will be communicated and approved before work proceeds.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">5. When Refunds Are Not Available</h2>
                <p className="mb-3">Refunds are not available in the following situations:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Work has already been completed and delivered</li>
                  <li>You have approved deliverables and then changed your mind</li>
                  <li>You failed to provide required materials, feedback, or approvals within agreed timelines, causing project delays</li>
                  <li>Your business circumstances changed after work began (e.g., you decided to go in a different direction)</li>
                  <li>You are dissatisfied with results that are outside PodLab&apos;s control (e.g., market conditions, your team&apos;s implementation)</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">6. Cancellation Process</h2>
                <p className="mb-3">To cancel a service or request a refund:</p>
                <ol className="list-decimal ml-6 space-y-2">
                  <li>Email <a href="mailto:info@podlablv.com" className="text-accent hover:underline">info@podlablv.com</a> with your cancellation request</li>
                  <li>Include your name, the service you&apos;re canceling, and the reason for cancellation</li>
                  <li>We will review your request and respond within 5 business days</li>
                  <li>If a refund is approved, it will be processed to your original payment method via Stripe within 10 business days</li>
                </ol>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">7. Disputes</h2>
                <p>
                  If you believe you are owed a refund and we disagree, we encourage you to reach out directly so we can resolve the issue. We are committed to fair outcomes. If we cannot resolve the dispute informally, the dispute resolution terms in our <Link href="/terms" className="text-accent hover:underline">Terms of Service</Link> apply (governing law: State of Nevada; venue: Clark County, Nevada).
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">8. Payment Processing</h2>
                <p>
                  All payments and refunds are processed through Stripe. Refund timing depends on your bank or credit card provider — typically 5–10 business days after we initiate the refund. PodLab is not responsible for delays caused by your financial institution.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">9. Changes to This Policy</h2>
                <p>
                  We may update this Refund Policy from time to time. Changes will be posted on this page with an updated date. The refund terms in your signed client agreement take precedence over this general policy.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">10. Contact</h2>
                <p>
                  Questions about refunds or billing? Contact us:
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
              <Link href="/cookies" className="text-accent hover:underline">Cookie Policy</Link>
              <span className="text-text-secondary">|</span>
              <Link href="/acceptable-use" className="text-accent hover:underline">Acceptable Use</Link>
            </div>
          </div>
        </section>
      </div>
    </HomePageWrapper>
  );
}
