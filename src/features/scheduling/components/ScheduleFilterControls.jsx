import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowDownUp,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  Clock,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Popover } from '@/components/ui/overlay.jsx';
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
 */
export function StatusDotListbox({
  value = 'ALL',
  onChange,
  options = SCHEDULE_STATUS_OPTIONS,
  countsByStatus = null,
}) {
  const { tr } = useLocale();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();
  const itemRefs = useRef([]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === value) || options[0],
    [options, value]
  );

  const handleOpenChange = useCallback((nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) {
      const idx = Math.max(0, options.findIndex((opt) => opt.id === value));
      setActiveIndex(idx);
    }
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    const el = itemRefs.current[activeIndex];
    if (el && typeof el.focus === 'function') {
      el.focus();
    }
  }, [open, activeIndex]);

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const picked = options[activeIndex];
      if (picked) {
        onChange?.(picked.id);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const selectedCount = countsByStatus && selectedOption
    ? countsByStatus[selectedOption.id]
    : null;

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      align="end"
      label={tr('Lọc theo trạng thái')}
      trigger={({ props, toggle }) => (
        <button
          {...props}
          type="button"
          data-testid="status-filter-listbox-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          onClick={toggle}
          className="inline-flex h-8.5 items-center gap-2 rounded-xl border border-rp-line bg-white px-3 text-[12px] font-semibold text-rp-text transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand/40"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${selectedOption?.dotClass || 'bg-[#CE476D]'}`}
          />
          <span className="truncate max-w-[155px]">
            {tr(selectedOption?.label || 'Tất cả trạng thái')}
          </span>
          {selectedCount != null && (
            <span className="rounded-full bg-rp-bg-2 px-1.5 py-px text-[10.5px] font-semibold text-rp-text-muted">
              {selectedCount}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={`h-3.5 w-3.5 shrink-0 text-rp-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    >
      <div
        id={listboxId}
        role="listbox"
        aria-label={tr('Lọc theo trạng thái')}
        onKeyDown={handleKeyDown}
        className="w-56 py-1 text-[12.5px] focus:outline-none"
      >
        {options.map((opt, idx) => {
          const isSelected = opt.id === value;
          const count = countsByStatus ? countsByStatus[opt.id] : null;
          return (
            <button
              key={opt.id}
              ref={(el) => { itemRefs.current[idx] = el; }}
              role="option"
              type="button"
              data-testid={`status-filter-option-${opt.id}`}
              aria-selected={isSelected}
              onClick={() => {
                onChange?.(opt.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors focus:outline-none ${
                isSelected
                  ? 'bg-rp-brand-tint font-semibold text-rp-brand-strong'
                  : 'font-medium text-rp-text hover:bg-rp-bg-2 focus:bg-rp-bg-2'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${opt.dotClass}`} />
                <span className="truncate">{tr(opt.label)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {count != null && (
                  <span className="text-[11px] font-semibold tabular-nums text-rp-text-muted">
                    {count}
                  </span>
                )}
                {isSelected && <Check aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />}
              </span>
            </button>
          );
        })}
      </div>
    </Popover>
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
  const { tr, trf } = useLocale();
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
                <input
                  type="date"
                  data-testid="custom-date-from"
                  value={customFromDate}
                  onChange={(e) => onDateFilterChange?.({ mode: 'custom', from: e.target.value, to: customToDate })}
                  className="mt-0.5 h-8 w-full rounded-lg border border-rp-line bg-white px-2 text-[11.5px]"
                />
              </label>
              <label className="block text-[11px] font-medium text-rp-text-2">
                {tr('Đến ngày')}
                <input
                  type="date"
                  data-testid="custom-date-to"
                  min={customFromDate || undefined}
                  value={customToDate}
                  onChange={(e) => onDateFilterChange?.({ mode: 'custom', from: customFromDate, to: e.target.value })}
                  className="mt-0.5 h-8 w-full rounded-lg border border-rp-line bg-white px-2 text-[11.5px]"
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
                <input
                  type="time"
                  data-testid="custom-time-start"
                  value={customStartTime}
                  onChange={(e) => onTimeFilterChange?.({ code: 'CUSTOM', start: e.target.value, end: customEndTime })}
                  className="mt-0.5 h-8 w-full rounded-lg border border-rp-line bg-white px-2 text-[11.5px] tabular-nums"
                />
              </label>
              <label className="block text-[11px] font-medium text-rp-text-2">
                {tr('Đến giờ')}
                <input
                  type="time"
                  data-testid="custom-time-end"
                  value={customEndTime}
                  onChange={(e) => onTimeFilterChange?.({ code: 'CUSTOM', start: customStartTime, end: e.target.value })}
                  className="mt-0.5 h-8 w-full rounded-lg border border-rp-line bg-white px-2 text-[11.5px] tabular-nums"
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
              <select
                aria-label={tr('Tiêu chí sắp xếp')}
                data-testid="schedule-sort-by-select"
                value={sortBy}
                onChange={(e) => onSortChange({ sortBy: e.target.value, sortDirection })}
                className="h-8.5 flex-1 rounded-xl border border-rp-line bg-white px-2.5 text-[12px] font-medium text-rp-text focus:border-rp-brand-border focus:outline-none"
              >
                {SCHEDULE_SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{tr(opt.label)}</option>
                ))}
              </select>
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
        className="font-semibold text-rp-brand-strong hover:underline"
      >
        {tr('Xóa bộ lọc')}
      </button>
    </div>
  );
}
