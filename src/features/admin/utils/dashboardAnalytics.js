import { parseUtcDate } from '@/utils/vnDateTime.js';
import { normalizeAdminRole } from '@/features/admin/utils/adminRoles.js';

export const DASHBOARD_RANGES = [
  { id: '7d', label: '7 ngày qua', days: 7 },
  { id: '30d', label: '30 ngày qua', days: 30 },
  { id: '90d', label: '90 ngày qua', days: 90 },
  { id: 'all', label: 'Tất cả thời gian', days: null },
];

export function computeDateWindow(rangeId, now = new Date()) {
  const found = DASHBOARD_RANGES.find((r) => r.id === rangeId) || DASHBOARD_RANGES[1];
  if (!found.days) return { fromDate: '', toDate: '', startMs: null, days: null };
  const toYmd = (d) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  };
  const end = new Date(now.getTime());
  const start = new Date(now.getTime() - (found.days - 1) * 86400_000);
  return {
    fromDate: toYmd(start),
    toDate: toYmd(end),
    startMs: start.setHours(0, 0, 0, 0),
    days: found.days,
  };
}

function vnDayKey(dateInput) {
  const d = dateInput instanceof Date ? dateInput : parseUtcDate(dateInput);
  if (!d || Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function shortDayLabel(ymd) {
  if (!ymd || ymd.length < 10) return ymd || '—';
  return `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
}

/**
 * Prioritizes Admin "Cần xử lý" items by urgency & volume.
 */
export function buildActionQueueItems(stats = {}, extras = {}) {
  const openComplaints = Number(stats.openComplaints || 0);
  const paymentReview = Number(stats.paymentReviewCourses || 0);
  const slotChanges =
    Number(stats.pendingSlotCancelRequests || 0)
    + Number(stats.pendingSlotChangeRequests || 0)
    + Number(stats.pendingCohortScheduleRequests || 0);
  const pendingVerifs = Number(stats.pendingVerifications || 0);
  const scheduleApprovals = Number(stats.pendingTeachingProposals ?? stats.pendingMentorSchedules ?? 0);
  const pendingTransfers = Number(stats.pendingTransferRequests || 0);
  const pendingRetakes = Number(extras.pendingRetakes || 0);
  const pendingContent = Number(stats.pendingContent || 0);

  const raw = [
    {
      id: 'complaints',
      priority: 1,
      severity: 'critical',
      label: 'Khiếu nại khóa học đang mở',
      hint: 'Cần xác minh và phản hồi cho học viên',
      count: openComplaints,
      to: '/admin/complaints/',
    },
    {
      id: 'paymentReview',
      priority: 2,
      severity: 'critical',
      label: 'Giao dịch cần rà soát',
      hint: 'Đơn đã nhận thanh toán chờ kích hoạt hoặc đối soát',
      count: paymentReview,
      to: '/admin/payments/',
    },
    {
      id: 'scheduleRequests',
      priority: 3,
      severity: 'high',
      label: 'Yêu cầu đổi / hủy lịch',
      hint: 'Đổi giờ dạy, hủy ca hoặc dời buổi lớp nhóm',
      count: slotChanges,
      to: '/admin/schedule-requests/',
    },
    {
      id: 'verifications',
      priority: 4,
      severity: 'high',
      label: 'Hồ sơ Giáo viên chờ duyệt',
      hint: 'Kiểm tra chứng chỉ JLPT và cấp quyền giảng dạy',
      count: pendingVerifs,
      to: '/admin/mentor-verifications/?status=Pending',
    },
    {
      id: 'schedules',
      priority: 5,
      severity: 'medium',
      label: 'Đề xuất mở lớp chờ duyệt',
      hint: 'Xem và phê duyệt đề xuất mở lớp nhóm JLPT',
      count: scheduleApprovals,
      to: '/admin/mentor-schedules/',
    },
    {
      id: 'transfers',
      priority: 6,
      severity: 'medium',
      label: 'Yêu cầu chuyển lớp',
      hint: 'Đối chiếu điều kiện chuyển lớp và chỗ trống',
      count: pendingTransfers,
      to: '/admin/transfers/',
    },
    {
      id: 'retakes',
      priority: 7,
      severity: 'medium',
      label: 'Yêu cầu hỗ trợ ôn lại JLPT',
      hint: 'Xét duyệt minh chứng thi và sắp xếp lớp ôn lại',
      count: pendingRetakes,
      to: '/admin/retake-support/',
    },
    {
      id: 'content',
      priority: 8,
      severity: 'normal',
      label: 'Học liệu chờ phê duyệt',
      hint: 'Bài học, từ vựng, Kanji, ngữ pháp và đề thi',
      count: pendingContent,
      to: '/admin/content-review/',
    },
  ];

  // Actionable items with count > 0 first ordered strictly by priority; zero-count items follow calmly.
  return [...raw].sort((a, b) => {
    const aHas = a.count > 0 ? 0 : 1;
    const bHas = b.count > 0 ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    return a.priority - b.priority;
  });
}

export function buildRevenueSeries(paymentItems = [], days = 30) {
  const byDay = new Map();
  for (const row of paymentItems || []) {
    if (row.status !== 'Paid') continue;
    const key = vnDayKey(row.paidAtUtc || row.createdAtUtc);
    if (!key) continue;
    const prev = byDay.get(key) || { amount: 0, orders: 0 };
    byDay.set(key, {
      amount: prev.amount + Number(row.amount || 0),
      orders: prev.orders + 1,
    });
  }

  const keys = [...byDay.keys()].sort();
  if (!keys.length) return [];

  // Fill sparse recent days when window <= 30 days so line trend reflects continuous dates cleanly
  if (days && days <= 30) {
    const now = new Date();
    const out = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const key = vnDayKey(new Date(now.getTime() - i * 86400_000));
      const hit = byDay.get(key) || { amount: 0, orders: 0 };
      out.push({
        key,
        label: shortDayLabel(key),
        value: hit.amount,
        orders: hit.orders,
      });
    }
    return out;
  }

  return keys.map((key) => {
    const hit = byDay.get(key);
    return {
      key,
      label: shortDayLabel(key),
      value: hit.amount,
      orders: hit.orders,
    };
  });
}

export function normalizeServerDailyRevenueSeries(dailySeries = [], days = 30) {
  if (!Array.isArray(dailySeries) || dailySeries.length === 0) return [];
  const byDay = new Map();
  for (const row of dailySeries) {
    const key = String(row?.date || '').slice(0, 10);
    if (!key) continue;
    const value = Number(
      row.netAmount
      ?? row.totalPaidAmount
      ?? (Number(row.subscriptionAmount || 0) + Number(row.courseTuitionAmount || 0) + Number(row.aiTopUpAmount || 0))
    );
    byDay.set(key, {
      key,
      label: shortDayLabel(key),
      value: Number.isFinite(value) ? value : 0,
      orders: Number(row.paidOrders || 0),
    });
  }

  const keys = [...byDay.keys()].sort();
  if (!keys.length) return [];
  if (days && days <= 30 && keys.length < days) {
    const now = new Date();
    const out = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const key = vnDayKey(new Date(now.getTime() - i * 86400_000));
      const hit = byDay.get(key);
      out.push(hit || { key, label: shortDayLabel(key), value: 0, orders: 0 });
    }
    return out;
  }
  return keys.map((k) => byDay.get(k));
}

export function buildUserRoleDistribution(users = []) {
  const counts = { Learner: 0, Mentor: 0, ContentAuthor: 0, Admin: 0 };
  let active = 0;
  let verified = 0;
  for (const u of users || []) {
    const role = normalizeAdminRole(typeof u.role === 'string' ? u.role : u.role?.name);
    counts[role] = (counts[role] || 0) + 1;
    if (u.isActive !== false && !u.isDisabled && !u.isDeleted) active += 1;
    if (u.isEmailVerified) verified += 1;
  }
  return {
    total: users.length,
    active,
    locked: Math.max(0, users.length - active),
    verified,
    unverified: Math.max(0, users.length - verified),
    segments: [
      { label: 'Học viên', value: counts.Learner, color: '#E05A7A' },
      { label: 'Giáo viên', value: counts.Mentor, color: '#2563EB' },
      { label: 'Biên soạn nội dung', value: counts.ContentAuthor, color: '#EAB308' },
      { label: 'Quản trị viên', value: counts.Admin, color: '#DC2626' },
    ],
  };
}

export function buildUserRegistrationSeries(users = [], startMs = null) {
  const byDay = new Map();
  for (const u of users || []) {
    const created = parseUtcDate(u.createdDate || u.createdAtUtc);
    if (!created || Number.isNaN(created.getTime())) continue;
    if (startMs && created.getTime() < startMs) continue;
    const key = vnDayKey(created);
    if (!key) continue;
    byDay.set(key, (byDay.get(key) || 0) + 1);
  }
  return [...byDay.keys()]
    .sort()
    .slice(-24)
    .map((key) => ({
      key,
      label: shortDayLabel(key),
      value: byDay.get(key),
    }));
}

export function buildJlptDistribution(cohorts = [], courses = []) {
  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const map = new Map(levels.map((lv) => [lv, { level: lv, cohorts: 0, learners: 0, capacity: 0 }]));

  for (const ch of cohorts || []) {
    const lv = String(ch.level || '').toUpperCase();
    if (!map.has(lv)) continue;
    const entry = map.get(lv);
    entry.cohorts += 1;
    entry.capacity += Number(ch.capacity || 0);
    entry.learners += Number(ch.enrolledCount || 0);
  }

  // Fallback/augment if enrollment counts exist in courses even for non-cohort records
  if ((cohorts || []).length === 0) {
    for (const c of courses || []) {
      const lv = String(c.level || '').toUpperCase();
      if (!map.has(lv)) continue;
      map.get(lv).learners += 1;
    }
  }

  return levels.map((lv) => map.get(lv));
}

export function summarizeMentorKpis(kpis = []) {
  if (!kpis?.length) {
    return {
      completed: 0,
      assigned: 0,
      cancelled: 0,
      missed: 0,
      completionRate: null,
      avgRating: null,
    };
  }
  let completed = 0;
  let assigned = 0;
  let cancelled = 0;
  let missed = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  for (const row of kpis) {
    completed += Number(row.completedValidSessions || 0);
    assigned += Number(row.totalAssignedSessions || 0);
    cancelled += Number(row.cancelledSessionsCount || 0);
    missed += Number(row.missedOrNoShowSessionsCount || 0);
    if (Number(row.averageRating || 0) > 0) {
      ratingSum += Number(row.averageRating);
      ratingCount += 1;
    }
  }
  return {
    completed,
    assigned,
    cancelled,
    missed,
    completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : null,
    avgRating: ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(2)) : null,
  };
}
