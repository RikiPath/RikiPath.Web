// Shared atmosphere state: one preference store (localStorage, validated), one cached weather query,
// and one minute-resolution clock that stops while the tab is hidden. Simulated scenes exist only in tests.
// No per-frame React state; every role uses the same engine (no role-based effect policy).
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_PREFS,
  WEATHER_MAX_AGE_MS,
  WEATHER_REFRESH_MS,
  WEATHER_STALE_MS,
  resolveScene,
  sanitizePrefs,
  weatherFreshness,
} from './atmosphereLogic.js';
import { fetchCurrentWeather } from './weatherService.js';

const PREFS_KEY = 'rp.atmosphere.v1';
const WEATHER_CACHE_KEY = 'rp.atmosphere.weather.v1';

/* ------------------------------------------------------------ preference store */
const listeners = new Set();
let cached = null;

function storage(kind = 'localStorage') {
  try {
    return typeof window !== 'undefined' ? window[kind] : null;
  } catch {
    return null;
  }
}

export function readPrefs() {
  if (cached) return cached;
  let raw;
  try {
    raw = JSON.parse(storage()?.getItem(PREFS_KEY) || 'null');
  } catch {
    raw = null;
  }
  cached = sanitizePrefs(raw ?? DEFAULT_PREFS);
  return cached;
}

export function writePrefs(patch) {
  const next = sanitizePrefs({ ...readPrefs(), ...patch });
  cached = next;
  try {
    storage()?.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Preference only; keep it in memory when storage is blocked.
  }
  listeners.forEach((l) => l());
  return next;
}

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (e) => {
    if (e.key === PREFS_KEY) {
      cached = null;
      listener();
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

export function useWeatherPreferences() {
  const prefs = useSyncExternalStore(subscribe, readPrefs, () => DEFAULT_PREFS);
  const update = useCallback((patch) => writePrefs(patch), []);
  return [prefs, update];
}

/* ------------------------------------------------------------ clock */
function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = null;
    const tick = () => setNow(new Date());
    const start = () => {
      if (timer === null) timer = window.setInterval(tick, 60_000);
    };
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        tick();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return now;
}

/* ------------------------------------------------------------ weather (React Query + session cache) */
function weatherCacheKey(loc) {
  return loc ? `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)}` : '';
}

function readWeatherCache(key) {
  try {
    const entry = JSON.parse(storage('sessionStorage')?.getItem(WEATHER_CACHE_KEY) || 'null');
    // Restored only while still within the max age, so an old cache is never shown as current weather.
    if (entry?.key === key && Date.now() - entry.at < Math.min(WEATHER_MAX_AGE_MS, WEATHER_STALE_MS * 3)) return entry;
  } catch {
    // ignore
  }
  return null;
}

function writeWeatherCache(key, data) {
  try {
    storage('sessionStorage')?.setItem(WEATHER_CACHE_KEY, JSON.stringify({ key, at: Date.now(), data }));
  } catch {
    // ignore
  }
}

export function useLiveWeather(prefs) {
  const loc = prefs.location;
  const key = weatherCacheKey(loc);
  const enabled = prefs.mode === 'weather' && Boolean(loc);
  const seed = useMemo(() => (enabled ? readWeatherCache(key) : null), [enabled, key]);
  const query = useQuery({
    queryKey: ['atmosphere-weather', key],
    enabled,
    queryFn: async ({ signal }) => {
      const data = await fetchCurrentWeather(loc, signal);
      writeWeatherCache(key, data);
      return data;
    },
    initialData: seed?.key === key ? seed.data : undefined,
    initialDataUpdatedAt: seed?.key === key ? seed.at : undefined,
    staleTime: WEATHER_STALE_MS,
    gcTime: 2 * WEATHER_REFRESH_MS,
    refetchInterval: enabled ? WEATHER_REFRESH_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: 1,
    meta: { silent: true },
  });
  return { query, fromCache: Boolean(seed && seed.key === key && query.dataUpdatedAt === seed.at) };
}

/* ------------------------------------------------------------ public hook */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      mq?.addEventListener?.('change', cb);
      return () => mq?.removeEventListener?.('change', cb);
    },
    () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    () => false,
  );
}

/** Weak devices / data-saver get the lightest effect budget regardless of the chosen intensity. */
export function isLowPowerDevice(nav = typeof navigator !== 'undefined' ? navigator : undefined) {
  if (!nav) return false;
  return Boolean(
    (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2) ||
      (nav.deviceMemory && nav.deviceMemory <= 2) ||
      nav.connection?.saveData,
  );
}

export function useAtmosphere() {
  const [prefs, setPrefs] = useWeatherPreferences();
  const clock = useMinuteClock();
  const { query: weatherQuery, fromCache } = useLiveWeather(prefs);
  const reducedMotion = usePrefersReducedMotion();

  const updatedAt = weatherQuery.data ? weatherQuery.dataUpdatedAt : 0;
  const freshness = prefs.mode === 'weather' && weatherQuery.data ? weatherFreshness(updatedAt, fromCache, clock.getTime()) : 'unavailable';
  const realWeather = prefs.mode === 'weather' && weatherQuery.data && freshness !== 'expired' ? weatherQuery.data : null;

  // Device-located places have no zone until the provider reports one; remember it (zone name only).
  const loc = prefs.location;
  const reportedZone = weatherQuery.data?.timezone;
  useEffect(() => {
    if (loc && !loc.timezone && reportedZone) setPrefs({ location: { ...loc, timezone: reportedZone } });
  }, [loc, reportedZone, setPrefs]);

  const scene = useMemo(
    () => resolveScene({ mode: prefs.mode, location: prefs.location, weather: realWeather, seasonal: prefs.seasonal, now: clock }),
    [prefs.mode, prefs.location, prefs.seasonal, realWeather, clock],
  );

  let weatherStatus;
  if (prefs.mode !== 'weather') weatherStatus = 'disabled';
  else if (!prefs.location) weatherStatus = 'no-location';
  else if (weatherQuery.data && freshness === 'expired') weatherStatus = 'expired';
  else if (realWeather && scene.live) weatherStatus = 'ready';
  else if (weatherQuery.data && !scene.live) weatherStatus = 'unsupported';
  else if (weatherQuery.isError) weatherStatus = 'error';
  else weatherStatus = 'loading';

  const lowPower = isLowPowerDevice();
  return {
    prefs,
    setPrefs,
    scene,
    weather: realWeather,
    weatherStatus,
    freshness,
    updatedAt,
    refreshing: weatherQuery.isFetching,
    refetchWeather: weatherQuery.refetch,
    effectiveIntensity: lowPower ? 'low' : prefs.intensity,
    lowPower,
    reducedMotion,
  };
}

export const __testing = { PREFS_KEY, resetCache: () => { cached = null; } };
