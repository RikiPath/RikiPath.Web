import { useId } from 'react';
import { Star } from 'lucide-react';
import { cx } from './cx.js';
import { useLocale } from '@/locales/locale.js';

const STAR_SIZE_CLASSES = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-[18px] w-[18px]',
};

/**
 * Shared 5-star rating display supporting fractional stars and empty ("Chưa có đánh giá") states.
 * Reused across Mentor Directory cards, Mentor Public Profile, Review Breakdown, and Class Discovery.
 */
export function RatingStars({
  rating = null,
  reviewCount = null,
  size = 'sm',
  showScore = false,
  showCount = false,
  countSuffix = 'đánh giá',
  emptyLabel = 'Chưa có đánh giá',
  className = '',
}) {
  const { tr, trf } = useLocale();
  const baseId = useId();
  const numericRating = rating != null && Number.isFinite(Number(rating)) ? Number(rating) : null;
  const safeCount = reviewCount != null && Number.isFinite(Number(reviewCount)) ? Math.max(0, Number(reviewCount)) : null;

  const hasValidRating = numericRating != null && numericRating > 0 && (safeCount == null || safeCount > 0);
  const clampedRating = hasValidRating ? Math.max(0, Math.min(5, numericRating)) : 0;
  const starSizeCls = STAR_SIZE_CLASSES[size] || STAR_SIZE_CLASSES.sm;

  const ariaLabel = hasValidRating
    ? (safeCount != null
        ? trf('{0} trên 5 sao ({1} đánh giá)', { 0: clampedRating.toFixed(1), 1: safeCount })
        : trf('{0} trên 5 sao', { 0: clampedRating.toFixed(1) }))
    : tr(emptyLabel);

  return (
    <div
      className={cx('inline-flex flex-wrap items-center gap-1.5', className)}
      aria-label={ariaLabel}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((idx) => {
          const fillRatio = hasValidRating
            ? Math.max(0, Math.min(1, clampedRating - idx))
            : 0;
          const fillPct = Math.round(fillRatio * 100);
          return (
            <span key={`${baseId}-star-${idx}`} className={cx('relative inline-flex shrink-0', starSizeCls)}>
              <Star
                className={cx(starSizeCls, 'text-[#D1D5DB]')}
                strokeWidth={1.75}
              />
              {fillPct > 0 && (
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${fillPct}%` }}
                >
                  <Star
                    className={cx(starSizeCls, 'fill-amber-400 text-amber-500')}
                    strokeWidth={1.75}
                  />
                </span>
              )}
            </span>
          );
        })}
      </span>

      {hasValidRating ? (
        <span className="inline-flex items-baseline gap-1 text-xs leading-none tabular-nums">
          {showScore && (
            <span className="font-bold text-rp-text">
              {clampedRating.toFixed(1)}
            </span>
          )}
          {showCount && safeCount != null && (
            <span className="text-rp-text-muted">
              ({safeCount} {tr(countSuffix)})
            </span>
          )}
        </span>
      ) : (
        (showScore || showCount) && emptyLabel && (
          <span className="text-xs font-medium text-rp-text-muted">
            {tr(emptyLabel)}
          </span>
        )
      )}
    </div>
  );
}

export default RatingStars;
