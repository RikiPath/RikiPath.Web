import { api } from './client.js';

const missingApi = (name) => () => Promise.reject(new Error(`Backend không có API ${name}.`));

// Admin user management was removed from the current backend.
export const getAdminUsers = missingApi('quản lý người dùng');
export const createAdminUser = missingApi('quản lý người dùng');
export const getAdminUser = missingApi('quản lý người dùng');
export const updateAdminUser = missingApi('quản lý người dùng');
export const disableAdminUser = missingApi('quản lý người dùng');

// Subscription plan and feature CRUD was removed. Meeting plans use /admin/mentor-plans.
export const getAdminPlans = missingApi('gói đăng ký tổng');
export const createAdminPlan = missingApi('gói đăng ký tổng');
export const getAdminPlan = missingApi('gói đăng ký tổng');
export const updateAdminPlan = missingApi('gói đăng ký tổng');
export const disableAdminPlan = missingApi('gói đăng ký tổng');
export const getAdminFeatures = missingApi('feature');
export const createAdminFeature = missingApi('feature');
export const getAdminFeature = missingApi('feature');
export const updateAdminFeature = missingApi('feature');
export const disableAdminFeature = missingApi('feature');

export const getAdminMentorBookings = missingApi('booking admin');
export const updateAdminMentorBooking = missingApi('booking admin');
export const getAdminMentorAvailabilities = () => api.get('/admin/mentor-availabilities');

export async function getAdminMentorSchedule(mentorId, from, to) {
  const data = await api.get(`/admin/mentor-availabilities/mentor/${mentorId}/schedule`, { params: { from, to } });
  return data?.result || [];
}
export const createAdminMentorAvailability = missingApi('tạo khung giờ admin');
export const updateAdminMentorAvailability = missingApi('sửa khung giờ admin');
export const deleteAdminMentorAvailability = missingApi('xóa khung giờ admin');

// Mentors and overview
export const createAdminMentor = (data) => api.post('/admin/mentors', data);
export const getAdminMentors = () => api.get('/admin/mentors');
export const setAdminMentorActive = (mentorId, isActive) => api.put(`/admin/mentors/${mentorId}/active`, null, { params: { isActive } });
export const getAdminDashboard = () => api.get('/admin/dashboard');

// Content moderation (legacy)
// export const getAdminPendingContent = (entityType, params) => api.get(`/content-management/admin/pending/${entityType}`, { params });
export const getAdminContentDetails = () => Promise.reject(new Error('Backend không có API chi tiết nội dung quản trị.'));

export const getAdminPendingContent = (entityType, params) => api.get('/content-approvals/pending', {
  params: { ...params, ...(entityType ? { entityType: entityType === 'GrammarPattern' ? 'Grammar' : entityType } : {}) },
});
export const reviewAdminContent = (requestId, data) => api.post(`/content-approvals/requests/${requestId}/review`, data);

// Content approvals v1
export async function getPendingApprovals(params = {}) {
  const res = await api.get('/content-approvals/pending', { params });
  return res?.result ?? res;
}

export function getApprovalDetail() {
  return Promise.reject(new Error('Backend không có API chi tiết một yêu cầu duyệt.'));
}

export function approveContent() {
  return Promise.reject(new Error('Dùng review với approve = true.'));
}

export function rejectContent() {
  return Promise.reject(new Error('Dùng review với approve = false.'));
}

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

export async function reviewContentRequest(requestId, data) {
  // data: { approve: boolean, reviewNote: string }
  const res = await api.post(`/content-approvals/requests/${requestId}/review`, data);
  return res?.result ?? res;
}

// Duyệt / Từ chối hàng loạt
export async function batchReviewContentRequests(items) {
  // items: Array<{ requestId: number, approve: boolean, reviewNote: string }>
  const res = await api.post('/content-approvals/requests/batch-review', { items });
  return res?.result ?? res;
}
