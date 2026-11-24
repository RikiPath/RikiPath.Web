// Provider data → visual weather state. Only what the provider reports is used: an unknown code returns null
// (no invented rain/snow), temperature/time never imply a condition, and missing fields stay null.

export const CONDITIONS = ['clear', 'partly', 'mostly', 'overcast', 'fog', 'rain', 'thunder', 'snow'];
export const LEVELS = ['light', 'moderate', 'heavy'];

/** Cloud-cover bands (visual rule only; the WMO code still decides the reported condition). */
export function coverBand(cover) {
  const c = Number(cover);
  if (!Number.isFinite(c)) return null;
  if (c <= 10) return 'clear';
  if (c <= 30) return 'few';
  if (c <= 60) return 'scattered';
  if (c <= 85) return 'mostly';
  return 'overcast';
}

/** Share of the cloud slots to show for a cover % (0..1). */
export function cloudFractionForCover(cover) {
  const c = Math.max(0, Math.min(100, Number(cover) || 0));
  if (c <= 10) return c / 10 * 0.12;
  if (c <= 30) return 0.12 + ((c - 10) / 20) * 0.23;
  if (c <= 60) return 0.35 + ((c - 30) / 30) * 0.27;
  if (c <= 85) return 0.62 + ((c - 60) / 25) * 0.26;
  return 0.88 + ((c - 85) / 15) * 0.12;
}

const CODE_LEVEL = {
  51: 'light', 53: 'moderate', 55: 'heavy', 56: 'light', 57: 'heavy',
  61: 'light', 63: 'moderate', 65: 'heavy', 66: 'light', 67: 'heavy',
  71: 'light', 73: 'moderate', 75: 'heavy', 77: 'light',
  80: 'light', 81: 'moderate', 82: 'heavy', 85: 'light', 86: 'heavy',
  95: 'moderate', 96: 'heavy', 99: 'heavy',
};
const rank = (l) => LEVELS.indexOf(l);
const maxLevel = (a, b) => (rank(a) >= rank(b) ? a : b);

/** WMO code (Open-Meteo `weather_code`) → reported condition, or null when unknown. */
export function conditionForCode(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return null;
  if (c === 0 || c === 1) return 'clear';
  if (c === 2) return 'partly';
  if (c === 3) return 'overcast';
  if (c === 45 || c === 48) return 'fog';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if (c >= 95 && c <= 99) return 'thunder';
  return null;
}

/** Legacy helper kept for callers that only need a coarse condition. */
export function conditionForWeather(code, cloudCover) {
  const base = conditionForCode(code);
  if (base === 'clear' || base === 'partly' || base === 'overcast') return visualSkyCondition(base, cloudCover);
  return base;
}

function visualSkyCondition(base, cover) {
  const band = coverBand(cover);
  if (!band) return base;
  if (band === 'clear' || band === 'few') return base === 'overcast' ? 'mostly' : 'clear';
  if (band === 'scattered') return 'partly';
  if (band === 'mostly') return 'mostly';
  return base === 'clear' ? 'mostly' : 'overcast';
}

/** Horizontal wind for the header: +1 blows left → right. Direction is meteorological (where the wind comes FROM). */
export function windVector(speedKmh, directionDeg) {
  const speed = speedKmh === null || speedKmh === undefined || speedKmh === '' ? NaN : Number(speedKmh);
  const dir = directionDeg === null || directionDeg === undefined || directionDeg === '' ? NaN : Number(directionDeg);
  if (!Number.isFinite(speed)) return { speed: null, direction: null, x: 0, level: 'unknown' };
  const x = Number.isFinite(dir) ? -Math.sin((dir * Math.PI) / 180) : 0;
  const level = speed >= 50 ? 'strong' : speed >= 30 ? 'windy' : speed >= 12 ? 'breeze' : 'calm';
  return { speed, direction: Number.isFinite(dir) ? dir : null, x, level };
}

/**
 * Full visual weather state from a parsed provider payload, or null when the payload is unusable.
 * `precip.level` combines the code's intensity with the measured mm/h (the stronger wins).
 */
export function classifyWeather(weather) {
  if (!weather) return null;
  const reported = conditionForCode(weather.weatherCode);
  if (!reported) return null;
  const cover = weather.cloudCover !== null && weather.cloudCover !== undefined && Number.isFinite(Number(weather.cloudCover)) ? Number(weather.cloudCover) : null;
  const code = Number(weather.weatherCode);
  let precip = null;
  if (reported === 'rain' || reported === 'thunder') {
    const mm = Number(weather.rain ?? 0) + Number(weather.showers ?? 0) || Number(weather.precipitation) || 0;
    const measured = mm >= 7.6 ? 'heavy' : mm >= 2.5 ? 'moderate' : mm > 0 ? 'light' : null;
    const hasMeasure = weather.precipitation !== null && weather.precipitation !== undefined;
    if (reported === 'thunder' && hasMeasure && !measured) precip = null; // dry thunderstorm: no invented rain
    else precip = { kind: 'rain', level: measured ? maxLevel(CODE_LEVEL[code] || 'light', measured) : CODE_LEVEL[code] || 'light' };
  } else if (reported === 'snow') {
    const cm = Number(weather.snowfall) || 0;
    const measured = cm >= 2.5 ? 'heavy' : cm >= 1 ? 'moderate' : null;
    precip = { kind: 'snow', level: measured ? maxLevel(CODE_LEVEL[code] || 'light', measured) : CODE_LEVEL[code] || 'light' };
  }
  const condition = reported === 'clear' || reported === 'partly' || reported === 'overcast' ? visualSkyCondition(reported, cover) : reported;
  const defaultCover = { clear: 5, partly: 45, mostly: 75, overcast: 95, fog: 80, rain: 88, thunder: 96, snow: 90 }[condition];
  const visualCover = cover ?? defaultCover;
  return {
    code,
    reported,
    condition,
    precip,
    cloudCover: cover,
    visualCover,
    cloudFraction: cloudFractionForCover(visualCover),
    wind: windVector(weather.windSpeed, weather.windDirection),
    temperature: Number(weather.temperature),
    humidity: weather.humidity !== null && weather.humidity !== undefined && Number.isFinite(Number(weather.humidity)) ? Number(weather.humidity) : null,
    isDay: typeof weather.isDay === 'boolean' ? weather.isDay : null,
  };
}

/** User-facing label (Vietnamese source string for tr()). */
export function weatherLabel(state) {
  if (!state) return '';
  if (state.reported === 'rain') return { light: 'Mưa nhẹ', moderate: 'Mưa vừa', heavy: 'Mưa to' }[state.precip?.level] || 'Mưa';
  if (state.reported === 'snow') return { light: 'Tuyết rơi nhẹ', moderate: 'Tuyết rơi vừa', heavy: 'Tuyết rơi dày' }[state.precip?.level] || 'Tuyết';
  if (state.reported === 'thunder') return 'Dông';
  if (state.reported === 'fog') return 'Sương mù';
  if (state.code === 1) return 'Ít mây';
  return CONDITION_LABEL[state.reported] || '';
}

export const CONDITION_LABEL = {
  clear: 'Trời quang',
  partly: 'Có mây rải rác',
  mostly: 'Nhiều mây',
  overcast: 'Trời u ám',
  rain: 'Mưa',
  thunder: 'Dông',
  snow: 'Tuyết',
  fog: 'Sương mù',
};
