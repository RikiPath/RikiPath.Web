import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  List,
  X,
} from 'lucide-react';
import { Modal, Popover, Tabs } from '@/components/ui/overlay.jsx';
import { RefreshButton } from '@/components/ui/RefreshButton.jsx';
import { RefreshingIndicator } from '@/components/ui/SakuraLoader.jsx';
import { ContextualEmptyState } from '@/components/ui/SmartDataBoundary.jsx';
import { StatusDotListbox } from '@/features/scheduling/components/ScheduleFilterControls.jsx';
import { useLocale } from '@/locales/locale.js';
import {
  CALENDAR_CATEGORY_ORDER,
  buildMonthMatrix,
  buildWeekDays,
  formatFullDayVn,
  formatShortDateVn,
  getCalendarCategoryMeta,
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
      title={`${event.fullTitle || event.title} · ${timeRangeText(event)} · ${tr(event.statusLabel || meta.label)}`}
      onClick={(e) => {
        e.stopPropagation();
        if (event.onClick) {
          event.onClick(event);
        } else {
          onSelect?.(event);
        }
      }}
      className={`group absolute flex flex-col justify-between overflow-hidden rounded-xl px-2.5 py-1.5 text-left transition-all duration-150 hover:z-30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/40 ${event.className || meta.card}`}
      style={{ top, height, width, left, zIndex: z }}
      aria-label={`${event.title} (${timeRangeText(event)})`}
    >
      <div className="flex items-start gap-1.5">
        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
        <span className={`line-clamp-2 text-[11.5px] font-bold leading-snug ${event.tone === 'cancelled' ? 'line-through' : ''}`}>
          {tr(event.title)}
        </span>
      </div>
      {height >= 36 && (
        <span className="mt-0.5 block truncate text-[10px] font-medium tabular-nums opacity-85">
          {timeRangeText(event)}{event.detail && event.detail !== timeRangeText(event) ? ` · ${event.detail}` : ''}
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
          const dayItems = eventsByDay.get(cell.key) || [];
          const dayCategoryTones = [...new Set(
            dayItems
              .filter((ev) => ev.tone !== 'cancelled' && !ev.isCancelled && !(ev.eventType === 'homework' && ev.isCompleted))
              .map((ev) => getCalendarCategoryMeta(ev).id),
          )].sort((a, b) => CALENDAR_CATEGORY_ORDER.indexOf(a) - CALENDAR_CATEGORY_ORDER.indexOf(b));
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onPickDay(cell.key)}
              className={`relative flex h-8 flex-col items-center justify-center rounded-lg text-[12px] transition-colors ${
                isSelected
                  ? 'bg-rp-brand-pressed font-bold text-white shadow-xs'
                  : cell.isToday
                    ? 'bg-rp-brand-tint font-bold text-rp-brand-strong'
                    : cell.inCurrentMonth
                      ? 'text-rp-text hover:bg-rp-brand-tint/70'
                      : 'text-rp-text-muted/50 hover:bg-rp-bg-2'
              }`}
            >
              <span>{cell.dateNum}</span>
              {dayCategoryTones.length > 0 && (
                <span className="mt-0.5 flex items-center gap-0.5" aria-hidden="true">
                  {dayCategoryTones.slice(0, 4).map((catKey) => (
                    <span
                      key={catKey}
                      className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : getToneMeta(catKey).dot}`}
                    />
                  ))}
                </span>
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
  audience = 'mentor', // 'mentor' | 'learner'
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
  agendaSortSmart = false,
  agendaShowAllDates = false,
  agendaPreserveOrder = false,
  headerTopRight = null,
  toolbarExtra = null,
  belowToolbar = null,
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

  const range = useMemo(() => getViewDateRange(anchorKey, view, audience), [anchorKey, view, audience]);
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
      ? groupAgendaEvents(filteredEvents, {
          startKey: agendaShowAllDates ? undefined : range.startKey,
          endKey: agendaShowAllDates ? undefined : range.endKey,
          todayKey,
          smartOrder: agendaSortSmart,
          preserveOrder: agendaPreserveOrder,
        })
      : []),
    [view, filteredEvents, range.startKey, range.endKey, todayKey, agendaSortSmart, agendaShowAllDates, agendaPreserveOrder]
  );

  const rangeEventsCount = useMemo(
    () => (view === 'agenda' && agendaShowAllDates
      ? filteredEvents.length
      : filteredEvents.filter((ev) => ev.dayKey >= range.startKey && ev.dayKey <= range.endKey).length),
    [view, agendaShowAllDates, filteredEvents, range.startKey, range.endKey]
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
      <div className={headerTopRight
        ? 'flex flex-col gap-2.5 border-b border-rp-line px-4 py-3'
        : 'flex flex-wrap items-center justify-between gap-3 border-b border-rp-line px-4 py-3'}
      >
        <div className={headerTopRight
          ? 'flex flex-wrap items-center justify-between gap-2.5'
          : 'flex min-w-0 flex-wrap items-center gap-2'}
        >
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
          {headerTopRight && (
            <div className="ml-auto flex items-center gap-2">
              {headerTopRight}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Toggle: Lịch | Danh sách — shared Tabs, so the active pill slides like every other segmented control */}
          <Tabs
            variant="pill"
            tone="segmented"
            size="sm"
            label={tr('Chế độ hiển thị')}
            value={view === 'agenda' ? 'agenda' : 'calendar'}
            onChange={(next) => {
              if (next === 'agenda') setView('agenda');
              else if (view === 'agenda') setView('week');
            }}
            tabs={[
              { value: 'calendar', label: 'Lịch', icon: CalendarIcon },
              { value: 'agenda', label: 'Danh sách', icon: List },
            ]}
          />

          {view !== 'agenda' && (
            <div
              role="group"
              aria-label={tr('Khung thời gian lịch')}
              className="inline-flex rounded-xl border border-rp-line bg-rp-bg-2 p-0.5"
            >
              {VIEWS.filter((v) => v.id !== 'agenda').map((v) => {
                const active = view === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setView(v.id)}
                    className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-all ${
                      active
                        ? 'bg-white text-rp-brand-strong shadow-2xs'
                        : 'text-rp-text-muted hover:text-rp-text'
                    }`}
                  >
                    {tr(v.label)}
                  </button>
                );
              })}
            </div>
          )}

          {toolbarExtra}

          {showToneFilter && availableTones.length > 0 && (
            <StatusDotListbox
              value={activeToneFilter}
              onChange={(nextTone) => setActiveToneFilter(nextTone)}
              options={[
                { id: 'ALL', label: 'Tất cả trạng thái', dotClass: 'bg-[#CE476D]' },
                ...availableTones.map((tone) => ({
                  id: tone,
                  label: getToneMeta(tone).label,
                  dotClass: getToneMeta(tone).dot,
                })),
              ]}
            />
          )}

          {onRefresh && !(view === 'agenda' && rangeEventsCount === 0) && (
            <RefreshButton
              iconOnly
              size="sm"
              onRefresh={onRefresh}
              refreshing={refreshing}
              tooltip={tr('Làm mới lịch')}
              aria-label={tr('Làm mới dữ liệu lịch')}
              className="!h-8.5 !w-8.5 rounded-xl"
            />
          )}
        </div>
      </div>

      {belowToolbar}

      {/* Compact 1-line filter hint ONLY when a tone filter is active and yields 0 matches in the viewed range */}
      {activeToneFilter !== 'ALL' && rangeEventsCount === 0 && (
        <div
          data-testid="calendar-empty-filter-hint"
          className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line bg-[#FCFAFB] px-4 py-1.5 text-[11.5px]"
        >
          <span className="font-medium text-rp-text-2">
            {tr('Không có lịch khớp với trạng thái đang lọc trong khoảng thời gian này.')}
          </span>
          <button
            type="button"
            data-testid="calendar-clear-tone-filter-btn"
            onClick={() => setActiveToneFilter('ALL')}
            className="rp-link font-semibold text-rp-brand-strong"
          >
            {tr('Xóa bộ lọc')}
          </button>
        </div>
      )}

      {/* Body — Calendar mode NEVER renders a big Empty State above or inside the grid; only List (agenda) mode renders Empty State when empty */}
      <div className="rp-cal-stage relative bg-white">
        {refreshing && (
          <div className="pointer-events-none sticky top-2 z-30 h-0 overflow-visible px-3">
            <div className="flex justify-end">
              <div className="pointer-events-auto">
                <RefreshingIndicator active delay={60} label={tr('Đang cập nhật lịch…')} />
              </div>
            </div>
          </div>
        )}
        {view === 'agenda' && rangeEventsCount === 0 && (
          <div className="p-6">
            <ContextualEmptyState
              variant="compact"
              context="calendar"
              illustration="calendar"
              title={tr(emptyTitle)}
              description={tr(emptyDescription)}
            />
          </div>
        )}

        {/* DAY / WEEK TIMELINE */}
        {(view === 'week' || view === 'day') && (
          <div className="overflow-x-auto bg-white">
            <div className={view === 'week' ? 'min-w-[740px]' : 'min-w-full'}>
              {/* Fixed Day Headers — sits OUTSIDE the vertical scroll container and shares stable scrollbar-gutter */}
              <div
                data-testid="calendar-header-grid"
                className="rp-cal-scroll grid border-b border-rp-line bg-white"
                style={{
                  gridTemplateColumns: `64px repeat(${weekDays.length}, minmax(0, 1fr))`,
                  scrollbarGutter: 'stable',
                  overflowY: 'scroll',
                }}
              >
                <div className="flex items-end justify-end bg-white px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-rp-text-muted">
                  GMT+7
                </div>
                {weekDays.map((day) => {
                  const isSelectedDay = day.key === anchorKey;
                  return (
                    <button
                      key={day.key}
                      type="button"
                      data-day-header={day.key}
                      data-is-today={day.isToday ? 'true' : 'false'}
                      data-is-selected={isSelectedDay ? 'true' : 'false'}
                      onClick={() => {
                        if (day.key === anchorKey && view === 'week') {
                          setView('day');
                        } else {
                          setAnchor(day.key);
                        }
                      }}
                      className={`relative border-l border-rp-line px-2 py-2 text-center transition-colors ${
                        isSelectedDay ? 'bg-rp-brand-tint/35' : 'bg-white hover:bg-rp-bg-2/50'
                      }`}
                    >
                      <span className={`block text-[11px] font-semibold uppercase tracking-wide ${
                        day.isToday || isSelectedDay ? 'text-rp-brand-strong' : 'text-rp-text-muted'
                      }`}>
                        {view === 'day' ? L.dayFull(day) : L.dayShort(day)}
                      </span>
                      <span
                        className={`mx-auto mt-0.5 flex h-7.5 w-7.5 items-center justify-center rounded-full text-[14px] font-bold transition-all ${
                          day.isToday && isSelectedDay
                            ? 'bg-rp-brand-pressed text-white ring-2 ring-rp-brand-border ring-offset-1 shadow-2xs'
                            : day.isToday
                              ? 'bg-rp-brand-pressed text-white shadow-2xs'
                              : isSelectedDay
                                ? 'border border-rp-brand-border bg-rp-brand-tint font-bold text-rp-brand-strong'
                                : 'text-rp-text'
                        }`}
                      >
                        {day.dateNum}
                      </span>
                      {isSelectedDay && (
                        <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-rp-brand" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Time-Grid Hour Body — ONLY the Body scrolls vertically; shares scrollbarGutter: stable with Header */}
              <div
                data-testid="calendar-body-grid"
                className="rp-cal-scroll grid max-h-[calc(100dvh-242px)] min-h-[min(490px,calc(100dvh-250px))] overflow-y-scroll bg-white"
                style={{
                  gridTemplateColumns: `64px repeat(${weekDays.length}, minmax(0, 1fr))`,
                  scrollbarGutter: 'stable',
                }}
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
                      data-day-col={day.key}
                      onClick={(e) => handleEmptyGridClick(day.key, e.clientY, e.currentTarget.getBoundingClientRect())}
                      className={`relative border-l border-rp-line bg-white ${onEmptySlotClick ? 'cursor-cell' : ''}`}
                      style={{ height: gridHeight, contain: 'layout style' }}
                    >
                      {hours.map((hour) => (
                        <div key={hour}>
                          <div
                            className="pointer-events-none absolute inset-x-0 border-t border-gray-200/80"
                            style={{ top: (hour - firstHour) * hourHeight }}
                          />
                          <div
                            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-gray-100"
                            style={{ top: (hour - firstHour) * hourHeight + hourHeight / 2 }}
                          />
                        </div>
                      ))}

                      {showNowLine && day.isToday && (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-rp-brand-pressed"
                          style={{ top: ((nowMinutes - firstHour * 60) / 60) * hourHeight }}
                        >
                          <span className="absolute -left-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-rp-brand-pressed ring-2 ring-white" />
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
                const isSelectedCell = cell.key === anchorKey;
                const items = (eventsByDay.get(cell.key) || [])
                  .slice()
                  .sort((a, b) => minutesOfEvent(a).start - minutesOfEvent(b).start);
                const visible = items.slice(0, 3);
                const overflow = items.length - visible.length;
                return (
                  <div
                    key={cell.key}
                    onClick={() => setAnchor(cell.key)}
                    className={`flex min-h-[82px] cursor-pointer flex-col p-1.5 transition-colors sm:min-h-[112px] sm:p-2 ${
                      isSelectedCell
                        ? 'bg-rp-brand-tint/30 ring-1 ring-inset ring-rp-brand-border'
                        : cell.inCurrentMonth
                          ? 'bg-white hover:bg-rp-bg-2/45'
                          : 'bg-rp-bg-2/70 text-rp-text-muted/60 hover:bg-rp-bg-2'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (cell.key === anchorKey) {
                            setView('day');
                          } else {
                            setAnchor(cell.key);
                          }
                        }}
                        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11.5px] font-bold transition-all ${
                          cell.isToday && isSelectedCell
                            ? 'bg-rp-brand-pressed text-white ring-2 ring-rp-brand-border ring-offset-1'
                            : cell.isToday
                              ? 'bg-rp-brand-pressed text-white'
                              : isSelectedCell
                                ? 'border border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
                                : cell.inCurrentMonth ? 'text-rp-text hover:bg-rp-brand-tint' : 'text-rp-text-muted/60 hover:bg-rp-bg-2'
                        }`}
                      >
                        {cell.dateNum}
                      </button>
                      {items.length > 0 && (
                        <span className="rounded-full bg-rp-bg-2 px-1.5 py-px text-[10px] font-semibold tabular-nums text-rp-text-muted">
                          {items.length}
                        </span>
                      )}
                    </div>

                    {/* Desktop pills */}
                    <div className="mt-1 hidden space-y-1 sm:block">
                      {visible.map((ev) => {
                        const meta = getToneMeta(ev.tone);
                        const hideClock = ev.eventType === 'srs' && (ev.srsState === 'due_now' || ev.srsState === 'completed_today' || ev.srsState === 'reviewed_past');
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAnchor(cell.key);
                              if (ev.onClick) ev.onClick(ev);
                              else setSelectedEvent(ev);
                            }}
                            className={`flex w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-[10.5px] font-semibold transition hover:brightness-95 ${meta.pill}`}
                          >
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
                            {!hideClock && (
                              <span className="shrink-0 whitespace-nowrap tabular-nums opacity-75">
                                {clockFromMinutes(minutesOfEvent(ev).start)}
                              </span>
                            )}
                            <span className={`min-w-0 flex-1 truncate ${ev.tone === 'cancelled' ? 'line-through' : ''}`}>
                              {tr(ev.title)}
                            </span>
                          </button>
                        );
                      })}
                      {overflow > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnchor(cell.key);
                            setMonthDayModal({ dayKey: cell.key, items });
                          }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnchor(cell.key);
                          setMonthDayModal({ dayKey: cell.key, items });
                        }}
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

        {/* LIST VIEW (Danh sách — Mobile Cards + Desktop 5-Column Compact Table) */}
        {view === 'agenda' && agendaGroups.length > 0 && (
          <div className="max-h-[calc(100dvh-196px)] min-h-[min(320px,calc(100dvh-220px))] overflow-auto">
            {/* Mobile Compact Cards */}
            <div className="divide-y divide-rp-line md:hidden">
              {agendaGroups.flatMap((group) => group.items.map((ev) => ({ group, ev }))).map(({ group, ev }) => {
                const meta = getToneMeta(ev.tone);
                const catMeta = getCalendarCategoryMeta(ev);
                const isCohort = ev.tone === 'session' || ev.tone === 'booked' || ev.rawSlot?.isInCohort || ev.eventType === 'session' || ev.eventType === 'live';
                const typeLabel = audience === 'learner'
                  ? (ev.eventType === 'homework'
                    ? 'Bài tập'
                    : ev.eventType === 'srs'
                      ? 'Ôn tập'
                      : ev.eventType === 'reminder'
                        ? 'Nhắc nhở'
                        : isCohort ? 'Buổi lớp nhóm' : 'Lịch học')
                  : (isCohort ? 'Buổi lớp nhóm' : 'Khung giờ đăng ký');
                return (
                  <div key={`m-${ev.id}`} className="space-y-2 p-3.5 text-[13px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-rp-text-muted">{L.fullDay(group.dayKey, todayKey)}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${catMeta.pill || meta.pill}`}>
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${catMeta.dot || meta.dot}`} />
                        {tr(ev.statusLabel || meta.label)}
                      </span>
                    </div>
                    <p className={`font-bold text-rp-text ${ev.tone === 'cancelled' ? 'line-through opacity-75' : ''}`}>
                      {tr(ev.fullTitle || ev.title)}
                    </p>
                    <p className="text-xs font-medium tabular-nums text-rp-text-2">
                      {timeRangeText(ev)} · {L.duration(durationMinutes(ev))} · {tr(typeLabel)}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => (ev.onClick ? ev.onClick(ev) : setSelectedEvent(ev))}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-rp-line bg-white px-2.5 text-xs font-semibold text-rp-text-2 hover:bg-rp-brand-tint"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{tr('Xem')}</span>
                      </button>
                      {ev.href && (
                        <Link
                          to={ev.href}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-rp-brand-border bg-rp-brand-tint px-2.5 text-xs font-semibold text-rp-brand-strong"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{tr(ev.hrefLabel || 'Mở lớp')}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <table className="hidden w-full border-collapse text-left text-[13px] md:table">
              <thead className="sticky top-0 z-10 border-b border-rp-line bg-rp-table-head text-[11.5px] font-semibold uppercase tracking-wide text-rp-text-muted">
                <tr>
                  <th className="px-4 py-2.5">{tr('Ngày')}</th>
                  <th className="px-4 py-2.5">{tr(audience === 'learner' ? 'Giờ học' : 'Giờ dạy')}</th>
                  <th className="px-4 py-2.5">{tr('Loại lịch')}</th>
                  <th className="px-4 py-2.5">{tr('Trạng thái')}</th>
                  <th className="px-4 py-2.5 text-right">{tr('Thao tác')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rp-line/70">
                {agendaGroups.flatMap((group) => group.items.map((ev) => ({ group, ev }))).map(({ group, ev }) => {
                  const meta = getToneMeta(ev.tone);
                  const catMeta = getCalendarCategoryMeta(ev);
                  const isCohort = ev.tone === 'session' || ev.tone === 'booked' || ev.rawSlot?.isInCohort || ev.eventType === 'session' || ev.eventType === 'live';
                  const isAvailabilityOnly = !isCohort && ev.eventType === 'availability';
                  const typeLabel = audience === 'learner'
                    ? (ev.eventType === 'homework'
                      ? 'Bài tập'
                      : ev.eventType === 'srs'
                        ? 'Ôn tập'
                        : ev.eventType === 'reminder'
                          ? 'Nhắc nhở'
                          : isCohort ? 'Buổi lớp nhóm' : 'Lịch học')
                    : (isCohort ? 'Buổi lớp nhóm' : 'Khung giờ đăng ký');
                  const typeBadgeClass = isAvailabilityOnly
                    ? 'border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E]'
                    : catMeta.pill;
                  const typeDotClass = isAvailabilityOnly ? 'bg-[#0D9488]' : catMeta.dot;
                  return (
                    <tr key={ev.id} className="transition-colors hover:bg-rp-bg-2/40">
                      <td className="px-4 py-2.5 font-medium text-rp-text whitespace-nowrap">
                        {L.fullDay(group.dayKey, todayKey)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-bold tabular-nums text-rp-text">
                          {timeRangeText(ev)}
                          <span className="ml-1.5 text-[11.5px] font-normal text-rp-text-muted">
                            ({L.duration(durationMinutes(ev))})
                          </span>
                        </div>
                        <div className={`mt-0.5 text-[11.5px] text-rp-text-2 ${ev.tone === 'cancelled' ? 'line-through opacity-75' : ''}`}>
                          {tr(ev.fullTitle || ev.title)}
                          {ev.detail && ev.detail !== timeRangeText(ev) ? ` · ${ev.detail}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${typeBadgeClass}`}>
                          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${typeDotClass}`} />
                          {tr(typeLabel)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${meta.pill}`}>
                          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {tr(ev.statusLabel || meta.label)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (ev.onClick) ev.onClick(ev);
                              else setSelectedEvent(ev);
                            }}
                            className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-rp-line bg-white px-2.5 text-[11.5px] font-semibold text-rp-text-2 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{tr('Xem')}</span>
                          </button>
                          {ev.href && (
                            <Link
                              to={ev.href}
                              className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-rp-brand-border bg-rp-brand-tint px-2.5 text-[11.5px] font-semibold text-rp-brand-strong transition-colors hover:bg-rp-brand-soft"
                            >
                              <CalendarDays className="h-3.5 w-3.5" />
                              <span>{tr(ev.hrefLabel || 'Mở lớp')}</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                className="inline-flex h-9 items-center rounded-xl bg-rp-brand-pressed px-3.5 text-[12.5px] font-semibold text-white hover:bg-rp-brand-strong"
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

                {Array.isArray(selectedEvent.relatedHomeworks) && selectedEvent.relatedHomeworks.length > 0 && (
                  <div className="space-y-1.5 rounded-xl border border-rp-line bg-rp-surface p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-rp-text-muted">
                      {tr('Bài tập liên quan của lớp')}
                    </p>
                    <ul className="space-y-1">
                      {selectedEvent.relatedHomeworks.map((hw) => (
                        <li key={hw.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                          <span className="min-w-0 flex-1 truncate font-medium text-rp-text">{hw.title}</span>
                          <Link
                            to={hw.cohortId ? `/homework/?cohortId=${hw.cohortId}` : '/homework'}
                            onClick={closeDetail}
                            className="shrink-0 font-semibold rp-link"
                          >
                            {tr('Mở bài tập')}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(selectedEvent.href || selectedEvent.secondaryHref) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedEvent.href && (
                      <Link
                        to={selectedEvent.href}
                        onClick={closeDetail}
                        className="inline-flex h-9 items-center rounded-xl bg-rp-brand-pressed px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-rp-brand-strong"
                      >
                        {tr(selectedEvent.hrefLabel || 'Mở chi tiết')}
                      </Link>
                    )}
                    {selectedEvent.secondaryHref && (
                      <Link
                        to={selectedEvent.secondaryHref}
                        onClick={closeDetail}
                        className="inline-flex h-9 items-center rounded-xl border border-rp-line bg-white px-3.5 text-[12.5px] font-semibold text-rp-text-2 transition-colors hover:bg-rp-brand-tint"
                      >
                        {tr(selectedEvent.secondaryLabel || 'Không gian lớp học')}
                      </Link>
                    )}
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
