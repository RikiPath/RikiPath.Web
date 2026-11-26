import { Target } from 'lucide-react';
import './learningMoments.css';

/** Four-point sparkle used sparingly around milestone heroes. */
function Sparkle({ style }) {
  return (
    <svg viewBox="0 0 10 10" className="rp-mh-spark" style={style} aria-hidden="true">
      <path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4Z" fill="currentColor" />
    </svg>
  );
}

const GOAL_SPARKS = [
  { left: '6%', top: '22%', '--d': '640ms' },
  { left: '84%', top: '10%', '--d': '760ms' },
  { left: '90%', top: '58%', '--d': '880ms' },
  { left: '10%', top: '72%', '--d': '980ms' },
];

/**
 * Goal confirmed: a target disc springs in, a soft wave spreads once, a green success check is drawn and a few
 * sparkles mark the milestone. No mascot, no confetti.
 */
export function GoalHero() {
  return (
    <div className="rp-mh-goal" aria-hidden="true">
      <span className="rp-mh-goal-halo" />
      <span className="rp-mh-goal-wave" />
      <span className="rp-mh-goal-disc">
        <Target className="h-[44px] w-[44px] text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.12)]" strokeWidth={2.2} />
      </span>
      <span className="rp-mh-goal-check">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <path
            className="rp-mh-draw"
            pathLength="1"
            d="M5 12.5 10 17.5 19 7.5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {GOAL_SPARKS.map((style) => <Sparkle key={style.left} style={style} />)}
    </div>
  );
}

// Path through the stations (exact segment end points so nodes sit on the drawn line).
const JOURNEY_D = 'M20 98 Q40 98 58 80 T100 60 T144 62 T198 34';
const JOURNEY_NODES = [
  { x: 20, y: 98, d: 260, lit: true },
  { x: 58, y: 80, d: 460, lit: true },
  { x: 100, y: 60, d: 660, lit: false },
  { x: 144, y: 62, d: 860, lit: false },
];

/**
 * Roadmap ready: the route is drawn, stations pop in one by one (the first ones light up), and the goal flag
 * lands last with a soft glow. Same Sakura line language as the Learning Journey map.
 */
export function JourneyHero({ ai = false }) {
  return (
    <svg viewBox="0 0 220 124" className="rp-mh-journey h-[124px]" aria-hidden="true">
      <defs>
        <linearGradient id="rp-mh-route" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#F27A9B" />
          <stop offset="1" stopColor={ai ? '#7C6CE0' : '#CC4B6B'} />
        </linearGradient>
      </defs>
      {/* faint full track, then the drawn route on top */}
      <path d={JOURNEY_D} fill="none" stroke="#EAE3E4" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 9" />
      <path
        className="rp-mh-journey-path"
        pathLength="1"
        d={JOURNEY_D}
        fill="none"
        stroke="url(#rp-mh-route)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {JOURNEY_NODES.map((n) => (
        <g key={n.x}>
          {n.lit && <circle className="rp-mh-node-glow" cx={n.x} cy={n.y} r="9" fill="#F27A9B" style={{ '--d': `${n.d + 200}ms` }} />}
          <circle
            className="rp-mh-node"
            cx={n.x}
            cy={n.y}
            r="8"
            fill={n.lit ? '#E05A7A' : '#FFFFFF'}
            stroke={n.lit ? '#FFFFFF' : '#DEC9CE'}
            strokeWidth="3"
            style={{ '--d': `${n.d}ms` }}
          />
        </g>
      ))}
      <circle className="rp-mh-node-glow" cx="198" cy="34" r="12" fill="#F6C453" style={{ '--d': '1260ms' }} />
      <g className="rp-mh-flag">
        <circle cx="198" cy="34" r="12" fill="#FFFFFF" stroke="#F6C453" strokeWidth="3" />
        <path d="M194 41 V26" stroke="#94660A" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M194.5 26.5 L204 29.5 L194.5 33 Z" fill="#DB9A14" />
      </g>
    </svg>
  );
}
