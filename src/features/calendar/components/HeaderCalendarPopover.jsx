import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  BookCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderUp,
  Layers3,
  PenLine,
  RefreshCw,
  Video,
} from 'lucide-react';
import { Drawer, HeaderIconBadge, IconButton, Popover, RefreshButton, SakuraLoader, cx } from '@/components/ui';
import { SpotArt } from '@/assets/illustrations/SpotArt.jsx';
import {
  CALENDAR_CATEGORIES,
  CALENDAR_CATEGORY_ORDER,
  buildMonthMatrix,
  getCalendarCategoryMeta,
  getToneMeta,
  toVnDateKey,
  toVnTimeParts,
} from '@/features/scheduling/utils/calendarGeometry.js';
import { notificationDestination } from '@/features/notifications/utils/notificationDedupe.js';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useWorkspaceCalendar } from '../hooks/useWorkspaceCalendar.js';
import { homeworkStatusMeta } from '../utils/calendarEventsModel.js';

const MINI_WEEKDAYS = {
  vi: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
  ja: ['月', '火', '水', '木', '金', '土', '日'],
};

function useNarrowHeaderViewport() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(max-width: 639px)').matches),
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(max-width: 639px)');
    if (!mq) return undefined;
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

function shiftMonthKey(monthAnchorKey, delta) {
  const [y, m] = String(monthAnchorKey).split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 15));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function MiniCalendarGrid({ monthAnchorKey, selectedDayKey, todayKey, dayTonesMap, onChangeMonth, onSelectDay, tr, locale, roleKey }) {
  const { cells } = useMemo(() => buildMonthMatrix(monthAnchorKey, todayKey), [monthAnchorKey, todayKey]);
  const [year, month] = monthAnchorKey.split('-').map(Number);
  const monthLabel = new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString(currentIntlTag(), {
    timeZone: 'Asia/Ho_Chi_Minh',
    month: 'long',
    year: 'numeric',
  });
  const weekdays = MINI_WEEKDAYS[locale] || MINI_WEEKDAYS.vi;

  return (
    <div className="border-b border-rp-line bg-rp-bg-2/50 px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold capitalize text-rp-text">{monthLabel}</p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              onChangeMonth(todayKey);
              onSelectDay(todayKey);
            }}
            className="rp-focus inline-flex h-7 items-center rounded-lg px-2 text-[11.5px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint"
          >
            {tr('Hôm nay')}
          </button>
          <button
            type="button"
            onClick={() => onChangeMonth(shiftMonthKey(monthAnchorKey, -1))}
            aria-label={tr('Tháng trước')}
            className="rp-focus inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-muted hover:text-rp-text"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeMonth(shiftMonthKey(monthAnchorKey, 1))}
            aria-label={tr('Tháng sau')}
            className="rp-focus inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-muted hover:text-rp-text"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10.5px] font-semibold text-rp-text-muted">
        {weekdays.map((d) => (
          <span key={d} className="py-0.5">{d}</span>
        ))}
      </div>
      <div className="mt-0.5 grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          const tones = dayTonesMap.get(cell.key);
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedDayKey;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDay(cell.key)}
              className={cx(
                'rp-focus flex h-[30px] flex-col items-center justify-center rounded-lg text-[11.5px] transition-colors',
                !cell.inCurrentMonth && 'opacity-40',
                isSelected && isToday
                  ? 'bg-rp-brand-pressed font-bold text-white shadow-rp-xs ring-2 ring-rp-brand-border/70'
                  : isSelected
                    ? 'bg-rp-brand-pressed font-bold text-white shadow-rp-xs'
                    : isToday
                      ? 'bg-rp-brand-tint font-bold text-rp-brand-strong ring-1 ring-inset ring-rp-brand-border'
                      : 'font-medium text-rp-text hover:bg-rp-muted/80',
              )}
            >
              <span className="leading-none tabular-nums">{cell.dateNum}</span>
              <span className="mt-px flex h-1 items-center gap-0.5">
                {tones && [...tones]
                  .sort((a, b) => CALENDAR_CATEGORY_ORDER.indexOf(a) - CALENDAR_CATEGORY_ORDER.indexOf(b))
                  .slice(0, 4)
                  .map((tone) => (
                    <span
                      key={tone}
                      className={cx(
                        'h-1 w-1 rounded-full',
                        isSelected ? 'bg-white' : getToneMeta(tone).dot,
                      )}
                    />
                  ))}
              </span>
            </button>
          );
        })}
      </div>
      {roleKey === 'Mentor' ? (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-rp-line/60 pt-1.5 text-[10px] font-semibold text-rp-text-2">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6B7280]" />
            {tr('Sắp diễn ra')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D97706]" />
            {tr('Đang diễn ra')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            {tr('Đã hoàn thành')}
          </span>
        </div>
      ) : (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-rp-line/60 pt-1.5 text-[10px] font-semibold text-rp-text-2">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rp-cal-class" />
            {tr('Lớp học')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rp-cal-homework" />
            {tr('Bài tập')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rp-cal-srs" />
            {tr('Ôn tập')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rp-cal-reminder" />
            {tr('Nhắc nhở')}
          </span>
        </div>
      )}
    </div>
  );
}

function roleCalendarTitle(roleKey) {
  if (roleKey === 'Mentor') return 'Lịch giảng dạy';
  if (roleKey === 'Admin') return 'Điều phối lịch & yêu cầu';
  if (roleKey === 'ContentAuthor') return 'Tiến độ học liệu';
  return 'Lịch học thông minh';
}

const AUTHOR_BATCH_META = {
  Rejected: { label: 'Bị từ chối', badge: 'bg-rp-danger-bg text-rp-danger' },
  PendingReview: { label: 'Chờ duyệt', badge: 'bg-rp-warning-bg text-rp-warning' },
  Draft: { label: 'Bản nháp', badge: 'bg-rp-muted text-rp-text-2' },
};

function NotificationSnippetList({ title, items, onClose, fallbackHref, tr }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <section className="space-y-1.5">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-rp-text-muted">
        {tr(title)}
      </h3>
      <ul className="space-y-1">
        {items.map((n) => {
          const dest = notificationDestination(n.linkUrl) || fallbackHref || '';
          const inner = (
            <>
              <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-cal-reminder" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-rp-cal-reminder-text">{tr(n.title)}</p>
                {n.message && <p className="line-clamp-2 text-rp-cal-reminder-text/80">{tr(n.message)}</p>}
              </div>
            </>
          );
          return (
            <li key={n.id}>
              {dest ? (
                <Link
                  to={dest}
                  onClick={onClose}
                  className={cx(
                    'group rp-focus flex items-center gap-2.5 rounded-xl px-3 py-2 text-[11.5px]',
                    CALENDAR_CATEGORIES.reminder.card,
                    CALENDAR_CATEGORIES.reminder.hoverCard,
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">{inner}</div>
                  <span aria-hidden="true" className={CALENDAR_CATEGORIES.reminder.arrowChip}>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ) : (
                <div className={cx('flex items-start gap-2 rounded-xl px-3 py-2 text-[11.5px]', CALENDAR_CATEGORIES.reminder.card)}>
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CalendarPopoverBody({
  calendar,
  monthAnchorKey,
  onChangeMonthAnchor,
  onClose,
}) {
  const { locale, tr, trf } = useLocale();
  const {
    roleKey,
    nowMs,
    events,
    summary,
    srsState,
    srsDueCount,
    adminCohortRequests,
    adminPendingSlots = [],
    pendingScheduleChanges,
    authorSummary = { draftCount: 0, pendingReviewCount: 0, rejectedCount: 0, approvedCount: 0, recentAttention: [] },
    editorialNotifications = [],
    partialErrors,
    hardError,
    isLoading,
    isFetching,
    refetchAll,
  } = calendar;

  const { todayKey, liveSessions, upcomingSessions, pendingHomeworks, scheduleNotifications, dayTonesMap } = summary;
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [trackedTodayKey, setTrackedTodayKey] = useState(todayKey);
  if (todayKey && todayKey !== trackedTodayKey) {
    setTrackedTodayKey(todayKey);
    if (selectedDayKey === trackedTodayKey) setSelectedDayKey(todayKey);
    if (monthAnchorKey === trackedTodayKey) onChangeMonthAnchor(todayKey);
  }

  const selectedDayEvents = useMemo(
    () => events.filter((ev) => ev.dayKey === selectedDayKey),
    [events, selectedDayKey],
  );
  const isViewingOtherDay = selectedDayKey !== todayKey;

  const todayFormatted = useMemo(
    () => new Date(nowMs).toLocaleDateString(currentIntlTag(), {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    }),
    [nowMs],
  );

  const fullCalendarRoute = roleKey === 'Learner'
    ? '/calendar'
    : roleKey === 'Mentor'
      ? '/work-schedule'
      : roleKey === 'Admin'
        ? '/admin/mentor-schedules'
        : '/author-dashboard';

  const hasActiveSrsSession = Boolean(srsState?.hasActiveSession && (srsState?.activeSessionPendingCount || 0) > 0);
  const hasSrsDigest = roleKey === 'Learner' && Boolean(
    hasActiveSrsSession
    || srsDueCount > 0
    || (srsState?.dueLaterTodayCount || 0) > 0,
  );

  const hasAnyUpcoming = roleKey === 'Admin'
    ? adminCohortRequests.length > 0 || pendingScheduleChanges.length > 0
    : roleKey === 'ContentAuthor'
      ? false
      : upcomingSessions.length > 0 || pendingHomeworks.length > 0 || hasSrsDigest || selectedDayEvents.length > 0;

  return (
    <div className="flex max-h-[82vh] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-rp-line px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-rp-brand-strong">
            {tr(roleCalendarTitle(roleKey))}
          </p>
          <p className="truncate text-[13.5px] font-bold capitalize text-rp-text">{todayFormatted}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isLoading && !hardError && (roleKey === 'Admin' || roleKey === 'ContentAuthor' ? hasAnyUpcoming : true) && (
            <RefreshButton
              iconOnly
              size="sm"
              onRefresh={refetchAll}
              refreshing={isFetching}
              tooltip={tr('Làm mới lịch')}
              aria-label={tr('Làm mới lịch')}
              className="!h-7 !w-7 rounded-full border-transparent bg-transparent hover:border-rp-brand-border"
            />
          )}
        </div>
      </div>

      {/* Mini Calendar */}
      {roleKey !== 'Admin' && roleKey !== 'ContentAuthor' && (
        <MiniCalendarGrid
          monthAnchorKey={monthAnchorKey}
          selectedDayKey={selectedDayKey}
          todayKey={todayKey}
          dayTonesMap={dayTonesMap}
          onChangeMonth={onChangeMonthAnchor}
          onSelectDay={setSelectedDayKey}
          tr={tr}
          locale={locale}
          roleKey={roleKey}
        />
      )}

      {/* Body */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3.5 py-2.5 text-[12.5px]">
        {isLoading ? (
          <div className="flex min-h-[96px] items-center justify-center">
            <SakuraLoader variant="inline" size={24} context="data" />
          </div>
        ) : hardError ? (
          <div className="flex items-center justify-between gap-2.5 rounded-xl border border-rp-danger-line bg-rp-danger-bg/60 px-3 py-2">
            <p className="min-w-0 text-xs font-semibold leading-4 text-rp-danger">{tr('Chưa tải được lịch học lúc này.')}</p>
            <button
              type="button"
              onClick={refetchAll}
              className="rp-focus inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-rp-line bg-rp-surface px-2.5 text-xs font-semibold text-rp-text shadow-rp-xs transition-colors hover:border-rp-brand-border hover:text-rp-brand-strong"
            >
              <RefreshCw className="h-3 w-3" /> {tr('Thử lại')}
            </button>
          </div>
        ) : (
          <>
            {partialErrors.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-rp-warning/30 bg-rp-warning-bg/50 px-3 py-2 text-[11.5px] text-rp-warning">
                <span className="truncate">{tr('Một phần dữ liệu lịch chưa tải xong.')}</span>
                <button
                  type="button"
                  onClick={partialErrors[0].retry}
                  className="rp-link shrink-0 font-bold"
                >
                  {tr('Thử lại')}
                </button>
              </div>
            )}

            {/* Live Room Highlight */}
            {liveSessions.length > 0 && (() => {
              const firstLive = liveSessions[0];
              if (roleKey === 'Mentor') {
                const isActuallyLive = firstLive.tone === 'workLive';
                const toneMeta = getToneMeta(firstLive.tone || 'workLive');
                return (
                  <div className={cx('rounded-xl p-3', toneMeta.card)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide">
                          <span className={cx('h-2 w-2 rounded-full', toneMeta.dot, isActuallyLive && 'animate-pulse')} />
                          {isActuallyLive ? tr('Đang diễn ra') : tr('Sắp diễn ra · Phòng đã mở')}
                        </span>
                        <p className="mt-0.5 truncate font-bold">{firstLive.title}</p>
                        <p className="text-[11.5px] opacity-85">{firstLive.detail}</p>
                      </div>
                      <Link
                        to={firstLive.roomHref}
                        onClick={onClose}
                        className={cx(
                          'rp-focus inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95',
                          isActuallyLive ? 'bg-[#D97706]' : 'bg-[#4B5563]',
                        )}
                      >
                        <Video className="h-3.5 w-3.5" />
                        {isActuallyLive ? tr('Vào phòng học') : tr('Tham gia phòng học')}
                      </Link>
                    </div>
                  </div>
                );
              }
              return (
                <div className="rounded-xl border border-l-[3.5px] border-rp-cal-class-border border-l-rp-cal-class bg-rp-cal-class-bg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-rp-cal-class-text">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-rp-cal-class" />
                        {tr('Phòng học đang mở')}
                      </span>
                      <p className="mt-0.5 truncate font-bold text-rp-cal-class-text">{firstLive.title}</p>
                      <p className="text-[11.5px] text-rp-cal-class-text/85">{firstLive.detail}</p>
                    </div>
                    <Link
                      to={firstLive.roomHref}
                      onClick={onClose}
                      className="rp-focus inline-flex shrink-0 items-center gap-1 rounded-xl bg-rp-cal-class px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                    >
                      <Video className="h-3.5 w-3.5" />
                      {tr('Tham gia')}
                    </Link>
                  </div>
                </div>
              );
            })()}

            {/* Selected Specific Day View */}
            {roleKey !== 'Admin' && roleKey !== 'ContentAuthor' && isViewingOtherDay ? (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-rp-text-muted">
                    {trf('Lịch ngày {0}', { 0: selectedDayKey.split('-').reverse().join('/') })}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedDayKey(todayKey)}
                    className="rp-focus rp-link rounded text-[11.5px] font-semibold"
                  >
                    {tr('Về lịch sắp tới')}
                  </button>
                </div>
                {selectedDayEvents.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-rp-line bg-rp-bg-2/60 px-3 py-3.5 text-center">
                    <SpotArt name="calendar" size={64} />
                    <p className="text-xs text-rp-text-muted">
                      {roleKey === 'Mentor'
                        ? tr('Chưa có lịch giảng dạy.')
                        : tr('Không có lớp học, bài tập hay lịch ôn tập trong ngày này.')}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {selectedDayEvents.map((ev) => {
                      const catMeta = roleKey === 'Mentor' ? getToneMeta(ev.tone) : getCalendarCategoryMeta(ev);
                      const catLabel = roleKey === 'Mentor'
                        ? tr(ev.statusLabel || catMeta.label)
                        : ev.eventType === 'homework'
                          ? tr('Bài tập')
                          : ev.eventType === 'srs'
                            ? tr('Ôn tập')
                            : ev.eventType === 'reminder'
                              ? tr('Nhắc nhở')
                              : tr('Lớp học');
                      const CatIcon = ev.eventType === 'homework'
                        ? BookCheck
                        : ev.eventType === 'srs'
                          ? Layers3
                          : ev.eventType === 'reminder'
                            ? BellRing
                            : CalendarDays;
                      return (
                        <li key={ev.id}>
                          <Link
                            to={ev.href || fullCalendarRoute}
                            onClick={onClose}
                            className={cx(
                              'group rp-focus flex items-center justify-between gap-2.5 rounded-xl px-3 py-2',
                              catMeta.card,
                              catMeta.hoverCard,
                            )}
                          >
                            <CatIcon className={cx('h-4 w-4 shrink-0', catMeta.iconText)} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="rounded bg-white/80 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide">
                                  {catLabel}
                                </span>
                                <span className={cx('truncate font-semibold', ev.tone === 'cancelled' && 'line-through opacity-75')}>
                                  {ev.title}
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate text-[11.5px] opacity-85">
                                {ev.detail || ev.statusLabel}
                              </span>
                            </span>
                            {ev.eventType === 'srs' && ev.canReviewNow ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rp-cal-srs px-2 py-1 text-[11px] font-semibold text-white transition-transform duration-150 group-hover:scale-[1.03]">
                                <span>{tr(ev.hrefLabel || 'Ôn ngay')}</span>
                                <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                              </span>
                            ) : (
                              <span aria-hidden="true" title={tr(ev.hrefLabel || 'Xem')} className={catMeta.arrowChip}>
                                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ) : roleKey === 'Admin' ? (
              <div className="space-y-3">
                <section className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-rp-text-muted">
                    {tr('Điều phối lịch đang chờ')}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <Link
                      to="/admin/mentor-schedules"
                      onClick={onClose}
                      className="rp-focus flex items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-bg-2/60 px-3 py-2.5 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/25"
                    >
                      <span className="text-xs font-medium text-rp-text-2">{tr('Khung giờ Giáo viên chờ duyệt')}</span>
                      <span className="text-base font-bold tabular-nums text-rp-text">{adminPendingSlots.length}</span>
                    </Link>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/admin/study-courses?section=requests"
                        onClick={onClose}
                        className="rp-focus rounded-xl border border-rp-line bg-rp-bg-2/60 p-3 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/25"
                      >
                        <p className="text-lg font-bold tabular-nums text-rp-text">{adminCohortRequests.length}</p>
                        <p className="text-[11.5px] text-rp-text-muted">{tr('Yêu cầu dời buổi lớp')}</p>
                      </Link>
                      <Link
                        to="/admin/study-courses?section=requests"
                        onClick={onClose}
                        className="rp-focus rounded-xl border border-rp-line bg-rp-bg-2/60 p-3 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/25"
                      >
                        <p className="text-lg font-bold tabular-nums text-rp-text">{pendingScheduleChanges.length}</p>
                        <p className="text-[11.5px] text-rp-text-muted">{tr('Yêu cầu đổi lịch học viên')}</p>
                      </Link>
                    </div>
                  </div>
                </section>
                <NotificationSnippetList
                  title="Thông báo điều phối"
                  items={scheduleNotifications.slice(0, 3)}
                  onClose={onClose}
                  tr={tr}
                />
              </div>
            ) : roleKey === 'ContentAuthor' ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-rp-line bg-rp-bg-2/60 px-3 py-2.5">
                  <p className="text-xs font-semibold text-rp-text">{tr('Không dùng lịch giảng dạy nhóm')}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-rp-text-muted">
                    {tr('Tác giả nội dung theo dõi hàng chờ duyệt học liệu và tiến độ nhập liệu tại bảng điều khiển.')}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Link
                    to="/author-dashboard"
                    onClick={onClose}
                    className="rp-focus rounded-xl border border-rp-line bg-rp-surface p-2.5 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/25"
                  >
                    <p className="text-base font-bold tabular-nums text-rp-danger">{authorSummary.rejectedCount}</p>
                    <p className="text-[11px] text-rp-text-muted">{tr('Bị từ chối')}</p>
                  </Link>
                  <Link
                    to="/author-dashboard"
                    onClick={onClose}
                    className="rp-focus rounded-xl border border-rp-line bg-rp-surface p-2.5 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/25"
                  >
                    <p className="text-base font-bold tabular-nums text-rp-warning">{authorSummary.pendingReviewCount}</p>
                    <p className="text-[11px] text-rp-text-muted">{tr('Chờ duyệt')}</p>
                  </Link>
                  <Link
                    to="/author-dashboard"
                    onClick={onClose}
                    className="rp-focus rounded-xl border border-rp-line bg-rp-surface p-2.5 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/25"
                  >
                    <p className="text-base font-bold tabular-nums text-rp-text">{authorSummary.draftCount}</p>
                    <p className="text-[11px] text-rp-text-muted">{tr('Bản nháp')}</p>
                  </Link>
                </div>

                {authorSummary.recentAttention.length > 0 && (
                  <section className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[11px] font-bold uppercase tracking-wide text-rp-text-muted">
                        {tr('Lô học liệu cần theo dõi')}
                      </h3>
                      <span className="text-[11px] font-medium text-rp-text-muted">
                        {trf('{0} đã duyệt', { 0: authorSummary.approvedCount })}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {authorSummary.recentAttention.slice(0, 3).map((batch) => {
                        const meta = AUTHOR_BATCH_META[batch.status] || AUTHOR_BATCH_META.Draft;
                        return (
                          <li key={batch.id}>
                            <Link
                              to="/author-dashboard"
                              onClick={onClose}
                              className="rp-focus flex items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-surface px-3 py-2 text-xs transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/25"
                            >
                              <span className="min-w-0 truncate font-semibold text-rp-text">{batch.title}</span>
                              <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold', meta.badge)}>
                                {tr(meta.label)}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/content-manual"
                    onClick={onClose}
                    className="rp-focus flex items-center gap-2 rounded-xl border border-rp-line bg-rp-surface px-3 py-2 text-xs font-semibold text-rp-text-2 transition-colors hover:border-rp-brand-border hover:text-rp-brand-strong"
                  >
                    <PenLine className="h-3.5 w-3.5 shrink-0 text-rp-brand-strong" />
                    <span className="truncate">{tr('Soạn thảo tổng hợp')}</span>
                  </Link>
                  <Link
                    to="/bulk-import"
                    onClick={onClose}
                    className="rp-focus flex items-center gap-2 rounded-xl border border-rp-line bg-rp-surface px-3 py-2 text-xs font-semibold text-rp-text-2 transition-colors hover:border-rp-brand-border hover:text-rp-brand-strong"
                  >
                    <FolderUp className="h-3.5 w-3.5 shrink-0 text-rp-brand-strong" />
                    <span className="truncate">{tr('Import Excel')}</span>
                  </Link>
                </div>

                <NotificationSnippetList
                  title="Thông báo học liệu"
                  items={editorialNotifications.slice(0, 2)}
                  fallbackHref="/author-dashboard"
                  onClose={onClose}
                  tr={tr}
                />
              </div>
            ) : !hasAnyUpcoming ? (
              <div className="rounded-xl border border-dashed border-rp-line bg-rp-bg-2/60 px-4 py-5 text-center">
                <SpotArt name="calendar" size={88} className="mx-auto" />
                <p className="mt-2 font-semibold text-rp-text">
                  {roleKey === 'Mentor' ? tr('Chưa có lịch giảng dạy.') : tr('Bạn chưa có lịch học sắp tới.')}
                </p>
                {roleKey === 'Learner' && (
                  <Link
                    to="/cohorts"
                    onClick={onClose}
                    className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-rp-brand-tint px-3 py-1 text-xs font-semibold text-rp-brand-strong hover:bg-rp-brand-tint-2"
                  >
                    {tr('Khám phá lớp học')} <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Upcoming Sessions */}
                {upcomingSessions.length > 0 && (
                  <section className="space-y-1.5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-rp-text-muted">
                      {roleKey === 'Mentor' ? tr('Buổi dạy sắp tới') : tr('Buổi học sắp tới')}
                    </h3>
                    <ul className="space-y-1.5">
                      {upcomingSessions.slice(0, 1).map((ev) => {
                        const evMeta = roleKey === 'Mentor' ? getToneMeta(ev.tone) : CALENDAR_CATEGORIES.class;
                        const targetHref = ev.canJoin && ev.roomHref ? ev.roomHref : (ev.href || ev.secondaryHref || fullCalendarRoute);
                        return (
                          <li key={ev.id}>
                            <Link
                              to={targetHref}
                              onClick={onClose}
                              className={cx(
                                'group rp-focus flex items-center justify-between gap-2 rounded-xl px-3 py-2',
                                evMeta.card,
                                evMeta.hoverCard,
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold">
                                  {ev.title}
                                </p>
                                <p className="truncate text-[11.5px] opacity-85">
                                  {formatVnDateTime(ev.scheduledAt)} · {ev.statusLabel}
                                </p>
                              </div>
                              {ev.canJoin && ev.roomHref ? (
                                <span
                                  className={cx(
                                    'inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-semibold text-white transition-transform duration-150 group-hover:scale-[1.03]',
                                    roleKey === 'Mentor'
                                      ? (ev.tone === 'workLive' ? 'bg-[#D97706]' : 'bg-[#4B5563]')
                                      : 'bg-rp-cal-class',
                                  )}
                                >
                                  {roleKey === 'Mentor'
                                    ? (ev.tone === 'workLive' ? tr('Vào phòng học') : tr('Tham gia phòng học'))
                                    : tr('Vào phòng')}
                                  <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                                </span>
                              ) : (
                                <span
                                  title={roleKey === 'Mentor' ? tr(ev.hrefLabel || 'Xem chi tiết lớp') : tr(ev.joinReason)}
                                  aria-label={tr('Xem chi tiết lớp')}
                                  className={evMeta.arrowChip}
                                >
                                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                {/* Pending Homeworks (Learner) */}
                {roleKey === 'Learner' && pendingHomeworks.length > 0 && (
                  <section className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[11px] font-bold uppercase tracking-wide text-rp-text-muted">
                        {tr('Bài tập sắp đến hạn')}
                      </h3>
                      <Link
                        to="/homework"
                        onClick={onClose}
                        className="rp-focus rp-link rounded text-[11.5px] font-semibold"
                      >
                        {tr('Tất cả')} ({pendingHomeworks.length})
                      </Link>
                    </div>
                    <ul className="space-y-1.5">
                      {pendingHomeworks.slice(0, 3).map((hw) => {
                        const meta = homeworkStatusMeta(hw, nowMs);
                        return (
                          <li key={hw.id}>
                            <Link
                              to={hw.cohortId ? `/homework/?cohortId=${hw.cohortId}` : '/homework'}
                              onClick={onClose}
                              className={cx(
                                'group rp-focus flex items-center justify-between gap-2.5 rounded-xl px-3 py-2',
                                CALENDAR_CATEGORIES.homework.card,
                                CALENDAR_CATEGORIES.homework.hoverCard,
                              )}
                            >
                              <BookCheck className="h-4 w-4 shrink-0 text-rp-cal-homework" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-rp-cal-homework-text">{hw.title}</span>
                                <span className="block truncate text-[11px] text-rp-cal-homework-text/80">
                                  {hw.dueAt ? formatVnDateTime(hw.dueAt) : tr('Chưa đặt hạn')} · {tr(meta.label)}
                                </span>
                              </span>
                              <span aria-hidden="true" className={CALENDAR_CATEGORIES.homework.arrowChip}>
                                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                {/* Today SRS Review Digest (Learner) — Priority 1: Active Session > Priority 2: Due Now > Priority 3: Hidden */}
                {roleKey === 'Learner' && hasSrsDigest && (
                  <section className="space-y-1.5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-rp-text-muted">
                      {tr('Ôn tập')}
                    </h3>
                    {hasActiveSrsSession ? (
                      <Link
                        to={srsState?.reviewHref || '/daily-srs'}
                        onClick={onClose}
                        data-testid="popover-srs-due-link"
                        aria-label={`${tr('Tiếp tục ôn tập')} — ${trf('Còn {0} thẻ chưa hoàn thành', { 0: srsState.activeSessionPendingCount })} — ${tr('Tiếp tục ôn')}`}
                        className={cx(
                          'group rp-focus flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5',
                          CALENDAR_CATEGORIES.srs.card,
                          CALENDAR_CATEGORIES.srs.hoverCard,
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Layers3 className="h-4 w-4 shrink-0 text-rp-cal-srs transition-transform duration-150 group-hover:scale-110" />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-rp-cal-srs-text">
                              {tr('Tiếp tục ôn tập')}
                            </p>
                            <p className="text-[11px] leading-snug text-rp-cal-srs-text/80">
                              {trf('Còn {0} thẻ chưa hoàn thành', { 0: srsState.activeSessionPendingCount })}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rp-cal-srs px-2.5 py-1 text-[11.5px] font-semibold text-white transition-transform duration-150 group-hover:scale-[1.03]">
                          <span>{tr('Tiếp tục ôn')}</span>
                          <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    ) : srsDueCount > 0 ? (
                      <Link
                        to={srsState?.reviewHref || '/daily-srs'}
                        onClick={onClose}
                        data-testid="popover-srs-due-link"
                        aria-label={`${trf('{0} thẻ cần ôn', { 0: srsDueCount })} — ${tr('Ôn ngay')}`}
                        className={cx(
                          'group rp-focus flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5',
                          CALENDAR_CATEGORIES.srs.card,
                          CALENDAR_CATEGORIES.srs.hoverCard,
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Layers3 className="h-4 w-4 shrink-0 text-rp-cal-srs transition-transform duration-150 group-hover:scale-110" />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-rp-cal-srs-text">
                              {trf('{0} thẻ cần ôn', { 0: srsDueCount })}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rp-cal-srs px-2.5 py-1 text-[11.5px] font-semibold text-white transition-transform duration-150 group-hover:scale-[1.03]">
                          <span>{tr('Ôn ngay')}</span>
                          <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    ) : (srsState?.dueLaterTodayCount || 0) > 0 ? (
                      <Link
                        to={srsState?.libraryHref || '/daily-srs/library/'}
                        onClick={onClose}
                        aria-label={`${trf('{0} thẻ cần ôn', { 0: srsState.dueLaterTodayCount })} — ${tr('Xem thẻ')}`}
                        className={cx(
                          'group rp-focus flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5',
                          CALENDAR_CATEGORIES.srs.card,
                          CALENDAR_CATEGORIES.srs.hoverCard,
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Layers3 className="h-4 w-4 shrink-0 text-rp-cal-srs transition-transform duration-150 group-hover:scale-110" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-rp-cal-srs-text">
                              {trf('{0} thẻ cần ôn', { 0: srsState.dueLaterTodayCount })}
                            </p>
                            <p className="truncate text-[11px] text-rp-cal-srs-text/80">
                              {srsState.nextDueAtUtc
                                ? trf('Ôn tiếp lúc {0}', { 0: toVnTimeParts(srsState.nextDueAtUtc).hhmm })
                                : tr('Dự kiến đến hạn hôm nay')}
                            </p>
                          </div>
                        </div>
                        <span aria-hidden="true" title={tr('Xem thẻ')} className={CALENDAR_CATEGORIES.srs.arrowChip}>
                          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    ) : null}
                  </section>
                )}

                {/* Schedule Notifications */}
                <NotificationSnippetList
                  title="Thông báo lịch học"
                  items={scheduleNotifications.slice(0, 2)}
                  onClose={onClose}
                  tr={tr}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-rp-line bg-rp-bg-2/70 px-3.5 py-2">
        {roleKey === 'Learner' ? (
          <Link
            to="/homework"
            onClick={onClose}
            className="text-xs font-semibold text-rp-text-2 hover:text-rp-brand-strong"
          >
            {tr('Bài tập về nhà')}
          </Link>
        ) : roleKey === 'Mentor' ? (
          <Link
            to="/mentor-shift-schedule"
            onClick={onClose}
            className="text-xs font-semibold text-rp-text-2 hover:text-rp-brand-strong"
          >
            {tr('Đăng ký lịch dạy')}
          </Link>
        ) : roleKey === 'Admin' ? (
          <Link
            to="/admin/slot-review"
            onClick={onClose}
            className="text-xs font-semibold text-rp-text-2 hover:text-rp-brand-strong"
          >
            {tr('Yêu cầu đổi/hủy lịch')}
          </Link>
        ) : roleKey === 'ContentAuthor' ? (
          <Link
            to="/content-manual"
            onClick={onClose}
            className="text-xs font-semibold text-rp-text-2 hover:text-rp-brand-strong"
          >
            {tr('Soạn thảo tổng hợp')}
          </Link>
        ) : <span />}
        <Link
          to={fullCalendarRoute}
          onClick={onClose}
          className="rp-focus inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-rp-brand-pressed px-3 text-xs font-semibold text-white transition-colors hover:bg-rp-brand-strong"
        >
          {roleKey === 'Learner'
            ? tr('Xem lịch đầy đủ')
            : roleKey === 'ContentAuthor'
              ? tr('Bảng điều khiển tác giả')
              : roleKey === 'Admin'
                ? tr('Duyệt lịch dạy')
                : tr('Mở lịch làm việc')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function HeaderCalendarPopover({ roleKey }) {
  const { tr } = useLocale();
  const narrow = useNarrowHeaderViewport();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [monthAnchorKey, setMonthAnchorKey] = useState(() => toVnDateKey(new Date()));
  const calendar = useWorkspaceCalendar({ roleKey, anchorKey: monthAnchorKey });

  const todayCount = calendar.summary.todayActionCount ?? calendar.summary.todayEvents.length;
  const hasLive = (roleKey === 'Learner' || roleKey === 'Mentor') && calendar.summary.liveSessions.length > 0;
  const badgeCount = roleKey === 'Admin'
    ? (calendar.adminPendingSlots?.length || 0) + (calendar.adminCohortRequests?.length || 0) + (calendar.pendingScheduleChanges?.length || 0)
    : roleKey === 'ContentAuthor'
      ? (calendar.authorSummary?.activeCount || 0)
      : (hasLive ? Math.max(todayCount, calendar.summary.liveSessions.length) : todayCount);

  const baseTitle = tr(roleCalendarTitle(roleKey));
  const triggerAriaLabel = badgeCount > 0 ? `${baseTitle} (${badgeCount})` : baseTitle;

  const triggerBadge = badgeCount > 0 ? (
    <HeaderIconBadge pulse={hasLive}>
      {badgeCount > 99 ? '99+' : badgeCount}
    </HeaderIconBadge>
  ) : null;

  if (narrow) {
    return (
      <>
        <IconButton
          icon={CalendarDays}
          label={triggerAriaLabel}
          onClick={() => setDrawerOpen(true)}
          variant="outline"
          className="rp-hc shadow-rp-xs"
          badge={triggerBadge}
        />
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={baseTitle}
          side="right"
          padded={false}
        >
          <CalendarPopoverBody
            calendar={calendar}
            monthAnchorKey={monthAnchorKey}
            onChangeMonthAnchor={setMonthAnchorKey}
            onClose={() => setDrawerOpen(false)}
          />
        </Drawer>
      </>
    );
  }

  return (
    <Popover
      label={baseTitle}
      align="end"
      panelClassName="w-[328px] sm:w-[340px] max-w-[calc(100vw-24px)] overflow-hidden p-0"
      trigger={({ toggle, props }) => (
        <IconButton
          {...props}
          icon={CalendarDays}
          label={triggerAriaLabel}
          onClick={toggle}
          variant="outline"
          className="rp-hc shadow-rp-xs"
          badge={triggerBadge}
        />
      )}
    >
      {({ close }) => (
        <CalendarPopoverBody
          calendar={calendar}
          monthAnchorKey={monthAnchorKey}
          onChangeMonthAnchor={setMonthAnchorKey}
          onClose={close}
        />
      )}
    </Popover>
  );
}
