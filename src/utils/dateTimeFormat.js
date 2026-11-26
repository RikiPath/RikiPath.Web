import { readLocale } from '@/locales/locale.js';

export const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';
const ISO_DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK_24H_RE = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;
const CLOCK_12H_RE = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
const TZ_SUFFIX_RE = /(?:Z|[+-]\d{2}:\d{2})$/i;

function pad2(n) {
  return String(Math.trunc(Number(n) || 0)).padStart(2, '0');
}

/**
 * Parses a Date, numeric epoch ms, ISO timestamp (UTC if lacking explicit TZ suffix),
 * or date-only string into a valid Date object. Returns null for invalid/missing input.
 */
export function parseBusinessDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (ISO_DATE_ONLY_RE.test(raw)) {
    const d = new Date(`${raw}T00:00:00+07:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const normalized = TZ_SUFFIX_RE.test(raw) ? raw : `${raw}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getVnParts(date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  // Some runtimes emit hour "24" for midnight under hour12: false; normalize to 0.
  const hour24 = Number(map.hour) % 24;
  const minute = Number(map.minute) || 0;
  return {
    day: map.day,
    month: map.month,
    year: map.year,
    hour24,
    minute,
  };
}

/**
 * Extracts authoritative 24-hour `{ hour24, minute }` from any supported time representation:
 * - Minute-of-day number (0..1440, e.g. 825 → { hour24: 13, minute: 45 })
 * - 24-hour clock string ("07:30", "13:45", "00:00", "23:59")
 * - 12-hour clock string ("01:45 PM" → { hour24: 13, minute: 45 }, "12:00 AM" → { hour24: 0, minute: 0 })
 * - Date / UTC ISO timestamp (converted to Asia/Ho_Chi_Minh)
 */
function resolveHourMinute24(value) {
  if (value == null || value === '') return null;

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || value > 1440) return null;
    const total = Math.trunc(value) % 1440;
    return { hour24: Math.floor(total / 60), minute: total % 60 };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const clock12 = trimmed.match(CLOCK_12H_RE);
    if (clock12) {
      const h12 = Number(clock12[1]);
      const mm = Number(clock12[2]);
      const period = clock12[3].toUpperCase();
      if (h12 < 1 || h12 > 12 || mm < 0 || mm > 59) return null;
      const hour24 = period === 'AM'
        ? (h12 === 12 ? 0 : h12)
        : (h12 === 12 ? 12 : h12 + 12);
      return { hour24, minute: mm };
    }

    const clock24 = trimmed.match(CLOCK_24H_RE);
    if (clock24) {
      const hh = Number(clock24[1]);
      const mm = Number(clock24[2]);
      if (hh < 0 || hh > 24 || mm < 0 || mm > 59) return null;
      return { hour24: hh === 24 ? 0 : hh, minute: mm };
    }
  }

  const date = parseBusinessDate(value);
  if (!date) return null;
  const { hour24, minute } = getVnParts(date);
  return { hour24, minute };
}

/**
 * Formats 24-hour (hour, minute) into canonical 24-hour `HH:mm`:
 * 00:00 → 00:00 | 07:30 → 07:30 | 12:00 → 12:00 | 13:45 → 13:45 | 23:59 → 23:59.
 */
export function formatHourMinute24(hour24, minute) {
  const hRaw = Number(hour24);
  const mRaw = Number(minute);
  if (!Number.isFinite(hRaw) || !Number.isFinite(mRaw)) return '';
  if (hRaw < 0 || hRaw > 24 || mRaw < 0 || mRaw > 59) return '';
  const hNorm = hRaw === 24 ? 0 : Math.trunc(hRaw);
  const mNorm = Math.trunc(mRaw);
  return `${pad2(hNorm)}:${pad2(mNorm)}`;
}

/**
 * Formats 24-hour (hour, minute) into canonical 12-hour `hh:mm AM/PM` (Notification UI ONLY):
 * 00:00 → 12:00 AM | 11:59 → 11:59 AM | 12:00 → 12:00 PM | 13:45 → 01:45 PM | 23:59 → 11:59 PM.
 */
export function formatHourMinuteAmPm(hour24, minute) {
  const hRaw = Number(hour24);
  const mRaw = Number(minute);
  if (!Number.isFinite(hRaw) || !Number.isFinite(mRaw)) return '';
  if (hRaw < 0 || hRaw > 24 || mRaw < 0 || mRaw > 59) return '';
  const hNorm = hRaw === 24 ? 0 : Math.trunc(hRaw);
  const mNorm = Math.trunc(mRaw);
  const period = hNorm >= 12 ? 'PM' : 'AM';
  const h12 = hNorm % 12 === 0 ? 12 : hNorm % 12;
  return `${pad2(h12)}:${pad2(mNorm)} ${period}`;
}

/* ─────────────────────────── GLOBAL DATE & TIME FORMATTING (Asia/Ho_Chi_Minh) ─────────────────────────── */

/**
 * Formats a Date, UTC ISO timestamp, or YYYY-MM-DD key as `dd/MM/yyyy` (in Asia/Ho_Chi_Minh).
 */
export function formatDate(value, fallback = '') {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const m = trimmed.match(ISO_DATE_ONLY_RE);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const date = parseBusinessDate(value);
  if (!date) return fallback;
  const { day, month, year } = getVnParts(date);
  return `${day}/${month}/${year}`;
}

/**
 * Explicit 24-hour `HH:mm` formatter — used for time ranges and Calendar time axes.
 * Examples: "00:00", "08:00", "13:45", "23:59".
 */
export function formatTime24(value, fallback = '') {
  const hm = resolveHourMinute24(value);
  if (!hm) return fallback;
  return formatHourMinute24(hm.hour24, hm.minute) || fallback;
}

/**
 * Single time formatter — 12-hour `hh:mm A` (AM/PM) across the entire system.
 * Examples: "12:00 AM", "08:30 AM", "02:45 PM", "10:00 PM".
 */
export function formatTime(value, fallback = '') {
  const hm = resolveHourMinute24(value);
  if (!hm) return fallback;
  return formatHourMinuteAmPm(hm.hour24, hm.minute) || fallback;
}

/**
 * Time range formatter — compact 24-hour `HH:mm–HH:mm` without AM/PM.
 * Examples: "08:15–09:45", "13:30–15:00", "18:00–19:30".
 */
export function formatTimeRange(start, end, fallback = '') {
  const startText = formatTime24(start);
  const endText = formatTime24(end);
  if (startText && endText) return `${startText}–${endText}`;
  return startText || endText || fallback;
}

/**
 * Global DateTime formatter — 12-hour `hh:mm A - dd/MM/yyyy` (in Asia/Ho_Chi_Minh).
 * Example: "08:30 AM - 25/11/2026".
 */
export function formatDateTime(value, fallback = '') {
  const date = parseBusinessDate(value);
  if (!date) return fallback;
  const { day, month, year, hour24, minute } = getVnParts(date);
  const timePart = formatHourMinuteAmPm(hour24, minute);
  return `${timePart} - ${day}/${month}/${year}`;
}

/**
 * Business date range formatter — `dd/MM/yyyy → dd/MM/yyyy`.
 * Example: "03/12/2026 → 06/02/2027".
 */
export function formatDateRange(start, end, fallback = '') {
  const startText = formatDate(start);
  const endText = formatDate(end);
  if (startText && endText) return `${startText} → ${endText}`;
  return startText || endText || fallback;
}

/**
 * Notification time alias — 12-hour `hh:mm A`.
 */
export function formatNotificationTime(value, fallback = '') {
  return formatTime(value, fallback);
}

/**
 * Notification DateTime alias — 12-hour `hh:mm A - dd/MM/yyyy`.
 */
export function formatNotificationDateTime(value, fallback = '') {
  return formatDateTime(value, fallback);
}

/**
 * Formats relative elapsed time consistently across locales (vi / ja / en).
 * Never emits negative durations (clock skew / slightly future timestamps resolve to "Vừa xong").
 */
export function formatRelativeTime(value, nowMs = Date.now(), localeOverride = null) {
  const date = parseBusinessDate(value);
  if (!date) return '';

  const locale = localeOverride || readLocale() || 'vi';
  const diffMs = nowMs - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  // Guard clock skew / future timestamps: never show "-5 giây trước".
  if (diffSec < 5) {
    if (locale === 'ja') return 'たった今';
    if (locale === 'en') return 'Just now';
    return 'Vừa xong';
  }
  if (diffSec < 60) {
    if (locale === 'ja') return `${diffSec}秒前`;
    if (locale === 'en') return `${diffSec}s ago`;
    return `${diffSec} giây trước`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    if (locale === 'ja') return `${diffMin}分前`;
    if (locale === 'en') return `${diffMin}m ago`;
    return `${diffMin} phút trước`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    if (locale === 'ja') return `${diffHours}時間前`;
    if (locale === 'en') return `${diffHours}h ago`;
    return `${diffHours} giờ trước`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    if (locale === 'ja') return `${diffDays}日前`;
    if (locale === 'en') return `${diffDays}d ago`;
    return `${diffDays} ngày trước`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    if (locale === 'ja') return `${weeks}週間前`;
    if (locale === 'en') return `${weeks}w ago`;
    return `${weeks} tuần trước`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    if (locale === 'ja') return `${months}か月前`;
    if (locale === 'en') return `${months}mo ago`;
    return `${months} tháng trước`;
  }
  const years = Math.floor(diffDays / 365);
  if (locale === 'ja') return `${years}年前`;
  if (locale === 'en') return `${years}y ago`;
  return `${years} năm trước`;
}

/**
 * Pure adaptive tick interval calculator for live relative timestamps:
 * - < 60s old → 1s
 * - < 1h old  → 30s
 * - < 24h old → 5m
 * - older     → null (no active timer required)
 */
export function computeNextRelativeTickMs(timestamps = [], nowMs = Date.now()) {
  if (!Array.isArray(timestamps) || timestamps.length === 0) return null;
  let minAgeMs = Infinity;
  for (const raw of timestamps) {
    const d = parseBusinessDate(raw);
    if (!d) continue;
    const age = Math.max(0, nowMs - d.getTime());
    if (age < minAgeMs) minAgeMs = age;
  }
  if (!Number.isFinite(minAgeMs)) return null;
  if (minAgeMs < 60_000) return 1_000;
  if (minAgeMs < 3_600_000) return 30_000;
  if (minAgeMs < 86_400_000) return 300_000;
  return null;
}
