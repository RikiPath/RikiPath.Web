import { parseUtcDate } from '@/utils/vnDateTime.js';

/**
 * Seconds left on a seat hold, computed only from the server's expiry timestamp
 * (never from a client-side default). Returns null when the server sent no expiry.
 */
export function holdSecondsLeft(expiresAt, nowMs) {
  const end = parseUtcDate(expiresAt)?.getTime();
  if (!Number.isFinite(end)) return null;
  return Math.max(0, Math.floor((end - nowMs) / 1000));
}

export function formatCountdown(seconds) {
  if (seconds == null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
