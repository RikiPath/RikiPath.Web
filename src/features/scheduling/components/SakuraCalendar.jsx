import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  X,
} from 'lucide-react';
import { Modal, Popover } from '@/components/ui/overlay.jsx';
import { ContextualEmptyState } from '@/components/ui/SmartDataBoundary.jsx';
import { useLocale } from '@/locales/locale.js';
import {
  buildMonthMatrix,
  buildWeekDays,
  formatFullDayVn,
  formatShortDateVn,
  getToneMeta,
  getViewDateRange,
  groupAgendaEvents,
  minutesOfEvent,
  packDayEvents,
  stepAnchorKey,
  toVnDateKey,
  toVnTimeParts,
} from '@/features/scheduling/utils/calendarGeometry.js';

const VIEWS = [
  { id: 'day', label: 'Ngày' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
  { id: 'agenda', label: 'Danh sách' },
];

const WEEKDAY_HEADERS = { vi: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'], ja: ['月', '火', '水', '木', '金', '土', '日'] };

/*
 * Locale layer over calendarGeometry (which formats Vietnamese labels). Vietnamese output is unchanged;
 * other locales recompute titles/day names with Intl. Dates are always interpreted in GMT+7, so changing the
 * language never moves an event.
 */
const keyToDate = (key) => new Date(`${key}T12:00:00+07:00`);
function useCalendarLabels() {
  const { locale, tr, trf, fmt } = useLocale();
  return useMemo(() => {
    const vi = locale === 'vi';
    const fullDay = (key, todayKey) => {
      if (vi) return formatFullDayVn(key, todayKey);
      const label = fmt.weekdayDate(keyToDate(key));
      if (todayKey && key === todayKey) return `${tr('Hôm nay')} · ${label}`;
      if (todayKey && key === stepAnchorKey(todayKey, 'day', 1)) return `${tr('Ngày mai')} · ${label}`;
      return label;
    };
    const monthTitle = (key, fallback) => (vi ? fallback : fmt.monthYear(keyToDate(key)));
    return {
      locale,
      tr,
      trf,
      headers: WEEKDAY_HEADERS[locale] || WEEKDAY_HEADERS.vi,
      fullDay,
      shortDate: (key) => (vi ? formatShortDateVn(key) : fmt.date(keyToDate(key)).slice(5)),
      dayShort: (day) => (vi ? day.shortName : fmt.weekday(keyToDate(day.key), 'short')),
      dayFull: (day) => (vi ? day.fullName : fmt.weekday(keyToDate(day.key), 'long')),
      monthTitle,
      rangeTitle: (range, anchorKey, view) => {
        if (vi) return range.title;
        if (view === 'day') return fullDay(anchorKey);
        if (view === 'month') return monthTitle(anchorKey, range.title);
        if (view === 'agenda') return `${fmt.date(keyToDate(range.startKey))} – ${fmt.date(keyToDate(range.endKey))}`;
        const a = fmt.monthYear(keyToDate(range.startKey));
        const b = fmt.monthYear(keyToDate(range.endKey));
        return a === b ? a : `${a} – ${b}`;
      },
      rangeSubtitle: (range, view) => {
        if (vi) return range.subtitle;
        if (view === 'week') return `${fmt.date(keyToDate(range.startKey))} – ${fmt.date(keyToDate(range.endKey))}`;
        return tr(range.subtitle);
      },
      duration: (minutes) => fmt.duration(minutes),
    };
  }, [locale, tr, trf, fmt]);
}

function clockFromMinutes(total) {
  const normalized = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function durationMinutes(event) {
  const { start, end } = minutesOfEvent(event);
  return Math.max(end - start, 1);
}

function timeRangeText(event) {
  if (event.detailTime) return event.detailTime;
  const { start, end } = minutesOfEvent(event);
  return `${clockFromMinutes(start)}–${clockFromMinutes(end)}`;
}

const TimeGridEvent = memo(function TimeGridEvent({ event, firstHour, hourHeight, onSelect }) {
  const { tr } = useLocale();
  const meta = getToneMeta(event.tone);
  const { start, end } = minutesOfEvent(event);
  const top = ((start - firstHour * 60) / 60) * hourHeight + 1;
  const rawHeight = ((end - start) / 60) * hourHeight - 3;
  const height = Math.max(rawHeight, 24);
  const cols = event.totalCols || 1;
  const col = event.col || 0;
  const width = `calc(${100 / cols}% - 4px)`;
  const left = `calc(${(col / cols) * 100}% + 2px)`;
  const z = (event.z || 1) + 5 + col;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (event.onClick) {
          event.onClick(event);
        } else {
          onSelect?.(event);
        }
      }}
      className={`group absolute overflow-hidden rounded-lg px-2 py-1 text-left transition-all duration-150 hover:z-30 hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/40 ${event.className || meta.card}`}
      style={{ top, height, width, left, zIndex: z }}
      aria-label={`${event.title} (${timeRangeText(event)})`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
        <span className={`truncate text-[11.5px] font-semibold leading-tight ${event.tone === 'cancelled' ? 'line-through' : ''}`}>
          {tr(event.title)}
        </span>
      </div>
      {height >= 36 && (
        <span className="mt-0.5 block truncate text-[10px] font-medium tabular-nums opacity-80">
          {timeRangeText(event)}{event.detail ? ` · ${event.detail}` : ''}
        </span>
      )}
    </button>
  );
});

function MiniMonthPicker({ anchorKey, todayKey, eventsByDay, onPickDay }) {
  const L = useCalendarLabels();
  const [cursorKey, setCursorKey] = useState(anchorKey);
  const matrix = useMemo(() => buildMonthMatrix(cursorKey, todayKey), [cursorKey, todayKey]);

  return (
    <div className="w-[264px] select-none p-2">
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label={L.tr('Tháng trước')}
          onClick={() => setCursorKey((k) => stepAnchorKey(k, 'month', -1))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-semibold text-rp-text">{L.monthTitle(cursorKey, matrix.title)}</span>
        <button
          type="button"
          aria-label={L.tr('Tháng sau')}
          onClick={() => setCursorKey((k) => stepAnchorKey(k, 'month', 1))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-rp-text-muted">
        {L.headers.map((h) => (
          <span key={h} className="py-1">{h}</span>
        ))}
      </div>
      <div className="mt-0.5 grid grid-cols-7 gap-0.5">
        {matrix.cells.map((cell) => {
          const isSelected = cell.key === anchorKey;
          const hasEvents = (eventsByDay.get(cell.key)?.length || 0) > 0;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onPickDay(cell.key)}
              className={`relative flex h-8 flex-col items-center justify-center rounded-lg text-[12px] transition-colors ${
                isSelected
                  ? 'bg-rp-brand-strong font-bold text-white shadow-xs'
                  : cell.isToday
                    ? 'bg-rp-brand-tint font-bold text-rp-brand-strong'
                    : cell.inCurrentMonth
                      ? 'text-rp-text hover:bg-rp-brand-tint/70'
                      : 'text-rp-text-muted/50 hover:bg-rp-bg-2'
              }`}
            >
              <span>{cell.dateNum}</span>
              {hasEvents && (
                <span
                  aria-hidden="true"
                  className={`mt-0.5 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-rp-brand-strong'}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Interactive Google Calendar-level schedule view supporting Day / Week / Month / Agenda,
 * VN GMT+7 timezone alignment, overlap packing, mini-calendar navigation, tone filtering,
 * and a contextual detail dialog showing only real backend-supported actions.
 */
export default function SakuraCalendar({
  events = [],
  anchorKey: controlledAnchorKey,
  onAnchorChange,
  view: controlledView,
  onViewChange,
  defaultView = 'week',
  startHour = 7,
  endHour = 22,
  hourHeight = 52,
  onRefresh,
  refreshing = false,
  onEmptySlotClick,
  renderEventActions,
  showToneFilter = true,
  emptyTitle = 'Chưa có lịch nào trong khoảng thời gian đang xem.',
  emptyDescription = 'Bạn có thể chuyển sang tuần/tháng khác hoặc bấm Làm mới để cập nhật.',
  className = '',
}) {
  const L = useCalendarLabels();
  const { tr, trf } = L;
  const [todayKey] = useState(() => toVnDateKey(new Date()));
  const [uncontrolledAnchor, setUncontrolledAnchor] = useState(() => toVnDateKey(new Date()));
  const [uncontrolledView, setUncontrolledView] = useState(defaultView);
  const [activeToneFilter, setActiveToneFilter] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [monthDayModal, setMonthDayModal] = useState(null);
  const [miniOpen, setMiniOpen] = useState(false);

  const anchorKey = controlledAnchorKey ?? uncontrolledAnchor;
  const view = controlledView ?? uncontrolledView;

  const setAnchor = useCallback((next) => {
    if (onAnchorChange) onAnchorChange(next);
    else setUncontrolledAnchor(next);
  }, [onAnchorChange]);

  const setView = useCallback((next) => {
    if (onViewChange) onViewChange(next);
    else setUncontrolledView(next);
  }, [onViewChange]);

  const [nowClock, setNowClock] = useState(() => toVnTimeParts(new Date()));
  useEffect(() => {
    const id = setInterval(() => setNowClock(toVnTimeParts(new Date())), 60000);
    return () => clearInterval(id);
  }, []);
  const nowMinutes = nowClock.hour * 60 + nowClock.minute;

  const availableTones = useMemo(() => {
    const set = new Set();
    events.forEach((ev) => set.add(ev.tone || 'session'));
    return [...set];
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (activeToneFilter === 'ALL') return events;
    return events.filter((ev) => (ev.tone || 'session') === activeToneFilter);
  }, [events, activeToneFilter]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of filteredEvents) {
      if (!ev.dayKey) continue;
      if (!map.has(ev.dayKey)) map.set(ev.dayKey, []);
      map.get(ev.dayKey).push(ev);
    }
    return map;
  }, [filteredEvents]);

  const range = useMemo(() => getViewDateRange(anchorKey, view), [anchorKey, view]);
  const weekDays = useMemo(
    () => (view === 'day'
      ? buildWeekDays(anchorKey, todayKey).filter((d) => d.key === anchorKey)
      : buildWeekDays(anchorKey, todayKey)),
    [anchorKey, todayKey, view]
  );
  const monthMatrix = useMemo(
    () => (view === 'month' ? buildMonthMatrix(anchorKey, todayKey) : null),
    [anchorKey, todayKey, view]
  );
  const agendaGroups = useMemo(
    () => (view === 'agenda'
      ? groupAgendaEvents(filteredEvents, { startKey: range.startKey, endKey: range.endKey, todayKey })
      : []),
    [view, filteredEvents, range.startKey, range.endKey, todayKey]
  );

  const rangeEventsCount = useMemo(
    () => filteredEvents.filter((ev) => ev.dayKey >= range.startKey && ev.dayKey <= range.endKey).length,
    [filteredEvents, range.startKey, range.endKey]
  );

  // Adaptive hour range across visible week/day events
  const visibleColumnKeys = useMemo(() => new Set(weekDays.map((d) => d.key)), [weekDays]);
  const visibleGridEvents = useMemo(
    () => filteredEvents.filter((ev) => visibleColumnKeys.has(ev.dayKey)),
    [filteredEvents, visibleColumnKeys]
  );

  const { firstHour, hours, gridHeight } = useMemo(() => {
    let minH = startHour;
    let maxH = endHour;
    for (const ev of visibleGridEvents) {
      const { start, end } = minutesOfEvent(ev);
      minH = Math.min(minH, Math.floor(start / 60));
      maxH = Math.max(maxH, Math.ceil(end / 60));
    }
    const clampedFirst = Math.max(0, Math.min(minH, 23));
    const clampedLast = Math.max(clampedFirst + 1, Math.min(maxH, 24));
    const hourArr = Array.from({ length: clampedLast - clampedFirst }, (_, idx) => clampedFirst + idx);
    return {
      firstHour: clampedFirst,
      hours: hourArr,
      gridHeight: hourArr.length * hourHeight,
    };
  }, [visibleGridEvents, startHour, endHour, hourHeight]);

  const packedByDay = useMemo(() => {
    const out = new Map();
    for (const day of weekDays) {
      out.set(day.key, packDayEvents(eventsByDay.get(day.key) || []));
    }
    return out;
  }, [weekDays, eventsByDay]);

  const showNowLine = nowMinutes >= firstHour * 60 && nowMinutes <= (firstHour + hours.length) * 60;

  const handleEmptyGridClick = (dayKey, clientY, rect) => {
    if (!onEmptySlotClick || !rect) return;
    const relY = Math.max(0, clientY - rect.top);
    const snappedMinutes = firstHour * 60 + Math.floor((relY / hourHeight) * 2) * 30;
    const endMinutes = Math.min(snappedMinutes + 90, 23 * 60 + 30);
    onEmptySlotClick({
      date: dayKey,
      from: clockFromMinutes(snappedMinutes),
      to: clockFromMinutes(endMinutes),
    });
  };

  return (
    <div className={`min-w-0 rounded-2xl border border-rp-line bg-white shadow-xs ${className}`} data-sakura-calendar="true">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rp-line px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchor(todayKey)}
            className="inline-flex h-9 items-center rounded-xl border border-rp-line bg-white px-3 text-[12.5px] font-semibold text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35"
          >
            {tr('Hôm nay')}
          </button>

          <div className="inline-flex items-center rounded-xl border border-rp-line bg-white p-0.5">
            <button
              type="button"
              aria-label={tr('Khoảng thời gian trước')}
              onClick={() => setAnchor(stepAnchorKey(anchorKey, view, -1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={tr('Khoảng thời gian sau')}
              onClick={() => setAnchor(stepAnchorKey(anchorKey, view, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Popover
            open={miniOpen}
            onOpenChange={setMiniOpen}
            align="start"
            label={tr('Chọn ngày trên lịch')}
            trigger={({ props, toggle }) => (
              <button
                {...props}
                type="button"
                onClick={toggle}
                aria-label={tr('Mở lịch chọn ngày nhanh')}
                className="inline-flex min-h-9 flex-col items-start justify-center rounded-xl px-2.5 py-1 text-left hover:bg-rp-brand-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35"
              >
                <span className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight text-rp-text">
                  {L.rangeTitle(range, anchorKey, view)}
                  <CalendarDays className="h-3.5 w-3.5 text-rp-brand-strong" />
                </span>
                <span className="text-[11px] font-medium text-rp-text-muted">{L.rangeSubtitle(range, view)}</span>
              </button>
            )}
          >
            <MiniMonthPicker
              anchorKey={anchorKey}
              todayKey={todayKey}
              eventsByDay={eventsByDay}
              onPickDay={(picked) => {
                setAnchor(picked);
                setMiniOpen(false);
              }}
            />
          </Popover>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rp-bg-2 px-2.5 py-1 text-[11px] font-medium text-rp-text-2">
            <Clock className="h-3 w-3 text-rp-brand-strong" />
            GMT+7 · {trf('{n} mục', { n: rangeEventsCount })}
          </span>

          <div
            role="tablist"
            aria-label={tr('Chế độ xem lịch')}
            className="inline-flex rounded-xl border border-rp-line bg-rp-bg-2 p-0.5"
          >
            {VIEWS.map((v) => {
              const active = view === v.id;
              return (
                <button
                  key={v.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setView(v.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-all ${
                    active
                      ? 'bg-white text-rp-brand-strong shadow-xs'
                      : 'text-rp-text-muted hover:text-rp-text'
                  }`}
                >
                  {tr(v.label)}
                </button>
              );
            })}
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label={tr('Làm mới dữ liệu lịch')}
              title={tr('Làm mới lịch')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rp-line bg-white text-rp-text-muted hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Filter & Legend Strip */}
      {showToneFilter && availableTones.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line bg-[#FCF9FB] px-4 py-2 text-[11.5px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveToneFilter('ALL')}
              className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
                activeToneFilter === 'ALL'
                  ? 'bg-rp-brand-strong text-white'
                  : 'bg-white text-rp-text-2 border border-rp-line hover:bg-rp-brand-tint'
              }`}
            >
              {trf('Tất cả ({n})', { n: events.length })}
            </button>
            {availableTones.map((tone) => {
              const meta = getToneMeta(tone);
              const active = activeToneFilter === tone;
              const count = events.filter((ev) => (ev.tone || 'session') === tone).length;
              return (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setActiveToneFilter(active ? 'ALL' : tone)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors ${
                    active
                      ? 'bg-rp-brand-strong text-white'
                      : 'bg-white text-rp-text-2 border border-rp-line hover:bg-rp-brand-tint'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${active ? 'bg-white' : meta.dot}`} aria-hidden="true" />
                  <span>{tr(meta.label)}</span>
                  <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
          {onEmptySlotClick && (view === 'day' || view === 'week') && (
            <span className="text-[11px] text-rp-text-muted">{tr('Nhấp vào ô giờ trống để chọn nhanh thời gian rảnh')}</span>
          )}
        </div>
      )}

      {/* Body */}
      <div className="rp-cal-stage">
        {rangeEventsCount === 0 && (view === 'agenda' || (!onEmptySlotClick && view !== 'month')) && (
          <div className="p-5">
            <ContextualEmptyState
              compact
              context="calendar"
              title={tr(emptyTitle)}
              description={tr(emptyDescription)}
            />
          </div>
        )}

        {/* DAY / WEEK TIMELINE */}
        {(view === 'week' || view === 'day') && (rangeEventsCount > 0 || onEmptySlotClick || view === 'week' || view === 'day') && (
          <div className="overflow-x-auto">
            <div className={view === 'week' ? 'min-w-[740px]' : 'min-w-full'}>
              {/* Sticky Day Headers */}
              <div
                className="sticky top-0 z-20 grid border-b border-rp-line bg-white/95 backdrop-blur-xs"
                style={{ gridTemplateColumns: `64px repeat(${weekDays.length}, minmax(0, 1fr))` }}
              >
                <div className="flex items-end justify-end px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-rp-text-muted">
                  GMT+7
                </div>
                {weekDays.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => {
                      setAnchor(day.key);
                      if (view === 'week') setView('day');
                    }}
                    className={`border-l border-rp-line px-2 py-2 text-center transition-colors hover:bg-rp-brand-tint/40 ${
                      day.isToday ? 'bg-rp-brand-tint/50' : day.isWeekend ? 'bg-[#FCF8FA]' : ''
                    }`}
                  >
                    <span className={`block text-[11px] font-semibold uppercase tracking-wide ${day.isToday ? 'text-rp-brand-strong' : 'text-rp-text-muted'}`}>
                      {view === 'day' ? L.dayFull(day) : L.dayShort(day)}
                    </span>
                    <span
                      className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-bold ${
                        day.isToday ? 'bg-rp-brand-strong text-white shadow-xs' : 'text-rp-text'
                      }`}
                    >
                      {day.dateNum}
                    </span>
                  </button>
                ))}
              </div>

              {/* Scrollable Hour Body */}
              <div
                className="grid max-h-[620px] overflow-y-auto"
                style={{ gridTemplateColumns: `64px repeat(${weekDays.length}, minmax(0, 1fr))` }}
              >
                <div className="relative bg-white" style={{ height: gridHeight }}>
                  {hours.map((hour) => (
                    <span
                      key={hour}
                      className="absolute right-2 -translate-y-1/2 text-[11px] font-medium tabular-nums text-rp-text-muted"
                      style={{ top: Math.max((hour - firstHour) * hourHeight, 8) }}
                    >
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  ))}
                </div>

                {weekDays.map((day) => {
                  const dayEvents = packedByDay.get(day.key) || [];
                  return (
                    <div
                      key={day.key}
                      onClick={(e) => handleEmptyGridClick(day.key, e.clientY, e.currentTarget.getBoundingClientRect())}
                      className={`relative border-l border-rp-line ${
                        day.isToday ? 'bg-[#FFF9FB]' : day.isWeekend ? 'bg-[#FCF8FA]/70' : 'bg-white'
                      } ${onEmptySlotClick ? 'cursor-cell' : ''}`}
                      style={{ height: gridHeight, contain: 'layout style' }}
                    >
                      {hours.map((hour) => (
                        <div key={hour}>
                          <div
                            className="pointer-events-none absolute inset-x-0 border-t border-rp-line/90"
                            style={{ top: (hour - firstHour) * hourHeight }}
                          />
                          <div
                            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-rp-line/45"
                            style={{ top: (hour - firstHour) * hourHeight + hourHeight / 2 }}
                          />
                        </div>
                      ))}

                      {showNowLine && day.isToday && (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-rp-brand-strong"
                          style={{ top: ((nowMinutes - firstHour * 60) / 60) * hourHeight }}
                        >
                          <span className="absolute -left-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-rp-brand-strong ring-2 ring-white" />
                        </div>
                      )}

                      {dayEvents.map((ev) => (
                        <TimeGridEvent
                          key={ev.id}
                          event={ev}
                          firstHour={firstHour}
                          hourHeight={hourHeight}
                          onSelect={setSelectedEvent}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MONTH VIEW */}
        {view === 'month' && monthMatrix && (
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-rp-line bg-rp-line">
              {L.headers.map((wd) => (
                <div key={wd} className="bg-rp-bg-2 px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-rp-text-muted">
                  {wd}
                </div>
              ))}
              {monthMatrix.cells.map((cell) => {
                const items = (eventsByDay.get(cell.key) || [])
                  .slice()
                  .sort((a, b) => minutesOfEvent(a).start - minutesOfEvent(b).start);
                const visible = items.slice(0, 3);
                const overflow = items.length - visible.length;
                return (
                  <div
                    key={cell.key}
                    className={`flex min-h-[82px] flex-col p-1.5 sm:min-h-[112px] sm:p-2 ${
                      cell.isToday
                        ? 'bg-[#FFF5F8]'
                        : cell.inCurrentMonth
                          ? cell.isWeekend ? 'bg-[#FCF9FB]' : 'bg-white'
                          : 'bg-[#FAF6F8] text-rp-text-muted/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAnchor(cell.key);
                          setView('day');
                        }}
                        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11.5px] font-bold transition-colors ${
                          cell.isToday
                            ? 'bg-rp-brand-strong text-white'
                            : cell.inCurrentMonth ? 'text-rp-text hover:bg-rp-brand-tint' : 'text-rp-text-muted/60 hover:bg-rp-bg-2'
                        }`}
                      >
                        {cell.dateNum}
                      </button>
                      {items.length > 0 && (
                        <span className="text-[10px] font-semibold text-rp-text-muted sm:hidden">{items.length}</span>
                      )}
                    </div>

                    {/* Desktop pills */}
                    <div className="mt-1 hidden space-y-1 sm:block">
                      {visible.map((ev) => {
                        const meta = getToneMeta(ev.tone);
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => (ev.onClick ? ev.onClick(ev) : setSelectedEvent(ev))}
                            className={`flex w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-[10.5px] font-semibold transition hover:brightness-95 ${meta.pill}`}
                          >
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
                            <span className="tabular-nums opacity-75">{clockFromMinutes(minutesOfEvent(ev).start)}</span>
                            <span className={`truncate ${ev.tone === 'cancelled' ? 'line-through' : ''}`}>{tr(ev.title)}</span>
                          </button>
                        );
                      })}
                      {overflow > 0 && (
                        <button
                          type="button"
                          onClick={() => setMonthDayModal({ dayKey: cell.key, items })}
                          className="block w-full rounded px-1.5 py-0.5 text-left text-[10.5px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint"
                        >
                          {trf('+{n} lịch khác', { n: overflow })}
                        </button>
                      )}
                    </div>

                    {/* Narrow mobile dot indicators */}
                    {items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMonthDayModal({ dayKey: cell.key, items })}
                        className="mt-1 flex flex-wrap gap-1 sm:hidden"
                        aria-label={trf('Xem {n} lịch ngày {date}', { n: items.length, date: L.shortDate(cell.key) })}
                      >
                        {items.slice(0, 4).map((ev) => (
                          <span key={ev.id} className={`h-1.5 w-1.5 rounded-full ${getToneMeta(ev.tone).dot}`} />
                        ))}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AGENDA VIEW */}
        {view === 'agenda' && agendaGroups.length > 0 && (
          <div className="divide-y divide-rp-line">
            {agendaGroups.map((group) => (
              <section key={group.dayKey} className="px-4 py-3.5 sm:px-5">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <h3 className={`text-[13px] font-bold ${group.isToday ? 'text-rp-brand-strong' : 'text-rp-text'}`}>
                    {L.fullDay(group.dayKey, todayKey)}
                  </h3>
                  <span className="text-[11px] font-medium text-rp-text-muted">{trf('{n} mục', { n: group.items.length })}</span>
                </div>
                <div className="space-y-2">
                  {group.items.map((ev) => {
                    const meta = getToneMeta(ev.tone);
                    return (
                      <article
                        key={ev.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rp-line bg-white px-3.5 py-2.5 transition hover:border-rp-brand-border hover:bg-rp-brand-tint/35"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
                          <div className="min-w-0">
                            <p className={`truncate text-[13.5px] font-semibold text-rp-text ${ev.tone === 'cancelled' ? 'line-through opacity-75' : ''}`}>
                              {tr(ev.title)}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-rp-text-muted">
                              <span className="font-semibold tabular-nums text-rp-text-2">{timeRangeText(ev)}</span>
                              <span>· {L.duration(durationMinutes(ev))}</span>
                              {ev.detail && <span>· {ev.detail}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.pill}`}>
                            {tr(ev.statusLabel || meta.label)}
                          </span>
                          <button
                            type="button"
                            onClick={() => (ev.onClick ? ev.onClick(ev) : setSelectedEvent(ev))}
                            className="inline-flex h-8 items-center rounded-lg border border-rp-line bg-white px-2.5 text-[12px] font-semibold text-rp-text-2 hover:border-rp-brand-border hover:text-rp-brand-strong"
                          >
                            {tr('Chi tiết')}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Month Overflow Day Modal */}
      {monthDayModal && (
        <Modal
          open={Boolean(monthDayModal)}
          onClose={() => setMonthDayModal(null)}
          title={L.fullDay(monthDayModal.dayKey, todayKey)}
          size="md"
        >
          <div className="space-y-2.5">
            {monthDayModal.items.map((ev) => {
              const meta = getToneMeta(ev.tone);
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    setMonthDayModal(null);
                    if (ev.onClick) ev.onClick(ev);
                    else setSelectedEvent(ev);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition hover:brightness-95 ${meta.card}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold">{tr(ev.title)}</p>
                    <p className="mt-0.5 truncate text-[12px] opacity-80">
                      {timeRangeText(ev)}{ev.detail ? ` · ${ev.detail}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${meta.pill}`}>
                    {tr(ev.statusLabel || meta.label)}
                  </span>
                </button>
              );
            })}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  const k = monthDayModal.dayKey;
                  setMonthDayModal(null);
                  setAnchor(k);
                  setView('day');
                }}
                className="inline-flex h-9 items-center rounded-xl bg-rp-brand-strong px-3.5 text-[12.5px] font-semibold text-white hover:bg-rp-brand-deep"
              >
                {tr('Mở chế độ xem Ngày')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Contextual Event Detail Modal */}
      {selectedEvent && (
        <Modal
          open={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          title={tr(selectedEvent.title)}
          size="md"
        >
          {(() => {
            const meta = getToneMeta(selectedEvent.tone);
            const closeDetail = () => setSelectedEvent(null);
            return (
              <div className="space-y-4">
                <div className={`rounded-xl p-3.5 ${meta.card}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.pill}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {tr(selectedEvent.statusLabel || meta.label)}
                    </span>
                    <span className="text-[12px] font-semibold tabular-nums">{L.duration(durationMinutes(selectedEvent))} · GMT+7</span>
                  </div>
                  <p className="mt-2 text-[13px] font-semibold">
                    {L.fullDay(selectedEvent.dayKey, todayKey)} · {timeRangeText(selectedEvent)}
                  </p>
                  {selectedEvent.detail && (
                    <p className="mt-1 text-[12.5px] opacity-90">{selectedEvent.detail}</p>
                  )}
                </div>

                {Array.isArray(selectedEvent.metaRows) && selectedEvent.metaRows.length > 0 && (
                  <dl className="grid gap-2 rounded-xl border border-rp-line bg-rp-bg-2/60 p-3 text-[12.5px]">
                    {selectedEvent.metaRows.map((row) => (
                      <div key={row.label} className="flex items-start justify-between gap-3">
                        <dt className="text-rp-text-muted">{tr(row.label)}</dt>
                        <dd className="text-right font-medium text-rp-text">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {selectedEvent.href && (
                  <div>
                    <Link
                      to={selectedEvent.href}
                      onClick={closeDetail}
                      className="inline-flex h-9 items-center rounded-xl bg-rp-brand-strong px-4 text-[12.5px] font-semibold text-white hover:bg-rp-brand-deep"
                    >
                      {tr(selectedEvent.hrefLabel || 'Mở chi tiết')}
                    </Link>
                  </div>
                )}

                {renderEventActions && renderEventActions(selectedEvent, closeDetail)}

                <div className="flex justify-end border-t border-rp-line pt-3">
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3.5 text-[12.5px] font-semibold text-rp-text-2 hover:bg-rp-brand-tint"
                  >
                    <X className="h-3.5 w-3.5" /> {tr('Đóng')}
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
