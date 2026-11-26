import { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Calendar as CalendarIcon,
  Clock,
  GraduationCap,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Popover } from '@/components/ui/overlay.jsx';
import { CustomSelect, TimeInput } from '@/components/ui/core.jsx';
import { DatePicker } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import {
  LIST_REGISTRATION_STATUS_OPTIONS,
  REGISTRATION_EVENT_TYPE_OPTIONS,
  REGISTRATION_JLPT_FILTER_OPTIONS,
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
  proposalMode = false,
  displayMode = 'calendar',
  statusFilter = 'ALL',
  statusOptions = null,
  countsByStatus = null,
  onStatusChange = null,
  eventTypeOptions = null,
  jlptLevelFilter = 'ALL',
  onJlptLevelChange = null,
  searchQuery = '',
  onSearchChange = null,
  dateFilterMode = 'view', // 'view' | 'upcoming' | 'past' | 'today' | 'week' | 'month' | 'custom'
  customFromDate = '',
  customToDate = '',
  onDateFilterChange,
  timeFilterCode = 'ALL', // 'ALL' | daypart.code | 'CUSTOM'
  customStartTime = '07:00',
  customEndTime = '22:00',
  showTimeFilter = true,
  onTimeFilterChange,
  eventTypeFilter = 'ALL',
  onEventTypeChange,
  sortBy = 'smart',
  sortDirection = 'asc',
  sortOptions = SCHEDULE_SORT_OPTIONS,
  onSortChange,
  onResetAll,
  activeFilterCount = 0,
}) {
  const { tr } = useLocale();
  const [open, setOpen] = useState(false);

  const resolvedTypeOptions = useMemo(
    () => eventTypeOptions || SCHEDULE_EVENT_TYPE_OPTIONS,
    [eventTypeOptions],
  );
  const resolvedStatusOptions = useMemo(
    () => statusOptions || (displayMode === 'list' ? LIST_REGISTRATION_STATUS_OPTIONS : SCHEDULE_STATUS_OPTIONS),
    [displayMode, statusOptions],
  );
  const useSyncedStatusSection = Boolean(onStatusChange && (proposalMode || statusOptions));
  const hasAnyResettable = activeFilterCount > 0 || (useSyncedStatusSection && statusFilter !== 'ALL');

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
          {hasAnyResettable && (
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

        {/* 0. Tìm kiếm tên lớp (List / Proposal mode) */}
        {onSearchChange && (
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">
              <Search className="h-3 w-3" />
              <span>{tr('Tìm kiếm lớp học')}</span>
            </label>
            <div className="relative">
              <input
                type="search"
                data-testid="schedule-search-input"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={tr('Nhập tên lớp, cấp độ JLPT (VD: N4)…')}
                className="rp-focus h-8.5 w-full rounded-xl border border-rp-line bg-white pr-7 pl-3 text-[12px] text-rp-text placeholder:text-rp-text-muted"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label={tr('Xóa từ khóa tìm kiếm')}
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-rp-text-muted hover:text-rp-brand-strong"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 1. Loại lịch (legacy mode only; when synced with toolbar StatusDotListbox, status lives outside) */}
        {!useSyncedStatusSection && (
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">
              {tr('Loại lịch')}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {resolvedTypeOptions.map((opt) => {
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
        )}

        {/* 1b. Cấp độ JLPT */}
        {onJlptLevelChange && (
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>{tr('Cấp độ JLPT')}</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REGISTRATION_JLPT_FILTER_OPTIONS.map((opt) => {
                const active = jlptLevelFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`jlpt-level-filter-${opt.id}`}
                    aria-pressed={active}
                    onClick={() => onJlptLevelChange(opt.id)}
                    className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                      active
                        ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
                        : 'border-rp-line bg-white text-rp-text-2 hover:bg-rp-bg-2'
                    }`}
                  >
                    {tr(opt.label)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Khoảng ngày (Date Range Filter) */}
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">
            <CalendarIcon className="h-3 w-3" />
            <span>{tr('Khoảng ngày')}</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(displayMode === 'list'
              ? [
                { id: 'view', label: 'Toàn bộ thời gian' },
                { id: 'upcoming', label: 'Sắp diễn ra' },
                { id: 'past', label: 'Lịch sử' },
                { id: 'today', label: 'Hôm nay' },
                { id: 'week', label: 'Tuần này' },
                { id: 'month', label: 'Tháng này' },
                { id: 'custom', label: 'Tùy chọn' },
              ]
              : [
                { id: 'view', label: 'Theo khung lịch' },
                { id: 'today', label: 'Hôm nay' },
                { id: 'week', label: 'Tuần này' },
                { id: 'month', label: 'Tháng này' },
                { id: 'custom', label: 'Tùy chọn' },
              ]).map((preset) => {
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
              <div className="space-y-1 text-[11px] font-medium text-rp-text-2">
                <span className="block">{tr('Từ ngày')}</span>
                <DatePicker
                  size="sm"
                  fullWidth
                  label={tr('Từ ngày')}
                  value={customFromDate}
                  max={customToDate || undefined}
                  onChange={(iso) => onDateFilterChange?.({ mode: 'custom', from: iso || '', to: customToDate })}
                  triggerClassName="bg-white"
                />
              </div>
              <div className="space-y-1 text-[11px] font-medium text-rp-text-2">
                <span className="block">{tr('Đến ngày')}</span>
                <DatePicker
                  size="sm"
                  fullWidth
                  label={tr('Đến ngày')}
                  min={customFromDate || undefined}
                  value={customToDate}
                  onChange={(iso) => onDateFilterChange?.({ mode: 'custom', from: customFromDate, to: iso || '' })}
                  triggerClassName="bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Khoảng giờ trong ngày (Time Filter) */}
        {showTimeFilter && (
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">
              <Clock className="h-3 w-3" />
              <span>{tr('Khung giờ trong ngày')}</span>
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
        )}

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
                options={sortOptions.map((opt) => ({ value: opt.id, label: opt.label }))}
                className="flex-1"
              />
              {sortBy !== 'smart' && sortBy !== 'default' && sortBy !== 'newest' && sortBy !== 'oldest' && (
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
  statusOptions = SCHEDULE_STATUS_OPTIONS,
  onClearStatus,
  eventTypeFilter = 'ALL',
  eventTypeOptions = SCHEDULE_EVENT_TYPE_OPTIONS,
  onClearEventType,
  jlptLevelFilter = 'ALL',
  onClearJlptLevel,
  searchQuery = '',
  onClearSearch,
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
  const trimmedSearch = String(searchQuery || '').trim();
  const hasAny =
    statusFilter !== 'ALL' ||
    eventTypeFilter !== 'ALL' ||
    jlptLevelFilter !== 'ALL' ||
    Boolean(trimmedSearch) ||
    dateFilterMode !== 'view' ||
    timeFilterCode !== 'ALL';

  if (!hasAny) return null;

  const statusOpt = statusOptions.find((o) => o.id === statusFilter)
    || LIST_REGISTRATION_STATUS_OPTIONS.find((o) => o.id === statusFilter)
    || SCHEDULE_STATUS_OPTIONS.find((o) => o.id === statusFilter);
  const typeOpt = eventTypeOptions.find((o) => o.id === eventTypeFilter)
    || REGISTRATION_EVENT_TYPE_OPTIONS.find((o) => o.id === eventTypeFilter)
    || SCHEDULE_EVENT_TYPE_OPTIONS.find((o) => o.id === eventTypeFilter);

  const dateChipText =
    dateFilterMode === 'upcoming'
      ? tr('Sắp diễn ra')
      : dateFilterMode === 'past'
        ? tr('Lịch sử')
        : dateFilterMode === 'today'
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
        {trimmedSearch && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rp-brand-border bg-white px-2.5 py-0.5 font-semibold text-rp-text">
            <Search className="h-3 w-3 text-rp-brand-strong" />
            <span className="max-w-[160px] truncate">{trimmedSearch}</span>
            <button type="button" onClick={onClearSearch} aria-label={tr('Xóa từ khóa tìm kiếm')} className="text-rp-text-muted hover:text-rp-brand-strong">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
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
        {jlptLevelFilter !== 'ALL' && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rp-brand-border bg-white px-2.5 py-0.5 font-semibold text-rp-text">
            <span>JLPT {jlptLevelFilter}</span>
            <button type="button" onClick={onClearJlptLevel} aria-label={tr('Bỏ lọc cấp độ JLPT')} className="text-rp-text-muted hover:text-rp-brand-strong">
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
