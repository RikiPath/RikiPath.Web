import { api } from './client.js';

const missingApi = (name) => () => Promise.reject(new Error(`Backend không có API ${name}.`));

export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const createAdminUser = (data) => api.post('/admin/users', data);
export const getAdminUser = (id) => api.get(`/admin/users/${id}`);
export const updateAdminUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const disableAdminUser = (id) => api.delete(`/admin/users/${id}`);

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
  for (const key of ['items', 'data', 'results', 'users', 'plans', 'features', 'mentors', 'bookings', 'availabilities', 'contents', 'disputes', 'reviews', 'metrics', 'profiles', 'verifications']) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}

// Quan ly xac minh ho so, tranh chap, danh gia va chat luong Mentor 1-1
export const getAdminMentorVerifications = (params) => api.get('/admin/mentors/verifications', { params });
export const getAdminMentorProfile = (mentorId) => api.get(`/admin/mentors/${mentorId}/profile`);
export const getAdminMentorVerificationDocument = (mentorId) =>
  api.get(`/admin/mentors/${mentorId}/verification-document/content`, { responseType: 'blob' });
export const verifyAdminMentor = (mentorId, data) => api.post(`/admin/mentors/${mentorId}/verify`, data);
export const reviewAdminCancellationException = (bookingId, data) =>
  api.post(`/admin/mentor-bookings/${bookingId}/review-cancellation`, data);
export const moderateAdminMentorReview = (reviewId, data) =>
  api.post(`/admin/mentor-reviews/${reviewId}/moderate`, data);
export const getAdminMentorDisputesQueue = (params) => api.get('/admin/mentor-disputes/queue', { params });
export const resolveAdminMentorDispute = (disputeId, data) =>
  api.post(`/admin/mentor-disputes/${disputeId}/resolve`, data);
export const updateAdminMentorDisputeStatus = (disputeId, data) =>
  api.post(`/admin/mentor-disputes/${disputeId}/status`, data);
export const getAdminMentorQualityMetrics = (params) => api.get('/admin/mentor-quality/metrics', { params });

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

export async function reviewLessonGroup(requestId, data) {
  const res = await api.post(`/content-approvals/requests/${requestId}/review-lesson-group`, data);
  return res?.result ?? res;
}

export async function getCertificateSections(params) {
  const data = await api.get('/admin/certificate-sections', { params });
  return data?.result ?? data ?? [];
}

export async function createCertificateSection(body) {
  const data = await api.post('/admin/certificate-sections', body);
  return data?.result ?? data;
}

export async function updateCertificateSection(id, body) {
  const data = await api.put(`/admin/certificate-sections/${id}`, body);
  return data?.result ?? data;
}

export async function archiveCertificateSection(id) {
  const data = await api.delete(`/admin/certificate-sections/${id}`);
  return data?.result ?? data;
}

export async function getPendingMentorSlots() {
  const data = await api.get('/admin/mentor-availabilities/pending');
  return data?.result ?? data ?? [];
}

export async function reviewMentorSlots(ids, approve, rejectionReason) {
  const data = await api.post('/admin/mentor-availabilities/review', ids, {
    params: { approve, rejectionReason: rejectionReason || undefined },
  });
  return data?.result ?? data;
}

export async function reviewMentorSlotCancels(ids, approve, rejectionReason) {
  const data = await api.post('/admin/mentor-availabilities/review-cancel', ids, {
    params: { approve, rejectionReason: rejectionReason || undefined },
  });
  return data?.result ?? data;
}

export async function completeQaPayment(subscriptionId) {
  const data = await api.post(`/admin/qa-payments/${subscriptionId}/complete`);
  return data?.result ?? data;
}
