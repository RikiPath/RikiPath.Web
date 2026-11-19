import { toVnDateKey, toVnTimeParts } from '@/features/scheduling/utils/calendarGeometry.js';
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
export function getSessionJoinState(session, course, nowMs = Date.now()) {
  const startDate = parseUtcDate(session?.scheduledAt);
  const durationMinutes = Number(course?.sessionMinutes) || 90;
  const endDate = startDate ? new Date(startDate.getTime() + durationMinutes * 60_000) : null;
  const roomHref = extractRoomHref(session?.meetingUrl);
  const status = session?.status || 'Scheduled';
  const cancelled = CANCELLED_STATUSES.has(status) || course?.status === 'Cancelled';
  const completed = COMPLETED_STATUSES.has(status);
  const paymentBlocked = Boolean(course?.paymentStatus && course.paymentStatus !== 'Paid');

  if (cancelled) {
    return { canJoin: false, isLive: false, roomHref, durationMinutes, reason: 'Buổi học đã bị hủy.' };
  }
  if (paymentBlocked) {
    return { canJoin: false, isLive: false, roomHref, durationMinutes, reason: 'Hoàn tất thanh toán để mở phòng học.' };
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

export function extractSrsDueCount(srsQueue) {
  if (!srsQueue) return 0;
  if (Array.isArray(srsQueue)) return srsQueue.length;
  return Number(srsQueue.totalDue ?? srsQueue.dueCount ?? (Array.isArray(srsQueue.items) ? srsQueue.items.length : 0)) || 0;
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
  srsQueue = null,
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
      events.push({
        id: `session-${course.id}-${session.id}`,
        eventType: 'session',
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

    events.push({
      id: `hw-${hw.id}`,
      eventType: 'homework',
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
      tone: status.kind === 'graded' || status.kind === 'submitted' ? 'present' : 'homework',
      homeworkStatusKind: status.kind,
      href: hwHref,
      hrefLabel: 'Mở bài tập',
      secondaryHref: workspaceHref,
      secondaryLabel: workspaceHref ? 'Xem trong lớp học' : undefined,
      metaRows: [
        { label: 'Lớp học', value: courseTitle },
        { label: tr('Giáo viên giao'), value: hw.mentorName || matchedCourse?.mentorName || tr('Giáo viên') },
        { label: 'Hạn nộp (GMT+7)', value: formatVnDateTime(hw.dueAt) },
        { label: 'Trạng thái', value: tr(status.label) },
        gradeLabel ? { label: 'Điểm số', value: gradeLabel } : null,
      ].filter(Boolean),
      z: 2,
    });
  });

  const dueSrsCount = extractSrsDueCount(srsQueue);
  if (dueSrsCount > 0) {
    const todayKey = toVnDateKey(new Date(nowMs));
    events.push({
      id: `srs-${todayKey}`,
      eventType: 'srs',
      scheduledAt: new Date(nowMs).toISOString(),
      dayKey: todayKey,
      startHour: 8,
      startMinute: 0,
      endHour: 8,
      endMinute: 45,
      title: trf('Ôn tập SRS hôm nay ({0} thẻ)', { 0: dueSrsCount }),
      detail: tr('Hàng đợi thẻ ghi nhớ cần ôn trong ngày'),
      statusLabel: trf('{0} thẻ cần ôn', { 0: dueSrsCount }),
      tone: 'srs',
      href: '/daily-srs',
      hrefLabel: 'Bắt đầu ôn tập',
      secondaryHref: '/vocabulary',
      secondaryLabel: 'Mở từ vựng',
      metaRows: [
        { label: 'Số thẻ hôm nay', value: trf('{0} thẻ đến hạn', { 0: dueSrsCount }) },
        { label: 'Loại lịch', value: tr('Ôn tập cách quãng (SRS)') },
      ],
      z: 1,
    });
  }

  return events.sort((a, b) => {
    if (a.dayKey !== b.dayKey) return a.dayKey.localeCompare(b.dayKey);
    return (a.startHour * 60 + a.startMinute) - (b.startHour * 60 + b.startMinute);
  });
}

export function buildMentorCalendarEvents({
  courses = [],
  cohorts = [],
  availabilities = [],
  nowMs = Date.now(),
  tr = defaultTr,
  trf = defaultTrf,
} = {}) {
  const events = [];
  const cohortNameById = new Map();
  (Array.isArray(cohorts) ? cohorts : []).forEach((c) => {
    if (c?.id && c?.name) cohortNameById.set(c.id, c.name);
  });

  const mergedSessions = new Map();
  (Array.isArray(courses) ? courses : [])
    .filter((c) => c && c.status !== 'Cancelled')
    .forEach((course) => {
      (course.sessions || []).forEach((s) => {
        if (!s?.scheduledAt) return;
        const key = course.cohortId ? `cohort-${course.cohortId}-s${s.number}` : `${course.id}-${s.id}`;
        const existing = mergedSessions.get(key) || {
          id: key,
          course,
          session: s,
          cohortId: course.cohortId,
          cohortTitle: (course.cohortId && cohortNameById.get(course.cohortId)) || displayCourseTitle(course, tr('Lớp nhóm')),
          learnerNames: [],
          meetingUrl: s.meetingUrl,
        };
        if (course.learnerName && !existing.learnerNames.includes(course.learnerName)) {
          existing.learnerNames.push(course.learnerName);
        }
        if (!existing.meetingUrl && s.meetingUrl) existing.meetingUrl = s.meetingUrl;
        mergedSessions.set(key, existing);
      });
    });

  mergedSessions.forEach((entry) => {
    const { course, session, cohortTitle, learnerNames, meetingUrl } = entry;
    const dayKey = toVnDateKey(session.scheduledAt);
    const startParts = toVnTimeParts(session.scheduledAt);
    const joinState = getSessionJoinState({ ...session, meetingUrl }, course, nowMs);
    const { startHour, startMinute, endHour, endMinute } = clampEventWindow(startParts, joinState.durationMinutes);

    let tone = 'session';
    if (CANCELLED_STATUSES.has(session.status)) tone = 'cancelled';
    else if (joinState.isLive) tone = 'live';
    else if (session.status === 'Present') tone = 'present';

    const statusLabel = joinState.isLive ? tr('Phòng đang mở') : sessionStatusLabel(session);
    const cohortHref = course.cohortId ? `/mentor-study-courses/?cohortId=${course.cohortId}` : '/mentor-study-courses/';
    events.push({
      id: `mentor-${entry.id}`,
      eventType: 'session',
      cohortId: course.cohortId,
      scheduledAt: session.scheduledAt,
      dayKey,
      startHour,
      startMinute,
      endHour,
      endMinute,
      title: trf('{0} · Buổi {1}', { 0: cohortTitle, 1: session.number }),
      courseTitle: cohortTitle,
      detail: learnerNames.length ? trf('Học viên: {0}', { 0: learnerNames.join(', ') }) : undefined,
      statusLabel,
      tone,
      canJoin: joinState.canJoin,
      joinReason: joinState.reason,
      roomHref: joinState.roomHref,
      href: joinState.canJoin ? joinState.roomHref : cohortHref,
      hrefLabel: joinState.canJoin ? 'Vào phòng dạy' : 'Mở lớp phụ trách',
      secondaryHref: '/work-schedule',
      secondaryLabel: 'Lịch giảng dạy',
      metaRows: [
        { label: 'Lớp nhóm', value: cohortTitle },
        learnerNames.length ? { label: 'Học viên', value: learnerNames.join(', ') } : null,
        { label: 'Trạng thái', value: statusLabel },
        { label: 'Phòng học', value: tr(joinState.reason) },
      ].filter(Boolean),
      z: joinState.isLive ? 4 : 3,
    });
  });

  (Array.isArray(availabilities) ? availabilities : [])
    .filter((slot) => slot && !slot.isInCohort && slot.startTime)
    .forEach((slot) => {
      const dayKey = toVnDateKey(slot.startTime);
      const startParts = toVnTimeParts(slot.startTime);
      const endParts = slot.endTime ? toVnTimeParts(slot.endTime) : { hour: startParts.hour + 1, minute: startParts.minute };
      const pending = !slot.isApproved || slot.cancelRequestedAt || slot.changeRequestedAt;
      const tone = slot.rejectedAt ? 'cancelled' : pending ? 'pending' : slot.publishedAt ? 'open' : 'approved';
      events.push({
        id: `slot-${slot.id}`,
        eventType: 'availability',
        scheduledAt: slot.startTime,
        dayKey,
        startHour: startParts.hour,
        startMinute: startParts.minute,
        endHour: endParts.hour,
        endMinute: endParts.minute,
        title: slot.rejectedAt ? tr('Khung rảnh bị từ chối') : pending ? tr('Khung rảnh chờ duyệt') : tr('Khung giờ rảnh'),
        statusLabel: slot.publishedAt ? tr('Đã công bố') : slot.isApproved ? tr('Đã duyệt') : tr('Chờ duyệt'),
        tone,
        href: '/mentor-availability',
        hrefLabel: 'Quản lý lịch tuần',
        z: 1,
      });
    });

  return events.sort((a, b) => {
    if (a.dayKey !== b.dayKey) return a.dayKey.localeCompare(b.dayKey);
    return (a.startHour * 60 + a.startMinute) - (b.startHour * 60 + b.startMinute);
  });
}

const SCHEDULE_NOTIF_RE = /\/my-courses|\/homework|\/work-schedule|\/mentor-availability|\/calendar|\/admin\/mentor-schedules|\/admin\/study-courses|\/mentor\/cohorts|\/mentor-study-courses|\/mentor\/schedule|buổi học|bài tập|dời lịch|lịch học|lịch dạy|khung rảnh|phòng học|điểm danh/i;

const AUTHOR_NOTIF_RE = /\/author-dashboard|\/content-manual|\/bulk-import|\/content-studio|\/lesson-cms|học liệu|nhập liệu|chờ duyệt|đã duyệt|bị từ chối/i;

export function isScheduleNotification(item) {
  if (!item) return false;
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
  events.forEach((ev) => {
    if (!ev.dayKey) return;
    if (!dayTonesMap.has(ev.dayKey)) dayTonesMap.set(ev.dayKey, new Set());
    dayTonesMap.get(ev.dayKey).add(ev.tone || 'session');
  });

  const sessions = events.filter((ev) => ev.eventType === 'session');
  const liveSessions = sessions.filter((ev) => ev.canJoin);
  const upcomingSessions = sessions.filter((ev) => {
    const start = parseUtcDate(ev.scheduledAt)?.getTime() || 0;
    const end = start + 90 * 60_000;
    return end >= nowMs - 30 * 60_000 && ev.tone !== 'cancelled';
  });
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
  const scheduleNotifications = (Array.isArray(notifications) ? notifications : []).filter(isScheduleNotification);

  return {
    todayKey,
    todayEvents,
    liveSessions,
    upcomingSessions,
    upcoming7DaysSessions,
    pendingHomeworks,
    scheduleNotifications,
    dayTonesMap,
  };
}
