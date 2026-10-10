'use client';

/**
 * TipTop — the robot host, drawn inline so he can react in real time.
 *
 * Built as SVG rather than a rendered PNG on purpose: the mood states drive
 * arm rotation, glow intensity and bob speed, which a flat image can't do.
 * The play-button visor is his whole face — there is no mouth to animate, so
 * posture and glow carry the performance.
 */

export type Mood = 'idle' | 'hype' | 'cheer' | 'smirk' | 'thinking';

const ARM_POSE: Record<Mood, { left: number; right: number }> = {
  idle: { left: 4, right: -4 },
  hype: { left: 38, right: -38 },
  cheer: { left: 155, right: -155 },
  smirk: { left: 18, right: -10 },
  thinking: { left: 6, right: -52 },
};

export default function TipTop({
  mood = 'idle',
  className = '',
}: {
  mood?: Mood;
  className?: string;
}) {
  const pose = ARM_POSE[mood];
  const energised = mood === 'cheer' || mood === 'hype';

  return (
    <svg
      viewBox="0 0 200 268"
      className={className}
      role="img"
      aria-label="TipTop, the PodLab host robot"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="tt-chassis" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a3a" />
          <stop offset="45%" stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#0d0d0d" />
        </linearGradient>
        <linearGradient id="tt-visor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>
        <linearGradient id="tt-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="tt-glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="tt-floor" x="-60%" y="-300%" width="220%" height="700%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* floor pool */}
      <ellipse
        cx="100"
        cy="252"
        rx="58"
        ry="9"
        fill="#2ADD1B"
        opacity={energised ? 0.55 : 0.32}
        filter="url(#tt-floor)"
        className="tt-floor"
      />

      <g className={`tt-body tt-${mood}`}>
        {/* legs */}
        {[86, 114].map((x) => (
          <g key={x}>
            <rect x={x - 10} y="178" width="20" height="30" rx="7" fill="url(#tt-chassis)" />
            <rect x={x - 9} y="207" width="18" height="4" rx="2" fill="#2ADD1B" opacity="0.75" />
            <rect x={x - 11} y="211" width="22" height="26" rx="7" fill="url(#tt-chassis)" />
            <rect x={x - 13} y="235" width="26" height="9" rx="4.5" fill="#141414" />
          </g>
        ))}

        {/* torso */}
        <rect x="71" y="106" width="58" height="60" rx="13" fill="url(#tt-chassis)" />
        <rect x="71" y="106" width="58" height="60" rx="13" fill="url(#tt-sheen)" />
        <rect x="80" y="118" width="40" height="15" rx="4" fill="#0f0f0f" opacity="0.85" />
        <path d="M78 156 H122" stroke="#2ADD1B" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
        <rect x="82" y="166" width="36" height="13" rx="5" fill="#161616" />

        {/* arms — pivot at the shoulder via fill-box origin */}
        <g
          className="tt-arm"
          style={{ transformBox: 'fill-box', transformOrigin: '50% 6%', transform: `rotate(${pose.left}deg)` }}
        >
          <circle cx="66" cy="114" r="8.5" fill="#242424" />
          <rect x="59" y="118" width="14" height="27" rx="6" fill="url(#tt-chassis)" />
          <rect x="60" y="144" width="12" height="3.5" rx="1.75" fill="#2ADD1B" opacity="0.8" />
          <rect x="59" y="147" width="14" height="24" rx="6" fill="url(#tt-chassis)" />
          <rect x="60.5" y="170" width="11" height="9" rx="3.5" fill="#101010" />
        </g>
        <g
          className="tt-arm"
          style={{ transformBox: 'fill-box', transformOrigin: '50% 6%', transform: `rotate(${pose.right}deg)` }}
        >
          <circle cx="134" cy="114" r="8.5" fill="#242424" />
          <rect x="127" y="118" width="14" height="27" rx="6" fill="url(#tt-chassis)" />
          <rect x="128" y="144" width="12" height="3.5" rx="1.75" fill="#2ADD1B" opacity="0.8" />
          <rect x="127" y="147" width="14" height="24" rx="6" fill="url(#tt-chassis)" />
          <rect x="128.5" y="170" width="11" height="9" rx="3.5" fill="#101010" />
        </g>

        {/* neck */}
        <rect x="92" y="96" width="16" height="12" rx="4" fill="#1a1a1a" />
        <rect x="90" y="99" width="20" height="3" rx="1.5" fill="#2ADD1B" opacity="0.7" />

        {/* head */}
        <g className="tt-head">
          {/* headband */}
          <path
            d="M56 58 A44 46 0 0 1 144 58"
            fill="none"
            stroke="#232323"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path
            d="M58 54 A42 44 0 0 1 142 54"
            fill="none"
            stroke="#2ADD1B"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.5"
          />
          {/* skull */}
          <rect x="57" y="18" width="86" height="76" rx="26" fill="url(#tt-chassis)" />
          <rect x="57" y="18" width="86" height="76" rx="26" fill="url(#tt-sheen)" />
          {/* visor */}
          <rect x="68" y="32" width="64" height="48" rx="15" fill="url(#tt-visor)" />
          <rect x="68" y="32" width="64" height="48" rx="15" fill="none" stroke="#2ADD1B" strokeWidth="1" opacity="0.35" />
          {/* the face: a play button */}
          <path
            d="M92 43 L116 56 L92 69 Z"
            fill="#2ADD1B"
            filter="url(#tt-glow)"
            className="tt-play"
            strokeLinejoin="round"
          />
          {/* ear cups */}
          {[
            { cx: 52, flip: -1 },
            { cx: 148, flip: 1 },
          ].map(({ cx, flip }) => (
            <g key={cx}>
              <rect x={cx - 11} y="38" width="22" height="38" rx="10" fill="#1f1f1f" />
              <rect
                x={cx - 11 + flip * 3}
                y="44"
                width="6"
                height="26"
                rx="3"
                fill="#2ADD1B"
                opacity="0.7"
              />
            </g>
          ))}
        </g>
      </g>

      <style>{`
        .tt-body { animation: tt-bob 3.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
        .tt-hype { animation-duration: 1.5s; }
        .tt-cheer { animation: tt-jump 0.5s cubic-bezier(.2,.9,.3,1.4) 2; transform-box: fill-box; transform-origin: 50% 100%; }
        .tt-thinking { animation-duration: 5s; }
        .tt-head { animation: tt-tilt 6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
        .tt-smirk .tt-head { transform: rotate(-5deg); animation: none; }
        .tt-thinking .tt-head { transform: rotate(7deg); animation: none; }
        .tt-arm { transition: transform 420ms cubic-bezier(.2,.8,.3,1.2); }
        .tt-play { animation: tt-pulse 2.6s ease-in-out infinite; }
        .tt-hype .tt-play, .tt-cheer .tt-play { animation-duration: 0.7s; }
        .tt-floor { animation: tt-pool 3.4s ease-in-out infinite; }
        @keyframes tt-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes tt-jump { 0% { transform: translateY(0) scaleY(1); } 35% { transform: translateY(-26px) scaleY(1.04); } 100% { transform: translateY(0) scaleY(1); } }
        @keyframes tt-tilt { 0%,100% { transform: rotate(-2.5deg); } 50% { transform: rotate(2.5deg); } }
        @keyframes tt-pulse { 0%,100% { opacity: 0.82; } 50% { opacity: 1; } }
        @keyframes tt-pool { 0%,100% { opacity: 0.3; } 50% { opacity: 0.5; } }
        @media (prefers-reduced-motion: reduce) {
          .tt-body, .tt-head, .tt-play, .tt-floor { animation: none !important; }
        }
      `}</style>
    </svg>
  );
}
