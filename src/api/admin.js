import { api } from './client.js';

// Admin user management
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const createAdminUser = (data) => api.post('/admin/users', data);
export const getAdminUser = (id) => api.get(`/admin/users/${id}`);
export const updateAdminUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const disableAdminUser = (id) => api.delete(`/admin/users/${id}`);

// Subscription plans and features
export const getAdminPlans = () => api.get('/admin/plans');
export const createAdminPlan = (data) => api.post('/admin/plans', data);
export const getAdminPlan = (id) => api.get(`/admin/plans/${id}`);
export const updateAdminPlan = (id, data) => api.put(`/admin/plans/${id}`, data);
export const disableAdminPlan = (id) => api.delete(`/admin/plans/${id}`);
export const getAdminFeatures = () => api.get('/admin/features');
export const createAdminFeature = (data) => api.post('/admin/features', data);
export const getAdminFeature = (id) => api.get(`/admin/features/${id}`);
export const updateAdminFeature = (id, data) => api.put(`/admin/features/${id}`, data);
export const disableAdminFeature = (id) => api.delete(`/admin/features/${id}`);

// Mentor scheduling and bookings
export const getAdminMentorBookings = (params) => api.get('/admin/mentor-bookings', { params });
export const updateAdminMentorBooking = (id, data) => api.put(`/admin/mentor-bookings/${id}`, data);
export const getAdminMentorAvailabilities = (params) => api.get('/admin/mentor-availabilities', { params });
export const createAdminMentorAvailability = (data) => api.post('/admin/mentor-availabilities', data);
export const updateAdminMentorAvailability = (id, data) => api.put(`/admin/mentor-availabilities/${id}`, data);
export const deleteAdminMentorAvailability = (id) => api.delete(`/admin/mentor-availabilities/${id}`);

// Mentors and overview
export const createAdminMentor = (data) => api.post('/admin/mentors', data);
export const getAdminMentors = () => api.get('/admin/mentors');
export const setAdminMentorActive = (mentorId, isActive) => api.put(`/admin/mentors/${mentorId}/active`, null, { params: { isActive } });
export const getAdminDashboard = () => api.get('/admin/dashboard');

// Content moderation
export const getAdminPendingContent = (entityType, params) => api.get(`/content-management/admin/pending/${entityType}`, { params });
export const getAdminContentDetails = (entityType, entityId) => api.get(`/content-management/admin/details/${entityType}/${entityId}`);
export const reviewAdminContent = (entityType, entityId, data) => api.post(`/content-management/admin/review/${entityType}/${entityId}`, data);

export function unwrapApiResult(response) {
  return response?.result ?? response?.data?.result ?? response?.data ?? response;
}

export function unwrapApiList(response) {
  const value = unwrapApiResult(response);
  if (Array.isArray(value)) return value;
  for (const key of ['items', 'data', 'results', 'users', 'plans', 'features', 'mentors', 'bookings', 'availabilities', 'contents']) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}
