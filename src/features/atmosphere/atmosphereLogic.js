// Pure atmosphere rules (no React, no DOM) — preferences, privacy and freshness policy.
// Scene composition lives in ./engine (solar, time zone, weather, season, palette, clouds, particles).
import { SEASONAL_PREFS } from './engine/season.js';

export { CONDITIONS, CONDITION_LABEL, classifyWeather, conditionForCode, conditionForWeather, weatherLabel } from './engine/weatherCondition.js';
export { PERIODS, PERIOD_LABEL, hourInZone, periodForHour, periodForTime } from './engine/timeOfDay.js';
export { SEASONAL_PREFS } from './engine/season.js';
export { resolveScene } from './engine/sceneResolver.js';

export const DISPLAY_MODES = ['weather', 'sky', 'off'];
export const INTENSITIES = ['low', 'medium', 'high'];

/** Coordinates kept for weather lookups are rounded (~11 km at 1 decimal); precise GPS is never stored. */
export function coarsen(value, decimals = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export const DEFAULT_PREFS = Object.freeze({ mode: 'sky', intensity: 'low', seasonal: 'auto', location: null });

/** Validates stored preferences; anything unexpected falls back to safe defaults. */
export function sanitizePrefs(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const mode = DISPLAY_MODES.includes(p.mode) ? p.mode : DEFAULT_PREFS.mode;
  const intensity = INTENSITIES.includes(p.intensity) ? p.intensity : DEFAULT_PREFS.intensity;
  const seasonal = SEASONAL_PREFS.includes(p.seasonal) ? p.seasonal : DEFAULT_PREFS.seasonal;
  let location = null;
  const l = p.location;
  if (l && typeof l === 'object') {
    const coarseSource = l.source === 'device' || l.source === 'ip';
    const lat = coarsen(l.latitude, coarseSource ? 1 : 2);
    const lon = coarsen(l.longitude, coarseSource ? 1 : 2);
    if (lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      location = {
        name: String(l.name || '').slice(0, 80) || 'Vị trí đã chọn',
        region: l.region ? String(l.region).slice(0, 80) : '',
        country: l.country ? String(l.country).slice(0, 60) : '',
        latitude: lat,
        longitude: lon,
        timezone: typeof l.timezone === 'string' && /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/.test(l.timezone) ? l.timezone.slice(0, 64) : '',
        source: l.source === 'device' ? 'device' : l.source === 'ip' ? 'ip' : 'search',
      };
    }
  }
  return { mode, intensity, seasonal, location };
}

/** Weather freshness (ms): session cache reuse, background refresh, and the age after which data is no longer "current". */
export const WEATHER_STALE_MS = 20 * 60 * 1000;
export const WEATHER_REFRESH_MS = 30 * 60 * 1000;
export const WEATHER_MAX_AGE_MS = 75 * 60 * 1000;

/** live = fetched in this session; cached = restored from the session cache; expired = too old to show as current. */
export function weatherFreshness(updatedAt, fromCache, now = Date.now()) {
  if (!updatedAt) return 'unavailable';
  if (now - updatedAt > WEATHER_MAX_AGE_MS) return 'expired';
  return fromCache ? 'cached' : 'live';
}
