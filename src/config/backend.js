const env = import.meta.env || {};

export function resolveApiBase(value) {
  return typeof value === 'string' && value.trim()
    ? value.trim().replace(/\/+$/, '')
    : '/api';
}

export const apiBase = resolveApiBase(env.VITE_API_BASE);

function backendOrigin() {
  return apiBase === '/api' ? '' : apiBase.replace(/\/api$/i, '');
}

export function hubEndpoint(path) {
  const overrides = {
    '/hubs/mentor-chat': env.VITE_MENTOR_CHAT_HUB,
    '/hubs/mentor-meeting': env.VITE_HUB_URL || env.VITE_SIGNALR_HUB,
    '/hubs/notification': env.VITE_NOTIFICATION_HUB,
  };
  if (overrides[path]) return overrides[path];
  const origin = backendOrigin();
  return origin ? `${origin}${path}` : path;
}

export const hubUrl = hubEndpoint('/hubs/mentor-meeting');
