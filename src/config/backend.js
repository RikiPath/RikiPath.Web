const env = import.meta.env;

export const apiBase = env.VITE_API_BASE || '/api';
export const hubUrl = env.VITE_HUB_URL || '/hubs/mentor-meeting';
