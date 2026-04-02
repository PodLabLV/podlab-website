import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link href="/" className="text-xl font-bold font-display text-white hover:text-accent transition-colors">
              PODLAB
            </Link>
            <p className="text-sm text-text-secondary mt-2">
              Record once. Sell forever.
            </p>
            <p className="text-sm text-text-secondary mt-1">
              Content studio &amp; growth lab for service-based founders.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Company</h3>
            <div className="flex flex-col gap-2">
              <Link href="/about" className="text-sm text-text-secondary hover:text-accent transition-colors">About</Link>
              <Link href="/services" className="text-sm text-text-secondary hover:text-accent transition-colors">Services</Link>
              <Link href="/case-studies" className="text-sm text-text-secondary hover:text-accent transition-colors">Case Studies</Link>
              <Link href="/contact" className="text-sm text-text-secondary hover:text-accent transition-colors">Contact</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Legal</h3>
            <div className="flex flex-col gap-2">
              <Link href="/terms" className="text-sm text-text-secondary hover:text-accent transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="text-sm text-text-secondary hover:text-accent transition-colors">Privacy Policy</Link>
              <Link href="/cookies" className="text-sm text-text-secondary hover:text-accent transition-colors">Cookie Policy</Link>
              <Link href="/acceptable-use" className="text-sm text-text-secondary hover:text-accent transition-colors">Acceptable Use</Link>
              <Link href="/refund" className="text-sm text-text-secondary hover:text-accent transition-colors">Refund Policy</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-text-secondary">
            © {new Date().getFullYear()} PodLab LV LLC. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <a href="mailto:info@podlablv.com" className="hover:text-accent transition-colors">info@podlablv.com</a>
            <span>•</span>
            <span>Las Vegas, NV</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
