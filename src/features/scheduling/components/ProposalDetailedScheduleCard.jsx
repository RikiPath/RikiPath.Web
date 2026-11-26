import { Fragment, useMemo, useState } from 'react';
import { CalendarCheck, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Button, formatTimeRange } from '@/components/ui';
import { AdminStatusBadge } from '@/features/admin/components/AdminPrimitives.jsx';
import { sortWeeklySessions, weekdayLabelVn } from '@/features/scheduling/utils/proposalValidation.js';
import {
  compareScheduleOccurrences,
  computeScheduleYearRange,
  extractIsoYear,
  formatDayMonth,
} from '@/features/scheduling/utils/proposalScheduleFormatters.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Shared 10-week Detailed Course Schedule component reused across:
 * - Mentor Confirmation & Detail Modal (`TeachingProposalReviewModal`)
 * - Admin Proposal Details Drawer (`AdminTeachingProposalReviewPanel`)
 * - Admin Class Detail Drawer (`AdminCohortConsolePanel`)
 *
 * Renders chronologically ordered sessions in a container-adaptive multi-column grid
 * (auto-wrapping flexibly across 1, 2, or 3+ columns based on available width),
 * grouped cleanly by year, with optional context-driven status badges.
 */
export default function ProposalDetailedScheduleCard({
  weeklySessions = [],
  showWeeklyPatterns = false,
  occurrences = [],
  durationWeeks = 10,
  projected = true,
  showStatusBadges = false,
  initialVisibleCount = 6,
  columns = 'responsive-2',
  minColumnWidth = null,
  resetKey = '',
  className = '',
}) {
  const { tr, trf } = useLocale();
  const [showAll, setShowAll] = useState(false);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);

  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setShowAll(false);
  }

  const sortedPatterns = useMemo(
    () => sortWeeklySessions(weeklySessions || []),
    [weeklySessions],
  );

  const sortedOccurrences = useMemo(
    () => [...(occurrences || [])].sort(compareScheduleOccurrences),
    [occurrences],
  );

  const yearRangeLabel = useMemo(
    () => computeScheduleYearRange(sortedOccurrences),
    [sortedOccurrences],
  );

  const spansMultipleYears = useMemo(() => {
    if (sortedOccurrences.length < 2) return false;
    return extractIsoYear(sortedOccurrences[0]?.localDate)
      !== extractIsoYear(sortedOccurrences[sortedOccurrences.length - 1]?.localDate);
  }, [sortedOccurrences]);

  const visibleOccurrences = showAll
    ? sortedOccurrences
    : sortedOccurrences.slice(0, initialVisibleCount);

  const effectiveMinColWidth = minColumnWidth ?? (showStatusBadges ? 296 : 228);
  const gridTemplateStyle = useMemo(
    () => (columns === '1'
      ? { gridTemplateColumns: 'minmax(0, 1fr)' }
      : { gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${effectiveMinColWidth}px), 1fr))` }),
    [columns, effectiveMinColWidth],
  );

  const scheduleHeading = projected
    ? trf('Lịch chi tiết {0} tuần dự kiến ({1} buổi)', {
        0: durationWeeks,
        1: sortedOccurrences.length,
      })
    : trf('Lịch chi tiết {0} tuần ({1} buổi)', {
        0: durationWeeks,
        1: sortedOccurrences.length,
      });

  if (!showWeeklyPatterns && sortedOccurrences.length === 0) return null;

  return (
    <div
      data-component="ProposalDetailedScheduleCard"
      className={`flex min-w-0 flex-col gap-4 rounded-xl border border-rp-line bg-white p-4 ${className}`}
    >
      {showWeeklyPatterns && sortedPatterns.length > 0 && (
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="m-0 flex items-center gap-1.5 text-[13.5px] font-bold text-rp-text">
            <Clock className="h-4 w-4 shrink-0 text-rp-brand" aria-hidden="true" />
            <span>{tr('Lịch giảng dạy hằng tuần')}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {sortedPatterns.map((s) => (
              <span
                key={s.key}
                className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-[#F2CCD7] bg-[#FFF5F7] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#7D2941]"
              >
                <span>{weekdayLabelVn(s.weekday)}</span>
                <span aria-hidden="true">·</span>
                <span>{formatTimeRange(s.startClock, s.endClock)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {showWeeklyPatterns && sortedPatterns.length > 0 && sortedOccurrences.length > 0 && (
        <div className="border-t border-rp-line/80" />
      )}

      {sortedOccurrences.length > 0 && (
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 text-[13.5px] font-bold text-rp-text">
              <CalendarCheck className="h-4 w-4 shrink-0 text-rp-brand" aria-hidden="true" />
              <span className="min-w-0 break-words">
                {scheduleHeading}
                {yearRangeLabel ? ` · ${yearRangeLabel}` : ''}
              </span>
            </h3>

            {sortedOccurrences.length > initialVisibleCount && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                data-testid="toggle-detailed-schedule-btn"
                iconRight={showAll ? ChevronUp : ChevronDown}
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? tr('Thu gọn') : tr('Xem tất cả')}
              </Button>
            )}
          </div>

          <div
            data-testid="detailed-schedule-scroll-region"
            className={showAll ? 'max-h-[320px] overflow-y-auto overflow-x-hidden pr-1' : 'min-w-0'}
          >
            <div
              data-testid="detailed-schedule-grid"
              className={
                columns === 'responsive-3'
                  ? 'grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2'
              }
            >
              {visibleOccurrences.map((occ, idx) => {
                const occYear = extractIsoYear(occ.localDate);
                const prevYear = idx > 0 ? extractIsoYear(visibleOccurrences[idx - 1]?.localDate) : occYear;
                const showYearDivider = spansMultipleYears && occYear && (idx === 0 || occYear !== prevYear);
                return (
                  <Fragment key={occ.key || `${occ.sessionNumber}-${occ.localDate}-${occ.localStart}`}>
                    {showYearDivider && (
                      <div className="col-span-full flex items-center gap-2 pt-1.5 first:pt-0 text-[11px] font-bold text-rp-text">
                        <span>{trf('Năm {0}', { 0: occYear })}</span>
                        <span className="h-px flex-1 bg-rp-line" />
                      </div>
                    )}
                    <div
                      data-testid={`detailed-schedule-item-${occ.sessionNumber}`}
                      className="box-border flex min-w-0 flex-col justify-between gap-1.5 rounded-lg border border-rp-line bg-rp-bg-2/30 px-2.5 py-2 text-xs leading-snug"
                    >
                      <div className="min-w-0 truncate font-semibold text-rp-text">
                        {trf('Buổi {0}', { 0: occ.sessionNumber })}
                        {' · '}
                        {weekdayLabelVn(occ.weekday)} - {formatDayMonth(occ.localDate)}
                      </div>
                      <div className="flex min-w-0 items-center justify-between gap-2 text-[11px] tabular-nums text-rp-text-2">
                        <span className="whitespace-nowrap">
                          {occ.localStart && occ.localEnd
                            ? `(${occ.localStart} - ${occ.localEnd})`
                            : formatTimeRange(occ.localStart, occ.localEnd)}
                        </span>
                        {showStatusBadges && occ.statusLabel && (
                          <AdminStatusBadge
                            tone={occ.statusTone || 'neutral'}
                            label={tr(occ.statusLabel)}
                            className="shrink-0 px-2 py-0.5 text-[10.5px]"
                          />
                        )}
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
