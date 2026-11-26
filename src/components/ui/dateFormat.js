import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatHourMinute24,
  formatHourMinuteAmPm,
  formatNotificationDateTime,
  formatNotificationTime,
  formatRelativeTime,
  formatTime,
  formatTime24,
  formatTimeRange,
  parseBusinessDate,
} from '@/utils/dateTimeFormat.js';

/** Formats a Gregorian ISO date key (`YYYY-MM-DD`) in `dd/MM/yyyy` without local TZ drift. */
export function formatIsoDateDisplay(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return '';
  return formatDate(key);
}

export {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatHourMinute24,
  formatHourMinuteAmPm,
  formatNotificationDateTime,
  formatNotificationTime,
  formatRelativeTime,
  formatTime,
  formatTime24,
  formatTimeRange,
  parseBusinessDate,
};
