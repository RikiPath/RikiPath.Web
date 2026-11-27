import { parseUtcDate } from '@/utils/vnDateTime.js';

/**
 * Canonical 6-state Class Lifecycle statuses shared across Learner, Mentor, and Admin workspaces.
 * Maps Backend `StudyCohort.Status` + confirmed enrollment + capacity + enrollment window + valid session progression
 * without leaking payment/database technical states (`Active`/`Ready`) into UI status pills.
 */
export const CLASS_LIFECYCLE_STATUSES = Object.freeze([
  { id: 'Recruiting', label: 'Đang tuyển sinh', tone: 'success' },
  { id: 'Full', label: 'Lớp đã đủ sĩ số', tone: 'warning' },
  { id: 'Upcoming', label: 'Sắp diễn ra', tone: 'neutral' },
  { id: 'Teaching', label: 'Đang diễn ra', tone: 'warning' },
  { id: 'Completed', label: 'Đã hoàn thành', tone: 'success' },
  { id: 'Cancelled', label: 'Đã hủy', tone: 'danger' },
]);

const CLASS_META_BY_ID = Object.freeze(
  Object.fromEntries(CLASS_LIFECYCLE_STATUSES.map((item) => [item.id, item]))
);

const LIFECYCLE_CANCELLED_SESSION_STATUSES = new Set([
  'Cancelled',
  'CancelledByMentor',
  'CancelledByLearner',
  'TransferredOut',
]);

const LIFECYCLE_COMPLETED_SESSION_STATUSES = new Set([
  'Completed',
  'Present',
  'Absent',
  'ExcusedAbsent',
]);

const ATTENDANCE_MARKED_STATUSES = new Set([
  'Present',
  'Absent',
  'ExcusedAbsent',
]);

export function isConfirmedClassEnrollment(course) {
  if (!course) return false;
  if (course.status === 'Cancelled' || course.status === 'PendingPayment' || course.status === 'PaymentExpired' || course.status === 'PaymentFailed' || course.status === 'PaymentReview' || course.status === 'Transferred') {
    return false;
  }
  if (course.paymentStatus && course.paymentStatus !== 'Paid' && course.paymentStatus !== 'PartiallyRefunded') {
    return false;
  }
  return true;
}

/**
 * Computes actual verified course progress from official distinct session numbers
 * (deduplicating makeup attempts and never inferring completion from elapsed time).
 */
export function computeClassProgress(sessions = [], totalSessionsOverride = 0) {
  const list = Array.isArray(sessions) ? sessions : [];
  const officialKeys = new Set();
  const completedKeys = new Set();

  list.forEach((s, idx) => {
    if (!s) return;
    const status = String(s.status || '').trim();
    if (LIFECYCLE_CANCELLED_SESSION_STATUSES.has(status)) return;

    const num = Number(s.number ?? s.sessionNumber ?? 0);
    const key = Number.isFinite(num) && num > 0 ? `num:${num}` : `idx:${s.id ?? idx}`;
    officialKeys.add(key);

    if (s.sessionCompleted === true || LIFECYCLE_COMPLETED_SESSION_STATUSES.has(status)) {
      completedKeys.add(key);
    }
  });

  const safeOverride = Math.max(0, Number(totalSessionsOverride) || 0);
  const totalSessions = safeOverride > 0 ? safeOverride : officialKeys.size;
  const completedSessions = totalSessions > 0
    ? Math.min(totalSessions, completedKeys.size)
    : completedKeys.size;
  const percent = totalSessions > 0
    ? Math.min(100, Math.round((completedSessions / totalSessions) * 100))
    : 0;

  return {
    completedSessions,
    totalSessions,
    percent,
  };
}

/**
 * Computes learner personal attendance ratio strictly over sessions that actually had
 * attendance recorded (`Present` / `Absent` / `ExcusedAbsent`), never dividing by future sessions.
 * Returns `percent: null` when `markedCount === 0` so UI renders "Chưa có điểm danh".
 */
export function computeLearnerAttendance(sessions = []) {
  const list = Array.isArray(sessions) ? sessions : [];
  const latestByLogicalSession = new Map();

  list.forEach((s, idx) => {
    if (!s) return;
    const status = String(s.status || '').trim();
    if (!ATTENDANCE_MARKED_STATUSES.has(status)) return;

    const num = Number(s.number ?? s.sessionNumber ?? 0);
    const key = Number.isFinite(num) && num > 0 ? `num:${num}` : `idx:${s.id ?? idx}`;
    const attempt = Number(s.attempt || 1);
    const prev = latestByLogicalSession.get(key);
    if (!prev || attempt >= prev.attempt) {
      latestByLogicalSession.set(key, { status, attempt });
    }
  });

  let presentCount = 0;
  let absentCount = 0;
  let excusedCount = 0;
  for (const item of latestByLogicalSession.values()) {
    if (item.status === 'Present') presentCount += 1;
    else if (item.status === 'Absent') absentCount += 1;
    else if (item.status === 'ExcusedAbsent') excusedCount += 1;
  }

  const markedCount = presentCount + absentCount + excusedCount;
  return {
    presentCount,
    absentCount,
    excusedCount,
    markedCount,
    percent: markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : null,
  };
}

/**
 * Derives the canonical Class Lifecycle status for a group class (`StudyCohort`):
 * - `Cancelled`: Cohort cancelled per valid cancellation workflow.
 * - `Completed`: Cohort reached official `Completed` status with required official sessions finished.
 * - `Recruiting`: Open/published cohort still within enrollment window.
 * - `Upcoming` ("Sắp diễn ra"): Enrollment closed with >= 1 confirmed learner, awaiting first valid session.
 * - `Teaching` ("Đang học"): >= 1 confirmed learner and first valid session started or completed.
 */
export function resolveClassLifecycleStatus({
  cohortStatus = '',
  enrolledCount = 0,
  confirmedEnrolledCount = null,
  capacity = null,
  maxLearners = null,
  startsAt = null,
  enrollmentClosesAtUtc = null,
  enrollmentClosedAtUtc = null,
  totalSessions = 0,
  sessions = [],
  enrolledCourses = [],
  nowMs = Date.now(),
} = {}) {
  const normalized = String(cohortStatus || '').trim();
  if (normalized === 'Cancelled') {
    return CLASS_META_BY_ID.Cancelled;
  }

  const progress = computeClassProgress(sessions, totalSessions);

  if (normalized === 'Completed') {
    return CLASS_META_BY_ID.Completed;
  }

  const confirmedCourses = (enrolledCourses || []).filter(isConfirmedClassEnrollment);
  const effectiveConfirmedCount = confirmedEnrolledCount != null
    ? Math.max(Number(confirmedEnrolledCount) || 0, confirmedCourses.length)
    : Math.max(Number(enrolledCount) || 0, confirmedCourses.length);

  if (
    confirmedCourses.length > 0
    && effectiveConfirmedCount > 0
    && confirmedCourses.every((c) => c.status === 'Completed')
    && (progress.totalSessions === 0 || progress.completedSessions >= progress.totalSessions)
  ) {
    return CLASS_META_BY_ID.Completed;
  }

  // Zero confirmed paid learners -> still Recruiting (never falsely "Sắp diễn ra" or "Đang học")
  if (effectiveConfirmedCount < 1) {
    return CLASS_META_BY_ID.Recruiting;
  }

  const list = Array.isArray(sessions) ? sessions : [];
  const validSessions = list.filter(
    (s) => s && !LIFECYCLE_CANCELLED_SESSION_STATUSES.has(String(s.status || '').trim()),
  );
  const validStartTimes = validSessions
    .map((s) => parseUtcDate(s.scheduledAt || s.startTime)?.getTime())
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);

  const fallbackStartDate = startsAt ? parseUtcDate(startsAt) : null;
  const fallbackStartMs = fallbackStartDate ? fallbackStartDate.getTime() : NaN;
  const firstValidStartMs = validStartTimes.length > 0
    ? validStartTimes[0]
    : (list.length === 0 ? fallbackStartMs : NaN);

  const hasLiveSession = validSessions.some(
    (s) => s.isSessionLive === true || Boolean(s.sessionStartedAtUtc),
  );

  const cutoffDate = enrollmentClosesAtUtc ? parseUtcDate(enrollmentClosesAtUtc) : null;
  const cutoffMs = cutoffDate ? cutoffDate.getTime() : NaN;
  const closedAtDate = enrollmentClosedAtUtc ? parseUtcDate(enrollmentClosedAtUtc) : null;
  const closedAtMs = closedAtDate ? closedAtDate.getTime() : NaN;
  const isEnrollmentClosed = Number.isFinite(closedAtMs) && closedAtMs <= nowMs;
  const isEnrollmentStillOpen = !isEnrollmentClosed && Number.isFinite(cutoffMs) && cutoffMs > nowMs;
  const effectiveCapacity = Math.max(0, Number(capacity ?? maxLearners ?? 0) || 0);

  if (
    progress.completedSessions > 0
    || hasLiveSession
    || (Number.isFinite(firstValidStartMs) && firstValidStartMs <= nowMs)
  ) {
    return CLASS_META_BY_ID.Teaching;
  }

  if (progress.completedSessions === 0 && isEnrollmentStillOpen) {
    if (effectiveCapacity > 0 && effectiveConfirmedCount >= effectiveCapacity) {
      return CLASS_META_BY_ID.Full;
    }
    return CLASS_META_BY_ID.Recruiting;
  }

  return CLASS_META_BY_ID.Upcoming;
}

/**
 * Resolves the canonical Class Lifecycle status for a learner `StudyCourse` DTO
 * using its cohort metadata and session records (never inferring "Đang học" from payment alone).
 */
export function resolveCourseLifecycle(course, nowMs = Date.now(), cohort = null) {
  if (!course) return CLASS_META_BY_ID.Recruiting;
  if (course.status === 'Transferred') {
    return { id: 'Transferred', label: 'Đã chuyển lớp', tone: 'info' };
  }
  const confirmed = isConfirmedClassEnrollment(course);
  if (!confirmed) {
    if (course.status === 'Cancelled' || course.status === 'PaymentExpired' || course.status === 'PaymentFailed') {
      return CLASS_META_BY_ID.Cancelled;
    }
    return CLASS_META_BY_ID.Recruiting;
  }

  const sessions = Array.isArray(course.sessions) && course.sessions.length > 0
    ? course.sessions
    : (Array.isArray(cohort?.sessions) ? cohort.sessions : []);

  return resolveClassLifecycleStatus({
    cohortStatus: cohort?.status ?? course.cohortStatus ?? (course.status === 'Completed' ? 'Completed' : 'Published'),
    confirmedEnrolledCount: cohort?.confirmedEnrolledCount ?? course.cohortConfirmedEnrolledCount ?? 1,
    capacity: cohort?.capacitySnapshot ?? cohort?.capacity ?? course.cohortCapacity ?? course.capacitySnapshot ?? null,
    startsAt: cohort?.startsAt ?? course.cohortFirstSessionStartUtc ?? course.startsAt,
    enrollmentClosesAtUtc: cohort?.enrollmentClosesAtUtc ?? course.cohortEnrollmentClosesAtUtc ?? null,
    totalSessions: cohort?.totalSessions ?? course.totalSessions ?? 0,
    sessions,
    enrolledCourses: [course],
    nowMs,
  });
}

/**
 * Determines whether a cohort is eligible to project official teaching sessions onto /work-schedule/ and Quick Calendar:
 * - Cohort must not be Cancelled or Draft.
 * - Enrollment must be closed (or cohort already Started/Completed).
 * - At least 1 confirmed paid learner is enrolled (pending checkout holds never count).
 */
export function isCohortEligibleForWorkSchedule(
  cohort,
  {
    confirmedEnrolledCount = null,
    enrolledCourses = [],
    sessions = [],
    nowMs = Date.now(),
  } = {},
) {
  if (!cohort) return false;
  const normalized = String(cohort.status || '').trim();
  if (!normalized || normalized === 'Cancelled' || normalized === 'Draft') {
    return false;
  }

  const confirmedCourses = (Array.isArray(enrolledCourses) ? enrolledCourses : []).filter(isConfirmedClassEnrollment);
  const effectiveConfirmedCount = confirmedEnrolledCount != null
    ? Math.max(Number(confirmedEnrolledCount) || 0, confirmedCourses.length)
    : Math.max(Number(cohort.confirmedEnrolledCount ?? 0) || 0, confirmedCourses.length);
  if (effectiveConfirmedCount < 1) {
    return false;
  }

  const progress = computeClassProgress(sessions);
  const startMs = cohort.startsAt ? (parseUtcDate(cohort.startsAt)?.getTime() ?? NaN) : NaN;
  const cutoffMs = cohort.enrollmentClosesAtUtc ? (parseUtcDate(cohort.enrollmentClosesAtUtc)?.getTime() ?? NaN) : NaN;
  const enrollmentClosed = normalized === 'Completed'
    || progress.completedSessions > 0
    || (Number.isFinite(cutoffMs) ? cutoffMs <= nowMs : (Number.isFinite(startMs) && startMs <= nowMs))
    || (Number.isFinite(startMs) && startMs <= nowMs);

  if (!enrollmentClosed) {
    return false;
  }

  // Respect explicit backend eligibility guard when enrollment closes dynamically hasn't flipped yet
  if (cohort.isWorkScheduleEligible === false && Number.isFinite(cutoffMs) && cutoffMs > nowMs && progress.completedSessions === 0) {
    return false;
  }

  return true;
}

/**
 * Canonical 5-status filter for /work-schedule/:
 * Sắp diễn ra (Xám) · Đang diễn ra (Vàng) · Đã hoàn thành (Xanh lá) · Đã hủy (Đỏ) · Đã đổi lịch (Xanh biển).
 */
export const WORK_SCHEDULE_STATUS_OPTIONS = Object.freeze([
  { id: 'ALL', label: 'Tất cả', dot: 'bg-[#CE476D]', tone: 'workUpcoming' },
  { id: 'upcoming', label: 'Sắp diễn ra', dot: 'bg-[#6B7280]', tone: 'workUpcoming' },
  { id: 'live', label: 'Đang diễn ra', dot: 'bg-[#D97706]', tone: 'workLive' },
  { id: 'completed', label: 'Đã hoàn thành', dot: 'bg-[#16A34A]', tone: 'workCompleted' },
  { id: 'cancelled', label: 'Đã hủy', dot: 'bg-[#DC2626]', tone: 'workCancelled' },
  { id: 'rescheduled', label: 'Đã đổi lịch', dot: 'bg-[#2563EB]', tone: 'workRescheduled' },
]);

/**
 * Strict official teaching session classifier for /work-schedule/ and Quick Calendar:
 * - Includes Cancelled & Rescheduled historical session cards on /work-schedule/ (`includeHistoricalStatuses: true`).
 * - NEVER auto-transitions to `live` solely from wall-clock without real room/session start data.
 * - NEVER auto-transitions to `completed` solely because session end time passed.
 */
export function resolveWorkScheduleSessionStatus({
  status = 'Scheduled',
  cohortStatus = '',
  sessionCompleted = false,
  wasRescheduled = false,
  isSessionLive = false,
  sessionStartedAtUtc = null,
  startMs = NaN,
  endMs = NaN,
  nowMs = Date.now(),
  includeHistoricalStatuses = false,
} = {}) {
  const normalized = String(status || '').trim();
  const normalizedCohort = String(cohortStatus || '').trim();
  if (wasRescheduled === true || normalized === 'Rescheduled') {
    return {
      id: 'rescheduled',
      label: 'Đã đổi lịch',
      tone: 'workRescheduled',
      visibleOnWorkSchedule: Boolean(includeHistoricalStatuses),
      isCompleted: false,
      isLive: false,
      awaitingConfirmation: false,
    };
  }
  if (
    normalized === 'Cancelled'
    || normalized === 'CancelledByMentor'
    || normalized === 'CancelledByLearner'
    || normalizedCohort === 'Cancelled'
    || normalizedCohort === 'Draft'
  ) {
    return {
      id: 'cancelled',
      label: 'Đã hủy',
      tone: 'workCancelled',
      visibleOnWorkSchedule: Boolean(includeHistoricalStatuses && normalizedCohort !== 'Draft'),
      isCompleted: false,
      isLive: false,
      awaitingConfirmation: false,
    };
  }

  if (
    sessionCompleted === true
    || normalized === 'Completed'
    || normalized === 'Present'
    || normalized === 'Absent'
    || normalized === 'ExcusedAbsent'
  ) {
    return {
      id: 'completed',
      label: 'Đã hoàn thành',
      tone: 'workCompleted',
      visibleOnWorkSchedule: true,
      isCompleted: true,
      isLive: false,
      awaitingConfirmation: false,
    };
  }

  const withinLiveWindow = (!Number.isFinite(startMs) || nowMs >= startMs - 15 * 60_000)
    && (!Number.isFinite(endMs) || nowMs <= endMs);
  if ((isSessionLive === true || Boolean(sessionStartedAtUtc && isSessionLive !== false)) && withinLiveWindow) {
    return {
      id: 'live',
      label: 'Đang diễn ra',
      tone: 'workLive',
      visibleOnWorkSchedule: true,
      isCompleted: false,
      isLive: true,
      awaitingConfirmation: false,
    };
  }

  // Past end time without completion confirmation -> hide from active teaching schedule (defer to Attendance/KPI)
  if (Number.isFinite(endMs) && nowMs > endMs) {
    return {
      id: 'overdue_unhandled',
      label: 'Chờ xử lý sau giờ học',
      tone: 'cancelled',
      visibleOnWorkSchedule: false,
      isCompleted: false,
      isLive: false,
      awaitingConfirmation: true,
    };
  }

  return {
    id: 'upcoming',
    label: 'Sắp diễn ra',
    tone: 'workUpcoming',
    visibleOnWorkSchedule: true,
    isCompleted: false,
    isLive: false,
    awaitingConfirmation: false,
  };
}

/**
 * Separated Teaching Session Lifecycle statuses (managed in Lịch làm việc — WorkSchedule).
 * Never leaked into the Teaching Registration Calendar status filter.
 */
export const TEACHING_SESSION_STATUSES = Object.freeze([
  { id: 'ALL', label: 'Tất cả', dot: 'bg-[#CE476D]', tone: 'session' },
  { id: 'upcoming', label: 'Sắp diễn ra', dot: 'bg-[#2F9B6B]', tone: 'session' },
  { id: 'live', label: 'Đang diễn ra', dot: 'bg-[#E4A020]', tone: 'live' },
  { id: 'completed', label: 'Đã hoàn thành', dot: 'bg-[#16A34A]', tone: 'present' },
  { id: 'rescheduled', label: 'Đã đổi lịch', dot: 'bg-[#477FDC]', tone: 'rescheduled' },
  { id: 'cancelled', label: 'Đã hủy', dot: 'bg-[#8B8B97]', tone: 'cancelled' },
]);

/**
 * Classifies a real teaching session strictly from verified lifecycle/attendance state:
 * - NEVER auto-marks a session `completed` solely because `endMs <= nowMs`.
 * - Flags `awaitingConfirmation: true` when end time has passed without attendance confirmation.
 */
export function resolveTeachingSessionStatus({
  status = 'Scheduled',
  cohortStatus = '',
  sessionCompleted = false,
  wasRescheduled = false,
  startMs = NaN,
  endMs = NaN,
  nowMs = Date.now(),
} = {}) {
  const normalized = String(status || '').trim();
  if (
    normalized === 'Cancelled'
    || normalized === 'CancelledByMentor'
    || normalized === 'CancelledByLearner'
    || String(cohortStatus || '').trim() === 'Cancelled'
  ) {
    return {
      id: 'cancelled',
      label: 'Đã hủy',
      tone: 'cancelled',
      isCompleted: false,
      awaitingConfirmation: false,
    };
  }

  if (sessionCompleted === true || normalized === 'Completed') {
    return {
      id: 'completed',
      label: 'Đã hoàn thành',
      tone: 'present',
      isCompleted: true,
      awaitingConfirmation: false,
    };
  }

  if (wasRescheduled === true || normalized === 'Rescheduled') {
    return {
      id: 'rescheduled',
      label: 'Đã đổi lịch',
      tone: 'rescheduled',
      isCompleted: false,
      awaitingConfirmation: false,
    };
  }

  if (Number.isFinite(startMs) && Number.isFinite(endMs) && nowMs >= startMs && nowMs <= endMs) {
    return {
      id: 'live',
      label: 'Đang diễn ra',
      tone: 'live',
      isCompleted: false,
      awaitingConfirmation: false,
    };
  }

  const awaitingConfirmation = Number.isFinite(endMs) && endMs < nowMs;
  return {
    id: 'upcoming',
    label: awaitingConfirmation ? 'Chờ xác nhận hoàn thành' : 'Sắp diễn ra',
    tone: 'session',
    isCompleted: false,
    awaitingConfirmation,
  };
}

const VALID_ROOM_GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ZERO_ROOM_GUID = '00000000-0000-0000-0000-000000000000';
const WORK_CANCELLED_SESSION_STATUSES = new Set(['Cancelled', 'CancelledByMentor', 'CancelledByLearner']);
const WORK_COMPLETED_SESSION_STATUSES = new Set(['Present', 'Absent', 'ExcusedAbsent', 'Completed']);

function extractRoomIdFromSession(cohortSession, matchedCourseSessions = []) {
  const rawRoom = String(cohortSession?.roomId || '').trim();
  if (rawRoom && rawRoom !== ZERO_ROOM_GUID && VALID_ROOM_GUID_RE.test(rawRoom)) {
    return rawRoom;
  }
  for (const s of matchedCourseSessions) {
    const match = String(s?.meetingUrl || '').match(/\/meeting-room\/([0-9a-f-]+)/i);
    if (match && match[1] && match[1] !== ZERO_ROOM_GUID) {
      return match[1];
    }
  }
  return null;
}

/**
 * Canonical builder for official teaching sessions shown on /work-schedule/ and Quick Calendar.
 * Strictly isolates to mentorId (when provided), excludes recruiting/0-learner/cancelled/draft cohorts,
 * excludes unpaid checkout holds from headcount, deduplicates rescheduled attempts by session number,
 * and omits cancelled or unhandled overdue exceptions.
 */
export function buildMentorWorkScheduleSessions({
  cohorts = [],
  courses = [],
  defaultSessionMinutes = 90,
  mentorId = null,
  nowMs = Date.now(),
  includeHistoricalStatuses = false,
} = {}) {
  const safeCohorts = Array.isArray(cohorts) ? cohorts : [];
  const safeCourses = Array.isArray(courses) ? courses : [];
  const hasMentorFilter = mentorId != null && mentorId !== '' && mentorId !== 'anon' && Number.isFinite(Number(mentorId));
  const numericMentorId = hasMentorFilter ? Number(mentorId) : null;

  const coursesByCohortId = new Map();
  for (const c of safeCourses) {
    if (!c || !c.cohortId) continue;
    if (numericMentorId != null && c.mentorId != null && Number(c.mentorId) !== numericMentorId) {
      continue;
    }
    const key = Number(c.cohortId);
    if (!coursesByCohortId.has(key)) coursesByCohortId.set(key, []);
    coursesByCohortId.get(key).push(c);
  }

  const items = [];
  for (const cohort of safeCohorts) {
    if (!cohort || !cohort.id) continue;
    if (numericMentorId != null && cohort.mentorId != null && Number(cohort.mentorId) !== numericMentorId) {
      continue;
    }

    const cohortCourses = coursesByCohortId.get(Number(cohort.id)) || [];
    const confirmedCourses = cohortCourses.filter(isConfirmedClassEnrollment);
    const rawSessions = Array.isArray(cohort.sessions) ? cohort.sessions : [];

    // Deduplicate official sessions per logical session number
    const canonicalByNumber = new Map();
    for (const s of rawSessions) {
      if (!s) continue;
      const num = Number(s.number ?? s.sessionNumber ?? 0);
      if (!Number.isFinite(num) || num <= 0) continue;
      canonicalByNumber.set(num, s);
    }
    const canonicalSessions = [...canonicalByNumber.values()].sort((a, b) => Number(a.number) - Number(b.number));
    if (canonicalSessions.length === 0) continue;

    // Collect course sessions indexed for eligibility pre-check and attendance summary
    const enrichedSessionsForEligibility = canonicalSessions.map((cs) => {
      const matched = [];
      for (const course of confirmedCourses) {
        const cSessions = Array.isArray(course.sessions) ? course.sessions : [];
        let target = cs.availabilityId != null
          ? cSessions.find((s) => s && s.availabilityId != null && Number(s.availabilityId) === Number(cs.availabilityId))
          : null;
        if (!target) {
          const sameNum = cSessions.filter((s) => s && Number(s.number) === Number(cs.number));
          if (sameNum.length > 0) {
            sameNum.sort((a, b) => Number(b.attempt || 1) - Number(a.attempt || 1));
            target = sameNum[0];
          }
        }
        if (target) matched.push({ course, session: target });
      }
      const completed = cohort.status === 'Completed'
        || Boolean(cs.sessionCompleted)
        || (matched.length > 0 && matched.every((m) => WORK_COMPLETED_SESSION_STATUSES.has(m.session?.status)));
      return { ...cs, sessionCompleted: completed, _matched: matched };
    });

    if (!isCohortEligibleForWorkSchedule(cohort, {
      confirmedEnrolledCount: cohort.confirmedEnrolledCount,
      enrolledCourses: confirmedCourses,
      sessions: enrichedSessionsForEligibility,
      nowMs,
    })) {
      continue;
    }

    const mins = Number(cohort.sessionMinutes) || Number(confirmedCourses[0]?.sessionMinutes) || Number(defaultSessionMinutes) || 90;
    const capacity = Number(cohort.capacitySnapshot ?? cohort.capacity ?? confirmedCourses[0]?.capacity ?? 0) || 0;
    const confirmedEnrolledCount = Math.max(Number(cohort.confirmedEnrolledCount ?? 0) || 0, confirmedCourses.length);
    const totalSessions = Number(cohort.totalSessions ?? canonicalSessions.length ?? 0) || canonicalSessions.length;
    const learnerNames = [...new Set(confirmedCourses.map((c) => c.learnerName).filter(Boolean))];

    for (const cs of enrichedSessionsForEligibility) {
      const startIso = cs.scheduledAt || cs.startTime;
      const startDate = parseUtcDate(startIso);
      if (!startDate || Number.isNaN(startDate.getTime())) continue;
      const startMs = startDate.getTime();
      const endDate = parseUtcDate(cs.endTime || cs.endsAt) || new Date(startMs + mins * 60_000);
      const endMs = endDate.getTime();

      const matchedSessions = cs._matched.map((m) => m.session);
      const attendanceSummary = {
        presentCount: 0,
        absentCount: 0,
        excusedCount: 0,
        cancelledCount: 0,
        scheduledCount: 0,
        confirmedCount: 0,
        totalRecords: matchedSessions.length,
      };
      for (const m of matchedSessions) {
        const st = String(m?.status || 'Scheduled');
        if (st === 'Present') {
          attendanceSummary.presentCount += 1;
          attendanceSummary.confirmedCount += 1;
        } else if (st === 'Absent') {
          attendanceSummary.absentCount += 1;
          attendanceSummary.confirmedCount += 1;
        } else if (st === 'ExcusedAbsent') {
          attendanceSummary.excusedCount += 1;
          attendanceSummary.confirmedCount += 1;
        } else if (WORK_CANCELLED_SESSION_STATUSES.has(st)) {
          attendanceSummary.cancelledCount += 1;
        } else {
          attendanceSummary.scheduledCount += 1;
        }
      }

      const derivedStatus = attendanceSummary.totalRecords > 0
        && attendanceSummary.cancelledCount === attendanceSummary.totalRecords
        ? 'CancelledByMentor'
        : cs.sessionCompleted
          ? 'Completed'
          : 'Scheduled';

      const workStatus = resolveWorkScheduleSessionStatus({
        status: derivedStatus,
        cohortStatus: cohort.status,
        sessionCompleted: Boolean(cs.sessionCompleted),
        isSessionLive: Boolean(cs.isSessionLive),
        sessionStartedAtUtc: cs.sessionStartedAtUtc || null,
        startMs,
        endMs,
        nowMs,
        includeHistoricalStatuses,
      });

      if (!workStatus.visibleOnWorkSchedule) continue;

      const roomId = workStatus.id === 'cancelled' || workStatus.id === 'rescheduled'
        ? null
        : extractRoomIdFromSession(cs, matchedSessions);
      const roomHref = roomId ? `/meeting-room/${roomId}` : null;
      const canJoin = Boolean(roomHref) && (
        workStatus.id === 'live'
        || (workStatus.id === 'upcoming' && nowMs >= startMs - 15 * 60_000 && nowMs < endMs)
      );

      items.push({
        id: cs.availabilityId ? `av-${cs.availabilityId}` : `cohort-${cohort.id}-s${cs.number}`,
        availabilityId: cs.availabilityId || null,
        cohortId: cohort.id,
        mentorId: cohort.mentorId ?? null,
        cohortName: cohort.name || confirmedCourses[0]?.cohortName || 'Lớp nhóm',
        cohortStatus: cohort.status,
        level: cohort.level || confirmedCourses[0]?.level || null,
        sessionNumber: Number(cs.number),
        totalSessions,
        capacity,
        confirmedEnrolledCount,
        enrolledCount: confirmedEnrolledCount,
        learnerNames,
        scheduledAt: startIso,
        startTime: startIso,
        endTime: endDate.toISOString(),
        startMs,
        endMs,
        sessionMinutes: mins,
        roomId,
        roomHref,
        meetingUrl: roomHref,
        canJoin,
        isSessionLive: Boolean(cs.isSessionLive),
        sessionStartedAtUtc: cs.sessionStartedAtUtc || null,
        sessionCompleted: workStatus.isCompleted,
        attendanceSummary: attendanceSummary.totalRecords > 0 ? attendanceSummary : null,
        workStatus,
      });
    }

    if (includeHistoricalStatuses && Array.isArray(cohort.rescheduledHistorySessions)) {
      for (const oldHist of cohort.rescheduledHistorySessions) {
        if (!oldHist) continue;
        const histStartIso = oldHist.startTime || oldHist.scheduledAt;
        const histStartDate = parseUtcDate(histStartIso);
        if (!histStartDate || Number.isNaN(histStartDate.getTime())) continue;
        const histStartMs = histStartDate.getTime();
        const histEndDate = parseUtcDate(oldHist.endTime || oldHist.endsAt) || new Date(histStartMs + mins * 60_000);
        const histEndMs = histEndDate.getTime();
        const histWorkStatus = resolveWorkScheduleSessionStatus({
          status: 'Rescheduled',
          cohortStatus: cohort.status,
          wasRescheduled: true,
          startMs: histStartMs,
          endMs: histEndMs,
          nowMs,
          includeHistoricalStatuses: true,
        });
        if (!histWorkStatus.visibleOnWorkSchedule) continue;

        items.push({
          id: `resched-${cohort.id}-${oldHist.availabilityId || histStartMs}`,
          availabilityId: oldHist.availabilityId || null,
          cohortId: cohort.id,
          mentorId: cohort.mentorId ?? null,
          cohortName: cohort.name || confirmedCourses[0]?.cohortName || 'Lớp nhóm',
          cohortStatus: cohort.status,
          level: cohort.level || confirmedCourses[0]?.level || null,
          sessionNumber: null,
          totalSessions,
          capacity,
          confirmedEnrolledCount,
          enrolledCount: confirmedEnrolledCount,
          learnerNames,
          scheduledAt: histStartIso,
          startTime: histStartIso,
          endTime: histEndDate.toISOString(),
          startMs: histStartMs,
          endMs: histEndMs,
          sessionMinutes: mins,
          roomId: null,
          roomHref: null,
          meetingUrl: null,
          canJoin: false,
          isSessionLive: false,
          sessionStartedAtUtc: null,
          sessionCompleted: false,
          isHistoricalRescheduled: true,
          changeResolution: oldHist.changeResolution || null,
          attendanceSummary: null,
          workStatus: histWorkStatus,
        });
      }
    }
  }

  return items.sort((a, b) => a.startMs - b.startMs || Number(a.sessionNumber) - Number(b.sessionNumber));
}
