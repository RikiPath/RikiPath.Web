// Tiện ích thuần cho phần tổng kết khóa học (tách khỏi file component để giữ fast-refresh).
import { holdSecondsLeft } from '@/features/checkout/utils/hold.js';

export const COMPLETION_NOTE =
  'Bản tổng kết này ghi nhận quá trình học tại RikiPath, không phải chứng chỉ JLPT chính thức.';

const DELIVERED = new Set(['Present', 'Absent', 'ExcusedAbsent', 'Delivered', 'Completed']);

/** Mentor chỉ được đánh giá khi đã trực tiếp dạy ít nhất một buổi đã diễn ra. */
export function reviewableMentors(summary) {
  if (!summary) return [];
  const attendance = summary.attendance || [];
  return (summary.mentors || []).filter((m) => {
    const numbers = m.sessionNumbers || [];
    if (!numbers.length) return false;
    if (!attendance.length) return (summary.sessions?.delivered ?? 0) > 0;
    return numbers.some((n) => attendance.some((a) => Number(a.number) === Number(n) && DELIVERED.has(a.status)));
  });
}

/** Khóa đã bắt đầu khi có buổi đã diễn ra hoặc thời điểm bắt đầu đã qua (nowMs > 0 mới so sánh). */
export function courseHasStarted(course, nowMs) {
  if (!course) return false;
  if ((course.sessions || []).some((s) => DELIVERED.has(s.status))) return true;
  if (!nowMs || !course.startsAt) return false;
  const start = new Date(course.startsAt).getTime();
  return !Number.isNaN(start) && start <= nowMs;
}

const CONFIRMED_COURSE_STATUSES = new Set([
  'Ready',
  'Active',
  'Completed',
  'Transferred',
]);

/** Ghi danh chỉ được mở không gian lớp sau khi Backend xác nhận thanh toán và trạng thái khóa hợp lệ. */
export function isConfirmedCourseAccess(course) {
  if (!course) return false;
  const paid = course.paymentStatus === 'Paid' || course.paymentStatus === 'PartiallyRefunded';
  return paid && CONFIRMED_COURSE_STATUSES.has(course.status);
}

/** Khóa đang giữ chỗ chờ thanh toán PayOS và vẫn còn thời gian giữ chỗ hợp lệ. */
export function isPendingPaymentCourse(course, nowMs = Date.now()) {
  if (!course) return false;
  if (course.paymentStatus !== 'Pending' || course.status !== 'PendingPayment') return false;
  if (!course.paymentExpiresAt) return true;
  const left = holdSecondsLeft(course.paymentExpiresAt, nowMs);
  return left === null || left > 0;
}

/** Chỉ hiển thị trên /my-courses/ khi đang giữ chỗ còn hạn hoặc đã xác nhận ghi danh có hiệu lực. */
export function isVisibleInMyCourses(course, nowMs = Date.now()) {
  return isPendingPaymentCourse(course, nowMs) || isConfirmedCourseAccess(course);
}
