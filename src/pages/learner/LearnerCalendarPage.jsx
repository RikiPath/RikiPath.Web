import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  BookCheck,
  CalendarDays,
  Clock,
  Layers3,
  Sparkles,
  Video,
} from 'lucide-react';
import { LearnerShell } from '@/layouts';
import SakuraCalendar from '@/features/scheduling/components/SakuraCalendar.jsx';
import { CALENDAR_CATEGORIES, getCalendarCategoryMeta, getToneMeta, toVnDateKey, toVnTimeParts } from '@/features/scheduling/utils/calendarGeometry.js';
import { notificationDestination } from '@/features/notifications/utils/notificationDedupe.js';
import { useWorkspaceCalendar } from '@/features/calendar/hooks/useWorkspaceCalendar.js';
import { displayCourseTitle, homeworkStatusMeta } from '@/features/calendar/utils/calendarEventsModel.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';
import {
  Badge,
  Card,
  ContextualErrorState,
  EmptyState,
  RefreshButton,
  RefreshingIndicator,
  SakuraLoader,
  cx,
} from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';

export default function LearnerCalendarPage() {
  const { tr, trf } = useLocale();
  const [anchorKey, setAnchorKey] = useState(() => toVnDateKey(new Date()));
  const [selectedCohortFilter, setSelectedCohortFilter] = useState('ALL');

  const calendar = useWorkspaceCalendar({ roleKey: 'Learner', anchorKey });
  const {
    nowMs,
    events,
    courses,
    summary,
    srsState,
    srsDueCount,
    partialErrors,
    hardError,
    isLoading,
    isFetching,
    refetchAll,
  } = calendar;

  const cohortOptions = useMemo(() => {
    const active = courses.filter((c) => c && c.status !== 'Cancelled' && c.status !== 'Transferred');
    const nameCounts = new Map();
    active.forEach((c) => {
      const base = displayCourseTitle(c, tr('Lớp học nhóm'));
      nameCounts.set(base, (nameCounts.get(base) || 0) + 1);
    });
    const map = new Map();
    active.forEach((c) => {
      const key = c.cohortId ? `cohort-${c.cohortId}` : `course-${c.id}`;
      if (!map.has(key)) {
        const base = displayCourseTitle(c, tr('Lớp học nhóm'));
        const duplicateName = (nameCounts.get(base) || 0) > 1 && c.mentorName;
        map.set(key, {
          key,
          cohortId: c.cohortId,
          courseId: c.id,
          label: duplicateName ? `${base} (${c.mentorName})` : base,
        });
      }
    });
    return [...map.values()];
  }, [courses, tr]);

  const filteredEvents = useMemo(() => {
    if (selectedCohortFilter === 'ALL') return events;
    return events.filter((ev) => {
      if (ev.eventType === 'srs') return true;
      const evKey = ev.cohortId ? `cohort-${ev.cohortId}` : ev.courseId ? `course-${ev.courseId}` : null;
      return evKey === selectedCohortFilter;
    });
  }, [events, selectedCohortFilter]);

  const { todayKey, liveSessions, upcomingSessions, pendingHomeworks, scheduleNotifications = [] } = summary;

  const selectedDayGroups = useMemo(() => {
    const dayItems = filteredEvents.filter((ev) => ev.dayKey === anchorKey);
    return {
      total: dayItems.length,
      sessions: dayItems.filter((ev) => ev.eventType === 'session'),
      homeworks: dayItems.filter((ev) => ev.eventType === 'homework'),
      srs: dayItems.filter((ev) => ev.eventType === 'srs'),
      reminders: dayItems.filter((ev) => ev.eventType === 'reminder'),
    };
  }, [filteredEvents, anchorKey]);

  const anchorDateLabel = useMemo(() => {
    const formatted = String(anchorKey || '').split('-').reverse().join('/');
    return anchorKey === todayKey ? `${tr('Hôm nay')} (${formatted})` : formatted;
  }, [anchorKey, todayKey, tr]);

  return (
    <LearnerShell breadcrumb={tr('Lịch học')}>
      <div className="rp-container space-y-6 py-6 lg:py-8">
        <IllustratedPageHeader
          icon="calendar"
          tone="sky"
          eyebrow={tr('Học nhóm')}
          title={tr('Lịch học tập trung')}
          description={tr('Theo dõi toàn bộ buổi học lớp nhóm, hạn nộp bài tập và ôn tập SRS theo giờ Việt Nam (GMT+7).')}
          actions={
            !isLoading && !hardError && events.length > 0 ? (
              <RefreshButton
                size="md"
                onRefresh={refetchAll}
                refreshing={isFetching && !isLoading}
                disabled={isLoading}
              />
            ) : null
          }
        />

        {isFetching && !isLoading && (
          <div className="pointer-events-none sticky top-2 z-20 h-0 overflow-visible">
            <div className="flex justify-end">
              <div className="pointer-events-auto">
                <RefreshingIndicator active delay={60} label={tr('Đang đồng bộ')} />
              </div>
            </div>
          </div>
        )}

        {/* Partial Error Banner */}
        {partialErrors.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-warning/35 bg-rp-warning-bg/50 px-4 py-3 text-sm">
            <p className="font-medium text-rp-text">
              {trf('Chưa tải được phần dữ liệu: {0}. Các lịch khác vẫn hiển thị bình thường.', {
                0: partialErrors.map((e) => e.label).join(', '),
              })}
            </p>
            <button
              type="button"
              onClick={() => partialErrors.forEach((p) => p.retry())}
              className="rp-focus rounded-xl bg-rp-surface px-3 py-1.5 text-xs font-semibold text-rp-brand-strong shadow-rp-xs hover:bg-rp-brand-tint"
            >
              {tr('Tải lại phần lỗi')}
            </button>
          </div>
        )}

        {/* Unified 4-Category Legend & Class Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            data-testid="calendar-category-legend"
            className="flex flex-wrap items-center gap-2 text-xs font-semibold"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rp-cal-class-border bg-rp-cal-class-bg px-2.5 py-1 text-rp-cal-class-text">
              <span className="h-2 w-2 rounded-full bg-rp-cal-class" />
              <CalendarDays className="h-3.5 w-3.5 text-rp-cal-class" />
              {tr('Lớp học')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rp-cal-homework-border bg-rp-cal-homework-bg px-2.5 py-1 text-rp-cal-homework-text">
              <span className="h-2 w-2 rounded-full bg-rp-cal-homework" />
              <BookCheck className="h-3.5 w-3.5 text-rp-cal-homework" />
              {tr('Bài tập về nhà')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rp-cal-srs-border bg-rp-cal-srs-bg px-2.5 py-1 text-rp-cal-srs-text">
              <span className="h-2 w-2 rounded-full bg-rp-cal-srs" />
              <Layers3 className="h-3.5 w-3.5 text-rp-cal-srs" />
              {tr('Ôn tập')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rp-cal-reminder-border bg-rp-cal-reminder-bg px-2.5 py-1 text-rp-cal-reminder-text">
              <span className="h-2 w-2 rounded-full bg-rp-cal-reminder" />
              <BellRing className="h-3.5 w-3.5 text-rp-cal-reminder" />
              {tr('Nhắc nhở')}
            </span>
          </div>

          {cohortOptions.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-rp-text-muted">{tr('Lọc theo lớp:')}</span>
              <button
                type="button"
                onClick={() => setSelectedCohortFilter('ALL')}
                className={cx(
                  'rp-focus rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  selectedCohortFilter === 'ALL'
                    ? 'bg-rp-brand-pressed text-white'
                    : 'border border-rp-line bg-rp-surface text-rp-text-2 hover:border-rp-brand-border',
                )}
              >
                {tr('Tất cả lớp')}
              </button>
              {cohortOptions.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedCohortFilter(c.key)}
                  className={cx(
                    'rp-focus rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    selectedCohortFilter === c.key
                      ? 'bg-rp-brand-pressed text-white'
                      : 'border border-rp-line bg-rp-surface text-rp-text-2 hover:border-rp-brand-border',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Workspace Grid */}
        {isLoading ? (
          <Card className="p-8">
            <SakuraLoader context="data" label={tr('Đang tải lịch học thông minh...')} />
          </Card>
        ) : hardError ? (
          <Card className="p-6">
            <ContextualErrorState
              title={tr('Không thể tải lịch học lúc này')}
              description={tr('Kết nối tạm gián đoạn. Vui lòng thử tải lại dữ liệu lịch học.')}
              onRetry={refetchAll}
            />
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-2.5">
              {selectedCohortFilter !== 'ALL' && filteredEvents.length === 0 && (
                <div
                  data-testid="learner-calendar-empty-filter-hint"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line bg-[#FCFAFB] px-3.5 py-2 text-[12px]"
                >
                  <span className="font-medium text-rp-text-2">
                    {tr('Không có lịch học khớp với bộ lọc đang chọn.')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCohortFilter('ALL');
                    }}
                    className="rp-underline font-semibold text-rp-brand-strong"
                  >
                    {tr('Xóa bộ lọc')}
                  </button>
                </div>
              )}
              <SakuraCalendar
                events={filteredEvents}
                audience="learner"
                anchorKey={anchorKey}
                onAnchorChange={setAnchorKey}
                defaultView="month"
                emptyTitle={tr('Không có sự kiện nào trong khoảng thời gian này.')}
                emptyDescription={tr('Chọn tuần hoặc tháng khác, hoặc khám phá các lớp ôn luyện JLPT để bắt đầu lịch học của bạn.')}
              />
            </div>

            {/* Right Rail: Selected Day Details + SRS + Upcoming Action Queue */}
            <aside className="space-y-4">
              {liveSessions.length > 0 && (
                <Card className="border-l-[3.5px] border-rp-cal-class-border border-l-rp-cal-class bg-rp-cal-class-bg p-4 text-rp-cal-class-text">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rp-cal-class-text">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-rp-cal-class" />
                    {tr('Phòng học đang mở')}
                  </div>
                  <p className="mt-1.5 font-bold text-rp-cal-class-text">{liveSessions[0].title}</p>
                  <p className="mt-0.5 text-xs text-rp-cal-class-text/85">{liveSessions[0].detail}</p>
                  <Link
                    to={liveSessions[0].roomHref}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-rp-cal-class px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
                  >
                    <Video className="h-4 w-4" />
                    {tr('Vào phòng học ngay')}
                  </Link>
                </Card>
              )}

              {/* Selected Day Details (Lớp học · Bài tập · Ôn tập · Nhắc nhở) */}
              <Card className="p-4 space-y-3" data-testid="calendar-selected-day-details">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CalendarDays className="h-4 w-4 shrink-0 text-rp-brand-strong" />
                    <h2 className="truncate text-sm font-bold text-rp-text">
                      {trf('Chi tiết ngày {0}', { 0: anchorDateLabel })}
                    </h2>
                  </div>
                  <Badge tone="brand" size="sm" icon={false}>
                    {selectedDayGroups.total}
                  </Badge>
                </div>

                {selectedDayGroups.total === 0 ? (
                  <p className="rounded-xl border border-dashed border-rp-line bg-rp-bg-2/50 px-3 py-3 text-center text-xs text-rp-text-muted">
                    {tr('Không có lớp học, bài tập hay lịch ôn tập trong ngày này.')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayGroups.sessions.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rp-cal-class-text">
                          <span className="h-2 w-2 rounded-full bg-rp-cal-class" />
                          {tr('Lớp học')} ({selectedDayGroups.sessions.length})
                        </p>
                        <ul className="space-y-1.5">
                          {selectedDayGroups.sessions.map((ev) => {
                            const catMeta = getCalendarCategoryMeta(ev);
                            const toneMeta = getToneMeta(ev.tone);
                            return (
                              <li key={ev.id} className={cx('rounded-xl p-2.5 text-xs', catMeta.card)}>
                                <div className="flex items-start justify-between gap-2">
                                  <span className={cx('font-bold', ev.tone === 'cancelled' && 'line-through opacity-75')}>
                                    {ev.title}
                                  </span>
                                  <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10.5px] font-semibold', toneMeta.pill)}>
                                    <span className={cx('h-1.5 w-1.5 rounded-full', catMeta.dot)} />
                                    {tr(ev.statusLabel)}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11.5px] opacity-85">{ev.detail}</p>
                                {ev.href && (
                                  <div className="mt-2 flex justify-end">
                                    <Link
                                      to={ev.href}
                                      className="rp-focus inline-flex items-center gap-1 rounded-lg bg-rp-cal-class px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-95"
                                    >
                                      <span>{tr(ev.hrefLabel || 'Xem lịch lớp')}</span>
                                      <ArrowRight className="h-3 w-3" />
                                    </Link>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {selectedDayGroups.homeworks.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rp-cal-homework-text">
                          <span className="h-2 w-2 rounded-full bg-rp-cal-homework" />
                          {tr('Bài tập')} ({selectedDayGroups.homeworks.length})
                        </p>
                        <ul className="space-y-1.5">
                          {selectedDayGroups.homeworks.map((ev) => {
                            const catMeta = getCalendarCategoryMeta(ev);
                            return (
                              <li key={ev.id} className={cx('rounded-xl p-2.5 text-xs', catMeta.card)}>
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-bold">{ev.title}</span>
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rp-cal-homework-border bg-white/85 px-2 py-0.5 text-[10.5px] font-semibold text-rp-cal-homework-text">
                                    <span className={cx('h-1.5 w-1.5 rounded-full', catMeta.dot)} />
                                    {tr(ev.statusLabel)}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11.5px] opacity-85">
                                  {ev.scheduledAt ? formatVnDateTime(ev.scheduledAt) : ev.detail}
                                </p>
                                {ev.href && (
                                  <div className="mt-2 flex justify-end">
                                    <Link
                                      to={ev.href}
                                      className="rp-focus inline-flex items-center gap-1 rounded-lg bg-rp-cal-homework px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-95"
                                    >
                                      <BookCheck className="h-3 w-3" />
                                      <span>{tr(ev.hrefLabel || 'Mở bài tập')}</span>
                                    </Link>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {selectedDayGroups.srs.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rp-cal-srs-text">
                          <span className="h-2 w-2 rounded-full bg-rp-cal-srs" />
                          {tr('Ôn tập')}
                        </p>
                        {selectedDayGroups.srs.map((ev) => {
                          const catMeta = getCalendarCategoryMeta(ev);
                          return (
                            <div key={ev.id} className={cx('rounded-xl p-2.5 text-xs', catMeta.card)}>
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold">{ev.title}</span>
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rp-cal-srs-border bg-white/85 px-2 py-0.5 text-[10.5px] font-semibold text-rp-cal-srs-text">
                                  <span className={cx('h-1.5 w-1.5 rounded-full', catMeta.dot)} />
                                  {tr(ev.statusLabel)}
                                </span>
                              </div>
                              <p className="mt-1 text-[11.5px] opacity-85">{ev.detail}</p>
                              <div className="mt-2 flex items-center justify-end gap-2">
                                {ev.secondaryHref && (
                                  <Link
                                    to={ev.secondaryHref}
                                    className="rp-focus rounded-lg border border-rp-cal-srs-border bg-white/90 px-2 py-1 text-[11px] font-semibold text-rp-cal-srs-text hover:bg-white"
                                  >
                                    {tr(ev.secondaryLabel || 'Xem thẻ')}
                                  </Link>
                                )}
                                {ev.href && (
                                  <Link
                                    to={ev.href}
                                    className="rp-focus inline-flex items-center gap-1 rounded-lg bg-rp-cal-srs px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-95"
                                  >
                                    <span>{tr(ev.hrefLabel || 'Xem thẻ')}</span>
                                    <ArrowRight className="h-3 w-3" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedDayGroups.reminders.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rp-cal-reminder-text">
                          <span className="h-2 w-2 rounded-full bg-rp-cal-reminder" />
                          {tr('Nhắc nhở')} ({selectedDayGroups.reminders.length})
                        </p>
                        <ul className="space-y-1.5">
                          {selectedDayGroups.reminders.map((ev) => {
                            const catMeta = getCalendarCategoryMeta(ev);
                            return (
                              <li key={ev.id} className={cx('rounded-xl p-2.5 text-xs', catMeta.card)}>
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-bold">{tr(ev.title)}</span>
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rp-cal-reminder-border bg-white/85 px-2 py-0.5 text-[10.5px] font-semibold text-rp-cal-reminder-text">
                                    <span className={cx('h-1.5 w-1.5 rounded-full', catMeta.dot)} />
                                    {tr(ev.statusLabel || 'Nhắc nhở')}
                                  </span>
                                </div>
                                {ev.detail && <p className="mt-1 text-[11.5px] opacity-85">{tr(ev.detail)}</p>}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Authoritative SRS Summary Card — Yellow SRS Category (#D5A12F / #FFF8E7) */}
              <Card className="p-4 space-y-2.5" data-testid="calendar-srs-digest-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Layers3 className="h-4 w-4 text-rp-cal-srs" />
                    <h2 className="text-sm font-bold text-rp-text">{tr('Ôn tập hôm nay')}</h2>
                  </div>
                  <Link to="/daily-srs" className="text-xs font-semibold rp-link">
                    {tr('Mở SRS')}
                  </Link>
                </div>

                {srsState?.hasActiveSession && (srsState?.activeSessionPendingCount || 0) > 0 ? (
                  <div className="rounded-xl border border-l-[3.5px] border-rp-cal-srs-border border-l-rp-cal-srs bg-rp-cal-srs-bg p-3 space-y-2 text-rp-cal-srs-text">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-rp-cal-srs-text">
                        {tr('Tiếp tục ôn tập')}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-rp-cal-srs-border bg-white/85 px-2 py-0.5 text-[10.5px] font-semibold text-rp-cal-srs-text">
                        <span className="h-1.5 w-1.5 rounded-full bg-rp-cal-srs" />
                        {tr('Đang ôn')}
                      </span>
                    </div>
                    <p className="text-xs text-rp-cal-srs-text/85">
                      {trf('Còn {0} thẻ chưa hoàn thành', { 0: srsState.activeSessionPendingCount })}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <Link
                        to={srsState?.reviewHref || '/daily-srs'}
                        className="group rp-focus inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rp-cal-srs px-3 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:opacity-95 hover:shadow-rp-xs"
                      >
                        <span>{tr('Tiếp tục ôn')}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                      </Link>
                      <Link
                        to={srsState?.libraryHref || '/daily-srs/library/'}
                        className="rp-focus inline-flex items-center justify-center rounded-xl border border-rp-cal-srs-border bg-white px-3 py-1.5 text-xs font-semibold text-rp-cal-srs-text transition-colors hover:bg-[#FFEFCA]"
                      >
                        {tr('Xem thẻ')}
                      </Link>
                    </div>
                  </div>
                ) : srsDueCount > 0 ? (
                  <div className="rounded-xl border border-l-[3.5px] border-rp-cal-srs-border border-l-rp-cal-srs bg-rp-cal-srs-bg p-3 space-y-2 text-rp-cal-srs-text">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-rp-cal-srs-text">
                        {trf('{0} thẻ cần ôn', { 0: srsDueCount })}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-rp-cal-srs-border bg-white/85 px-2 py-0.5 text-[10.5px] font-semibold text-rp-cal-srs-text">
                        <span className="h-1.5 w-1.5 rounded-full bg-rp-cal-srs" />
                        {tr('Đến hạn')}
                      </span>
                    </div>
                    <p className="text-xs text-rp-cal-srs-text/85">
                      {(srsState?.reviewedTodayCount || 0) > 0
                        ? trf('Đã ôn {0} lượt hôm nay.', { 0: srsState.reviewedTodayCount })
                        : tr('Các thẻ đã đến hạn ôn tập trong ngày.')}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <Link
                        to={srsState?.reviewHref || '/daily-srs'}
                        className="group rp-focus inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rp-cal-srs px-3 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:opacity-95 hover:shadow-rp-xs"
                      >
                        <span>{tr('Ôn ngay')}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                      </Link>
                      <Link
                        to={srsState?.libraryHref || '/daily-srs/library/'}
                        className="rp-focus inline-flex items-center justify-center rounded-xl border border-rp-cal-srs-border bg-white px-3 py-1.5 text-xs font-semibold text-rp-cal-srs-text transition-colors hover:bg-[#FFEFCA]"
                      >
                        {tr('Xem thẻ')}
                      </Link>
                    </div>
                  </div>
                ) : srsState?.nextDueAtUtc ? (
                  <div className="rounded-xl border border-l-[3.5px] border-rp-cal-srs-border border-l-rp-cal-srs bg-rp-cal-srs-bg p-3 space-y-1.5 text-rp-cal-srs-text">
                    <p className="text-xs font-semibold text-rp-cal-srs-text">
                      {tr('Chưa có thẻ cần ôn lúc này')}
                    </p>
                    <p className="text-xs text-rp-cal-srs-text/80">
                      {trf('Ôn tiếp lúc {0} ({1})', {
                        0: toVnTimeParts(srsState.nextDueAtUtc).hhmm,
                        1: toVnDateKey(srsState.nextDueAtUtc).split('-').slice(1).reverse().join('/'),
                      })}
                    </p>
                    <Link
                      to={srsState?.libraryHref || '/daily-srs/library/'}
                      className="rp-focus rp-underline inline-flex items-center gap-1 text-xs font-semibold text-rp-cal-srs-text"
                    >
                      <span>{tr('Xem thẻ')}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-rp-text-muted">
                    {tr('Chưa có thẻ trong lịch ôn. Lưu từ bài học hoặc thêm thẻ mới tại Thẻ của tôi.')}
                  </p>
                )}
              </Card>

              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rp-cal-class" />
                    <h2 className="text-sm font-bold text-rp-text">{tr('Buổi học sắp diễn ra')}</h2>
                  </div>
                  <Badge tone="neutral" size="sm">GMT+7</Badge>
                </div>
                {upcomingSessions.length === 0 ? (
                  <EmptyState
                    variant="inline"
                    size="sm"
                    illustration="calendar"
                    title={tr('Không có buổi học nào trong 7 ngày tới.')}
                  />
                ) : (
                  <ul className="space-y-2.5">
                    {upcomingSessions.slice(0, 5).map((ev) => (
                      <li key={ev.id}>
                        <Link
                          to={ev.secondaryHref || '/my-courses'}
                          className={cx(
                            'group rp-focus flex items-center justify-between gap-2 rounded-xl p-2.5',
                            CALENDAR_CATEGORIES.class.card,
                            CALENDAR_CATEGORIES.class.hoverCard,
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-rp-cal-class-text">
                              {ev.title}
                            </span>
                            <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-rp-cal-class-text/80">
                              <Clock className="h-3 w-3 shrink-0 text-rp-cal-class" />
                              {formatVnDateTime(ev.scheduledAt)} · {ev.statusLabel}
                            </p>
                          </div>
                          <span aria-hidden="true" className={CALENDAR_CATEGORIES.class.arrowChip}>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rp-cal-homework" />
                    <h2 className="text-sm font-bold text-rp-text">{tr('Bài tập chưa nộp')}</h2>
                  </div>
                  <Link to="/homework" className="text-xs font-semibold rp-link">
                    {tr('Tất cả')}
                  </Link>
                </div>
                {pendingHomeworks.length === 0 ? (
                  <EmptyState
                    variant="inline"
                    size="sm"
                    illustration="done"
                    title={tr('Bạn đã hoàn thành toàn bộ bài tập hiện có.')}
                  />
                ) : (
                  <ul className="space-y-2">
                    {pendingHomeworks.slice(0, 4).map((hw) => {
                      const meta = homeworkStatusMeta(hw, nowMs);
                      return (
                        <li key={hw.id}>
                          <Link
                            to={hw.cohortId ? `/homework/?cohortId=${hw.cohortId}` : '/homework'}
                            className={cx(
                              'group rp-focus block rounded-xl p-2.5',
                              CALENDAR_CATEGORIES.homework.card,
                              CALENDAR_CATEGORIES.homework.hoverCard,
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] font-semibold text-rp-cal-homework-text">{hw.title}</span>
                              <span className="inline-flex shrink-0 items-center rounded-full border border-rp-cal-homework-border bg-white/85 px-2 py-0.5 text-[10.5px] font-semibold text-rp-cal-homework-text">
                                {tr(meta.label)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11.5px] text-rp-cal-homework-text/80">
                              {hw.dueAt ? formatVnDateTime(hw.dueAt) : tr('Chưa đặt hạn')}
                            </p>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              {scheduleNotifications.length > 0 && (
                <Card className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rp-cal-reminder" />
                      <h2 className="text-sm font-bold text-rp-text">{tr('Thông báo lịch học')}</h2>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {scheduleNotifications.slice(0, 3).map((n) => {
                      const dest = notificationDestination(n.linkUrl) || '/calendar';
                      return (
                        <li key={n.id}>
                          <Link
                            to={dest}
                            className={cx(
                              'group rp-focus flex items-start gap-2 rounded-xl p-2.5 text-xs',
                              CALENDAR_CATEGORIES.reminder.card,
                              CALENDAR_CATEGORIES.reminder.hoverCard,
                            )}
                          >
                            <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-cal-reminder" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{tr(n.title)}</p>
                              {n.message && <p className="mt-0.5 line-clamp-2 opacity-85">{tr(n.message)}</p>}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              )}

              <Card className="border-dashed bg-rp-bg-2/60 p-4 text-xs text-rp-text-muted">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-rp-brand-strong" />
                  <p className="leading-5">
                    {tr('Lịch cá nhân tự động tổng hợp buổi học nhóm, bài tập theo lớp và hàng đợi ôn tập SRS hôm nay.')}
                  </p>
                </div>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </LearnerShell>
  );
}
