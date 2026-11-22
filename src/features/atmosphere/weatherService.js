// Open-Meteo client (no API key). Called directly from the browser with plain fetch — never through the
// RikiPath API client, so no auth token or user data is sent. Only coarse coordinates / a typed city name leave the device.
// Terms: Open-Meteo's free API is for non-commercial use (< 10 000 calls/day); a commercial deployment needs
// an Open-Meteo API subscription (set VITE_OPEN_METEO_* below) or another provider behind the same functions.
import { coarsen } from './atmosphereLogic.js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const FORECAST_URL = env.VITE_OPEN_METEO_FORECAST_URL || 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = env.VITE_OPEN_METEO_GEOCODE_URL || 'https://geocoding-api.open-meteo.com/v1/search';

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
    current: 'temperature_2m,weather_code,cloud_cover,is_day,precipitation,rain,snowfall',
    timezone: 'auto',
  });
  return parseCurrentWeather(await getJson(`${FORECAST_URL}?${params}`, signal));
}

export function parseCurrentWeather(json) {
  const c = json?.current;
  const temperature = Number(c?.temperature_2m);
  const weatherCode = Number(c?.weather_code);
  if (!c || !Number.isFinite(temperature) || !Number.isFinite(weatherCode)) throw new Error('Unexpected weather payload');
  return {
    temperature,
    weatherCode,
    cloudCover: Number.isFinite(Number(c.cloud_cover)) ? Number(c.cloud_cover) : null,
    isDay: c.is_day === 1 || c.is_day === true ? true : c.is_day === 0 || c.is_day === false ? false : undefined,
    precipitation: Number(c.precipitation) || 0,
    rain: Number(c.rain) || 0,
    snowfall: Number(c.snowfall) || 0,
    timezone: typeof json.timezone === 'string' ? json.timezone : '',
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
