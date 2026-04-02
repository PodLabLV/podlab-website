import Navigation from "@/components/Navigation";
import Link from "next/link";
import HomePageWrapper from '@/components/HomePageWrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy',
  description: 'PodLab LV acceptable use policy. Guidelines for using our website, client portal, and services.',
  openGraph: {
    title: 'Acceptable Use Policy',
    description: 'Guidelines for using PodLab website, client portal, and services.',
    url: 'https://podlablv.com/acceptable-use',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AcceptableUsePolicyPage() {
  return (
    <HomePageWrapper>
      <div className="min-h-screen">
        <Navigation />

        <section className="relative z-10 pt-32 pb-24 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-black mb-4 font-display">ACCEPTABLE USE POLICY</h1>
            <p className="text-text-secondary mb-12">Last updated: April 2, 2026</p>

            <div className="glass-card p-8 md:p-12 space-y-10 text-text-secondary leading-relaxed">

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">1. Overview</h2>
                <p>
                  This Acceptable Use Policy (&quot;AUP&quot;) governs your use of PodLab LV&apos;s website (<a href="https://podlablv.com" className="text-accent hover:underline">podlablv.com</a>), client portal (<a href="https://portal.podlablv.com" className="text-accent hover:underline">portal.podlablv.com</a>), studio platform (<a href="https://studio.podlablv.com" className="text-accent hover:underline">studio.podlablv.com</a>), and all related services. By using any PodLab platform, you agree to comply with this policy.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">2. Client Portal Usage</h2>
                <p className="mb-3">
                  The PodLab client portal is provided exclusively to active clients for managing their projects, viewing deliverables, and communicating with our team. When using the portal, you agree to:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Keep your login credentials secure and confidential</li>
                  <li>Notify us immediately if you suspect unauthorized access to your account</li>
                  <li>Use the portal only for its intended purpose — managing your PodLab engagement</li>
                  <li>Not share portal access with unauthorized individuals</li>
                  <li>Not attempt to access other clients&apos; data or accounts</li>
                </ul>
                <p className="mt-3">
                  PodLab reserves the right to suspend or terminate portal access for any violation of this policy.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">3. Studio Platform Usage</h2>
                <p className="mb-3">
                  The PodLab studio platform (studio.podlablv.com) is used for social media management and content scheduling. Users with access agree to:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Use the platform only for authorized PodLab business activities</li>
                  <li>Follow all content guidelines when scheduling or publishing content</li>
                  <li>Not connect personal social media accounts without authorization</li>
                  <li>Report any technical issues or security concerns promptly</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">4. Content Guidelines</h2>
                <p className="mb-3">
                  All content submitted to PodLab — whether through forms, the client portal, or during our engagement — must comply with the following guidelines. You may not submit or request content that:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Is unlawful, defamatory, obscene, or offensive</li>
                  <li>Infringes on any third party&apos;s intellectual property, privacy, or other rights</li>
                  <li>Contains false, misleading, or deceptive claims about products or services</li>
                  <li>Promotes illegal activities, violence, or discrimination</li>
                  <li>Contains malware, viruses, or other harmful code</li>
                  <li>Violates any applicable advertising regulations or industry standards</li>
                </ul>
                <p className="mt-3">
                  PodLab reserves the right to refuse to produce, publish, or distribute any content that violates these guidelines. Clients are responsible for ensuring that information provided to PodLab for content creation is accurate and lawful.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">5. Prohibited Uses</h2>
                <p className="mb-3">When using any PodLab platform or service, you may not:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Attempt to gain unauthorized access to any system, network, or data</li>
                  <li>Use automated tools (bots, scrapers, crawlers) to access the site without written permission</li>
                  <li>Interfere with or disrupt the operation of our platforms</li>
                  <li>Reverse engineer, decompile, or disassemble any part of our software</li>
                  <li>Use our platforms to send spam, unsolicited communications, or phishing attempts</li>
                  <li>Impersonate PodLab, its employees, or other users</li>
                  <li>Use our services to compete directly with PodLab or solicit our clients</li>
                  <li>Resell, sublicense, or redistribute access to our platforms</li>
                  <li>Upload or transmit files that contain viruses or malicious code</li>
                  <li>Violate any applicable local, state, national, or international law</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">6. Assessment Tool</h2>
                <p>
                  Our Founder Bottleneck Assessment at <a href="https://podlablv.com/bottleneck-assessment" className="text-accent hover:underline">podlablv.com/bottleneck-assessment</a> is a free diagnostic tool provided for legitimate business evaluation purposes. You agree to provide accurate information when completing the assessment. Submitting false, misleading, or automated responses is prohibited. PodLab reserves the right to discard assessment results that appear fraudulent or abusive.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">7. Intellectual Property</h2>
                <p className="mb-3">
                  All PodLab intellectual property — including our name, logo, branding, website content, assessment methodology, frameworks, and proprietary processes — is protected by applicable laws. You may not:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Copy, reproduce, or distribute our proprietary content without permission</li>
                  <li>Use our trademarks, logos, or branding without written authorization</li>
                  <li>Claim ownership of PodLab&apos;s frameworks, methodologies, or processes</li>
                  <li>Create derivative works based on our proprietary materials</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">8. Social Media Conduct</h2>
                <p className="mb-3">
                  If PodLab manages your social media accounts as part of an ExpansionLab engagement, you agree to:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Provide accurate brand guidelines and approval workflows</li>
                  <li>Review and approve content within agreed timelines</li>
                  <li>Not revoke platform access without providing reasonable notice</li>
                  <li>Comply with each social platform&apos;s terms of service</li>
                </ul>
                <p className="mt-3">
                  PodLab connects with the following social platforms on behalf of clients: Instagram, LinkedIn, X/Twitter, Facebook, TikTok, and Threads. All managed content follows each platform&apos;s community guidelines and advertising policies.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">9. Enforcement</h2>
                <p className="mb-3">
                  PodLab may take the following actions for violations of this policy:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong className="text-white">Warning:</strong> Written notice of the violation with a request to correct the behavior</li>
                  <li><strong className="text-white">Suspension:</strong> Temporary suspension of access to our platforms</li>
                  <li><strong className="text-white">Termination:</strong> Permanent termination of access and, if applicable, termination of the client agreement</li>
                  <li><strong className="text-white">Legal action:</strong> Pursuit of legal remedies for violations that cause harm to PodLab or third parties</li>
                </ul>
                <p className="mt-3">
                  The severity of the response depends on the nature and impact of the violation. PodLab reserves sole discretion in determining appropriate enforcement actions.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">10. Reporting Violations</h2>
                <p>
                  If you become aware of any misuse of PodLab platforms or violations of this policy, please report it to <a href="mailto:info@podlablv.com" className="text-accent hover:underline">info@podlablv.com</a>. We take all reports seriously and will investigate promptly.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">11. Changes to This Policy</h2>
                <p>
                  We may update this Acceptable Use Policy from time to time. Changes will be posted on this page with an updated date. Continued use of our platforms after changes are posted constitutes acceptance of the updated policy.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">12. Contact</h2>
                <p>
                  Questions about this policy? Contact us:
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
              <Link href="/refund" className="text-accent hover:underline">Refund Policy</Link>
            </div>
          </div>
        </section>
      </div>
    </HomePageWrapper>
  );
}
