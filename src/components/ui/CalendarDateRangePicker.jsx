import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover } from './overlay.jsx';
import { cx } from './cx.js';
import { formatIsoDateDisplay } from './dateFormat.js';
import { currentIntlTag, useLocale } from '@/locales/locale.js';

const WEEKDAYS = {
  vi: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
  ja: ['月', '火', '水', '木', '金', '土', '日'],
};

function todayKey() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function shiftMonth(monthKey, amount) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1)).toISOString().slice(0, 7);
}

function shiftDateKeyUtc(key, deltaDays) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return '';
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + deltaDays)).toISOString().slice(0, 10);
}

function monthDays(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((firstWeekday + lastDay) / 7) * 7 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, index - firstWeekday + 1));
    const key = date.toISOString().slice(0, 10);
    return { key, day: date.getUTCDate(), inMonth: key.slice(0, 7) === monthKey };
  });
}

const SIZE_CLASSES = {
  sm: 'h-8 px-3 text-xs rounded-[10px]',
  md: 'h-10 px-3.5 text-xs sm:text-sm rounded-rp-input',
  lg: 'h-12 px-4 text-sm rounded-xl',
};

function CalendarDateField({
  id,
  name,
  label = 'Chọn ngày',
  value = '',
  onChange,
  onBlur,
  min,
  max,
  disabledDate,
  disabled = false,
  invalid = false,
  placeholder,
  size = 'md',
  compact = false,
  fullWidth = false,
  clearable = true,
  showToday = true,
  className,
  triggerClassName,
  'aria-describedby': ariaDescribedBy,
}) {
  const { locale, tr } = useLocale();
  const [cursorMonth, setCursorMonth] = useState(() => (value || min || todayKey()).slice(0, 7));
  const [focusedDayKey, setFocusedDayKey] = useState(() => value || min || todayKey());
  const wasOpenRef = useRef(false);
  const dayButtonRefs = useRef(new Map());
  const gridId = useId();
  const today = todayKey();
  const days = useMemo(() => monthDays(cursorMonth), [cursorMonth]);
  const [year, month] = cursorMonth.split('-').map(Number);
  const monthLabel = new Intl.DateTimeFormat(currentIntlTag(), {
    timeZone: 'UTC', month: 'long', year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 15)));

  const isDateUnavailable = useCallback((dayKey) => {
    if (!dayKey) return true;
    if (min && dayKey < min) return true;
    if (max && dayKey > max) return true;
    if (typeof disabledDate === 'function' && disabledDate(dayKey)) return true;
    return false;
  }, [min, max, disabledDate]);

  const handleOpenChange = useCallback((open) => {
    if (open) {
      wasOpenRef.current = true;
      const seed = value || (min && min > today ? min : today);
      setCursorMonth(seed.slice(0, 7));
      setFocusedDayKey(seed);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      onBlur?.();
    }
  }, [value, min, today, onBlur]);

  useEffect(() => {
    if (!wasOpenRef.current || !focusedDayKey) return;
    const targetMonth = focusedDayKey.slice(0, 7);
    if (targetMonth !== cursorMonth) return;
    const btn = dayButtonRefs.current.get(focusedDayKey);
    btn?.focus?.();
  }, [focusedDayKey, cursorMonth]);

  const moveFocusByDays = (delta) => {
    const nextKey = shiftDateKeyUtc(focusedDayKey || value || today, delta);
    if (!nextKey) return;
    setFocusedDayKey(nextKey);
    const nextMonth = nextKey.slice(0, 7);
    if (nextMonth !== cursorMonth) {
      setCursorMonth(nextMonth);
    }
  };

  const placeholderText = placeholder || (locale === 'ja' ? 'yyyy/mm/dd' : 'dd/MM/yyyy');

  return (
    <Popover
      align="start"
      label={tr(label)}
      className={cx(fullWidth ? 'w-full' : undefined, className)}
      panelClassName="w-[292px] max-w-[calc(100vw-24px)] overflow-hidden"
      onOpenChange={handleOpenChange}
      trigger={({ props, toggle }) => (
        <button
          id={id}
          name={name}
          type="button"
          {...props}
          disabled={disabled}
          onClick={toggle}
          aria-label={tr(label)}
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
          className={cx(
            'rp-focus inline-flex items-center justify-between gap-2 border bg-rp-surface text-left tabular-nums transition-colors hover:border-rp-brand-border',
            SIZE_CLASSES[size] || SIZE_CLASSES.md,
            invalid ? 'border-rp-danger' : 'border-rp-line',
            disabled && 'cursor-not-allowed opacity-50',
            fullWidth ? 'w-full' : compact ? 'w-[148px]' : 'min-w-[148px]',
            triggerClassName,
          )}
        >
          <span className={cx('truncate', value ? 'font-medium text-rp-text' : 'text-rp-text-muted')}>
            {value ? formatIsoDateDisplay(value) : placeholderText}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-rp-text-muted" aria-hidden="true" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="select-none p-3">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold capitalize text-rp-text">{monthLabel}</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setCursorMonth((current) => shiftMonth(current, -1))}
                aria-label={tr('Tháng trước')}
                className="rp-focus flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCursorMonth((current) => shiftMonth(current, 1))}
                aria-label={tr('Tháng sau')}
                className="rp-focus flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[10.5px] font-semibold text-rp-text-muted">
            {(WEEKDAYS[locale] || WEEKDAYS.vi).map((day) => <span key={day} className="py-1">{day}</span>)}
          </div>

          <div id={gridId} role="grid" aria-label={monthLabel} className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const selected = day.key === value;
              const isToday = day.key === today;
              const unavailable = isDateUnavailable(day.key);
              const isFocused = day.key === focusedDayKey;
              return (
                <button
                  key={day.key}
                  ref={(el) => {
                    if (el) dayButtonRefs.current.set(day.key, el);
                    else dayButtonRefs.current.delete(day.key);
                  }}
                  type="button"
                  disabled={unavailable}
                  tabIndex={isFocused || selected ? 0 : -1}
                  aria-label={formatIsoDateDisplay(day.key)}
                  aria-pressed={selected}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') { e.preventDefault(); moveFocusByDays(-1); }
                    else if (e.key === 'ArrowRight') { e.preventDefault(); moveFocusByDays(1); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocusByDays(-7); }
                    else if (e.key === 'ArrowDown') { e.preventDefault(); moveFocusByDays(7); }
                  }}
                  onClick={() => {
                    onChange?.(day.key);
                    close();
                  }}
                  className={cx(
                    'rp-focus flex h-8 items-center justify-center rounded-lg text-[11.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                    !day.inMonth && 'text-rp-text-muted/60',
                    selected
                      ? 'bg-rp-brand-pressed font-bold text-white shadow-rp-xs'
                      : isToday
                        ? 'bg-rp-brand-tint font-bold text-rp-brand-strong ring-1 ring-inset ring-rp-brand-border'
                        : 'text-rp-text hover:bg-rp-brand-tint/70',
                  )}
                >
                  {day.day}
                </button>
              );
            })}
          </div>

          {(clearable || showToday) && (
            <div className="mt-2.5 flex justify-between border-t border-rp-line pt-2">
              {clearable ? (
                <button
                  type="button"
                  onClick={() => { onChange?.(''); close(); }}
                  className="rp-focus rounded-lg px-2 py-1 text-xs font-semibold text-rp-text-muted hover:bg-rp-bg-2 hover:text-rp-text"
                >
                  {tr('Xóa ngày')}
                </button>
              ) : <span />}
              {showToday && (
                <button
                  type="button"
                  disabled={isDateUnavailable(today)}
                  onClick={() => { onChange?.(today); close(); }}
                  className="rp-focus rounded-lg px-2 py-1 text-xs font-semibold text-rp-brand-strong hover:bg-rp-brand-tint disabled:opacity-40"
                >
                  {tr('Hôm nay')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}

/** Shared Sakura single-date picker (`dd/MM/yyyy` display in VI, ISO `YYYY-MM-DD` value in GMT+7). */
export function DatePicker({
  id,
  name,
  label = 'Chọn ngày',
  value = '',
  onChange,
  onBlur,
  min,
  max,
  disabledDate,
  disabled = false,
  invalid = false,
  placeholder,
  size = 'md',
  compact = false,
  fullWidth = false,
  clearable = true,
  showToday = true,
  className,
  triggerClassName,
  'aria-describedby': ariaDescribedBy,
}) {
  return (
    <CalendarDateField
      id={id}
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      min={min}
      max={max}
      disabledDate={disabledDate}
      disabled={disabled}
      invalid={invalid}
      placeholder={placeholder}
      size={size}
      compact={compact}
      fullWidth={fullWidth}
      clearable={clearable}
      showToday={showToday}
      className={className}
      triggerClassName={triggerClassName}
      aria-describedby={ariaDescribedBy}
    />
  );
}

/** Shared Sakura date range filter; values remain ISO date keys for API queries. */
export function DateRangePicker({
  from = '', to = '', onFromChange, onToChange,
  fromLabel = 'Từ ngày', toLabel = 'Đến ngày',
  min, max, disabled = false, compact = false, separator = '–', className,
}) {
  const { tr } = useLocale();
  const invalidRange = Boolean(from && to && from > to);
  return (
    <div className={cx(compact ? 'space-y-1' : 'space-y-1.5', className)}>
      <div className={cx('flex flex-wrap items-center', compact ? 'gap-1.5 sm:flex-nowrap' : 'gap-2')}>
        <div className={cx(!compact && 'flex items-center gap-1.5')}>
          {!compact && <span className="text-xs font-medium text-rp-text-muted">{tr(fromLabel)}</span>}
          <CalendarDateField label={fromLabel} value={from} onChange={onFromChange} min={min} max={to || max} disabled={disabled} invalid={invalidRange} compact={compact} />
        </div>
        <span aria-hidden="true" className="shrink-0 select-none text-xs font-medium text-rp-text-muted">{separator}</span>
        <div className={cx(!compact && 'flex items-center gap-1.5')}>
          {!compact && <span className="text-xs font-medium text-rp-text-muted">{tr(toLabel)}</span>}
          <CalendarDateField label={toLabel} value={to} onChange={onToChange} min={from || min} max={max} disabled={disabled} invalid={invalidRange} compact={compact} />
        </div>
      </div>
      {invalidRange && <p role="alert" className="text-xs font-medium text-rp-danger">{tr('Ngày bắt đầu không thể lớn hơn ngày kết thúc.')}</p>}
    </div>
  );
}
