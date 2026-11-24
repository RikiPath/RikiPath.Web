// Shared weather icon resolver: weather data + local light → one semantic icon key (no React, no icon library).
// Rules: the reported condition decides the main icon; day/night only picks the variant; sunrise/sunset is
// time context for clear skies only; wind is a supplement (the provider has no "windy" condition); without
// verified data only time-of-day icons are used.

export const WEATHER_ICON_KEYS = [
  'sun', 'cloud-sun', 'cloud-moon', 'cloud', 'cloudy', 'drizzle', 'rain', 'rain-wind',
  'thunder', 'snow', 'fog', 'moon-star', 'sunrise', 'sunset', 'off',
];

/** Semantic colour family per icon (CSS maps tone → colour; Sakura Pink stays for interactive state). */
export const ICON_TONE = {
  sun: 'sun',
  sunrise: 'dawn',
  sunset: 'dawn',
  'cloud-sun': 'sun-cloud',
  'cloud-moon': 'night',
  'moon-star': 'night',
  cloud: 'cloud',
  cloudy: 'cloud',
  fog: 'cloud',
  drizzle: 'rain',
  rain: 'rain',
  'rain-wind': 'rain',
  snow: 'snow',
  thunder: 'storm',
  off: 'muted',
};

/** Vietnamese source labels (translated with tr()). */
export const ICON_LABEL = {
  sun: 'Trời quang',
  'cloud-sun': 'Nắng có mây',
  'cloud-moon': 'Ít mây ban đêm',
  cloud: 'Nhiều mây',
  cloudy: 'Trời u ám',
  drizzle: 'Mưa phùn',
  rain: 'Mưa',
  'rain-wind': 'Mưa lớn kèm gió',
  thunder: 'Dông',
  snow: 'Tuyết',
  fog: 'Sương mù',
  'moon-star': 'Đêm quang',
  sunrise: 'Bình minh',
  sunset: 'Hoàng hôn',
  off: 'Đã tắt hiệu ứng',
};

const DRIZZLE_CODES = new Set([51, 53, 55, 56, 57]);

/** Time-of-day icon (no weather claim). `lightPhase`: night | twilight | golden | day. */
export function timeOfDayIcon({ lightPhase, afternoon = false, isDay } = {}) {
  const day = typeof isDay === 'boolean' ? isDay : lightPhase !== 'night';
  if (!day || lightPhase === 'night') return 'moon-star';
  if (lightPhase === 'twilight' || lightPhase === 'golden') return afternoon ? 'sunset' : 'sunrise';
  return 'sun';
}

/**
 * @param {{
 *   displayMode: 'weather'|'sky'|'off',
 *   condition?: string|null,        // visual condition from classifyWeather (null when no verified data)
 *   weatherCode?: number|null,      // WMO code, used only to tell drizzle from rain
 *   cloudCover?: number|null,
 *   precipitation?: { kind: 'rain'|'snow', level: 'light'|'moderate'|'heavy' }|null,
 *   windSpeed?: number|null,        // km/h
 *   isDay?: boolean|null,           // provider flag when available
 *   lightPhase?: string,            // from the sun's elevation
 *   afternoon?: boolean,
 * }} input
 * @returns {{ key: string, tone: string, label: string, supplement: 'wind'|null, verified: boolean }}
 */
export function resolveWeatherIcon(input = {}) {
  const { displayMode = 'sky', condition = null, weatherCode = null, cloudCover = null, precipitation = null, windSpeed = null, isDay = null, lightPhase = 'day', afternoon = false } = input;
  const out = (key, supplement = null, verified = false) => ({ key, tone: ICON_TONE[key], label: ICON_LABEL[key], supplement, verified });
  if (displayMode === 'off') return out('off');
  const day = typeof isDay === 'boolean' ? isDay : lightPhase !== 'night' && lightPhase !== 'twilight';
  const verified = displayMode === 'weather' && Boolean(condition);
  if (!verified) return out(timeOfDayIcon({ lightPhase, afternoon, isDay: lightPhase !== 'night' }));

  const speed = Number.isFinite(windSpeed) ? windSpeed : null;
  const windy = speed !== null && speed >= 30;
  const wind = windy ? 'wind' : null;
  switch (condition) {
    case 'thunder':
      return out('thunder', wind, true);
    case 'snow':
      return out('snow', wind, true);
    case 'rain':
      if (DRIZZLE_CODES.has(Number(weatherCode))) return out('drizzle', wind, true);
      if (precipitation?.level === 'heavy' && windy) return out('rain-wind', null, true);
      return out('rain', wind, true);
    case 'fog':
      return out('fog', wind, true);
    case 'overcast':
      return out('cloudy', wind, true);
    case 'mostly':
      return out(Number(cloudCover) >= 86 ? 'cloudy' : 'cloud', wind, true);
    case 'partly':
      return out(day ? 'cloud-sun' : 'cloud-moon', wind, true);
    case 'clear':
      if (!day) return out(Number(cloudCover) > 20 ? 'cloud-moon' : 'moon-star', wind, true);
      if (lightPhase === 'golden' || lightPhase === 'twilight') return out(afternoon ? 'sunset' : 'sunrise', wind, true);
      return out(Number(cloudCover) > 20 ? 'cloud-sun' : 'sun', wind, true);
    default:
      return out(timeOfDayIcon({ lightPhase, afternoon }));
  }
}

/** Convenience: icon for a resolved scene (header chip, popover swatch). */
export function iconForScene(scene, displayMode = scene?.mode) {
  if (!scene || scene.off || displayMode === 'off') return resolveWeatherIcon({ displayMode: 'off' });
  const w = scene.live ? scene.weather : null;
  return resolveWeatherIcon({
    displayMode,
    condition: w?.condition ?? null,
    weatherCode: w?.code ?? null,
    cloudCover: w?.cloudCover ?? null,
    precipitation: w?.precip ?? null,
    windSpeed: w?.wind?.speed ?? null,
    isDay: w?.isDay ?? null,
    lightPhase: scene.solar?.phase,
    afternoon: scene.solar?.afternoon,
  });
}

/**
 * Icons for the three display-mode choices, so each option shows what it would draw right now:
 * weather → the verified condition (or a neutral sun/moon-with-cloud glyph when no data yet, never rain/snow);
 * sky → time-of-day only; off → CloudOff.
 */
export function modeIcons(scene) {
  const solar = scene?.solar || {};
  const time = { lightPhase: solar.phase || 'day', afternoon: Boolean(solar.afternoon) };
  const day = time.lightPhase !== 'night' && time.lightPhase !== 'twilight';
  const neutral = day ? 'cloud-sun' : 'cloud-moon';
  const weather = scene?.live ? iconForScene(scene, 'weather') : { key: neutral, tone: ICON_TONE[neutral], label: ICON_LABEL[neutral], supplement: null, verified: false };
  const sky = resolveWeatherIcon({ displayMode: 'sky', ...time });
  return { weather, sky, off: resolveWeatherIcon({ displayMode: 'off' }) };
}
