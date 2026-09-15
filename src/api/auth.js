import { api } from './client.js';

export function registerAccount(payload) {
  return api.post('/Auth/register', payload);
}

export function loginAccount(payload) {
  return api.post('/Auth/login', payload);
}

export function verifyEmail(payload) {
  return api.post('/Auth/verify-email', payload);
}

export function updateEmail(userId, payload) {
  return api.put(`/Auth/update-email/${userId}`, payload);
}

export function changePassword(userId, payload) {
  return api.post(`/Auth/change-password/${userId}`, payload);
}

export function homePathForRole(role) {
  switch ((role || '').toLowerCase()) {
    case 'admin':
      return '/admin';
    case 'contentauthor':
      return '/cms-studio';
    case 'consultant':
      return '/consultant-overview';
    default:
      return '/app';
  }
}

export function learnerHomePath(profile, role) {
  if ((role || '').toLowerCase() !== 'learner') {
    return homePathForRole(role);
  }
  if (!profile?.targetJlptLevelId) {
    return '/onboarding';
  }
  return '/app';
}
