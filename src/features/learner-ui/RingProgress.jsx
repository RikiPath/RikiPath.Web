import { cx } from '@/components/ui';

const RING_STROKE = {
  brand: 'stroke-rp-brand',
  mint: 'stroke-rp-mint',
  lavender: 'stroke-rp-lavender',
  peach: 'stroke-rp-peach',
  sky: 'stroke-rp-sky',
  navy: 'stroke-rp-navy',
  success: 'stroke-rp-success',
};

const RING_TRACK = {
  brand: 'stroke-rp-brand-soft',
  mint: 'stroke-rp-mint-line/60',
  lavender: 'stroke-rp-lavender-line/60',
  peach: 'stroke-rp-peach-line/60',
  sky: 'stroke-rp-sky-line/60',
  navy: 'stroke-rp-navy-line/60',
  success: 'stroke-rp-success-line/60',
};

/**
 * Accessible SVG radial progress indicator paired with ARIA progressbar semantics.
 */
export default function RingProgress({
  value = 0,
  max = 100,
  size = 64,
  strokeWidth = 6,
  tone = 'brand',
  label,
  sublabel,
  className,
}) {
  const safeMax = Number(max) > 0 ? Number(max) : 100;
  const pct = Math.max(0, Math.min(100, Math.round((Number(value || 0) / safeMax) * 100)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.max(0, Math.min(safeMax, Number(value || 0)))}
      className={cx('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={RING_TRACK[tone] || RING_TRACK.brand}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cx(
            'transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none',
            RING_STROKE[tone] || RING_STROKE.brand,
          )}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        <span className="text-xs font-extrabold tabular-nums text-rp-text">{pct}%</span>
        {sublabel && <span className="mt-0.5 text-[9.5px] font-semibold text-rp-text-muted">{sublabel}</span>}
      </div>
    </div>
  );
}
