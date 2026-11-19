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
  PenLine,
  RefreshCw,
  Sparkles,
  Video,
} from 'lucide-react';
import { Drawer, HeaderIconBadge, IconButton, Popover, SakuraLoader, cx } from '@/components/ui';
import { buildMonthMatrix, getToneMeta } from '@/features/scheduling/utils/calendarGeometry.js';
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

function MiniCalendarGrid({ monthAnchorKey, selectedDayKey, todayKey, dayTonesMap, onChangeMonth, onSelectDay, tr, locale }) {
  const { cells } = useMemo(() => buildMonthMatrix(monthAnchorKey, todayKey), [monthAnchorKey, todayKey]);
  const [year, month] = monthAnchorKey.split('-').map(Number);
  const monthLabel = new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString(currentIntlTag(), {
    timeZone: 'Asia/Ho_Chi_Minh',
    month: 'long',
    year: 'numeric',
  });
  const weekdays = MINI_WEEKDAYS[locale] || MINI_WEEKDAYS.vi;

  return (
    <div className="border-b border-rp-line bg-rp-bg-2/50 px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-bold capitalize text-rp-text">{monthLabel}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              onChangeMonth(todayKey);
              onSelectDay(todayKey);
            }}
            className="rp-focus rounded-lg px-2 py-0.5 text-[11px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint"
          >
            {tr('Hôm nay')}
          </button>
          <button
            type="button"
            onClick={() => onChangeMonth(shiftMonthKey(monthAnchorKey, -1))}
            aria-label={tr('Tháng trước')}
            className="rp-focus rounded-lg p-1 text-rp-text-muted hover:bg-rp-muted hover:text-rp-text"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeMonth(shiftMonthKey(monthAnchorKey, 1))}
            aria-label={tr('Tháng sau')}
            className="rp-focus rounded-lg p-1 text-rp-text-muted hover:bg-rp-muted hover:text-rp-text"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-rp-text-muted">
        {weekdays.map((d) => (
          <span key={d} className="py-0.5">{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
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
                'rp-focus flex h-8 flex-col items-center justify-center rounded-lg text-[11.5px] transition-colors',
                !cell.inCurrentMonth && 'opacity-40',
                isSelected
                  ? 'bg-rp-brand-pressed font-bold text-white shadow-rp-xs'
                  : isToday
                    ? 'bg-rp-brand-tint font-bold text-rp-brand-strong ring-1 ring-inset ring-rp-brand-border'
                    : 'font-medium text-rp-text hover:bg-rp-muted/80',
              )}
            >
              <span className="leading-none tabular-nums">{cell.dateNum}</span>
              <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                {tones && [...tones].slice(0, 3).map((tone) => (
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
              <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-brand-strong" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-rp-text">{tr(n.title)}</p>
                {n.message && <p className="line-clamp-2 text-rp-text-muted">{tr(n.message)}</p>}
              </div>
            </>
          );
          return (
            <li key={n.id}>
              {dest ? (
                <Link
                  to={dest}
                  onClick={onClose}
                  className="rp-focus flex items-start gap-2 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3 py-2 text-[11.5px] transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/30"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3 py-2 text-[11.5px]">
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

function CalendarPopoverBody({ calendar, onClose }) {
  const { locale, tr, trf } = useLocale();
  const {
    roleKey,
    nowMs,
    events,
    summary,
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
  const [monthAnchorKey, setMonthAnchorKey] = useState(todayKey);
  const [trackedTodayKey, setTrackedTodayKey] = useState(todayKey);
  if (todayKey && todayKey !== trackedTodayKey) {
    setTrackedTodayKey(todayKey);
    if (selectedDayKey === trackedTodayKey) setSelectedDayKey(todayKey);
    if (monthAnchorKey === trackedTodayKey) setMonthAnchorKey(todayKey);
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

  const hasAnyUpcoming = roleKey === 'Admin'
    ? adminCohortRequests.length > 0 || pendingScheduleChanges.length > 0
    : roleKey === 'ContentAuthor'
      ? false
      : upcomingSessions.length > 0 || pendingHomeworks.length > 0 || srsDueCount > 0 || selectedDayEvents.length > 0;

  return (
    <div className="flex max-h-[82vh] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-rp-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-rp-brand-strong">
            {tr(roleCalendarTitle(roleKey))}
          </p>
          <p className="truncate text-sm font-bold capitalize text-rp-text">{todayFormatted}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-rp-brand-tint px-2 py-0.5 text-[10.5px] font-semibold text-rp-brand-strong">
            <Clock className="h-3 w-3" /> GMT+7
          </span>
          <button
            type="button"
            onClick={refetchAll}
            disabled={isFetching}
            aria-label={tr('Làm mới lịch')}
            className="rp-focus rounded-full p-1.5 text-rp-text-muted hover:bg-rp-muted hover:text-rp-text"
          >
            <RefreshCw className={cx('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Mini Calendar */}
      {roleKey !== 'Admin' && roleKey !== 'ContentAuthor' && (
        <MiniCalendarGrid
          monthAnchorKey={monthAnchorKey}
          selectedDayKey={selectedDayKey}
          todayKey={todayKey}
          dayTonesMap={dayTonesMap}
          onChangeMonth={setMonthAnchorKey}
          onSelectDay={setSelectedDayKey}
          tr={tr}
          locale={locale}
        />
      )}

      {/* Body */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-[13px]">
        {isLoading ? (
          <div className="flex min-h-[140px] items-center justify-center">
            <SakuraLoader variant="inline" size={24} context="data" />
          </div>
        ) : hardError ? (
          <div className="rounded-xl border border-rp-danger/25 bg-rp-danger-bg/40 p-3 text-center">
            <p className="text-xs font-semibold text-rp-danger">{tr('Chưa tải được lịch học lúc này.')}</p>
            <button
              type="button"
              onClick={refetchAll}
              className="rp-focus mt-2 inline-flex items-center gap-1 rounded-lg bg-rp-surface px-3 py-1 text-xs font-semibold text-rp-text shadow-rp-xs hover:bg-rp-muted"
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
            {liveSessions.length > 0 && (
              <div className="rounded-xl border border-[#99F6E4] bg-[#F0FDFA] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-[#0F766E]">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#0F766E]" />
                      {tr('Phòng học đang mở')}
                    </span>
                    <p className="mt-0.5 truncate font-bold text-[#115E59]">{liveSessions[0].title}</p>
                    <p className="text-[11.5px] text-[#0F766E]/90">{liveSessions[0].detail}</p>
                  </div>
                  <Link
                    to={liveSessions[0].roomHref}
                    onClick={onClose}
                    className="rp-focus inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#115E59]"
                  >
                    <Video className="h-3.5 w-3.5" />
                    {roleKey === 'Mentor' ? tr('Vào dạy') : tr('Tham gia')}
                  </Link>
                </div>
              </div>
            )}

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
                  <p className="rounded-xl border border-dashed border-rp-line bg-rp-bg-2/60 px-3 py-3 text-center text-xs text-rp-text-muted">
                    {tr('Không có lịch học hay hạn bài tập trong ngày này.')}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {selectedDayEvents.map((ev) => {
                      const toneMeta = getToneMeta(ev.tone);
                      return (
                        <li key={ev.id}>
                          <Link
                            to={ev.href || fullCalendarRoute}
                            onClick={onClose}
                            className="rp-focus flex items-center justify-between gap-2.5 rounded-xl border border-rp-line bg-rp-surface px-3 py-2 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/30"
                          >
                            <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', toneMeta.dot)} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-rp-text">{ev.title}</span>
                              <span className="block truncate text-[11.5px] text-rp-text-muted">
                                {ev.detail || ev.statusLabel}
                              </span>
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
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
                <CalendarDays className="mx-auto h-6 w-6 text-rp-brand-strong/75" />
                <p className="mt-2 font-semibold text-rp-text">{tr('Bạn chưa có lịch học sắp tới.')}</p>
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
                      {upcomingSessions.slice(0, 3).map((ev) => (
                        <li
                          key={ev.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-surface px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              to={ev.secondaryHref || ev.href || fullCalendarRoute}
                              onClick={onClose}
                              className="block truncate font-semibold text-rp-text hover:text-rp-brand-strong"
                            >
                              {ev.title}
                            </Link>
                            <p className="truncate text-[11.5px] text-rp-text-muted">
                              {formatVnDateTime(ev.scheduledAt)} · {ev.statusLabel}
                            </p>
                          </div>
                          {ev.canJoin ? (
                            <Link
                              to={ev.roomHref}
                              onClick={onClose}
                              className="shrink-0 rounded-lg bg-rp-brand-pressed px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-rp-brand-strong"
                            >
                              {tr('Vào phòng')}
                            </Link>
                          ) : (
                            <span
                              title={tr(ev.joinReason)}
                              className="shrink-0 rounded-lg bg-rp-muted px-2 py-1 text-[10.5px] font-medium text-rp-text-muted"
                            >
                              {tr('Mở trước 15p')}
                            </span>
                          )}
                        </li>
                      ))}
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
                              className="rp-focus flex items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-surface px-3 py-2 hover:border-rp-brand-border hover:bg-rp-brand-tint/25"
                            >
                              <BookCheck className="h-4 w-4 shrink-0 text-[#4F46E5]" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-rp-text">{hw.title}</span>
                                <span className="block truncate text-[11px] text-rp-text-muted">
                                  {hw.dueAt ? formatVnDateTime(hw.dueAt) : tr('Chưa đặt hạn')} · {tr(meta.label)}
                                </span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                {/* Today SRS Reminder (Learner - real queue only) */}
                {roleKey === 'Learner' && srsDueCount > 0 && (
                  <Link
                    to="/daily-srs"
                    onClick={onClose}
                    className="rp-focus flex items-center justify-between gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-[#065F46] hover:bg-[#D1FAE5]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Sparkles className="h-4 w-4 shrink-0 text-[#059669]" />
                      <span className="truncate font-semibold">
                        {trf('Ôn tập SRS hôm nay ({0} thẻ)', { 0: srsDueCount })}
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  </Link>
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
      <div className="flex items-center justify-between gap-2 border-t border-rp-line bg-rp-bg-2/70 px-4 py-2.5">
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
          className="rp-focus inline-flex items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rp-brand-strong"
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
  const calendar = useWorkspaceCalendar({ roleKey });

  const todayCount = calendar.summary.todayEvents.length;
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
          className="shadow-rp-xs"
          badge={triggerBadge}
        />
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={baseTitle}
          side="right"
        >
          <CalendarPopoverBody calendar={calendar} onClose={() => setDrawerOpen(false)} />
        </Drawer>
      </>
    );
  }

  return (
    <Popover
      label={baseTitle}
      align="end"
      panelClassName="w-[410px] max-w-[calc(100vw-24px)] overflow-hidden p-0"
      trigger={({ toggle, props }) => (
        <IconButton
          {...props}
          icon={CalendarDays}
          label={triggerAriaLabel}
          onClick={toggle}
          variant="outline"
          className="shadow-rp-xs"
          badge={triggerBadge}
        />
      )}
    >
      {({ close }) => <CalendarPopoverBody calendar={calendar} onClose={close} />}
    </Popover>
  );
}
