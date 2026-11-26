import { formatCleanCohortTitle, toVnDateKey, toVnTimeParts } from '@/features/scheduling/utils/calendarGeometry.js';
import { buildMentorWorkScheduleSessions } from '@/features/scheduling/utils/teachingLifecycleModel.js';
import { formatVnDateTime, parseUtcDate, sessionStatusLabel } from '@/utils/vnDateTime.js';

export const JOIN_EARLY_MINUTES = 15;
export const JOIN_LATE_MINUTES = 30;

const CANCELLED_STATUSES = new Set([
  'Cancelled',
  'CancelledByMentor',
  'CancelledByLearner',
  'TransferredOut',
]);

const COMPLETED_STATUSES = new Set([
  'Present',
  'Absent',
  'ExcusedAbsent',
  'Delivered',
  'Completed',
]);

const defaultTr = (text) => text;
const defaultTrf = (tpl, vars = {}) =>
  String(tpl).replace(/\{(\w+)\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ''));

export function displayCourseTitle(course, fallback = 'Lớp học nhóm') {
  if (!course) return fallback;
  const named = course.cohortName?.trim() || course.name?.trim();
  if (named) return named;
  if (course.level) return `Lớp JLPT ${course.level}`;
  return fallback;
}

export function extractRoomHref(meetingUrl) {
  if (!meetingUrl || typeof meetingUrl !== 'string') return null;
  const match = meetingUrl.match(/\/meeting-room\/([0-9a-f-]+)/i);
  return match ? `/meeting-room/${match[1]}` : null;
}

/**
 * Evaluates whether a scheduled session room can currently be joined based on Backend timing & status rules
 * (opens 15 min before start, stays accessible until 30 min after planned end).
 */
export function getSessionJoinState(session, course, nowMs = Date.now(), options = {}) {
  const startDate = parseUtcDate(session?.scheduledAt);
  const durationMinutes = Number(course?.sessionMinutes) || 90;
  const endDate = startDate ? new Date(startDate.getTime() + durationMinutes * 60_000) : null;
  const roomHref = extractRoomHref(session?.meetingUrl);
  const status = session?.status || 'Scheduled';
  const lifecycleId = options?.lifecycleId || course?.cohortStatus || '';
  const cancelled = CANCELLED_STATUSES.has(status) || course?.status === 'Cancelled' || lifecycleId === 'Cancelled';
  const classCompleted = lifecycleId === 'Completed' || course?.status === 'Completed';
  const recruiting = lifecycleId === 'Recruiting';
  const completed = COMPLETED_STATUSES.has(status);
  const paymentBlocked = Boolean(course?.paymentStatus && course.paymentStatus !== 'Paid' && course.paymentStatus !== 'PartiallyRefunded');

  if (cancelled) {
    return { canJoin: false, isLive: false, roomHref, durationMinutes, reason: 'Buổi học đã bị hủy.' };
  }
  if (classCompleted) {
    return { canJoin: false, isLive: false, roomHref, durationMinutes, reason: 'Lớp học đã hoàn thành.' };
  }
  if (paymentBlocked) {
    return { canJoin: false, isLive: false, roomHref, durationMinutes, reason: 'Hoàn tất thanh toán để mở phòng học.' };
  }
  if (recruiting) {
    return { canJoin: false, isLive: false, roomHref, durationMinutes, reason: 'Lớp đang tuyển sinh; phòng học sẽ mở khi lớp chính thức diễn ra.' };
  }
  if (!roomHref) {
    return { canJoin: false, isLive: false, roomHref: null, durationMinutes, reason: 'Phòng học sẽ cập nhật trước giờ học.' };
  }
  if (!startDate || Number.isNaN(startDate.getTime())) {
    return { canJoin: false, isLive: false, roomHref, durationMinutes, reason: 'Chưa có thời gian bắt đầu.' };
  }
  if (completed) {
    return { canJoin: false, isLive: false, roomHref, durationMinutes, reason: 'Buổi học đã diễn ra.' };
  }

  const startMs = startDate.getTime();
  const endMs = endDate ? endDate.getTime() : startMs + durationMinutes * 60_000;
  const openAt = startMs - JOIN_EARLY_MINUTES * 60_000;
  const closeAt = endMs + JOIN_LATE_MINUTES * 60_000;

  if (nowMs >= openAt && nowMs <= closeAt) {
    return { canJoin: true, isLive: true, roomHref, durationMinutes, reason: 'Phòng học đang mở — bạn có thể tham gia ngay.' };
  }
  if (nowMs < openAt) {
    return { canJoin: false, isLive: false, roomHref, durationMinutes, reason: 'Phòng học mở trước giờ bắt đầu 15 phút.' };
  }
  return { canJoin: false, isLive: false, roomHref, durationMinutes, reason: 'Buổi học đã qua thời gian tham gia.' };
}

function clampEventWindow(startParts, durationMinutes) {
  const startTotal = startParts.hour * 60 + startParts.minute;
  const rawEnd = startTotal + Math.max(30, durationMinutes);
  const endTotal = Math.min(23 * 60 + 59, rawEnd);
  const clampedStart = endTotal - startTotal < 30 ? Math.max(0, endTotal - 30) : startTotal;
  return {
    startHour: Math.floor(clampedStart / 60),
    startMinute: clampedStart % 60,
    endHour: Math.floor(endTotal / 60),
    endMinute: endTotal % 60,
  };
}

function formatHm(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const VALID_SRS_MODES = new Set(['flip', 'typing', 'mcq', 'mixed']);

function normalizeSrsMode(value, fallback = 'flip') {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'multiplechoice' || raw === 'multiple_choice') return 'mcq';
  if (VALID_SRS_MODES.has(raw)) return raw;
  return VALID_SRS_MODES.has(fallback) ? fallback : 'flip';
}

export function extractSrsDueCount(srsQueue, srsSummary = null) {
  if (srsSummary && srsSummary.dueTodayCount != null) {
    return Math.max(0, Number(srsSummary.dueTodayCount) || 0);
  }
  if (!srsQueue) return 0;
  if (Array.isArray(srsQueue)) return srsQueue.length;
  return Number(srsQueue.totalDue ?? srsQueue.dueCount ?? (Array.isArray(srsQueue.items) ? srsQueue.items.length : 0)) || 0;
}

export function extractSrsCalendarState({
  srsSummary = null,
  srsQueue = null,
  srsCalendarDays = [],
  activeSession = null,
  nowMs = Date.now(),
} = {}) {
  const todayKey = (srsSummary?.studyTodayDate && String(srsSummary.studyTodayDate).slice(0, 10))
    || toVnDateKey(new Date(nowMs));
  const dueNowCount = extractSrsDueCount(srsQueue, srsSummary);
  const dueLaterTodayCount = Math.max(0, Number(srsSummary?.dueLaterTodayCount) || 0);
  const reviewedTodayCount = Math.max(0, Number(srsSummary?.reviewedTodayCount) || 0);
  const activeCardsCount = Math.max(0, Number(srsSummary?.activeCards ?? srsSummary?.totalCards) || 0);
  const nextDueAtUtc = srsSummary?.nextDueAtUtc || srsQueue?.nextDueAtUtc || null;
  const preferredReviewMode = normalizeSrsMode(srsSummary?.preferredReviewMode || srsQueue?.studyMode, 'flip');

  const isExplicitSessionOpen = Boolean(
    activeSession
    && activeSession.status !== 'Completed'
    && activeSession.status !== 'Abandoned'
    && !activeSession.isFinished,
  );
  const explicitPendingCount = Array.isArray(activeSession?.pendingItems)
    ? activeSession.pendingItems.length
    : activeSession?.pendingCount;
  const rawActivePending = isExplicitSessionOpen && explicitPendingCount != null
    ? explicitPendingCount
    : srsSummary?.activeSessionPendingCount;
  const summaryRequestsActive = isExplicitSessionOpen || Boolean(srsSummary?.hasActiveSession);
  const activeSessionPendingCount = rawActivePending != null
    ? Math.max(0, Number(rawActivePending) || 0)
    : (summaryRequestsActive && dueNowCount > 0 ? dueNowCount : 0);
  const hasActiveSession = Boolean(summaryRequestsActive && activeSessionPendingCount > 0);
  const activeSessionStudyMode = normalizeSrsMode(
    (isExplicitSessionOpen ? activeSession?.studyMode : null) || srsSummary?.activeSessionStudyMode,
    preferredReviewMode,
  );
  const activeSessionKey = (isExplicitSessionOpen ? activeSession?.sessionKey : null)
    || srsSummary?.activeSessionKey
    || null;
  const reminderHour = Number.isFinite(Number(srsSummary?.reminderHour)) ? Number(srsSummary.reminderHour) : 20;
  const reminderMinute = Number.isFinite(Number(srsSummary?.reminderMinute)) ? Number(srsSummary.reminderMinute) : 0;

  const daysMap = new Map();

  const upsertDay = (raw) => {
    if (!raw) return;
    const dayKey = String(raw.date || raw.dayKey || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return;
    const prev = daysMap.get(dayKey) || {
      dayKey,
      dueNowCount: 0,
      dueLaterCount: 0,
      dueScheduledCount: 0,
      reviewedCount: 0,
      rememberedCount: 0,
      earliestDueAtUtc: null,
      nextDueAtUtc: null,
      status: 'None',
    };

    const isPast = dayKey < todayKey;
    const rawScheduled = Number(raw.dueScheduledCount ?? raw.dueCount ?? 0) || 0;
    const rawDueNow = isPast ? 0 : (Number(raw.dueNowCount ?? (dayKey === todayKey ? rawScheduled : 0)) || 0);
    const rawDueLater = isPast
      ? 0
      : (raw.dueLaterCount != null
        ? Number(raw.dueLaterCount) || 0
        : (dayKey > todayKey ? rawScheduled : 0));
    const resolvedScheduled = isPast ? 0 : Math.max(rawScheduled, rawDueNow + rawDueLater);
    const resolvedReviewed = Math.max(prev.reviewedCount, Number(raw.reviewedCount) || 0);
    const resolvedRemembered = Math.max(prev.rememberedCount, Number(raw.rememberedCount) || 0);

    daysMap.set(dayKey, {
      dayKey,
      dueNowCount: rawDueNow,
      dueLaterCount: rawDueLater,
      dueScheduledCount: resolvedScheduled,
      reviewedCount: resolvedReviewed,
      rememberedCount: resolvedRemembered,
      earliestDueAtUtc: raw.earliestDueAtUtc || prev.earliestDueAtUtc || null,
      nextDueAtUtc: raw.nextDueAtUtc || prev.nextDueAtUtc || null,
      status: raw.status || prev.status || 'None',
    });
  };

  (Array.isArray(srsCalendarDays) ? srsCalendarDays : []).forEach(upsertDay);
  (Array.isArray(srsSummary?.forecastNext7Days) ? srsSummary.forecastNext7Days : []).forEach(upsertDay);
  (Array.isArray(srsSummary?.calendarDays) ? srsSummary.calendarDays : []).forEach(upsertDay);

  const prevToday = daysMap.get(todayKey) || {};
  const todayScheduled = dueNowCount + dueLaterTodayCount;
  const todayReviewed = Math.max(prevToday.reviewedCount || 0, reviewedTodayCount);
  daysMap.set(todayKey, {
    dayKey: todayKey,
    dueNowCount,
    dueLaterCount: dueLaterTodayCount,
    dueScheduledCount: todayScheduled,
    reviewedCount: todayReviewed,
    rememberedCount: Math.max(prevToday.rememberedCount || 0, Number(srsSummary?.correctTodayCount) || 0),
    earliestDueAtUtc: prevToday.earliestDueAtUtc || (dueLaterTodayCount > 0 ? nextDueAtUtc : null),
    nextDueAtUtc,
    status: hasActiveSession
      ? 'ActiveSession'
      : dueNowCount > 0
        ? 'DueNow'
        : dueLaterTodayCount > 0
          ? 'DueLaterToday'
          : todayReviewed > 0
            ? 'CompletedToday'
            : 'NoCardsDueToday',
  });

  if (nextDueAtUtc) {
    const nextDayKey = toVnDateKey(nextDueAtUtc);
    if (nextDayKey && nextDayKey > todayKey) {
      const existingNext = daysMap.get(nextDayKey);
      if (existingNext) {
        if (!existingNext.earliestDueAtUtc) {
          existingNext.earliestDueAtUtc = nextDueAtUtc;
        }
      } else if (activeCardsCount > 0) {
        daysMap.set(nextDayKey, {
          dayKey: nextDayKey,
          dueNowCount: 0,
          dueLaterCount: 1,
          dueScheduledCount: 1,
          reviewedCount: 0,
          rememberedCount: 0,
          earliestDueAtUtc: nextDueAtUtc,
          nextDueAtUtc,
          status: 'ScheduledFuture',
        });
      }
    }
  }

  return {
    todayKey,
    dueNowCount,
    dueLaterTodayCount,
    reviewedTodayCount: todayReviewed,
    activeCardsCount,
    nextDueAtUtc,
    preferredReviewMode,
    hasActiveSession,
    activeSessionKey,
    activeSessionStudyMode,
    activeSessionPendingCount,
    reminderHour,
    reminderMinute,
    // Scheduled review lives on the due page; the active session (any mode) resumes there.
    reviewHref: hasActiveSession ? '/daily-srs/due/?resume=1' : '/daily-srs/due/',
    libraryHref: '/daily-srs/library/',
    overviewHref: '/daily-srs',
    daysMap,
  };
}

export function classifyHomeworkItem(item, nowMs = Date.now()) {
  if (!item) return 'pending';
  if (item.publishedGrade != null || item.status === 'Graded' || item.submission?.grade != null) {
    return 'graded';
  }
  if (item.submission || item.status === 'Submitted') {
    return 'submitted';
  }
  const due = parseUtcDate(item.dueAt);
  if (!due || Number.isNaN(due.getTime())) return 'pending';
  const diffMs = due.getTime() - nowMs;
  if (diffMs < 0) return 'overdue';
  if (diffMs <= 48 * 3600_000) return 'dueSoon';
  return 'pending';
}

export function homeworkStatusMeta(item, nowMs = Date.now()) {
  const kind = classifyHomeworkItem(item, nowMs);
  if (kind === 'graded') return { kind, label: 'Đã chấm điểm', tone: 'success' };
  if (kind === 'submitted') return { kind, label: 'Đã nộp — chờ chấm', tone: 'info' };
  if (kind === 'overdue') return { kind, label: 'Quá hạn nộp', tone: 'danger' };
  if (kind === 'dueSoon') return { kind, label: 'Sắp đến hạn', tone: 'warning' };
  return { kind, label: 'Cần hoàn thành', tone: 'warning' };
}

export function buildLearnerCalendarEvents({
  courses = [],
  homeworks = [],
  changeRequests = [],
  notifications = [],
  srsQueue = null,
  srsSummary = null,
  srsCalendarDays = [],
  activeSession = null,
  nowMs = Date.now(),
  tr = defaultTr,
  trf = defaultTrf,
} = {}) {
  const events = [];
  const safeCourses = Array.isArray(courses)
    ? courses.filter((c) => c && c.status !== 'Cancelled' && c.status !== 'Transferred')
    : [];
  const safeHomeworks = Array.isArray(homeworks) ? homeworks : [];
  const safeRequests = Array.isArray(changeRequests) ? changeRequests : [];

  const approvedMovesBySession = new Set();
  const pendingRequestBySession = new Map();
  safeRequests.forEach((req) => {
    if (!req?.sessionId) return;
    if (req.status === 'Approved' && req.kind === 'Move') {
      approvedMovesBySession.add(req.sessionId);
    } else if (req.status === 'Pending') {
      pendingRequestBySession.set(req.sessionId, req);
    }
  });

  const courseByCohortId = new Map();
  const courseById = new Map();
  safeCourses.forEach((course) => {
    if (course.id) courseById.set(course.id, course);
    if (course.cohortId && !courseByCohortId.has(course.cohortId)) {
      courseByCohortId.set(course.cohortId, course);
    }
  });

  const hwByCourseOrCohort = new Map();
  safeHomeworks.forEach((hw) => {
    const key = hw.studyCourseId ? `course-${hw.studyCourseId}` : hw.cohortId ? `cohort-${hw.cohortId}` : null;
    if (!key) return;
    if (!hwByCourseOrCohort.has(key)) hwByCourseOrCohort.set(key, []);
    hwByCourseOrCohort.get(key).push(hw);
  });

  safeCourses.forEach((course) => {
    const courseTitle = displayCourseTitle(course, tr('Lớp học nhóm'));
    const relatedHws = [
      ...(hwByCourseOrCohort.get(`course-${course.id}`) || []),
      ...(course.cohortId ? hwByCourseOrCohort.get(`cohort-${course.cohortId}`) || [] : []),
    ];
    const uniqueRelatedHws = Array.from(new Map(relatedHws.map((h) => [h.id, h])).values());

    (course.sessions || []).forEach((session) => {
      if (!session?.scheduledAt) return;
      const dayKey = toVnDateKey(session.scheduledAt);
      const startParts = toVnTimeParts(session.scheduledAt);
      const joinState = getSessionJoinState(session, course, nowMs);
      const { startHour, startMinute, endHour, endMinute } = clampEventWindow(startParts, joinState.durationMinutes);
      const isCancelled = CANCELLED_STATUSES.has(session.status);
      const isRescheduled = approvedMovesBySession.has(session.id) && !isCancelled;
      const pendingReq = pendingRequestBySession.get(session.id);

      let tone = 'session';
      if (isCancelled) tone = 'cancelled';
      else if (joinState.isLive) tone = 'live';
      else if (session.status === 'Present') tone = 'present';
      else if (isRescheduled) tone = 'rescheduled';
      else if (pendingReq) tone = 'pending';

      const statusLabel = joinState.isLive
        ? tr('Phòng đang mở')
        : isRescheduled
          ? tr('Đã dời lịch')
          : pendingReq
            ? tr('Chờ duyệt đổi lịch')
            : sessionStatusLabel(session);

      const courseHref = course.id ? `/my-courses/${course.id}` : '/my-courses';
      const isCompleted = COMPLETED_STATUSES.has(session.status);
      events.push({
        id: `session-${course.id}-${session.id}`,
        eventType: 'session',
        category: 'session',
        courseId: course.id,
        cohortId: course.cohortId,
        sessionId: session.id,
        sessionNumber: session.number,
        scheduledAt: session.scheduledAt,
        dayKey,
        startHour,
        startMinute,
        endHour,
        endMinute,
        title: trf('{0} · Buổi {1}', { 0: courseTitle, 1: session.number }),
        courseTitle,
        mentorName: course.mentorName || tr('Chưa phân công'),
        detail: `${course.mentorName || tr('Giáo viên')} · ${formatHm(startHour, startMinute)}–${formatHm(endHour, endMinute)}`,
        statusLabel,
        tone,
        isCompleted,
        isCancelled,
        isRescheduled,
        isLive: joinState.isLive,
        canJoin: joinState.canJoin,
        joinReason: joinState.reason,
        roomHref: joinState.roomHref,
        href: joinState.canJoin ? joinState.roomHref : `${courseHref}?section=schedule`,
        hrefLabel: joinState.canJoin ? 'Vào phòng học' : 'Xem lịch lớp',
        secondaryHref: courseHref,
        secondaryLabel: 'Không gian lớp học',
        relatedHomeworks: uniqueRelatedHws.slice(0, 3),
        metaRows: [
          { label: 'Lớp học', value: courseTitle },
          { label: tr('Giáo viên'), value: course.mentorName || tr('Chưa phân công') },
          { label: 'Buổi học', value: trf('Buổi {0} ({1} phút)', { 0: session.number, 1: joinState.durationMinutes }) },
          { label: 'Trạng thái', value: statusLabel },
          { label: 'Phòng học', value: tr(joinState.reason) },
          session.note ? { label: 'Ghi chú', value: session.note } : null,
        ].filter(Boolean),
        z: joinState.isLive ? 4 : 3,
      });
    });
  });

  safeHomeworks.forEach((hw) => {
    if (!hw?.dueAt) return;
    const dayKey = toVnDateKey(hw.dueAt);
    if (!dayKey) return;
    const dueParts = toVnTimeParts(hw.dueAt);
    const dueMinutes = dueParts.hour * 60 + dueParts.minute;
    const blockEnd = dueMinutes >= 45 ? dueMinutes : Math.min(23 * 60 + 59, dueMinutes + 45);
    const blockStart = Math.max(0, blockEnd - 45);
    const startHour = Math.floor(blockStart / 60);
    const startMinute = blockStart % 60;
    const endHour = Math.floor(blockEnd / 60);
    const endMinute = blockEnd % 60;

    const matchedCourse = (hw.studyCourseId && courseById.get(hw.studyCourseId))
      || (hw.cohortId && courseByCohortId.get(hw.cohortId))
      || null;
    const courseTitle = matchedCourse ? displayCourseTitle(matchedCourse, tr('Lớp học nhóm')) : (hw.cohortName || tr('Bài tập lớp nhóm'));
    const status = homeworkStatusMeta(hw, nowMs);
    const hwHref = hw.cohortId ? `/homework/?cohortId=${hw.cohortId}` : '/homework';
    const workspaceHref = matchedCourse?.id ? `/my-courses/${matchedCourse.id}?section=homework` : undefined;

    const gradeScore = typeof hw.publishedGrade === 'object' ? hw.publishedGrade?.score : hw.publishedGrade;
    const gradeLabel = gradeScore != null
      ? `${gradeScore}/100`
      : hw.publishedGrade && typeof hw.publishedGrade === 'object'
        ? (hw.publishedGrade.passed ? tr('Đạt') : tr('Chưa đạt'))
        : null;

    const isCompleted = status.kind === 'graded' || status.kind === 'submitted';
    const isOverdue = status.kind === 'overdue';

    events.push({
      id: `hw-${hw.id}`,
      eventType: 'homework',
      category: 'homework',
      homeworkId: hw.id,
      cohortId: hw.cohortId,
      courseId: matchedCourse?.id || hw.studyCourseId || null,
      scheduledAt: hw.dueAt,
      dayKey,
      startHour,
      startMinute,
      endHour,
      endMinute,
      title: hw.title || tr('Bài tập về nhà'),
      courseTitle,
      detail: `${courseTitle} · ${tr(status.label)}`,
      statusLabel: tr(status.label),
      tone: 'homework',
      homeworkStatusKind: status.kind,
      isCompleted,
      isOverdue,
      href: hwHref,
      hrefLabel: 'Mở bài tập',
      secondaryHref: workspaceHref,
      secondaryLabel: workspaceHref ? 'Xem trong lớp học' : undefined,
      metaRows: [
        { label: 'Lớp học', value: courseTitle },
        { label: tr('Giáo viên giao'), value: hw.mentorName || matchedCourse?.mentorName || tr('Giáo viên') },
        { label: 'Hạn nộp', value: formatVnDateTime(hw.dueAt) },
        { label: 'Trạng thái', value: tr(status.label) },
        gradeLabel ? { label: 'Điểm số', value: gradeLabel } : null,
      ].filter(Boolean),
      z: 2,
    });
  });

  const srsState = extractSrsCalendarState({
    srsSummary,
    srsQueue,
    srsCalendarDays,
    activeSession,
    nowMs,
  });

  const sortedSrsDays = [...srsState.daysMap.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  sortedSrsDays.forEach((dayInfo) => {
    const { dayKey } = dayInfo;
    if (dayKey === srsState.todayKey) {
      if (srsState.hasActiveSession && srsState.activeSessionPendingCount > 0) {
        const activePending = srsState.activeSessionPendingCount;
        events.push({
          id: `srs-${dayKey}`,
          eventType: 'srs',
          category: 'srs',
          srsState: 'active_session',
          srsCount: dayInfo.dueNowCount,
          activeSessionPendingCount: activePending,
          hasActiveSession: true,
          reviewedCount: dayInfo.reviewedCount,
          canReviewNow: true,
          scheduledAt: new Date(nowMs).toISOString(),
          dayKey,
          startHour: 7,
          startMinute: 0,
          endHour: 7,
          endMinute: 45,
          title: tr('Tiếp tục ôn tập'),
          fullTitle: trf('Tiếp tục ôn tập · Còn {0} thẻ chưa hoàn thành', { 0: activePending }),
          detail: trf('Còn {0} thẻ chưa hoàn thành', { 0: activePending }),
          statusLabel: tr('Đang có phiên ôn'),
          tone: 'srs',
          href: srsState.reviewHref,
          hrefLabel: 'Tiếp tục ôn',
          secondaryHref: srsState.libraryHref,
          secondaryLabel: 'Xem thẻ',
          metaRows: [
            { label: 'Hoạt động', value: tr('Tiếp tục ôn tập') },
            { label: 'Thẻ còn lại trong phiên', value: trf('Còn {0} thẻ chưa hoàn thành', { 0: activePending }) },
            dayInfo.dueNowCount > 0
              ? { label: 'Số thẻ cần ôn', value: trf('{0} thẻ cần ôn', { 0: dayInfo.dueNowCount }) }
              : null,
            { label: 'Trạng thái', value: tr('Đang có phiên ôn tập') },
          ].filter(Boolean),
          z: 2,
        });
      } else if (dayInfo.dueNowCount > 0) {
        const count = dayInfo.dueNowCount;
        const statusLabel = trf('{0} thẻ cần ôn', { 0: count });
        const detail = dayInfo.reviewedCount > 0
          ? trf('{0} thẻ cần ôn · Đã ôn {1} lượt hôm nay', { 0: count, 1: dayInfo.reviewedCount })
          : trf('{0} thẻ cần ôn hôm nay', { 0: count });

        events.push({
          id: `srs-${dayKey}`,
          eventType: 'srs',
          category: 'srs',
          srsState: 'due_now',
          srsCount: count,
          activeSessionPendingCount: 0,
          hasActiveSession: false,
          reviewedCount: dayInfo.reviewedCount,
          canReviewNow: true,
          scheduledAt: new Date(nowMs).toISOString(),
          dayKey,
          startHour: 7,
          startMinute: 0,
          endHour: 7,
          endMinute: 45,
          title: trf('{0} thẻ cần ôn', { 0: count }),
          fullTitle: trf('Ôn tập · {0} thẻ cần ôn', { 0: count }),
          detail,
          statusLabel,
          tone: 'srs',
          href: srsState.reviewHref,
          hrefLabel: 'Ôn ngay',
          secondaryHref: srsState.libraryHref,
          secondaryLabel: 'Xem thẻ',
          metaRows: [
            { label: 'Hoạt động', value: tr('Ôn tập') },
            { label: 'Số thẻ cần ôn', value: trf('{0} thẻ cần ôn', { 0: count }) },
            dayInfo.reviewedCount > 0
              ? { label: 'Đã ôn hôm nay', value: trf('{0} lượt', { 0: dayInfo.reviewedCount }) }
              : null,
            { label: 'Trạng thái', value: tr('Có thể ôn ngay') },
          ].filter(Boolean),
          z: 2,
        });
      } else if (dayInfo.dueLaterCount > 0) {
        const count = dayInfo.dueLaterCount;
        const dueParts = dayInfo.earliestDueAtUtc
          ? toVnTimeParts(dayInfo.earliestDueAtUtc)
          : {
            hour: srsState.reminderHour,
            minute: srsState.reminderMinute,
            hhmm: formatHm(srsState.reminderHour, srsState.reminderMinute),
          };
        const { startHour, startMinute, endHour, endMinute } = clampEventWindow(dueParts, 45);
        events.push({
          id: `srs-${dayKey}`,
          eventType: 'srs',
          category: 'srs',
          srsState: 'due_later_today',
          srsCount: count,
          reviewedCount: dayInfo.reviewedCount,
          canReviewNow: false,
          dueTimeLabel: dueParts.hhmm,
          scheduledAt: dayInfo.earliestDueAtUtc || new Date(nowMs).toISOString(),
          dayKey,
          startHour,
          startMinute,
          endHour,
          endMinute,
          title: trf('{0} thẻ cần ôn', { 0: count }),
          fullTitle: trf('Ôn tập · {0} thẻ cần ôn', { 0: count }),
          detail: trf('Ôn tiếp lúc {0} hôm nay', { 0: dueParts.hhmm }),
          statusLabel: trf('Ôn tiếp lúc {0}', { 0: dueParts.hhmm }),
          tone: 'srs',
          href: srsState.libraryHref,
          hrefLabel: 'Xem thẻ',
          secondaryHref: srsState.overviewHref,
          secondaryLabel: 'Tổng quan',
          metaRows: [
            { label: 'Hoạt động', value: tr('Ôn tập') },
            { label: 'Số thẻ cần ôn', value: trf('{0} thẻ cần ôn', { 0: count }) },
            { label: 'Thời gian dự kiến', value: trf('Ôn tiếp lúc {0}', { 0: dueParts.hhmm }) },
            { label: 'Trạng thái', value: tr('Dự kiến đến hạn trong ngày') },
          ],
          z: 1,
        });
      }
      return;
    }

    if (dayKey > srsState.todayKey && dayInfo.dueScheduledCount > 0) {
      const count = dayInfo.dueScheduledCount;
      const dueParts = dayInfo.earliestDueAtUtc
        ? toVnTimeParts(dayInfo.earliestDueAtUtc)
        : { hour: 7, minute: 0, hhmm: '07:00' };
      const { startHour, startMinute, endHour, endMinute } = clampEventWindow(dueParts, 45);
      const shortDate = dayKey.split('-').reverse().join('/');
      const scheduledIso = dayInfo.earliestDueAtUtc || `${dayKey}T00:00:00Z`;

      events.push({
        id: `srs-${dayKey}`,
        eventType: 'srs',
        category: 'srs',
        srsState: 'scheduled_future',
        srsCount: count,
        reviewedCount: 0,
        canReviewNow: false,
        isFutureSrs: true,
        dueTimeLabel: dueParts.hhmm,
        scheduledAt: scheduledIso,
        dayKey,
        startHour,
        startMinute,
        endHour,
        endMinute,
        title: trf('{0} thẻ cần ôn', { 0: count }),
        fullTitle: trf('Ôn tập · {0} thẻ cần ôn', { 0: count }),
        detail: trf('Ôn tiếp lúc {0} · Dự kiến đến hạn', { 0: dueParts.hhmm }),
        statusLabel: trf('Ôn tiếp lúc {0}', { 0: dueParts.hhmm }),
        tone: 'srs',
        href: srsState.libraryHref,
        hrefLabel: 'Xem thẻ',
        secondaryHref: srsState.overviewHref,
        secondaryLabel: 'Tổng quan',
        metaRows: [
          { label: 'Hoạt động', value: tr('Ôn tập') },
          { label: 'Số thẻ dự kiến', value: trf('{0} thẻ cần ôn', { 0: count }) },
          { label: 'Thời gian dự kiến', value: `${dueParts.hhmm} · ${shortDate}` },
          { label: 'Trạng thái', value: tr('Dự kiến đến hạn — mở ôn khi đến ngày') },
        ],
        z: 1,
      });
    }
  });

  // Actionable / schedule-related notifications (Blue reminder category) —
  // SRS reminder notifications reconcile to the canonical SRS activity and never render a duplicate blue card.
  reconcileCalendarScheduleNotifications(notifications, { fallbackDayKey: srsState.todayKey })
    .slice(0, 6)
    .forEach((n, idx) => {
      const rawIso = n.scheduledAt || n.createdAt;
      const dayKey = (rawIso && toVnDateKey(rawIso)) || srsState.todayKey;
      const timeParts = rawIso ? toVnTimeParts(rawIso) : { hour: 8, minute: (idx * 15) % 60 };
      const { startHour, startMinute, endHour, endMinute } = clampEventWindow(timeParts, 30);
      events.push({
        id: `reminder-${n.id || idx}`,
        businessKey: getCalendarNotificationBusinessKey(n, dayKey),
        eventType: 'reminder',
        category: 'reminder',
        notificationId: n.id,
        scheduledAt: rawIso || new Date(nowMs).toISOString(),
        dayKey,
        startHour,
        startMinute,
        endHour,
        endMinute,
        title: n.title || tr('Nhắc nhở lịch học'),
        detail: n.message || tr('Thông báo liên quan đến lịch học'),
        statusLabel: tr('Nhắc nhở'),
        tone: 'reminder',
        href: n.linkUrl || '/calendar',
        hrefLabel: 'Xem chi tiết',
        metaRows: [
          { label: 'Loại', value: tr('Nhắc nhở / Thông báo') },
          n.message ? { label: 'Nội dung', value: n.message } : null,
        ].filter(Boolean),
        z: 1,
      });
    });

  return events.sort((a, b) => {
    if (a.dayKey !== b.dayKey) return a.dayKey.localeCompare(b.dayKey);
    return (a.startHour * 60 + a.startMinute) - (b.startHour * 60 + b.startMinute);
  });
}

export function buildMentorCalendarEvents({
  courses = [],
  cohorts = [],
  mentorId = null,
  nowMs = Date.now(),
  tr = defaultTr,
  trf = defaultTrf,
} = {}) {
  const workSessions = buildMentorWorkScheduleSessions({
    cohorts,
    courses,
    mentorId,
    nowMs,
  });

  return workSessions.map((ws) => {
    const startDate = parseUtcDate(ws.scheduledAt);
    const dayKey = toVnDateKey(startDate || ws.scheduledAt);
    const startParts = toVnTimeParts(startDate || ws.scheduledAt);
    const endDate = parseUtcDate(ws.endTime)
      || (startDate ? new Date(startDate.getTime() + (ws.sessionMinutes || 90) * 60_000) : null);
    const endParts = endDate
      ? toVnTimeParts(endDate)
      : {
          hour: startParts.hour + 1,
          minute: startParts.minute,
          hhmm: `${String(startParts.hour + 1).padStart(2, '0')}:${String(startParts.minute).padStart(2, '0')}`,
        };
    const { startHour, startMinute, endHour, endMinute } = clampEventWindow(startParts, ws.sessionMinutes || 90);
    const timeRange = `${startParts.hhmm}–${endParts.hhmm}`;
    const cohortTitle = ws.cohortName || tr('Lớp nhóm');
    const cleanTitle = formatCleanCohortTitle(cohortTitle, ws.sessionNumber);
    const headcountLabel = ws.capacity > 0
      ? trf('{0}/{1} học viên', { 0: ws.confirmedEnrolledCount, 1: ws.capacity })
      : trf('{0} học viên', { 0: ws.confirmedEnrolledCount });
    const cohortHref = ws.cohortId ? `/mentor-study-courses/${ws.cohortId}/` : '/mentor-study-courses/';
    const statusLabel = tr(ws.workStatus.label);

    let primaryHref = cohortHref;
    let primaryLabel = 'Xem chi tiết lớp';
    if (ws.workStatus.id === 'live' && ws.roomHref) {
      primaryHref = ws.roomHref;
      primaryLabel = 'Vào phòng học';
    } else if (ws.workStatus.id === 'upcoming' && ws.canJoin && ws.roomHref) {
      primaryHref = ws.roomHref;
      primaryLabel = 'Tham gia phòng học';
    }

    return {
      id: `mentor-${ws.id}`,
      eventType: 'session',
      cohortId: ws.cohortId,
      scheduledAt: ws.scheduledAt,
      dayKey,
      startHour,
      startMinute,
      endHour,
      endMinute,
      detailTime: timeRange,
      title: cleanTitle,
      courseTitle: cohortTitle,
      detail: `${timeRange} · ${headcountLabel}`,
      statusLabel,
      tone: ws.workStatus.tone,
      isCompleted: ws.workStatus.isCompleted,
      isLive: ws.workStatus.isLive,
      canJoin: ws.canJoin,
      roomHref: ws.roomHref,
      href: primaryHref,
      hrefLabel: primaryLabel,
      secondaryHref: cohortHref,
      secondaryLabel: 'Xem chi tiết lớp',
      z: ws.workStatus.isLive ? 4 : ws.workStatus.isCompleted ? 2 : 3,
    };
  });
}

const SCHEDULE_NOTIF_RE = /\/my-courses|\/homework|\/work-schedule|\/mentor-availability|\/calendar|\/daily-srs|\/admin\/mentor-schedules|\/admin\/study-courses|\/mentor\/cohorts|\/mentor-study-courses|\/mentor\/schedule|buổi học|bài tập|dời lịch|lịch học|lịch dạy|khung rảnh|phòng học|điểm danh|thẻ SRS|ôn tập/i;

const AUTHOR_NOTIF_RE = /\/author-dashboard|\/content-manual|\/bulk-import|\/content-studio|\/lesson-cms|học liệu|nhập liệu|chờ duyệt|đã duyệt|bị từ chối/i;

const SRS_NOTIFICATION_TYPES = new Set([
  'srsreminder',
  'srs_reminder',
  'srsdue',
  'srsduereminder',
  'srs_due_reminder',
  'srs',
]);

function normalizeNotificationLinkPath(linkUrl) {
  if (typeof linkUrl !== 'string') return '';
  return linkUrl.trim().split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase();
}

/** Identifies SRS reminder notifications via stable domain type / event key / route (never title strings). */
export function isSrsActivityNotification(item) {
  if (!item || typeof item !== 'object') return false;
  const typeKey = String(item.type || item.notificationType || '').trim().toLowerCase();
  if (typeKey && SRS_NOTIFICATION_TYPES.has(typeKey)) return true;

  const eventTypeKey = String(item.eventType || item.category || item.entityType || '').trim().toLowerCase();
  if (eventTypeKey === 'srs' || eventTypeKey === 'srsreminder' || eventTypeKey === 'srsreview') return true;

  const idempKey = String(item.idempotencyKey || item.eventKey || '').trim().toLowerCase();
  if (idempKey.startsWith('srs-') || idempKey.startsWith('srsreminder')) return true;

  const path = normalizeNotificationLinkPath(item.linkUrl || item.href);
  return path === '/daily-srs' || path.startsWith('/daily-srs/');
}

export function getCalendarNotificationBusinessKey(item, fallbackDayKey = '') {
  if (!item || typeof item !== 'object') return '';
  const rawIso = item.scheduledAt || item.createdAt;
  const dayKey = (rawIso && toVnDateKey(rawIso)) || fallbackDayKey || '';
  if (isSrsActivityNotification(item)) {
    return `srs:${dayKey}`;
  }
  const explicitKey = String(item.idempotencyKey || item.eventKey || '').trim();
  if (explicitKey) return `notif:${explicitKey}`;
  if (item.id != null) return `notif:${item.id}`;
  return `notif:${normalizeNotificationLinkPath(item.linkUrl || item.href)}:${dayKey}`;
}

export function reconcileCalendarScheduleNotifications(notifications = [], { fallbackDayKey = '' } = {}) {
  const seen = new Set();
  const list = [];
  (Array.isArray(notifications) ? notifications : []).forEach((n) => {
    if (!n || n.isRead || !isScheduleNotification(n)) return;
    // SRS review state on Calendar is owned by canonical Yellow SRS cards (Priority 1/2/3);
    // never emit duplicate or stale Blue SRS cards from reminder history.
    if (isSrsActivityNotification(n)) return;
    const key = getCalendarNotificationBusinessKey(n, fallbackDayKey);
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    list.push(n);
  });
  return list;
}

export function isScheduleNotification(item) {
  if (!item) return false;
  if (item.type === 'SrsReminder' && item.isRead) return false;
  const hay = `${item.linkUrl || ''} ${item.title || ''} ${item.message || ''}`;
  return SCHEDULE_NOTIF_RE.test(hay);
}

export function isContentAuthorNotification(item) {
  if (!item) return false;
  const hay = `${item.linkUrl || ''} ${item.title || ''} ${item.message || ''}`;
  return AUTHOR_NOTIF_RE.test(hay);
}

/** Groups GET /content-approvals/mine rows by batch with status priority Rejected > PendingReview > Draft > Approved. */
export function summarizeAuthorApprovals(rows = []) {
  const map = new Map();
  for (const item of Array.isArray(rows) ? rows : []) {
    if (!item) continue;
    const key = item.batchId || item.sourceFileName || `item-${item.id || map.size}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  const counts = { Draft: 0, PendingReview: 0, Rejected: 0, Approved: 0 };
  const recentAttention = [];
  for (const [id, group] of map.entries()) {
    const lesson = group.find((r) => r.entityType === 'Lesson');
    const split = String(lesson?.rowKey || '').split(' / ');
    const title = lesson
      ? (split.length > 1 ? split.slice(0, -1).join(' / ') : String(lesson.rowKey || ''))
      : group[0]?.sourceFileName || 'Nội dung đã gửi';
    let status = group[0]?.status || 'PendingReview';
    if (group.some((r) => r.status === 'Rejected')) status = 'Rejected';
    else if (group.some((r) => r.status === 'PendingReview')) status = 'PendingReview';
    else if (group.some((r) => r.status === 'Draft')) status = 'Draft';
    else if (group.length && group.every((r) => r.status === 'Approved')) status = 'Approved';
    counts[status] = (counts[status] || 0) + 1;
    if (status !== 'Approved') {
      recentAttention.push({ id, title, status, count: group.length });
    }
  }
  return {
    totalGroups: map.size,
    draftCount: counts.Draft,
    pendingReviewCount: counts.PendingReview,
    rejectedCount: counts.Rejected,
    approvedCount: counts.Approved,
    activeCount: counts.Rejected + counts.PendingReview + counts.Draft,
    recentAttention: recentAttention.slice(0, 4),
  };
}

export function buildUpcomingHeaderSummary({
  events = [],
  homeworks = [],
  notifications = [],
  nowMs = Date.now(),
} = {}) {
  const todayKey = toVnDateKey(new Date(nowMs));
  const sevenDaysEnd = toVnDateKey(new Date(nowMs + 7 * 86_400_000));

  const dayTonesMap = new Map();
  const addDayTone = (dayKey, categoryKey) => {
    if (!dayKey || !categoryKey) return;
    if (!dayTonesMap.has(dayKey)) dayTonesMap.set(dayKey, new Set());
    dayTonesMap.get(dayKey).add(categoryKey);
  };

  events.forEach((ev) => {
    if (!ev.dayKey) return;
    if (ev.tone === 'cancelled' || ev.isCancelled) return;
    if (ev.eventType === 'homework' && (ev.isCompleted || ev.homeworkStatusKind === 'graded' || ev.homeworkStatusKind === 'submitted')) {
      return;
    }
    if (ev.eventType === 'srs') {
      if (ev.canReviewNow || ev.srsState === 'due_later_today' || ev.srsState === 'scheduled_future') {
        addDayTone(ev.dayKey, 'srs');
      }
      return;
    }
    if (ev.eventType === 'homework') {
      addDayTone(ev.dayKey, 'homework');
      return;
    }
    if (ev.eventType === 'reminder' || ev.tone === 'reminder') {
      addDayTone(ev.dayKey, 'reminder');
      return;
    }
    addDayTone(ev.dayKey, ev.tone || 'session');
  });

  const scheduleNotifications = reconcileCalendarScheduleNotifications(notifications, { fallbackDayKey: todayKey });
  scheduleNotifications.forEach((n) => {
    const rawIso = n.scheduledAt || n.createdAt;
    if (rawIso) {
      const dk = toVnDateKey(rawIso);
      if (dk) addDayTone(dk, 'reminder');
    }
  });

  const sessions = events.filter((ev) => ev.eventType === 'session');
  const liveSessions = sessions
    .filter((ev) => ev.tone === 'workLive' || (ev.canJoin && ev.tone !== 'workCompleted' && ev.tone !== 'present' && ev.tone !== 'cancelled' && !ev.isCompleted))
    .sort((a, b) => (a.tone === 'workLive' ? -1 : 0) - (b.tone === 'workLive' ? -1 : 0));
  const upcomingSessions = sessions
    .filter((ev) => {
      if (ev.tone === 'cancelled' || ev.tone === 'workCompleted' || ev.tone === 'present' || ev.isCompleted) {
        return false;
      }
      const start = parseUtcDate(ev.scheduledAt)?.getTime() || 0;
      const end = start + 90 * 60_000;
      return end >= nowMs - 30 * 60_000;
    })
    .sort((a, b) => (parseUtcDate(a.scheduledAt)?.getTime() || 0) - (parseUtcDate(b.scheduledAt)?.getTime() || 0));
  const upcoming7DaysSessions = upcomingSessions.filter((ev) => ev.dayKey <= sevenDaysEnd);

  const pendingHomeworks = (Array.isArray(homeworks) ? homeworks : [])
    .filter((hw) => {
      const kind = classifyHomeworkItem(hw, nowMs);
      return kind === 'pending' || kind === 'dueSoon' || kind === 'overdue';
    })
    .sort((a, b) => {
      const ta = parseUtcDate(a.dueAt)?.getTime() || Number.MAX_SAFE_INTEGER;
      const tb = parseUtcDate(b.dueAt)?.getTime() || Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });

  const todayEvents = events.filter((ev) => ev.dayKey === todayKey);
  const todayActionCount = todayEvents.filter((ev) => {
    if (ev.tone === 'cancelled' || ev.tone === 'workCompleted' || ev.isCompleted) return false;
    if (ev.eventType === 'srs') return ev.canReviewNow || ev.srsState === 'due_later_today';
    if (ev.eventType === 'homework') return ev.homeworkStatusKind !== 'submitted' && ev.homeworkStatusKind !== 'graded';
    return true;
  }).length;

  return {
    todayKey,
    todayEvents,
    todayActionCount,
    liveSessions,
    upcomingSessions,
    upcoming7DaysSessions,
    pendingHomeworks,
    scheduleNotifications,
    dayTonesMap,
  };
}
