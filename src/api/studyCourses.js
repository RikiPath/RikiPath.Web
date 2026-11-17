import { api } from './client.js';
import { describeApiError } from './apiErrors.js';
import { isAiDraftUnavailable } from '../components/studyCourses/homeworkModel.js';

const root = '/study-courses';

export const courseGet = async (path = '') => (await api.get(root + path)).result;
export const coursePost = async (path, body = {}) => (await api.post(root + path, body)).result;
export const saveCoursePlan = async (plan) =>
  (await (plan.id ? api.put(`${root}/plans/${plan.id}`, plan) : api.post(`${root}/plans`, plan))).result;

const COHORT_FILTER_KEYS = ['mentorId', 'level', 'intensity', 'weekday', 'fromTime', 'toTime'];

/** Bỏ tham số rỗng; chỉ gửi các bộ lọc mà máy chủ hỗ trợ. */
export function cohortQueryParams(params = {}) {
  const out = {};
  for (const key of COHORT_FILTER_KEYS) {
    const value = params?.[key];
    if (value === undefined || value === null || value === '' || value === 'ALL') continue;
    out[key] = key === 'mentorId' || key === 'weekday' ? Number(value) : String(value);
  }
  return out;
}

export const getCohorts = async (params) => {
  const query = cohortQueryParams(params);
  const config = Object.keys(query).length ? { params: query } : undefined;
  return (await api.get(`${root}/cohorts`, config)).result || [];
};

/** Admin xem trước xung đột lịch khi chọn Mentor + khung giờ cho lớp. */
export const previewCohortSchedule = async ({ mentorId, availabilityIds = [], cohortId } = {}) => {
  const body = { mentorId: Number(mentorId), availabilityIds: availabilityIds.map(Number) };
  if (cohortId) body.cohortId = Number(cohortId);
  return (await api.post(`${root}/cohorts/schedule-preview`, body)).result;
};
export const saveCohort = async (cohort) =>
  (await (cohort.id ? api.put(`${root}/cohorts/${cohort.id}`, cohort) : api.post(`${root}/cohorts`, cohort))).result;
export const enrollCohort = async (cohortId, body) =>
  (await api.post(`${root}/cohorts/${cohortId}/enroll`, body)).result;
export const reconcileCoursePayment = async (courseId) =>
  (await api.post(`${root}/${courseId}/payment/reconcile`)).result;
export const cancelCohortEnrollment = async (courseId, reason) =>
  (await api.post(`${root}/${courseId}/cancel-enrollment`, { reason: reason || null })).result;

export const getCohortEntitlements = async (cohortId) =>
  (await api.get(`${root}/cohorts/${cohortId}/entitlements`)).result || [];
export const grantCohortEntitlement = async (cohortId, body) =>
  (await api.post(`${root}/cohorts/${cohortId}/entitlements`, body)).result;
export const revokeCohortEntitlement = async (entitlementId, reason) =>
  (await api.post(`${root}/entitlements/${entitlementId}/revoke`, { reason })).result;
export const getMyEntitlements = async () =>
  (await api.get(`${root}/my-entitlements`)).result || [];

export const uploadRetakeEvidence = async (id, form) =>
  (await api.post(`${root}/${id}/retake`, form, {
    transformRequest: [(data, headers) => {
      delete headers['Content-Type'];
      return data;
    }],
  })).result;

export const saveRetakeSupportPlan = async (courseId, requestId, supportPlan) =>
  (await api.post(`${root}/${courseId}/retake/${requestId}/support-plan`, { supportPlan })).result;

export async function openRetakeEvidence(courseId, requestId) {
  const blob = await api.get(`${root}/${courseId}/retake/${requestId}/evidence`, { responseType: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `JLPT-${courseId}-${requestId}.${blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : 'jpg'}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const getAdminAvailabilitySlots = async () =>
  (await api.get('/admin/mentor-availabilities')).result || [];

export const getCohortHomework = async (cohortId, learnerId) => {
  const params = {};
  if (cohortId) params.cohortId = cohortId;
  if (learnerId) params.learnerId = learnerId;
  return (await api.get('/homework', { params })).result || [];
};

export const createCohortHomework = async (cohortId, body) =>
  (await api.post(`/homework/cohorts/${cohortId}`, body)).result;

export const submitHomeworkText = async (assignmentId, body) =>
  (await api.post(`/homework/${assignmentId}/submit`, body)).result;

export const submitHomeworkScan = async (assignmentId, form) =>
  (await api.post(`/homework/${assignmentId}/submit-scan`, form, {
    transformRequest: [(data, headers) => {
      delete headers['Content-Type'];
      return data;
    }],
  })).result;

export async function openHomeworkScan(assignmentId) {
  const blob = await api.get(`/homework/${assignmentId}/submission-scan`, { responseType: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Homework-${assignmentId}.${blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : 'jpg'}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// PR #70: AI/OCR lỗi trả 502/503 + HOMEWORK_AI_DRAFT_UNAVAILABLE (bài nộp không đổi). Coi đó là kết quả đã xử lý
// để trang tải lại danh sách và hiển thị lý do đã lưu, thay vì báo lỗi chung.
export const generateHomeworkAiDraft = async (assignmentId) => {
  try {
    return { available: true, ...((await api.post(`/homework/${assignmentId}/ai-draft`)).result || {}) };
  } catch (error) {
    const info = describeApiError(error);
    if (isAiDraftUnavailable(info)) return { available: false, reason: info.message };
    throw error;
  }
};

export const gradeHomeworkAssignment = async (assignmentId, body) =>
  (await api.post(`/homework/${assignmentId}/grade`, body)).result;

export const getMentorLearnerSkillProfile = async (learnerId, cohortId) =>
  (await api.get(`/mentor/learners/${learnerId}/skill-profile`, {
    params: cohortId ? { cohortId } : undefined,
  })).result;

// ── Chuyển lớp có kiểm soát (Học viên gửi yêu cầu, Admin duyệt; không tự đổi lớp/Mentor) ──
const multipart = {
  transformRequest: [(data, headers) => {
    delete headers['Content-Type'];
    return data;
  }],
};

export const requestCohortTransfer = async (courseId, { targetCohortId, reason, evidence, idempotencyKey }) => {
  const form = new FormData();
  form.append('idempotencyKey', idempotencyKey);
  form.append('reason', String(reason || '').trim());
  if (targetCohortId) form.append('targetCohortId', String(targetCohortId));
  if (evidence && evidence.size > 0) form.append('evidence', evidence);
  return (await api.post(`${root}/${courseId}/transfer-requests`, form, multipart)).result;
};
export const getTransferRequests = async (status) =>
  (await api.get(`${root}/transfer-requests`, { params: status ? { status } : undefined })).result || [];
export const getTransferRequest = async (requestId) =>
  (await api.get(`${root}/transfer-requests/${requestId}`)).result;
export const getTransferEligibility = async (requestId, targetCohortId) =>
  (await api.get(`${root}/transfer-requests/${requestId}/eligibility`, { params: { targetCohortId } })).result;
export const approveTransfer = async (requestId, { targetCohortId, note, expectedRevision } = {}) =>
  (await api.post(`${root}/transfer-requests/${requestId}/approve`, {
    targetCohortId: targetCohortId ? Number(targetCohortId) : null,
    note: note || null,
    expectedRevision: expectedRevision ?? null,
  })).result;
export const rejectTransfer = async (requestId, reason, expectedRevision) =>
  (await api.post(`${root}/transfer-requests/${requestId}/reject`, { reason, expectedRevision: expectedRevision ?? null })).result;
export const withdrawTransfer = async (requestId) =>
  (await api.post(`${root}/transfer-requests/${requestId}/withdraw`)).result;
export async function openTransferEvidence(requestId) {
  const blob = await api.get(`${root}/transfer-requests/${requestId}/evidence`, { responseType: 'blob' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ── Admin thay cố vấn chính cho phần còn lại của lớp ──
export const previewMentorReplacement = async (cohortId, mentorId, fromSessionNumber) =>
  (await api.get(`${root}/cohorts/${cohortId}/mentor-replacement/preview`, {
    params: fromSessionNumber ? { mentorId, fromSessionNumber } : { mentorId },
  })).result;
export const replaceCohortMentor = async (cohortId, body) =>
  (await api.post(`${root}/cohorts/${cohortId}/mentor-replacement`, body)).result;
export const getMentorAssignments = async (cohortId) =>
  (await api.get(`${root}/cohorts/${cohortId}/mentor-assignments`)).result || [];

// ── Yêu cầu dời lịch / hủy lớp trống (Mentor của lớp hoặc Admin gửi, Admin duyệt) ──
export const SCHEDULE_REQUEST_STATUS = Object.freeze({
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
  Withdrawn: 'Đã rút',
});
export const SCHEDULE_REQUEST_KIND = Object.freeze({
  ShiftWeeks: 'Dời lịch theo tuần',
  CancelEmptyCohort: 'Hủy lớp chưa có học viên',
});
export const INTENSITY_OPTIONS = Object.freeze([
  { value: 'Light', label: 'Nhẹ', sessionsPerWeek: 2 },
  { value: 'Standard', label: 'Tiêu chuẩn', sessionsPerWeek: 3 },
  { value: 'Advanced', label: 'Nâng cao', sessionsPerWeek: 4 },
]);
export const createCohortScheduleRequest = async (cohortId, { kind, shiftWeeks, reason, idempotencyKey }) =>
  (await api.post(`${root}/cohorts/${cohortId}/schedule-requests`, {
    kind,
    shiftWeeks: kind === 'ShiftWeeks' ? Number(shiftWeeks || 1) : null,
    reason: String(reason || '').trim(),
    idempotencyKey,
  })).result;
export const getCohortScheduleRequests = async (cohortId) =>
  (await api.get(`${root}/cohorts/${cohortId}/schedule-requests`)).result || [];
export const getAdminCohortScheduleRequests = async (status) =>
  (await api.get(`${root}/cohort-schedule-requests`, { params: status ? { status } : undefined })).result || [];
export const getCohortShiftPreview = async (cohortId, weeks = 1) =>
  (await api.get(`${root}/cohorts/${cohortId}/shift-preview`, { params: { weeks: Number(weeks || 1) } })).result;
export const approveCohortScheduleRequest = async (requestId, { note, expectedRevision } = {}) =>
  (await api.post(`${root}/cohort-schedule-requests/${requestId}/approve`, {
    note: note ? String(note).trim() : null,
    expectedRevision: expectedRevision ?? null,
  })).result;
export const rejectCohortScheduleRequest = async (requestId, reason) =>
  (await api.post(`${root}/cohort-schedule-requests/${requestId}/reject`, { reason: String(reason || '').trim() })).result;
export const withdrawCohortScheduleRequest = async (requestId) =>
  (await api.post(`${root}/cohort-schedule-requests/${requestId}/withdraw`)).result;

// ── Đánh giá Mentor theo khóa học nhóm ──
export const submitCohortMentorReview = async (courseId, { mentorId, rating, comment }) =>
  (await api.post(`${root}/${courseId}/mentor-reviews`, {
    mentorId: Number(mentorId),
    rating: Number(rating),
    comment: String(comment || '').trim(),
  })).result;
export const updateCohortMentorReview = async (courseId, reviewId, { rating, comment }) =>
  (await api.put(`${root}/${courseId}/mentor-reviews/${reviewId}`, {
    rating: Number(rating),
    comment: String(comment || '').trim(),
  })).result;
export const getCohortMentorReviews = async (courseId) =>
  (await api.get(`${root}/${courseId}/mentor-reviews`)).result || [];
export const getMentorCohortReviewSummary = async (mentorId) =>
  (await api.get(`${root}/mentors/${mentorId}/cohort-review-summary`)).result;

// ── Khiếu nại khóa học ──
export const COMPLAINT_CATEGORIES = Object.freeze([
  { value: 'TeachingQuality', label: 'Chất lượng giảng dạy' },
  { value: 'MentorConduct', label: 'Thái độ / ứng xử của Mentor' },
  { value: 'Schedule', label: 'Lịch học' },
  { value: 'PaymentEnrollment', label: 'Thanh toán & ghi danh' },
  { value: 'Other', label: 'Khác' },
]);
export const COMPLAINT_STATUS_LABELS = Object.freeze({
  Open: 'Đã tiếp nhận',
  UnderReview: 'Đang xem xét',
  Resolved: 'Đã xử lý',
  Rejected: 'Không chấp nhận',
});

export const submitCohortComplaint = async (courseId, { category, message, mentorId, refundReviewRequested, idempotencyKey, evidence }) => {
  const form = new FormData();
  form.append('category', category);
  form.append('message', String(message || '').trim());
  form.append('idempotencyKey', idempotencyKey);
  if (mentorId) form.append('mentorId', String(mentorId));
  if (category === 'PaymentEnrollment') form.append('refundReviewRequested', refundReviewRequested ? 'true' : 'false');
  if (evidence && evidence.size > 0) form.append('evidence', evidence);
  return (await api.post(`${root}/${courseId}/complaints`, form, multipart)).result;
};
export const getCohortComplaints = async (status) =>
  (await api.get(`${root}/complaints`, { params: status ? { status } : undefined })).result || [];
export const getCohortComplaint = async (complaintId) =>
  (await api.get(`${root}/complaints/${complaintId}`)).result;
export const respondCohortComplaint = async (complaintId, response) =>
  (await api.post(`${root}/complaints/${complaintId}/mentor-response`, { response: String(response || '').trim() })).result;
export const decideCohortComplaint = async (complaintId, { status, decision, expectedRevision }) =>
  (await api.post(`${root}/complaints/${complaintId}/decision`, {
    status,
    decision: String(decision || '').trim(),
    expectedRevision: expectedRevision ?? null,
  })).result;
export async function openCohortComplaintEvidence(complaintId) {
  const blob = await api.get(`${root}/complaints/${complaintId}/evidence`, { responseType: 'blob' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ── Tổng kết hoàn thành khóa học (không phải chứng chỉ JLPT chính thức) ──
export const getCourseCompletionSummary = async (courseId) =>
  (await api.get(`${root}/${courseId}/completion-summary`)).result;
