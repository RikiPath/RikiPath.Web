// Dữ liệu hiển thị của thẻ lớp (thuần JS, dùng chung Web). Chỉ định dạng dữ liệu Backend trả về.
import {
  BUSINESS_TIMEZONE,
  formatDate,
  formatDateTime,
  formatTimeRange,
  parseBusinessDate,
} from '@/utils/dateTimeFormat.js';
import { translateTemplate, translateText, currentIntlTag } from '@/locales/locale.js';

const WEEKDAY_LABELS = {
  0: 'Chủ nhật',
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
};
const WEEKDAY_ORDER = (d) => (Number(d) === 0 ? 7 : Number(d));

export const money = (v) => `${Number(v || 0).toLocaleString(currentIntlTag())} ₫`;
export const fmtDate = (v) => formatDateTime(v, '—') || '—';
export const fmtDateOnly = (v) => formatDate(v, '—') || '—';

export function cohortCapacityOf(cohort) {
  return Math.max(0, Number(cohort?.capacitySnapshot || cohort?.capacity || 0));
}

export function confirmedEnrolledCountOf(cohort) {
  return Math.max(0, Number(cohort?.confirmedEnrolledCount ?? 0));
}

export function cohortWeeksOf(cohort) {
  const explicit = Number(cohort?.courseDurationWeeks || 0);
  if (explicit > 0) return explicit;
  const totalSessions = Number(cohort?.totalSessions ?? cohort?.sessions?.length ?? 0);
  const perWeek = Number(cohort?.sessionsPerWeek || 0);
  if (totalSessions > 0 && perWeek > 0) return Math.round(totalSessions / perWeek);
  return null;
}

function getVnWeekdayAndParts(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const shortDay = map.weekday;
  const weekday = shortDay === 'Sun'
    ? 0
    : shortDay === 'Mon'
      ? 1
      : shortDay === 'Tue'
        ? 2
        : shortDay === 'Wed'
          ? 3
          : shortDay === 'Thu'
            ? 4
            : shortDay === 'Fri'
              ? 5
              : 6;
  return {
    weekday,
    year: Number(map.year),
    month: map.month,
    day: map.day,
  };
}

/**
 * Chuẩn hóa danh sách lịch học hằng tuần từng dòng ngắn gọn (không tự tạo dữ liệu giả).
 * Ví dụ: [{ key: '4-10:15-11:45', weekdayLabel: 'Thứ 5', timeRange: '10:15–11:45' }]
 */
export function weeklyScheduleLinesOf(cohort) {
  const pattern = Array.isArray(cohort?.schedulePattern) ? cohort.schedulePattern : [];
  if (pattern.length > 0) {
    return [...pattern]
      .sort((a, b) => WEEKDAY_ORDER(a.weekday) - WEEKDAY_ORDER(b.weekday)
        || String(a.localStart || '').localeCompare(String(b.localStart || '')))
      .map((p, idx) => {
        const weekdayLabel = p.weekdayLabel
          || (WEEKDAY_LABELS[p.weekday] ? translateText(WEEKDAY_LABELS[p.weekday]) : translateTemplate('Thứ {0}', { 0: Number(p.weekday) + 1 }));
        const timeRange = formatTimeRange(p.localStart, p.localEnd, `${p.localStart || ''}–${p.localEnd || ''}`);
        return {
          key: `${p.weekday}-${p.localStart}-${p.localEnd}-${idx}`,
          weekday: Number(p.weekday),
          weekdayLabel: translateText(weekdayLabel),
          timeRange,
        };
      });
  }

  const sessions = Array.isArray(cohort?.sessions) ? cohort.sessions : [];
  if (sessions.length === 0) return [];
  const uniqueMap = new Map();
  for (const s of sessions) {
    const start = parseBusinessDate(s?.startTime || s?.scheduledAt);
    if (!start) continue;
    const end = parseBusinessDate(s?.endTime);
    const { weekday } = getVnWeekdayAndParts(start);
    const timeRange = formatTimeRange(start, end || start);
    const key = `${weekday}|${timeRange}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, {
        key,
        weekday,
        weekdayLabel: translateText(WEEKDAY_LABELS[weekday] || ''),
        timeRange,
      });
    }
  }
  return [...uniqueMap.values()].sort(
    (a, b) => WEEKDAY_ORDER(a.weekday) - WEEKDAY_ORDER(b.weekday) || a.timeRange.localeCompare(b.timeRange),
  );
}

/** "Thứ 2, Thứ 4 · 19:00–20:30" (nhóm theo khung giờ). */
export function schedulePatternText(pattern = [], sessions = []) {
  const lines = weeklyScheduleLinesOf({ schedulePattern: pattern, sessions });
  if (lines.length === 0) return translateText('Chưa có lịch cụ thể');
  const groups = new Map();
  for (const line of lines) {
    groups.set(line.timeRange, [...(groups.get(line.timeRange) || []), line.weekdayLabel]);
  }
  return [...groups.entries()].map(([time, days]) => `${days.join(', ')} · ${time}`).join('; ');
}

/**
 * Nhóm danh sách buổi học chính thức từ Backend theo Năm -> Tháng (không tự sinh lịch).
 */
export function groupCohortSessionsByYearMonth(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length === 0) return [];
  const sorted = [...sessions]
    .map((s) => {
      const start = parseBusinessDate(s?.startTime || s?.scheduledAt);
      const end = parseBusinessDate(s?.endTime);
      return { raw: s, start, end };
    })
    .filter((item) => item.start != null)
    .sort((a, b) => a.start.getTime() - b.start.getTime() || Number(a.raw?.number || 0) - Number(b.raw?.number || 0));

  const groups = new Map();
  for (const item of sorted) {
    const { weekday, year, month } = getVnWeekdayAndParts(item.start);
    const groupKey = `${year}-${month}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        year,
        monthLabel: translateTemplate('Tháng {0}/{1}', { 0: month, 1: year }),
        items: [],
      });
    }
    groups.get(groupKey).items.push({
      number: item.raw?.number,
      weekdayLabel: translateText(WEEKDAY_LABELS[weekday] || ''),
      dateLabel: formatDate(item.start, '—'),
      timeRange: formatTimeRange(item.start, item.end || item.start, '—'),
      sessionCompleted: Boolean(item.raw?.sessionCompleted),
      isLive: Boolean(item.raw?.isSessionLive),
    });
  }
  return [...groups.values()];
}

/** Trạng thái ghi danh cho CardSummary dùng chung (MentorPublicProfile, v.v.). */
export function enrollmentStatusOf(cohort) {
  const capacity = cohortCapacityOf(cohort);
  const confirmedCount = confirmedEnrolledCountOf(cohort);
  const pendingHoldCount = Math.max(0, Number(cohort?.pendingHoldCount || 0));
  if (cohort?.myEnrollmentCourseId) return { key: 'Enrolled', label: 'Đã đăng ký', tone: 'success' };
  if (cohort?.status === 'Cancelled') return { key: 'Cancelled', label: 'Đã hủy', tone: 'danger' };
  if (capacity > 0 && confirmedCount >= capacity) return { key: 'Full', label: 'Đã đủ sĩ số', tone: 'warning' };
  if (cohort?.enrollmentOpen === true || (cohort?.isEnrollmentWindowOpen !== false && pendingHoldCount > 0)) {
    return { key: 'Available', label: 'Đang tuyển sinh', tone: 'info' };
  }
  return { key: 'Closed', label: 'Đã đóng tuyển sinh', tone: 'neutral' };
}

/**
 * Trạng thái và thao tác đăng ký chính thức cho trang Khám phá lớp học,
 * dựa hoàn toàn trên dữ liệu từ Backend (không suy luận chỉ từ số đã ghi danh).
 */
export function cohortDiscoveryStatusOf(cohort, { conflictCourseName = '', nowMs = Date.now() } = {}) {
  const capacity = cohortCapacityOf(cohort);
  const confirmedCount = confirmedEnrolledCountOf(cohort);
  const rawPendingHoldCount = Math.max(0, Number(cohort?.pendingHoldCount || 0));
  const rawSeatsAvailable = cohort?.seatsAvailable != null
    ? Math.max(0, Number(cohort.seatsAvailable))
    : Math.max(0, capacity - confirmedCount - rawPendingHoldCount);

  const holdExpiresMs = parseBusinessDate(cohort?.myEnrollmentPaymentExpiresAtUtc)?.getTime() ?? NaN;
  const isStaleExpiredOwnHold = cohort?.myEnrollmentPaymentState === 'AwaitingPayment'
    && Number.isFinite(holdExpiresMs)
    && holdExpiresMs <= nowMs;

  const myCourseId = isStaleExpiredOwnHold ? null : cohort?.myEnrollmentCourseId;
  const pendingHoldCount = isStaleExpiredOwnHold ? Math.max(0, rawPendingHoldCount - 1) : rawPendingHoldCount;
  const seatsAvailable = isStaleExpiredOwnHold
    ? (capacity > 0 ? Math.min(capacity, rawSeatsAvailable + 1) : rawSeatsAvailable + 1)
    : rawSeatsAvailable;
  const fillPercent = capacity > 0 ? Math.min(100, Math.round((confirmedCount / capacity) * 100)) : 0;

  const cutoffMs = parseBusinessDate(cohort?.enrollmentClosesAtUtc)?.getTime() ?? NaN;
  const startMs = parseBusinessDate(cohort?.startsAt)?.getTime() ?? NaN;
  const isCancelled = cohort?.status === 'Cancelled';
  const isWindowClosed = cohort?.isEnrollmentWindowOpen === false
    || (Number.isFinite(cutoffMs) && cutoffMs <= nowMs)
    || (Number.isFinite(startMs) && startMs <= nowMs);
  const isOfficiallyFull = Boolean(cohort?.isFull) || (capacity > 0 && confirmedCount >= capacity);
  const isAllHeld = !isOfficiallyFull && (
    (Boolean(cohort?.isAllSeatsHeld) && !isStaleExpiredOwnHold)
    || (capacity > 0 && seatsAvailable <= 0 && pendingHoldCount > 0)
  );

  if (myCourseId && cohort?.myEnrollmentPaymentState === 'AwaitingPayment') {
    return {
      key: 'PendingPayment',
      label: 'Chờ thanh toán',
      tone: 'warning',
      actionKind: 'resume_payment',
      actionLabel: 'Tiếp tục thanh toán',
      canEnroll: false,
      disabledReason: '',
      isFull: isOfficiallyFull,
      isAllHeld: false,
      isExpiredOrHidden: false,
      capacity,
      confirmedCount,
      seatsAvailable,
      pendingHoldCount,
      fillPercent,
    };
  }

  if (myCourseId) {
    return {
      key: 'Enrolled',
      label: 'Đã đăng ký',
      tone: 'success',
      actionKind: 'view_course',
      actionLabel: 'Xem lớp học',
      canEnroll: false,
      disabledReason: '',
      isFull: isOfficiallyFull,
      isAllHeld: false,
      isExpiredOrHidden: false,
      capacity,
      confirmedCount,
      seatsAvailable,
      pendingHoldCount,
      fillPercent,
    };
  }

  if (isCancelled) {
    return {
      key: 'Cancelled',
      label: 'Đã hủy',
      tone: 'danger',
      actionKind: 'closed',
      actionLabel: 'Đã hủy',
      canEnroll: false,
      disabledReason: 'Lớp học này đã bị hủy.',
      isFull: false,
      isAllHeld: false,
      isExpiredOrHidden: true,
      capacity,
      confirmedCount,
      seatsAvailable,
      pendingHoldCount,
      fillPercent,
    };
  }

  if (isWindowClosed) {
    return {
      key: 'Closed',
      label: 'Đã đóng tuyển sinh',
      tone: 'neutral',
      actionKind: 'closed',
      actionLabel: 'Đã đóng tuyển sinh',
      canEnroll: false,
      disabledReason: 'Lớp đã hết thời hạn đăng ký.',
      isFull: isOfficiallyFull,
      isAllHeld: false,
      isExpiredOrHidden: true,
      capacity,
      confirmedCount,
      seatsAvailable,
      pendingHoldCount,
      fillPercent,
    };
  }

  if (isOfficiallyFull) {
    return {
      key: 'Full',
      label: 'Đã đủ sĩ số',
      tone: 'warning',
      actionKind: 'full',
      actionLabel: 'Đã đủ sĩ số',
      canEnroll: false,
      disabledReason: '',
      isFull: true,
      isAllHeld: false,
      isExpiredOrHidden: false,
      capacity,
      confirmedCount,
      seatsAvailable,
      pendingHoldCount,
      fillPercent,
    };
  }

  if (isAllHeld) {
    return {
      key: 'Held',
      label: 'Đang tuyển sinh',
      tone: 'info',
      actionKind: 'held',
      actionLabel: 'Đang giữ chỗ',
      canEnroll: false,
      disabledReason: 'Tất cả chỗ còn lại đang được giữ chờ thanh toán.',
      isFull: false,
      isAllHeld: true,
      isExpiredOrHidden: false,
      capacity,
      confirmedCount,
      seatsAvailable,
      pendingHoldCount,
      fillPercent,
    };
  }

  if (conflictCourseName) {
    return {
      key: 'Conflict',
      label: 'Đang tuyển sinh',
      tone: 'info',
      actionKind: 'conflict',
      actionLabel: 'Đăng ký lớp',
      canEnroll: false,
      disabledReason: translateTemplate('Trùng lịch với {0}.', { 0: conflictCourseName }),
      isFull: false,
      isAllHeld: false,
      isExpiredOrHidden: false,
      capacity,
      confirmedCount,
      seatsAvailable,
      pendingHoldCount,
      fillPercent,
    };
  }

  if (cohort?.enrollmentOpen === true || seatsAvailable > 0) {
    return {
      key: 'Open',
      label: 'Đang tuyển sinh',
      tone: 'info',
      actionKind: 'enroll',
      actionLabel: cohort?.hasApprovedEntitlement ? 'Ghi danh bằng quyền học' : 'Đăng ký lớp',
      canEnroll: true,
      disabledReason: '',
      isFull: false,
      isAllHeld: false,
      isExpiredOrHidden: false,
      capacity,
      confirmedCount,
      seatsAvailable,
      pendingHoldCount,
      fillPercent,
    };
  }

  return {
    key: 'Closed',
    label: 'Đã đóng tuyển sinh',
    tone: 'neutral',
    actionKind: 'closed',
    actionLabel: 'Đã đóng tuyển sinh',
    canEnroll: false,
    disabledReason: cohort?.entitlementStatusMessage || 'Lớp hiện chưa mở đăng ký.',
    isFull: false,
    isAllHeld: false,
    isExpiredOrHidden: true,
    capacity,
    confirmedCount,
    seatsAvailable,
    pendingHoldCount,
    fillPercent,
  };
}

/** Tần suất học lấy động từ số buổi mỗi tuần. */
export function frequencyLabelOf(cohort) {
  const n = Number(cohort?.sessionsPerWeek || 0);
  return n > 0 ? translateTemplate('{0} buổi/tuần', { 0: n }) : translateText('Linh hoạt');
}

export function cohortCardFacts(cohort) {
  const totalSessions = cohort.totalSessions ?? cohort.sessions?.length ?? 0;
  const weeks = cohortWeeksOf(cohort);
  const confirmed = confirmedEnrolledCountOf(cohort);
  const capacity = cohortCapacityOf(cohort);
  return [
    ['Cấp độ JLPT', cohort.level || '—'],
    ['Giáo viên', cohort.mentorName || '—'],
    ['Lịch hằng tuần', schedulePatternText(cohort.schedulePattern, cohort.sessions)],
    ['Tần suất học', frequencyLabelOf(cohort)],
    ['Thời lượng buổi', cohort.sessionMinutes ? translateTemplate('{0} phút/buổi', { 0: cohort.sessionMinutes }) : '—'],
    ['Tổng số buổi', !totalSessions ? '—' : translateTemplate('{0} buổi{1}', { 0: totalSessions, 1: cohort.totalTeachingHours != null ? translateTemplate(' · {0} giờ', { 0: cohort.totalTeachingHours }) : '' })],
    ['Thời gian khóa', weeks ? translateTemplate('{0} tuần', { 0: weeks }) : '—'],
    ['Đã ghi danh', capacity > 0 ? translateTemplate('{0}/{1} học viên', { 0: confirmed, 1: capacity }) : '—'],
    ['Học phí trọn khóa', money(cohort.price)],
  ];
}
