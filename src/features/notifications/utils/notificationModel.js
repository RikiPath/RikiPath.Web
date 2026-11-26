// Pure semantic classification, actionability, echo suppression, and centralized
// smart deep-link resolution for RikiPath Global Notification System (unit-tested in Node).

import { notificationDestination } from './notificationDedupe.js';

const ROLE_HOMES = Object.freeze({
  Admin: '/admin/dashboard/',
  Mentor: '/mentor-dashboard/',
  ContentAuthor: '/author-dashboard/',
  Learner: '/dashboard/',
});

const ROLE_PREFIXES = Object.freeze({
  Admin: ['/admin/'],
  Mentor: ['/mentor-', '/work-schedule', '/meeting/'],
  ContentAuthor: ['/author-', '/manual-content', '/bulk-import', '/content-', '/exam-builder', '/question-bank', '/srs-templates'],
  Learner: ['/dashboard', '/daily-srs', '/homework', '/study-courses', '/calendar', '/mock-test', '/roadmap-jlpt', '/lesson', '/kanji', '/notebook', '/account-profile', '/payment', '/meeting/'],
});

const SHARED_ROUTES = ['/account-profile', '/settings', '/notifications', '/meeting/'];

function normalizeRoleKey(role) {
  const raw = String(role || '').trim().toLowerCase();
  if (raw === 'admin' || raw === 'administrator') return 'Admin';
  if (raw === 'mentor' || raw === 'consultant' || raw === 'teacher') return 'Mentor';
  if (raw === 'contentauthor' || raw === 'content_author' || raw === 'author' || raw === 'contentmanager') return 'ContentAuthor';
  return 'Learner';
}

export function roleHomeFor(role) {
  return ROLE_HOMES[normalizeRoleKey(role)] || '/dashboard/';
}

/**
 * Classifies any notification into the 4 semantic categories:
 * - success (emerald)
 * - error (red)
 * - warning / action-required (amber)
 * - info (sky blue)
 * Never relies on color alone (always returns explicit iconName + label).
 */
export function classifyNotification(item) {
  const type = String(item?.type || '').trim().toLowerCase();
  const title = String(item?.title || '').trim().toLowerCase();
  const message = String(item?.message || '').trim().toLowerCase();
  const text = `${title} ${message}`;

  // Error / Rejected — Red
  if (
    type.includes('reject')
    || type.includes('fail')
    || type.includes('cancel')
    || type === 'content_rejected_partial'
    || /bị từ chối|chưa được phê duyệt|từ chối|đã hủy|thất bại|không được chấp thuận/.test(text)
  ) {
    return {
      category: 'error',
      iconName: 'x-circle',
      label: 'Từ chối / Hủy',
      iconBoxClass: 'border-red-200 bg-red-50 text-red-700',
      badgeClass: 'border-red-200 bg-red-50 text-red-700',
      dotClass: 'bg-red-500',
      unreadBgClass: 'bg-red-50/45 hover:bg-red-50/80',
      toastTone: 'error',
    };
  }

  // Action Required / Warning — Amber
  if (
    type === 'content_approval_pending'
    || type === 'mentorverification'
    || type === 'srsreminder'
    || type === 'homework'
    || type.includes('changesrequested')
    || type.includes('reminder')
    || type.includes('complaint')
    || type.includes('dispute')
    || type.includes('transfer')
    || type.includes('replacement')
    || /cần bổ sung|yêu cầu bổ sung|chờ xét duyệt|chờ duyệt|cần xem xét|cần kiểm duyệt|sắp đến giờ|sắp đến hạn|đến hạn|yêu cầu điều chỉnh|yêu cầu đổi|yêu cầu hủy|cần chấm/.test(text)
  ) {
    return {
      category: 'warning',
      iconName: 'alert-triangle',
      label: 'Cần xử lý',
      iconBoxClass: 'border-amber-200 bg-amber-50 text-amber-700',
      badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
      dotClass: 'bg-amber-500',
      unreadBgClass: 'bg-amber-50/45 hover:bg-amber-50/80',
      toastTone: 'warning',
    };
  }

  // Success — Emerald
  if (
    type === 'content_approved_all'
    || type.includes('approved')
    || type.includes('payment_success')
    || type.includes('completed')
    || /đã được phê duyệt|đã được duyệt|phê duyệt thành công|thanh toán thành công|đã chấm bài|đã hoàn thành|xác minh thành công|đăng ký lớp thành công/.test(text)
  ) {
    return {
      category: 'success',
      iconName: 'check-circle',
      label: 'Thành công',
      iconBoxClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      dotClass: 'bg-emerald-500',
      unreadBgClass: 'bg-emerald-50/45 hover:bg-emerald-50/80',
      toastTone: 'success',
    };
  }

  // Information — Sky Blue
  return {
    category: 'info',
    iconName: 'info',
    label: 'Thông tin',
    iconBoxClass: 'border-sky-200 bg-sky-50 text-sky-700',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-800',
    dotClass: 'bg-sky-500',
    unreadBgClass: 'bg-sky-50/45 hover:bg-sky-50/80',
    toastTone: 'info',
  };
}

/**
 * Determines whether a notification belongs in the "Cần xử lý" filter tab.
 * Read notifications are no longer pending user attention; unread action-required
 * or rejection notifications requiring follow-up surface under "Cần xử lý".
 */
export function isNotificationActionable(item) {
  if (!item || item.isRead) return false;
  const cls = classifyNotification(item);
  if (cls.category === 'warning' || cls.category === 'error') return true;
  const type = String(item.type || '').trim().toLowerCase();
  return (
    type === 'mentorverification'
    || type === 'content_approval_pending'
    || type === 'srsreminder'
    || type === 'homework'
  );
}

/**
 * Prevents duplicate noisy toasts when the current user just triggered an action
 * (e.g. submitting a teaching proposal) and already received an immediate action toast.
 * Still persists in Notification Center and updates unread counters.
 */
export function isSelfActionEchoNotification(item) {
  const title = String(item?.title || '').trim().toLowerCase();
  return title === 'đã gửi đề xuất mở lớp jlpt' || title === 'hồ sơ giáo viên đã được xử lý' || title === 'hồ sơ cố vấn đã được xử lý';
}

/**
 * Centralized Smart Notification Navigation Resolver.
 * Validates internal-only routing (anti open-redirect), normalizes legacy paths & query params,
 * enforces role authorization, and returns structured deep-link metadata + safe fallback.
 */
export function resolveNotificationNavigation(item, currentRole = null) {
  const roleKey = normalizeRoleKey(currentRole);
  const fallbackUrl = roleHomeFor(roleKey);
  const rawUrl = String(item?.linkUrl || '').trim();

  if (!rawUrl) {
    return {
      url: '',
      allowed: false,
      fallbackUrl,
      entityType: null,
      entityId: null,
      reason: '',
    };
  }

  // Strictly block external URLs, protocol-relative URLs, javascript:, data:, etc.
  if (!rawUrl.startsWith('/') || rawUrl.startsWith('//') || /^[a-z]+:/i.test(rawUrl)) {
    return {
      url: '',
      allowed: false,
      fallbackUrl,
      entityType: null,
      entityId: null,
      reason: 'Liên kết thông báo không hợp lệ.',
    };
  }

  let resolved = notificationDestination(rawUrl);
  if (!resolved) {
    return {
      url: '',
      allowed: false,
      fallbackUrl,
      entityType: null,
      entityId: null,
      reason: 'Thông tin này không còn khả dụng hoặc đã được cập nhật.',
    };
  }

  // Canonicalize Admin Mentor Schedules deep link (strip legacy tab=proposals since legacy tabs were removed)
  const [rawPath, rawQuery = ''] = resolved.split('?');
  const normalizedPath = rawPath.endsWith('/') ? rawPath : `${rawPath}/`;
  const params = new URLSearchParams(rawQuery);
  if (normalizedPath === '/admin/mentor-schedules/' && params.get('tab') === 'proposals') {
    params.delete('tab');
  }

  // Normalize query string cleanly
  const qs = params.toString();
  resolved = qs ? `${normalizedPath}?${qs}` : normalizedPath;

  // Enforce role access boundary (never redirect cross-role into forbidden pages)
  if (currentRole) {
    const isShared = SHARED_ROUTES.some((prefix) => normalizedPath.startsWith(prefix));
    const isAdminRoute = normalizedPath.startsWith('/admin/');
    const isAuthorRoute = ROLE_PREFIXES.ContentAuthor.some((prefix) => normalizedPath.startsWith(prefix));
    const isMentorOnlyRoute = normalizedPath.startsWith('/mentor-') || normalizedPath.startsWith('/work-schedule');

    if (isAdminRoute && roleKey !== 'Admin') {
      return {
        url: '',
        allowed: false,
        fallbackUrl,
        entityType: null,
        entityId: null,
        reason: 'Thông tin này không thuộc quyền truy cập của tài khoản hiện tại.',
      };
    }
    if (isAuthorRoute && roleKey !== 'ContentAuthor' && roleKey !== 'Admin' && !isShared) {
      return {
        url: '',
        allowed: false,
        fallbackUrl,
        entityType: null,
        entityId: null,
        reason: 'Thông tin này không thuộc quyền truy cập của tài khoản hiện tại.',
      };
    }
    if (isMentorOnlyRoute && roleKey !== 'Mentor' && roleKey !== 'Admin' && !isShared) {
      return {
        url: '',
        allowed: false,
        fallbackUrl,
        entityType: null,
        entityId: null,
        reason: 'Thông tin này không thuộc quyền truy cập của tài khoản hiện tại.',
      };
    }
  }

  // Extract structured entity metadata for highlighting / analytics
  let entityType = null;
  let entityId = null;
  if (params.get('proposalId')) {
    entityType = 'TeachingProposal';
    entityId = params.get('proposalId');
  } else if (params.get('mentorId')) {
    entityType = 'MentorVerification';
    entityId = params.get('mentorId');
  } else if (params.get('cohortId')) {
    entityType = 'Cohort';
    entityId = params.get('cohortId');
  } else if (params.get('complaintId')) {
    entityType = 'Complaint';
    entityId = params.get('complaintId');
  } else {
    const cohortMatch = normalizedPath.match(/^\/(?:mentor-study-courses|study-courses)\/(\d+)\/$/);
    if (cohortMatch) {
      entityType = 'Cohort';
      entityId = cohortMatch[1];
    }
  }

  return {
    url: resolved,
    allowed: true,
    fallbackUrl,
    entityType,
    entityId,
    reason: '',
  };
}

/**
 * Returns selective TanStack Query keys to invalidate for a given incoming realtime notification
 * so business screens, Global Calendar, and queues update in real time without refetching the entire app.
 */
export function resolveInvalidationKeysForNotification(item) {
  const type = String(item?.type || '').trim().toLowerCase();
  const link = String(item?.linkUrl || '').trim().toLowerCase();
  const keys = [['workspace-calendar']];

  if (
    type === 'mentorschedule'
    || type.includes('attendance')
    || type.includes('meeting')
    || link.includes('mentor-schedules')
    || link.includes('mentor-shift-schedule')
    || link.includes('mentor-requests')
    || link.includes('work-schedule')
  ) {
    keys.push(
      ['mentor-teaching-proposals-context'],
      ['my-mentor-schedule'],
      ['my-availability-slots'],
      ['mentor-scheduling-cohorts'],
      ['mentor-scheduling-courses'],
      ['mentor-work-schedule-cohorts'],
      ['mentor-work-schedule-courses'],
      ['admin-teaching-proposals'],
      ['admin-pending-slots'],
      ['admin-mentor-slots'],
      ['admin-mentor-calendar'],
    );
  }

  if (type === 'mentorverification' || type === 'mentorverificationresult' || link.includes('mentor-verifications') || link.includes('mentor-profile')) {
    keys.push(['admin-mentor-verifications'], ['admin-mentors'], ['mentor-profile']);
  }

  if (type === 'srsreminder' || link.startsWith('/daily-srs')) {
    keys.push(['srs-summary'], ['srs-queue'], ['srs-calendar']);
  }

  if (type === 'homework' || link.includes('/homework') || link.includes('mentor-grading')) {
    keys.push(['learner-homework'], ['mentor-homework'], ['cohort-homework']);
  }

  if (type.startsWith('content_') || link.includes('content-review') || link.includes('author-dashboard')) {
    keys.push(['content-approvals'], ['author-dashboard']);
  }

  if (
    link.includes('study-courses')
    || link.includes('my-courses')
    || link.includes('cohort')
    || type.includes('cohort')
    || type.includes('enrollment')
    || type.includes('payment')
    || type.includes('reschedule')
    || type.includes('cancel')
  ) {
    keys.push(
      ['learner-cohort-workspace'],
      ['homework-hub'],
      ['admin-cohorts'],
      ['mentor-cohorts'],
      ['learner-courses-summary'],
      ['mentor-teaching-proposals-context'],
      ['mentor-scheduling-cohorts'],
      ['mentor-scheduling-courses'],
      ['mentor-work-schedule-cohorts'],
      ['mentor-work-schedule-courses'],
      ['my-availability-slots'],
      ['my-mentor-schedule'],
    );
  }

  return keys;
}
