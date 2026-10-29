const env = import.meta.env;
const LOCAL_HTTPS = 'https://localhost:7237';

function isVercelHost() {
  return typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
}

export const apiBase = env.VITE_API_BASE || (isVercelHost() ? `${LOCAL_HTTPS}/api` : '/api');
export const hubUrl = env.VITE_HUB_URL || (isVercelHost() ? `${LOCAL_HTTPS}/hubs/mentor-meeting` : '/hubs/mentor-meeting');
