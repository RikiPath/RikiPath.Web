// Pure atmosphere rules (no React, no DOM) — shared by the header sky, settings and tests.

export const DISPLAY_MODES = ['weather', 'sky', 'off'];
export const INTENSITIES = ['low', 'medium', 'high'];
export const PERIODS = ['morning', 'afternoon', 'evening', 'night'];
export const CONDITIONS = ['clear', 'partly', 'cloudy', 'rain', 'thunder', 'snow', 'fog'];

/** Illustration/fallback schedule: 05–10 morning, 11–16 afternoon, 17–18 evening, 19–04 night. */
export function periodForHour(hour) {
  const h = ((Number(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'afternoon';
  if (h >= 17 && h < 19) return 'evening';
  return 'night';
}

/** Hour (0–23) of `date` in an IANA time zone; falls back to the device zone. */
export function hourInZone(date, timeZone) {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).formatToParts(date);
      const hour = Number(parts.find((p) => p.type === 'hour')?.value);
      if (Number.isFinite(hour)) return hour % 24;
    } catch {
      // Unknown zone → device time.
    }
  }
  return date.getHours();
}

/**
 * WMO weather code (Open-Meteo `weather_code`) + cloud cover → visual condition.
 * Unknown codes return null so the sky never invents rain/snow.
 */
export function conditionForWeather(code, cloudCover) {
  const c = Number(code);
  if (!Number.isFinite(c)) return null;
  if (c === 0 || c === 1) return Number(cloudCover) >= 60 ? 'partly' : 'clear';
  if (c === 2) return 'partly';
  if (c === 3) return 'cloudy';
  if (c === 45 || c === 48) return 'fog';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if (c >= 95 && c <= 99) return 'thunder';
  return null;
}

export const CONDITION_LABEL = {
  clear: 'Trời quang',
  partly: 'Có mây rải rác',
  cloudy: 'Nhiều mây',
  rain: 'Mưa',
  thunder: 'Dông',
  snow: 'Tuyết',
  fog: 'Sương mù',
};

export const PERIOD_LABEL = { morning: 'Buổi sáng', afternoon: 'Buổi chiều', evening: 'Hoàng hôn', night: 'Ban đêm' };

/**
 * Scene to draw. Without valid weather it is the device-time illustration with a clear sky.
 * With weather it uses the location's time zone and the provider's day/night flag.
 */
export function deriveScene({ mode, weather, now = new Date() }) {
  if (mode === 'off') return { period: 'off', condition: 'clear', live: false, isDark: false, daylight: true };
  const live = mode === 'weather' && weather && conditionForWeather(weather.weatherCode, weather.cloudCover) !== null;
  let period = periodForHour(hourInZone(now, live ? weather.timezone : undefined));
  if (live && typeof weather.isDay === 'boolean') {
    if (!weather.isDay && (period === 'morning' || period === 'afternoon')) period = 'night';
    if (weather.isDay && period === 'night') period = 'morning';
  }
  const condition = live ? conditionForWeather(weather.weatherCode, weather.cloudCover) : 'clear';
  const isDark = period === 'night' || condition === 'thunder' || (period === 'evening' && (condition === 'rain' || condition === 'cloudy'));
  // Sun vs moon: the provider's day/night flag wins (an evening after sunset shows the moon); illustration = period.
  const daylight = live && typeof weather.isDay === 'boolean' ? weather.isDay : period !== 'night';
  return { period, condition, live: Boolean(live), isDark, daylight };
}

export const sceneKey = (scene) => `${scene.period}:${scene.condition}:${scene.daylight === false ? 'n' : 'd'}`;

/**
 * Role-aware decoration level: Learner full, Mentor subtle, Admin/ContentAuthor minimal (no particles).
 * The user's intensity can only lower decoration further; reduced motion keeps the static scene only.
 */
export function roleDecoration(roleKey) {
  if (roleKey === 'Learner') return 'full';
  if (roleKey === 'Mentor') return 'subtle';
  return 'minimal';
}

const BASE = {
  low: { clouds: 2, stars: 1, drops: 1, flakes: 6, petals: 2 },
  medium: { clouds: 3, stars: 2, drops: 1, flakes: 10, petals: 4 },
  high: { clouds: 4, stars: 3, drops: 2, flakes: 14, petals: 6 },
};

/** Number of decorative nodes per effect (all small; never hundreds of particles). */
export function effectBudget({ intensity = 'low', decoration = 'full', reducedMotion = false, condition = 'clear', period = 'afternoon' }) {
  const b = { ...(BASE[intensity] || BASE.low) };
  if (decoration === 'subtle') {
    b.clouds = Math.min(b.clouds, 2);
    b.flakes = Math.min(b.flakes, 6);
    b.petals = 0;
  }
  if (decoration === 'minimal') {
    b.clouds = Math.min(b.clouds, 2);
    b.stars = Math.min(b.stars, 1);
    b.flakes = 0;
    b.petals = 0;
  }
  if (reducedMotion) b.petals = 0;
  return {
    clouds: condition === 'clear' ? Math.min(1, b.clouds) : condition === 'cloudy' || condition === 'rain' || condition === 'thunder' ? b.clouds + 1 : b.clouds,
    stars: period === 'night' && (condition === 'clear' || condition === 'partly') ? b.stars : 0,
    rain: condition === 'rain' || condition === 'thunder' ? (decoration === 'minimal' ? 1 : b.drops) : 0,
    flakes: condition === 'snow' ? Math.max(decoration === 'minimal' ? 4 : 0, b.flakes) : 0,
    petals: condition === 'clear' || condition === 'partly' ? b.petals : 0,
    fog: condition === 'fog',
    lightning: condition === 'thunder' && decoration === 'full' && intensity !== 'low' && !reducedMotion,
  };
}

/** Coordinates kept for weather lookups are rounded (~11 km at 1 decimal); precise GPS is never stored. */
export function coarsen(value, decimals = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export const DEFAULT_PREFS = Object.freeze({ mode: 'sky', intensity: 'low', location: null });

/** Validates stored preferences; anything unexpected falls back to safe defaults. */
export function sanitizePrefs(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const mode = DISPLAY_MODES.includes(p.mode) ? p.mode : DEFAULT_PREFS.mode;
  const intensity = INTENSITIES.includes(p.intensity) ? p.intensity : DEFAULT_PREFS.intensity;
  let location = null;
  const l = p.location;
  if (l && typeof l === 'object') {
    const lat = coarsen(l.latitude, l.source === 'device' ? 1 : 2);
    const lon = coarsen(l.longitude, l.source === 'device' ? 1 : 2);
    if (lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      location = {
        name: String(l.name || '').slice(0, 80) || 'Vị trí đã chọn',
        region: l.region ? String(l.region).slice(0, 80) : '',
        country: l.country ? String(l.country).slice(0, 60) : '',
        latitude: lat,
        longitude: lon,
        timezone: typeof l.timezone === 'string' ? l.timezone.slice(0, 64) : '',
        source: l.source === 'device' ? 'device' : 'search',
      };
    }
  }
  return { mode, intensity, location };
}

/** Weather cache freshness (ms). */
export const WEATHER_STALE_MS = 20 * 60 * 1000;
export const WEATHER_REFRESH_MS = 30 * 60 * 1000;
