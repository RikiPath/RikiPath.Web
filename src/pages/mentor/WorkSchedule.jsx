import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
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
import { WORK_SCHEDULE_STATUS_OPTIONS } from '@/features/scheduling/utils/teachingLifecycleModel.js';
import { useNow } from '@/hooks/useNow.js';
import { useAuth } from '@/app/auth/authContext.js';
import { backendUtcDate } from '@/utils/mentorSchedule.js';
import { Banner, Button, ContextualErrorState, PageContainer, SakuraLoader, StaleDataBar } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { AdminShell, MentorShell } from '@/layouts';

const WORK_STATUS_OPTIONS = Object.freeze(
  WORK_SCHEDULE_STATUS_OPTIONS.map((f) => ({
    id: f.id,
    label: f.label,
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
    case 'cancelled': return 4;
    default: return 5;
  }
}

function formatDayKeyDdMmYyyy(dayKey) {
  const parts = String(dayKey || '').split('-');
  if (parts.length !== 3) return dayKey || '';
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function WorkSchedule() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const { id: targetBookingId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetCohortParam = searchParams.get('cohortId');
  const { user } = useAuth();
  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  const isAdminViewer = normalizedRole === 'admin';
  const isMentorViewer = normalizedRole === 'mentor';
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

  const workspace = useMentorScheduleWorkspace({
    includeCalendarStatus: false,
    includeAvailability: false,
    includeHistoricalWorkStatuses: true,
    enabled: isMentorViewer,
  });
  const {
    cohortsQuery,
    coursesQuery,
    workScheduleSessions,
    policy,
  } = workspace;

  const scheduleError = cohortsQuery.error || coursesQuery.error;
  const isInitialLoading = isMentorViewer
    && (cohortsQuery.isPending || coursesQuery.isPending)
    && !cohortsQuery.data
    && !coursesQuery.data;
  const isRefreshing = isMentorViewer && (cohortsQuery.isFetching || coursesQuery.isFetching) && !isInitialLoading;

  // Official teaching sessions only (eligible approved classes after enrollment close with >= 1 confirmed learner)
  const teachingEvents = useMemo(() => {
    const list = [];
    for (const cs of workScheduleSessions) {
      if (!cs || !cs.workStatus) continue;
      const startDate = backendUtcDate(cs.scheduledAt || cs.startTime);
      if (!startDate) continue;
      const mins = Number(cs.sessionMinutes) || policy?.sessionMinutes || 90;
      const endDate = backendUtcDate(cs.endTime || cs.endsAt) || new Date(startDate.getTime() + mins * 60000);
      const dk = toVnDateKey(startDate);
      const startParts = toVnTimeParts(startDate);
      const endParts = toVnTimeParts(endDate);
      const workStatus = cs.workStatus;
      const isCompleted = workStatus.isCompleted;

      const cohortTitle = cs.cohortName || tr('Lớp nhóm');
      const jlptLevelCode = extractJlptLevelCode(cs, cohortTitle);
      const cleanTitle = cs.isHistoricalRescheduled
        ? formatCleanCohortTitle(cohortTitle, null)
        : formatCleanCohortTitle(cohortTitle, cs.sessionNumber);
      const sessionLabel = cs.sessionNumber
        ? (cs.totalSessions
          ? trf('Buổi {0}/{1}', { 0: cs.sessionNumber, 1: cs.totalSessions })
          : trf('Buổi {0}', { 0: cs.sessionNumber }))
        : tr('Lịch sử đã đổi lịch');
      const cap = Number(cs.capacity || 0);
      const enrolled = Number(cs.confirmedEnrolledCount ?? cs.enrolledCount ?? 0);
      const headcountLabel = cap > 0
        ? trf('{0}/{1} học viên', { 0: enrolled, 1: cap })
        : trf('{0} học viên', { 0: enrolled });
      const learnersLabel = (cs.learnerNames || []).join(', ');
      const att = cs.attendanceSummary;
      const attendanceLabel = isCompleted && att && att.confirmedCount > 0
        ? trf('{0}/{1} có mặt', { 0: att.presentCount, 1: att.totalRecords || att.confirmedCount })
        : null;

      const timeRange = `${startParts.hhmm}–${endParts.hhmm}`;
      const statusText = workStatus.label;
      const cohortHref = cs.cohortId ? `/mentor-study-courses/${cs.cohortId}/` : '/mentor-study-courses/';
      const roomHref = cs.roomHref || null;

      let primaryHref = cohortHref;
      let primaryLabel = 'Xem chi tiết lớp';
      let secondaryHref;
      let secondaryLabel;

      if (workStatus.id === 'live' && roomHref) {
        primaryHref = roomHref;
        primaryLabel = 'Vào phòng học';
        secondaryHref = cohortHref;
        secondaryLabel = 'Xem chi tiết lớp';
      } else if (workStatus.id === 'upcoming' && cs.canJoin && roomHref) {
        primaryHref = roomHref;
        primaryLabel = 'Tham gia phòng học';
        secondaryHref = cohortHref;
        secondaryLabel = 'Xem chi tiết lớp';
      } else if (workStatus.id === 'completed' && attendanceLabel) {
        secondaryHref = `${cohortHref}?tab=sessions`;
        secondaryLabel = 'Kết quả điểm danh';
      }

      const detailSummaryText = workStatus.id === 'rescheduled'
        ? tr('Khung giờ cũ đã giải phóng')
        : workStatus.id === 'cancelled'
          ? tr('Buổi học đã hủy · đã giải phóng lịch')
          : headcountLabel;

      list.push({
        id: `work-${cs.id}`,
        availabilityId: cs.availabilityId ?? null,
        cohortId: cs.cohortId,
        jlptLevelCode,
        cohortName: cohortTitle,
        learnersLabel,
        startMs: startDate.getTime(),
        sessionLifecycleId: workStatus.id,
        sessionCompleted: isCompleted,
        isUpcoming: workStatus.id === 'upcoming' || workStatus.id === 'live',
        eventType: 'session',
        minimalDetail: true,
        dayKey: dk,
        startHour: startParts.hour,
        startMinute: startParts.minute,
        endHour: endParts.hour,
        endMinute: endParts.minute,
        detailTime: timeRange,
        title: cleanTitle,
        fullTitle: cleanTitle,
        detail: detailSummaryText,
        tooltip: `${cleanTitle} · ${timeRange} · ${detailSummaryText} · ${tr(statusText)}`,
        statusLabel: statusText,
        tone: workStatus.tone,
        href: primaryHref,
        hrefLabel: primaryLabel,
        secondaryHref,
        secondaryLabel,
        metaRows: [
          { label: 'Tên lớp', value: cohortTitle },
          jlptLevelCode && { label: 'Cấp độ JLPT', value: jlptLevelCode },
          { label: 'Buổi học', value: sessionLabel },
          { label: 'Ngày học', value: formatDayKeyDdMmYyyy(dk) },
          { label: 'Khung giờ', value: timeRange },
          { label: 'Thời lượng', value: trf('{0} phút', { 0: mins }) },
          { label: 'Sĩ số', value: headcountLabel },
          attendanceLabel && { label: 'Điểm danh', value: attendanceLabel },
          cs.changeResolution && { label: 'Điều chỉnh lịch', value: cs.changeResolution },
          (workStatus.id === 'rescheduled' || workStatus.id === 'cancelled')
            && { label: 'Khung giờ', value: tr('Đã giải phóng khỏi lịch bận') },
        ].filter(Boolean),
        z: (workStatus.id === 'rescheduled' || workStatus.id === 'cancelled')
          ? 1
          : isCompleted
            ? 2
            : workStatus.id === 'live'
              ? 4
              : 3,
      });
    }
    return list;
  }, [workScheduleSessions, policy?.sessionMinutes, tr, trf]);

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
      { code: 'Noon', label: 'Buổi trưa', localStart: '11:00', localEnd: '13:00', startMin: 660, endMin: 780 },
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
      if (evEnd <= evStart) evEnd = Math.min(24 * 60, evStart + Number(policy?.sessionMinutes || 90));
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

  const activeViewRange = useMemo(
    () => (dateFilterMode === 'view' && !isListView ? getViewDateRange(anchorKey, calendarView) : null),
    [dateFilterMode, isListView, anchorKey, calendarView],
  );

  const countSourceEvents = useMemo(
    () => (activeViewRange
      ? nonStatusFilteredEvents.filter((ev) => ev.dayKey >= activeViewRange.startKey && ev.dayKey <= activeViewRange.endKey)
      : nonStatusFilteredEvents),
    [activeViewRange, nonStatusFilteredEvents],
  );

  const counts = useMemo(() => {
    const out = {
      ALL: countSourceEvents.length,
      upcoming: 0,
      live: 0,
      completed: 0,
      cancelled: 0,
      rescheduled: 0,
    };
    for (const ev of countSourceEvents) {
      if (out[ev.sessionLifecycleId] != null) out[ev.sessionLifecycleId] += 1;
    }
    return out;
  }, [countSourceEvents]);

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

      // Default 'smart': live -> upcoming (nearest first) -> rescheduled -> completed -> cancelled (most recent first)
      const rankA = workStatusOrderRank(a.sessionLifecycleId);
      const rankB = workStatusOrderRank(b.sessionLifecycleId);
      if (rankA !== rankB) return rankA - rankB;
      if (rankA <= 1) return ta - tb;
      return tb - ta;
    });
  }, [nonStatusFilteredEvents, sessionFilter, sortBy, sortDirection]);

  const activeFilterCount = useMemo(
    () => (sessionFilter === 'ALL'
      ? countSourceEvents.length
      : countSourceEvents.filter((ev) => ev.sessionLifecycleId === sessionFilter).length),
    [countSourceEvents, sessionFilter],
  );

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
      totalFilteredCount={activeFilterCount}
    />
  );

  const requestedTargetId = targetBookingId || targetCohortParam || null;
  const matchingTargetEvent = useMemo(() => {
    if (!requestedTargetId) return null;
    return teachingEvents.find(
      (ev) => String(ev.id) === `work-${requestedTargetId}`
        || String(ev.availabilityId) === String(requestedTargetId)
        || String(ev.cohortId) === String(requestedTargetId),
    ) || null;
  }, [requestedTargetId, teachingEvents]);

  const [resolvedTargetId, setResolvedTargetId] = useState(null);
  if (requestedTargetId && matchingTargetEvent?.dayKey && resolvedTargetId !== requestedTargetId) {
    setAnchorKey(matchingTargetEvent.dayKey);
    setResolvedTargetId(requestedTargetId);
  }

  const unauthorizedTarget = Boolean(
    isMentorViewer && requestedTargetId && !isInitialLoading && !scheduleError && !matchingTargetEvent,
  );

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

  if (!isMentorViewer) {
    return (
      <MentorShell pathname={pathname} breadcrumb={tr('Lịch làm việc')}>
        <div className="rp-container py-6">
          <Banner
            tone="warning"
            title={tr('Không có quyền truy cập Lịch làm việc')}
            actions={(
              <Button as={Link} to="/" variant="primary" size="sm">
                {tr('Về trang chủ')}
              </Button>
            )}
          >
            {tr('Trang Lịch làm việc chỉ dành cho Giáo viên xem và quản lý các buổi giảng dạy thuộc quyền phụ trách.')}
          </Banner>
        </div>
      </MentorShell>
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

        {unauthorizedTarget && (
          <Banner
            tone="warning"
            title={tr('Không tìm thấy buổi giảng dạy thuộc quyền phụ trách')}
            actions={(
              <Button
                as={Link}
                to="/work-schedule/"
                onClick={() => setSearchParams({}, { replace: true })}
                size="sm"
                variant="outline"
              >
                {tr('Xem toàn bộ lịch làm việc')}
              </Button>
            )}
          >
            {tr('Lớp học không thuộc quyền phụ trách của bạn, chưa kết thúc tuyển sinh hoặc không còn buổi giảng dạy hợp lệ.')}
          </Banner>
        )}

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
                <Button
                  as={Link}
                  to="/mentor-shift-schedule/"
                  variant="primary"
                  size="sm"
                  icon={CalendarDays}
                  className="!h-9 rounded-xl px-3.5 text-[12.5px]"
                >
                  {tr('Đăng ký khung giờ')}
                </Button>
              )}
              toolbarExtra={toolbarFilterControls}
              belowToolbar={activeFilterBar}
              emptyTitle={
                hasActiveFilters
                  ? 'Không có lịch giảng dạy phù hợp với bộ lọc.'
                  : 'Chưa có lịch giảng dạy.'
              }
              emptyDescription=""
            />
          </>
        )}
      </PageContainer>
    </Shell>
  );
}
