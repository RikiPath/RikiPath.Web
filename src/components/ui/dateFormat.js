import { currentIntlTag } from '@/locales/locale.js';

/** Formats a Gregorian ISO date key (`YYYY-MM-DD`) in `dd/MM/yyyy` (VI) / locale format without local TZ drift. */
export function formatIsoDateDisplay(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return '';
  return new Intl.DateTimeFormat(currentIntlTag(), {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${key}T00:00:00Z`));
}
