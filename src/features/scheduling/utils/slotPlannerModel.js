import {
  mondayOfDateKey,
  shiftDateKey,
  toVnDateKey,
  toVnTimeParts,
  weekdayOfDateKey,
} from '@/features/scheduling/utils/calendarGeometry.js';
import { backendUtcDate } from '@/utils/mentorSchedule.js';

export const DEFAULT_DAYPARTS = Object.freeze([
  { code: 'Morning', label: 'Sáng', localStart: '07:00', localEnd: '11:00', bgClass: 'bg-transparent', tagClass: 'text-rp-text-muted/70' },
  { code: 'Noon', label: 'Trưa', localStart: '11:00', localEnd: '13:00', bgClass: 'bg-transparent', tagClass: 'text-rp-text-muted/70' },
  { code: 'Afternoon', label: 'Chiều', localStart: '13:00', localEnd: '18:00', bgClass: 'bg-transparent', tagClass: 'text-rp-text-muted/70' },
  { code: 'Evening', label: 'Tối', localStart: '18:00', localEnd: '22:00', bgClass: 'bg-transparent', tagClass: 'text-rp-text-muted/70' },
]);

const DAYPART_STYLE = Object.freeze({
  Morning: { label: 'Sáng', bgClass: 'bg-transparent', tagClass: 'text-rp-text-muted/70' },
  Noon: { label: 'Trưa', bgClass: 'bg-transparent', tagClass: 'text-rp-text-muted/70' },
  Afternoon: { label: 'Chiều', bgClass: 'bg-transparent', tagClass: 'text-rp-text-muted/70' },
  Evening: { label: 'Tối', bgClass: 'bg-transparent', tagClass: 'text-rp-text-muted/70' },
});

export function clockFromMinutes(totalMinutes) {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function minutesFromClock(hhmm) {
  const [h, m] = String(hhmm || '00:00').slice(0, 5).split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function vnLocalToUtcIso(dayKey, hhmm) {
  if (!dayKey || !hhmm) return null;
  const parsed = new Date(`${dayKey}T${String(hhmm).slice(0, 5)}:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function normalizePolicyDayparts(rawDayparts) {
  const list = Array.isArray(rawDayparts) && rawDayparts.length > 0 ? rawDayparts : DEFAULT_DAYPARTS;
  return list
    .map((dp) => {
      const code = dp.code || dp.daypartCode || 'Morning';
      const meta = DAYPART_STYLE[code] || DAYPART_STYLE.Morning;
      const localStart = String(dp.localStart || dp.startLocal || '07:00').slice(0, 5);
      const localEnd = String(dp.localEnd || dp.endLocal || '11:00').slice(0, 5);
      return {
        code,
        label: dp.label || meta.label,
        localStart,
        localEnd,
        startMin: minutesFromClock(localStart),
        endMin: minutesFromClock(localEnd),
        bgClass: meta.bgClass,
        tagClass: meta.tagClass,
      };
    })
    .sort((a, b) => a.startMin - b.startMin);
}

/**
 * Resolves live scheduling constraints from Backend schedule policy first,
 * falling back cleanly to slot snapshots / group plan metadata / canonical defaults.
 */
export function resolveSchedulePolicy({ schedule, plans = [], cohorts = [], slots = [] } = {}) {
  const apiPolicy = schedule?.policy || null;
  const inferredSlotSession = slots.find((s) => Number(s?.sessionMinutesSnapshot) > 0)?.sessionMinutesSnapshot;
  const inferredSlotRest = slots.find((s) => s?.restMinutesSnapshot != null)?.restMinutesSnapshot;
  const inferredCohortSession = cohorts.find((c) => Number(c?.sessionMinutes) > 0)?.sessionMinutes;
  const inferredPlanSession = plans.find((p) => Number(p?.sessionMinutes) > 0)?.sessionMinutes;

  const sessionMinutes = Number(
    apiPolicy?.sessionMinutes ||
    inferredSlotSession ||
    inferredCohortSession ||
    inferredPlanSession ||
    90
  );
  const restMinutes = Number(
    apiPolicy?.restMinutes ??
    inferredSlotRest ??
    15
  );
  const dailySessionCap = Number(apiPolicy?.dailySessionCap ?? 4);
  const weeklySessionCap = Number(apiPolicy?.weeklySessionCap ?? 0);
  const maxSlotsPerSubmission = Number(apiPolicy?.maxSlotsPerSubmission ?? 14);
  const maxPendingSlots = Number(apiPolicy?.maxPendingSlots ?? 24);
  const submissionCooldownSeconds = Number(apiPolicy?.submissionCooldownSeconds ?? 5);
  const publicationHorizonDays = Number(apiPolicy?.publicationHorizonDays ?? 30);
  const courseDurationWeeks = Number(apiPolicy?.courseDurationWeeks ?? 10);
  const cancellationLeadHours = Number(apiPolicy?.cancellationLeadHours ?? 24);
  const reschedulingLeadHours = Number(apiPolicy?.reschedulingLeadHours ?? 24);
  const maxLearners = Number(apiPolicy?.maxLearners ?? 4);

  const supports15 = restMinutes % 15 === 0 || sessionMinutes % 15 === 0;
  const backendSteps = Array.isArray(apiPolicy?.allowedGridSteps) && apiPolicy.allowedGridSteps.length > 0
    ? apiPolicy.allowedGridSteps.map(Number).filter((x) => x > 0)
    : (supports15 ? [15, 30] : [30]);
  const defaultStep = Number(
    apiPolicy?.gridStepMinutes ||
    (restMinutes === 15 && backendSteps.includes(15) ? 15 : backendSteps[0] || 15)
  );

  const dayparts = normalizePolicyDayparts(apiPolicy?.dayparts);
  const earliestDaypartHour = dayparts.length > 0 ? Math.floor(dayparts[0].startMin / 60) : 7;
  const latestDaypartHour = dayparts.length > 0 ? Math.ceil(dayparts[dayparts.length - 1].endMin / 60) : 22;

  return {
    policyVersion: Number(apiPolicy?.policyVersion || schedule?.policyVersion || 3),
    sessionMinutes: Math.max(15, sessionMinutes),
    restMinutes: Math.max(0, restMinutes),
    dailySessionCap: Math.max(0, dailySessionCap),
    weeklySessionCap: Math.max(0, weeklySessionCap),
    maxSlotsPerSubmission: Math.max(1, maxSlotsPerSubmission),
    maxPendingSlots: Math.max(1, maxPendingSlots),
    submissionCooldownSeconds: Math.max(0, submissionCooldownSeconds),
    publicationHorizonDays: Math.max(1, publicationHorizonDays),
    courseDurationWeeks: Math.max(1, courseDurationWeeks),
    cancellationLeadHours: Math.max(0, cancellationLeadHours),
    reschedulingLeadHours: Math.max(0, reschedulingLeadHours),
    maxLearners: Math.max(1, maxLearners),
    allowedGridSteps: backendSteps,
    defaultStepMinutes: defaultStep,
    durationLocked: true,
    dayparts,
    gridStartHour: Math.min(earliestDaypartHour, 7),
    gridEndHour: Math.max(latestDaypartHour, 22),
  };
}

export function snapMinutesToGrid({
  rawMinutes,
  stepMinutes = 15,
  mode = 'round',
  minMinutes = 6 * 60,
  maxEndMinutes = 23 * 60 + 59,
  durationMinutes = 90,
}) {
  const maxStart = Math.max(minMinutes, maxEndMinutes - durationMinutes);
  const bounded = Math.max(minMinutes, Math.min(maxStart, rawMinutes));
  const fn = mode === 'floor' ? Math.floor : mode === 'ceil' ? Math.ceil : Math.round;
  const snapped = fn(bounded / stepMinutes) * stepMinutes;
  return Math.max(minMinutes, Math.min(maxStart, snapped));
}

export function slotDurationMinutes(startIso, endIso) {
  const s = backendUtcDate(startIso)?.getTime() || 0;
  const e = backendUtcDate(endIso)?.getTime() || 0;
  return s && e > s ? Math.round((e - s) / 60000) : 0;
}

export function buildOccupiedItems({
  slots = [],
  cohortSessions = [],
  externalBusyEvents = [],
  ignoreSlotId = null,
}) {
  const items = [];
  const seenAvailabilityIds = new Set();

  for (const s of slots) {
    if (!s || s.isDeleted || s.rejectedAt) continue;
    if (ignoreSlotId != null && s.id === ignoreSlotId) continue;
    const startDate = backendUtcDate(s.startTime);
    const endDate = backendUtcDate(s.endTime);
    if (!startDate || !endDate || endDate <= startDate) continue;
    const dk = toVnDateKey(startDate);
    const sp = toVnTimeParts(startDate);
    const ep = toVnTimeParts(endDate);
    const startMin = sp.hour * 60 + sp.minute;
    const endMin = ep.hour * 60 + ep.minute;
    const isCommitted = Boolean(s.isInCohort || s.isBooked || (s.bookedCount ?? 0) > 0);
    const kind = isCommitted
      ? 'booked'
      : s.isApproved
        ? 'approved'
        : 'pending';
    seenAvailabilityIds.add(s.id);
    items.push({
      id: `slot-${s.id}`,
      slotId: s.id,
      kind,
      dayKey: dk,
      startMin,
      endMin,
      startMs: startDate.getTime(),
      endMs: endDate.getTime(),
      label: `${sp.hhmm}–${ep.hhmm}`,
      title: isCommitted
        ? (s.cohortName || 'Buổi đã xếp lớp')
        : !s.isApproved
          ? 'Khung chờ duyệt'
          : 'Khung đã duyệt',
      blocksOverlap: true,
      blocksRest: true,
    });
  }

  for (const cs of cohortSessions) {
    if (!cs || cs.status === 'Cancelled' || cs.status === 'CancelledByMentor') continue;
    if (cs.availabilityId && seenAvailabilityIds.has(cs.availabilityId)) continue;
    const startDate = backendUtcDate(cs.scheduledAt || cs.startTime);
    const endDate = cs.endsAt
      ? backendUtcDate(cs.endsAt)
      : cs.endTime
        ? backendUtcDate(cs.endTime)
        : (startDate ? new Date(startDate.getTime() + (Number(cs.sessionMinutes) || 90) * 60000) : null);
    if (!startDate || !endDate || endDate <= startDate) continue;
    const dk = toVnDateKey(startDate);
    const sp = toVnTimeParts(startDate);
    const ep = toVnTimeParts(endDate);
    items.push({
      id: `cohort-sess-${cs.id || cs.availabilityId || cs.scheduledAt}`,
      kind: 'session',
      dayKey: dk,
      startMin: sp.hour * 60 + sp.minute,
      endMin: ep.hour * 60 + ep.minute,
      startMs: startDate.getTime(),
      endMs: endDate.getTime(),
      label: `${sp.hhmm}–${ep.hhmm}`,
      title: cs.cohortName || cs.title || 'Buổi học lớp nhóm',
      blocksOverlap: true,
      blocksRest: true,
    });
  }

  for (const ext of externalBusyEvents) {
    const startDate = backendUtcDate(ext?.startTime || ext?.startUtc);
    const endDate = backendUtcDate(ext?.endTime || ext?.endUtc);
    if (!startDate || !endDate || endDate <= startDate) continue;
    const dk = toVnDateKey(startDate);
    const sp = toVnTimeParts(startDate);
    const ep = toVnTimeParts(endDate);
    items.push({
      id: `gcal-${ext.id || startDate.toISOString()}`,
      kind: 'externalBusy',
      dayKey: dk,
      startMin: sp.hour * 60 + sp.minute,
      endMin: ep.hour * 60 + ep.minute,
      startMs: startDate.getTime(),
      endMs: endDate.getTime(),
      label: `${sp.hhmm}–${ep.hhmm}`,
      title: ext.title || 'Lịch bận Google Calendar',
      blocksOverlap: true,
      blocksRest: true,
    });
  }

  return items;
}

export function validateCandidateSlot({
  dayKey,
  startMin,
  policy,
  occupiedItems = [],
  extraProposedItems = [],
  nowMs = Date.now(),
  stepMinutes = 15,
}) {
  const durationMinutes = policy?.sessionMinutes || 90;
  const restMinutes = policy?.restMinutes ?? 15;
  const dailyCap = policy?.dailySessionCap ?? 0;
  const weeklyCap = policy?.weeklySessionCap ?? 0;
  const endMin = startMin + durationMinutes;
  const startClock = clockFromMinutes(startMin);
  const endClock = clockFromMinutes(endMin);

  if (!dayKey || startMin < 0 || endMin > 24 * 60) {
    return {
      valid: false,
      code: 'OUT_OF_DAY',
      reason: 'Khung 90 phút phải nằm trọn trong cùng ngày (trước 24:00).',
      dayKey,
      startMin,
      endMin,
      startClock,
      endClock,
    };
  }

  const startUtcIso = vnLocalToUtcIso(dayKey, startClock);
  const endUtcIso = endMin === 24 * 60
    ? vnLocalToUtcIso(shiftDateKey(dayKey, 1), '00:00')
    : vnLocalToUtcIso(dayKey, endClock);
  const startMs = new Date(startUtcIso).getTime();
  const endMs = new Date(endUtcIso).getTime();

  if (!(startMs > nowMs)) {
    return {
      valid: false,
      code: 'PAST_TIME',
      reason: 'Không thể tạo hoặc dời lịch vào thời điểm đã qua.',
      dayKey,
      startMin,
      endMin,
      startClock,
      endClock,
      startUtcIso,
      endUtcIso,
    };
  }

  const allItems = [...occupiedItems, ...extraProposedItems];
  const dayItems = allItems.filter((it) => it.dayKey === dayKey && it.blocksOverlap);

  const overlapping = dayItems.find((it) => it.startMs < endMs && startMs < it.endMs);
  if (overlapping) {
    return {
      valid: false,
      code: 'OVERLAP',
      reason: `Giờ này đã có lịch (${overlapping.title} · ${overlapping.label}). Vui lòng chọn thời gian khác.`,
      conflictItem: overlapping,
      dayKey,
      startMin,
      endMin,
      startClock,
      endClock,
      startUtcIso,
      endUtcIso,
    };
  }

  if (restMinutes > 0) {
    const restMs = restMinutes * 60000;
    const tooClose = dayItems.find((it) => {
      if (!it.blocksRest) return false;
      const gapBefore = startMs >= it.endMs ? startMs - it.endMs : Number.POSITIVE_INFINITY;
      const gapAfter = it.startMs >= endMs ? it.startMs - endMs : Number.POSITIVE_INFINITY;
      return gapBefore < restMs || gapAfter < restMs;
    });

    if (tooClose) {
      const sitsBefore = endMs <= tooClose.startMs;
      const beforeRaw = tooClose.startMin - restMinutes - durationMinutes;
      const beforeSnapped = Math.floor(beforeRaw / stepMinutes) * stepMinutes;
      const afterSnapped = Math.ceil((tooClose.endMin + restMinutes) / stepMinutes) * stepMinutes;
      const suggestedStartMin = sitsBefore && beforeSnapped >= 6 * 60
        ? beforeSnapped
        : afterSnapped + durationMinutes <= 24 * 60
          ? afterSnapped
          : null;
      const hint = suggestedStartMin != null
        ? (sitsBefore ? ` Gợi ý: ${clockFromMinutes(suggestedStartMin)}.` : ` Gợi ý: ${clockFromMinutes(suggestedStartMin)}.`)
        : '';
      return {
        valid: false,
        code: 'REST_GAP',
        reason: `Bạn cần có thời gian nghỉ tối thiểu ${restMinutes} phút giữa hai buổi học (${tooClose.label}).${hint}`,
        conflictItem: tooClose,
        suggestedStartMin,
        dayKey,
        startMin,
        endMin,
        startClock,
        endClock,
        startUtcIso,
        endUtcIso,
      };
    }
  }

  if (dailyCap > 0) {
    const dayCount = allItems.filter((it) => it.dayKey === dayKey).length;
    if (dayCount + 1 > dailyCap) {
      return {
        valid: false,
        code: 'DAILY_CAP',
        reason: `Bạn đã đạt giới hạn đăng ký lịch trong ngày này (tối đa ${dailyCap} khung giờ/ngày, hiện đã có ${dayCount} khung).`,
        dayKey,
        startMin,
        endMin,
        startClock,
        endClock,
        startUtcIso,
        endUtcIso,
      };
    }
  }

  if (weeklyCap > 0) {
    const weekMon = mondayOfDateKey(dayKey);
    const weekEnd = shiftDateKey(weekMon, 7);
    const weekCount = allItems.filter((it) => it.dayKey >= weekMon && it.dayKey < weekEnd).length;
    if (weekCount + 1 > weeklyCap) {
      return {
        valid: false,
        code: 'WEEKLY_CAP',
        reason: `Bạn đã đạt giới hạn đăng ký lịch trong tuần này (tối đa ${weeklyCap} khung giờ/tuần, hiện đã có ${weekCount} khung).`,
        dayKey,
        startMin,
        endMin,
        startClock,
        endClock,
        startUtcIso,
        endUtcIso,
      };
    }
  }

  return {
    valid: true,
    code: null,
    reason: '',
    dayKey,
    startMin,
    endMin,
    startClock,
    endClock,
    startUtcIso,
    endUtcIso,
  };
}

/** Merged rest-buffer ranges [startMin, endMin] around existing occupied items on one day. */
export function computeDayRestWindows({ dayKey, occupiedItems = [], policy }) {
  const restMinutes = policy?.restMinutes ?? 15;
  if (restMinutes <= 0) return [];
  const raw = [];
  for (const it of occupiedItems) {
    if (it.dayKey !== dayKey || !it.blocksRest) continue;
    const beforeStart = Math.max(0, it.startMin - restMinutes);
    if (beforeStart < it.startMin) {
      raw.push({ startMin: beforeStart, endMin: it.startMin, sourceLabel: it.label });
    }
    const afterEnd = Math.min(24 * 60, it.endMin + restMinutes);
    if (it.endMin < afterEnd) {
      raw.push({ startMin: it.endMin, endMin: afterEnd, sourceLabel: it.label });
    }
  }
  raw.sort((a, b) => a.startMin - b.startMin);
  const merged = [];
  for (const band of raw) {
    const prev = merged[merged.length - 1];
    if (prev && band.startMin <= prev.endMin) {
      prev.endMin = Math.max(prev.endMin, band.endMin);
    } else {
      merged.push({ ...band });
    }
  }
  return merged;
}

/**
 * Expands a single-day OR weekly recurring 90-minute schedule draft across every generated date
 * and validates EVERY occurrence against overlaps, 15-min rest buffers, daily/weekly caps, and limits.
 */
export function expandRecurrenceSeries({
  startDate,
  startMin,
  repeating = false,
  weekdays = [],
  repeatUntil = '',
  policy,
  occupiedItems = [],
  nowMs = Date.now(),
  stepMinutes = 15,
}) {
  const empty = {
    ready: false,
    error: '',
    occurrences: [],
    validOccurrences: [],
    invalidOccurrences: [],
    intervals: [],
  };
  if (!startDate || !Number.isFinite(startMin)) return empty;
  if (repeating && (!Array.isArray(weekdays) || weekdays.length === 0)) {
    return { ...empty, error: 'Chọn ít nhất một thứ trong tuần để lặp.' };
  }
  const endKey = repeating ? repeatUntil : startDate;
  if (repeating && !endKey) {
    return { ...empty, error: 'Chọn ngày kết thúc cho lịch lặp hàng tuần.' };
  }
  if (endKey < startDate) {
    return { ...empty, error: 'Ngày kết thúc lặp phải từ ngày bắt đầu trở đi.' };
  }
  if (endKey > shiftDateKey(startDate, 366)) {
    return { ...empty, error: 'Hạn lặp tối đa 1 năm (366 ngày).' };
  }

  const weekdaySet = new Set(weekdays.map(Number));
  const dates = [];
  for (let d = startDate; d <= endKey; d = shiftDateKey(d, 1)) {
    if (!repeating || weekdaySet.has(weekdayOfDateKey(d))) {
      dates.push(d);
    }
    if (dates.length > 500) break;
  }

  if (dates.length === 0) {
    return { ...empty, error: 'Không có ngày nào khớp các thứ đã chọn trong khoảng lặp.' };
  }
  if (dates.length > 500) {
    return { ...empty, error: 'Tối đa 500 buổi mỗi lần đăng ký. Hãy rút ngắn khoảng lặp.' };
  }

  const acceptedSoFar = [];
  const occurrences = dates.map((dk) => {
    const check = validateCandidateSlot({
      dayKey: dk,
      startMin,
      policy,
      occupiedItems,
      extraProposedItems: acceptedSoFar,
      nowMs,
      stepMinutes,
    });
    if (check.valid) {
      acceptedSoFar.push({
        id: `proposed-${dk}`,
        dayKey: dk,
        startMin: check.startMin,
        endMin: check.endMin,
        startMs: new Date(check.startUtcIso).getTime(),
        endMs: new Date(check.endUtcIso).getTime(),
        label: `${check.startClock}–${check.endClock}`,
        title: 'Buổi lặp dự kiến',
        blocksOverlap: true,
        blocksRest: true,
      });
    }
    return check;
  });

  const validOccurrences = occurrences.filter((o) => o.valid);
  const invalidOccurrences = occurrences.filter((o) => !o.valid);
  const intervals = occurrences
    .filter((o) => o.startUtcIso && o.endUtcIso)
    .map((o) => ({ startUtc: o.startUtcIso, endUtc: o.endUtcIso }));

  const firstErr = invalidOccurrences[0]?.reason || '';
  const error = invalidOccurrences.length > 0
    ? `${invalidOccurrences.length}/${occurrences.length} buổi không hợp lệ (${firstErr})`
    : '';

  return {
    ready: invalidOccurrences.length === 0 && occurrences.length > 0,
    error,
    occurrences,
    validOccurrences,
    invalidOccurrences,
    intervals,
  };
}

/**
 * Generates valid 90-minute candidate slots (spaced by restMinutes) from selected (weekday, daypartCode) rules
 * across a 7-day week starting at weekStart, without auto-submitting to the server.
 */
export function buildPresetCandidateSlots({
  weekStart,
  selectedRules,
  policy,
  occupiedItems = [],
  existingSelectedSlots = [],
  nowMs = Date.now(),
}) {
  const durationMinutes = policy?.sessionMinutes || 90;
  const restMinutes = policy?.restMinutes ?? 15;
  const stepMinutes = policy?.defaultStepMinutes || 15;
  const dayparts = policy?.dayparts || DEFAULT_DAYPARTS;

  const extraProposed = existingSelectedSlots.map((s) => ({
    id: `sel-${s.dayKey}-${s.startMin}`,
    dayKey: s.dayKey,
    startMin: s.startMin,
    endMin: s.startMin + durationMinutes,
    startMs: new Date(s.startUtcIso).getTime(),
    endMs: new Date(s.endUtcIso).getTime(),
    label: `${s.startClock}–${s.endClock}`,
    title: 'Khung đang chọn',
    blocksOverlap: true,
    blocksRest: true,
  }));

  const validSlots = [];
  const skippedSlots = [];

  for (let i = 0; i < 7; i += 1) {
    const dayKey = shiftDateKey(weekStart, i);
    const wd = weekdayOfDateKey(dayKey);
    for (const dp of dayparts) {
      const ruleKey = `${wd}-${dp.code}`;
      if (!selectedRules?.has(ruleKey)) continue;
      let cursor = dp.startMin;
      while (cursor + durationMinutes <= dp.endMin) {
        const alreadyInSelection = existingSelectedSlots.some(
          (s) => s.dayKey === dayKey && s.startMin === cursor
        );
        if (!alreadyInSelection) {
          const check = validateCandidateSlot({
            dayKey,
            startMin: cursor,
            policy,
            occupiedItems,
            extraProposedItems: extraProposed,
            nowMs,
            stepMinutes,
          });
          if (check.valid) {
            validSlots.push({
              key: `${dayKey}_${cursor}`,
              dayKey,
              startMin: cursor,
              endMin: check.endMin,
              startClock: check.startClock,
              endClock: check.endClock,
              startUtcIso: check.startUtcIso,
              endUtcIso: check.endUtcIso,
              daypartLabel: dp.label,
            });
            extraProposed.push({
              id: `preset-${dayKey}-${cursor}`,
              dayKey,
              startMin: cursor,
              endMin: check.endMin,
              startMs: new Date(check.startUtcIso).getTime(),
              endMs: new Date(check.endUtcIso).getTime(),
              label: `${check.startClock}–${check.endClock}`,
              title: 'Khung điền nhanh',
              blocksOverlap: true,
              blocksRest: true,
            });
          } else if (check.code !== 'PAST_TIME') {
            skippedSlots.push({
              key: `${dayKey}_${cursor}`,
              dayKey,
              startMin: cursor,
              startClock: check.startClock,
              endClock: check.endClock,
              reason: check.reason,
              code: check.code,
            });
          }
        }
        cursor += durationMinutes + restMinutes;
      }
    }
  }

  return { validSlots, skippedSlots };
}

/**
 * Canonical 4 Main + 2 Exception Statuses for Teacher Schedule Filtering:
 * - Chờ duyệt (#E4A020)
 * - Đã duyệt (#0D9488)
 * - Đã xếp lớp (#CE476D)
 * - Đã hoàn thành (#16A34A)
 * - Bị từ chối (#DC3545)
 * - Đã hủy (#8B8B97)
 * (Unsent Drafts are local-only selections and stay separated from saved statuses.)
 */
export const SCHEDULE_STATUS_OPTIONS = Object.freeze([
  { id: 'ALL', label: 'Tất cả trạng thái', tone: 'session', dotClass: 'bg-[#CE476D]' },
  { id: 'pending', label: 'Chờ duyệt', tone: 'pending', dotClass: 'bg-[#E4A020]' },
  { id: 'approved', label: 'Đã duyệt', tone: 'approved', dotClass: 'bg-[#0D9488]' },
  { id: 'session', label: 'Đã xếp lớp', tone: 'session', dotClass: 'bg-[#CE476D]' },
  { id: 'present', label: 'Đã hoàn thành', tone: 'present', dotClass: 'bg-[#16A34A]' },
  { id: 'rejected', label: 'Bị từ chối', tone: 'rejected', dotClass: 'bg-[#DC3545]' },
  { id: 'cancelled', label: 'Đã hủy', tone: 'cancelled', dotClass: 'bg-[#8B8B97]' },
]);

export const SCHEDULE_EVENT_TYPE_OPTIONS = Object.freeze([
  { id: 'ALL', label: 'Tất cả loại lịch' },
  { id: 'CohortSession', label: 'Buổi lớp nhóm', dotClass: 'bg-[#CE476D]' },
  { id: 'Availability', label: 'Khung giờ đăng ký', dotClass: 'bg-[#0D9488]' },
  { id: 'Draft', label: 'Khung đang chọn (chưa gửi)', dotClass: 'bg-[#22C55E]' },
]);

export const SCHEDULE_SORT_OPTIONS = Object.freeze([
  { id: 'smart', label: 'Ưu tiên cần xử lý & sắp tới' },
  { id: 'nearest', label: 'Ngày gần nhất trước' },
  { id: 'status', label: 'Theo trạng thái' },
  { id: 'startTime', label: 'Theo giờ bắt đầu trong ngày' },
  { id: 'newest', label: 'Mới nhất trước' },
  { id: 'oldest', label: 'Cũ nhất trước' },
]);

/**
 * Resolves the canonical statusKey ('pending' | 'approved' | 'session' | 'present' | 'rejected' | 'cancelled' | 'selected')
 * and eventType ('CohortSession' | 'Availability' | 'Draft') strictly from Backend lifecycle state (never inferring Completed from clock time).
 */
export function classifyScheduleEvent(ev) {
  if (ev.isSelectedDraft || ev.sourceKind === 'selected') {
    return { statusKey: 'selected', eventType: 'Draft', eventTypeLabel: 'Khung đang chọn' };
  }
  const s = ev.slot || ev.rawSlot;

  const isCohort = Boolean(
    ev.sourceKind === 'session' ||
    ev.tone === 'session' ||
    ev.tone === 'booked' ||
    s?.isInCohort ||
    s?.status === 'Booked' ||
    s?.status === 'Completed' ||
    s?.isBooked ||
    ev.cohortId
  );
  const eventType = isCohort ? 'CohortSession' : 'Availability';
  const eventTypeLabel = isCohort ? 'Buổi lớp nhóm' : 'Khung giờ đăng ký';

  if (s?.isDeleted || s?.status === 'Cancelled' || ev.sourceKind === 'cancelled' || (ev.tone === 'cancelled' && !s?.rejectedAt && ev.sourceKind !== 'rejected')) {
    return { statusKey: 'cancelled', eventType, eventTypeLabel };
  }
  if (s?.rejectedAt || s?.status === 'Rejected' || ev.sourceKind === 'rejected' || ev.tone === 'rejected') {
    return { statusKey: 'rejected', eventType, eventTypeLabel };
  }
  const isCompletedByLifecycle = Boolean(
    ev.tone === 'present' ||
    ev.sessionCompleted === true ||
    ev.attendanceStatus === 'Present' ||
    s?.sessionCompleted === true ||
    (isCohort && s?.status === 'Completed')
  );
  if (isCompletedByLifecycle) {
    return { statusKey: 'present', eventType, eventTypeLabel };
  }
  const pendingCancel = Boolean(s?.cancelRequestedAt && !s?.cancelRejectedAt);
  const pendingChange = Boolean(s?.changeRequestedAt && !s?.changeResolution);
  if (ev.tone === 'pending' || s?.status === 'Pending' || (s && (!s.isApproved || pendingCancel || pendingChange))) {
    return { statusKey: 'pending', eventType, eventTypeLabel };
  }
  if (isCohort) {
    return { statusKey: 'session', eventType, eventTypeLabel };
  }
  return { statusKey: 'approved', eventType, eventTypeLabel };
}

/**
 * Filters a list of normalized schedule events using combined AND criteria:
 * - statusFilter ('ALL' or statusKey)
 * - eventTypeFilter ('ALL' | 'CohortSession' | 'Availability' | 'Draft')
 * - dateRange ({ startKey, endKey } or null)
 * - timeRange ({ startMin, endMin } or null) — interval intersection [evStart, evEnd) ∩ [filterStart, filterEnd) ≠ ∅
 * - searchQuery (optional text search on title/detail/dayKey)
 */
export function filterScheduleEvents(events, {
  statusFilter = 'ALL',
  eventTypeFilter = 'ALL',
  dateRange = null,
  timeRange = null,
  searchQuery = '',
  nowMs = Date.now(),
} = {}) {
  const q = String(searchQuery || '').trim().toLowerCase();
  return (events || []).filter((ev) => {
    if (!ev || !ev.dayKey) return false;
    const { statusKey, eventType, eventTypeLabel } = classifyScheduleEvent(ev, nowMs);

    if (statusFilter && statusFilter !== 'ALL' && statusKey !== statusFilter) {
      return false;
    }
    if (eventTypeFilter && eventTypeFilter !== 'ALL' && eventType !== eventTypeFilter) {
      return false;
    }
    if (dateRange?.startKey && ev.dayKey < dateRange.startKey) {
      return false;
    }
    if (dateRange?.endKey && ev.dayKey > dateRange.endKey) {
      return false;
    }
    if (timeRange && (timeRange.startMin != null || timeRange.endMin != null)) {
      const fStart = timeRange.startMin ?? 0;
      const fEnd = timeRange.endMin ?? 24 * 60;
      const evStart = (ev.startHour || 0) * 60 + (ev.startMinute || 0);
      let evEnd = (ev.endHour || 0) * 60 + (ev.endMinute || 0);
      if (evEnd <= evStart) evEnd = Math.min(24 * 60, evStart + 90);
      // Interval intersection in GMT+7
      if (!(evStart < fEnd && evEnd > fStart)) {
        return false;
      }
    }
    if (q) {
      const hay = `${ev.title || ''} ${ev.fullTitle || ''} ${ev.detail || ''} ${ev.statusLabel || ''} ${eventTypeLabel} ${ev.dayKey}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function statusSortRank(statusKey) {
  switch (statusKey) {
    case 'selected': return 0;
    case 'pending': return 1;
    case 'approved': return 2;
    case 'session': return 3;
    case 'present': return 4;
    case 'rejected': return 5;
    case 'cancelled': return 6;
    default: return 3;
  }
}

/**
 * Smart Sorting for Teacher Schedule Table:
 * - 'smart':
 *   1. Unsent selected drafts & Pending / attention-needed upcoming items (nearest first)
 *   2. Upcoming approved/published/cohort sessions (nearest first)
 *   3. Past completed sessions (most recent first)
 *   4. Rejected / Cancelled items (most recent first)
 * - 'nearest' | 'status' | 'startTime' | 'newest' | 'oldest' with optional sortDirection ('asc' | 'desc')
 * Always uses event ID as a stable secondary tie-breaker.
 */
export function sortScheduleEvents(events, {
  sortBy = 'smart',
  sortDirection = 'asc',
  todayKey = toVnDateKey(new Date()),
  nowMs = Date.now(),
} = {}) {
  const dir = sortDirection === 'desc' ? -1 : 1;
  const list = [...(events || [])];

  const timestampOf = (ev) => {
    const startMin = (ev.startHour || 0) * 60 + (ev.startMinute || 0);
    return new Date(`${ev.dayKey}T${clockFromMinutes(startMin)}:00+07:00`).getTime();
  };

  return list.sort((a, b) => {
    const ca = classifyScheduleEvent(a, nowMs);
    const cb = classifyScheduleEvent(b, nowMs);
    const ta = timestampOf(a);
    const tb = timestampOf(b);
    const ma = (a.startHour || 0) * 60 + (a.startMinute || 0);
    const mb = (b.startHour || 0) * 60 + (b.startMinute || 0);

    if (sortBy === 'status') {
      const rDiff = (statusSortRank(ca.statusKey) - statusSortRank(cb.statusKey)) * dir;
      if (rDiff !== 0) return rDiff;
      if (ta !== tb) return ta - tb;
      return String(a.id).localeCompare(String(b.id));
    }

    if (sortBy === 'nearest') {
      if (ta !== tb) return (ta - tb) * dir;
      return String(a.id).localeCompare(String(b.id));
    }

    if (sortBy === 'startTime') {
      if (ma !== mb) return (ma - mb) * dir;
      if (ta !== tb) return ta - tb;
      return String(a.id).localeCompare(String(b.id));
    }

    if (sortBy === 'newest') {
      if (ta !== tb) return tb - ta;
      return String(b.id).localeCompare(String(a.id));
    }

    if (sortBy === 'oldest') {
      if (ta !== tb) return ta - tb;
      return String(a.id).localeCompare(String(b.id));
    }

    // Default 'smart' sorting
    const bucketOf = (ev, cls, ts) => {
      if (cls.statusKey === 'selected') return 0;
      if (cls.statusKey === 'rejected' || cls.statusKey === 'cancelled') return 4;
      const isUpcoming = ev.dayKey >= todayKey && ts >= nowMs - 90 * 60000;
      if (cls.statusKey === 'pending' && isUpcoming) return 1;
      if (isUpcoming) return 2;
      return 3;
    };

    const ba = bucketOf(a, ca, ta);
    const bb = bucketOf(b, cb, tb);
    if (ba !== bb) return ba - bb;

    // Within buckets 0, 1, 2 (upcoming): nearest first; within buckets 3, 4 (past/ended): most recent first
    if (ba <= 2) {
      if (ta !== tb) return ta - tb;
    } else if (ta !== tb) {
      return tb - ta;
    }
    return String(a.id).localeCompare(String(b.id));
  });
}
