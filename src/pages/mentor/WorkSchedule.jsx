import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';

import SakuraCalendar from '@/features/scheduling/components/SakuraCalendar.jsx';
import {
  ActiveScheduleFilterBar,
  ScheduleMoreFiltersPopover,
  StatusDotListbox,
} from '@/features/scheduling/components/ScheduleFilterControls.jsx';
import {
  formatCleanCohortTitle,
  getViewDateRange,
  shiftDateKey,
  toVnDateKey,
  toVnTimeParts,
} from '@/features/scheduling/utils/calendarGeometry.js';
import {
  clockFromMinutes,
  minutesFromClock,
} from '@/features/scheduling/utils/slotPlannerModel.js';
import { useMentorScheduleWorkspace } from '@/features/scheduling/hooks/useMentorScheduleWorkspace.js';
import {
  TEACHING_SESSION_STATUSES,
  resolveTeachingSessionStatus,
} from '@/features/scheduling/utils/teachingLifecycleModel.js';
import { useNow } from '@/hooks/useNow.js';
import { useAuth } from '@/app/auth/authContext.js';
import { backendUtcDate } from '@/utils/mentorSchedule.js';
import { Banner, Button, ContextualErrorState, PageContainer, SakuraLoader, StaleDataBar } from '@/components/ui';
import { useLocale, currentIntlTag } from '@/locales/locale.js';
import { AdminShell, MentorShell } from '@/layouts';

const WORK_STATUS_OPTIONS = Object.freeze(
  TEACHING_SESSION_STATUSES
    .filter((f) => f.id !== 'cancelled')
    .map((f) => ({
      id: f.id,
      label: f.id === 'ALL' ? 'Tất cả trạng thái' : f.label,
      dotClass: f.dot,
    }))
);

const WORK_SORT_OPTIONS = Object.freeze([
  { id: 'smart', label: 'Ưu tiên sắp diễn ra & gần nhất' },
  { id: 'nearest', label: 'Ngày gần nhất trước' },
  { id: 'startTime', label: 'Theo giờ bắt đầu trong ngày' },
  { id: 'jlpt', label: 'Theo cấp độ JLPT' },
  { id: 'status', label: 'Theo trạng thái' },
  { id: 'newest', label: 'Mới nhất trước' },
  { id: 'oldest', label: 'Cũ nhất trước' },
]);

function extractJlptLevelCode(cs, title) {
  const direct = String(cs?.level || cs?.jlptLevelCode || cs?.certificateLevelCode || '').trim().toUpperCase();
  if (/^N[1-5]$/.test(direct)) return direct;
  const match = String(title || '').match(/\b(N[1-5])\b/i);
  return match ? match[1].toUpperCase() : null;
}

function jlptOrderRank(code) {
  switch (String(code || '').toUpperCase()) {
    case 'N5': return 1;
    case 'N4': return 2;
    case 'N3': return 3;
    case 'N2': return 4;
    case 'N1': return 5;
    default: return 99;
  }
}

function workStatusOrderRank(id) {
  switch (id) {
    case 'live': return 0;
    case 'upcoming': return 1;
    case 'rescheduled': return 2;
    case 'completed': return 3;
    default: return 4;
  }
}

export default function WorkSchedule() {
  const { tr, trf, fmt } = useLocale();
  const { pathname } = useLocation();
  const { id: targetBookingId } = useParams();
  const { user } = useAuth();
  const isAdminViewer = String(user?.role || '').toLowerCase() === 'admin';
  const nowMs = useNow();
  const todayKey = useMemo(() => toVnDateKey(new Date(nowMs)), [nowMs]);
  const [anchorKey, setAnchorKey] = useState(() => toVnDateKey(new Date()));
  const [calendarView, setCalendarView] = useState('week');

  // Synchronized Work Schedule filters (Status + Search + JLPT + Date Range + Time Range + Sort)
  const [sessionFilter, setSessionFilter] = useState('ALL');
  const [jlptLevelFilter, setJlptLevelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState('view'); // 'view' | 'upcoming' | 'past' | 'today' | 'week' | 'month' | 'custom'
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [timeFilterCode, setTimeFilterCode] = useState('ALL'); // 'ALL' | daypart.code | 'CUSTOM'
  const [customStartTime, setCustomStartTime] = useState('07:00');
  const [customEndTime, setCustomEndTime] = useState('22:00');
  const [sortBy, setSortBy] = useState('smart');
  const [sortDirection, setSortDirection] = useState('asc');

  const isListView = calendarView === 'agenda';
  const handleCalendarViewChange = useCallback((nextView) => {
    setCalendarView(nextView);
    if (nextView !== 'agenda' && (dateFilterMode === 'upcoming' || dateFilterMode === 'past')) {
      setDateFilterMode('view');
    }
  }, [dateFilterMode]);

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

  // Build actual scheduled/completed/rescheduled teaching sessions ONLY
  // (never mix unbooked/pending/rejected registration availability slots or cancelled sessions)
  const teachingEvents = useMemo(() => {
    const list = [];
    for (const cs of cohortSessions) {
      if (!cs) continue;
      const startDate = backendUtcDate(cs.scheduledAt || cs.startTime);
      if (!startDate) continue;
      const mins = Number(cs.sessionMinutes) || policy?.sessionMinutes || 90;
      const endDate = backendUtcDate(cs.endsAt || cs.endTime) || new Date(startDate.getTime() + mins * 60000);
      const dk = toVnDateKey(startDate);
      const startParts = toVnTimeParts(startDate);
      const endParts = toVnTimeParts(endDate);
      const lifecycle = resolveTeachingSessionStatus({
        status: cs.status,
        cohortStatus: cs.cohortStatus,
        sessionCompleted: Boolean(cs.sessionCompleted),
        wasRescheduled: Boolean(cs.wasRescheduled || cs.rescheduled),
        startMs: startDate.getTime(),
        endMs: endDate.getTime(),
        nowMs,
      });
      if (lifecycle.id === 'cancelled') continue;
      const isCompleted = lifecycle.isCompleted;
      const hasEndedWaitingConfirm = lifecycle.awaitingConfirmation;

      const roomMatch = cs.meetingUrl?.match(/\/meeting-room\/([0-9a-f-]+)/i);
      const cohortTitle = cs.cohortName || tr('Lớp nhóm');
      const jlptLevelCode = extractJlptLevelCode(cs, cohortTitle);
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

      const statusText = lifecycle.label;
      const tone = lifecycle.tone;
      const cardDetail = [
        headcountLabel,
        learnersLabel ? trf('Học viên: {0}', { 0: learnersLabel }) : null,
      ].filter(Boolean).join(' · ') || tr(statusText);

      const joinStartMs = startDate.getTime() - 15 * 60000;
      const joinEndMs = endDate.getTime() + 30 * 60000;
      const canJoinRoom = Boolean(roomMatch) && !isCompleted && nowMs >= joinStartMs && nowMs <= joinEndMs;
      const cohortHref = cs.cohortId ? `/mentor-study-courses/${cs.cohortId}/` : '/mentor-study-courses/';
      const roomHref = roomMatch ? `/meeting-room/${roomMatch[1]}` : null;

      list.push({
        id: `work-${cs.id}`,
        cohortId: cs.cohortId,
        jlptLevelCode,
        cohortName: cohortTitle,
        learnersLabel,
        startMs: startDate.getTime(),
        sessionLifecycleId: lifecycle.id,
        sessionCompleted: isCompleted,
        isUpcoming: lifecycle.id === 'upcoming' || lifecycle.id === 'live',
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
          jlptLevelCode && { label: 'Cấp độ JLPT', value: jlptLevelCode },
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

  const effectiveDateRange = useMemo(() => {
    if (dateFilterMode === 'upcoming') {
      return { startKey: todayKey, endKey: '' };
    }
    if (dateFilterMode === 'past') {
      return { startKey: '', endKey: shiftDateKey(todayKey, -1) };
    }
    if (dateFilterMode === 'today') {
      return { startKey: todayKey, endKey: todayKey };
    }
    if (dateFilterMode === 'week') {
      const refKey = isListView ? todayKey : anchorKey;
      const r = getViewDateRange(refKey, 'week');
      return { startKey: r.startKey, endKey: r.endKey };
    }
    if (dateFilterMode === 'month') {
      const refKey = isListView ? todayKey : anchorKey;
      const r = getViewDateRange(refKey, 'month');
      return { startKey: r.startKey, endKey: r.endKey };
    }
    if (dateFilterMode === 'custom') {
      return { startKey: customFromDate || '', endKey: customToDate || '' };
    }
    return null;
  }, [dateFilterMode, todayKey, isListView, anchorKey, customFromDate, customToDate]);

  const effectiveTimeRange = useMemo(() => {
    if (!timeFilterCode || timeFilterCode === 'ALL') return null;
    if (timeFilterCode === 'CUSTOM') {
      const s = minutesFromClock(customStartTime);
      const e = minutesFromClock(customEndTime);
      if (e <= s) return null;
      return { startMin: s, endMin: e, label: `${customStartTime}–${customEndTime}` };
    }
    const dayparts = policy?.dayparts || [
      { code: 'Morning', label: 'Buổi sáng', localStart: '07:00', localEnd: '11:00', startMin: 420, endMin: 660 },
      { code: 'Noon', label: 'Buổi trưa', localStart: '11:00', localEnd: '14:00', startMin: 660, endMin: 840 },
      { code: 'Afternoon', label: 'Buổi chiều', localStart: '13:00', localEnd: '18:00', startMin: 780, endMin: 1080 },
      { code: 'Evening', label: 'Buổi tối', localStart: '18:00', localEnd: '22:00', startMin: 1080, endMin: 1320 },
    ];
    const dp = dayparts.find((d) => d.code === timeFilterCode);
    if (!dp) return null;
    const sClock = dp.localStart || clockFromMinutes(dp.startMin);
    const eClock = dp.localEnd || clockFromMinutes(dp.endMin);
    return {
      startMin: dp.startMin ?? minutesFromClock(sClock),
      endMin: dp.endMin ?? minutesFromClock(eClock),
      label: `${tr(dp.label)} (${sClock}–${eClock})`,
    };
  }, [timeFilterCode, customStartTime, customEndTime, policy?.dayparts, tr]);

  const matchesNonStatusFilters = useCallback((ev) => {
    if (jlptLevelFilter !== 'ALL') {
      if (String(ev.jlptLevelCode || '').toUpperCase() !== jlptLevelFilter) return false;
    }
    if (effectiveDateRange?.startKey && ev.dayKey < effectiveDateRange.startKey) return false;
    if (effectiveDateRange?.endKey && ev.dayKey > effectiveDateRange.endKey) return false;
    if (effectiveTimeRange && (effectiveTimeRange.startMin != null || effectiveTimeRange.endMin != null)) {
      const fStart = effectiveTimeRange.startMin ?? 0;
      const fEnd = effectiveTimeRange.endMin ?? 24 * 60;
      const evStart = (ev.startHour || 0) * 60 + (ev.startMinute || 0);
      let evEnd = (ev.endHour || 0) * 60 + (ev.endMinute || 0);
      if (evEnd <= evStart) evEnd = Math.min(24 * 60, evStart + 90);
      if (!(evStart < fEnd && evEnd > fStart)) return false;
    }
    const q = String(searchQuery || '').trim().toLowerCase();
    if (q) {
      const hay = `${ev.cohortName || ''} ${ev.title || ''} ${ev.fullTitle || ''} ${ev.jlptLevelCode || ''} ${ev.learnersLabel || ''} ${ev.dayKey}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }, [jlptLevelFilter, effectiveDateRange, effectiveTimeRange, searchQuery]);

  const nonStatusFilteredEvents = useMemo(
    () => teachingEvents.filter(matchesNonStatusFilters),
    [teachingEvents, matchesNonStatusFilters]
  );

  const counts = useMemo(() => {
    const out = { ALL: nonStatusFilteredEvents.length, upcoming: 0, live: 0, completed: 0, rescheduled: 0 };
    for (const ev of nonStatusFilteredEvents) {
      if (out[ev.sessionLifecycleId] != null) out[ev.sessionLifecycleId] += 1;
    }
    return out;
  }, [nonStatusFilteredEvents]);

  const visibleEvents = useMemo(() => {
    const filtered = sessionFilter === 'ALL'
      ? nonStatusFilteredEvents
      : nonStatusFilteredEvents.filter((ev) => ev.sessionLifecycleId === sessionFilter);

    const dir = sortDirection === 'desc' ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const ta = a.startMs || 0;
      const tb = b.startMs || 0;
      const ma = (a.startHour || 0) * 60 + (a.startMinute || 0);
      const mb = (b.startHour || 0) * 60 + (b.startMinute || 0);

      if (sortBy === 'nearest') {
        if (ta !== tb) return (ta - tb) * dir;
        return String(a.id).localeCompare(String(b.id));
      }
      if (sortBy === 'startTime') {
        if (ma !== mb) return (ma - mb) * dir;
        if (ta !== tb) return ta - tb;
        return String(a.id).localeCompare(String(b.id));
      }
      if (sortBy === 'jlpt') {
        const jDiff = (jlptOrderRank(a.jlptLevelCode) - jlptOrderRank(b.jlptLevelCode)) * dir;
        if (jDiff !== 0) return jDiff;
        if (ta !== tb) return ta - tb;
        return String(a.id).localeCompare(String(b.id));
      }
      if (sortBy === 'status') {
        const sDiff = (workStatusOrderRank(a.sessionLifecycleId) - workStatusOrderRank(b.sessionLifecycleId)) * dir;
        if (sDiff !== 0) return sDiff;
        if (ta !== tb) return ta - tb;
        return String(a.id).localeCompare(String(b.id));
      }
      if (sortBy === 'newest') {
        if (ta !== tb) return tb - ta;
        return String(b.id).localeCompare(String(a.id));
      }
      if (sortBy === 'oldest') {
        if (ta !== tb) return ta - tb;
        return String(a.id).localeCompare(String(b.id));
      }

      // Default 'smart': live/upcoming nearest first, then completed/past most recent first
      const rankA = a.sessionLifecycleId === 'live' ? 0 : a.sessionLifecycleId === 'upcoming' ? 1 : a.sessionLifecycleId === 'rescheduled' ? 2 : 3;
      const rankB = b.sessionLifecycleId === 'live' ? 0 : b.sessionLifecycleId === 'upcoming' ? 1 : b.sessionLifecycleId === 'rescheduled' ? 2 : 3;
      if (rankA !== rankB) return rankA - rankB;
      if (rankA <= 2) return ta - tb;
      return tb - ta;
    });
  }, [nonStatusFilteredEvents, sessionFilter, sortBy, sortDirection]);

  const activeExtraFilterCount = useMemo(() => {
    let c = 0;
    if (jlptLevelFilter !== 'ALL') c += 1;
    if (String(searchQuery || '').trim()) c += 1;
    if (dateFilterMode !== 'view') c += 1;
    if (timeFilterCode !== 'ALL') c += 1;
    return c;
  }, [jlptLevelFilter, searchQuery, dateFilterMode, timeFilterCode]);

  const resetAllFilters = useCallback(() => {
    setSessionFilter('ALL');
    setJlptLevelFilter('ALL');
    setSearchQuery('');
    setDateFilterMode('view');
    setCustomFromDate('');
    setCustomToDate('');
    setTimeFilterCode('ALL');
    setSortBy('smart');
    setSortDirection('asc');
  }, []);

  const toolbarFilterControls = (
    <>
      <StatusDotListbox
        value={sessionFilter}
        options={WORK_STATUS_OPTIONS}
        onChange={setSessionFilter}
        countsByStatus={counts}
      />
      <ScheduleMoreFiltersPopover
        policy={policy}
        displayMode={isListView ? 'list' : 'calendar'}
        statusFilter={sessionFilter}
        statusOptions={WORK_STATUS_OPTIONS}
        countsByStatus={counts}
        onStatusChange={setSessionFilter}
        jlptLevelFilter={jlptLevelFilter}
        onJlptLevelChange={setJlptLevelFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFilterMode={dateFilterMode}
        customFromDate={customFromDate}
        customToDate={customToDate}
        onDateFilterChange={({ mode, from, to }) => {
          setDateFilterMode(mode);
          setCustomFromDate(from ?? '');
          setCustomToDate(to ?? '');
          if (mode === 'today' && !isListView) setAnchorKey(todayKey);
        }}
        timeFilterCode={timeFilterCode}
        customStartTime={customStartTime}
        customEndTime={customEndTime}
        onTimeFilterChange={({ code, start, end }) => {
          setTimeFilterCode(code);
          if (start) setCustomStartTime(start);
          if (end) setCustomEndTime(end);
        }}
        sortBy={sortBy}
        sortDirection={sortDirection}
        sortOptions={WORK_SORT_OPTIONS}
        onSortChange={({ sortBy: nextSort, sortDirection: nextDir }) => {
          setSortBy(nextSort);
          setSortDirection(nextDir);
        }}
        onResetAll={resetAllFilters}
        activeFilterCount={activeExtraFilterCount}
      />
    </>
  );

  const activeFilterBar = (
    <ActiveScheduleFilterBar
      statusFilter={sessionFilter}
      statusOptions={WORK_STATUS_OPTIONS}
      onClearStatus={() => setSessionFilter('ALL')}
      jlptLevelFilter={jlptLevelFilter}
      onClearJlptLevel={() => setJlptLevelFilter('ALL')}
      searchQuery={searchQuery}
      onClearSearch={() => setSearchQuery('')}
      dateFilterMode={dateFilterMode}
      customFromDate={customFromDate}
      customToDate={customToDate}
      onClearDate={() => {
        setDateFilterMode('view');
        setCustomFromDate('');
        setCustomToDate('');
      }}
      timeFilterCode={timeFilterCode}
      timeFilterLabel={effectiveTimeRange?.label || ''}
      onClearTime={() => setTimeFilterCode('ALL')}
      onResetAll={resetAllFilters}
      totalFilteredCount={visibleEvents.length}
    />
  );

  const [resolvedTargetId, setResolvedTargetId] = useState(null);
  if (targetBookingId && resolvedTargetId !== targetBookingId) {
    const match = teachingEvents.find(
      (ev) => String(ev.id) === `work-${targetBookingId}` || String(ev.cohortId) === String(targetBookingId),
    );
    if (match?.dayKey) {
      setAnchorKey(match.dayKey);
      setResolvedTargetId(targetBookingId);
    }
  }

  const Shell = isAdminViewer ? AdminShell : MentorShell;
  if (isAdminViewer) {
    return (
      <Shell pathname={pathname} breadcrumb={tr('Lịch làm việc')}>
        <div className="rp-container py-6">
          <Banner
            tone="info"
            title={tr('Trang này dành riêng cho lịch dạy cá nhân của Giáo viên')}
            actions={(
              <Button as={Link} to="/admin/mentor-schedules/" variant="primary" size="sm">
                {tr('Mở điều phối lịch dạy Giáo viên')}
              </Button>
            )}
          >
            {tr('Tài khoản quản trị viên vui lòng xem và điều phối lịch giảng dạy tại khu vực Quản trị đội ngũ Giáo viên.')}
          </Banner>
        </div>
      </Shell>
    );
  }

  const hasActiveFilters = sessionFilter !== 'ALL' || activeExtraFilterCount > 0;

  return (
    <Shell pathname={pathname} breadcrumb={tr('Lịch làm việc')}>
      <PageContainer
        as="div"
        data-page="WorkSchedule"
        width="default"
        paddedY={false}
        className="pt-2.5 pb-1.5 text-rp-text space-y-2"
      >
        <h1 className="sr-only">{tr('Lịch làm việc')}</h1>

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
              view={calendarView}
              onViewChange={handleCalendarViewChange}
              onRefresh={() => Promise.all([
                cohortsQuery.refetch({ cancelRefetch: true }),
                coursesQuery.refetch({ cancelRefetch: true }),
              ])}
              refreshing={isRefreshing}
              showToneFilter={false}
              agendaSortSmart={sortBy === 'smart'}
              agendaPreserveOrder
              agendaShowAllDates
              headerTopRight={(
                <Button as={Link} to="/mentor-shift-schedule/" variant="primary" size="sm" icon={CalendarDays}>
                  {tr('Đăng ký lịch dạy')}
                </Button>
              )}
              toolbarExtra={toolbarFilterControls}
              belowToolbar={activeFilterBar}
              emptyTitle={
                hasActiveFilters
                  ? 'Không có buổi dạy nào khớp bộ lọc hiện tại.'
                  : 'Bạn chưa có buổi dạy nào được xếp lớp.'
              }
              emptyDescription={
                hasActiveFilters
                  ? 'Hãy điều chỉnh hoặc xóa bộ lọc để xem toàn bộ lịch giảng dạy của bạn.'
                  : 'Bạn có thể đăng ký thêm khung giờ trống trong mục Đăng ký lịch dạy.'
              }
            />
          </>
        )}
      </PageContainer>
    </Shell>
  );
}
