// Scene composition: place & zone → sun/moon → reported weather → clouds/precipitation → wind → season.
// Pure function of its inputs (no clock reads, no randomness) so the same inputs always draw the same sky.
import { moonPhase, solarPosition, sunTimes, syntheticSolar } from './solar.js';
import { ZONE_ANCHORS, deviceTimeZone, isValidTimeZone, periodForTime, zonedParts } from './timeOfDay.js';
import { classifyWeather } from './weatherCondition.js';
import { seasonalContext } from './season.js';
import { skyPalette } from './palette.js';
import { DENSITY_MOOD, cloudDensity } from './clouds.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/** Coordinates + zone used for the sky, with where they came from. */
export function resolvePlace(location, weatherTimeZone, deviceZone = deviceTimeZone()) {
  if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
    const zone = [location.timezone, weatherTimeZone, location.source === 'device' ? deviceZone : ''].find(isValidTimeZone) || '';
    return { source: 'location', latitude: location.latitude, longitude: location.longitude, timeZone: zone, name: location.name, region: location.region || '', country: location.country || '' };
  }
  const anchor = ZONE_ANCHORS[deviceZone];
  if (anchor) return { source: 'zone', latitude: anchor[0], longitude: anchor[1], timeZone: deviceZone, name: '', region: '', country: '' };
  return { source: 'none', latitude: null, longitude: null, timeZone: isValidTimeZone(deviceZone) ? deviceZone : '', name: '', region: '', country: '' };
}

const PRECIP_VEIL = {
  rain: { light: 0.62, moderate: 0.76, heavy: 0.88 },
  snow: { light: 0.58, moderate: 0.68, heavy: 0.8 },
};

/**
 * The original RikiPath sky is the base layer: four painted periods (morning / afternoon / evening / night) and
 * seven weather veils. The engine only chooses which original scene to show; it never replaces those gradients.
 */
export function visualPeriod({ phase, afternoon, period }) {
  if (phase === 'night') return 'night';
  if (phase === 'twilight' || phase === 'golden') return afternoon ? 'evening' : 'morning';
  return !afternoon && period === 'morning' ? 'morning' : 'afternoon';
}

export function visualCondition(condition) {
  if (condition === 'mostly' || condition === 'overcast') return 'cloudy';
  return condition || 'clear';
}

/** Original readability rule: dark header palette at night, in storms, and on rainy/cloudy evenings. */
export function originalTone(period, condition) {
  return period === 'night' || condition === 'thunder' || (period === 'evening' && (condition === 'rain' || condition === 'cloudy')) ? 'dark' : 'light';
}

// Sun & moon positions are a 0..1 progress across the header's open band (measured in the DOM between the end of
// the breadcrumb and the search field), so they never sit on the logo, search, notifications or the user menu.

/** Light phase from the sun's elevation (civil twilight ends at −6°). */
export function lightPhase(elevation) {
  if (elevation < -6) return 'night';
  if (elevation < -0.833) return 'twilight';
  if (elevation < 8) return 'golden';
  return 'day';
}

/**
 * @param {{ mode: 'weather'|'sky'|'off', location: object|null, weather: object|null, seasonal?: 'auto'|'on'|'off',
 *           now: Date, deviceZone?: string, simulated?: boolean }} input
 */
export function resolveScene({ mode, location, weather, seasonal = 'auto', now, deviceZone = deviceTimeZone(), simulated = false }) {
  const useWeather = mode === 'weather' ? classifyWeather(weather) : null;
  const place = resolvePlace(location, weather?.timezone, deviceZone);
  const local = zonedParts(now, place.timeZone);
  const period = periodForTime(local.hour, local.minute);

  const hasCoords = place.latitude !== null;
  const solar = hasCoords ? solarPosition(now, place.latitude, place.longitude) : syntheticSolar(local.hour, local.minute);
  const times = hasCoords ? sunTimes(now, place.latitude, place.longitude) : { sunrise: null, sunset: null, solarNoon: null, polar: null };
  const elevation = solar.elevation;
  const afternoon = solar.hourAngle > 0;
  const phase = lightPhase(elevation);
  const moon = moonPhase(now);

  // Off: static header, no animation inputs — only the light phase (used to label/illustrate the mode choices).
  if (mode === 'off') {
    return { mode, off: true, at: now, period, place, local, solar: { elevation: round(elevation, 1), afternoon, phase, ...times, estimated: !hasCoords }, visual: { period: visualPeriod({ phase, afternoon, period }), condition: 'clear' }, isDark: false, condition: 'clear', live: false, simulated };
  }

  const condition = useWeather ? useWeather.condition : 'clear';
  const precip = useWeather ? useWeather.precip : null;
  // "Chỉ bầu trời" keeps a light, illustrative cloud amount; it never implies real cloud cover.
  const cover = useWeather ? useWeather.visualCover : 22;
  const cloudFraction = useWeather ? useWeather.cloudFraction : 0.3;

  let overcast = clamp01((cover - 35) / 65) * 0.7;
  if (precip) overcast = Math.max(overcast, PRECIP_VEIL[precip.kind]?.[precip.level] ?? 0.6);
  if (condition === 'thunder') overcast = Math.max(overcast, 0.94);
  if (condition === 'fog') overcast = Math.max(overcast, 0.78);
  const veil = condition === 'thunder' ? 'thunder' : precip?.kind === 'rain' ? 'rain' : precip?.kind === 'snow' ? 'snow' : condition === 'fog' ? 'fog' : 'cloudy';
  const palette = skyPalette({ elevation, afternoon, overcast, veil });
  const vPeriod = visualPeriod({ phase, afternoon, period });
  const vCondition = visualCondition(condition);

  // Sun / moon / stars — never bright light in front of a storm deck, never clear stars under full cloud.
  const progress = (solar.hourAngle + 180) / 360; // 0 = solar midnight, 0.5 = solar noon
  let sunOpacity = clamp01((elevation + 1) / 4) * (1 - overcast * 0.95);
  if (condition === 'thunder') sunOpacity = 0;
  if (condition === 'fog') sunOpacity *= 0.45;
  const moonVisible = moon.illumination > 0.04;
  // Clearly visible whenever the sky allows it; thick cloud hides it (never a moon "through" an overcast deck).
  const moonOpacity = moonVisible ? clamp01((-2 - elevation) / 5) * clamp01(1 - Math.max(0, cover - 55) / 35) * (precip || condition === 'fog' ? 0.35 : 1) : 0;
  // Diffused light: when clouds hide the disc the glow still bleeds around them (softer, wider), except in storms.
  const daylight = clamp01((elevation + 1) / 4);
  const sunGlow = condition === 'thunder' ? 0 : daylight * (condition === 'fog' ? 0.45 : 1) * (1 - overcast * 0.45);
  const density = cloudDensity(cover, condition);
  const starsOpacity = clamp01((-4 - elevation) / 8) * (1 - clamp01((cover - 15) / 55)) * (condition === 'fog' ? 0.2 : 1);

  const wind = useWeather ? useWeather.wind : { speed: null, direction: null, x: 0.35, level: 'calm' };
  const season = seasonalContext({ latitude: place.latitude, month: local.month, dayOfYear: local.dayOfYear, pref: seasonal });

  // Weather outranks decoration: rain thins petals, heavier precipitation / storms / snow hide them.
  let decorationFactor = season.decoration ? 1 : 0;
  if (precip?.kind === 'rain') decorationFactor *= precip.level === 'light' ? 0.35 : 0;
  if (precip?.kind === 'snow' || condition === 'thunder') decorationFactor = 0;
  if (condition === 'fog') decorationFactor *= 0.5;
  if (phase === 'night') decorationFactor *= 0.6;

  return {
    mode,
    off: false,
    at: now,
    simulated,
    live: Boolean(useWeather),
    place,
    local,
    period,
    solar: { elevation: round(elevation, 1), azimuth: round(solar.azimuth, 1), afternoon, phase, ...times, estimated: !hasCoords },
    moon,
    weather: useWeather,
    condition,
    precip,
    cloudFraction: round(cloudFraction),
    overcast: round(overcast),
    wind,
    season,
    decoration: decorationFactor > 0 ? season.decoration : null,
    decorationFactor: round(decorationFactor),
    palette,
    visual: { period: vPeriod, condition: vCondition },
    isDark: originalTone(vPeriod, vCondition) === 'dark',
    // Day arc sunrise → sunset and night arc sunset → sunrise, each mapped onto the open band (0..1).
    sun: { p: round(clamp01((progress - 0.25) * 2)), y: Math.round(70 - 56 * clamp01(elevation / 35)), opacity: round(sunOpacity) },
    moonView: { p: round(clamp01(((progress + 0.25) % 1) * 2)), y: 24, opacity: round(moonOpacity), southern: (place.latitude ?? 1) < 0 },
    sunGlow: round(sunGlow),
    cloudDensity: density,
    mood: DENSITY_MOOD[density],
    starsOpacity: round(starsOpacity),
    fog: condition === 'fog' ? 1 : precip?.level === 'heavy' ? 0.3 : 0,
    lightning: condition === 'thunder',
  };
}
