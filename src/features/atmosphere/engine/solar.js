// Solar & lunar geometry (pure, no network). Accuracy ≈ 0.1° / ±1–2 min — plenty for a decorative sky,
// and it lets "Chỉ bầu trời" follow the real sunrise/sunset of the chosen place without calling a weather API.
const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const norm360 = (v) => ((v % 360) + 360) % 360;
const norm180 = (v) => ((((v + 180) % 360) + 360) % 360) - 180;

const julianDay = (date) => date.getTime() / DAY_MS + 2440587.5;

/** Sun declination (°), right ascension (°) and equation of time (minutes) for an instant. */
function sunCoordinates(date) {
  const n = julianDay(date) - 2451545.0;
  const L = norm360(280.46 + 0.9856474 * n);
  const g = norm360(357.528 + 0.9856003 * n) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;
  const ra = norm360(Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / RAD);
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda)) / RAD;
  const eot = 4 * norm180(L - ra);
  return { n, ra, dec, eot };
}

/**
 * Sun position for a place and instant.
 * @returns {{ elevation: number, azimuth: number, hourAngle: number }} degrees; hourAngle < 0 before solar noon.
 */
export function solarPosition(date, latitude, longitude) {
  const { n, ra, dec } = sunCoordinates(date);
  const gmstHours = (((18.697374558 + 24.06570982441908 * n) % 24) + 24) % 24;
  const hourAngle = norm180(gmstHours * 15 + longitude - ra);
  const lat = latitude * RAD;
  const d = dec * RAD;
  const h = hourAngle * RAD;
  const elevation = Math.asin(Math.sin(lat) * Math.sin(d) + Math.cos(lat) * Math.cos(d) * Math.cos(h)) / RAD;
  const azimuth = norm360(Math.atan2(-Math.sin(h), Math.tan(d) * Math.cos(lat) - Math.sin(lat) * Math.cos(h)) / RAD);
  return { elevation, azimuth, hourAngle };
}

/**
 * Sunrise / solar noon / sunset (as Date) of the local solar day containing `date`.
 * Polar day/night return null sunrise/sunset with `polar` set.
 */
export function sunTimes(date, latitude, longitude) {
  const localSolar = new Date(date.getTime() + (longitude / 15) * 3_600_000);
  const approxNoon = Date.UTC(localSolar.getUTCFullYear(), localSolar.getUTCMonth(), localSolar.getUTCDate(), 12) - (longitude / 15) * 3_600_000;
  const { dec, eot } = sunCoordinates(new Date(approxNoon));
  const solarNoon = new Date(approxNoon - eot * 60_000);
  const lat = latitude * RAD;
  const d = dec * RAD;
  const cosH0 = (Math.sin(-0.833 * RAD) - Math.sin(lat) * Math.sin(d)) / (Math.cos(lat) * Math.cos(d));
  if (cosH0 > 1) return { sunrise: null, sunset: null, solarNoon, polar: 'night' };
  if (cosH0 < -1) return { sunrise: null, sunset: null, solarNoon, polar: 'day' };
  const halfDayMs = (Math.acos(cosH0) / RAD / 15) * 3_600_000;
  return { sunrise: new Date(solarNoon.getTime() - halfDayMs), sunset: new Date(solarNoon.getTime() + halfDayMs), solarNoon, polar: null };
}

/** Moon phase: 0 = new, 0.5 = full; illumination 0..1 (mean synodic month, ±~0.5 day). */
export function moonPhase(date) {
  const synodic = 29.530588853;
  const phase = ((((julianDay(date) - 2451550.1) / synodic) % 1) + 1) % 1;
  return { phase, illumination: (1 - Math.cos(2 * Math.PI * phase)) / 2 };
}

/**
 * Fallback curve when no coordinates are known at all: a symmetric 06:00 → 18:00 day on the local clock.
 * Only used for the illustration; never presented as the real sun position of a place.
 */
export function syntheticSolar(hour, minute = 0) {
  const t = hour + minute / 60;
  return { elevation: 58 * Math.sin((2 * Math.PI * (t - 6)) / 24), azimuth: 180, hourAngle: norm180((t - 12) * 15) };
}
