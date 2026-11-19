// Shared atmosphere state: one preference store (localStorage, validated), one cached weather query,
// one minute-resolution clock that stops while the tab is hidden. No per-frame React state.
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_PREFS,
  WEATHER_REFRESH_MS,
  WEATHER_STALE_MS,
  deriveScene,
  roleDecoration,
  sanitizePrefs,
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
    if (entry?.key === key && Date.now() - entry.at < WEATHER_STALE_MS) return entry;
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
  const seed = enabled ? readWeatherCache(key) : null;
  return useQuery({
    queryKey: ['atmosphere-weather', key],
    enabled,
    queryFn: async ({ signal }) => {
      const data = await fetchCurrentWeather(loc, signal);
      writeWeatherCache(key, data);
      return data;
    },
    initialData: seed?.data,
    initialDataUpdatedAt: seed?.at,
    staleTime: WEATHER_STALE_MS,
    gcTime: 2 * WEATHER_REFRESH_MS,
    refetchInterval: enabled ? WEATHER_REFRESH_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: 1,
    meta: { silent: true },
  });
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

export function useAtmosphere(roleKey = 'Learner') {
  const [prefs, setPrefs] = useWeatherPreferences();
  const now = useMinuteClock();
  const weatherQuery = useLiveWeather(prefs);
  const reducedMotion = usePrefersReducedMotion();
  const weather = prefs.mode === 'weather' && weatherQuery.isSuccess ? weatherQuery.data : null;
  const scene = useMemo(() => deriveScene({ mode: prefs.mode, weather, now }), [prefs.mode, weather, now]);
  return {
    prefs,
    setPrefs,
    scene,
    weather,
    weatherStatus: prefs.mode !== 'weather' ? 'disabled' : !prefs.location ? 'no-location' : weatherQuery.isError && !weather ? 'error' : weather ? 'ready' : 'loading',
    refetchWeather: weatherQuery.refetch,
    decoration: roleDecoration(roleKey),
    effectiveIntensity: isLowPowerDevice() ? 'low' : prefs.intensity,
    reducedMotion,
  };
}

export const __testing = { PREFS_KEY, resetCache: () => { cached = null; } };
