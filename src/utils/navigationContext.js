/**
 * Shared Context-Aware Navigation, Safe Return Routing, Filter/Scroll Restoration & Global Unsaved Guard Registry.
 */

const LIST_STATE_KEY = 'rp.nav.listState.v1';
const RESTORE_SCROLL_KEY = 'rp.nav.restoreScroll.v1';

const AUTH_ROUTES = new Set([
  '/auth',
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
]);

function normalizePathname(pathname) {
  const raw = String(pathname || '').trim();
  if (!raw) return '/';
  if (raw === '/') return '/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

/**
 * Validates that a candidate navigation target is a safe same-origin RikiPath path.
 * Blocks open redirects (`http:`, `//`, `javascript:`), auth loops, and identical-route self-loops.
 */
export function isSafeInternalPath(candidate) {
  if (!candidate || typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;

  const [pathOnly] = trimmed.split(/[?#]/);
  const cleanPath = pathOnly.replace(/\/+$/, '') || '/';
  if (AUTH_ROUTES.has(cleanPath)) return false;
  return true;
}

export function buildFullPath(pathname, search = '', hash = '') {
  return `${normalizePathname(pathname)}${search || ''}${hash || ''}`;
}

/**
 * Captures the originating location before navigating into a Detail / Result / Review / Editor page.
 */
export function captureNavigationOrigin(location, { backLabel, label } = {}) {
  if (!location?.pathname) return null;
  const to = buildFullPath(location.pathname, location.search);
  if (!isSafeInternalPath(to)) return null;
  return {
    to,
    pathname: normalizePathname(location.pathname),
    search: location.search || '',
    backLabel: backLabel || label || null,
  };
}

/**
 * Resolves a context-aware back destination without ever blindly relying on `navigate(-1)`.
 * Priority: explicit `to` > validated `location.state.navigationOrigin` > validated `?returnTo` / `?from` > `fallbackTo`.
 */
export function resolveBackTarget(location, { explicitTo, fallbackTo = '/', fallbackLabel = 'Quay lại', defaultOriginLabel } = {}) {
  const currentFull = location?.pathname ? buildFullPath(location.pathname, location.search) : null;

  if (explicitTo && isSafeInternalPath(explicitTo) && explicitTo !== currentFull) {
    return {
      to: explicitTo,
      label: fallbackLabel,
      fromOrigin: false,
    };
  }

  const origin = location?.state?.navigationOrigin;
  if (origin?.to && isSafeInternalPath(origin.to) && origin.to !== currentFull) {
    return {
      to: origin.to,
      label: origin.backLabel || defaultOriginLabel || fallbackLabel,
      fromOrigin: true,
    };
  }

  if (location?.search) {
    const params = new URLSearchParams(location.search);
    const candidate = params.get('returnTo');
    if (candidate && isSafeInternalPath(candidate) && candidate !== currentFull) {
      return {
        to: candidate,
        label: defaultOriginLabel || fallbackLabel,
        fromOrigin: true,
      };
    }
  }

  const safeFallback = isSafeInternalPath(fallbackTo) ? fallbackTo : '/';
  return {
    to: safeFallback,
    label: fallbackLabel,
    fromOrigin: false,
  };
}

/* ------------------------------------------------------------------ List Filter & Scroll Persistence */

function readStorageMap(key) {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorageMap(key, map) {
  try {
    const entries = Object.entries(map).slice(-24);
    window.sessionStorage.setItem(key, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignore storage quota/privacy failures
  }
}

export function saveListViewState(listKey, state) {
  if (typeof window === 'undefined' || !listKey) return;
  const map = readStorageMap(LIST_STATE_KEY);
  map[listKey] = {
    ...(state || {}),
    savedAt: Date.now(),
  };
  writeStorageMap(LIST_STATE_KEY, map);
}

export function readListViewState(listKey) {
  if (typeof window === 'undefined' || !listKey) return null;
  const map = readStorageMap(LIST_STATE_KEY);
  return map[listKey] ?? null;
}

export function markPendingScrollRestore(routeTo, scrollTop) {
  if (typeof window === 'undefined' || !routeTo) return;
  try {
    window.sessionStorage.setItem(
      RESTORE_SCROLL_KEY,
      JSON.stringify({
        routeTo,
        scrollTop: Math.max(0, Number(scrollTop) || 0),
        ts: Date.now(),
      }),
    );
  } catch {
    // Ignore storage failures
  }
}

export function consumePendingScrollRestore(pathname, search = '') {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(RESTORE_SCROLL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - Number(parsed.ts || 0) > 5 * 60_000) {
      window.sessionStorage.removeItem(RESTORE_SCROLL_KEY);
      return null;
    }
    const targetPath = normalizePathname(pathname);
    const fullCurrent = buildFullPath(pathname, search);
    const savedBase = normalizePathname(String(parsed.routeTo || '').split('?')[0]);
    if (parsed.routeTo === fullCurrent || savedBase === targetPath) {
      window.sessionStorage.removeItem(RESTORE_SCROLL_KEY);
      return Math.max(0, Number(parsed.scrollTop) || 0);
    }
    return null;
  } catch {
    return null;
  }
}

export function captureMainScrollTop() {
  if (typeof document === 'undefined') return 0;
  const main = document.getElementById('rp-main');
  return main ? Math.max(0, Math.round(main.scrollTop)) : Math.max(0, Math.round(window.scrollY || 0));
}

/* ------------------------------------------------------------------ Global Navigation Guard Registry */

const activeGuards = new Set();

/**
 * Registers an async confirm-leave callback (`() => Promise<boolean>`) while an active exam, practice,
 * or dirty form is mounted. Used automatically by `useUnsavedGuard`, `<BackButton>`, and Header `<Breadcrumb>`.
 */
export function registerNavigationGuard(guardFn) {
  if (typeof guardFn !== 'function') return () => {};
  activeGuards.add(guardFn);
  return () => {
    activeGuards.delete(guardFn);
  };
}

export function hasActiveNavigationGuards() {
  return activeGuards.size > 0;
}

export async function confirmActiveNavigationGuards() {
  if (activeGuards.size === 0) return true;
  for (const guardFn of [...activeGuards]) {
    const allowed = await guardFn();
    if (!allowed) return false;
  }
  return true;
}
