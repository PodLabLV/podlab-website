'use client';

import CounterNumber from './CounterNumber';

export default function StatsBar() {
  return (
    <div className="bg-gradient-to-r from-bg-tertiary via-bg-secondary to-bg-tertiary border-y border-border py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-black text-accent mb-1">
              <CounterNumber end={200} suffix="+" />
            </div>
            <div className="text-sm md:text-base text-text-secondary uppercase tracking-wider">
              Founders Duplicated
            </div>
          </div>
          
          <div>
            <div className="text-3xl md:text-4xl font-black text-accent mb-1">
              $<CounterNumber end={47} suffix="M+" />
            </div>
            <div className="text-sm md:text-base text-text-secondary uppercase tracking-wider">
              Revenue Impact
            </div>
          </div>
          
          <div>
            <div className="text-3xl md:text-4xl font-black text-accent mb-1">
              <CounterNumber end={4} suffix=".9" /><span>/5</span>
            </div>
            <div className="text-sm md:text-base text-text-secondary uppercase tracking-wider">
              Client Rating
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
