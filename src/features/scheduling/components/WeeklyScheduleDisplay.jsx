import { useMemo, useState } from 'react';
import { CalendarDays, Clock, Layers } from 'lucide-react';
import { cx } from '@/components/ui/cx.js';
import { useLocale } from '@/locales/locale.js';
import {
  groupWeeklyScheduleByTimeRange,
  normalizeWeeklyScheduleEntries,
} from '@/features/scheduling/utils/weeklyScheduleGrouping.js';

/**
 * Shared weekly recurring schedule presenter across Admin, Mentor, and Learner workspaces.
 * Automatically groups days sharing the same time slot (e.g., T2 · T3 · T4 · T5 — 12:30–14:00),
 * supports multiple sessions/day and >4 sessions/week, keeps HH:mm–HH:mm on one line,
 * and allows explicit inline expansion instead of silent truncation.
 *
 * Variants:
 * - 'compact': dense tables and single-line/multi-line summary cells
 * - 'standard': class cards and intermediate sidebars
 * - 'detailed': overview panels, drawers, modals, and dedicated schedule tabs
 */
export default function WeeklyScheduleDisplay({
  schedulePattern = null,
  weeklySessions = null,
  sessions = null,
  sessionDurationMinutes = 90,
  variant = 'standard',
  align = 'auto',
  maxVisibleGroups,
  showSlotCount = false,
  emptyText = 'Chưa có lịch học hằng tuần',
  className = '',
}) {
  const { tr, trf } = useLocale();
  const [expanded, setExpanded] = useState(false);

  const normalized = useMemo(
    () => normalizeWeeklyScheduleEntries({
      schedulePattern,
      weeklySessions,
      sessions,
      sessionDurationMinutes,
      translateFn: tr,
    }),
    [schedulePattern, weeklySessions, sessions, sessionDurationMinutes, tr],
  );

  const groups = useMemo(
    () => groupWeeklyScheduleByTimeRange(normalized, { translateFn: tr }),
    [normalized, tr],
  );

  if (groups.length === 0) {
    return (
      <span className={cx('text-[12.5px] leading-5 text-rp-text-muted', className)}>
        {tr(emptyText)}
      </span>
    );
  }

  const effectiveLimit = maxVisibleGroups != null
    ? maxVisibleGroups
    : variant === 'compact'
      ? 2
      : variant === 'standard'
        ? 3
        : Infinity;

  const hasOverflow = Number.isFinite(effectiveLimit) && groups.length > effectiveLimit;
  const visibleGroups = hasOverflow && !expanded ? groups.slice(0, effectiveLimit) : groups;
  const hiddenCount = hasOverflow ? groups.length - effectiveLimit : 0;

  const renderToggle = () => {
    if (!hasOverflow) return null;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((prev) => !prev);
        }}
        className="rp-focus inline-flex items-center rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-rp-brand-strong transition-colors hover:bg-rp-brand-soft/60 hover:text-rp-brand-deep"
      >
        {expanded
          ? tr('Thu gọn')
          : trf('+ {0} khung giờ', { 0: hiddenCount })}
      </button>
    );
  };

  if (variant === 'summary-rows') {
    return (
      <div className={cx('divide-y divide-rp-line/70 overflow-hidden rounded-xl border border-rp-line bg-white', className)}>
        {groups.map((group) => (
          <div
            key={group.key}
            className="grid grid-cols-1 gap-y-1.5 px-4 py-2.5 text-[13px] sm:grid-cols-3 sm:items-center sm:divide-x sm:divide-rp-line/70"
          >
            <span className="inline-flex items-center gap-1.5 font-semibold text-rp-text sm:pr-3">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" aria-hidden="true" />
              <span>{group.fullDaysText}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium tabular-nums text-rp-text-2 sm:justify-center sm:px-3">
              <Clock className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" aria-hidden="true" />
              <span>{group.timeRange}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tabular-nums text-rp-text sm:justify-end sm:pl-3">
              <Layers className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" aria-hidden="true" />
              <span>{trf('{0} buổi/tuần', { 0: group.slots.length })}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    const isCentered = align === 'center';
    const isLeft = align === 'left';
    const containerCls = isCentered
      ? 'mx-auto flex w-fit max-w-full min-w-0 flex-col items-center gap-1 text-center'
      : isLeft
        ? 'flex min-w-0 flex-col items-start gap-1 text-left'
        : 'inline-flex min-w-0 max-w-full flex-col gap-1 align-top';
    const rowCls = isCentered
      ? 'flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0.5 text-[13px] leading-5'
      : 'flex flex-wrap items-baseline justify-start gap-x-1.5 gap-y-0.5 text-[13px] leading-5';

    return (
      <div className={cx(containerCls, className)}>
        {visibleGroups.map((group) => (
          <div
            key={group.key}
            className={rowCls}
          >
            <span className="font-semibold text-rp-text">{group.fullDaysText}</span>
            <span aria-hidden="true" className="text-rp-text-muted">|</span>
            <span className="whitespace-nowrap font-medium tabular-nums text-rp-text-2">
              {group.timeRange}
            </span>
          </div>
        ))}
        {hasOverflow && <div className={cx('pt-0.5', isCentered && 'flex justify-center')}>{renderToggle()}</div>}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cx('space-y-2', className)}>
        {showSlotCount && normalized.length > 0 && (
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-rp-text-2">
            <CalendarDays className="h-3.5 w-3.5 text-rp-text-muted" aria-hidden="true" />
            <span>{trf('{0} buổi/tuần', { 0: normalized.length })}</span>
          </div>
        )}
        <div className="space-y-1.5">
          {visibleGroups.map((group) => (
            <div
              key={group.key}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-rp-line bg-rp-surface/95 px-3 py-2"
            >
              <span className="text-[13.5px] font-semibold leading-5 text-rp-text">
                {group.fullDaysText}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium tabular-nums text-rp-text-2">
                <Clock className="h-3.5 w-3.5 text-rp-text-muted" aria-hidden="true" />
                {group.timeRange}
              </span>
            </div>
          ))}
        </div>
        {hasOverflow && <div>{renderToggle()}</div>}
      </div>
    );
  }

  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      {visibleGroups.map((group) => (
        <div
          key={group.key}
          className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-0.5 rounded-lg border border-rp-line bg-rp-bg/60 px-2.5 py-1.5"
        >
          <span className="text-[13px] font-semibold leading-5 text-rp-text">
            {group.fullDaysText}
          </span>
          <span className="whitespace-nowrap text-[13px] font-medium tabular-nums text-rp-brand-strong">
            {group.timeRange}
          </span>
        </div>
      ))}
      {hasOverflow && <div>{renderToggle()}</div>}
    </div>
  );
}
