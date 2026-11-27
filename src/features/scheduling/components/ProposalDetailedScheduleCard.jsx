import { Fragment, useMemo, useState } from 'react';
import { CalendarCheck, CalendarDays, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Button, formatDate, formatTimeRange } from '@/components/ui';
import { AdminStatusBadge } from '@/features/admin/components/AdminPrimitives.jsx';
import { sortWeeklySessions, weekdayLabelVn } from '@/features/scheduling/utils/proposalValidation.js';
import WeeklyScheduleDisplay from '@/features/scheduling/components/WeeklyScheduleDisplay.jsx';
import {
  compareScheduleOccurrences,
  computeScheduleYearRange,
  extractIsoYear,
  formatDayMonth,
  groupOccurrencesByTeachingWeek,
} from '@/features/scheduling/utils/proposalScheduleFormatters.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Shared Detailed Course Schedule component reused across:
 * - Mentor Confirmation & Detail Modal (`TeachingProposalReviewModal`)
 * - Mentor Open Enrollment Modal (`ConfirmOpenEnrollmentModal`, `variant="weekly-compact"`)
 * - Admin Proposal Details Drawer (`AdminTeachingProposalReviewPanel`)
 * - Admin Class Detail Drawer (`AdminCohortConsolePanel`)
 */
export default function ProposalDetailedScheduleCard({
  weeklySessions = [],
  showWeeklyPatterns = false,
  occurrences = [],
  durationWeeks = 1,
  projected = true,
  showStatusBadges = false,
  variant = 'cards',
  initialVisibleCount = 6,
  columns = 'responsive-2',
  minColumnWidth = null,
  resetKey = '',
  className = '',
}) {
  void durationWeeks;
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

  const weeklyGroups = useMemo(
    () => (variant === 'weekly-compact' ? groupOccurrencesByTeachingWeek(sortedOccurrences) : []),
    [variant, sortedOccurrences],
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
  void gridTemplateStyle;

  const scheduleHeading = projected
    ? trf('Lịch giảng dạy chi tiết dự kiến ({0} buổi)', {
        0: sortedOccurrences.length,
      })
    : trf('Lịch giảng dạy chi tiết ({0} buổi)', {
        0: sortedOccurrences.length,
      });

  if (variant === 'weekly-compact') {
    if (weeklyGroups.length === 0) return null;
    return (
      <div
        data-component="ProposalDetailedScheduleCard"
        data-variant="weekly-compact"
        data-testid="detailed-schedule-weekly-groups"
        className={`flex min-w-0 flex-col gap-3 ${className}`}
      >
        {weeklyGroups.map((week) => (
          <div
            key={week.weekKey}
            className="shrink-0 overflow-hidden rounded-xl border border-rp-line/90 bg-white"
          >
            <div className="flex items-center gap-2 border-b border-rp-brand-border/45 bg-rp-brand-tint/60 px-3.5 py-2 text-[13px] font-bold text-rp-brand-strong">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{trf('Tuần {0}', { 0: week.weekNumber })}</span>
              <span aria-hidden="true" className="text-rp-brand-strong/60">·</span>
              <span className="tabular-nums">{week.rangeLabel}</span>
            </div>
            <div className="divide-y divide-rp-line/60">
              {week.sessions.map((occ) => (
                <div
                  key={occ.key || `${occ.sessionNumber}-${occ.localDate}-${occ.localStart}`}
                  data-testid={`detailed-schedule-item-${occ.sessionNumber}`}
                  className="grid min-h-[42px] grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3.5 py-2 text-[13px]"
                >
                  <span className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-md bg-rp-bg-2 px-2 py-0.5 text-[12px] font-semibold text-rp-text tabular-nums">
                    {trf('Buổi {0}', { 0: occ.sessionNumber })}
                  </span>
                  <span className="min-w-0 truncate font-medium text-rp-text">
                    {weekdayLabelVn(occ.weekday)}, {formatDate(occ.localDate) || formatDayMonth(occ.localDate)}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium text-rp-text-2 tabular-nums">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" aria-hidden="true" />
                    <span>{formatTimeRange(occ.localStart, occ.localEnd)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!showWeeklyPatterns && sortedOccurrences.length === 0) return null;

  return (
    <div
      data-component="ProposalDetailedScheduleCard"
      className={`flex min-w-0 flex-col gap-4 rounded-xl border border-rp-line bg-white p-4 ${className}`}
    >
      {showWeeklyPatterns && sortedPatterns.length > 0 && (
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="m-0 flex items-center gap-1.5 text-[14px] font-semibold leading-5 text-rp-text">
            <Clock className="h-4 w-4 shrink-0 text-rp-brand" aria-hidden="true" />
            <span>{tr('Lịch giảng dạy hằng tuần')}</span>
          </h3>
          <WeeklyScheduleDisplay
            weeklySessions={weeklySessions}
            variant="detailed"
          />
        </div>
      )}

      {showWeeklyPatterns && sortedPatterns.length > 0 && sortedOccurrences.length > 0 && (
        <div className="border-t border-rp-line/80" />
      )}

      {sortedOccurrences.length > 0 && (
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 text-[14px] font-semibold leading-5 text-rp-text">
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
                  ? 'grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2'
              }
            >
              {visibleOccurrences.map((occ, idx) => {
                const occYear = extractIsoYear(occ.localDate);
                const prevYear = idx > 0 ? extractIsoYear(visibleOccurrences[idx - 1]?.localDate) : occYear;
                const showYearDivider = spansMultipleYears && occYear && (idx === 0 || occYear !== prevYear);
                return (
                  <Fragment key={occ.key || `${occ.sessionNumber}-${occ.localDate}-${occ.localStart}`}>
                    {showYearDivider && (
                      <div className="col-span-full flex items-center gap-2 pt-1.5 first:pt-0 text-[12px] font-semibold text-rp-text">
                        <span>{trf('Năm {0}', { 0: occYear })}</span>
                        <span className="h-px flex-1 bg-rp-line" />
                      </div>
                    )}
                    <div
                      data-testid={`detailed-schedule-item-${occ.sessionNumber}`}
                      className="box-border flex min-w-0 flex-col justify-between gap-1.5 rounded-lg border border-rp-line bg-rp-bg-2/30 px-2.5 py-2 text-[13px] leading-snug"
                    >
                      <div className="min-w-0 truncate font-semibold text-rp-text">
                        {trf('Buổi {0}', { 0: occ.sessionNumber })}
                        {' · '}
                        {weekdayLabelVn(occ.weekday)} - {formatDayMonth(occ.localDate)}
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-1.5 gap-y-1 text-[11.5px] tabular-nums text-rp-text-2">
                        <span className="whitespace-nowrap">
                          {occ.localStart && occ.localEnd
                            ? `(${occ.localStart} - ${occ.localEnd})`
                            : formatTimeRange(occ.localStart, occ.localEnd)}
                        </span>
                        {showStatusBadges && occ.statusLabel && (
                          <AdminStatusBadge
                            tone={occ.statusTone || 'neutral'}
                            label={tr(occ.statusLabel)}
                            className="shrink-0 !gap-1 !px-1.5 !py-0.5 !text-[10.5px] !leading-3.5"
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
