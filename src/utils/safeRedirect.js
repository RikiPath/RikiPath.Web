// Prevents open redirects: only same-origin, app-relative paths are accepted
// as a post-login destination, and a destination outside the user's role
// falls back to that role's home.

const BLOCKED_PREFIXES = ['/auth', '/register', '/forgot-password', '/verify-email', '/reset-password'];

export function safeInternalPath(candidate) {
  if (typeof candidate !== 'string') return '';
  const value = candidate.trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '';
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(value)) return '';
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(value)) return '';
  const path = value.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (BLOCKED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return '';
  return value;
}

/** Resolves where to go after sign-in. `canAccess(path)` comes from the route role map. */
export function postLoginDestination(from, home, canAccess = () => true) {
  const path = safeInternalPath(from);
  if (!path || path === '/') return home;
  return canAccess(path) ? path : home;
}
