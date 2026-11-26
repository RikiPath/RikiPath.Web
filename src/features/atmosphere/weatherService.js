// Open-Meteo client (no API key). Called directly from the browser with plain fetch — never through the
// RikiPath API client, so no auth token or user data is sent. Only coarse coordinates / a typed city name leave the device.
// Terms: Open-Meteo's free API is for non-commercial use (< 10 000 calls/day); a commercial deployment needs
// an Open-Meteo API subscription (set VITE_OPEN_METEO_* below) or another provider behind the same functions.
import { coarsen } from './atmosphereLogic.js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const FORECAST_URL = env.VITE_OPEN_METEO_FORECAST_URL || 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = env.VITE_OPEN_METEO_GEOCODE_URL || 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_GEOCODE_URL = env.VITE_REVERSE_GEOCODE_URL || 'https://api.bigdatacloud.net/data/reverse-geocode-client';
const IP_GEO_PRIMARY_URL = env.VITE_IP_GEO_URL || 'https://get.geojs.io/v1/ip/geo.json';
const IP_GEO_FALLBACK_URL = 'https://ipwho.is/';

function withTimeoutSignal(externalSignal, ms = 7_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), ms);
  const onAbort = () => controller.abort(externalSignal?.reason);
  externalSignal?.addEventListener?.('abort', onAbort, { once: true });
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener?.('abort', onAbort);
    },
  };
}

async function getJson(url, signal) {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error(`Weather service HTTP ${res.status}`);
  return res.json();
}

/** Current conditions for a location; throws on any malformed payload (callers then keep the illustrated sky). */
export async function fetchCurrentWeather({ latitude, longitude }, signal) {
  const lat = coarsen(latitude, 2);
  const lon = coarsen(longitude, 2);
  if (lat === null || lon === null) throw new Error('Missing coordinates');
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,weather_code,cloud_cover,is_day,precipitation,rain,showers,snowfall,wind_speed_10m,wind_direction_10m',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
  });
  return parseCurrentWeather(await getJson(`${FORECAST_URL}?${params}`, signal));
}

const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Keeps only the fields the provider actually returned (missing → null; nothing is filled in). */
export function parseCurrentWeather(json) {
  const c = json?.current;
  const temperature = num(c?.temperature_2m);
  const weatherCode = num(c?.weather_code);
  if (!c || temperature === null || weatherCode === null) throw new Error('Unexpected weather payload');
  return {
    temperature,
    weatherCode,
    cloudCover: num(c.cloud_cover),
    humidity: num(c.relative_humidity_2m),
    isDay: c.is_day === 1 || c.is_day === true ? true : c.is_day === 0 || c.is_day === false ? false : undefined,
    precipitation: num(c.precipitation),
    rain: num(c.rain),
    showers: num(c.showers),
    snowfall: num(c.snowfall),
    windSpeed: num(c.wind_speed_10m),
    windDirection: num(c.wind_direction_10m),
    timezone: typeof json.timezone === 'string' ? json.timezone : '',
    // Provider time is local wall-clock time of the place (timezone=auto), e.g. "2026-11-24T15:30".
    observedAt: typeof c.time === 'string' ? c.time : '',
  };
}

/** City search (manual location). */
export async function searchCities(query, signal, language = 'vi') {
  const name = String(query || '').trim();
  if (name.length < 2) return [];
  const params = new URLSearchParams({ name: name.slice(0, 80), count: '6', language, format: 'json' });
  const json = await getJson(`${GEOCODE_URL}?${params}`, signal);
  return (Array.isArray(json?.results) ? json.results : [])
    .filter((r) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)))
    .map((r) => ({
      id: r.id ?? `${r.latitude},${r.longitude}`,
      name: String(r.name || ''),
      region: r.admin1 ? String(r.admin1) : '',
      country: r.country ? String(r.country) : '',
      latitude: coarsen(r.latitude, 2),
      longitude: coarsen(r.longitude, 2),
      timezone: r.timezone ? String(r.timezone) : '',
      source: 'search',
    }));
}

/**
 * Resolves coarse (~11 km) coordinates into a readable city/country label.
 * Best-effort only: returns null on network error or offline so callers can fall back cleanly.
 */
export async function reverseGeocode(latitude, longitude, signal, language = 'vi') {
  const lat = coarsen(latitude, 1);
  const lon = coarsen(longitude, 1);
  if (lat === null || lon === null) return null;
  const { signal: timedSignal, cleanup } = withTimeoutSignal(signal, 5_000);
  try {
    const lang = String(language || 'vi').toLowerCase().startsWith('ja') ? 'ja' : 'vi';
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      localityLanguage: lang,
    });
    const json = await getJson(`${REVERSE_GEOCODE_URL}?${params}`, timedSignal);
    const city = String(json?.city || json?.locality || json?.principalSubdivision || '').trim();
    const region = String(json?.principalSubdivision || '').trim();
    const country = String(json?.countryName || '').trim();
    if (!city && !country) return null;
    return {
      name: city || region || country,
      region: region && region !== city ? region : '',
      country,
    };
  } catch {
    return null;
  } finally {
    cleanup();
  }
}

/**
 * Coarse city-level network/IP location fallback when browser GPS is blocked, denied,
 * unsupported, or unavailable (e.g., Windows location services disabled or insecure LAN origin).
 * Uses keyless CORS-enabled providers with credentials omitted and rounds coordinates to ~11 km.
 */
export async function detectApproximateLocation(signal, language = 'vi') {
  const providers = [
    async (s) => {
      const json = await getJson(IP_GEO_PRIMARY_URL, s);
      const latitude = coarsen(json?.latitude, 1);
      const longitude = coarsen(json?.longitude, 1);
      if (latitude === null || longitude === null) return null;
      return {
        name: String(json?.city || json?.region || '').trim(),
        region: String(json?.region || '').trim(),
        country: String(json?.country || '').trim(),
        latitude,
        longitude,
        timezone: typeof json?.timezone === 'string' ? json.timezone : '',
        source: 'ip',
      };
    },
    async (s) => {
      const json = await getJson(IP_GEO_FALLBACK_URL, s);
      if (json?.success === false) return null;
      const latitude = coarsen(json?.latitude, 1);
      const longitude = coarsen(json?.longitude, 1);
      if (latitude === null || longitude === null) return null;
      return {
        name: String(json?.city || json?.region || '').trim(),
        region: String(json?.region || '').trim(),
        country: String(json?.country || '').trim(),
        latitude,
        longitude,
        timezone: typeof json?.timezone?.id === 'string' ? json.timezone.id : '',
        source: 'ip',
      };
    },
  ];

  for (const runProvider of providers) {
    const { signal: timedSignal, cleanup } = withTimeoutSignal(signal, 6_000);
    try {
      const base = await runProvider(timedSignal);
      if (!base) continue;
      const localized = await reverseGeocode(base.latitude, base.longitude, signal, language);
      const name = localized?.name || base.name || base.region || base.country;
      const region = localized ? localized.region : (base.region && base.region !== name ? base.region : '');
      const country = localized?.country || base.country;
      const timezone = base.timezone || (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        } catch {
          return '';
        }
      })();
      return {
        ...base,
        name: name || 'Vị trí hiện tại',
        region,
        country,
        timezone,
      };
    } catch {
      // Try next provider
    } finally {
      cleanup();
    }
  }
  return null;
}
