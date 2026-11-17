const env = import.meta.env || {};
const PUBLIC_API = 'https://fact-like-tracy-displays.trycloudflare.com';

function isVercelHost() {
  return typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
}

export const apiBase = env.VITE_API_BASE || (isVercelHost() ? `${PUBLIC_API}/api` : '/api');

function backendOrigin() {
  if (env.VITE_API_BASE) return String(env.VITE_API_BASE).replace(/\/api\/?$/, '');
  if (isVercelHost()) return PUBLIC_API;
  return '';
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
