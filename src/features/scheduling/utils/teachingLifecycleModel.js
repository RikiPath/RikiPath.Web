import { parseUtcDate } from '@/utils/vnDateTime.js';

/**
 * Separated Class Lifecycle statuses (managed in Lớp đang phụ trách — MentorClassWorkspace).
 * Maps existing Backend `StudyCohort.Status` + active enrollment + start/completion data
 * without modifying Backend enums or database schemas.
 */
export const CLASS_LIFECYCLE_STATUSES = Object.freeze([
  { id: 'Recruiting', label: 'Đang tuyển sinh', tone: 'info' },
  { id: 'Upcoming', label: 'Sắp khai giảng', tone: 'warning' },
  { id: 'Teaching', label: 'Đang giảng dạy', tone: 'success' },
  { id: 'Completed', label: 'Đã hoàn thành', tone: 'neutral' },
  { id: 'Cancelled', label: 'Đã hủy', tone: 'danger' },
]);

const CLASS_META_BY_ID = Object.freeze(
  Object.fromEntries(CLASS_LIFECYCLE_STATUSES.map((item) => [item.id, item]))
);

/**
 * Computes actual verified course progress from session records (never inferring completion from elapsed time).
 */
export function computeClassProgress(sessions = [], totalSessionsOverride = 0) {
  const list = Array.isArray(sessions) ? sessions : [];
  const totalSessions = Math.max(Number(totalSessionsOverride) || 0, list.length);
  const completedSessions = list.filter((s) => (
    s?.sessionCompleted === true
    || s?.status === 'Completed'
    || s?.status === 'Present'
    || s?.status === 'Absent'
    || s?.status === 'ExcusedAbsent'
  )).length;
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
 * Derives the canonical Class Lifecycle status for a group class (`StudyCohort`):
 * - `Cancelled`: Cohort cancelled per valid cancellation workflow.
 * - `Completed`: Cohort reached official `Completed` status (never solely because clock elapsed or partial sessions done).
 * - `Recruiting`: Published/Open cohort that does not yet have valid paid/active learners enrolled.
 * - `Upcoming` ("Sắp khai giảng"): Cohort meets opening requirements (>= 1 valid learner enrolled, 1-4 learners) and awaits first session.
 * - `Teaching` ("Đang giảng dạy"): Cohort with valid learners that has started (`startsAt <= nowMs` or >= 1 verified session) and is not yet completed.
 */
export function resolveClassLifecycleStatus({
  cohortStatus = '',
  enrolledCount = 0,
  startsAt = null,
  sessions = [],
  enrolledCourses = [],
  nowMs = Date.now(),
} = {}) {
  const normalized = String(cohortStatus || '').trim();
  if (normalized === 'Cancelled') {
    return CLASS_META_BY_ID.Cancelled;
  }
  if (normalized === 'Completed') {
    return CLASS_META_BY_ID.Completed;
  }

  const validEnrolled = Math.max(
    Number(enrolledCount) || 0,
    (enrolledCourses || []).filter((c) => c && c.status !== 'Cancelled' && c.status !== 'PendingPayment').length
  );

  // If all enrolled courses are officially Completed (and at least 1 exists), class is Completed
  if (
    enrolledCourses.length > 0
    && validEnrolled > 0
    && enrolledCourses
      .filter((c) => c && c.status !== 'Cancelled' && c.status !== 'PendingPayment')
      .every((c) => c.status === 'Completed')
  ) {
    return CLASS_META_BY_ID.Completed;
  }

  // No valid learners enrolled yet -> still Recruiting (never falsely "Sắp khai giảng")
  if (validEnrolled <= 0) {
    return CLASS_META_BY_ID.Recruiting;
  }

  const progress = computeClassProgress(sessions);
  const startDate = startsAt ? parseUtcDate(startsAt) : null;
  const startMs = startDate ? startDate.getTime() : NaN;
  const hasActiveCourse = (enrolledCourses || []).some((c) => c?.status === 'Active');

  if (progress.completedSessions > 0 || (Number.isFinite(startMs) && startMs <= nowMs) || (normalized === 'Active' && hasActiveCourse && (!Number.isFinite(startMs) || startMs <= nowMs))) {
    return CLASS_META_BY_ID.Teaching;
  }

  return CLASS_META_BY_ID.Upcoming;
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
