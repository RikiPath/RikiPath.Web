import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';

import SakuraCalendar from '@/features/scheduling/components/SakuraCalendar.jsx';
import {
  formatCleanCohortTitle,
  toVnDateKey,
  toVnTimeParts,
} from '@/features/scheduling/utils/calendarGeometry.js';
import { useMentorScheduleWorkspace } from '@/features/scheduling/hooks/useMentorScheduleWorkspace.js';
import { useNow } from '@/hooks/useNow.js';
import { backendUtcDate } from '@/utils/mentorSchedule.js';
import { ContextualErrorState, RefreshingIndicator, SakuraLoader, StaleDataBar } from '@/components/ui';
import { useLocale, currentIntlTag } from '@/locales/locale.js';
import { MentorShell } from '@/layouts';

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';

const SESSION_FILTERS = [
  { id: 'ALL', label: 'Tất cả', dot: 'bg-[#CE476D]' },
  { id: 'upcoming', label: 'Sắp diễn ra', dot: 'bg-[#CE476D]' },
  { id: 'completed', label: 'Đã hoàn thành', dot: 'bg-[#16A34A]' },
];

export default function WorkSchedule() {
  const { tr, trf, fmt } = useLocale();
  const { pathname } = useLocation();
  const nowMs = useNow();
  const [anchorKey, setAnchorKey] = useState(() => toVnDateKey(new Date()));
  const [sessionFilter, setSessionFilter] = useState('ALL');

  const workspace = useMentorScheduleWorkspace({ includeCalendarStatus: false });
  const {
    cohortsQuery,
    coursesQuery,
    cohortSessions,
    policy,
  } = workspace;

  const scheduleError = cohortsQuery.error || coursesQuery.error;
  const isInitialLoading = (cohortsQuery.isPending || coursesQuery.isPending)
    && !cohortsQuery.data
    && !coursesQuery.data;
  const isRefreshing = (cohortsQuery.isFetching || coursesQuery.isFetching) && !isInitialLoading;

  // Build actual scheduled/completed teaching sessions ONLY (never mix unbooked/pending/rejected availability slots)
  const teachingEvents = useMemo(() => {
    const list = [];
    for (const cs of cohortSessions) {
      if (!cs || cs.status === 'Cancelled' || cs.status === 'CancelledByMentor') continue;
      const startDate = backendUtcDate(cs.scheduledAt || cs.startTime);
      if (!startDate) continue;
      const mins = Number(cs.sessionMinutes) || policy?.sessionMinutes || 90;
      const endDate = backendUtcDate(cs.endsAt || cs.endTime) || new Date(startDate.getTime() + mins * 60000);
      const dk = toVnDateKey(startDate);
      const startParts = toVnTimeParts(startDate);
      const endParts = toVnTimeParts(endDate);
      const isCompleted = Boolean(cs.sessionCompleted || cs.status === 'Completed');
      const hasEndedWaitingConfirm = !isCompleted && endDate.getTime() <= nowMs;

      const roomMatch = cs.meetingUrl?.match(/\/meeting-room\/([0-9a-f-]+)/i);
      const cohortTitle = cs.cohortName || 'Lớp nhóm';
      const cleanTitle = formatCleanCohortTitle(cohortTitle, cs.sessionNumber);
      const sessionLabel = cs.totalSessions
        ? trf('Buổi {0}/{1}', { 0: cs.sessionNumber || 1, 1: cs.totalSessions })
        : trf('Buổi {0}', { 0: cs.sessionNumber || 1 });
      const cap = Number(cs.capacity || 0);
      const enrolled = Number(cs.enrolledCount ?? cs.learnerNames?.length ?? 0);
      const headcountLabel = cap > 0 ? trf('{0}/{1} học viên', { 0: enrolled, 1: cap }) : null;
      const learnersLabel = (cs.learnerNames || []).join(', ');
      const att = cs.attendanceSummary;
      const attendanceLabel = att && att.confirmedCount > 0
        ? trf('{0}/{1} có mặt', { 0: att.presentCount, 1: att.totalRecords || att.confirmedCount })
        : null;

      const statusText = isCompleted ? 'Đã hoàn thành' : 'Đã xếp lớp';
      const tone = isCompleted ? 'present' : 'session';
      const cardDetail = [
        headcountLabel,
        learnersLabel ? trf('HV: {0}', { 0: learnersLabel }) : null,
      ].filter(Boolean).join(' · ') || tr(statusText);

      const joinStartMs = startDate.getTime() - 15 * 60000;
      const joinEndMs = endDate.getTime() + 30 * 60000;
      const canJoinRoom = Boolean(roomMatch) && !isCompleted && nowMs >= joinStartMs && nowMs <= joinEndMs;
      const cohortHref = cs.cohortId ? `/mentor-study-courses/${cs.cohortId}/` : '/mentor-study-courses/';
      const roomHref = roomMatch ? `/meeting-room/${roomMatch[1]}` : null;

      list.push({
        id: `work-${cs.id}`,
        cohortId: cs.cohortId,
        sessionCompleted: isCompleted,
        isUpcoming: !isCompleted,
        dayKey: dk,
        startHour: startParts.hour,
        startMinute: startParts.minute,
        endHour: endParts.hour,
        endMinute: endParts.minute,
        detailTime: `${startParts.hhmm}–${endParts.hhmm}`,
        title: cleanTitle,
        fullTitle: `${cohortTitle} · ${sessionLabel}`,
        detail: cardDetail,
        statusLabel: statusText,
        tone,
        href: canJoinRoom && roomHref ? roomHref : cohortHref,
        hrefLabel: canJoinRoom && roomHref ? 'Vào phòng dạy' : 'Mở lớp phụ trách',
        secondaryHref: canJoinRoom && roomHref ? cohortHref : undefined,
        secondaryLabel: canJoinRoom && roomHref ? 'Quản lý lớp & điểm danh' : undefined,
        metaRows: [
          { label: 'Trạng thái', value: tr(statusText) },
          { label: 'Lớp học', value: cohortTitle },
          { label: 'Thứ tự buổi', value: sessionLabel },
          {
            label: 'Thời gian',
            value: `${startDate.toLocaleDateString(currentIntlTag(), { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })} · ${startParts.hhmm}–${endParts.hhmm} (${fmt.duration(mins)})`,
          },
          headcountLabel && { label: 'Sĩ số', value: headcountLabel },
          learnersLabel && { label: 'Học viên', value: learnersLabel },
          attendanceLabel && { label: 'Kết quả điểm danh', value: attendanceLabel },
          hasEndedWaitingConfirm && { label: 'Ghi chú', value: tr('Chờ xác nhận hoàn thành buổi học trong mục điểm danh lớp') },
        ].filter(Boolean),
        z: isCompleted ? 2 : 3,
      });
    }
    return list;
  }, [cohortSessions, policy?.sessionMinutes, nowMs, tr, trf, fmt]);

  const counts = useMemo(() => {
    let upcoming = 0;
    let completed = 0;
    for (const ev of teachingEvents) {
      if (ev.sessionCompleted) completed += 1;
      else upcoming += 1;
    }
    return { ALL: teachingEvents.length, upcoming, completed };
  }, [teachingEvents]);

  const visibleEvents = useMemo(() => {
    if (sessionFilter === 'upcoming') return teachingEvents.filter((ev) => !ev.sessionCompleted);
    if (sessionFilter === 'completed') return teachingEvents.filter((ev) => ev.sessionCompleted);
    return teachingEvents;
  }, [teachingEvents, sessionFilter]);

  const filterBar = (
    <div
      role="group"
      aria-label={tr('Lọc buổi giảng dạy')}
      className="inline-flex flex-wrap items-center rounded-xl border border-rp-line bg-rp-bg-2 p-0.5"
    >
      {SESSION_FILTERS.map((f) => {
        const active = sessionFilter === f.id;
        return (
          <button
            key={f.id}
            type="button"
            data-testid={`work-schedule-filter-${f.id}`}
            aria-pressed={active}
            onClick={() => setSessionFilter(f.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-all ${
              active
                ? 'bg-white text-rp-brand-strong shadow-2xs'
                : 'text-rp-text-muted hover:text-rp-text'
            }`}
          >
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />
            <span>{tr(f.label)}</span>
            <span className="rounded-full bg-rp-bg-2 px-1.5 py-px text-[10.5px] font-semibold tabular-nums text-rp-text-muted">
              {counts[f.id]}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Lịch làm việc')}>
      <div
        data-page="WorkSchedule"
        className="rp-container rp-cq pt-2.5 pb-1.5 text-rp-text space-y-2"
      >
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold tracking-tight text-rp-text">{tr('Lịch làm việc')}</h1>
            <p className="text-[12.5px] text-rp-text-muted">
              {tr('Theo dõi các buổi dạy chính thức đã xếp lớp (sắp diễn ra và đã hoàn thành).')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RefreshingIndicator active={isRefreshing} />
            <Link
              to="/mentor-shift-schedule/"
              className={`inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-3.5 text-[12px] font-semibold text-white hover:bg-rp-brand-strong ${focusClass}`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{tr('Đăng ký lịch dạy')}</span>
            </Link>
          </div>
        </header>

        {isInitialLoading ? (
          <SakuraLoader variant="section" context="calendar" label={tr('Đang tải lịch làm việc')} delay={160} />
        ) : scheduleError && teachingEvents.length === 0 ? (
          <div className="rounded-2xl border border-rp-line bg-white px-5">
            <ContextualErrorState
              error={scheduleError}
              title={tr('Không tải được lịch làm việc')}
              onRetry={() => {
                cohortsQuery.refetch();
                coursesQuery.refetch();
              }}
              retrying={isRefreshing}
            />
          </div>
        ) : (
          <>
            {scheduleError && (
              <StaleDataBar
                onRetry={() => {
                  cohortsQuery.refetch();
                  coursesQuery.refetch();
                }}
                retrying={isRefreshing}
              />
            )}

            <SakuraCalendar
              events={visibleEvents}
              anchorKey={anchorKey}
              onAnchorChange={setAnchorKey}
              onRefresh={() => {
                cohortsQuery.refetch();
                coursesQuery.refetch();
              }}
              refreshing={isRefreshing}
              showToneFilter={false}
              agendaSortSmart
              agendaShowAllDates
              toolbarExtra={filterBar}
              emptyTitle={
                sessionFilter === 'completed'
                  ? 'Chưa có buổi dạy nào được xác nhận hoàn thành.'
                  : sessionFilter === 'upcoming'
                    ? 'Hiện chưa có buổi dạy sắp diễn ra.'
                    : 'Bạn chưa có buổi dạy nào được xếp lớp.'
              }
              emptyDescription="Bạn có thể đăng ký thêm khung giờ trống trong mục Đăng ký lịch dạy."
            />
          </>
        )}
      </div>
    </MentorShell>
  );
}
