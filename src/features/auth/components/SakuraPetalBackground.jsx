// Decorative auth backdrop: a hand-drawn sakura branch (top-left), a few CSS-animated petals,
// a seigaiha wave patch and a faint Fuji outline (bottom-right). No canvas, no per-frame JS;
// everything is pointer-events-none and static under prefers-reduced-motion.
const PETALS = [
  { left: '6%', top: '30%', size: 16, delay: 0, duration: 17, wide: false },
  { left: '18%', top: '78%', size: 12, delay: 5, duration: 20, wide: true },
  { left: '44%', top: '2%', size: 14, delay: 9, duration: 22, wide: true },
  { left: '57%', top: '86%', size: 10, delay: 2, duration: 18, wide: true },
  { left: '72%', top: '4%', size: 13, delay: 7, duration: 21, wide: true },
  { left: '91%', top: '8%', size: 18, delay: 1, duration: 23, wide: false },
  { left: '96%', top: '58%', size: 12, delay: 11, duration: 19, wide: true },
  { left: '30%', top: '92%', size: 11, delay: 13, duration: 24, wide: true },
];

const BLOSSOMS = [
  [62, 48, 15], [96, 30, 12], [128, 62, 16], [160, 40, 11], [188, 78, 14], [214, 52, 12], [240, 96, 15],
  [150, 98, 12], [108, 110, 10], [276, 70, 11], [300, 120, 13], [38, 92, 12], [82, 140, 11], [200, 130, 10],
];

function Petal({ size }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M10 1.5c3.6 2.3 6 5.6 5.5 9.4-.4 3.4-3 6.1-5.5 7.6-2.5-1.5-5.1-4.2-5.5-7.6C4 7.1 6.4 3.8 10 1.5Z" fill="#F3A3BA" />
      <path d="M10 1.5 9 4.2h2Z" fill="#FFF5F7" />
    </svg>
  );
}

function Blossom({ x, y, r }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a, i) => (
        <ellipse key={a} cx="0" cy={-r * 0.55} rx={r * 0.42} ry={r * 0.58} fill={i % 2 ? '#F8C4D2' : '#F2A2B8'} transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.18} fill="#E25D82" />
    </g>
  );
}

export default function SakuraPetalBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#FFF8F7]">
      <div className="absolute inset-0 bg-[radial-gradient(1000px_520px_at_10%_-10%,rgba(248,196,210,0.45),transparent_60%),radial-gradient(800px_480px_at_100%_110%,rgba(242,214,224,0.5),transparent_60%)]" />

      {/* Sakura branch */}
      <svg viewBox="0 0 340 200" className="rp-branch-sway absolute -left-6 -top-4 w-[260px] opacity-90 md:w-[420px]">
        <path d="M-10 18 C 60 30, 120 20, 180 52 S 270 90, 330 130" stroke="#7A4E5C" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M110 30 C 120 70, 100 100, 84 140 M190 60 C 205 90, 200 110, 210 140 M250 88 C 270 80, 290 92, 300 120" stroke="#7A4E5C" strokeWidth="4" fill="none" strokeLinecap="round" />
        {BLOSSOMS.map(([x, y, r]) => <Blossom key={`${x}-${y}`} x={x} y={y} r={r} />)}
      </svg>

      {/* Seigaiha wave patch + faint Fuji outline (desktop) */}
      <svg viewBox="0 0 520 220" className="absolute -bottom-2 right-0 hidden w-[560px] opacity-60 md:block">
        <path d="M120 200 L250 92 Q268 80 286 92 L420 200" fill="none" stroke="#E8C8D2" strokeWidth="2" />
        <path d="M238 104 l18 14 14 -10 14 12 16 -8" fill="none" stroke="#E8C8D2" strokeWidth="2" />
        <g fill="none" stroke="#EFC3D0" strokeWidth="1.6">
          {[0, 1, 2, 3, 4, 5].map((c) => [0, 1].map((r) => (
            <g key={`${c}${r}`} transform={`translate(${300 + c * 46 + (r % 2) * 23} ${200 + r * 18})`}>
              <circle r="30" />
              <circle r="21" />
              <circle r="12" />
            </g>
          )))}
        </g>
      </svg>

      {PETALS.map((p, i) => (
        <span
          key={i}
          className={`rp-petal-drift absolute ${p.wide ? 'hidden md:block' : ''}`}
          style={{ left: p.left, top: p.top, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        >
          <Petal size={p.size} />
        </span>
      ))}
    </div>
  );
}
