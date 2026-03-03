'use client';

import { useState } from 'react';

interface EmailCaptureFormProps {
  onSubmit: (email: string, name: string) => void;
  score: number;
}

export default function EmailCaptureForm({ onSubmit, score }: EmailCaptureFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !name) return;
    
    setIsSubmitting(true);
    
    // Call parent handler
    onSubmit(email, name);
    
    // In production, this would send to your email service
    // Example: ConvertKit, Mailchimp, etc.
    
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border-2 border-accent rounded-2xl p-12">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-4xl font-black mb-4">
            Get Your <span className="text-accent">Results</span>
          </h2>
          <p className="text-xl text-text-secondary">
            Enter your email to see your Founder Bottleneck Score and receive your personalized roadmap.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-text-secondary mb-2 uppercase tracking-wider">
              First Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-6 py-4 bg-bg-secondary border-2 border-border rounded-xl text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none transition-colors text-lg"
              placeholder="Your first name"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-text-secondary mb-2 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-6 py-4 bg-bg-secondary border-2 border-border rounded-xl text-text-primary placeholder-text-tertiary focus:border-accent focus:outline-none transition-colors text-lg"
              placeholder="you@company.com"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full group px-16 py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(57,255,20,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
              {isSubmitting ? 'Sending...' : 'See My Results →'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-accent-hover to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </form>

        <p className="text-sm text-text-tertiary text-center mt-6">
          We'll email your results immediately. No spam, ever.
        </p>
      </div>
    </div>
  );
}
