import { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Calendar as CalendarIcon,
  Clock,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Popover } from '@/components/ui/overlay.jsx';
import { CustomSelect, DateInput, TimeInput } from '@/components/ui/core.jsx';
import { useLocale } from '@/locales/locale.js';
import {
  SCHEDULE_EVENT_TYPE_OPTIONS,
  SCHEDULE_SORT_OPTIONS,
  SCHEDULE_STATUS_OPTIONS,
  clockFromMinutes,
} from '@/features/scheduling/utils/slotPlannerModel.js';
import { formatShortDateVn } from '@/features/scheduling/utils/calendarGeometry.js';

/**
 * Accessible Custom Listbox for Status Filter with semantic color dots, checkmark,
 * keyboard navigation (ArrowUp/ArrowDown/Home/End/Enter/Escape), and count badges.
 * Built on the unified shared CustomSelect component.
 */
export function StatusDotListbox({
  value = 'ALL',
  onChange,
  options = SCHEDULE_STATUS_OPTIONS,
  countsByStatus = null,
}) {
  const { tr } = useLocale();

  const formattedOptions = useMemo(
    () =>
      options.map((opt) => ({
        value: opt.id,
        label: opt.label,
        dotClass: opt.dotClass,
        count: countsByStatus ? countsByStatus[opt.id] : null,
      })),
    [options, countsByStatus],
  );

  return (
    <CustomSelect
      fitContent
      value={value}
      onChange={(nextVal) => onChange?.(nextVal)}
      options={formattedOptions}
      label={tr('Lọc theo trạng thái')}
      size="sm"
      align="end"
      dataTestId="status-filter-listbox-trigger"
      testIdPrefix="status-filter-option"
      className="shrink-0"
      triggerClassName="max-w-[220px]"
    />
  );
}

/**
 * Compact "Bộ lọc nâng cao" (More Filters) Popover combining:
 * - Date Range preset & custom From/To picker
 * - Time-of-Day preset (Sáng / Trưa / Chiều / Tối from policy.dayparts) & custom Start/End clock
 * - Event Type (Loại lịch: Tất cả / Buổi lớp nhóm / Khung giờ đăng ký / Khung đang chọn)
 * - Smart Sort selector (for Table mode)
 */
export function ScheduleMoreFiltersPopover({
  policy,
  dateFilterMode = 'view', // 'view' | 'today' | 'week' | 'month' | 'custom'
  customFromDate = '',
  customToDate = '',
  onDateFilterChange,
  timeFilterCode = 'ALL', // 'ALL' | daypart.code | 'CUSTOM'
  customStartTime = '07:00',
  customEndTime = '22:00',
  onTimeFilterChange,
  eventTypeFilter = 'ALL',
  onEventTypeChange,
  sortBy = 'smart',
  sortDirection = 'asc',
  onSortChange,
  onResetAll,
  activeFilterCount = 0,
}) {
  const { tr } = useLocale();
  const [open, setOpen] = useState(false);

  const dayparts = useMemo(() => {
    const raw = policy?.dayparts || [
      { code: 'Morning', label: 'Buổi sáng', localStart: '07:00', localEnd: '11:00', startMin: 420, endMin: 660 },
      { code: 'Noon', label: 'Buổi trưa', localStart: '11:00', localEnd: '14:00', startMin: 660, endMin: 840 },
      { code: 'Afternoon', label: 'Buổi chiều', localStart: '13:00', localEnd: '18:00', startMin: 780, endMin: 1080 },
      { code: 'Evening', label: 'Buổi tối', localStart: '18:00', localEnd: '22:00', startMin: 1080, endMin: 1320 },
    ];
    return raw;
  }, [policy?.dayparts]);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      label={tr('Bộ lọc & sắp xếp nâng cao')}
      trigger={({ props, toggle }) => (
        <button
          {...props}
          type="button"
          data-testid="more-filters-trigger"
          onClick={toggle}
          className={`inline-flex h-8.5 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold transition-colors ${
            activeFilterCount > 0
              ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
              : 'border-rp-line bg-white text-rp-text-2 hover:border-rp-brand-border hover:bg-rp-brand-tint/45 hover:text-rp-brand-strong'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>{tr('Bộ lọc')}</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rp-brand-pressed px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
    >
      <div className="w-[330px] max-w-[92vw] space-y-3.5 p-3.5 text-[12.5px]">
        <div className="flex items-center justify-between border-b border-rp-line pb-2">
          <span className="font-bold text-rp-text">{tr('Bộ lọc & sắp xếp')}</span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              data-testid="reset-all-filters-btn"
              onClick={() => {
                onResetAll?.();
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11.5px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint"
            >
              <X className="h-3 w-3" />
              <span>{tr('Xóa bộ lọc')}</span>
            </button>
          )}
        </div>

        {/* 1. Loại lịch (EventType — separated from Status!) */}
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">
            {tr('Loại lịch')}
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {SCHEDULE_EVENT_TYPE_OPTIONS.map((opt) => {
              const active = eventTypeFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`event-type-filter-${opt.id}`}
                  aria-pressed={active}
                  onClick={() => onEventTypeChange?.(opt.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[11.5px] font-semibold transition-colors ${
                    active
                      ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
                      : 'border-rp-line bg-white text-rp-text-2 hover:bg-rp-bg-2'
                  }`}
                >
                  {opt.dotClass && <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${opt.dotClass}`} />}
                  <span className="truncate">{tr(opt.label)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Khoảng ngày (Date Range Filter) */}
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">
            <CalendarIcon className="h-3 w-3" />
            <span>{tr('Khoảng ngày')}</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'view', label: 'Theo khung lịch' },
              { id: 'today', label: 'Hôm nay' },
              { id: 'week', label: 'Tuần này' },
              { id: 'month', label: 'Tháng này' },
              { id: 'custom', label: 'Tùy chọn' },
            ].map((preset) => {
              const active = dateFilterMode === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`date-filter-preset-${preset.id}`}
                  aria-pressed={active}
                  onClick={() => onDateFilterChange?.({ mode: preset.id, from: customFromDate, to: customToDate })}
                  className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                    active
                      ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
                      : 'border-rp-line bg-white text-rp-text-2 hover:bg-rp-bg-2'
                  }`}
                >
                  {tr(preset.label)}
                </button>
              );
            })}
          </div>
          {dateFilterMode === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-rp-line bg-rp-bg-2/60 p-2">
              <label className="block text-[11px] font-medium text-rp-text-2">
                {tr('Từ ngày')}
                <DateInput
                  data-testid="custom-date-from"
                  value={customFromDate}
                  max={customToDate || undefined}
                  onChange={(e) => onDateFilterChange?.({ mode: 'custom', from: e.target.value, to: customToDate })}
                  className="mt-0.5 !h-8 rounded-lg px-2 text-[11.5px]"
                />
              </label>
              <label className="block text-[11px] font-medium text-rp-text-2">
                {tr('Đến ngày')}
                <DateInput
                  data-testid="custom-date-to"
                  min={customFromDate || undefined}
                  value={customToDate}
                  onChange={(e) => onDateFilterChange?.({ mode: 'custom', from: customFromDate, to: e.target.value })}
                  className="mt-0.5 !h-8 rounded-lg px-2 text-[11.5px]"
                />
              </label>
            </div>
          )}
        </div>

        {/* 3. Khoảng giờ trong ngày (Time Filter) */}
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">
            <Clock className="h-3 w-3" />
            <span>{tr('Khung giờ trong ngày (GMT+7)')}</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              data-testid="time-filter-ALL"
              aria-pressed={timeFilterCode === 'ALL'}
              onClick={() => onTimeFilterChange?.({ code: 'ALL', start: customStartTime, end: customEndTime })}
              className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                timeFilterCode === 'ALL'
                  ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
                  : 'border-rp-line bg-white text-rp-text-2 hover:bg-rp-bg-2'
              }`}
            >
              {tr('Tất cả giờ')}
            </button>
            {dayparts.map((dp) => {
              const active = timeFilterCode === dp.code;
              const startClock = dp.localStart || clockFromMinutes(dp.startMin);
              const endClock = dp.localEnd || clockFromMinutes(dp.endMin);
              return (
                <button
                  key={dp.code}
                  type="button"
                  data-testid={`time-filter-${dp.code}`}
                  aria-pressed={active}
                  onClick={() => onTimeFilterChange?.({ code: dp.code, start: startClock, end: endClock })}
                  className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                    active
                      ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
                      : 'border-rp-line bg-white text-rp-text-2 hover:bg-rp-bg-2'
                  }`}
                >
                  {tr(dp.label)} ({startClock}–{endClock})
                </button>
              );
            })}
            <button
              type="button"
              data-testid="time-filter-CUSTOM"
              aria-pressed={timeFilterCode === 'CUSTOM'}
              onClick={() => onTimeFilterChange?.({ code: 'CUSTOM', start: customStartTime, end: customEndTime })}
              className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                timeFilterCode === 'CUSTOM'
                  ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
                  : 'border-rp-line bg-white text-rp-text-2 hover:bg-rp-bg-2'
              }`}
            >
              {tr('Giờ tùy chọn')}
            </button>
          </div>
          {timeFilterCode === 'CUSTOM' && (
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-rp-line bg-rp-bg-2/60 p-2">
              <label className="block text-[11px] font-medium text-rp-text-2">
                {tr('Từ giờ')}
                <TimeInput
                  data-testid="custom-time-start"
                  size="sm"
                  value={customStartTime}
                  onChange={(e) => onTimeFilterChange?.({ code: 'CUSTOM', start: e.target.value, end: customEndTime })}
                  className="mt-0.5"
                />
              </label>
              <label className="block text-[11px] font-medium text-rp-text-2">
                {tr('Đến giờ')}
                <TimeInput
                  data-testid="custom-time-end"
                  size="sm"
                  value={customEndTime}
                  onChange={(e) => onTimeFilterChange?.({ code: 'CUSTOM', start: customStartTime, end: e.target.value })}
                  className="mt-0.5"
                />
              </label>
            </div>
          )}
        </div>

        {/* 4. Sắp xếp thông minh (Smart Sorting) */}
        {onSortChange && (
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">
              <ArrowDownUp className="h-3 w-3" />
              <span>{tr('Thứ tự sắp xếp (Danh sách)')}</span>
            </label>
            <div className="flex items-center gap-1.5">
              <CustomSelect
                size="sm"
                label={tr('Tiêu chí sắp xếp')}
                dataTestId="schedule-sort-by-select"
                value={sortBy}
                onChange={(val) => onSortChange({ sortBy: val, sortDirection })}
                options={SCHEDULE_SORT_OPTIONS.map((opt) => ({ value: opt.id, label: opt.label }))}
                className="flex-1"
              />
              {sortBy !== 'smart' && sortBy !== 'newest' && sortBy !== 'oldest' && (
                <button
                  type="button"
                  data-testid="schedule-sort-dir-btn"
                  onClick={() => onSortChange({ sortBy, sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' })}
                  className="inline-flex h-8.5 items-center rounded-xl border border-rp-line bg-white px-2.5 text-[11.5px] font-semibold text-rp-text-2 hover:bg-rp-bg-2"
                >
                  {sortDirection === 'asc' ? tr('Tăng dần ↑') : tr('Giảm dần ↓')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Popover>
  );
}

/**
 * Compact active filter chips bar rendered below the toolbar ONLY when one or more filters are active.
 */
export function ActiveScheduleFilterBar({
  statusFilter = 'ALL',
  onClearStatus,
  eventTypeFilter = 'ALL',
  onClearEventType,
  dateFilterMode = 'view',
  customFromDate = '',
  customToDate = '',
  onClearDate,
  timeFilterCode = 'ALL',
  timeFilterLabel = '',
  onClearTime,
  onResetAll,
  totalFilteredCount = 0,
}) {
  const { tr, trf } = useLocale();
  const hasAny =
    statusFilter !== 'ALL' ||
    eventTypeFilter !== 'ALL' ||
    dateFilterMode !== 'view' ||
    timeFilterCode !== 'ALL';

  if (!hasAny) return null;

  const statusOpt = SCHEDULE_STATUS_OPTIONS.find((o) => o.id === statusFilter);
  const typeOpt = SCHEDULE_EVENT_TYPE_OPTIONS.find((o) => o.id === eventTypeFilter);

  const dateChipText =
    dateFilterMode === 'today'
      ? tr('Hôm nay')
      : dateFilterMode === 'week'
        ? tr('Tuần này')
        : dateFilterMode === 'month'
          ? tr('Tháng này')
          : dateFilterMode === 'custom'
            ? `${customFromDate ? formatShortDateVn(customFromDate) : '…'} – ${customToDate ? formatShortDateVn(customToDate) : '…'}`
            : '';

  return (
    <div
      data-testid="active-schedule-filter-bar"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line bg-[#FCFAFB] px-4 py-1.5 text-[11.5px]"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold text-rp-text-muted">
          {trf('Đang lọc ({0} kết quả):', { 0: totalFilteredCount })}
        </span>
        {statusFilter !== 'ALL' && statusOpt && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rp-brand-border bg-white px-2.5 py-0.5 font-semibold text-rp-text">
            <span className={`h-2 w-2 rounded-full ${statusOpt.dotClass}`} />
            <span>{tr(statusOpt.label)}</span>
            <button type="button" onClick={onClearStatus} aria-label={tr('Bỏ lọc trạng thái')} className="text-rp-text-muted hover:text-rp-brand-strong">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        {eventTypeFilter !== 'ALL' && typeOpt && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rp-brand-border bg-white px-2.5 py-0.5 font-semibold text-rp-text">
            {typeOpt.dotClass && <span className={`h-2 w-2 rounded-full ${typeOpt.dotClass}`} />}
            <span>{tr(typeOpt.label)}</span>
            <button type="button" onClick={onClearEventType} aria-label={tr('Bỏ lọc loại lịch')} className="text-rp-text-muted hover:text-rp-brand-strong">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        {dateFilterMode !== 'view' && dateChipText && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rp-brand-border bg-white px-2.5 py-0.5 font-semibold text-rp-text">
            <span>{dateChipText}</span>
            <button type="button" onClick={onClearDate} aria-label={tr('Bỏ lọc ngày')} className="text-rp-text-muted hover:text-rp-brand-strong">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        {timeFilterCode !== 'ALL' && timeFilterLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rp-brand-border bg-white px-2.5 py-0.5 font-semibold text-rp-text">
            <span>{timeFilterLabel}</span>
            <button type="button" onClick={onClearTime} aria-label={tr('Bỏ lọc giờ')} className="text-rp-text-muted hover:text-rp-brand-strong">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>
      <button
        type="button"
        data-testid="clear-all-active-filters-btn"
        onClick={onResetAll}
        className="rp-link font-semibold text-rp-brand-strong"
      >
        {tr('Xóa bộ lọc')}
      </button>
    </div>
  );
}
