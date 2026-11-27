const env = import.meta.env || {};

function normalizeApiBase(rawValue) {
  const trimmed = String(rawValue || '').trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : '';
}

function normalizeHubOverride(rawValue) {
  const trimmed = String(rawValue || '').trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : '';
}

const configuredApiBase = normalizeApiBase(env.VITE_API_BASE);
const isProductionBuild = Boolean(env.PROD);

export const apiBase = configuredApiBase || '/api';

export const hasExplicitProductionApiBase = !isProductionBuild || Boolean(configuredApiBase);

function backendOrigin() {
  if (configuredApiBase) {
    return /^https?:\/\//i.test(configuredApiBase)
      ? configuredApiBase.replace(/\/api\/?$/, '')
      : '';
  }
  return '';
}

if (
  isProductionBuild
  && !configuredApiBase
  && typeof window !== 'undefined'
  && window.location.hostname.endsWith('vercel.app')
) {
  console.warn(
    '[RikiPath] VITE_API_BASE is not configured for this production deployment; API requests will use same-origin /api.'
  );
}

export function hubEndpoint(path) {
  const overrides = {
    '/hubs/mentor-meeting': normalizeHubOverride(env.VITE_HUB_URL || env.VITE_SIGNALR_HUB),
    '/hubs/notification': normalizeHubOverride(env.VITE_NOTIFICATION_HUB),
  };
  if (overrides[path]) return overrides[path];
  const origin = backendOrigin();
  return origin ? `${origin}${path}` : path;
}

export const hubUrl = hubEndpoint('/hubs/mentor-meeting');
