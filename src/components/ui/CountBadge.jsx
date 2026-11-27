import { cx } from './cx.js';
import { normalizeBadgeCount } from './sidebarBadgeLogic.js';

const SINGLE_CHAR_SIZE = {
  xs: 'h-4 w-4 text-[10px]',
  sm: 'h-[18px] w-[18px] text-[10.5px]',
  md: 'h-5 w-5 text-[11px]',
};

const MULTI_CHAR_SIZE = {
  xs: 'h-4 min-w-[16px] px-1 text-[10px]',
  sm: 'h-[18px] min-w-[18px] px-1.5 text-[10.5px]',
  md: 'h-5 min-w-[20px] px-1.5 text-[11px]',
};

/**
 * Shared numeric count badge across all 4 roles (Sidebar, Header, Select, Tabs, Buttons, Statistics).
 * Single-digit counts form a circle (`w === h`); multi-digit counts expand cleanly into a pill.
 *
 * `tone`:
 * - `'auto'` (default): red badge (`#D63F30` / white) on light surfaces; automatically inverts to white badge
 *   with high-contrast brand/status text when nested inside `[data-solid-surface]` (e.g. primary/filled Buttons).
 * - `'danger'`: always solid red with white text.
 * - `'inverse'` / `'light'`: crisp white badge with Sakura-strong text (for dark/filled custom surfaces).
 * - `'neutral'`: muted neutral surface (also used automatically when `count <= 0` with `showZero`).
 */
export function CountBadge({
  count = 0,
  size = 'sm',
  max = 99,
  showZero = false,
  tone = 'auto',
  ariaLabel,
  title,
  className = '',
  children,
  ...rest
}) {
  const safeCount = normalizeBadgeCount(count);
  if (safeCount <= 0 && !showZero) return null;

  const resolvedSize = size === 'xs' || size === 'md' ? size : 'sm';
  const text =
    safeCount <= 0
      ? '0'
      : max != null && Number.isFinite(max) && safeCount > max
        ? `${max}+`
        : String(safeCount);
  const isSingleChar = text.length === 1;
  const resolvedTone =
    tone === 'neutral' || safeCount <= 0
      ? 'neutral'
      : tone === 'inverse' || tone === 'light'
        ? 'inverse'
        : tone === 'danger'
          ? 'danger'
          : 'auto';

  const toneClasses =
    resolvedTone === 'neutral'
      ? 'rp-count-badge--neutral bg-rp-bg-2 text-rp-text-muted'
      : resolvedTone === 'inverse'
        ? 'rp-count-badge--inverse bg-white text-rp-brand-strong'
        : resolvedTone === 'danger'
          ? 'rp-count-badge--danger bg-[#D63F30] text-white'
          : 'rp-count-badge--auto bg-[#D63F30] text-white';

  return (
    <span
      data-count-badge="true"
      data-size={resolvedSize}
      data-count={safeCount}
      data-tone={resolvedTone}
      aria-label={ariaLabel}
      title={title}
      className={cx(
        'rp-count-badge inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none tabular-nums select-none',
        isSingleChar ? SINGLE_CHAR_SIZE[resolvedSize] : MULTI_CHAR_SIZE[resolvedSize],
        toneClasses,
        className,
      )}
      {...rest}
    >
      {children ?? text}
    </span>
  );
}

export default CountBadge;
