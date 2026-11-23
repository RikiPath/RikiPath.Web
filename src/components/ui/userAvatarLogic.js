const SAFE_IMAGE_URL_RE = /^(https?:\/\/|\/(?!\/)|blob:|data:image\/(?:png|jpeg|jpg|webp|gif);base64,)/i;

const AVATAR_SIZE_PRESETS = Object.freeze({
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
  '2xl': 112,
});

export function normalizeAvatarUrl(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return SAFE_IMAGE_URL_RE.test(trimmed) ? trimmed : null;
}

export function isExternalAvatarUrl(url) {
  const normalized = normalizeAvatarUrl(url);
  if (!normalized || !/^https?:\/\//i.test(normalized)) return false;
  if (typeof window !== 'undefined' && window.location?.origin) {
    try {
      return new URL(normalized).origin !== window.location.origin;
    } catch {
      return true;
    }
  }
  return true;
}

export function resolveAvatarDimension(size = 40) {
  if (typeof size === 'string' && AVATAR_SIZE_PRESETS[size] != null) {
    return AVATAR_SIZE_PRESETS[size];
  }
  const num = Number(size);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : 40;
}

export function getAvatarInitials(name, fallback = '?') {
  const raw = String(name || '').trim();
  if (!raw) return fallback;

  // If only an email is available, derive initial from local-part rather than '@' domain
  const source = raw.includes('@') && !raw.includes(' ')
    ? raw.split('@')[0].replace(/[._-]+/g, ' ').trim()
    : raw;

  if (!source) return fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) {
    const firstChar = Array.from(parts[0])[0] || '';
    return firstChar ? firstChar.toLocaleUpperCase() : fallback;
  }

  const first = Array.from(parts[0])[0] || '';
  const last = Array.from(parts[parts.length - 1])[0] || '';
  return `${first}${last}`.toLocaleUpperCase() || fallback;
}
