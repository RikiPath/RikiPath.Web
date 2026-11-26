import { clockFromMinutes } from './slotPlannerModel.js';
import { toVnDateKey, mondayOfDateKey, shiftDateKey } from './calendarGeometry.js';
import { readLocale } from '../../../locales/locale.js';

function vnDateTimeToUtcIso(dayKey, minuteOfDay) {
  return new Date(`${dayKey}T${clockFromMinutes(minuteOfDay)}:00+07:00`).toISOString();
}

function vnDateTimeToUtcMs(dayKey, minuteOfDay) {
  return new Date(vnDateTimeToUtcIso(dayKey, minuteOfDay)).getTime();
}

export const SUPPORTED_PROPOSAL_JLPT_CODES = Object.freeze(['N5', 'N4', 'N3', 'N2']);

export function getJlptRank(code) {
  switch (String(code || '').trim().toUpperCase()) {
    case 'N5': return 1;
    case 'N4': return 2;
    case 'N3': return 3;
    case 'N2': return 4;
    case 'N1': return 5;
    default: return 0;
  }
}

export function canMentorTeachJlptLevel(verifiedMentorCode, targetCode) {
  const mentorRank = getJlptRank(verifiedMentorCode);
  const targetRank = getJlptRank(targetCode);
  return mentorRank > 0 && targetRank >= 1 && targetRank <= 4 && targetRank <= mentorRank;
}

export const PROPOSAL_DAYPART_WINDOWS = Object.freeze({
  Morning: { id: 'Morning', label: 'Sáng', rangeLabel: '07:00–11:00', startMin: 7 * 60, endMin: 11 * 60, defaultStartMin: 8 * 60 + 30 },
  Noon: { id: 'Noon', label: 'Trưa', rangeLabel: '11:00–13:00', startMin: 11 * 60, endMin: 13 * 60, defaultStartMin: 11 * 60 + 15 },
  Afternoon: { id: 'Afternoon', label: 'Chiều', rangeLabel: '13:00–18:00', startMin: 13 * 60, endMin: 18 * 60, defaultStartMin: 13 * 60 + 30 },
  Evening: { id: 'Evening', label: 'Tối', rangeLabel: '18:00–22:00', startMin: 18 * 60, endMin: 22 * 60, defaultStartMin: 18 * 60 },
});

export const DEFAULT_PROPOSAL_POLICY = Object.freeze({
  timeZoneId: 'Asia/Ho_Chi_Minh',
  minSessionsPerWeek: 2,
  maxSessionsPerWeek: 4,
  defaultSessionsPerWeek: 3,
  allowedSessionsPerWeek: [2, 3, 4],
  courseDurationWeeks: 10,
  sessionDurationMinutes: 90,
  restMinutes: 15,
  minLearners: 1,
  maxLearners: 4,
  dailySessionCap: 4,
  weeklySessionCap: 0,
  gridStepMinutes: 15,
  operatingStartMinute: 7 * 60,
  operatingEndMinute: 22 * 60,
  minimumProposalLeadDays: 14,
  minimumPublishedEnrollmentDays: 7,
  checkoutHoldMinutes: 10,
  enrollmentCutoffMinutesBeforeFirstSession: 0,
  maxTotalActiveClassesPerMentor: 4,
  maxActiveClassesByLevel: Object.freeze({
    N5: 1,
    N4: 1,
    N3: 1,
    N2: 1,
  }),
  tuitionPerSessionByLevel: Object.freeze({
    N5: 60000,
    N4: 75000,
    N3: 90000,
    N2: 110000,
  }),
});

export const PROPOSAL_STATUS_META = Object.freeze({
  Draft: {
    label: 'Đang chọn',
    tone: 'success',
    dot: '#22C55E',
    pillClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  PendingReview: {
    label: 'Chờ duyệt',
    tone: 'warning',
    dot: '#E4A020',
    pillClass: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  ChangesRequested: {
    label: 'Cần bổ sung',
    tone: 'warning',
    dot: '#EA580C',
    pillClass: 'border-orange-200 bg-orange-50 text-orange-800',
  },
  Approved: {
    label: 'Đã duyệt',
    tone: 'success',
    dot: '#16A34A',
    pillClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  Rejected: {
    label: 'Bị từ chối',
    tone: 'danger',
    dot: '#DC3545',
    pillClass: 'border-red-200 bg-red-50 text-red-800',
  },
  Withdrawn: {
    label: 'Đã rút',
    tone: 'neutral',
    dot: '#8B8B97',
    pillClass: 'border-slate-200 bg-slate-100 text-slate-700',
  },
});

const WEEKDAY_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const ORDERED_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

export function weekdayLabelVn(weekday) {
  return WEEKDAY_LABELS[Number(weekday)] || `Thứ ${Number(weekday) + 1}`;
}

export function normalizeProposalPolicy(apiPolicy = null) {
  const allowed = Array.isArray(apiPolicy?.allowedSessionsPerWeek) && apiPolicy.allowedSessionsPerWeek.length > 0
    ? apiPolicy.allowedSessionsPerWeek.map(Number).filter((n) => Number.isInteger(n) && n >= 1).sort((a, b) => a - b)
    : DEFAULT_PROPOSAL_POLICY.allowedSessionsPerWeek;

  const rawTuition = apiPolicy?.tuitionPerSessionByLevel && typeof apiPolicy.tuitionPerSessionByLevel === 'object'
    ? apiPolicy.tuitionPerSessionByLevel
    : {};
  const tuitionPerSessionByLevel = {
    N5: Number(rawTuition.N5 ?? rawTuition.n5 ?? apiPolicy?.tuitionPerSessionN5 ?? DEFAULT_PROPOSAL_POLICY.tuitionPerSessionByLevel.N5),
    N4: Number(rawTuition.N4 ?? rawTuition.n4 ?? apiPolicy?.tuitionPerSessionN4 ?? DEFAULT_PROPOSAL_POLICY.tuitionPerSessionByLevel.N4),
    N3: Number(rawTuition.N3 ?? rawTuition.n3 ?? apiPolicy?.tuitionPerSessionN3 ?? DEFAULT_PROPOSAL_POLICY.tuitionPerSessionByLevel.N3),
    N2: Number(rawTuition.N2 ?? rawTuition.n2 ?? apiPolicy?.tuitionPerSessionN2 ?? DEFAULT_PROPOSAL_POLICY.tuitionPerSessionByLevel.N2),
  };

  const rawLimits = apiPolicy?.maxActiveClassesByLevel && typeof apiPolicy.maxActiveClassesByLevel === 'object'
    ? apiPolicy.maxActiveClassesByLevel
    : {};
  const hasRawLimits = Object.keys(rawLimits).length > 0;
  const maxActiveClassesByLevel = hasRawLimits
    ? Object.fromEntries(
      Object.entries(rawLimits).map(([k, v]) => [String(k || '').trim().toUpperCase(), Number(v)])
    )
    : { ...DEFAULT_PROPOSAL_POLICY.maxActiveClassesByLevel };

  return {
    ...DEFAULT_PROPOSAL_POLICY,
    ...(apiPolicy || {}),
    allowedSessionsPerWeek: allowed,
    minSessionsPerWeek: Number(apiPolicy?.minSessionsPerWeek ?? allowed[0] ?? 2),
    maxSessionsPerWeek: Number(apiPolicy?.maxSessionsPerWeek ?? allowed[allowed.length - 1] ?? 4),
    minLearners: Number(apiPolicy?.minLearners ?? apiPolicy?.minLearnersToStart ?? DEFAULT_PROPOSAL_POLICY.minLearners),
    maxLearners: Number(apiPolicy?.maxLearners ?? DEFAULT_PROPOSAL_POLICY.maxLearners),
    courseDurationWeeks: Number(apiPolicy?.courseDurationWeeks ?? 10),
    sessionDurationMinutes: Number(apiPolicy?.sessionDurationMinutes ?? apiPolicy?.sessionMinutes ?? 90),
    restMinutes: Number(apiPolicy?.restMinutes ?? 15),
    dailySessionCap: Number(apiPolicy?.dailySessionCap ?? 4),
    weeklySessionCap: Number(apiPolicy?.weeklySessionCap ?? 0),
    gridStepMinutes: Number(apiPolicy?.gridStepMinutes ?? 15),
    operatingStartMinute: Number(apiPolicy?.operatingStartMinute ?? 7 * 60),
    operatingEndMinute: Number(apiPolicy?.operatingEndMinute ?? 22 * 60),
    minimumProposalLeadDays: Number(apiPolicy?.minimumProposalLeadDays ?? DEFAULT_PROPOSAL_POLICY.minimumProposalLeadDays),
    minimumPublishedEnrollmentDays: Number(apiPolicy?.minimumPublishedEnrollmentDays ?? DEFAULT_PROPOSAL_POLICY.minimumPublishedEnrollmentDays),
    checkoutHoldMinutes: Number(apiPolicy?.checkoutHoldMinutes ?? DEFAULT_PROPOSAL_POLICY.checkoutHoldMinutes),
    enrollmentCutoffMinutesBeforeFirstSession: Number(
      apiPolicy?.enrollmentCutoffMinutesBeforeFirstSession ?? DEFAULT_PROPOSAL_POLICY.enrollmentCutoffMinutesBeforeFirstSession
    ),
    maxTotalActiveClassesPerMentor: Number(
      apiPolicy?.maxTotalActiveClassesPerMentor ?? DEFAULT_PROPOSAL_POLICY.maxTotalActiveClassesPerMentor
    ),
    maxActiveClassesByLevel,
    tuitionPerSessionByLevel,
  };
}

export function formatTuitionVnd(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const tag = { vi: 'vi-VN', ja: 'ja-JP', en: 'en-US' }[readLocale()] || 'vi-VN';
  return `${Math.round(n).toLocaleString(tag)} đ`;
}

/**
 * Computes read-only full-course learner tuition preview for a proposal
 * based on the active Admin tuition table (never mentor earnings/payroll).
 */
export function computeProposalTuitionPreview(levelCode, totalSessions, policy = DEFAULT_PROPOSAL_POLICY) {
  const p = normalizeProposalPolicy(policy);
  const code = String(levelCode || '').trim().toUpperCase();
  const perSession = Number(p.tuitionPerSessionByLevel?.[code] || 0);
  const sessions = Math.max(0, Number(totalSessions) || 0);
  const totalCourseTuition = perSession > 0 && sessions > 0 ? perSession * sessions : 0;
  return {
    levelCode: code || null,
    tuitionPerSession: perSession,
    totalSessions: sessions,
    totalCourseTuition,
    formattedPerSession: formatTuitionVnd(perSession),
    formattedTotal: formatTuitionVnd(totalCourseTuition),
    policyVersion: p.policyVersion ?? p.version ?? null,
  };
}

export function weeklySlotKey(weekday, startMinute) {
  return `w${Number(weekday)}_${Number(startMinute)}`;
}

export function daypartForMinute(startMinute) {
  const m = Number(startMinute);
  if (m < 11 * 60) return 'Morning';
  if (m < 13 * 60) return 'Noon';
  if (m < 18 * 60) return 'Afternoon';
  return 'Evening';
}

export function sortWeeklySessions(sessions = [], defaultDurationMinutes = 90) {
  const dedup = new Map();
  const fallbackDuration = Number(defaultDurationMinutes) > 0 ? Number(defaultDurationMinutes) : 90;
  for (const s of sessions || []) {
    if (s == null || !Number.isFinite(Number(s.weekday)) || !Number.isFinite(Number(s.startMinute))) continue;
    const weekday = Number(s.weekday);
    const startMinute = Number(s.startMinute);
    const endMinute = Number(s.endMinute) > startMinute ? Number(s.endMinute) : startMinute + fallbackDuration;
    const key = weeklySlotKey(weekday, startMinute);
    if (!dedup.has(key)) {
      dedup.set(key, {
        key,
        weekday,
        startMinute,
        endMinute,
        startClock: clockFromMinutes(startMinute),
        endClock: clockFromMinutes(endMinute),
      });
    }
  }
  return [...dedup.values()].sort(
    (a, b) => (((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)) || (a.startMinute - b.startMinute)
  );
}

export function dayKeyToWeekday(dayKey) {
  if (!dayKey || typeof dayKey !== 'string') return 1;
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
}

export function calendarSlotToWeeklySlot({ dayKey, startMin, policy = DEFAULT_PROPOSAL_POLICY }) {
  const p = normalizeProposalPolicy(policy);
  const weekday = dayKeyToWeekday(dayKey);
  const startMinute = Number(startMin);
  const endMinute = startMinute + p.sessionDurationMinutes;
  return {
    key: weeklySlotKey(weekday, startMinute),
    weekday,
    startMinute,
    endMinute,
    startClock: clockFromMinutes(startMinute),
    endClock: clockFromMinutes(endMinute),
  };
}

/**
 * Projects a proposal's recurring weekly sessions onto the calendar week (Mon–Sun)
 * currently viewed by `InteractiveSlotCalendar`.
 */
export function weeklySessionsToCalendarSlots({
  weeklySessions = [],
  anchorKey,
  policy = DEFAULT_PROPOSAL_POLICY,
}) {
  const p = normalizeProposalPolicy(policy);
  const sorted = sortWeeklySessions(weeklySessions);
  const weekMon = mondayOfDateKey(anchorKey || toVnDateKey(new Date()));
  return sorted.map((s) => {
    const offset = (s.weekday + 6) % 7;
    const dayKey = shiftDateKey(weekMon, offset);
    const endMin = s.startMinute + p.sessionDurationMinutes;
    return {
      key: s.key,
      weeklyKey: s.key,
      weekday: s.weekday,
      dayKey,
      startMin: s.startMinute,
      endMin,
      startClock: clockFromMinutes(s.startMinute),
      endClock: clockFromMinutes(endMin),
      startUtcIso: vnDateTimeToUtcIso(dayKey, s.startMinute),
      endUtcIso: vnDateTimeToUtcIso(dayKey, endMin),
    };
  });
}

function shortDateDdMm(dayKey) {
  const parts = String(dayKey || '').split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : String(dayKey || '');
}

/**
 * Evaluates a candidate course start date against ALL scheduling rules:
 * past time, lead time, registration horizon, selected weekday match,
 * and full 10-week occurrence conflicts / 15-min rest / daily cap / weekly cap.
 */
export function evaluateCourseStartDate({
  dayKey,
  weeklySessions = [],
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const todayVn = toVnDateKey(new Date(nowMs));
  const sorted = sortWeeklySessions(weeklySessions);

  if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(String(dayKey))) {
    return {
      valid: false,
      code: 'PROPOSAL_START_DATE_REQUIRED',
      reason: 'Vui lòng chọn ngày bắt đầu dự kiến.',
    };
  }

  const startWd = dayKeyToWeekday(dayKey);
  if (dayKey < todayVn) {
    return {
      valid: false,
      code: 'PAST_SCHEDULE_SLOT',
      reason: 'Đã quá thời gian này.',
    };
  }
  if (dayKey === todayVn) {
    const sameWdSlots = sorted.filter((s) => Number(s.weekday) === startWd);
    const earliestMin = sameWdSlots.length > 0
      ? Math.min(...sameWdSlots.map((s) => s.startMinute))
      : p.operatingEndMinute;
    if (vnDateTimeToUtcMs(dayKey, earliestMin) <= nowMs) {
      return {
        valid: false,
        code: 'PAST_SCHEDULE_SLOT',
        reason: 'Đã quá thời gian này.',
      };
    }
  }

  const minProposalDate = shiftDateKey(todayVn, p.minimumProposalLeadDays);
  if (dayKey < minProposalDate) {
    return {
      valid: false,
      code: 'INSUFFICIENT_PROPOSAL_LEAD_TIME',
      reason: 'Chưa đủ thời gian xét duyệt và tuyển sinh.',
    };
  }

  const maxAdvanceDays = Number(p.maxProposalStartAdvanceDays || 0);
  if (maxAdvanceDays > 0 && dayKey > shiftDateKey(todayVn, maxAdvanceDays)) {
    return {
      valid: false,
      code: 'PROPOSAL_START_DATE_OUT_OF_HORIZON',
      reason: 'Ngày này nằm ngoài thời gian được phép đăng ký.',
    };
  }

  if (sorted.length > 0 && !sorted.some((s) => Number(s.weekday) === startWd)) {
    return {
      valid: false,
      code: 'COURSE_START_SESSION_MISMATCH',
      reason: 'Không có khung giờ giảng dạy vào ngày này.',
    };
  }

  if (sorted.length === 0) {
    return {
      valid: true,
      code: null,
      reason: null,
      projectedEndDate: null,
      occurrences: [],
      totalSessions: 0,
    };
  }

  const occurrences = expandProposalOccurrences({
    expectedStartDate: dayKey,
    weeklySessions: sorted,
    courseDurationWeeks: p.courseDurationWeeks,
    sessionDurationMinutes: p.sessionDurationMinutes,
  });

  if (occurrences.length === 0 || occurrences[0].startMs <= nowMs) {
    return {
      valid: false,
      code: 'SESSION_ALREADY_STARTED',
      reason: 'Đã quá thời gian này.',
    };
  }

  const activeCommitments = (commitments || []).filter(
    (c) => c && c.startMs && c.endMs && c.status !== 'Cancelled' && c.status !== 'Rejected' && c.status !== 'Withdrawn'
  );

  if (activeCommitments.length > 0) {
    const restMs = p.restMinutes * 60 * 1000;
    const commitmentCountByDay = new Map();
    const commitmentCountByWeek = new Map();
    for (const c of activeCommitments) {
      const dk = c.dayKey || toVnDateKey(new Date(c.startMs));
      commitmentCountByDay.set(dk, (commitmentCountByDay.get(dk) || 0) + 1);
      const wm = mondayOfDateKey(dk);
      commitmentCountByWeek.set(wm, (commitmentCountByWeek.get(wm) || 0) + 1);
    }

    const occCountByDay = new Map();
    const occCountByWeek = new Map();
    for (const occ of occurrences) {
      occCountByDay.set(occ.localDate, (occCountByDay.get(occ.localDate) || 0) + 1);
      const wm = mondayOfDateKey(occ.localDate);
      occCountByWeek.set(wm, (occCountByWeek.get(wm) || 0) + 1);

      for (const c of activeCommitments) {
        if (c.startMs < occ.endMs && occ.startMs < c.endMs) {
          const targetLabel = c.jlptLevelCode ? `lớp ${c.jlptLevelCode}` : (c.label || 'lịch đã đăng ký');
          return {
            valid: false,
            code: c.kind === 'pendingProposal' ? 'PROPOSAL_CONFLICT_PENDING_PROPOSAL' : 'PROPOSAL_CONFLICT_APPROVED_SCHEDULE',
            reason: `Trùng ${targetLabel} ngày ${shortDateDdMm(occ.localDate)}.`,
            conflictDate: occ.localDate,
          };
        }
        const gapMs = occ.startMs >= c.endMs ? occ.startMs - c.endMs : c.startMs - occ.endMs;
        if (gapMs < restMs) {
          return {
            valid: false,
            code: 'PROPOSAL_REST_VIOLATION',
            reason: `Cần nghỉ ít nhất ${p.restMinutes} phút giữa hai buổi.`,
            conflictDate: occ.localDate,
          };
        }
      }
    }

    if (p.dailySessionCap > 0) {
      for (const [dk, occCount] of occCountByDay.entries()) {
        if ((commitmentCountByDay.get(dk) || 0) + occCount > p.dailySessionCap) {
          return {
            valid: false,
            code: 'PROPOSAL_DAILY_CAP_EXCEEDED',
            reason: 'Vượt giới hạn số buổi giảng dạy trong ngày.',
            conflictDate: dk,
          };
        }
      }
    }

    if (p.weeklySessionCap > 0) {
      for (const [wm, occCount] of occCountByWeek.entries()) {
        if ((commitmentCountByWeek.get(wm) || 0) + occCount > p.weeklySessionCap) {
          return {
            valid: false,
            code: 'PROPOSAL_WEEKLY_CAP_EXCEEDED',
            reason: 'Lịch giảng dạy trong 10 tuần chưa khả dụng.',
            conflictDate: wm,
          };
        }
      }
    }
  }

  return {
    valid: true,
    code: null,
    reason: null,
    projectedEndDate: occurrences[occurrences.length - 1].localDate,
    occurrences,
    totalSessions: occurrences.length,
  };
}

/**
 * Finds the earliest calendar date (Asia/Ho_Chi_Minh) that satisfies ALL start-date rules:
 * lead time, horizon, weekday pattern match, AND full 10-week conflict/rest/cap checks.
 */
export function findEarliestAvailableStartDate({
  minDateKey = null,
  weeklySessions = [],
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
  maxSearchDays = 365,
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const sorted = sortWeeklySessions(weeklySessions);
  if (sorted.length === 0) return null;

  const todayVn = toVnDateKey(new Date(nowMs));
  const minLeadDate = shiftDateKey(todayVn, p.minimumProposalLeadDays);
  const floorDate = minDateKey && minDateKey > minLeadDate ? minDateKey : minLeadDate;
  const allowedWeekdays = new Set(sorted.map((s) => Number(s.weekday)));

  const maxAdvanceDays = Number(p.maxProposalStartAdvanceDays || 0);
  const horizonLimit = maxAdvanceDays > 0
    ? shiftDateKey(todayVn, Math.min(maxAdvanceDays, maxSearchDays))
    : shiftDateKey(floorDate, maxSearchDays);

  for (let candidate = floorDate; candidate <= horizonLimit; candidate = shiftDateKey(candidate, 1)) {
    if (!allowedWeekdays.has(dayKeyToWeekday(candidate))) continue;
    const evaluation = evaluateCourseStartDate({
      dayKey: candidate,
      weeklySessions: sorted,
      commitments,
      policy: p,
      nowMs,
    });
    if (evaluation.valid) {
      return {
        startDate: candidate,
        projectedEndDate: evaluation.projectedEndDate,
        totalSessions: evaluation.totalSessions,
      };
    }
  }

  return null;
}

/**
 * Finds the earliest valid start date string (YYYY-MM-DD), including full 10-week conflict checks when commitments are supplied.
 */
export function findEarliestValidStartDate({
  minDateKey = null,
  weeklySessions = [],
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const todayVn = toVnDateKey(new Date(nowMs));
  const minLeadDate = shiftDateKey(todayVn, p.minimumProposalLeadDays);
  const floorDate = minDateKey && minDateKey > minLeadDate ? minDateKey : minLeadDate;
  const sorted = sortWeeklySessions(weeklySessions);
  if (sorted.length === 0) return floorDate;

  const available = findEarliestAvailableStartDate({
    minDateKey,
    weeklySessions: sorted,
    commitments,
    policy: p,
    nowMs,
  });
  return available?.startDate || null;
}

/**
 * Validates a candidate course start date against past-time, minimum lead-time, weekly pattern match, and optional commitments.
 */
export function validateCourseStartDate({
  dayKey,
  weeklySessions = [],
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
} = {}) {
  return evaluateCourseStartDate({
    dayKey,
    weeklySessions,
    commitments,
    policy,
    nowMs,
  });
}

/**
 * Expands a proposal's recurring weekly sessions across `courseDurationWeeks` (default 10)
 * as 7-day cycles anchored strictly at `expectedStartDate` in `Asia/Ho_Chi_Minh`,
 * mirroring Backend `MentorSlotPolicy.ExpandRecurringSchedule` 1-to-1.
 */
export function expandProposalOccurrences({
  expectedStartDate,
  weeklySessions = [],
  courseDurationWeeks = 10,
  sessionDurationMinutes = 90,
}) {
  const sorted = sortWeeklySessions(weeklySessions);
  if (!expectedStartDate || sorted.length === 0 || courseDurationWeeks <= 0) return [];

  const startWeekday = dayKeyToWeekday(expectedStartDate);
  const orderedByCycleOffset = sorted
    .map((slot) => ({
      ...slot,
      offset: (((slot.weekday - startWeekday) % 7) + 7) % 7,
    }))
    .sort((a, b) => (a.offset - b.offset) || (a.startMinute - b.startMinute));

  const occurrences = [];
  let sessionNumber = 0;

  for (let cycle = 0; cycle < courseDurationWeeks; cycle += 1) {
    const cycleAnchor = shiftDateKey(expectedStartDate, cycle * 7);
    for (const slot of orderedByCycleOffset) {
      const localDate = shiftDateKey(cycleAnchor, slot.offset);
      const startUtcIso = vnDateTimeToUtcIso(localDate, slot.startMinute);
      const endUtcIso = vnDateTimeToUtcIso(localDate, slot.startMinute + sessionDurationMinutes);
      sessionNumber += 1;
      occurrences.push({
        sessionNumber,
        weekNumber: cycle + 1,
        weekday: slot.weekday,
        localDate,
        localStart: clockFromMinutes(slot.startMinute),
        localEnd: clockFromMinutes(slot.startMinute + sessionDurationMinutes),
        startMinute: slot.startMinute,
        endMinute: slot.startMinute + sessionDurationMinutes,
        startUtcIso,
        endUtcIso,
        startMs: new Date(startUtcIso).getTime(),
        endMs: new Date(endUtcIso).getTime(),
      });
    }
  }

  return occurrences;
}

/**
 * Filters calendar slots/occurrences to those falling within an inclusive calendar date range `[startKey, endKey]`.
 */
export function filterSlotsForVisibleRange(slots = [], startKey = '', endKey = '') {
  return (slots || []).filter((slot) => {
    const dk = slot?.dayKey || slot?.localDate || '';
    if (!dk) return false;
    if (startKey && dk < startKey) return false;
    if (endKey && dk > endKey) return false;
    return true;
  });
}

/**
 * Resolves a single stable future reference week (Monday YYYY-MM-DD) for displaying weekly pattern previews
 * BEFORE the Mentor picks an official `expectedStartDate`.
 * Never depends on Calendar view navigation (`anchorKey`) and never places preview cards in the past.
 */
export function resolveStableReferenceWeek({
  weeklySessions = [],
  preferredReferenceWeekKey = null,
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const sorted = sortWeeklySessions(weeklySessions);
  const todayVn = toVnDateKey(new Date(nowMs));
  const fallbackAnchor = findEarliestValidStartDate({
    weeklySessions: sorted,
    policy: p,
    nowMs,
  });
  const fallbackMon = mondayOfDateKey(fallbackAnchor || todayVn);

  if (sorted.length === 0) {
    return preferredReferenceWeekKey ? mondayOfDateKey(preferredReferenceWeekKey) : fallbackMon;
  }

  const allStrictlyFutureInWeek = (weekMon) => sorted.every((s) => {
    const dayKey = shiftDateKey(weekMon, (s.weekday + 6) % 7);
    const startMs = new Date(vnDateTimeToUtcIso(dayKey, s.startMinute)).getTime();
    return Number.isFinite(startMs) && startMs > nowMs;
  });

  if (preferredReferenceWeekKey) {
    let candidateMon = mondayOfDateKey(preferredReferenceWeekKey);
    for (let w = 0; w < 3; w += 1) {
      if (allStrictlyFutureInWeek(candidateMon)) return candidateMon;
      candidateMon = shiftDateKey(candidateMon, 7);
    }
  }

  return allStrictlyFutureInWeek(fallbackMon) ? fallbackMon : shiftDateKey(fallbackMon, 7);
}

/**
 * Single authoritative builder for Calendar preview slots in Proposal Mode.
 * - With a valid `expectedStartDate`: returns finite 10-week actual occurrences (strictly inside `[startDate, endDate]` and `> nowMs`).
 * - With an expired/invalid `expectedStartDate`: returns `[]` + centralized `startDateWarning` (no past cards, no silent mutation).
 * - Without `expectedStartDate`: renders weekly pattern ONLY inside ONE stable future `referenceWeekKey` (never infinite across all weeks).
 */
export function buildProposalPreviewCalendarSlots({
  weeklySessions = [],
  expectedStartDate = null,
  visibleRange = null,
  referenceWeekKey = null,
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const sorted = sortWeeklySessions(weeklySessions);

  if (sorted.length === 0) {
    return {
      mode: 'empty',
      slots: [],
      occurrences: [],
      weeklyPatternCount: 0,
      courseStartDate: expectedStartDate || null,
      courseEndDate: null,
      referenceWeekKey: null,
      startDateWarning: null,
    };
  }

  if (expectedStartDate) {
    // Structural check for start date (note: commitment overlaps are highlighted on finite cards, not hidden)
    const startCheck = evaluateCourseStartDate({
      dayKey: expectedStartDate,
      weeklySessions: sorted,
      commitments: [],
      policy: p,
      nowMs,
    });

    if (!startCheck.valid) {
      if (startCheck.code !== 'COURSE_START_SESSION_MISMATCH') {
        return {
          mode: 'invalid_start_date',
          slots: [],
          occurrences: [],
          weeklyPatternCount: sorted.length,
          courseStartDate: expectedStartDate,
          courseEndDate: null,
          referenceWeekKey: null,
          startDateWarning: {
            code: startCheck.code,
            message: 'Ngày bắt đầu không còn phù hợp. Vui lòng chọn ngày bắt đầu mới để tiếp tục.',
          },
        };
      }
      // If expectedStartDate is on a weekday no longer in weeklySessions, fall through to
      // visible-range representative projection so selected patterns remain visible on Calendar.
    } else {
      const occurrences = expandProposalOccurrences({
        expectedStartDate,
        weeklySessions: sorted,
        courseDurationWeeks: p.courseDurationWeeks,
        sessionDurationMinutes: p.sessionDurationMinutes,
      });

      if (occurrences.length === 0 || occurrences[0].startMs <= nowMs) {
        return {
          mode: 'invalid_start_date',
          slots: [],
          occurrences: [],
          weeklyPatternCount: sorted.length,
          courseStartDate: expectedStartDate,
          courseEndDate: null,
          referenceWeekKey: null,
          startDateWarning: {
            code: 'SESSION_ALREADY_STARTED',
            message: 'Ngày bắt đầu không còn phù hợp. Vui lòng chọn ngày bắt đầu mới để tiếp tục.',
          },
        };
      }

      const courseEndDate = occurrences[occurrences.length - 1].localDate;
      const slots = occurrences
        .filter((occ) => occ.startMs > nowMs && occ.localDate >= expectedStartDate && occ.localDate <= courseEndDate)
        .map((occ) => {
          const wkKey = weeklySlotKey(occ.weekday, occ.startMinute);
          return {
            key: `occ_${wkKey}_${occ.localDate}`,
            weeklyKey: wkKey,
            weekday: occ.weekday,
            dayKey: occ.localDate,
            startMin: occ.startMinute,
            endMin: occ.endMinute,
            startClock: occ.localStart,
            endClock: occ.localEnd,
            startUtcIso: occ.startUtcIso,
            endUtcIso: occ.endUtcIso,
            sessionNumber: occ.sessionNumber,
            weekNumber: occ.weekNumber,
            totalSessions: occurrences.length,
            isFiniteOccurrence: true,
            isRepresentativeProjection: false,
          };
        });

      return {
        mode: 'finite_10_weeks',
        slots,
        occurrences,
        weeklyPatternCount: sorted.length,
        courseStartDate: expectedStartDate,
        courseEndDate,
        referenceWeekKey: mondayOfDateKey(expectedStartDate),
        startDateWarning: null,
      };
    }
  }

  // No valid expectedStartDate yet: project selected weekly patterns onto EVERY matching future date
  // in the currently visible Calendar range (Day / Week / Month), never past `nowMs`, never persisted.
  const todayVn = toVnDateKey(new Date(nowMs));
  const fallbackMon = referenceWeekKey
    ? mondayOfDateKey(referenceWeekKey)
    : mondayOfDateKey(todayVn);
  const rangeStart = visibleRange?.startKey || fallbackMon;
  const rangeEnd = visibleRange?.endKey || shiftDateKey(fallbackMon, 6);
  const loopStart = rangeStart > todayVn ? rangeStart : todayVn;

  const patternsByWeekday = new Map();
  for (const s of sorted) {
    const wd = Number(s.weekday);
    const list = patternsByWeekday.get(wd) || [];
    list.push(s);
    patternsByWeekday.set(wd, list);
  }

  const activeCommitments = (commitments || []).filter(
    (c) => c && c.startMs && c.endMs && c.status !== 'Cancelled' && c.status !== 'Rejected' && c.status !== 'Withdrawn'
  );

  const slots = [];
  if (loopStart <= rangeEnd) {
    for (let dk = loopStart; dk <= rangeEnd; dk = shiftDateKey(dk, 1)) {
      const dayPatterns = patternsByWeekday.get(dayKeyToWeekday(dk));
      if (!dayPatterns || dayPatterns.length === 0) continue;
      for (const s of dayPatterns) {
        const endMin = s.startMinute + p.sessionDurationMinutes;
        const startUtcIso = vnDateTimeToUtcIso(dk, s.startMinute);
        const endUtcIso = vnDateTimeToUtcIso(dk, endMin);
        const startMs = new Date(startUtcIso).getTime();
        const endMs = new Date(endUtcIso).getTime();
        if (!Number.isFinite(startMs) || startMs <= nowMs) continue;

        const hasVisibleDateConflict = activeCommitments.some(
          (c) => c.dayKey === dk && c.startMs < endMs && startMs < c.endMs
        );
        slots.push({
          key: `rep_${s.key}_${dk}`,
          weeklyKey: s.key,
          weekday: s.weekday,
          dayKey: dk,
          startMin: s.startMinute,
          endMin,
          startClock: clockFromMinutes(s.startMinute),
          endClock: clockFromMinutes(endMin),
          startUtcIso,
          endUtcIso,
          sessionNumber: null,
          totalSessions: null,
          isRepresentativeProjection: true,
          isReferencePreview: true,
          isFiniteOccurrence: false,
          hasVisibleDateConflict,
          visibleConflictTooltip: hasVisibleDateConflict
            ? 'Khung giờ này đã có lịch vào ngày đang xem. Hệ thống sẽ kiểm tra lại khi chọn ngày bắt đầu.'
            : null,
        });
      }
    }
  }

  return {
    mode: 'visible_representative',
    slots,
    occurrences: [],
    weeklyPatternCount: sorted.length,
    courseStartDate: null,
    courseEndDate: null,
    referenceWeekKey: mondayOfDateKey(loopStart),
    startDateWarning: null,
  };
}

/**
 * Resolves per-level registration availability (N5–N2) for the current Mentor.
 * A level is blocked only by an active PendingReview / ChangesRequested / active Approved proposal
 * or a recruiting / ongoing StudyCohort. Unsubmitted in-progress selections (`Draft`) never block levels.
 */
export function resolveJlptLevelAvailability({
  availableLevels = [],
  qualifiedLevels = [],
  proposals = [],
  cohorts = [],
  currentProposalId = null,
  mentorVerified = true,
  mentorVerifiedJlptLevel = null,
  maxActiveClassesByLevel = null,
  maxActiveClassesPerLevel = 1,
  maxTotalActiveClassesPerMentor = 0,
  nowMs = Date.now(),
}) {
  const effectiveMaxPerLevel = Math.max(1, Number(maxActiveClassesPerLevel) || 1);
  const effectiveMaxTotal = Math.max(0, Number(maxTotalActiveClassesPerMentor) || 0);
  const source = (Array.isArray(availableLevels) && availableLevels.length > 0 ? availableLevels : qualifiedLevels) || [];
  const supported = source.filter((lvl) =>
    SUPPORTED_PROPOSAL_JLPT_CODES.includes(String(lvl?.code || '').trim().toUpperCase())
  );

  const levelIdByCode = new Map(
    supported.map((lvl) => [String(lvl.code).trim().toUpperCase(), Number(lvl.certificateLevelId ?? lvl.id)])
  );

  const activeCohorts = (cohorts || []).filter((c) => {
    if (!c) return false;
    const status = String(c.status || '').trim();
    if (!status || status === 'Cancelled' || status === 'Completed') return false;
    const confirmed = Number(c.confirmedEnrolledCount ?? c.enrolledCount ?? 0);
    const endsAtMs = c.endsAt ? new Date(c.endsAt).getTime() : NaN;
    if (confirmed === 0 && Number.isFinite(endsAtMs) && endsAtMs <= nowMs) return false;
    return true;
  });

  const endedCohortById = new Map();
  for (const c of cohorts || []) {
    if (!c?.id) continue;
    const status = String(c.status || '').trim();
    const confirmed = Number(c.confirmedEnrolledCount ?? c.enrolledCount ?? 0);
    const endsAtMs = c.endsAt ? new Date(c.endsAt).getTime() : NaN;
    if (status === 'Cancelled' || status === 'Completed' || (confirmed === 0 && Number.isFinite(endsAtMs) && endsAtMs <= nowMs)) {
      endedCohortById.set(Number(c.id), c);
    }
  }

  const activeCohortByProposalId = new Map();
  const activeCohortByLevelId = new Map();
  const activeCountByLevelId = new Map();
  const countedProposalIds = new Set();

  for (const c of activeCohorts) {
    if (c.sourceProposalId != null) {
      activeCohortByProposalId.set(Number(c.sourceProposalId), c);
      countedProposalIds.add(Number(c.sourceProposalId));
    }
    const cid = Number(c.certificateLevelId ?? levelIdByCode.get(String(c.jlptLevelCode || c.levelCode || c.level || '').toUpperCase()) ?? 0);
    if (cid > 0) {
      activeCountByLevelId.set(cid, (activeCountByLevelId.get(cid) || 0) + 1);
      if (!activeCohortByLevelId.has(cid)) {
        activeCohortByLevelId.set(cid, c);
      }
    }
  }

  const activeProposalByLevelId = new Map();
  for (const p of proposals || []) {
    if (!p || !p.certificateLevelId) continue;
    if (currentProposalId != null && Number(p.id) === Number(currentProposalId)) continue;
    const lvlId = Number(p.certificateLevelId);
    if (p.status === 'PendingReview' || p.status === 'ChangesRequested') {
      activeCountByLevelId.set(lvlId, (activeCountByLevelId.get(lvlId) || 0) + 1);
      if (!activeProposalByLevelId.has(lvlId)) activeProposalByLevelId.set(lvlId, p);
    } else if (p.status === 'Approved' && !countedProposalIds.has(Number(p.id))) {
      const linked = activeCohortByProposalId.get(Number(p.id));
      const hasLinkedEnded = p.linkedCohortStatus === 'Cancelled'
        || p.linkedCohortStatus === 'Completed'
        || (p.linkedCohortId != null && endedCohortById.has(Number(p.linkedCohortId)));
      const hasFutureGenerated = (Array.isArray(p.generatedAvailabilityIds) && p.generatedAvailabilityIds.length > 0)
        && (!p.occurrencesPreview?.length || p.occurrencesPreview.some((o) => new Date(o.endUtc || o.endUtcIso || `${o.localDate}T23:59:00+07:00`).getTime() > nowMs));
      if (!hasLinkedEnded && (linked || (!p.linkedCohortId && hasFutureGenerated))) {
        activeCountByLevelId.set(lvlId, (activeCountByLevelId.get(lvlId) || 0) + 1);
        if (!activeProposalByLevelId.has(lvlId)) activeProposalByLevelId.set(lvlId, p);
      }
    }
  }

  let totalActiveClasses = 0;
  for (const cnt of activeCountByLevelId.values()) {
    totalActiveClasses += cnt;
  }
  const totalLimitReached = effectiveMaxTotal > 0 && totalActiveClasses >= effectiveMaxTotal;

  return supported.map((lvl) => {
    const id = Number(lvl.certificateLevelId ?? lvl.id);
    const code = String(lvl.code || '').trim().toUpperCase();
    const activeCount = activeCountByLevelId.get(id) || 0;
    const rawConfigured = maxActiveClassesByLevel && typeof maxActiveClassesByLevel === 'object'
      ? (maxActiveClassesByLevel[code] ?? maxActiveClassesByLevel[code.toLowerCase()])
      : undefined;
    const levelMax = Number.isFinite(Number(rawConfigured))
      ? Math.max(0, Number(rawConfigured))
      : Number.isFinite(Number(lvl.maxActiveClasses))
        ? Math.max(0, Number(lvl.maxActiveClasses))
        : effectiveMaxPerLevel;
    const levelDisabled = levelMax <= 0;
    const levelAtCap = levelMax > 0 && activeCount >= levelMax;
    const blockingCohort = levelAtCap ? activeCohortByLevelId.get(id) : null;
    const blockingProposal = levelAtCap ? activeProposalByLevelId.get(id) : null;

    // 1. Check verified teaching qualification first (server authoritative, mirrored client-side)
    let isQualified = lvl.isQualified !== false;
    let qualificationReason = lvl.qualificationReason || null;
    if (mentorVerified === false) {
      isQualified = false;
      qualificationReason = qualificationReason || 'Chưa có chứng chỉ chuyên môn được xác minh.';
    } else if (mentorVerifiedJlptLevel && !canMentorTeachJlptLevel(mentorVerifiedJlptLevel, code)) {
      isQualified = false;
      qualificationReason = qualificationReason || 'Không đủ trình độ chuyên môn.';
    }

    // 2. Compute fresh client status (mirrors instant UI changes on withdraw/submit),
    // then honor explicit server fields when no client override disagrees.
    let isAvailable = isQualified;
    let unavailableReason = isQualified ? null : (qualificationReason || 'Không đủ trình độ chuyên môn.');
    let blockingStatus = isQualified ? null : (mentorVerified === false ? 'UnverifiedQualification' : 'InsufficientQualification');
    let blockingProposalId = null;
    let blockingCohortId = null;
    let blockingTitle = null;

    if (!isQualified) {
      // Already blocked by qualification; keep exact qualification reason.
    } else if (levelDisabled) {
      isAvailable = false;
      blockingStatus = 'LevelDisabled';
      unavailableReason = `Cấp độ JLPT ${code} hiện tạm ngưng nhận đăng ký mở lớp mới theo cấu hình hệ thống.`;
    } else if (totalLimitReached) {
      isAvailable = false;
      blockingStatus = 'TotalClassLimit';
      unavailableReason = `Bạn đã đạt giới hạn tối đa ${effectiveMaxTotal} lớp/đề xuất đang hoạt động (${totalActiveClasses}/${effectiveMaxTotal}).`;
    } else if (blockingCohort) {
      isAvailable = false;
      const isFuture = blockingCohort.startsAt && new Date(blockingCohort.startsAt).getTime() > nowMs;
      blockingStatus = levelMax === 1
        ? (isFuture && blockingCohort.status === 'Published' ? 'RecruitingCohort' : 'ActiveCohort')
        : 'LevelLimitReached';
      unavailableReason = levelMax === 1
        ? (blockingStatus === 'RecruitingCohort'
          ? `Bạn đã có lớp ${code} đang mở tuyển sinh.`
          : `Bạn đã có lớp ${code} đang mở.`)
        : `Bạn đã đạt giới hạn tối đa ${levelMax} lớp/đề xuất đang hoạt động ở cấp độ JLPT ${code} (${activeCount}/${levelMax}).`;
      blockingCohortId = Number(blockingCohort.id);
      blockingProposalId = blockingCohort.sourceProposalId ? Number(blockingCohort.sourceProposalId) : null;
      blockingTitle = blockingCohort.name || null;
    } else if (blockingProposal) {
      isAvailable = false;
      blockingStatus = levelMax === 1 ? blockingProposal.status : 'LevelLimitReached';
      blockingProposalId = Number(blockingProposal.id);
      blockingTitle = blockingProposal.courseTitle || null;
      if (levelMax > 1) {
        unavailableReason = `Bạn đã đạt giới hạn tối đa ${levelMax} lớp/đề xuất đang hoạt động ở cấp độ JLPT ${code} (${activeCount}/${levelMax}).`;
      } else if (blockingProposal.status === 'PendingReview') {
        unavailableReason = `Bạn đã có lớp ${code} đang chờ duyệt.`;
      } else if (blockingProposal.status === 'ChangesRequested') {
        unavailableReason = `Bạn đã có lớp ${code} cần chỉnh sửa bổ sung.`;
      } else {
        unavailableReason = `Bạn đã có lớp ${code} đã duyệt.`;
      }
    } else if (lvl.isAvailableForNewProposal === false && (currentProposalId == null || Number(lvl.blockingProposalId) !== Number(currentProposalId))) {
      const serverCohortEnded = lvl.blockingCohortId != null && endedCohortById.has(Number(lvl.blockingCohortId));
      const serverProposalReleased = lvl.blockingProposalId != null && (proposals || []).some(
        (p) => Number(p.id) === Number(lvl.blockingProposalId) && (p.status === 'Rejected' || p.status === 'Withdrawn'),
      );
      if (!serverCohortEnded && !serverProposalReleased) {
        isAvailable = false;
        unavailableReason = lvl.unavailableReason || `Cấp độ ${code} hiện không khả dụng.`;
        blockingStatus = lvl.blockingStatus || null;
        blockingProposalId = lvl.blockingProposalId ? Number(lvl.blockingProposalId) : null;
        blockingCohortId = lvl.blockingCohortId ? Number(lvl.blockingCohortId) : null;
        blockingTitle = lvl.blockingTitle || null;
      }
    }

    const levelRemaining = Math.max(0, levelMax - activeCount);
    const remainingSlots = !isAvailable
      ? 0
      : effectiveMaxTotal > 0
        ? Math.max(0, Math.min(levelRemaining, effectiveMaxTotal - totalActiveClasses))
        : levelRemaining;

    return {
      ...lvl,
      certificateLevelId: id,
      code,
      isQualified,
      qualificationReason,
      isAvailable,
      unavailableReason,
      blockingStatus,
      blockingProposalId,
      blockingCohortId,
      blockingTitle,
      activeCount,
      maxActiveClasses: levelMax,
      remainingSlots,
    };
  });
}

/**
 * Computes whether the Mentor has exhausted all JLPT levels or total class / weekly load capacity
 * permitted by their verified qualification and active Admin policy.
 */
export function computeMentorRegistrationCapacity({
  levelAvailability = [],
  mentorVerified = true,
  loaded = true,
  weeklySessionCap = 0,
  currentWeeklyCommittedCount = 0,
  minSessionsPerWeek = 0,
  maxTotalActiveClassesPerMentor = 0,
} = {}) {
  const list = Array.isArray(levelAvailability) ? levelAvailability : [];
  const qualifiedLevels = list.filter((l) => l && l.isQualified);
  const availableLevels = qualifiedLevels.filter((l) => l.isAvailable);
  const totalActiveCount = list.reduce((sum, l) => sum + Number(l?.activeCount || 0), 0);
  const effectiveMaxTotal = Math.max(0, Number(maxTotalActiveClassesPerMentor) || 0);
  const totalLimitReached = Boolean(
    loaded
    && mentorVerified
    && qualifiedLevels.length > 0
    && (list.some((l) => l?.blockingStatus === 'TotalClassLimit')
      || (effectiveMaxTotal > 0 && totalActiveCount >= effectiveMaxTotal)),
  );
  const noLevelsLeft = Boolean(
    loaded && mentorVerified && qualifiedLevels.length > 0 && availableLevels.length === 0,
  );
  const remainingWeeklySlots = Number(weeklySessionCap) > 0
    ? Math.max(0, Number(weeklySessionCap) - Math.max(0, Number(currentWeeklyCommittedCount) || 0))
    : null;
  const weeklyCapExhausted = Boolean(
    loaded
    && mentorVerified
    && qualifiedLevels.length > 0
    && remainingWeeklySlots !== null
    && Number(minSessionsPerWeek) > 0
    && remainingWeeklySlots < Number(minSessionsPerWeek),
  );
  const isCapacityExhausted = totalLimitReached || noLevelsLeft || weeklyCapExhausted;
  return {
    qualifiedCount: qualifiedLevels.length,
    availableCount: availableLevels.length,
    usedCount: Math.max(0, qualifiedLevels.length - availableLevels.length),
    totalActiveCount,
    maxTotalActiveClasses: effectiveMaxTotal,
    isCapacityExhausted,
    message: weeklyCapExhausted && !noLevelsLeft && !totalLimitReached
      ? `Hạn mức giảng dạy hằng tuần (${weeklySessionCap} buổi/tuần) không đủ cho một lớp mới.`
      : totalLimitReached
        ? `Bạn đã đạt giới hạn tối đa ${effectiveMaxTotal || totalActiveCount} lớp/đề xuất đang hoạt động.`
        : 'Bạn đã sử dụng hết hạn mức đăng ký ở tất cả các cấp độ đủ điều kiện giảng dạy.',
  };
}

function statusFriendlyText(status, kind) {
  if (status === 'PendingReview' || kind === 'pendingProposal') return 'đang chờ duyệt';
  if (status === 'ChangesRequested') return 'cần bổ sung';
  if (status === 'Published' || kind === 'cohort') return 'lớp đang mở';
  return 'đã duyệt';
}

function proposalLabelFromFields({ courseTitle, jlptLevelCode, status, id }) {
  const levelPrefix = jlptLevelCode ? `${jlptLevelCode} ` : '';
  const statusText = status === 'ChangesRequested' ? 'cần bổ sung' : 'đang chờ duyệt';
  if (courseTitle) return `${levelPrefix}"${courseTitle}" (${statusText})`;
  return `${levelPrefix}đề xuất ${statusText} #${id}`;
}

/**
 * Builds normalized commitment intervals from:
 * - Approved/Pending MentorAvailabilities & CohortSessions (`occupiedItems`), excluding rejected/cancelled items
 * - Other PendingReview / ChangesRequested teaching proposals (`otherProposals`, excluding `currentProposalId`)
 */
export function buildProposalCommitments({
  occupiedItems = [],
  otherProposals = [],
  currentProposalId = null,
  policy = DEFAULT_PROPOSAL_POLICY,
}) {
  const resolvedPolicy = normalizeProposalPolicy(policy);
  const commitments = [];

  for (const item of occupiedItems || []) {
    if (!item || !item.startMs || !item.endMs) continue;
    const itemStatus = String(item.status || '').trim();
    if (itemStatus === 'Cancelled' || itemStatus === 'Rejected' || itemStatus === 'Withdrawn') continue;
    commitments.push({
      id: item.id || `occ-${item.startMs}`,
      dayKey: item.dayKey || toVnDateKey(new Date(item.startMs)),
      weekday: dayKeyToWeekday(item.dayKey || toVnDateKey(new Date(item.startMs))),
      startMin: item.startMin,
      endMin: item.endMin,
      startMs: item.startMs,
      endMs: item.endMs,
      kind: item.kind || 'approved',
      status: itemStatus || (item.kind === 'cohort' ? 'Published' : 'Approved'),
      jlptLevelCode: item.jlptLevelCode || item.levelCode || null,
      proposalId: item.proposalId || null,
      cohortId: item.cohortId || null,
      label: item.label || 'Lịch đã xác nhận',
    });
  }

  for (const prop of otherProposals || []) {
    if (!prop) continue;
    if (prop.status !== 'PendingReview' && prop.status !== 'ChangesRequested') continue;
    if (currentProposalId != null && Number(prop.id) === Number(currentProposalId)) continue;
    const occs = Array.isArray(prop.occurrencesPreview) && prop.occurrencesPreview.length > 0
      ? prop.occurrencesPreview.map((o, idx) => {
        const startMs = new Date(o.startUtc || o.startUtcIso).getTime();
        const endMs = new Date(o.endUtc || o.endUtcIso).getTime();
        return {
          localDate: o.localDate,
          weekday: o.weekday,
          startMinute: o.startMinute,
          endMinute: o.endMinute,
          sessionNumber: o.sessionNumber || idx + 1,
          startMs,
          endMs,
        };
      })
      : expandProposalOccurrences({
        expectedStartDate: prop.expectedStartDate,
        weeklySessions: prop.weeklySessions || [],
        courseDurationWeeks: prop.courseDurationWeeks || resolvedPolicy.courseDurationWeeks,
        sessionDurationMinutes: prop.sessionDurationMinutes || resolvedPolicy.sessionDurationMinutes,
        nowMs: prop.submittedAtUtc ? new Date(prop.submittedAtUtc).getTime() : 0,
      });

    const label = proposalLabelFromFields({
      courseTitle: prop.courseTitle,
      jlptLevelCode: prop.jlptLevelCode,
      status: prop.status,
      id: prop.id,
    });
    const totalSessions = occs.length || null;
    for (let idx = 0; idx < occs.length; idx += 1) {
      const o = occs[idx];
      if (!o.startMs || !o.endMs) continue;
      const vnStartTotalMin = Math.floor((o.startMs + 7 * 3600_000) / 60_000);
      const vnEndTotalMin = Math.floor((o.endMs + 7 * 3600_000) / 60_000);
      const startMin = Number.isFinite(Number(o.startMinute))
        ? Number(o.startMinute)
        : ((vnStartTotalMin % 1440) + 1440) % 1440;
      const endMin = Number.isFinite(Number(o.endMinute))
        ? Number(o.endMinute)
        : ((vnEndTotalMin % 1440) + 1440) % 1440;
      commitments.push({
        id: `prop-${prop.id}-${o.startMs}`,
        dayKey: o.localDate,
        weekday: o.weekday,
        startMin,
        endMin,
        startMs: o.startMs,
        endMs: o.endMs,
        kind: 'pendingProposal',
        status: prop.status,
        jlptLevelCode: prop.jlptLevelCode || null,
        proposalId: Number(prop.id),
        cohortId: null,
        sessionNumber: o.sessionNumber || idx + 1,
        totalSessions,
        label,
      });
    }
  }

  return commitments;
}

function buildCommitmentConflictDescription(c) {
  const level = c.jlptLevelCode ? `lớp JLPT ${c.jlptLevelCode} ` : 'lịch ';
  const state = statusFriendlyText(c.status, c.kind);
  return `${level}${state} (${clockFromMinutes(c.startMin)}–${clockFromMinutes(c.endMin)})`;
}

function buildCommitmentOverlapReason(c, occ) {
  const levelText = c.jlptLevelCode ? `lớp JLPT ${c.jlptLevelCode}` : (c.label || 'lịch khác');
  const state = statusFriendlyText(c.status, c.kind);
  if (occ?.localDate) {
    return `Khung giờ này đã được đăng ký cho ${levelText} ${state} (Tuần ${occ.weekNumber} · ${occ.localDate} ${clockFromMinutes(c.startMin)}–${clockFromMinutes(c.endMin)}).`;
  }
  return `Khung giờ này đã được đăng ký cho ${levelText} ${state} (${clockFromMinutes(c.startMin)}–${clockFromMinutes(c.endMin)}).`;
}

function computeNextValidMinuteSuggestion({
  normalizedWeekday,
  blockedCommitment,
  currentSessions,
  expectedStartDate,
  viewAnchorKey,
  commitments,
  policy,
  nowMs,
}) {
  const candidates = [
    blockedCommitment.endMin + policy.restMinutes,
    blockedCommitment.startMin - policy.restMinutes - policy.sessionDurationMinutes,
  ];
  for (const cand of candidates) {
    if (cand < policy.operatingStartMinute || cand + policy.sessionDurationMinutes > policy.operatingEndMinute) continue;
    const aligned = Math.round(cand / policy.gridStepMinutes) * policy.gridStepMinutes;
    if (aligned !== cand) continue;
    // Quick conflict check using a flag to avoid infinite recursion
    const conflictExists = (commitments || []).some((c) => {
      if (c.weekday !== normalizedWeekday) return false;
      if (expectedStartDate && (c.dayKey < expectedStartDate || c.dayKey > shiftDateKey(expectedStartDate, policy.courseDurationWeeks * 7))) {
        return false;
      }
      const gap = aligned >= c.endMin ? aligned - c.endMin : c.startMin - (aligned + policy.sessionDurationMinutes);
      return gap < policy.restMinutes;
    });
    if (conflictExists) continue;
    const ownConflict = (currentSessions || []).some((s) => {
      if (s.weekday !== normalizedWeekday) return false;
      const gap = aligned >= s.endMinute ? aligned - s.endMinute : s.startMinute - (aligned + policy.sessionDurationMinutes);
      return gap < policy.restMinutes;
    });
    if (!ownConflict) {
      void viewAnchorKey;
      void nowMs;
      return aligned;
    }
  }
  return null;
}

/**
 * Single authoritative validation for adding or replacing ONE weekly session in a proposal.
 * Used by: calendar click, drag/move, Quick Registration preview, alternative finder, and restoration.
 * Enforces the 2–4 sessions/week per-proposal cap IMMEDIATELY and prevents overlapping pending/approved slots
 * even BEFORE `expectedStartDate` is chosen (preliminary check + exact viewed week check).
 */
export function validateWeeklySlotAddition({
  weekday,
  startMinute,
  currentSessions = [],
  replaceKey = null,
  expectedStartDate = null,
  viewAnchorKey = null,
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
}) {
  const p = normalizeProposalPolicy(policy);
  const normalizedWeekday = Number(weekday);
  const startMin = Number(startMinute);
  const endMin = startMin + p.sessionDurationMinutes;
  const targetKey = weeklySlotKey(normalizedWeekday, startMin);

  const others = sortWeeklySessions(currentSessions).filter(
    (s) => s.key !== replaceKey && s.key !== targetKey
  );

  // 1. Hard per-proposal cap (max 4 sessions/week — rejects 5th immediately before state mutation)
  if (others.length + 1 > p.maxSessionsPerWeek) {
    return {
      valid: false,
      code: 'PROPOSAL_MAX_SESSIONS_EXCEEDED',
      reason: `Mỗi đề xuất mở lớp chỉ được chọn tối đa ${p.maxSessionsPerWeek} buổi/tuần. Hãy bỏ bớt một buổi hoặc tạo đề xuất khác cấp độ.`,
    };
  }

  // 2. Weekday & operating bounds & grid alignment
  if (normalizedWeekday < 0 || normalizedWeekday > 6) {
    return { valid: false, code: 'PROPOSAL_INVALID_SESSION_SLOT', reason: 'Thứ trong tuần không hợp lệ.' };
  }
  if (startMin < p.operatingStartMinute || endMin > p.operatingEndMinute) {
    return {
      valid: false,
      code: 'OUT_OF_HOURS',
      reason: `Buổi học ${p.sessionDurationMinutes} phút phải nằm trọn trong khung giờ ${clockFromMinutes(p.operatingStartMinute)}–${clockFromMinutes(p.operatingEndMinute)}.`,
    };
  }
  if (startMin % p.gridStepMinutes !== 0) {
    return {
      valid: false,
      code: 'GRID_ALIGNMENT',
      reason: `Giờ bắt đầu phải chẵn theo bước ${p.gridStepMinutes} phút.`,
    };
  }

  // 3. Same-proposal overlap & minimum 15-min rest check (gap === 15 ALLOWED, gap <= 14 BLOCKED)
  for (const existing of others) {
    if (existing.weekday !== normalizedWeekday) continue;
    if (startMin < existing.endMinute && existing.startMinute < endMin) {
      return {
        valid: false,
        code: 'PROPOSAL_OWN_OVERLAP',
        reason: `Trùng giờ với buổi đã chọn ${weekdayLabelVn(normalizedWeekday)} ${existing.startClock}–${existing.endClock}.`,
      };
    }
    const gap = startMin >= existing.endMinute
      ? startMin - existing.endMinute
      : existing.startMinute - endMin;
    if (gap < p.restMinutes) {
      const suggestedStartMin = startMin >= existing.endMinute
        ? existing.endMinute + p.restMinutes
        : existing.startMinute - p.restMinutes - p.sessionDurationMinutes;
      const validSuggestion = suggestedStartMin >= p.operatingStartMinute
        && suggestedStartMin + p.sessionDurationMinutes <= p.operatingEndMinute;
      return {
        valid: false,
        code: 'PROPOSAL_OWN_REST_VIOLATION',
        reason: `Quá sát buổi ${existing.startClock}–${existing.endClock}; cần nghỉ tối thiểu ${p.restMinutes} phút giữa hai buổi.`,
        suggestedStartMin: validSuggestion ? suggestedStartMin : null,
      };
    }
  }

  // 4A. Full 10-week occurrence validation when `expectedStartDate` is valid (strict date-range intersection!)
  const startDateCheckForExpansion = expectedStartDate
    ? validateCourseStartDate({
      dayKey: expectedStartDate,
      weeklySessions: sortWeeklySessions([
        ...others,
        { weekday: normalizedWeekday, startMinute: startMin, endMinute: endMin },
      ]),
      policy: p,
      nowMs,
    })
    : { valid: false };

  if (expectedStartDate && startDateCheckForExpansion.valid) {
    const candidateList = sortWeeklySessions([
      ...others,
      { weekday: normalizedWeekday, startMinute: startMin, endMinute: endMin },
    ]);
    const occurrences = expandProposalOccurrences({
      expectedStartDate,
      weeklySessions: candidateList,
      courseDurationWeeks: p.courseDurationWeeks,
      sessionDurationMinutes: p.sessionDurationMinutes,
    });
    const addedOccs = occurrences.filter((o) => o.weekday === normalizedWeekday && o.startMinute === startMin);
    const restMs = p.restMinutes * 60 * 1000;

    for (const occ of addedOccs) {
      for (const c of commitments || []) {
        if (c.startMs < occ.endMs && occ.startMs < c.endMs) {
          return {
            valid: false,
            code: c.kind === 'pendingProposal' ? 'PROPOSAL_CONFLICT_PENDING_PROPOSAL' : 'PROPOSAL_CONFLICT_APPROVED_SCHEDULE',
            reason: buildCommitmentOverlapReason(c, occ),
            conflictDate: occ.localDate,
            conflictTime: `${clockFromMinutes(c.startMin)}–${clockFromMinutes(c.endMin)}`,
            conflictJlptLevel: c.jlptLevelCode,
            conflictStatus: c.status,
            conflictLabel: c.label,
            suggestedStartMin: computeNextValidMinuteSuggestion({
              normalizedWeekday,
              blockedCommitment: c,
              currentSessions: others,
              expectedStartDate,
              viewAnchorKey,
              commitments,
              policy: p,
              nowMs,
            }),
          };
        }
        const gapMs = occ.startMs >= c.endMs ? occ.startMs - c.endMs : c.startMs - occ.endMs;
        if (gapMs < restMs) {
          return {
            valid: false,
            code: 'PROPOSAL_REST_VIOLATION',
            reason: `Tuần ${occ.weekNumber} (${occ.localDate} ${occ.localStart}–${occ.localEnd}) quá sát lịch ${buildCommitmentConflictDescription(c)}; cần nghỉ tối thiểu ${p.restMinutes} phút.`,
            conflictDate: occ.localDate,
            conflictTime: `${clockFromMinutes(c.startMin)}–${clockFromMinutes(c.endMin)}`,
            conflictJlptLevel: c.jlptLevelCode,
            conflictStatus: c.status,
            conflictLabel: c.label,
            suggestedStartMin: computeNextValidMinuteSuggestion({
              normalizedWeekday,
              blockedCommitment: c,
              currentSessions: others,
              expectedStartDate,
              viewAnchorKey,
              commitments,
              policy: p,
              nowMs,
            }),
          };
        }
      }

      if (p.dailySessionCap > 0) {
        const sameDayCommitments = (commitments || []).filter((c) => c.dayKey === occ.localDate).length;
        const sameDayProposal = occurrences.filter((o) => o.localDate === occ.localDate).length;
        if (sameDayCommitments + sameDayProposal > p.dailySessionCap) {
          return {
            valid: false,
            code: 'PROPOSAL_DAILY_CAP_EXCEEDED',
            reason: `Ngày ${occ.localDate} đạt ${sameDayCommitments + sameDayProposal} buổi, vượt giới hạn ${p.dailySessionCap} buổi/ngày theo chính sách.`,
            conflictDate: occ.localDate,
          };
        }
      }

      if (p.weeklySessionCap > 0) {
        const weekMon = mondayOfDateKey(occ.localDate);
        const weekEnd = shiftDateKey(weekMon, 7);
        const sameWeekCommitments = (commitments || []).filter((c) => c.dayKey >= weekMon && c.dayKey < weekEnd).length;
        const sameWeekProposal = occurrences.filter((o) => o.localDate >= weekMon && o.localDate < weekEnd).length;
        if (sameWeekCommitments + sameWeekProposal > p.weeklySessionCap) {
          return {
            valid: false,
            code: 'PROPOSAL_WEEKLY_CAP_EXCEEDED',
            reason: `Tuần ${occ.weekNumber} (bắt đầu ${weekMon}) đạt ${sameWeekCommitments + sameWeekProposal} buổi, vượt giới hạn ${p.weeklySessionCap} buổi/tuần theo chính sách.`,
            conflictDate: occ.localDate,
          };
        }
      }
    }
  } else {
    // 4B. Authoritative preliminary validation BEFORE a valid `expectedStartDate` is set:
    // Completely independent of Calendar view navigation (`viewAnchorKey` is intentionally NOT used!).
    // Checks upcoming commitments inside the future planning window `[todayVn, todayVn + leadDays + 10 weeks]`.
    void viewAnchorKey;
    const todayVn = toVnDateKey(new Date(nowMs));
    const leadDays = Math.max(0, Number(p.minimumProposalLeadDays ?? DEFAULT_PROPOSAL_POLICY.minimumProposalLeadDays));
    const horizonEndKey = shiftDateKey(todayVn, leadDays + p.courseDurationWeeks * 7);

    const relevant = (commitments || []).filter((c) => {
      if (Number(c.weekday) !== normalizedWeekday) return false;
      return c.endMs > nowMs && c.dayKey >= todayVn && c.dayKey <= horizonEndKey;
    });

    for (const c of relevant) {
      if (c.startMin < endMin && startMin < c.endMin) {
        return {
          valid: false,
          preliminary: true,
          code: c.kind === 'pendingProposal' ? 'PROPOSAL_CONFLICT_PENDING_PROPOSAL' : 'PROPOSAL_CONFLICT_APPROVED_SCHEDULE',
          reason: buildCommitmentOverlapReason(c),
          conflictDate: c.dayKey,
          conflictTime: `${clockFromMinutes(c.startMin)}–${clockFromMinutes(c.endMin)}`,
          conflictJlptLevel: c.jlptLevelCode,
          conflictStatus: c.status,
          conflictLabel: c.label,
          suggestedStartMin: computeNextValidMinuteSuggestion({
            normalizedWeekday,
            blockedCommitment: c,
            currentSessions: others,
            expectedStartDate: null,
            viewAnchorKey,
            commitments: relevant,
            policy: p,
            nowMs,
          }),
        };
      }

      const gapMin = startMin >= c.endMin ? startMin - c.endMin : c.startMin - endMin;
      if (gapMin < p.restMinutes) {
        return {
          valid: false,
          preliminary: true,
          code: 'PROPOSAL_REST_VIOLATION',
          reason: `${clockFromMinutes(startMin)}–${clockFromMinutes(endMin)} quá sát lịch ${buildCommitmentConflictDescription(c)}; cần nghỉ tối thiểu ${p.restMinutes} phút.`,
          conflictDate: c.dayKey,
          conflictTime: `${clockFromMinutes(c.startMin)}–${clockFromMinutes(c.endMin)}`,
          conflictJlptLevel: c.jlptLevelCode,
          conflictStatus: c.status,
          conflictLabel: c.label,
          suggestedStartMin: computeNextValidMinuteSuggestion({
            normalizedWeekday,
            blockedCommitment: c,
            currentSessions: others,
            expectedStartDate: null,
            viewAnchorKey,
            commitments: relevant,
            policy: p,
            nowMs,
          }),
        };
      }
    }

    if (p.dailySessionCap > 0 && relevant.length > 0) {
      const sameDayCounts = new Map();
      for (const c of relevant) {
        sameDayCounts.set(c.dayKey, (sameDayCounts.get(c.dayKey) || 0) + 1);
      }
      const peakCommitmentDayCount = Math.max(0, ...sameDayCounts.values());
      const sameWeekdayOwn = others.filter((s) => s.weekday === normalizedWeekday).length + 1;
      if (peakCommitmentDayCount + sameWeekdayOwn > p.dailySessionCap) {
        return {
          valid: false,
          preliminary: true,
          code: 'PROPOSAL_DAILY_CAP_EXCEEDED',
          reason: `${weekdayLabelVn(normalizedWeekday)} đã đạt ${peakCommitmentDayCount + sameWeekdayOwn} buổi, vượt giới hạn ${p.dailySessionCap} buổi/ngày theo chính sách.`,
        };
      }
    }
  }

  return {
    valid: true,
    slot: {
      key: targetKey,
      weekday: normalizedWeekday,
      startMinute: startMin,
      endMinute: endMin,
      startClock: clockFromMinutes(startMin),
      endClock: clockFromMinutes(endMin),
    },
  };
}

/**
 * Finds validated nearest alternative slots for a conflicted candidate:
 * 1) Same weekday & same daypart nearest to original time
 * 2) Same weekday other hours
 * 3) Other weekdays at the same/similar time
 * Every returned alternative has passed `validateWeeklySlotAddition`.
 */
export function findAlternativeSlotsForCandidate({
  weekday,
  startMinute,
  currentSessions = [],
  expectedStartDate = null,
  viewAnchorKey = null,
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
  maxSameDay = 3,
  maxOtherDays = 3,
}) {
  const p = normalizeProposalPolicy(policy);
  const targetDaypart = daypartForMinute(startMinute);
  const targetWin = PROPOSAL_DAYPART_WINDOWS[targetDaypart];
  const sameDay = [];
  const otherDays = [];

  const candidateMinutes = [];
  for (let m = p.operatingStartMinute; m + p.sessionDurationMinutes <= p.operatingEndMinute; m += p.gridStepMinutes) {
    candidateMinutes.push(m);
  }

  const orderedSameDayMinutes = [...candidateMinutes].sort((a, b) => {
    const aInWin = targetWin && a >= targetWin.startMin && a + p.sessionDurationMinutes <= targetWin.endMin ? 0 : 1;
    const bInWin = targetWin && b >= targetWin.startMin && b + p.sessionDurationMinutes <= targetWin.endMin ? 0 : 1;
    if (aInWin !== bInWin) return aInWin - bInWin;
    return Math.abs(a - startMinute) - Math.abs(b - startMinute);
  });

  for (const m of orderedSameDayMinutes) {
    if (m === startMinute) continue;
    const check = validateWeeklySlotAddition({
      weekday,
      startMinute: m,
      currentSessions,
      expectedStartDate,
      viewAnchorKey,
      commitments,
      policy: p,
      nowMs,
    });
    if (check.valid) {
      sameDay.push({
        ...check.slot,
        sameDay: true,
        label: `${check.slot.startClock}–${check.slot.endClock}`,
      });
      if (sameDay.length >= maxSameDay) break;
    }
  }

  for (const wd of ORDERED_WEEKDAYS) {
    if (wd === Number(weekday)) continue;
    const check = validateWeeklySlotAddition({
      weekday: wd,
      startMinute,
      currentSessions,
      expectedStartDate,
      viewAnchorKey,
      commitments,
      policy: p,
      nowMs,
    });
    if (check.valid) {
      otherDays.push({
        ...check.slot,
        sameDay: false,
        label: `${weekdayLabelVn(wd)} · ${check.slot.startClock}–${check.slot.endClock}`,
      });
      if (otherDays.length >= maxOtherDays) break;
    }
  }

  return [...sameDay, ...otherDays];
}

/**
 * Full proposal readiness validator used across Step 1, Step 2, Step 3, and Submit CTA.
 */
export function validateProposalState({
  proposal = {},
  availableLevels = null,
  qualifiedLevels = null,
  mentorVerified = true,
  mentorVerifiedJlptLevel = null,
  proposals = [],
  cohorts = [],
  coursePlans = [],
  commitments = [],
  viewAnchorKey = null,
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
}) {
  const p = normalizeProposalPolicy(policy);
  const errors = [];
  const warnings = [];
  const sessions = sortWeeklySessions(proposal.weeklySessions || []);
  const rawLevels = Array.isArray(availableLevels) && availableLevels.length > 0
    ? availableLevels
    : (Array.isArray(qualifiedLevels) ? qualifiedLevels : []);
  const levelAvailability = resolveJlptLevelAvailability({
    availableLevels: rawLevels,
    qualifiedLevels,
    mentorVerified,
    mentorVerifiedJlptLevel,
    proposals,
    cohorts,
    currentProposalId: proposal.id || null,
    maxActiveClassesByLevel: p.maxActiveClassesByLevel,
    maxTotalActiveClassesPerMentor: p.maxTotalActiveClassesPerMentor,
    nowMs,
  });

  // Step 2 metadata checks: JLPT level (N5-N2 + no duplicate active level), Start Date, Objective
  if (!proposal.certificateLevelId) {
    errors.push({
      step: 2,
      field: 'certificateLevelId',
      code: 'PROPOSAL_LEVEL_REQUIRED',
      message: 'Vui lòng chọn trình độ JLPT dự kiến giảng dạy.',
    });
  } else {
    const rawLevel = rawLevels.find((l) => Number(l.certificateLevelId ?? l.id) === Number(proposal.certificateLevelId));
    const supportedLevel = levelAvailability.find((l) => l.certificateLevelId === Number(proposal.certificateLevelId));
    if (rawLevels.length > 0 && !rawLevel && !supportedLevel) {
      errors.push({
        step: 2,
        field: 'certificateLevelId',
        code: 'PROPOSAL_LEVEL_INVALID',
        message: 'Trình độ JLPT đã chọn không tồn tại hoặc không còn hoạt động.',
      });
    } else if (rawLevel && !SUPPORTED_PROPOSAL_JLPT_CODES.includes(String(rawLevel.code || '').trim().toUpperCase())) {
      errors.push({
        step: 2,
        field: 'certificateLevelId',
        code: 'PROPOSAL_LEVEL_NOT_SUPPORTED',
        message: `Hệ thống chỉ hỗ trợ đăng ký mở lớp cho cấp độ N5–N2 (cấp độ ${rawLevel.code} không thuộc phạm vi mở lớp).`,
      });
    } else if (supportedLevel && !supportedLevel.isAvailable) {
      const qualCode = supportedLevel.blockingStatus === 'UnverifiedQualification'
        ? 'MENTOR_QUALIFICATION_NOT_VERIFIED'
        : supportedLevel.blockingStatus === 'InsufficientQualification'
          ? 'INSUFFICIENT_TEACHING_QUALIFICATION'
          : supportedLevel.blockingStatus === 'LevelDisabled'
            ? 'PROPOSAL_LEVEL_DISABLED'
            : supportedLevel.blockingStatus === 'TotalClassLimit'
              ? 'MENTOR_TOTAL_CLASS_LIMIT_REACHED'
              : 'PROPOSAL_DUPLICATE_ACTIVE_LEVEL';
      errors.push({
        step: 2,
        field: 'certificateLevelId',
        code: qualCode,
        message: supportedLevel.unavailableReason || `${supportedLevel.code}: Cấp độ này hiện không khả dụng.`,
      });
    }
  }

  if (!String(proposal.courseTitle || '').trim()) {
    errors.push({
      step: 2,
      field: 'courseTitle',
      code: 'PROPOSAL_TITLE_REQUIRED',
      message: 'Vui lòng nhập tên lớp.',
    });
  }

  if (!String(proposal.courseObjective || '').trim()) {
    errors.push({
      step: 2,
      field: 'courseObjective',
      code: 'PROPOSAL_OBJECTIVE_REQUIRED',
      message: 'Vui lòng nhập mục tiêu khóa học.',
    });
  }

  const structuralStartCheck = validateCourseStartDate({
    dayKey: proposal.expectedStartDate,
    weeklySessions: sessions,
    commitments: [],
    policy: p,
    nowMs,
  });
  const startCheck = structuralStartCheck.valid
    ? validateCourseStartDate({
      dayKey: proposal.expectedStartDate,
      weeklySessions: sessions,
      commitments,
      policy: p,
      nowMs,
    })
    : structuralStartCheck;

  if (!startCheck.valid) {
    errors.push({
      step: 2,
      field: 'expectedStartDate',
      code: startCheck.code,
      message: startCheck.reason,
    });
  }

  // Keep optional compatibility check only if legacy proposal still holds coursePlanId
  const selectedPlan = proposal.coursePlanId
    ? (coursePlans || []).find((pl) => Number(pl.id) === Number(proposal.coursePlanId))
    : null;
  if (selectedPlan && sessions.length > 0 && Number(selectedPlan.sessionsPerWeek) !== sessions.length) {
    errors.push({
      step: 1,
      field: 'weeklySessions',
      code: 'PROPOSAL_PLAN_MISMATCH',
      message: `Gói "${selectedPlan.name}" yêu cầu đúng ${selectedPlan.sessionsPerWeek} buổi/tuần (hiện chọn ${sessions.length} buổi/tuần).`,
    });
  }

  // Step 1 schedule checks: dynamic sessions/week from active policy
  if (sessions.length < p.minSessionsPerWeek) {
    errors.push({
      step: 1,
      field: 'weeklySessions',
      code: 'PROPOSAL_MIN_SESSIONS_NOT_MET',
      message: `Cần chọn thêm ${p.minSessionsPerWeek - sessions.length} buổi để đạt tối thiểu ${p.minSessionsPerWeek} buổi/tuần (hiện có ${sessions.length}/${p.maxSessionsPerWeek}).`,
    });
  } else if (sessions.length > p.maxSessionsPerWeek) {
    errors.push({
      step: 1,
      field: 'weeklySessions',
      code: 'PROPOSAL_MAX_SESSIONS_EXCEEDED',
      message: `Mỗi đề xuất chỉ được chọn tối đa ${p.maxSessionsPerWeek} buổi/tuần (hiện có ${sessions.length} buổi/tuần).`,
    });
  } else if (Array.isArray(p.allowedSessionsPerWeek) && p.allowedSessionsPerWeek.length > 0 && !p.allowedSessionsPerWeek.includes(sessions.length)) {
    errors.push({
      step: 1,
      field: 'weeklySessions',
      code: 'PROPOSAL_UNSUPPORTED_WEEKLY_COUNT',
      message: `Số buổi mỗi tuần phải nằm trong danh sách cho phép (${p.allowedSessionsPerWeek.join(', ')} buổi/tuần).`,
    });
  }

  const validatedSoFar = [];
  for (const s of sessions) {
    const check = validateWeeklySlotAddition({
      weekday: s.weekday,
      startMinute: s.startMinute,
      currentSessions: validatedSoFar,
      expectedStartDate: proposal.expectedStartDate || null,
      viewAnchorKey,
      commitments,
      policy: p,
      nowMs,
    });
    if (!check.valid) {
      errors.push({
        step: 1,
        field: 'weeklySessions',
        code: check.code,
        message: check.reason,
        slotKey: s.key,
        preliminary: Boolean(check.preliminary),
        conflictDate: check.conflictDate || null,
        conflictTime: check.conflictTime || null,
        conflictJlptLevel: check.conflictJlptLevel || null,
        conflictStatus: check.conflictStatus || null,
      });
    } else {
      validatedSoFar.push(check.slot);
    }
  }

  const occurrences = proposal.expectedStartDate && sessions.length > 0 && structuralStartCheck.valid
    ? expandProposalOccurrences({
      expectedStartDate: proposal.expectedStartDate,
      weeklySessions: sessions,
      courseDurationWeeks: p.courseDurationWeeks,
      sessionDurationMinutes: p.sessionDurationMinutes,
    })
    : [];

  if (occurrences.length > 0 && occurrences[0].startMs <= nowMs) {
    errors.push({
      step: 2,
      field: 'expectedStartDate',
      code: 'SESSION_ALREADY_STARTED',
      message: 'Buổi học đầu tiên đã trôi qua hoặc đã bắt đầu. Vui lòng chọn ngày bắt đầu muộn hơn.',
    });
  }

  if (!proposal.expectedStartDate && sessions.length > 0 && !errors.some((e) => e.step === 1)) {
    warnings.push({
      code: 'PRELIMINARY_VALIDATION_ONLY',
      message: `Đang kiểm tra sơ bộ theo lịch tuần. Chọn ngày bắt đầu ở Bước 2 để kiểm tra toàn bộ ${p.courseDurationWeeks} tuần.`,
    });
  }

  const step1Valid = !errors.some((e) => e.step === 1)
    && sessions.length >= p.minSessionsPerWeek
    && sessions.length <= p.maxSessionsPerWeek;
  const step2Valid = !errors.some((e) => e.step === 2);

  return {
    canSaveDraft: sessions.length <= p.maxSessionsPerWeek,
    canSubmit: errors.length === 0 && step1Valid && step2Valid && occurrences.length > 0,
    validationScope: proposal.expectedStartDate ? 'full_10_weeks' : 'preliminary',
    step1Valid,
    step2Valid,
    levelAvailability,
    weeklySessionCount: sessions.length,
    totalSessions: sessions.length * p.courseDurationWeeks,
    totalTeachingHours: Math.round(((sessions.length * p.courseDurationWeeks * p.sessionDurationMinutes) / 60) * 10) / 10,
    projectedEndDate: occurrences.length > 0 ? occurrences[occurrences.length - 1].localDate : null,
    occurrences,
    errors,
    warnings,
  };
}

/**
 * Shared Smart Quick Registration Preview Engine.
 * - Mode B (daypart rules) creates ONE aligned 90-min slot per selected (weekday, daypart) rule
 *   (or uses explicit per-rule start time override), NEVER expanding one selection into multiple slots
 *   and NEVER silently truncating Friday.
 * - Mode A / explicit candidates pass exact `candidateInputs` (`[{ weekday, startMinute }]`).
 * - Never silently discards conflicts or >4 overflows; enriches each conflicted slot with validated alternatives.
 */
export function buildProposalQuickFillPreview({
  candidateInputs = [],
  selectedDaypartRules = null,
  ruleStartMinutes = {},
  currentSessions = [],
  expectedStartDate = null,
  viewAnchorKey = null,
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  mode = 'append', // 'append' | 'replace'
  nowMs = Date.now(),
}) {
  const p = normalizeProposalPolicy(policy);
  const rawCandidates = [];

  if (Array.isArray(candidateInputs) && candidateInputs.length > 0) {
    for (const c of candidateInputs) {
      if (c == null) continue;
      rawCandidates.push({
        weekday: Number(c.weekday),
        startMinute: Number(c.startMinute),
        sourceRuleKey: c.sourceRuleKey || null,
      });
    }
  } else if (selectedDaypartRules && selectedDaypartRules.size > 0) {
    const orderedRules = [...selectedDaypartRules]
      .map((ruleKey) => {
        const [wdStr, daypart] = String(ruleKey).split('-');
        return { ruleKey: String(ruleKey), weekday: Number(wdStr), daypart };
      })
      .filter((r) => Number.isFinite(r.weekday) && PROPOSAL_DAYPART_WINDOWS[r.daypart])
      .sort((a, b) => (((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)));

    for (const { ruleKey, weekday, daypart } of orderedRules) {
      const win = PROPOSAL_DAYPART_WINDOWS[daypart];
      const overrideMin = Number(ruleStartMinutes?.[ruleKey]);
      const chosenStartMin = Number.isFinite(overrideMin) ? overrideMin : win.defaultStartMin;
      rawCandidates.push({
        weekday,
        startMinute: chosenStartMin,
        sourceRuleKey: ruleKey,
      });
    }
  }

  const keptSessions = mode === 'replace' ? [] : sortWeeklySessions(currentSessions);
  const replacedSessions = mode === 'replace' ? sortWeeklySessions(currentSessions) : [];
  const working = [...keptSessions];
  const validCandidates = [];
  const rejectedCandidates = [];

  for (const cand of rawCandidates) {
    const key = weeklySlotKey(cand.weekday, cand.startMinute);
    if (working.some((s) => s.key === key)) {
      rejectedCandidates.push({
        key,
        weekday: cand.weekday,
        startMinute: cand.startMinute,
        endMinute: cand.startMinute + p.sessionDurationMinutes,
        startClock: clockFromMinutes(cand.startMinute),
        endClock: clockFromMinutes(cand.startMinute + p.sessionDurationMinutes),
        code: 'ALREADY_SELECTED',
        reason: 'Khung giờ này đã có trong lịch đang chọn.',
        alternatives: [],
      });
      continue;
    }

    const res = validateWeeklySlotAddition({
      weekday: cand.weekday,
      startMinute: cand.startMinute,
      currentSessions: working,
      expectedStartDate,
      viewAnchorKey,
      commitments,
      policy: p,
      nowMs,
    });

    if (res.valid) {
      working.push(res.slot);
      validCandidates.push(res.slot);
    } else {
      const alternatives = res.code === 'PROPOSAL_MAX_SESSIONS_EXCEEDED'
        ? []
        : findAlternativeSlotsForCandidate({
          weekday: cand.weekday,
          startMinute: cand.startMinute,
          currentSessions: working,
          expectedStartDate,
          viewAnchorKey,
          commitments,
          policy: p,
          nowMs,
          maxSameDay: 3,
          maxOtherDays: 2,
        });

      rejectedCandidates.push({
        key,
        weekday: cand.weekday,
        startMinute: cand.startMinute,
        endMinute: cand.startMinute + p.sessionDurationMinutes,
        startClock: clockFromMinutes(cand.startMinute),
        endClock: clockFromMinutes(cand.startMinute + p.sessionDurationMinutes),
        code: res.code,
        reason: res.reason,
        preliminary: Boolean(res.preliminary),
        conflictDate: res.conflictDate || null,
        conflictJlptLevel: res.conflictJlptLevel || null,
        conflictStatus: res.conflictStatus || null,
        suggestedStartMin: res.suggestedStartMin ?? alternatives[0]?.startMinute ?? null,
        alternatives,
      });
    }
  }

  const resultingSessions = sortWeeklySessions(working);
  const exceededCapCount = rejectedCandidates.filter((r) => r.code === 'PROPOSAL_MAX_SESSIONS_EXCEEDED').length;
  const conflictCount = rejectedCandidates.filter(
    (r) => r.code !== 'PROPOSAL_MAX_SESSIONS_EXCEEDED' && r.code !== 'ALREADY_SELECTED'
  ).length;
  const alreadySelectedCount = rejectedCandidates.filter((r) => r.code === 'ALREADY_SELECTED').length;
  const addedCount = validCandidates.length;
  const hasBlockingIssues = conflictCount > 0 || exceededCapCount > 0 || resultingSessions.length > p.maxSessionsPerWeek;
  const remainingCapacity = Math.max(0, p.maxSessionsPerWeek - resultingSessions.length);

  return {
    mode,
    keptSessions,
    replacedSessions,
    validCandidates,
    rejectedCandidates,
    resultingSessions,
    addedCount,
    resultingCount: resultingSessions.length,
    totalSessions10Weeks: resultingSessions.length * p.courseDurationWeeks,
    totalHours10Weeks: Math.round(((resultingSessions.length * p.courseDurationWeeks * p.sessionDurationMinutes) / 60) * 10) / 10,
    remainingCapacity,
    exceededCapCount,
    conflictCount,
    alreadySelectedCount,
    hasBlockingIssues,
    canApply: validCandidates.length > 0 && !hasBlockingIssues && resultingSessions.length <= p.maxSessionsPerWeek,
  };
}

/** Built-in recurring patterns aligned to 2–4 sessions/week. */
export const QUICK_FILL_PRESETS = Object.freeze([
  {
    id: 'mwf-evening',
    label: 'Thứ 2 · Thứ 4 · Thứ 6 (19:00–20:30)',
    sessionsPerWeek: 3,
    slots: [
      { weekday: 1, startMinute: 19 * 60 },
      { weekday: 3, startMinute: 19 * 60 },
      { weekday: 5, startMinute: 19 * 60 },
    ],
  },
  {
    id: 'tts-evening',
    label: 'Thứ 3 · Thứ 5 · Thứ 7 (19:00–20:30)',
    sessionsPerWeek: 3,
    slots: [
      { weekday: 2, startMinute: 19 * 60 },
      { weekday: 4, startMinute: 19 * 60 },
      { weekday: 6, startMinute: 19 * 60 },
    ],
  },
  {
    id: 'tue-thu-evening',
    label: 'Thứ 3 · Thứ 5 (19:30–21:00)',
    sessionsPerWeek: 2,
    slots: [
      { weekday: 2, startMinute: 19 * 60 + 30 },
      { weekday: 4, startMinute: 19 * 60 + 30 },
    ],
  },
  {
    id: 'mon-wed-morning',
    label: 'Thứ 2 · Thứ 4 (08:30–10:00)',
    sessionsPerWeek: 2,
    slots: [
      { weekday: 1, startMinute: 8 * 60 + 30 },
      { weekday: 3, startMinute: 8 * 60 + 30 },
    ],
  },
  {
    id: 'mtwf-intensive',
    label: 'Thứ 2 · Thứ 3 · Thứ 5 · Thứ 6 (18:00–19:30)',
    sessionsPerWeek: 4,
    slots: [
      { weekday: 1, startMinute: 18 * 60 },
      { weekday: 2, startMinute: 18 * 60 },
      { weekday: 4, startMinute: 18 * 60 },
      { weekday: 5, startMinute: 18 * 60 },
    ],
  },
]);


/* ------------------------------------------------------------------------------------------------
 * Smart Scheduling Wizard — deterministic recommendation engine (Scheduling Core extension).
 *
 * Hard constraints are enforced ONLY through the existing authorities (`validateWeeklySlotAddition`,
 * `buildProposalQuickFillPreview`, `validateCourseStartDate`, `expandProposalOccurrences`): 90-min sessions,
 * 2–4 sessions/week per proposal, own overlap + 15-min rest, pending/approved/cohort commitments, daily/weekly caps,
 * operating hours, grid alignment and full 10-week occurrence checks when a valid start date exists.
 * Preferences (days, time windows, uniform time, even spread, no stacking, compact days) only RANK valid plans.
 * ---------------------------------------------------------------------------------------------- */

export const QUICK_SCHEDULE_TIME_WINDOW_IDS = Object.freeze(['Morning', 'Noon', 'Afternoon', 'Evening']);

const MAX_PLAN_VERIFICATIONS = 400;

/**
 * Time windows the wizard may offer, clipped to the real operating hours and kept only when they can hold
 * at least one grid-aligned session. Never opens hours the policy does not allow.
 */
export function resolveQuickScheduleTimeWindows(policy = DEFAULT_PROPOSAL_POLICY) {
  const p = normalizeProposalPolicy(policy);
  const step = p.gridStepMinutes || 15;
  return QUICK_SCHEDULE_TIME_WINDOW_IDS
    .map((id) => {
      const win = PROPOSAL_DAYPART_WINDOWS[id];
      const startMin = Math.max(win.startMin, p.operatingStartMinute);
      const endMin = Math.min(win.endMin, p.operatingEndMinute);
      const firstStart = Math.ceil(startMin / step) * step;
      if (firstStart + p.sessionDurationMinutes > endMin) return null;
      return {
        id,
        label: win.label,
        startMin,
        endMin,
        defaultStartMin: Math.min(Math.max(win.defaultStartMin, firstStart), endMin - p.sessionDurationMinutes),
        rangeLabel: `${clockFromMinutes(startMin)}–${clockFromMinutes(endMin)}`,
      };
    })
    .filter(Boolean);
}

function isFlexibleTime(timeWindows) {
  return !Array.isArray(timeWindows) || timeWindows.length === 0 || timeWindows.includes('any');
}

function resolveWindowRanges(timeWindows, p) {
  if (isFlexibleTime(timeWindows)) return [{ startMin: p.operatingStartMinute, endMin: p.operatingEndMinute }];
  const available = resolveQuickScheduleTimeWindows(p);
  return available.filter((w) => timeWindows.includes(w.id));
}

function candidateStartMinutes(ranges, p) {
  const step = p.gridStepMinutes || 15;
  const out = new Set();
  for (const r of ranges) {
    for (let m = Math.ceil(r.startMin / step) * step; m + p.sessionDurationMinutes <= r.endMin; m += step) {
      if (m >= p.operatingStartMinute && m + p.sessionDurationMinutes <= p.operatingEndMinute) out.add(m);
    }
  }
  return [...out].sort((a, b) => a - b);
}

function startFitsRanges(startMinute, ranges, p) {
  return ranges.some((r) => startMinute >= r.startMin && startMinute + p.sessionDurationMinutes <= r.endMin);
}

function maxSessionsPerDay(p) {
  const span = p.operatingEndMinute - p.operatingStartMinute + p.restMinutes;
  const byHours = Math.max(1, Math.floor(span / (p.sessionDurationMinutes + p.restMinutes)));
  return p.dailySessionCap > 0 ? Math.min(p.dailySessionCap, byHours) : byHours;
}

function combinations(items, size) {
  const out = [];
  const walk = (start, acc) => {
    if (acc.length === size) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < items.length; i += 1) {
      acc.push(items[i]);
      walk(i + 1, acc);
      acc.pop();
    }
  };
  if (size > 0 && size <= items.length) walk(0, []);
  return out;
}

/** Multisets (combinations with repetition) honouring a per-item cap. */
function multisets(items, size, capFor) {
  const out = [];
  const walk = (start, acc, counts) => {
    if (acc.length === size) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < items.length; i += 1) {
      const item = items[i];
      const used = counts.get(item) || 0;
      if (used >= capFor(item)) continue;
      counts.set(item, used + 1);
      acc.push(item);
      walk(i, acc, counts);
      acc.pop();
      counts.set(item, used);
    }
  };
  if (size > 0) walk(0, [], new Map());
  return out;
}

function resolveTargetCount(targetSessionsPerWeek, p) {
  const allowed = p.allowedSessionsPerWeek?.length ? p.allowedSessionsPerWeek : [p.minSessionsPerWeek, p.maxSessionsPerWeek];
  const n = Number(targetSessionsPerWeek);
  if (allowed.includes(n)) return n;
  return Math.max(p.minSessionsPerWeek, Math.min(p.maxSessionsPerWeek, Number.isFinite(n) ? n : p.defaultSessionsPerWeek));
}

/**
 * Step 2 gate: can the chosen days (with the chosen same-day option) host the number of NEW sessions needed?
 * `targetSessionsPerWeek` is always the FINAL total of the proposal (append mode searches only the remainder).
 */
export function assessQuickScheduleDayFeasibility({
  targetSessionsPerWeek,
  preferredWeekdays = [],
  flexibleDays = false,
  allowMultiplePerDay = false,
  currentSessions = [],
  mode = 'append',
  policy = DEFAULT_PROPOSAL_POLICY,
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const target = resolveTargetCount(targetSessionsPerWeek, p);
  const kept = mode === 'replace' ? [] : sortWeeklySessions(currentSessions);
  const neededCount = Math.max(0, target - kept.length);
  if (neededCount === 0) {
    return { feasible: false, code: 'ALREADY_AT_TARGET', neededCount, capacity: 0, target };
  }
  const selected = [...new Set((preferredWeekdays || []).map(Number).filter((d) => d >= 0 && d <= 6))];
  if (!flexibleDays && selected.length === 0) {
    return { feasible: false, code: 'NO_DAYS_SELECTED', neededCount, capacity: 0, target };
  }
  const pool = flexibleDays ? ORDERED_WEEKDAYS : ORDERED_WEEKDAYS.filter((d) => selected.includes(d));
  const perDay = maxSessionsPerDay(p);
  let capacity = 0;
  for (const d of pool) {
    const keptOnDay = kept.filter((s) => s.weekday === d).length;
    capacity += allowMultiplePerDay ? Math.max(0, perDay - keptOnDay) : (keptOnDay > 0 ? 0 : 1);
  }
  const feasible = capacity >= neededCount;
  return {
    feasible,
    code: feasible ? null : 'NOT_ENOUGH_DAYS',
    neededCount,
    capacity,
    target,
    missingDays: feasible ? 0 : neededCount - capacity,
  };
}

/**
 * Validates a COMPLETE weekly plan as a whole: every session is checked against all the other sessions of the
 * plan, so the expected start date (when valid for the plan) triggers the full 10-week occurrence check.
 */
export function validateCompleteWeeklyPlan({
  weeklySessions = [],
  expectedStartDate = null,
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const sessions = sortWeeklySessions(weeklySessions);
  const startCheck = expectedStartDate
    ? validateCourseStartDate({ dayKey: expectedStartDate, weeklySessions: sessions, policy: p, nowMs })
    : { valid: false, code: null };
  const failures = [];
  for (const s of sessions) {
    const res = validateWeeklySlotAddition({
      weekday: s.weekday,
      startMinute: s.startMinute,
      currentSessions: sessions.filter((o) => o.key !== s.key),
      expectedStartDate,
      commitments,
      policy: p,
      nowMs,
    });
    if (!res.valid) failures.push({ key: s.key, weekday: s.weekday, startMinute: s.startMinute, code: res.code, reason: res.reason });
  }
  let pastOccurrence = false;
  if (startCheck.valid && sessions.length > 0) {
    const occ = expandProposalOccurrences({
      expectedStartDate,
      weeklySessions: sessions,
      courseDurationWeeks: p.courseDurationWeeks,
      sessionDurationMinutes: p.sessionDurationMinutes,
    });
    pastOccurrence = occ.length > 0 && occ[0].startMs <= nowMs;
  }
  return {
    valid: failures.length === 0 && !pastOccurrence
      && sessions.length >= p.minSessionsPerWeek && sessions.length <= p.maxSessionsPerWeek
      && (!Array.isArray(p.allowedSessionsPerWeek) || p.allowedSessionsPerWeek.length === 0 || p.allowedSessionsPerWeek.includes(sessions.length)),
    validationScope: startCheck.valid ? 'full' : 'preliminary',
    startDateMismatch: Boolean(expectedStartDate) && startCheck.code === 'COURSE_START_SESSION_MISMATCH',
    pastOccurrence,
    failures,
    sessionCount: sessions.length,
  };
}

function scorePlan({ planSlots, resulting, prefDays, ranges, flexibleTime, anchorStarts, commitmentsByWeekday, p }) {
  let score = 0;
  // 2. Preferred days  3. Preferred time (only differ in flexible/relaxed searches; strict searches satisfy them by construction)
  score += planSlots.filter((s) => prefDays.has(s.weekday)).length * 1000;
  if (!flexibleTime) score += planSlots.filter((s) => startFitsRanges(s.startMinute, ranges, p)).length * 800;

  // 4. Uniform teaching time across the week
  const starts = resulting.map((s) => s.startMinute);
  const distinctStarts = new Set(starts).size;
  score -= (distinctStarts - 1) * 120;
  score -= ((Math.max(...starts) - Math.min(...starts)) / 15) * 4;

  // 5. Even spread through the week (cyclic gaps between teaching days)
  const dayIdx = [...new Set(resulting.map((s) => (s.weekday + 6) % 7))].sort((a, b) => a - b);
  if (dayIdx.length >= 2) {
    const ideal = 7 / dayIdx.length;
    for (let i = 0; i < dayIdx.length; i += 1) {
      const next = i === dayIdx.length - 1 ? dayIdx[0] + 7 : dayIdx[i + 1];
      score -= Math.abs((next - dayIdx[i]) - ideal) * 25;
    }
  }

  // 6. Avoid stacking several sessions on one day  7. Avoid idle gaps between same-day sessions
  score -= (resulting.length - dayIdx.length) * 150;
  const byDay = new Map();
  for (const s of resulting) byDay.set(s.weekday, [...(byDay.get(s.weekday) || []), s]);
  for (const list of byDay.values()) {
    const sorted = [...list].sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < sorted.length; i += 1) {
      const idle = sorted[i].startMinute - sorted[i - 1].endMinute - p.restMinutes;
      if (idle > 0) score -= (idle / 15) * 6;
    }
  }

  // 8. Fit with the current teaching schedule: sit next to an existing commitment on the same weekday
  for (const s of planSlots) {
    const intervals = commitmentsByWeekday.get(s.weekday) || [];
    const end = s.startMinute + p.sessionDurationMinutes;
    if (intervals.some((c) => {
      const gap = s.startMinute >= c.endMin ? s.startMinute - c.endMin : c.startMin - end;
      return gap >= p.restMinutes && gap <= 60;
    })) score += 10;
  }

  // Deterministic tie-break: closeness to the natural start of the chosen windows
  const nearestAnchor = Math.min(...planSlots.map((s) => Math.min(...anchorStarts.map((a) => Math.abs(a - s.startMinute)))));
  score -= (nearestAnchor / 15) * 2;
  return score;
}

function isNearDuplicatePlan(a, b) {
  const daysA = a.map((s) => s.weekday).join(',');
  const daysB = b.map((s) => s.weekday).join(',');
  if (daysA !== daysB) return false;
  return a.every((s, i) => Math.abs(s.startMinute - b[i].startMinute) < 45);
}

function classifyPlan(plan, best) {
  if (!best) return 'best';
  const sameDays = plan.addedSessions.map((s) => s.weekday).join(',') === best.addedSessions.map((s) => s.weekday).join(',');
  const sameTimes = plan.addedSessions.map((s) => s.startMinute).join(',') === best.addedSessions.map((s) => s.startMinute).join(',');
  if (sameDays) return 'alternativeTime';
  if (sameTimes || new Set(plan.addedSessions.map((s) => s.startMinute)).size === 1) return 'alternativeDays';
  return 'alternativeDaysAndTime';
}

/**
 * Recommends complete weekly teaching plans from wizard answers.
 * - Always produces exactly the number of sessions needed to reach the FINAL target (never expands one day into
 *   several sessions to "fill up" and never truncates a list to fit the cap).
 * - Strict days (`flexibleDays=false`) never leak onto other weekdays; `relaxPreferences` (explicit user action)
 *   lifts day/time preferences but never hard constraints, and every plan reports its differences.
 */
export function recommendQuickSchedulePlans({
  targetSessionsPerWeek,
  preferredWeekdays = [],
  flexibleDays = false,
  allowMultiplePerDay = false,
  timeWindows = ['any'],
  currentSessions = [],
  mode = 'append',
  expectedStartDate = null,
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
  maxPlans = 6,
  relaxPreferences = false,
  probeRelaxations = true,
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const target = resolveTargetCount(targetSessionsPerWeek, p);
  const kept = mode === 'replace' ? [] : sortWeeklySessions(currentSessions);
  const replaced = mode === 'replace' ? sortWeeklySessions(currentSessions) : [];
  const neededCount = Math.max(0, target - kept.length);
  const base = { target, neededCount, keptSessions: kept, replacedSessions: replaced, plans: [], relaxations: [] };

  if (neededCount === 0) return { ...base, status: 'already_at_target' };

  const prefDays = new Set((preferredWeekdays || []).map(Number).filter((d) => d >= 0 && d <= 6));
  const daysFlexible = flexibleDays || relaxPreferences;
  const feasibility = assessQuickScheduleDayFeasibility({
    targetSessionsPerWeek: target,
    preferredWeekdays: [...prefDays],
    flexibleDays: daysFlexible,
    allowMultiplePerDay,
    currentSessions,
    mode,
    policy: p,
  });
  if (!feasibility.feasible) return { ...base, status: 'infeasible', feasibility };

  const flexibleTime = isFlexibleTime(timeWindows);
  const searchRanges = relaxPreferences ? resolveWindowRanges(['any'], p) : resolveWindowRanges(timeWindows, p);
  const preferenceRanges = resolveWindowRanges(timeWindows, p);
  const starts = candidateStartMinutes(searchRanges, p);
  const dayPool = daysFlexible ? ORDERED_WEEKDAYS : ORDERED_WEEKDAYS.filter((d) => prefDays.has(d));
  const keptDays = new Set(kept.map((s) => s.weekday));
  const anchorStarts = (flexibleTime ? resolveQuickScheduleTimeWindows(p) : resolveQuickScheduleTimeWindows(p).filter((w) => timeWindows.includes(w.id)))
    .map((w) => w.defaultStartMin);
  if (anchorStarts.length === 0) anchorStarts.push(starts[0] ?? p.operatingStartMinute);

  // Hard-constraint pre-filter: every single slot validated against the sessions that will be kept.
  const validByDay = new Map();
  for (const wd of dayPool) {
    const list = [];
    for (const m of starts) {
      const res = validateWeeklySlotAddition({
        weekday: wd,
        startMinute: m,
        currentSessions: kept,
        expectedStartDate,
        commitments,
        policy: p,
        nowMs,
      });
      if (res.valid) list.push(m);
    }
    validByDay.set(wd, { list, set: new Set(list) });
  }

  const commitmentsByWeekday = new Map();
  for (const c of commitments || []) {
    if (c.endMs && c.endMs <= nowMs) continue;
    const arr = commitmentsByWeekday.get(Number(c.weekday)) || [];
    if (!arr.some((x) => x.startMin === c.startMin && x.endMin === c.endMin)) arr.push({ startMin: c.startMin, endMin: c.endMin });
    commitmentsByWeekday.set(Number(c.weekday), arr);
  }

  const refTimes = starts.filter((m) => m % 30 === 0);
  const nearestValid = (wd, t) => {
    const entry = validByDay.get(wd);
    let best = null;
    for (const m of entry?.list || []) {
      if (best == null || Math.abs(m - t) < Math.abs(best - t)) best = m;
    }
    return best;
  };
  const gapStep = p.sessionDurationMinutes + p.restMinutes;
  const chainFor = (wd, count, t) => {
    const entry = validByDay.get(wd);
    if (!entry) return null;
    const ordered = [...entry.list].sort((a, b) => (Math.abs(a - t) - Math.abs(b - t)) || (a - b));
    for (const first of ordered) {
      for (const dir of [1, -1]) {
        const chain = Array.from({ length: count }, (_, i) => first + dir * i * gapStep);
        if (chain.every((m) => entry.set.has(m))) return chain.sort((a, b) => a - b);
      }
    }
    return null;
  };

  const raw = new Map();
  const pushPlan = (slots) => {
    const plan = sortWeeklySessions(slots.map((s) => ({ weekday: s.weekday, startMinute: s.startMinute, endMinute: s.startMinute + p.sessionDurationMinutes })));
    if (plan.length !== neededCount) return;
    const resulting = sortWeeklySessions([...kept, ...plan]);
    if (resulting.length !== kept.length + neededCount) return;
    const id = resulting.map((s) => s.key).join('|');
    if (raw.has(id)) return;
    raw.set(id, {
      id,
      planSlots: plan,
      resulting,
      score: scorePlan({ planSlots: plan, resulting, prefDays, ranges: preferenceRanges, flexibleTime, anchorStarts, commitmentsByWeekday, p }),
    });
  };

  // (1) One session per day — uniform time first, then the nearest valid time per day around each reference time.
  const distinctDayPool = dayPool.filter((d) => (validByDay.get(d)?.list.length || 0) > 0 && (allowMultiplePerDay || !keptDays.has(d)));
  for (const combo of combinations(distinctDayPool, neededCount)) {
    for (const m of starts) {
      if (combo.every((d) => validByDay.get(d).set.has(m))) pushPlan(combo.map((d) => ({ weekday: d, startMinute: m })));
    }
    for (const t of refTimes) {
      const picked = combo.map((d) => ({ weekday: d, startMinute: nearestValid(d, t) }));
      if (picked.every((s) => s.startMinute != null)) pushPlan(picked);
    }
  }

  // (2) Several sessions on one day — only when the user allowed it; back-to-back with the minimum rest.
  if (allowMultiplePerDay) {
    const perDay = maxSessionsPerDay(p);
    const keptCount = (d) => kept.filter((s) => s.weekday === d).length;
    const pool = dayPool.filter((d) => (validByDay.get(d)?.list.length || 0) > 0);
    for (const ms of multisets(pool, neededCount, (d) => Math.max(0, perDay - keptCount(d)))) {
      if (new Set(ms).size === ms.length) continue;
      const counts = new Map();
      for (const d of ms) counts.set(d, (counts.get(d) || 0) + 1);
      for (const t of refTimes) {
        const slots = [];
        let ok = true;
        for (const [d, k] of counts) {
          const chain = chainFor(d, k, t);
          if (!chain) {
            ok = false;
            break;
          }
          for (const m of chain) slots.push({ weekday: d, startMinute: m });
        }
        if (ok) pushPlan(slots);
      }
    }
  }

  const ranked = [...raw.values()].sort((a, b) => (b.score - a.score) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Verify ranked plans with the authoritative validators, keep only meaningfully different ones.
  const verified = [];
  let attempts = 0;
  for (const cand of ranked) {
    if (verified.length >= maxPlans || attempts >= MAX_PLAN_VERIFICATIONS) break;
    if (verified.some((v) => isNearDuplicatePlan(v.addedSessions, cand.planSlots))) continue;
    attempts += 1;
    const preview = buildProposalQuickFillPreview({
      candidateInputs: cand.planSlots,
      currentSessions: kept,
      expectedStartDate,
      commitments,
      policy: p,
      mode: 'append',
      nowMs,
    });
    if (!preview.canApply || preview.validCandidates.length !== neededCount) continue;
    const whole = validateCompleteWeeklyPlan({ weeklySessions: preview.resultingSessions, expectedStartDate, commitments, policy: p, nowMs });
    if (!whole.valid) continue;

    const offDays = [...new Set(cand.planSlots.filter((s) => prefDays.size > 0 && !prefDays.has(s.weekday)).map((s) => s.weekday))];
    const offTimes = flexibleTime ? [] : cand.planSlots.filter((s) => !startFitsRanges(s.startMinute, preferenceRanges, p));
    const plan = {
      id: cand.id,
      addedSessions: preview.validCandidates,
      keptSessions: kept,
      resultingSessions: preview.resultingSessions,
      sessionCount: preview.resultingSessions.length,
      addedCount: preview.validCandidates.length,
      uniformTime: new Set(preview.resultingSessions.map((s) => s.startMinute)).size === 1,
      validationScope: whole.validationScope,
      startDateMismatch: whole.startDateMismatch,
      differences: {
        offPreferenceDays: offDays,
        offPreferenceTimes: offTimes.map((s) => ({ key: s.key, weekday: s.weekday, startClock: s.startClock, endClock: s.endClock })),
      },
      matchesPreferences: offDays.length === 0 && offTimes.length === 0,
      score: Math.round(cand.score),
    };
    plan.kind = classifyPlan(plan, verified[0]);
    verified.push(plan);
  }

  if (verified.length > 0) {
    return { ...base, status: 'ok', plans: verified, feasibility };
  }

  // Nothing fits: tell the user which single change (their explicit choice) would produce valid plans.
  const relaxations = [];
  if (probeRelaxations && !relaxPreferences) {
    const probe = (overrides) => recommendQuickSchedulePlans({
      targetSessionsPerWeek: target,
      preferredWeekdays: [...prefDays],
      flexibleDays,
      allowMultiplePerDay,
      timeWindows,
      currentSessions,
      mode,
      expectedStartDate,
      commitments,
      policy: p,
      nowMs,
      maxPlans: 1,
      probeRelaxations: false,
      ...overrides,
    }).plans.length > 0;
    if (!flexibleDays && probe({ flexibleDays: true })) relaxations.push('flexibleDays');
    if (!flexibleTime && probe({ timeWindows: ['any'] })) relaxations.push('anyTime');
    if (!allowMultiplePerDay && probe({ allowMultiplePerDay: true })) relaxations.push('allowMultiplePerDay');
    const lower = (p.allowedSessionsPerWeek || []).filter((n) => n < target && n > kept.length).sort((a, b) => b - a)[0];
    if (lower && probe({ targetSessionsPerWeek: lower })) relaxations.push(`fewerSessions:${lower}`);
    if (relaxations.length === 0 && probe({ relaxPreferences: true })) relaxations.push('relaxAll');
  }
  return { ...base, status: 'no_match', relaxations, feasibility };
}
