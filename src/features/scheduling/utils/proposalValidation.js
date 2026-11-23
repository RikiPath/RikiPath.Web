import { clockFromMinutes } from './slotPlannerModel.js';
import { toVnDateKey, mondayOfDateKey, shiftDateKey } from './calendarGeometry.js';

function vnDateTimeToUtcIso(dayKey, minuteOfDay) {
  return new Date(`${dayKey}T${clockFromMinutes(minuteOfDay)}:00+07:00`).toISOString();
}

const PROPOSAL_DAYPART_WINDOWS = Object.freeze({
  Morning: { startMin: 7 * 60, endMin: 11 * 60 },
  Noon: { startMin: 11 * 60 + 30, endMin: 13 * 60 + 30 },
  Afternoon: { startMin: 13 * 60 + 30, endMin: 17 * 60 + 30 },
  Evening: { startMin: 18 * 60, endMin: 22 * 60 },
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
});

export const PROPOSAL_PROGRAM_TYPES = Object.freeze([
  { value: 'StandardJlpt', label: 'Khóa JLPT tiêu chuẩn (10 tuần)' },
  { value: 'IntensiveJlpt', label: 'Khóa JLPT tăng cường' },
  { value: 'ExamPrepJlpt', label: 'Luyện đề & chốt kỳ thi JLPT' },
  { value: 'CustomJlpt', label: 'Chương trình thiết kế riêng' },
]);

export const PROPOSAL_STATUS_META = Object.freeze({
  Draft: { label: 'Bản nháp', tone: 'neutral', dot: '#94A3B8' },
  PendingReview: { label: 'Chờ duyệt', tone: 'warning', dot: '#E4A020' },
  ChangesRequested: { label: 'Cần bổ sung', tone: 'brand', dot: '#E05A7A' },
  Approved: { label: 'Đã duyệt', tone: 'success', dot: '#0D9488' },
  Rejected: { label: 'Bị từ chối', tone: 'danger', dot: '#DC3545' },
  Withdrawn: { label: 'Đã rút', tone: 'neutral', dot: '#8B8B97' },
});

const WEEKDAY_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function weekdayLabelVn(weekday) {
  return WEEKDAY_LABELS[Number(weekday)] || `Thứ ${Number(weekday) + 1}`;
}

export function normalizeProposalPolicy(apiPolicy = null) {
  const allowed = Array.isArray(apiPolicy?.allowedSessionsPerWeek) && apiPolicy.allowedSessionsPerWeek.length > 0
    ? apiPolicy.allowedSessionsPerWeek.map(Number).filter((n) => n >= 1 && n <= 7).sort((a, b) => a - b)
    : DEFAULT_PROPOSAL_POLICY.allowedSessionsPerWeek;

  return {
    ...DEFAULT_PROPOSAL_POLICY,
    ...(apiPolicy || {}),
    allowedSessionsPerWeek: allowed,
    minSessionsPerWeek: Number(apiPolicy?.minSessionsPerWeek ?? allowed[0] ?? 2),
    maxSessionsPerWeek: Number(apiPolicy?.maxSessionsPerWeek ?? allowed[allowed.length - 1] ?? 4),
    courseDurationWeeks: Number(apiPolicy?.courseDurationWeeks ?? 10),
    sessionDurationMinutes: Number(apiPolicy?.sessionDurationMinutes ?? apiPolicy?.sessionMinutes ?? 90),
    restMinutes: Number(apiPolicy?.restMinutes ?? 15),
    dailySessionCap: Number(apiPolicy?.dailySessionCap ?? 4),
    weeklySessionCap: Number(apiPolicy?.weeklySessionCap ?? 0),
    gridStepMinutes: Number(apiPolicy?.gridStepMinutes ?? 15),
    operatingStartMinute: Number(apiPolicy?.operatingStartMinute ?? 7 * 60),
    operatingEndMinute: Number(apiPolicy?.operatingEndMinute ?? 22 * 60),
  };
}

export function weeklySlotKey(weekday, startMinute) {
  return `w${Number(weekday)}_${Number(startMinute)}`;
}

export function sortWeeklySessions(sessions = []) {
  return [...sessions]
    .filter((s) => s != null && Number.isFinite(Number(s.weekday)) && Number.isFinite(Number(s.startMinute)))
    .map((s) => {
      const weekday = Number(s.weekday);
      const startMinute = Number(s.startMinute);
      const endMinute = Number(s.endMinute) > startMinute ? Number(s.endMinute) : startMinute + 90;
      return {
        key: weeklySlotKey(weekday, startMinute),
        weekday,
        startMinute,
        endMinute,
        startClock: clockFromMinutes(startMinute),
        endClock: clockFromMinutes(endMinute),
      };
    })
    .sort((a, b) => (((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)) || (a.startMinute - b.startMinute));
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
 * currently viewed by `InteractiveSlotCalendar`, so selecting/removing on ANY week
 * mirrors seamlessly onto the recurring weekly timetable.
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
 * Expands a proposal's recurring weekly sessions across `courseDurationWeeks` (default 10)
 * in `Asia/Ho_Chi_Minh`, mirroring Backend `MentorTeachingProposalService.ExpandOccurrences`.
 */
export function expandProposalOccurrences({
  expectedStartDate,
  weeklySessions = [],
  courseDurationWeeks = 10,
  sessionDurationMinutes = 90,
  nowMs = Date.now(),
}) {
  const sorted = sortWeeklySessions(weeklySessions);
  if (!expectedStartDate || sorted.length === 0 || courseDurationWeeks <= 0) return [];

  const startWeekMonday = mondayOfDateKey(expectedStartDate);
  const fitsFirstWeek = sorted.every((slot) => {
    const offset = (slot.weekday + 6) % 7;
    const localDate = shiftDateKey(startWeekMonday, offset);
    if (localDate < expectedStartDate) return false;
    if (nowMs <= 0) return true;
    const startUtcIso = vnDateTimeToUtcIso(localDate, slot.startMinute);
    return new Date(startUtcIso).getTime() > nowMs;
  });

  const firstWeekMonday = fitsFirstWeek ? startWeekMonday : shiftDateKey(startWeekMonday, 7);
  const occurrences = [];
  let sessionNumber = 0;

  for (let week = 0; week < courseDurationWeeks; week += 1) {
    const weekMon = shiftDateKey(firstWeekMonday, week * 7);
    for (const slot of sorted) {
      const offset = (slot.weekday + 6) % 7;
      const localDate = shiftDateKey(weekMon, offset);
      const startUtcIso = vnDateTimeToUtcIso(localDate, slot.startMinute);
      const endUtcIso = vnDateTimeToUtcIso(localDate, slot.startMinute + sessionDurationMinutes);
      sessionNumber += 1;
      occurrences.push({
        sessionNumber,
        weekNumber: week + 1,
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
 * Builds normalized commitment intervals from:
 * - Approved/Pending MentorAvailabilities & CohortSessions (`occupiedItems`)
 * - Other PendingReview teaching proposals (`otherProposals`, excluding `currentProposalId`)
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
    commitments.push({
      id: item.id || `occ-${item.startMs}`,
      dayKey: item.dayKey || toVnDateKey(new Date(item.startMs)),
      weekday: dayKeyToWeekday(item.dayKey || toVnDateKey(new Date(item.startMs))),
      startMin: item.startMin,
      endMin: item.endMin,
      startMs: item.startMs,
      endMs: item.endMs,
      kind: item.kind || 'approved',
      label: item.label || 'Lịch đã xác nhận',
    });
  }

  for (const prop of otherProposals || []) {
    if (!prop || prop.status !== 'PendingReview') continue;
    if (currentProposalId != null && Number(prop.id) === Number(currentProposalId)) continue;
    const occs = Array.isArray(prop.occurrencesPreview) && prop.occurrencesPreview.length > 0
      ? prop.occurrencesPreview.map((o) => {
        const startMs = new Date(o.startUtc || o.startUtcIso).getTime();
        const endMs = new Date(o.endUtc || o.endUtcIso).getTime();
        return {
          localDate: o.localDate,
          weekday: o.weekday,
          startMinute: o.startMinute,
          endMinute: o.endMinute,
          startMs,
          endMs,
        };
      })
      : expandProposalOccurrences({
        expectedStartDate: prop.expectedStartDate,
        weeklySessions: prop.weeklySessions || [],
        courseDurationWeeks: prop.courseDurationWeeks || resolvedPolicy.courseDurationWeeks,
        sessionDurationMinutes: prop.sessionDurationMinutes || resolvedPolicy.sessionDurationMinutes,
        nowMs: 0,
      });

    const label = prop.courseTitle ? `Đề xuất chờ duyệt "${prop.courseTitle}"` : `Đề xuất chờ duyệt #${prop.id}`;
    for (const o of occs) {
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
        label,
      });
    }
  }

  return commitments;
}

/**
 * Single authoritative validation for adding or replacing ONE weekly session in a proposal.
 * Used by: calendar click, drag/move, Quick Fill preview, and batch restoration.
 * Enforces the 2–4 sessions/week per-proposal cap IMMEDIATELY before state mutation.
 */
export function validateWeeklySlotAddition({
  weekday,
  startMinute,
  currentSessions = [],
  replaceKey = null,
  expectedStartDate = null,
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
      reason: `Mỗi đề xuất mở lớp chỉ được chọn tối đa ${p.maxSessionsPerWeek} buổi/tuần. Hãy bỏ bớt một buổi hoặc tạo thêm đề xuất mở lớp mới.`,
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

  // 3. Same-proposal overlap & minimum 15-min rest check
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
        : Math.max(p.operatingStartMinute, existing.startMinute - p.restMinutes - p.sessionDurationMinutes);
      return {
        valid: false,
        code: 'PROPOSAL_OWN_REST_VIOLATION',
        reason: `Quá sát buổi ${existing.startClock}–${existing.endClock}; cần nghỉ tối thiểu ${p.restMinutes} phút giữa hai buổi.`,
        suggestedStartMin: suggestedStartMin + p.sessionDurationMinutes <= p.operatingEndMinute ? suggestedStartMin : null,
      };
    }
  }

  // 4. Cross-schedule overlap, rest & Mentor-wide daily/weekly cap over the 10-week horizon
  if (expectedStartDate) {
    const candidateList = sortWeeklySessions([
      ...others,
      { weekday: normalizedWeekday, startMinute: startMin, endMinute: endMin },
    ]);
    const occurrences = expandProposalOccurrences({
      expectedStartDate,
      weeklySessions: candidateList,
      courseDurationWeeks: p.courseDurationWeeks,
      sessionDurationMinutes: p.sessionDurationMinutes,
      nowMs,
    });
    const addedOccs = occurrences.filter((o) => o.weekday === normalizedWeekday && o.startMinute === startMin);
    const restMs = p.restMinutes * 60 * 1000;

    for (const occ of addedOccs) {
      for (const c of commitments || []) {
        if (c.startMs < occ.endMs && occ.startMs < c.endMs) {
          return {
            valid: false,
            code: c.kind === 'pendingProposal' ? 'PROPOSAL_CONFLICT_PENDING_PROPOSAL' : 'PROPOSAL_CONFLICT_APPROVED_SCHEDULE',
            reason: `Tuần ${occ.weekNumber} (${occ.localDate} ${occ.localStart}–${occ.localEnd}) trùng với ${c.label}.`,
          };
        }
        const gapMs = occ.startMs >= c.endMs ? occ.startMs - c.endMs : c.startMs - occ.endMs;
        if (gapMs < restMs) {
          return {
            valid: false,
            code: 'PROPOSAL_REST_VIOLATION',
            reason: `Tuần ${occ.weekNumber} (${occ.localDate} ${occ.localStart}–${occ.localEnd}) quá sát ${c.label}; cần nghỉ tối thiểu ${p.restMinutes} phút.`,
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
          };
        }
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
 * Full proposal readiness validator used across Step 1, Step 2, Step 3, and Submit CTA.
 * Strictly enforces:
 * - Optional attachments are NEVER required.
 * - 0–1 weekly sessions => draft-only (canSubmit = false).
 * - 2–4 weekly sessions => valid count.
 * - >4 weekly sessions => invalid (blocked).
 */
export function validateProposalState({
  proposal = {},
  availableLevels = null,
  qualifiedLevels = null,
  coursePlans = [],
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
}) {
  const p = normalizeProposalPolicy(policy);
  const errors = [];
  const warnings = [];
  const sessions = sortWeeklySessions(proposal.weeklySessions || []);
  const levelsList = Array.isArray(availableLevels) ? availableLevels : (Array.isArray(qualifiedLevels) ? qualifiedLevels : []);
  const activeLevelSet = new Set(levelsList.map((l) => Number(l.certificateLevelId ?? l.id)));

  // Step 1 checks (Mentor self-selects N5–N1; Admin evaluates capability during proposal review)
  if (!proposal.certificateLevelId) {
    errors.push({ step: 1, field: 'certificateLevelId', code: 'PROPOSAL_LEVEL_REQUIRED', message: 'Vui lòng chọn trình độ JLPT dự kiến giảng dạy.' });
  } else if (activeLevelSet.size > 0 && !activeLevelSet.has(Number(proposal.certificateLevelId))) {
    errors.push({ step: 1, field: 'certificateLevelId', code: 'PROPOSAL_LEVEL_INVALID', message: 'Trình độ JLPT đã chọn không tồn tại hoặc không còn hoạt động.' });
  }

  const selectedPlan = proposal.coursePlanId
    ? (coursePlans || []).find((pl) => Number(pl.id) === Number(proposal.coursePlanId))
    : null;

  if (!proposal.coursePlanId && !String(proposal.courseObjective || '').trim()) {
    errors.push({ step: 1, field: 'courseObjective', code: 'PROPOSAL_OBJECTIVE_REQUIRED', message: 'Vui lòng nhập mục tiêu khóa học khi không chọn chương trình có sẵn.' });
  }

  if (selectedPlan && sessions.length > 0 && Number(selectedPlan.sessionsPerWeek) !== sessions.length) {
    errors.push({
      step: 2,
      field: 'weeklySessions',
      code: 'PROPOSAL_PLAN_MISMATCH',
      message: `Chương trình "${selectedPlan.name}" yêu cầu đúng ${selectedPlan.sessionsPerWeek} buổi/tuần (hiện chọn ${sessions.length} buổi/tuần).`,
    });
  }

  const todayVn = toVnDateKey(new Date(nowMs));
  if (!proposal.expectedStartDate) {
    errors.push({ step: 1, field: 'expectedStartDate', code: 'PROPOSAL_START_DATE_REQUIRED', message: 'Vui lòng chọn ngày khai giảng dự kiến.' });
  } else if (proposal.expectedStartDate < todayVn) {
    errors.push({ step: 1, field: 'expectedStartDate', code: 'PROPOSAL_START_DATE_PAST', message: 'Ngày khai giảng dự kiến không được ở trong quá khứ.' });
  }

  // Step 2 checks: 2–4 sessions/week
  if (sessions.length < p.minSessionsPerWeek) {
    errors.push({
      step: 2,
      code: 'PROPOSAL_MIN_SESSIONS_NOT_MET',
      message: `Cần chọn tối thiểu ${p.minSessionsPerWeek} buổi/tuần để gửi duyệt (hiện có ${sessions.length}/${p.maxSessionsPerWeek} buổi/tuần).`,
    });
  } else if (sessions.length > p.maxSessionsPerWeek) {
    errors.push({
      step: 2,
      code: 'PROPOSAL_MAX_SESSIONS_EXCEEDED',
      message: `Mỗi đề xuất chỉ được chọn tối đa ${p.maxSessionsPerWeek} buổi/tuần (hiện có ${sessions.length} buổi/tuần).`,
    });
  }

  // Validate each session incrementally through the shared validator
  const validatedSoFar = [];
  for (const s of sessions) {
    const check = validateWeeklySlotAddition({
      weekday: s.weekday,
      startMinute: s.startMinute,
      currentSessions: validatedSoFar,
      expectedStartDate: proposal.expectedStartDate,
      commitments,
      policy: p,
      nowMs,
    });
    if (!check.valid) {
      errors.push({ step: 2, code: check.code, message: check.reason, slotKey: s.key });
    } else {
      validatedSoFar.push(check.slot);
    }
  }

  const occurrences = proposal.expectedStartDate && sessions.length > 0
    ? expandProposalOccurrences({
      expectedStartDate: proposal.expectedStartDate,
      weeklySessions: sessions,
      courseDurationWeeks: p.courseDurationWeeks,
      sessionDurationMinutes: p.sessionDurationMinutes,
      nowMs,
    })
    : [];

  const step1Valid = !errors.some((e) => e.step === 1);
  const step2Valid = !errors.some((e) => e.step === 2) && sessions.length >= p.minSessionsPerWeek && sessions.length <= p.maxSessionsPerWeek;

  return {
    canSaveDraft: sessions.length <= p.maxSessionsPerWeek,
    canSubmit: errors.length === 0 && step1Valid && step2Valid && occurrences.length > 0,
    step1Valid,
    step2Valid,
    weeklySessionCount: sessions.length,
    totalSessions: sessions.length * p.courseDurationWeeks,
    totalTeachingHours: Math.round((sessions.length * p.courseDurationWeeks * p.sessionDurationMinutes) / 60 * 10) / 10,
    projectedEndDate: occurrences.length > 0 ? occurrences[occurrences.length - 1].localDate : null,
    occurrences,
    errors,
    warnings,
  };
}

/**
 * Redesigned Quick Fill engine:
 * Generates candidate weekly slots from selected `(weekday, daypart)` or preset patterns,
 * runs EVERY candidate through the authoritative `validateWeeklySlotAddition` validator,
 * NEVER exceeds `policy.maxSessionsPerWeek` (4), and returns full preview (valid + rejected with reasons)
 * for explicit user confirmation.
 */
export function buildProposalQuickFillPreview({
  candidateInputs = [],
  selectedDaypartRules = null,
  currentSessions = [],
  expectedStartDate = null,
  commitments = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  mode = 'append', // 'append' | 'replace'
  nowMs = Date.now(),
}) {
  const p = normalizeProposalPolicy(policy);
  const rawCandidates = [];

  if (Array.isArray(candidateInputs) && candidateInputs.length > 0) {
    for (const c of candidateInputs) {
      rawCandidates.push({
        weekday: Number(c.weekday),
        startMinute: Number(c.startMinute),
      });
    }
  } else if (selectedDaypartRules && selectedDaypartRules.size > 0) {
    const orderedRules = [...selectedDaypartRules]
      .map((ruleKey) => {
        const [wdStr, daypart] = String(ruleKey).split('-');
        return { weekday: Number(wdStr), daypart };
      })
      .filter((r) => Number.isFinite(r.weekday) && PROPOSAL_DAYPART_WINDOWS[r.daypart])
      .sort((a, b) => (((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)));

    for (const { weekday, daypart } of orderedRules) {
      const win = PROPOSAL_DAYPART_WINDOWS[daypart];
      // Pick first aligned 90-minute slot in each selected daypart (or multiple spaced by 15m rest)
      let cursor = win.startMin;
      while (cursor + p.sessionDurationMinutes <= win.endMin) {
        rawCandidates.push({ weekday, startMinute: cursor });
        cursor += p.sessionDurationMinutes + p.restMinutes;
      }
    }
  }

  const baseSessions = mode === 'replace' ? [] : sortWeeklySessions(currentSessions);
  const working = [...baseSessions];
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
        reason: 'Khung giờ này đã được chọn trong đề xuất hiện tại.',
      });
      continue;
    }

    const res = validateWeeklySlotAddition({
      weekday: cand.weekday,
      startMinute: cand.startMinute,
      currentSessions: working,
      expectedStartDate,
      commitments,
      policy: p,
      nowMs,
    });

    if (res.valid) {
      working.push(res.slot);
      validCandidates.push(res.slot);
    } else {
      rejectedCandidates.push({
        key,
        weekday: cand.weekday,
        startMinute: cand.startMinute,
        endMinute: cand.startMinute + p.sessionDurationMinutes,
        startClock: clockFromMinutes(cand.startMinute),
        endClock: clockFromMinutes(cand.startMinute + p.sessionDurationMinutes),
        code: res.code,
        reason: res.reason,
      });
    }
  }

  return {
    validCandidates,
    rejectedCandidates,
    resultingSessions: sortWeeklySessions(working),
    exceededCapCount: rejectedCandidates.filter((r) => r.code === 'PROPOSAL_MAX_SESSIONS_EXCEEDED').length,
    conflictCount: rejectedCandidates.filter((r) => r.code !== 'PROPOSAL_MAX_SESSIONS_EXCEEDED' && r.code !== 'ALREADY_SELECTED').length,
  };
}

/** Built-in recurring presets that respect 2–4 sessions/week (never 14!). */
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
