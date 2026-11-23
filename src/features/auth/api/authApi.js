import { homeForRole } from '@/app/routes/routeTable.js';
import { api } from '@/api/client.js';

export function registerAccount(payload) {
  return api.post('/Auth/register', payload);
}

export function loginAccount(payload) {
  return api.post('/Auth/login', payload);
}

export function getGoogleAuthConfig() {
  return api.get('/Auth/google-config');
}

export function loginWithGoogle(payload) {
  return api.post('/Auth/google', payload);
}

export function continueWithGoogle(credential, currentPassword) {
  return api.post('/Auth/google', { credential, currentPassword });
}

export function verifyEmail(payload) {
  return api.post('/Auth/verify-email', payload);
}

export function verifyEmailByLink(token) {
  return api.post('/Auth/verify-email-link', { token });
}

export function resendVerificationEmail(email) {
  return api.post('/Auth/resend-verification-email', { email });
}

export function changeUnverifiedEmail(payload) {
  return api.post('/Auth/change-unverified-email', payload);
}

export function updateEmail(userId, payload) {
  return api.put(`/Auth/update-email/${userId}`, payload);
}

export function resendPendingEmail() {
  return api.post('/Auth/resend-pending-email', {});
}

export function getAuthMe() {
  return api.get('/Auth/me');
}

export function changePassword(userId, payload) {
  return api.post(`/Auth/change-password/${userId}`, payload);
}

export function setPassword(payload) {
  return api.post('/Auth/set-password', payload);
}

export function requestPasswordReset(email) {
  return api.post('/Auth/forgot-password', { email });
}

export function resetPassword(payload) {
  return api.post('/Auth/reset-password', payload);
}

export function homePathForRole(role) {
  return homeForRole(role);
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
