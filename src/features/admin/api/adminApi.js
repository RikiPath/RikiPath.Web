import { api } from '@/api/client.js';

export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const createAdminUser = (data) => api.post('/admin/users', data);
export const getAdminUser = (id) => api.get(`/admin/users/${id}`);
export const updateAdminUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const disableAdminUser = (id) => api.delete(`/admin/users/${id}`);

export const getAdminMentorAvailabilities = () => api.get('/admin/mentor-availabilities');

export async function getAdminMentorSchedule(mentorId, from, to) {
  const data = await api.get(`/admin/mentor-availabilities/mentor/${mentorId}/schedule`, { params: { from, to } });
  return data?.result || [];
}

// Mentors and overview
export const createAdminMentor = (data) => api.post('/admin/mentors', data);
export const getAdminMentors = (params) => api.get('/admin/mentors', { params });
export const setAdminMentorActive = (mentorId, isActive) => api.put(`/admin/mentors/${mentorId}/active`, null, { params: { isActive } });
export const getAdminDashboard = () => api.get('/admin/dashboard');

export const getAdminPendingContent = (entityType, params) => api.get('/content-approvals/pending', {
  params: { ...params, ...(entityType ? { entityType: entityType === 'GrammarPattern' ? 'Grammar' : entityType } : {}) },
});
export const reviewAdminContent = (requestId, data) => api.post(`/content-approvals/requests/${requestId}/review`, data);

// Content approvals v1
export async function getPendingApprovals(params = {}) {
  const res = await api.get('/content-approvals/pending', { params });
  return res?.result ?? res;
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

// Quản lý xác minh hồ sơ và mẫu lịch cố vấn
export const getAdminMentorVerifications = (params) => api.get('/admin/mentors/verifications', { params });
export const getAdminMentorProfile = (mentorId) => api.get(`/admin/mentors/${mentorId}/profile`);
export const getAdminMentorVerificationDocument = (mentorId) =>
  api.get(`/admin/mentors/${mentorId}/verification-document/content`, { responseType: 'blob' });
export const verifyAdminMentor = (mentorId, data) => api.post(`/admin/mentors/${mentorId}/verify`, data);
export const getAdminMentorShiftTemplate = (mentorId) => api.get(`/admin/mentors/${mentorId}/schedule`);

export async function reviewContentRequest(requestId, data) {
  // data: { approve: boolean, reviewNote: string }
  const res = await api.post(`/content-approvals/requests/${requestId}/review`, data);
  return res?.result ?? res;
}

export async function reviewLessonGroup(requestId, data) {
  const res = await api.post(`/content-approvals/requests/${requestId}/review-lesson-group`, data);
  return res?.result ?? res;
}

const BATCH_REVIEW_CHUNK_SIZE = 10;
const BATCH_REVIEW_TIMEOUT_MS = 120000;

// Duyệt / Từ chối hàng loạt
export async function batchReviewContentRequests(items) {
  // items: Array<{ requestId: number, approve: boolean, reviewNote: string }>
  if (!Array.isArray(items) || items.length === 0) {
    return { successCount: 0, failures: [] };
  }

  const chunks = [];
  for (let index = 0; index < items.length; index += BATCH_REVIEW_CHUNK_SIZE) {
    chunks.push(items.slice(index, index + BATCH_REVIEW_CHUNK_SIZE));
  }

  const aggregate = { successCount: 0, failures: [] };
  for (const chunk of chunks) {
    try {
      // Mỗi nhóm nhỏ được commit riêng, tránh giữ một transaction cho hàng
      // trăm request và tránh để trình duyệt hủy request sau 120 giây.
      const res = await api.post(
        '/content-approvals/requests/batch-review',
        { items: chunk },
        { timeout: BATCH_REVIEW_TIMEOUT_MS }
      );
      const result = res?.result ?? res ?? {};
      aggregate.successCount += Number(result.successCount ?? result.SuccessCount ?? 0);
      aggregate.failures.push(...(result.failures ?? result.Failures ?? []));
    } catch (error) {
      // Lỗi validation/conflict của một nhóm không được chặn các nhóm còn lại.
      // Lỗi mạng, timeout hoặc 5xx phải dừng để tránh trạng thái không rõ ràng.
      const canContinue = Number.isFinite(error?.status)
        && error.status >= 400
        && error.status < 500
        && !error.isTimeout
        && !error.isNetwork;
      if (!canContinue) throw error;

      aggregate.failures.push(...chunk.map((item) => ({
        requestId: item.requestId,
        reason: error.message || 'Không thể xử lý nhóm này.',
      })));
    }
  }

  return aggregate;
}

export async function getModerationQueueV2(params = {}) {
  const res = await api.get('/content-approvals/v2/queue', { params });
  return res?.result ?? res;
}

export async function getModerationDetailV2(requestId) {
  const res = await api.get(`/content-approvals/v2/requests/${requestId}/detail`);
  return res?.result ?? res;
}

export async function moderateContentV2(requestId, payload) {
  const res = await api.post(`/content-approvals/v2/requests/${requestId}/moderate`, payload);
  return res?.result ?? res;
}

export async function unpublishContentV2(payload) {
  const res = await api.post('/content-approvals/v2/unpublish', payload);
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

export async function reviewMentorSlot(id, approve, reason) {
  const data = await api.post(`/admin/mentor-availabilities/${id}/review`, {
    approve,
    reason: reason || null,
  });
  return data?.result ?? data;
}

export async function reviewMentorSlotCancels(ids, approve, rejectionReason) {
  const data = await api.post('/admin/mentor-availabilities/review-cancel', ids, {
    params: { approve, rejectionReason: rejectionReason || undefined },
  });
  return data?.result ?? data;
}

export async function getCurrentMentorGroupPolicy() {
  const data = await api.get('/admin/mentor-group-policies/current');
  return data?.result ?? data;
}

export async function getMentorGroupPolicyHistory() {
  const data = await api.get('/admin/mentor-group-policies');
  return unwrapApiList(data);
}

export async function getMentorGroupPolicyLevels() {
  const data = await api.get('/admin/mentor-group-policies/levels');
  return unwrapApiList(data);
}

export async function createMentorGroupPolicyVersion(payload) {
  const data = await api.post('/admin/mentor-group-policies', payload);
  return data?.result ?? data;
}

export async function updateMentorGroupPolicyVersion(policyId, payload) {
  const data = await api.put(`/admin/mentor-group-policies/${policyId}`, payload);
  return data?.result ?? data;
}

export async function updateMentorGroupPolicySection(policyId, sectionKey, payload) {
  const data = await api.patch(`/admin/mentor-group-policies/${policyId}/sections/${sectionKey}`, payload);
  return data?.result ?? data;
}

export async function activateMentorGroupPolicyVersion(policyId) {
  const data = await api.post(`/admin/mentor-group-policies/${policyId}/activate`);
  return data?.result ?? data;
}

export async function deleteMentorGroupPolicyVersion(policyId) {
  const data = await api.delete(`/admin/mentor-group-policies/${policyId}`);
  return data?.result ?? data;
}

// ── Business Configuration: Subscription Plans, Payments & Audit Logs ────────

export async function getAdminSubscriptionPlans() {
  const data = await api.get('/admin/subscription-plans');
  return data?.result ?? data;
}

export async function createAdminSubscriptionPlan(payload) {
  const data = await api.post('/admin/subscription-plans', payload);
  return data?.result ?? data;
}

export async function updateAdminSubscriptionPlan(id, payload) {
  const data = await api.put(`/admin/subscription-plans/${id}`, payload);
  return data?.result ?? data;
}

export async function updateAdminFeaturePolicy(id, payload) {
  const data = await api.put(`/admin/features/${id}/policy`, payload);
  return data?.result ?? data;
}

export async function getAdminEntitlementPreview(planId = null) {
  const params = planId ? { planId } : {};
  const data = await api.get('/admin/entitlement-preview', { params });
  return data?.result ?? data;
}

export async function getAdminPayments(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
  const data = await api.get('/admin/payments', { params: cleanParams });
  return data?.result ?? data;
}

export async function getAdminPaymentDetail(stream, id) {
  const data = await api.get(`/admin/payments/${encodeURIComponent(stream)}/${id}`);
  return data?.result ?? data;
}

export async function refundStudyCoursePayment(studyCourseId, reason, refundAmount = null) {
  const payload = { reason };
  if (refundAmount != null && Number.isFinite(Number(refundAmount))) {
    payload.refundAmount = Math.trunc(Number(refundAmount));
  }
  const data = await api.post(`/admin/payments/study-course/${studyCourseId}/refund`, payload);
  return data?.result ?? data;
}

export async function getPayOsGatewayStatus() {
  const data = await api.get('/admin/payments/gateway-status');
  return data?.result ?? data;
}

export async function getAdminAuditLogs(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
  const data = await api.get('/admin/audit-logs', { params: cleanParams });
  return unwrapApiList(data);
}
