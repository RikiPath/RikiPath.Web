import { clockFromMinutes } from './slotPlannerModel.js';
import { toVnDateKey, mondayOfDateKey, shiftDateKey } from './calendarGeometry.js';
import { readLocale } from '../../../locales/locale.js';

function vnDateTimeToUtcIso(dayKey, minuteOfDay) {
  return new Date(`${dayKey}T${clockFromMinutes(minuteOfDay)}:00+07:00`).toISOString();
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
  minCourseDurationWeeks: 1,
  maxCourseDurationWeeksTechnical: 104,
  maxTotalCourseSessionsTechnical: 1000,
  sessionDurationMinutes: 90,
  restMinutes: 15,
  maxLearners: 4,
  gridStepMinutes: 15,
  operatingStartMinute: 7 * 60,
  operatingEndMinute: 22 * 60,
  minimumPreparationDays: 1,
  minimumPublishedEnrollmentDays: 7,
  checkoutHoldMinutes: 10,
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
  OpenedClass: {
    label: 'Đã mở lớp',
    tone: 'info',
    dot: '#2563EB',
    pillClass: 'border-sky-200 bg-sky-50 text-sky-800',
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
  const rawTuition = apiPolicy?.tuitionPerSessionByLevel && typeof apiPolicy.tuitionPerSessionByLevel === 'object'
    ? apiPolicy.tuitionPerSessionByLevel
    : {};
  const tuitionPerSessionByLevel = {
    N5: Number(rawTuition.N5 ?? rawTuition.n5 ?? apiPolicy?.tuitionPerSessionN5 ?? DEFAULT_PROPOSAL_POLICY.tuitionPerSessionByLevel.N5),
    N4: Number(rawTuition.N4 ?? rawTuition.n4 ?? apiPolicy?.tuitionPerSessionN4 ?? DEFAULT_PROPOSAL_POLICY.tuitionPerSessionByLevel.N4),
    N3: Number(rawTuition.N3 ?? rawTuition.n3 ?? apiPolicy?.tuitionPerSessionN3 ?? DEFAULT_PROPOSAL_POLICY.tuitionPerSessionByLevel.N3),
    N2: Number(rawTuition.N2 ?? rawTuition.n2 ?? apiPolicy?.tuitionPerSessionN2 ?? DEFAULT_PROPOSAL_POLICY.tuitionPerSessionByLevel.N2),
  };

  return {
    ...DEFAULT_PROPOSAL_POLICY,
    ...(apiPolicy || {}),
    minCourseDurationWeeks: Math.max(1, Number(apiPolicy?.minCourseDurationWeeks ?? 1)),
    maxCourseDurationWeeksTechnical: Math.max(1, Number(apiPolicy?.maxCourseDurationWeeksTechnical ?? 104)),
    maxTotalCourseSessionsTechnical: Math.max(1, Number(apiPolicy?.maxTotalCourseSessionsTechnical ?? 1000)),
    maxLearners: Math.max(1, Number(apiPolicy?.maxLearners ?? DEFAULT_PROPOSAL_POLICY.maxLearners)),
    sessionDurationMinutes: Math.max(15, Number(apiPolicy?.sessionDurationMinutes ?? apiPolicy?.sessionMinutes ?? 90)),
    restMinutes: Math.max(0, Number(apiPolicy?.restMinutes ?? 15)),
    gridStepMinutes: Math.max(5, Number(apiPolicy?.gridStepMinutes ?? 15)),
    operatingStartMinute: Number(apiPolicy?.operatingStartMinute ?? 7 * 60),
    operatingEndMinute: Number(apiPolicy?.operatingEndMinute ?? 22 * 60),
    minimumPreparationDays: Math.max(1, Number(apiPolicy?.minimumPreparationDays ?? DEFAULT_PROPOSAL_POLICY.minimumPreparationDays)),
    minimumPublishedEnrollmentDays: Math.max(1, Number(apiPolicy?.minimumPublishedEnrollmentDays ?? DEFAULT_PROPOSAL_POLICY.minimumPublishedEnrollmentDays)),
    checkoutHoldMinutes: Math.max(1, Number(apiPolicy?.checkoutHoldMinutes ?? DEFAULT_PROPOSAL_POLICY.checkoutHoldMinutes)),
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

/**
 * Expands a proposal's recurring weekly sessions across `courseDurationWeeks`
 * strictly as full Monday-to-Sunday calendar weeks anchored at the week containing `expectedStartDate`.
 */
export function expandProposalOccurrences({
  expectedStartDate,
  weeklySessions = [],
  courseDurationWeeks = 1,
  sessionDurationMinutes = 90,
}) {
  const sorted = sortWeeklySessions(weeklySessions, sessionDurationMinutes);
  const weeks = Math.max(0, Number(courseDurationWeeks) || 0);
  if (!expectedStartDate || sorted.length === 0 || weeks <= 0) return [];

  const startMonday = mondayOfDateKey(expectedStartDate);
  const mondayOffsetOf = (weekday) => (((Number(weekday) - 1) % 7) + 7) % 7;
  const orderedByWeek = sorted
    .map((slot) => ({
      ...slot,
      offset: mondayOffsetOf(slot.weekday),
    }))
    .sort((a, b) => (a.offset - b.offset) || (a.startMinute - b.startMinute));

  const occurrences = [];
  let sessionNumber = 0;

  for (let weekIdx = 0; weekIdx < weeks; weekIdx += 1) {
    const weekMonday = shiftDateKey(startMonday, weekIdx * 7);
    for (const slot of orderedByWeek) {
      const localDate = shiftDateKey(weekMonday, slot.offset);
      const startUtcIso = vnDateTimeToUtcIso(localDate, slot.startMinute);
      const endUtcIso = vnDateTimeToUtcIso(localDate, slot.startMinute + sessionDurationMinutes);
      sessionNumber += 1;
      occurrences.push({
        sessionNumber,
        weekNumber: weekIdx + 1,
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
 * Resolves a single future reference week (Monday YYYY-MM-DD) when focusing weekly selections.
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
  const minOpenDay = shiftDateKey(todayVn, p.minimumPublishedEnrollmentDays);
  const fallbackMon = mondayOfDateKey(minOpenDay);

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
 * Returns true strictly when a weekly slot projected onto `dayKey` (Asia/Ho_Chi_Minh)
 * starts in the future relative to `nowMs` (`startMs > nowMs`).
 */
export function isFutureWeeklySlotOccurrence(dayKey, startMinute, nowMs = Date.now()) {
  if (!dayKey || !Number.isFinite(Number(startMinute))) return false;
  const todayVn = toVnDateKey(new Date(nowMs));
  if (dayKey < todayVn) return false;
  if (dayKey > todayVn) return true;
  const startMs = new Date(vnDateTimeToUtcIso(dayKey, Number(startMinute))).getTime();
  return Number.isFinite(startMs) && startMs > nowMs;
}

/**
 * Finds the nearest upcoming date key (`YYYY-MM-DD`, Asia/Ho_Chi_Minh) for a weekly `(weekday, startMinute)` pattern.
 * Advances +7 days when today's occurrence start time has already elapsed.
 */
export function findNextFutureDayKeyForWeeklyPattern(weekday, startMinute, nowMs = Date.now()) {
  const wd = Number(weekday);
  if (!Number.isFinite(wd) || wd < 0 || wd > 6) return null;
  const todayVn = toVnDateKey(new Date(nowMs));
  const delta = (wd - dayKeyToWeekday(todayVn) + 7) % 7;
  let candidate = shiftDateKey(todayVn, delta);
  if (!isFutureWeeklySlotOccurrence(candidate, startMinute, nowMs)) {
    candidate = shiftDateKey(candidate, 7);
  }
  return candidate;
}

/**
 * Checks whether at least one unapproved weekly pattern has a future occurrence inside `[startKey, endKey]`.
 */
export function hasFutureWeeklyOccurrenceInRange(weeklyPatterns = [], startKey = '', endKey = '', nowMs = Date.now()) {
  if (!Array.isArray(weeklyPatterns) || weeklyPatterns.length === 0) return false;
  const todayVn = toVnDateKey(new Date(nowMs));
  const loopStart = startKey && startKey > todayVn ? startKey : todayVn;
  if (endKey && loopStart > endKey) return false;
  if (!endKey) return true;
  for (let i = 0, dk = loopStart; i < 14 && dk <= endKey; i += 1, dk = shiftDateKey(dk, 1)) {
    const wd = dayKeyToWeekday(dk);
    if (
      weeklyPatterns.some(
        (pat) => Number(pat?.weekday) === wd
          && isFutureWeeklySlotOccurrence(dk, Number(pat?.startMinute ?? pat?.startMin), nowMs)
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Projects selected weekly slots onto future dates inside the visible Calendar range
 * strictly as a weekly pattern guide (never creating fake official course dates before Admin approval).
 */
export function buildProposalPreviewCalendarSlots({
  weeklySessions = [],
  visibleRange = null,
  referenceWeekKey = null,
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
  includeAllWeekDays = false,
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const sorted = sortWeeklySessions(weeklySessions);

  if (sorted.length === 0) {
    return {
      mode: 'empty',
      slots: [],
      occurrences: [],
      weeklyPatternCount: 0,
      courseStartDate: null,
      courseEndDate: null,
      referenceWeekKey: null,
      startDateWarning: null,
    };
  }

  const todayVn = toVnDateKey(new Date(nowMs));
  const fallbackMon = referenceWeekKey
    ? mondayOfDateKey(referenceWeekKey)
    : mondayOfDateKey(todayVn);
  const rangeStart = visibleRange?.startKey || fallbackMon;
  const rangeEnd = visibleRange?.endKey || shiftDateKey(fallbackMon, 6);
  const loopStart = includeAllWeekDays ? rangeStart : (rangeStart > todayVn ? rangeStart : todayVn);

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
        if (!includeAllWeekDays && !isFutureWeeklySlotOccurrence(dk, s.startMinute, nowMs)) continue;
        const endMin = s.startMinute + p.sessionDurationMinutes;
        const startUtcIso = vnDateTimeToUtcIso(dk, s.startMinute);
        const endUtcIso = vnDateTimeToUtcIso(dk, endMin);
        const startMs = new Date(startUtcIso).getTime();
        const endMs = new Date(endUtcIso).getTime();

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
            ? 'Vào ngày đang xem đã có lịch dạy chính thức khác. Lịch mở lớp chính thức sẽ được hệ thống sắp xếp khi phê duyệt.'
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
 * Projects unapproved proposals (`PendingReview`, `ChangesRequested`) onto dates inside the
 * visible Calendar range strictly as recurring weekly pattern blocks (no fake course dates
 * or "Buổi X/Y" session numbers before Admin approval).
 */
export function buildPendingProposalCalendarSlots({
  proposals = [],
  hiddenProposalId = null,
  visibleRange = null,
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const todayVn = toVnDateKey(new Date(nowMs));
  const fallbackMon = mondayOfDateKey(todayVn);
  const rangeStart = visibleRange?.startKey || fallbackMon;
  const rangeEnd = visibleRange?.endKey || shiftDateKey(fallbackMon, 6);
  const loopStart = rangeStart > todayVn ? rangeStart : todayVn;

  if (loopStart > rangeEnd) return [];

  const activeProposals = (proposals || []).filter(
    (prop) => prop
      && (prop.status === 'PendingReview' || prop.status === 'ChangesRequested')
      && (hiddenProposalId == null || Number(prop.id) !== Number(hiddenProposalId))
  );
  if (activeProposals.length === 0) return [];

  const results = [];
  for (const prop of activeProposals) {
    const durationMinutes = Number(prop.sessionDurationMinutes) > 0
      ? Number(prop.sessionDurationMinutes)
      : p.sessionDurationMinutes;
    const sorted = sortWeeklySessions(prop.weeklySessions || [], durationMinutes);
    if (sorted.length === 0) continue;

    const patternsByWeekday = new Map();
    for (const s of sorted) {
      const wd = Number(s.weekday);
      const list = patternsByWeekday.get(wd) || [];
      list.push(s);
      patternsByWeekday.set(wd, list);
    }

    for (let dk = loopStart; dk <= rangeEnd; dk = shiftDateKey(dk, 1)) {
      const dayPatterns = patternsByWeekday.get(dayKeyToWeekday(dk));
      if (!dayPatterns || dayPatterns.length === 0) continue;
      for (const s of dayPatterns) {
        if (!isFutureWeeklySlotOccurrence(dk, s.startMinute, nowMs)) continue;
        const endMin = s.endMinute > s.startMinute ? s.endMinute : s.startMinute + durationMinutes;
        results.push({
          id: `prop-weekly-${prop.id || 'cur'}-${dk}-${s.startMinute}`,
          proposalId: prop.id || null,
          proposalStatus: prop.status,
          status: prop.status,
          jlptLevelCode: prop.jlptLevelCode || null,
          courseTitle: prop.courseTitle?.trim() || null,
          weeklyKey: s.key,
          weekday: s.weekday,
          dayKey: dk,
          startMin: s.startMinute,
          endMin,
          startClock: clockFromMinutes(s.startMinute),
          endClock: clockFromMinutes(endMin),
          sessionNumber: null,
          totalSessions: null,
          isWeeklyPattern: true,
          locked: true,
          draggable: false,
        });
      }
    }
  }

  return results;
}

/**
 * Resolves per-level registration availability strictly from Mentor verified JLPT qualifications.
 * Mentors may propose and teach unlimited concurrent classes across the same or different qualified levels.
 */
export function resolveJlptLevelAvailability({
  availableLevels = [],
  qualifiedLevels = [],
  mentorVerified = true,
  mentorVerifiedJlptLevel = null,
}) {
  const source = (Array.isArray(availableLevels) && availableLevels.length > 0 ? availableLevels : qualifiedLevels) || [];
  const supported = source.filter((lvl) =>
    SUPPORTED_PROPOSAL_JLPT_CODES.includes(String(lvl?.code || '').trim().toUpperCase())
  );

  return supported.map((lvl) => {
    const id = Number(lvl.certificateLevelId ?? lvl.id);
    const code = String(lvl.code || '').trim().toUpperCase();

    let isQualified = lvl.isQualified !== false;
    let qualificationReason = lvl.qualificationReason || null;
    if (mentorVerified === false) {
      isQualified = false;
      qualificationReason = qualificationReason || 'Chưa có chứng chỉ chuyên môn được xác minh.';
    } else if (mentorVerifiedJlptLevel && !canMentorTeachJlptLevel(mentorVerifiedJlptLevel, code)) {
      isQualified = false;
      qualificationReason = qualificationReason || 'Không đủ trình độ chuyên môn.';
    }

    return {
      ...lvl,
      certificateLevelId: id,
      code,
      isQualified,
      qualificationReason,
      isAvailable: isQualified,
      unavailableReason: isQualified ? null : (qualificationReason || 'Không đủ trình độ chuyên môn.'),
      blockingStatus: isQualified ? null : (mentorVerified === false ? 'UnverifiedQualification' : 'InsufficientQualification'),
      blockingProposalId: null,
      blockingCohortId: null,
      blockingTitle: null,
    };
  });
}

/**
 * Checks whether the Mentor is qualified for at least one teaching level.
 * Never imposes per-level or total class quotas.
 */
export function computeMentorRegistrationCapacity({
  levelAvailability = [],
  mentorVerified = true,
  loaded = true,
} = {}) {
  const list = Array.isArray(levelAvailability) ? levelAvailability : [];
  const qualifiedLevels = list.filter((l) => l && l.isQualified);
  const availableLevels = qualifiedLevels.filter((l) => l.isAvailable);
  const unqualifiedOrUnverified = Boolean(loaded && (!mentorVerified || qualifiedLevels.length === 0));

  return {
    qualifiedCount: qualifiedLevels.length,
    availableCount: availableLevels.length,
    usedCount: 0,
    totalActiveCount: 0,
    isCapacityExhausted: unqualifiedOrUnverified,
    message: unqualifiedOrUnverified
      ? 'Hồ sơ chuyên môn của bạn chưa đủ điều kiện mở lớp JLPT.'
      : null,
  };
}

/**
 * Builds normalized commitments from confirmed official schedule entries (`occupiedItems`)
 * AND temporary weekly slot reservations from unapproved proposals (`PendingReview`,
 * `ChangesRequested`) of the same Mentor excluding `currentProposalId`.
 */
export function buildProposalCommitments({
  occupiedItems = [],
  otherProposals = [],
  currentProposalId = null,
  policy = DEFAULT_PROPOSAL_POLICY,
} = {}) {
  const p = normalizeProposalPolicy(policy);
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
    if (currentProposalId != null && prop.id != null && Number(prop.id) === Number(currentProposalId)) {
      continue;
    }
    const durationMinutes = Number(prop.sessionDurationMinutes) > 0
      ? Number(prop.sessionDurationMinutes)
      : p.sessionDurationMinutes;
    const sessions = sortWeeklySessions(prop.weeklySessions || [], durationMinutes);
    const label = prop.courseTitle?.trim()
      || (prop.jlptLevelCode ? `Lớp ${prop.jlptLevelCode}` : 'Đề xuất mở lớp');
    for (const s of sessions) {
      const weekday = Number(s.weekday);
      const startMin = Number(s.startMinute);
      const endMin = Number(s.endMinute) > startMin ? Number(s.endMinute) : startMin + durationMinutes;
      if (!Number.isFinite(weekday) || !Number.isFinite(startMin) || endMin <= startMin) continue;
      commitments.push({
        id: `pending-weekly-${prop.id || 'prop'}-${weekday}-${startMin}`,
        kind: 'pendingProposal',
        isWeeklyPattern: true,
        proposalId: prop.id || null,
        status: prop.status,
        jlptLevelCode: prop.jlptLevelCode || null,
        label,
        weekday,
        startMin,
        endMin,
        weeklyKey: weeklySlotKey(weekday, startMin),
      });
    }
  }

  return commitments;
}

/**
 * Resolves the target concrete VN date keys (`YYYY-MM-DD`) a candidate weekly slot will occupy,
 * either anchored directly at `dayKey` (Calendar click/drag) or projected from `referenceStartDate`
 * across `courseDurationWeeks` cycles. Never locks weekdays permanently outside real course weeks.
 */
export function resolveCandidateOccurrenceDateKeys({
  weekday,
  startMinute,
  dayKey = null,
  referenceStartDate = null,
  courseDurationWeeks = 1,
  nowMs = Date.now(),
}) {
  const weeks = Math.max(1, Number(courseDurationWeeks || 1));
  const wd = Number(weekday);
  const startMin = Number(startMinute);

  let firstDate;
  if (dayKey) {
    firstDate = dayKey;
  } else if (referenceStartDate) {
    const refMonday = mondayOfDateKey(referenceStartDate);
    const projected = shiftDateKey(refMonday, (wd + 6) % 7);
    if (isFutureWeeklySlotOccurrence(projected, startMin, nowMs)) {
      firstDate = projected;
    } else {
      firstDate = findNextFutureDayKeyForWeeklyPattern(wd, startMin, nowMs);
    }
  } else {
    firstDate = findNextFutureDayKeyForWeeklyPattern(wd, startMin, nowMs);
  }

  if (!firstDate) return [];
  const dates = [];
  for (let w = 0; w < weeks; w += 1) {
    const dk = shiftDateKey(firstDate, w * 7);
    if (isFutureWeeklySlotOccurrence(dk, startMin, nowMs)) {
      dates.push(dk);
    }
  }
  return dates;
}

/**
 * Checks whether a candidate interval conflicts (interval overlap or rest buffer violation)
 * against ALL date-bound locked commitments (Approved slots, Published/Draft/Ongoing cohorts,
 * adjusted/substitute sessions, and external calendar busy events) normalized to UTC milliseconds.
 */
export function checkDateCommitmentConflict({
  datesToCheck = [],
  startMinute,
  endMinute,
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
}) {
  const p = normalizeProposalPolicy(policy);
  const startMin = Number(startMinute);
  const durationMinutes = p.sessionDurationMinutes;
  const endMin = Number.isFinite(Number(endMinute)) ? Number(endMinute) : startMin + durationMinutes;
  const restMinutes = Math.max(0, Number(p.restMinutes ?? 0));
  const restMs = restMinutes * 60000;

  const datedCommitments = (commitments || []).filter(
    (c) => c && c.kind !== 'pendingProposal' && Number.isFinite(c.startMs) && Number.isFinite(c.endMs)
      && c.status !== 'Cancelled' && c.status !== 'Rejected' && c.status !== 'Withdrawn'
  );
  if (datedCommitments.length === 0 || !Array.isArray(datesToCheck) || datesToCheck.length === 0) {
    return null;
  }

  for (const dk of datesToCheck) {
    const candStartMs = new Date(vnDateTimeToUtcIso(dk, startMin)).getTime();
    const candEndMs = candStartMs + (endMin - startMin) * 60000;
    if (!Number.isFinite(candStartMs) || !(candEndMs > candStartMs)) continue;

    for (const c of datedCommitments) {
      if (candStartMs < c.endMs && candEndMs > c.startMs) {
        return {
          code: 'PROPOSAL_CONFLICT_APPROVED_SCHEDULE',
          reason: 'Khung giờ này trùng với lịch giảng dạy của bạn.',
          conflictDate: dk,
          commitment: c,
        };
      }
      if (restMs > 0 && candStartMs < c.endMs + restMs && candEndMs + restMs > c.startMs) {
        let suggestedStartMin = null;
        if (c.dayKey === dk && Number.isFinite(c.startMin) && Number.isFinite(c.endMin)) {
          const candBefore = c.startMin - restMinutes - durationMinutes;
          const candAfter = c.endMin + restMinutes;
          const afterOk = candAfter >= p.operatingStartMinute && candAfter + durationMinutes <= p.operatingEndMinute;
          const beforeOk = candBefore >= p.operatingStartMinute && candBefore + durationMinutes <= p.operatingEndMinute;
          if (startMin >= c.endMin) {
            suggestedStartMin = afterOk ? candAfter : (beforeOk ? candBefore : null);
          } else {
            suggestedStartMin = beforeOk ? candBefore : (afterOk ? candAfter : null);
          }
        }
        return {
          code: 'PROPOSAL_REST_VIOLATION',
          reason: 'Không đủ thời gian nghỉ giữa hai buổi dạy.',
          conflictDate: dk,
          commitment: c,
          suggestedStartMin,
        };
      }
    }
  }

  return null;
}

/**
 * Checks whether a candidate weekly interval conflicts (overlap or rest gap) with any
 * pending/revision weekly reservation belonging to another proposal of the same Mentor.
 */
export function checkWeeklyReservationConflict({
  weekday,
  startMinute,
  endMinute,
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
}) {
  const p = normalizeProposalPolicy(policy);
  const wd = Number(weekday);
  const startMin = Number(startMinute);
  const endMin = Number.isFinite(Number(endMinute)) ? Number(endMinute) : startMin + p.sessionDurationMinutes;
  const pendingOnDay = (commitments || []).filter(
    (c) => c && c.kind === 'pendingProposal' && c.isWeeklyPattern && Number(c.weekday) === wd
  );
  if (pendingOnDay.length === 0) return null;

  for (const c of pendingOnDay) {
    if (startMin < c.endMin && endMin > c.startMin) {
      return {
        code: 'PROPOSAL_CONFLICT_PENDING_PROPOSAL',
        reason: 'Khung giờ này trùng với lịch giảng dạy của bạn.',
        commitment: c,
      };
    }
  }

  const restMinutes = Math.max(0, Number(p.restMinutes || 0));
  if (restMinutes > 0) {
    for (const c of pendingOnDay) {
      if (startMin < c.endMin + restMinutes && endMin + restMinutes > c.startMin) {
        return {
          code: 'PROPOSAL_PENDING_REST_VIOLATION',
          reason: 'Không đủ thời gian nghỉ giữa hai buổi dạy.',
          commitment: c,
        };
      }
    }
  }

  return null;
}

/**
 * Authoritative validation for adding or replacing ONE weekly session in a proposal.
 * Validates weekday, operating bounds, grid step, same-proposal overlap/rest,
 * pending weekly reservations, AND date-scoped confirmed/approved/cohort commitments.
 */
export function validateWeeklySlotAddition({
  weekday,
  startMinute,
  dayKey = null,
  currentSessions = [],
  replaceKey = null,
  commitments = [],
  courseDurationWeeks = 1,
  referenceStartDate = null,
  nowMs = Date.now(),
  policy = DEFAULT_PROPOSAL_POLICY,
}) {
  const p = normalizeProposalPolicy(policy);
  const normalizedWeekday = Number(weekday);
  const startMin = Number(startMinute);
  const endMin = startMin + p.sessionDurationMinutes;
  const targetKey = weeklySlotKey(normalizedWeekday, startMin);

  const others = sortWeeklySessions(currentSessions, p.sessionDurationMinutes).filter(
    (s) => s.key !== replaceKey && s.key !== targetKey
  );

  if (!Number.isInteger(normalizedWeekday) || normalizedWeekday < 0 || normalizedWeekday > 6) {
    return { valid: false, code: 'PROPOSAL_INVALID_SESSION_SLOT', reason: 'Thứ trong tuần không hợp lệ.' };
  }
  if (!Number.isFinite(startMin) || startMin < p.operatingStartMinute || endMin > p.operatingEndMinute) {
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

  const mondayOffset = (wd) => (((Number(wd) - 1) % 7) + 7) % 7;
  const candAbsStart = mondayOffset(normalizedWeekday) * 1440 + startMin;
  const candAbsEnd = mondayOffset(normalizedWeekday) * 1440 + endMin;
  const safeWeeks = Math.max(1, Number(courseDurationWeeks) || 1);

  for (const existing of others) {
    const exMon = mondayOffset(existing.weekday);
    const shifts = safeWeeks >= 2 ? [0, 10080, -10080] : [0];
    for (const shift of shifts) {
      const exAbsStart = exMon * 1440 + existing.startMinute + shift;
      const exAbsEnd = exMon * 1440 + existing.endMinute + shift;
      if (candAbsStart < exAbsEnd && candAbsEnd > exAbsStart) {
        return {
          valid: false,
          code: 'PROPOSAL_OWN_OVERLAP',
          reason: 'Khung giờ này trùng với một khung giờ khác trong mẫu đang chọn.',
        };
      }
      if (p.restMinutes > 0 && candAbsStart < exAbsEnd + p.restMinutes && candAbsEnd + p.restMinutes > exAbsStart) {
        const sameDay = existing.weekday === normalizedWeekday && shift === 0;
        const suggestedStartMin = sameDay
          ? (startMin >= existing.endMinute
            ? existing.endMinute + p.restMinutes
            : existing.startMinute - p.restMinutes - p.sessionDurationMinutes)
          : null;
        const validSuggestion = suggestedStartMin != null
          && suggestedStartMin >= p.operatingStartMinute
          && suggestedStartMin + p.sessionDurationMinutes <= p.operatingEndMinute;
        return {
          valid: false,
          code: 'PROPOSAL_OWN_REST_VIOLATION',
          reason: sameDay
            ? `Không đủ thời gian nghỉ tối thiểu ${p.restMinutes} phút giữa hai buổi dạy.`
            : `Khoảng nghỉ qua ranh giới ngày/tuần không đủ tối thiểu ${p.restMinutes} phút.`,
          suggestedStartMin: validSuggestion ? suggestedStartMin : null,
        };
      }
    }
  }

  void dayKey;
  void commitments;
  void referenceStartDate;
  void nowMs;

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
 * Finds validated nearest alternative weekly slots for a conflicted candidate.
 */
export function findAlternativeSlotsForCandidate({
  weekday,
  startMinute,
  dayKey = null,
  currentSessions = [],
  commitments = [],
  courseDurationWeeks = 1,
  referenceStartDate = null,
  nowMs = Date.now(),
  policy = DEFAULT_PROPOSAL_POLICY,
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
      dayKey,
      currentSessions,
      commitments,
      courseDurationWeeks,
      referenceStartDate,
      nowMs,
      policy: p,
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
      commitments,
      courseDurationWeeks,
      referenceStartDate,
      nowMs,
      policy: p,
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
 * Full proposal readiness validator across Step 1 (weekly slots), Step 2 (class info & duration weeks), and Submit CTA.
 */
export function validateProposalState({
  proposal = {},
  availableLevels = null,
  qualifiedLevels = null,
  mentorVerified = true,
  mentorVerifiedJlptLevel = null,
  commitments = [],
  referenceWeekKey = null,
  viewAnchorKey = null,
  nowMs = Date.now(),
  policy = DEFAULT_PROPOSAL_POLICY,
}) {
  const p = normalizeProposalPolicy(policy);
  const errors = [];
  const warnings = [];
  const sessions = sortWeeklySessions(proposal.weeklySessions || [], p.sessionDurationMinutes);
  const rawLevels = Array.isArray(availableLevels) && availableLevels.length > 0
    ? availableLevels
    : (Array.isArray(qualifiedLevels) ? qualifiedLevels : []);
  const levelAvailability = resolveJlptLevelAvailability({
    availableLevels: rawLevels,
    qualifiedLevels,
    mentorVerified,
    mentorVerifiedJlptLevel,
  });

  if (!proposal.certificateLevelId) {
    errors.push({
      step: 2,
      field: 'certificateLevelId',
      code: 'PROPOSAL_LEVEL_REQUIRED',
      message: 'Vui lòng chọn trình độ JLPT giảng dạy.',
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
        message: `Hệ thống hỗ trợ mở lớp cho cấp độ JLPT N5–N2.`,
      });
    } else if (supportedLevel && !supportedLevel.isAvailable) {
      const qualCode = supportedLevel.blockingStatus === 'UnverifiedQualification'
        ? 'MENTOR_QUALIFICATION_NOT_VERIFIED'
        : 'INSUFFICIENT_TEACHING_QUALIFICATION';
      errors.push({
        step: 2,
        field: 'certificateLevelId',
        code: qualCode,
        message: supportedLevel.unavailableReason || 'Không đủ trình độ chuyên môn.',
      });
    }
  }

  const rawWeeks = Number(proposal.courseDurationWeeks);
  const weeksValid = Number.isInteger(rawWeeks)
    && rawWeeks >= p.minCourseDurationWeeks
    && rawWeeks <= p.maxCourseDurationWeeksTechnical;
  if (!weeksValid) {
    errors.push({
      step: 2,
      field: 'courseDurationWeeks',
      code: 'PROPOSAL_COURSE_WEEKS_INVALID',
      message: Number.isInteger(rawWeeks) && rawWeeks > p.maxCourseDurationWeeksTechnical
        ? `Số tuần giảng dạy tối đa là ${p.maxCourseDurationWeeksTechnical} tuần.`
        : 'Vui lòng nhập số tuần giảng dạy hợp lệ.',
    });
  }
  const safeWeeks = weeksValid ? rawWeeks : Math.max(1, Number.isInteger(rawWeeks) ? rawWeeks : 1);

  if (!String(proposal.courseTitle || '').trim()) {
    errors.push({
      step: 2,
      field: 'courseTitle',
      code: 'PROPOSAL_TITLE_REQUIRED',
      message: 'Vui lòng nhập tên lớp.',
    });
  }

  // Mục tiêu khóa học không bắt buộc.

  if (sessions.length < 1) {
    errors.push({
      step: 1,
      field: 'weeklySessions',
      code: 'PROPOSAL_MIN_SESSIONS_NOT_MET',
      message: 'Vui lòng chọn ít nhất một khung giờ.',
    });
  }

  const effectiveCommitments = (commitments || []).filter(
    (c) => !(
      c
      && c.kind === 'pendingProposal'
      && c.isWeeklyPattern
      && proposal?.id != null
      && Number(c.proposalId) === Number(proposal.id)
    )
  );
  const checkPendingReservation = !proposal?.status
    || proposal.status === 'Draft'
    || proposal.status === 'ChangesRequested';

  const effectiveReferenceStartDate =
    proposal?.expectedStartDate
    || proposal?.referenceStartDate
    || referenceWeekKey
    || viewAnchorKey
    || null;

  const validatedSoFar = [];
  for (const s of sessions) {
    const check = validateWeeklySlotAddition({
      weekday: s.weekday,
      startMinute: s.startMinute,
      currentSessions: validatedSoFar,
      commitments: checkPendingReservation ? effectiveCommitments : [],
      courseDurationWeeks: safeWeeks,
      referenceStartDate: effectiveReferenceStartDate,
      nowMs,
      policy: p,
    });
    if (!check.valid) {
      errors.push({
        step: 1,
        field: 'weeklySessions',
        code: check.code,
        message: check.reason,
        slotKey: s.key,
        conflictDate: check.conflictDate || null,
      });
    } else {
      validatedSoFar.push(check.slot);
    }
  }

  const totalSessions = sessions.length * safeWeeks;
  if (totalSessions > p.maxTotalCourseSessionsTechnical) {
    errors.push({
      step: 2,
      field: 'courseDurationWeeks',
      code: 'TOTAL_SESSIONS_EXCEEDS_LIMIT',
      message: `Tổng số buổi dự kiến (${totalSessions}) vượt giới hạn tối đa ${p.maxTotalCourseSessionsTechnical} buổi mỗi khóa.`,
    });
  }

  const step1Valid = !errors.some((e) => e.step === 1) && sessions.length >= 1;
  const step2Valid = !errors.some((e) => e.step === 2);

  return {
    canSaveDraft: true,
    canSubmit: errors.length === 0 && step1Valid && step2Valid && sessions.length >= 1,
    validationScope: 'weekly_pattern',
    step1Valid,
    step2Valid,
    levelAvailability,
    weeklySessionCount: sessions.length,
    courseDurationWeeks: safeWeeks,
    totalSessions,
    totalTeachingHours: Math.round(((totalSessions * p.sessionDurationMinutes) / 60) * 10) / 10,
    projectedEndDate: null,
    occurrences: [],
    errors,
    warnings,
  };
}

/**
 * Shared Smart Quick Registration Preview Engine.
 * Supports unlimited valid weekly slots across all 7 days and multiple slots per day.
 */
export function buildProposalQuickFillPreview({
  candidateInputs = [],
  selectedDaypartRules = null,
  ruleStartMinutes = {},
  currentSessions = [],
  commitments = [],
  courseDurationWeeks = 1,
  referenceStartDate = null,
  nowMs = Date.now(),
  policy = DEFAULT_PROPOSAL_POLICY,
  mode = 'append', // 'append' | 'replace'
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

  const keptSessions = mode === 'replace' ? [] : sortWeeklySessions(currentSessions, p.sessionDurationMinutes);
  const replacedSessions = mode === 'replace' ? sortWeeklySessions(currentSessions, p.sessionDurationMinutes) : [];
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
      commitments,
      courseDurationWeeks,
      referenceStartDate,
      nowMs,
      policy: p,
    });

    if (res.valid) {
      working.push(res.slot);
      validCandidates.push(res.slot);
    } else {
      const alternatives = findAlternativeSlotsForCandidate({
        weekday: cand.weekday,
        startMinute: cand.startMinute,
        currentSessions: working,
        commitments,
        courseDurationWeeks,
        referenceStartDate,
        nowMs,
        policy: p,
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
        suggestedStartMin: res.suggestedStartMin ?? alternatives[0]?.startMinute ?? null,
        alternatives,
      });
    }
  }

  const resultingSessions = sortWeeklySessions(working, p.sessionDurationMinutes);
  const conflictCount = rejectedCandidates.filter((r) => r.code !== 'ALREADY_SELECTED').length;
  const alreadySelectedCount = rejectedCandidates.filter((r) => r.code === 'ALREADY_SELECTED').length;
  const addedCount = validCandidates.length;
  const hasBlockingIssues = conflictCount > 0;
  const safeWeeks = Math.max(1, Number(courseDurationWeeks) || 1);
  const plannedTotalSessions = resultingSessions.length * safeWeeks;
  const plannedTotalHours = Math.round(((plannedTotalSessions * p.sessionDurationMinutes) / 60) * 10) / 10;

  return {
    mode,
    keptSessions,
    replacedSessions,
    validCandidates,
    rejectedCandidates,
    resultingSessions,
    addedCount,
    resultingCount: resultingSessions.length,
    plannedTotalSessions,
    plannedTotalHours,
    exceededCapCount: 0,
    conflictCount,
    alreadySelectedCount,
    hasBlockingIssues,
    canApply: validCandidates.length > 0 && !hasBlockingIssues,
  };
}

/** Built-in recurring pattern shortcuts (optional starting points; Mentor may add/remove freely). */
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
    id: 'intensive-weekdays',
    label: 'Sáng T2–T6 (08:30–10:00)',
    sessionsPerWeek: 5,
    slots: [
      { weekday: 1, startMinute: 8 * 60 + 30 },
      { weekday: 2, startMinute: 8 * 60 + 30 },
      { weekday: 3, startMinute: 8 * 60 + 30 },
      { weekday: 4, startMinute: 8 * 60 + 30 },
      { weekday: 5, startMinute: 8 * 60 + 30 },
    ],
  },
]);

export const QUICK_SCHEDULE_TIME_WINDOW_IDS = Object.freeze(['Morning', 'Noon', 'Afternoon', 'Evening']);

const MAX_PLAN_VERIFICATIONS = 400;

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

export function maxPhysicalSessionsPerDay(policy = DEFAULT_PROPOSAL_POLICY) {
  const p = normalizeProposalPolicy(policy);
  const span = p.operatingEndMinute - p.operatingStartMinute + p.restMinutes;
  return Math.max(1, Math.floor(span / (p.sessionDurationMinutes + p.restMinutes)));
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

function multisets(items, size, capFor) {
  const out = [];
  const walk = (start, acc, counts) => {
    if (out.length >= 250) return;
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
  const maxWeekly = maxPhysicalSessionsPerDay(p) * 7;
  const n = Number(targetSessionsPerWeek);
  return Math.max(1, Math.min(maxWeekly, Number.isInteger(n) && n >= 1 ? n : 1));
}

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
  const kept = mode === 'replace' ? [] : sortWeeklySessions(currentSessions, p.sessionDurationMinutes);
  const neededCount = Math.max(0, target - kept.length);
  if (neededCount === 0) {
    return { feasible: false, code: 'ALREADY_AT_TARGET', neededCount, capacity: 0, target };
  }
  const selected = [...new Set((preferredWeekdays || []).map(Number).filter((d) => d >= 0 && d <= 6))];
  if (!flexibleDays && selected.length === 0) {
    return { feasible: false, code: 'NO_DAYS_SELECTED', neededCount, capacity: 0, target };
  }
  const pool = flexibleDays ? ORDERED_WEEKDAYS : ORDERED_WEEKDAYS.filter((d) => selected.includes(d));
  const perDay = maxPhysicalSessionsPerDay(p);
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

export function validateCompleteWeeklyPlan({
  weeklySessions = [],
  commitments = [],
  courseDurationWeeks = 1,
  referenceStartDate = null,
  nowMs = Date.now(),
  policy = DEFAULT_PROPOSAL_POLICY,
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const sessions = sortWeeklySessions(weeklySessions, p.sessionDurationMinutes);
  const failures = [];
  for (const s of sessions) {
    const res = validateWeeklySlotAddition({
      weekday: s.weekday,
      startMinute: s.startMinute,
      currentSessions: sessions.filter((o) => o.key !== s.key),
      commitments,
      courseDurationWeeks,
      referenceStartDate,
      nowMs,
      policy: p,
    });
    if (!res.valid) failures.push({ key: s.key, weekday: s.weekday, startMinute: s.startMinute, code: res.code, reason: res.reason });
  }
  return {
    valid: failures.length === 0 && sessions.length >= 1,
    validationScope: 'weekly_pattern',
    startDateMismatch: false,
    pastOccurrence: false,
    failures,
    sessionCount: sessions.length,
  };
}

function scorePlan({ planSlots, resulting, prefDays, ranges, flexibleTime, anchorStarts, p }) {
  let score = 0;
  score += planSlots.filter((s) => prefDays.has(s.weekday)).length * 1000;
  if (!flexibleTime) score += planSlots.filter((s) => startFitsRanges(s.startMinute, ranges, p)).length * 800;

  const starts = resulting.map((s) => s.startMinute);
  const distinctStarts = new Set(starts).size;
  score -= (distinctStarts - 1) * 120;
  score -= ((Math.max(...starts) - Math.min(...starts)) / 15) * 4;

  const dayIdx = [...new Set(resulting.map((s) => (s.weekday + 6) % 7))].sort((a, b) => a - b);
  if (dayIdx.length >= 2) {
    const ideal = 7 / dayIdx.length;
    for (let i = 0; i < dayIdx.length; i += 1) {
      const next = i === dayIdx.length - 1 ? dayIdx[0] + 7 : dayIdx[i + 1];
      score -= Math.abs((next - dayIdx[i]) - ideal) * 25;
    }
  }

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

export function recommendQuickSchedulePlans({
  targetSessionsPerWeek,
  preferredWeekdays = [],
  flexibleDays = false,
  allowMultiplePerDay = false,
  timeWindows = ['any'],
  currentSessions = [],
  commitments = [],
  mode = 'append',
  courseDurationWeeks = 1,
  referenceStartDate = null,
  nowMs = Date.now(),
  policy = DEFAULT_PROPOSAL_POLICY,
  maxPlans = 6,
  relaxPreferences = false,
  probeRelaxations = true,
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const target = resolveTargetCount(targetSessionsPerWeek, p);
  const kept = mode === 'replace' ? [] : sortWeeklySessions(currentSessions, p.sessionDurationMinutes);
  const replaced = mode === 'replace' ? sortWeeklySessions(currentSessions, p.sessionDurationMinutes) : [];
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

  const validByDay = new Map();
  for (const wd of dayPool) {
    const list = [];
    for (const m of starts) {
      const res = validateWeeklySlotAddition({
        weekday: wd,
        startMinute: m,
        currentSessions: kept,
        commitments,
        courseDurationWeeks,
        referenceStartDate,
        nowMs,
        policy: p,
      });
      if (res.valid) list.push(m);
    }
    validByDay.set(wd, { list, set: new Set(list) });
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
    const plan = sortWeeklySessions(slots.map((s) => ({ weekday: s.weekday, startMinute: s.startMinute, endMinute: s.startMinute + p.sessionDurationMinutes })), p.sessionDurationMinutes);
    if (plan.length !== neededCount) return;
    const resulting = sortWeeklySessions([...kept, ...plan], p.sessionDurationMinutes);
    if (resulting.length !== kept.length + neededCount) return;
    const id = resulting.map((s) => s.key).join('|');
    if (raw.has(id)) return;
    raw.set(id, {
      id,
      planSlots: plan,
      resulting,
      score: scorePlan({ planSlots: plan, resulting, prefDays, ranges: preferenceRanges, flexibleTime, anchorStarts, p }),
    });
  };

  const distinctDayPool = dayPool.filter((d) => (validByDay.get(d)?.list.length || 0) > 0 && (allowMultiplePerDay || !keptDays.has(d)));
  if (neededCount <= distinctDayPool.length) {
    for (const combo of combinations(distinctDayPool, neededCount)) {
      for (const m of starts) {
        if (combo.every((d) => validByDay.get(d).set.has(m))) pushPlan(combo.map((d) => ({ weekday: d, startMinute: m })));
      }
      for (const t of refTimes) {
        const picked = combo.map((d) => ({ weekday: d, startMinute: nearestValid(d, t) }));
        if (picked.every((s) => s.startMinute != null)) pushPlan(picked);
      }
    }
  }

  if (allowMultiplePerDay || neededCount > distinctDayPool.length) {
    const perDay = allowMultiplePerDay ? maxPhysicalSessionsPerDay(p) : 1;
    const keptCount = (d) => kept.filter((s) => s.weekday === d).length;
    const pool = dayPool.filter((d) => (validByDay.get(d)?.list.length || 0) > 0);
    for (const ms of multisets(pool, neededCount, (d) => Math.max(0, perDay - keptCount(d)))) {
      if (new Set(ms).size === ms.length && neededCount <= distinctDayPool.length) continue;
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

  const verified = [];
  let attempts = 0;
  for (const cand of ranked) {
    if (verified.length >= maxPlans || attempts >= MAX_PLAN_VERIFICATIONS) break;
    if (verified.some((v) => isNearDuplicatePlan(v.addedSessions, cand.planSlots))) continue;
    attempts += 1;
    const preview = buildProposalQuickFillPreview({
      candidateInputs: cand.planSlots,
      currentSessions: kept,
      commitments,
      courseDurationWeeks,
      referenceStartDate,
      nowMs,
      policy: p,
      mode: 'append',
    });
    if (!preview.canApply || preview.validCandidates.length !== neededCount) continue;
    const whole = validateCompleteWeeklyPlan({
      weeklySessions: preview.resultingSessions,
      commitments,
      courseDurationWeeks,
      referenceStartDate,
      nowMs,
      policy: p,
    });
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
      startDateMismatch: false,
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

  const relaxations = [];
  if (probeRelaxations && !relaxPreferences) {
    const probe = (overrides) => recommendQuickSchedulePlans({
      targetSessionsPerWeek: target,
      preferredWeekdays: [...prefDays],
      flexibleDays,
      allowMultiplePerDay,
      timeWindows,
      currentSessions,
      commitments,
      mode,
      courseDurationWeeks,
      referenceStartDate,
      nowMs,
      policy: p,
      maxPlans: 1,
      probeRelaxations: false,
      ...overrides,
    }).plans.length > 0;
    if (!flexibleDays && probe({ flexibleDays: true })) relaxations.push('flexibleDays');
    if (!flexibleTime && probe({ timeWindows: ['any'] })) relaxations.push('anyTime');
    if (!allowMultiplePerDay && probe({ allowMultiplePerDay: true })) relaxations.push('allowMultiplePerDay');
    if (relaxations.length === 0 && probe({ relaxPreferences: true })) relaxations.push('relaxAll');
  }
  return { ...base, status: 'no_match', relaxations, feasibility };
}
