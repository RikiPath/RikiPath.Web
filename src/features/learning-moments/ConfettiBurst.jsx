/**
 * Short, light confetti burst for big moments (purchase success, large streak milestones, stage pass).
 * Plays once (~1.6s), transform/opacity only, hidden entirely under prefers-reduced-motion (tokens.css).
 */
const PIECES = [
  { left: '8%', delay: 0, color: '#F7B6C8', w: 7, h: 11 },
  { left: '18%', delay: 120, color: '#FFD166', w: 6, h: 9 },
  { left: '29%', delay: 60, color: '#7FD8B5', w: 8, h: 8 },
  { left: '40%', delay: 200, color: '#F27A9B', w: 6, h: 11 },
  { left: '52%', delay: 30, color: '#9DB8F5', w: 7, h: 9 },
  { left: '63%', delay: 160, color: '#FFD166', w: 8, h: 8 },
  { left: '74%', delay: 90, color: '#F7B6C8', w: 6, h: 10 },
  { left: '84%', delay: 220, color: '#7FD8B5', w: 7, h: 9 },
  { left: '92%', delay: 50, color: '#F27A9B', w: 6, h: 8 },
];

export default function ConfettiBurst({ colors }) {
  return (
    <div aria-hidden="true" className="rp-cel-confetti pointer-events-none absolute inset-x-0 top-0 h-[260px] overflow-hidden">
      {PIECES.map((p, i) => (
        <span
          key={p.left}
          className="rp-cel-confetti-piece absolute -top-3 rounded-[2px]"
          style={{
            left: p.left,
            width: p.w,
            height: p.h,
            background: colors?.[i % colors.length] || p.color,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
