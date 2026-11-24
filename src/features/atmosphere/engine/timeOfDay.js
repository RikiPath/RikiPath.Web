// Local time of the selected place (IANA zone) and the five named periods of the day.
// Periods name the moment and drive fallbacks; real light/dark always comes from the sun's elevation.

export const PERIODS = ['morning', 'noon', 'afternoon', 'evening', 'latenight'];

export const PERIOD_LABEL = {
  morning: 'Buổi sáng',
  noon: 'Buổi trưa',
  afternoon: 'Buổi chiều',
  evening: 'Buổi tối',
  latenight: 'Khuya',
};

/** 05:00–10:59 sáng · 11:00–13:29 trưa · 13:30–17:59 chiều · 18:00–22:59 tối · 23:00–04:59 khuya. */
export function periodForTime(hour, minute = 0) {
  const m = ((((Number(hour) || 0) % 24) + 24) % 24) * 60 + (Number(minute) || 0);
  if (m >= 300 && m < 660) return 'morning';
  if (m >= 660 && m < 810) return 'noon';
  if (m >= 810 && m < 1080) return 'afternoon';
  if (m >= 1080 && m < 1380) return 'evening';
  return 'latenight';
}

/** Backwards-compatible hour-only helper. */
export const periodForHour = (hour) => periodForTime(hour, 0);

const formatters = new Map();
function partsFormatter(timeZone) {
  const key = timeZone || '';
  if (!formatters.has(key)) {
    formatters.set(
      key,
      new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone || undefined,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23',
      }),
    );
  }
  return formatters.get(key);
}

export function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    partsFormatter(timeZone);
    return true;
  } catch {
    formatters.delete(timeZone);
    return false;
  }
}

/** Wall-clock parts of `date` in an IANA zone (DST handled by Intl). Unknown zone → device zone. */
export function zonedParts(date, timeZone) {
  let fmt;
  try {
    fmt = partsFormatter(isValidTimeZone(timeZone) ? timeZone : '');
  } catch {
    fmt = partsFormatter('');
  }
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);
  const hour = Number(p.hour) % 24;
  const minute = Number(p.minute);
  const dayOfYear = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86_400_000) + 1;
  return { year, month, day, hour, minute, dayOfYear };
}

/** Backwards-compatible: hour (0–23) of `date` in a zone. */
export const hourInZone = (date, timeZone) => zonedParts(date, timeZone).hour;

export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/**
 * Representative coordinates for common device zones — the system fallback when the user has not chosen a place,
 * so the illustrated sky still follows a plausible sunrise/sunset. Labelled "ước tính theo múi giờ thiết bị".
 */
export const ZONE_ANCHORS = {
  'Asia/Ho_Chi_Minh': [10.82, 106.63],
  'Asia/Saigon': [10.82, 106.63],
  'Asia/Bangkok': [13.75, 100.5],
  'Asia/Jakarta': [-6.2, 106.85],
  'Asia/Singapore': [1.35, 103.82],
  'Asia/Kuala_Lumpur': [3.14, 101.69],
  'Asia/Manila': [14.6, 120.98],
  'Asia/Hong_Kong': [22.32, 114.17],
  'Asia/Taipei': [25.03, 121.56],
  'Asia/Shanghai': [31.23, 121.47],
  'Asia/Seoul': [37.57, 126.98],
  'Asia/Tokyo': [35.68, 139.69],
  'Australia/Sydney': [-33.87, 151.21],
  'Europe/London': [51.51, -0.13],
  'Europe/Paris': [48.86, 2.35],
  'Europe/Berlin': [52.52, 13.4],
  'America/New_York': [40.71, -74.01],
  'America/Chicago': [41.88, -87.63],
  'America/Los_Angeles': [34.05, -118.24],
};
