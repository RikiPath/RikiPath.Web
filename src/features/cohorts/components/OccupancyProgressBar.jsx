import { cx } from '@/components/ui';
import { interpolateOccupancyColor } from './occupancyProgressLogic.js';

const HEIGHT_BY_SIZE = {
  sm: 'h-1.5',
  md: 'h-2',
};

/**
 * Shared class seat-occupancy indicator.
 * - Uses discrete pill segments when `0 < capacity <= segmentedThreshold` (default 4).
 * - Uses a smooth continuous bar when `capacity > segmentedThreshold`.
 * Strictly for seat occupancy (enrolled / capacity), never for learning progress.
 */
export default function OccupancyProgressBar({
  enrolledCount = 0,
  capacity = 0,
  size = 'sm',
  segmentedThreshold = 4,
  label,
  className,
}) {
  const safeCapacity = Math.max(0, Math.trunc(Number(capacity) || 0));
  const safeEnrolled = Math.max(0, Math.trunc(Number(enrolledCount) || 0));
  const clampedEnrolled = safeCapacity > 0 ? Math.min(safeCapacity, safeEnrolled) : 0;
  const threshold = segmentedThreshold == null ? 4 : Math.max(0, Math.trunc(Number(segmentedThreshold) || 0));
  const heightCls = HEIGHT_BY_SIZE[size] || HEIGHT_BY_SIZE.sm;
  const fillColor = interpolateOccupancyColor(clampedEnrolled, safeCapacity);
  const isSegmented = safeCapacity > 0 && safeCapacity <= threshold;

  if (isSegmented) {
    return (
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeCapacity}
        aria-valuenow={clampedEnrolled}
        className={cx('flex w-full items-center gap-1', className)}
      >
        {Array.from({ length: safeCapacity }, (_, idx) => {
          const filled = idx < clampedEnrolled;
          return (
            <span
              key={idx}
              aria-hidden="true"
              className={cx(
                'flex-1 rounded-full transition-colors duration-300 ease-out',
                heightCls,
                !filled && 'bg-[#E5E7EB] ring-1 ring-inset ring-black/[0.06]',
              )}
              style={filled && fillColor ? { backgroundColor: fillColor } : undefined}
            />
          );
        })}
      </div>
    );
  }

  const pct = safeCapacity > 0
    ? Math.max(0, Math.min(100, (clampedEnrolled / safeCapacity) * 100))
    : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeCapacity}
      aria-valuenow={clampedEnrolled}
      className={cx('w-full overflow-hidden rounded-full bg-[#E5E7EB]', heightCls, className)}
    >
      <div
        className="h-full rounded-full transition-[width,background-color] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          backgroundColor: fillColor || 'transparent',
        }}
      />
    </div>
  );
}
