import { cx } from '@/components/ui';
import WebClayIcon from './WebClayIcon.jsx';

/**
 * Standardized RikiPath Learner Page Banner (`LearnerPageBanner` / `IllustratedPageHeader`).
 * Always renders the unified RikiPath Sakura — Warm Ivory theme:
 * - Background: white (--rp-learner-banner-bg)
 * - Border: #EAE3E4 (--rp-learner-banner-border)
 * - Title: #172B4D (--rp-learner-banner-title)
 * - Eyebrow / Accent: #CC4B6B (--rp-learner-banner-accent)
 * Clean surface without distracting dot overlay, standalone crisp 3D icon with no white card box,
 * and unified 44px white-surface controls vertically centered on the right.
 */
export function LearnerPageBanner({
  icon = 'roadmap',
  iconSize = 'lg',
  tone = 'sakura',
  eyebrow,
  title,
  description,
  badges,
  actions,
  children,
  headingAs = 'h1',
  compact = false,
  className,
}) {
  const Heading = headingAs;

  return (
    <section
      data-learner-banner="warm-ivory"
      data-illustrated-header={tone}
      className={cx(
        'rp-learner-banner relative overflow-hidden rounded-[18px] border',
        compact ? 'px-5 py-3 sm:px-6 sm:py-3.5' : 'px-5 py-3.5 sm:px-6 sm:py-4',
        className,
      )}
    >
      <div className="relative flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex min-w-[min(100%,260px)] flex-1 items-center gap-4 sm:gap-5">
          <WebClayIcon
            name={icon}
            size={iconSize}
            tone={tone}
            hover
            className="-my-1 shrink-0"
          />

          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="rp-learner-banner-accent text-[11px] font-bold uppercase tracking-[0.08em] leading-4">
                {eyebrow}
              </p>
            )}
            <Heading
              className={cx(
                'rp-learner-banner-title font-extrabold tracking-tight leading-snug',
                eyebrow && 'mt-0.5',
                compact ? 'text-[18px] sm:text-[20px]' : 'text-[19px] sm:text-[22px]',
              )}
            >
              {title}
            </Heading>

            {description && (
              <p className="mt-0.5 max-w-2xl text-[12.5px] leading-5 text-rp-text-2 sm:text-[13px]">
                {description}
              </p>
            )}

            {badges && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{badges}</div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2.5">{actions}</div>
        )}
      </div>

      {children && (
        <div className="relative mt-3 border-t border-[#EAE3E4] pt-3">{children}</div>
      )}
    </section>
  );
}

export default LearnerPageBanner;
