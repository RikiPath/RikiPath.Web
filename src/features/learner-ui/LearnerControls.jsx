import { Tabs } from '@/components/ui';
import { cx } from '@/components/ui/cx.js';
import { useLocale } from '@/locales/locale.js';
import {
  SUPPORTED_JLPT_LEVELS,
  filterSupportedJlptLevels,
  normalizeJlptCode,
} from './learnerTokens.js';

/**
 * Unified 44px JLPT Level selector (strictly N5, N4, N3, N2 — never N1, never "JLPT N5" tab labels).
 */
export function LevelTabs({
  value,
  onChange,
  levels = SUPPORTED_JLPT_LEVELS,
  includeAll = false,
  allValue = 'ALL',
  allLabel = 'Tất cả',
  label = 'Chọn cấp độ JLPT',
  className,
}) {
  const { tr } = useLocale();
  const normalizedLevels = filterSupportedJlptLevels(levels).map((item) => {
    if (typeof item === 'string') {
      const code = normalizeJlptCode(item);
      return { value: code, label: code };
    }
    const code = normalizeJlptCode(item?.code ?? item?.label ?? item?.name ?? item?.value);
    const val = item?.value ?? item?.id ?? code;
    return {
      value: val,
      label: code,
      count: item?.count,
      disabled: item?.disabled,
    };
  });

  const tabs = includeAll
    ? [{ value: allValue, label: tr(allLabel) }, ...normalizedLevels]
    : normalizedLevels;

  return (
    <Tabs
      variant="pill"
      size="md"
      label={tr(label)}
      value={value}
      onChange={onChange}
      tabs={tabs}
      className={className}
    />
  );
}

/**
 * 36px status / quota counter pill (e.g. "Lượt AI nói: 21", "Lượt AI viết: 21"),
 * vertically centered when placed inside a 44px ControlGroup row.
 */
export function CounterPill({ icon: Icon, children, tone = 'brand', className, ...rest }) {
  const toneClass =
    tone === 'neutral'
      ? 'border-rp-line bg-rp-surface text-rp-text-2'
      : 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong';
  return (
    <span
      className={cx(
        'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 text-[13px] font-semibold',
        toneClass,
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
      {children}
    </span>
  );
}

/**
 * Unified toolbar row container that vertically centers 44px controls and 36px CounterPills.
 */
export function ControlGroup({ children, className, ...rest }) {
  return (
    <div
      className={cx('flex flex-wrap items-center gap-2.5', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
