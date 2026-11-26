import { formatIsoDateDisplay } from '@/components/ui/dateFormat.js';
import { BUSINESS_TIMEZONE, formatHourMinute24, parseBusinessDate } from '@/utils/dateTimeFormat.js';

const VN_WEEKDAY_TO_INDEX = Object.freeze({
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
});

function toVnOccurrenceParts(date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const map = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const hour24 = Number(map.hour) % 24;
  const minute = Number(map.minute) || 0;
  return {
    localDate: `${map.year}-${map.month}-${map.day}`,
    weekday: VN_WEEKDAY_TO_INDEX[map.weekday] ?? 0,
    clock24: formatHourMinute24(hour24, minute),
  };
}

export function compareScheduleOccurrences(a, b) {
  const aMs = Number(a?.startMs);
  const bMs = Number(b?.startMs);
  if (Number.isFinite(aMs) && Number.isFinite(bMs) && aMs !== bMs) return aMs - bMs;
  const dateCmp = String(a?.localDate || '').localeCompare(String(b?.localDate || ''));
  if (dateCmp !== 0) return dateCmp;
  const startCmp = String(a?.localStart || '').localeCompare(String(b?.localStart || ''));
  if (startCmp !== 0) return startCmp;
  return Number(a?.sessionNumber || 0) - Number(b?.sessionNumber || 0);
}

/**
 * Converts authoritative cohort sessions (UTC ISO start/end timestamps) into
 * chronologically sorted Asia/Ho_Chi_Minh occurrence items for `ProposalDetailedScheduleCard`.
 */
export function mapCohortSessionsToOccurrences(
  sessions = [],
  { resolveStatus = null, fallbackDurationMinutes = 90 } = {},
) {
  if (!Array.isArray(sessions) || sessions.length === 0) return [];
  const minutes = Number(fallbackDurationMinutes) > 0 ? Number(fallbackDurationMinutes) : 90;

  return sessions
    .map((s, idx) => {
      const startDate = parseBusinessDate(s?.startTime || s?.scheduledAt);
      if (!startDate) return null;
      const explicitEnd = parseBusinessDate(s?.endTime);
      const endDate = explicitEnd || new Date(startDate.getTime() + minutes * 60_000);
      const startParts = toVnOccurrenceParts(startDate);
      const endParts = toVnOccurrenceParts(endDate);
      const sessionNumber = Number(s?.number || s?.sessionNumber || idx + 1);
      const statusMeta = typeof resolveStatus === 'function'
        ? resolveStatus(s, { startDate, endDate })
        : null;

      return {
        key: s?.availabilityId || s?.id || `${sessionNumber}-${startParts.localDate}`,
        sessionNumber,
        localDate: startParts.localDate,
        weekday: startParts.weekday,
        localStart: startParts.clock24,
        localEnd: endParts.clock24,
        startMs: startDate.getTime(),
        endMs: endDate.getTime(),
        statusLabel: statusMeta?.label || null,
        statusTone: statusMeta?.tone || null,
      };
    })
    .filter(Boolean)
    .sort(compareScheduleOccurrences);
}

export function formatDayMonth(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return formatIsoDateDisplay(isoDate);
  return `${m[3]}/${m[2]}`;
}

export function extractIsoYear(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const m = isoDate.match(/^(\d{4})-/);
  return m ? m[1] : '';
}

export function computeScheduleYearRange(occurrences = []) {
  if (!Array.isArray(occurrences) || occurrences.length === 0) return '';
  const firstYear = extractIsoYear(occurrences[0]?.localDate);
  const lastYear = extractIsoYear(occurrences[occurrences.length - 1]?.localDate);
  if (!firstYear) return '';
  if (!lastYear || firstYear === lastYear) return firstYear;
  return `${firstYear}–${lastYear}`;
}

/**
 * Formats actual course start/end dates and session total via shared dd/MM/yyyy formatter:
 * e.g. "02/12/2026 → 04/02/2027 (40 buổi)" (always prefers actual last occurrence date).
 */
export function formatProposalCourseDuration({
  expectedStartDate,
  projectedEndDate,
  occurrences = [],
  totalSessions = 0,
  trf,
}) {
  const sortedOccs = Array.isArray(occurrences) && occurrences.length > 0
    ? [...occurrences].sort((a, b) => Number(a.sessionNumber || 0) - Number(b.sessionNumber || 0))
    : [];
  const actualStart = expectedStartDate || sortedOccs[0]?.localDate || null;
  const actualEnd = (sortedOccs.length > 0 ? sortedOccs[sortedOccs.length - 1]?.localDate : null) || projectedEndDate || null;
  const actualCount = sortedOccs.length > 0 ? sortedOccs.length : Number(totalSessions || 0);

  const startText = actualStart ? formatIsoDateDisplay(actualStart) : '—';
  const endText = actualEnd ? formatIsoDateDisplay(actualEnd) : '—';
  const rangeText = `${startText} → ${endText}`;
  if (actualCount <= 0) return rangeText;
  const countLabel = typeof trf === 'function'
    ? trf('{0} buổi', { 0: actualCount })
    : `${actualCount} buổi`;
  return `${rangeText} (${countLabel})`;
}
