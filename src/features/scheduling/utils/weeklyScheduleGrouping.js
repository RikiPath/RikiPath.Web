import { clockFromMinutes } from '@/features/scheduling/utils/slotPlannerModel.js';
import {
  BUSINESS_TIMEZONE,
  formatTime24,
  formatTimeRange,
  parseBusinessDate,
} from '@/utils/dateTimeFormat.js';
import { translateTemplate, translateText } from '@/locales/locale.js';

export const SHORT_WEEKDAY_LABELS = Object.freeze({
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7',
  0: 'CN',
});

export const FULL_WEEKDAY_LABELS = Object.freeze({
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  0: 'Chủ nhật',
});

export function weekdaySortWeight(weekday) {
  const num = Number(weekday);
  if (!Number.isFinite(num) || num < 0 || num > 6) return 99;
  return num === 0 ? 7 : num;
}

function parseWeekday(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 6) {
    return Math.trunc(value);
  }
  if (value == null) return null;
  const raw = String(value).trim();
  if (/^[0-6]$/.test(raw)) return Number(raw);
  const lower = raw.toLowerCase();
  if (lower === 'sun' || lower === 'sunday' || lower === 'cn' || lower.includes('chủ nhật')) return 0;
  if (lower === 'mon' || lower === 'monday' || lower === 't2' || lower.includes('thứ 2')) return 1;
  if (lower === 'tue' || lower === 'tuesday' || lower === 't3' || lower.includes('thứ 3')) return 2;
  if (lower === 'wed' || lower === 'wednesday' || lower === 't4' || lower.includes('thứ 4')) return 3;
  if (lower === 'thu' || lower === 'thursday' || lower === 't5' || lower.includes('thứ 5')) return 4;
  if (lower === 'fri' || lower === 'friday' || lower === 't6' || lower.includes('thứ 6')) return 5;
  if (lower === 'sat' || lower === 'saturday' || lower === 't7' || lower.includes('thứ 7')) return 6;
  return null;
}

function parseMinutesFromClock(clockValue) {
  if (typeof clockValue === 'number' && Number.isFinite(clockValue)) {
    return Math.trunc(clockValue);
  }
  const normalized = formatTime24(clockValue);
  if (!normalized) return null;
  const [h, m] = normalized.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function resolveVnWeekdayAndMinutes(isoValue) {
  const date = parseBusinessDate(isoValue);
  if (!date) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const weekday = parseWeekday(map.weekday);
  if (weekday == null) return null;
  const hour24 = Number(map.hour) % 24;
  const minute = Number(map.minute) || 0;
  return {
    weekday,
    minuteOfDay: hour24 * 60 + minute,
    clock24: `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

export function getShortWeekdayLabel(weekday, translateFn = translateText) {
  const day = parseWeekday(weekday);
  if (day == null) return '';
  const base = SHORT_WEEKDAY_LABELS[day] || '';
  return typeof translateFn === 'function' ? translateFn(base) : base;
}

export function getFullWeekdayLabel(weekday, translateFn = translateText) {
  const day = parseWeekday(weekday);
  if (day == null) return '';
  const base = FULL_WEEKDAY_LABELS[day] || translateTemplate('Thứ {0}', { 0: day + 1 });
  return typeof translateFn === 'function' ? translateFn(base) : base;
}

/**
 * Normalizes weekly recurring slot inputs from Cohort `schedulePattern`, Proposal `weeklySessions`,
 * or dated `sessions[]` fallback into sorted, deduplicated weekly slot items (Mon -> Sun).
 */
export function normalizeWeeklyScheduleEntries({
  schedulePattern = null,
  weeklySessions = null,
  sessions = null,
  sessionDurationMinutes = 90,
  translateFn = translateText,
} = {}) {
  const fallbackDuration = Number(sessionDurationMinutes) > 0 ? Number(sessionDurationMinutes) : 90;
  const dedup = new Map();

  const registerItem = (rawWeekday, startMin, endMin, startClockOverride, endClockOverride) => {
    const weekday = parseWeekday(rawWeekday);
    if (weekday == null) return;
    if (!Number.isFinite(startMin) || startMin < 0 || startMin >= 24 * 60) return;
    const resolvedEndMin = Number.isFinite(endMin) && endMin > startMin
      ? endMin
      : startMin + fallbackDuration;
    const startClock = startClockOverride || clockFromMinutes(startMin);
    const endClock = endClockOverride || clockFromMinutes(resolvedEndMin);
    const timeRange = formatTimeRange(startClock, endClock, `${startClock}–${endClock}`);
    const key = `${weekday}-${startMin}-${resolvedEndMin}`;
    if (dedup.has(key)) return;
    dedup.set(key, {
      key,
      weekday,
      startMinute: startMin,
      endMinute: resolvedEndMin,
      localStart: startClock,
      localEnd: endClock,
      timeRange,
      shortWeekdayLabel: getShortWeekdayLabel(weekday, translateFn),
      fullWeekdayLabel: getFullWeekdayLabel(weekday, translateFn),
    });
  };

  const patternItems = Array.isArray(schedulePattern) && schedulePattern.length > 0
    ? schedulePattern
    : Array.isArray(weeklySessions) && weeklySessions.length > 0
      ? weeklySessions
      : [];

  for (const raw of patternItems) {
    const item = raw?.slot || raw;
    if (!item || typeof item !== 'object') continue;
    const weekday = item.weekday ?? item.dayOfWeek ?? item.day ?? parseWeekday(item.weekdayLabel);
    const startMin = Number.isFinite(Number(item.startMinute))
      ? Number(item.startMinute)
      : parseMinutesFromClock(item.localStart ?? item.startTime ?? item.startLocal);
    const endMin = Number.isFinite(Number(item.endMinute))
      ? Number(item.endMinute)
      : parseMinutesFromClock(item.localEnd ?? item.endTime ?? item.endLocal);
    registerItem(weekday, startMin, endMin);
  }

  if (dedup.size === 0 && Array.isArray(sessions) && sessions.length > 0) {
    for (const s of sessions) {
      const startParts = resolveVnWeekdayAndMinutes(s?.startTime ?? s?.sessionStartUtc ?? s?.scheduledAt);
      if (!startParts) continue;
      const endParts = resolveVnWeekdayAndMinutes(s?.endTime ?? s?.sessionEndUtc);
      const endMin = endParts && endParts.minuteOfDay > startParts.minuteOfDay
        ? endParts.minuteOfDay
        : startParts.minuteOfDay + fallbackDuration;
      registerItem(
        startParts.weekday,
        startParts.minuteOfDay,
        endMin,
        startParts.clock24,
        endParts?.clock24,
      );
    }
  }

  return [...dedup.values()].sort((a, b) => (
    weekdaySortWeight(a.weekday) - weekdaySortWeight(b.weekday)
    || a.startMinute - b.startMinute
    || a.endMinute - b.endMinute
  ));
}

/**
 * Formats ordered weekdays (`1..6, 0` where `0 = Sunday -> weight 7`) cleanly without abbreviations:
 * - >= 3 consecutive days: `{First} đến {Last}` (e.g. "Thứ 2 đến Thứ 5", "Thứ 2 đến Chủ nhật").
 * - 1 or 2 days: direct list separated by ", " (e.g. "Thứ 2, Thứ 4, Thứ 6").
 */
export function formatReadableWeekdayRuns(weekdays = [], translateFn = translateText) {
  const uniqueSorted = [...new Set(
    (Array.isArray(weekdays) ? weekdays : [])
      .map((w) => parseWeekday(w))
      .filter((w) => w != null),
  )].sort((a, b) => weekdaySortWeight(a) - weekdaySortWeight(b));

  if (uniqueSorted.length === 0) return '';

  const runs = [];
  let currentRun = [uniqueSorted[0]];

  for (let i = 1; i < uniqueSorted.length; i += 1) {
    const prev = currentRun[currentRun.length - 1];
    const curr = uniqueSorted[i];
    if (weekdaySortWeight(curr) === weekdaySortWeight(prev) + 1) {
      currentRun.push(curr);
    } else {
      runs.push(currentRun);
      currentRun = [curr];
    }
  }
  runs.push(currentRun);

  const rangeConnector = typeof translateFn === 'function' ? translateFn('đến') : 'đến';
  const parts = [];

  for (const run of runs) {
    if (run.length >= 3) {
      const startLabel = getFullWeekdayLabel(run[0], translateFn);
      const endLabel = getFullWeekdayLabel(run[run.length - 1], translateFn);
      parts.push(`${startLabel} ${rangeConnector} ${endLabel}`);
    } else {
      for (const wd of run) {
        parts.push(getFullWeekdayLabel(wd, translateFn));
      }
    }
  }

  return parts.join(', ');
}

/**
 * Groups weekly schedule entries that share the exact same time window
 * (e.g., "Thứ 2 đến Thứ 5 | 12:30–14:00", "Thứ 2, Thứ 4, Thứ 6 | 08:30–10:00")
 * while keeping multiple distinct time windows cleanly ordered and readable.
 */
export function groupWeeklyScheduleByTimeRange(input = {}, { translateFn = translateText } = {}) {
  const resolvedTranslate = typeof input?.translateFn === 'function' ? input.translateFn : translateFn;
  const entries = Array.isArray(input)
    ? input
    : normalizeWeeklyScheduleEntries({ ...input, translateFn: resolvedTranslate });

  const byTime = new Map();
  for (const entry of entries) {
    const groupKey = `${entry.startMinute}-${entry.endMinute}-${entry.timeRange}`;
    if (!byTime.has(groupKey)) {
      byTime.set(groupKey, {
        key: groupKey,
        startMinute: entry.startMinute,
        endMinute: entry.endMinute,
        localStart: entry.localStart,
        localEnd: entry.localEnd,
        timeRange: entry.timeRange,
        weekdays: [],
        shortDays: [],
        fullDays: [],
        slots: [],
      });
    }
    const group = byTime.get(groupKey);
    if (!group.weekdays.includes(entry.weekday)) {
      group.weekdays.push(entry.weekday);
      group.shortDays.push(entry.shortWeekdayLabel);
      group.fullDays.push(entry.fullWeekdayLabel);
    }
    group.slots.push(entry);
  }

  return [...byTime.values()]
    .map((group) => {
      const readableDays = formatReadableWeekdayRuns(group.weekdays, resolvedTranslate);
      return {
        ...group,
        compactDaysText: readableDays,
        fullDaysText: readableDays,
      };
    })
    .sort((a, b) => (
      weekdaySortWeight(a.weekdays[0]) - weekdaySortWeight(b.weekdays[0])
      || a.startMinute - b.startMinute
    ));
}

export function formatWeeklyScheduleSummary({
  schedulePattern = null,
  weeklySessions = null,
  sessions = null,
  sessionDurationMinutes = 90,
  compact = true,
  fallback = 'Chưa có lịch học hằng tuần',
  translateFn = translateText,
} = {}) {
  const groups = groupWeeklyScheduleByTimeRange({
    schedulePattern,
    weeklySessions,
    sessions,
    sessionDurationMinutes,
    translateFn,
  }, { translateFn });
  if (groups.length === 0) {
    return typeof translateFn === 'function' ? translateFn(fallback) : fallback;
  }
  return groups
    .map((g) => `${compact ? g.fullDaysText : g.fullDaysText} | ${g.timeRange}`)
    .join('; ');
}
