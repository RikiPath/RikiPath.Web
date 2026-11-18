import { api } from './client.js';
import { unwrapApiList, unwrapApiResult } from './admin.js';

export const SUPPORTED_JLPT_LEVELS = Object.freeze(['N5', 'N4', 'N3', 'N2']);

export function normalizeJlptLevel(level) {
  return String(level ?? '').trim().toUpperCase();
}

export function isSupportedJlptLevel(level) {
  return SUPPORTED_JLPT_LEVELS.includes(normalizeJlptLevel(level));
}

export function assertSupportedJlptLevel(level) {
  const normalized = normalizeJlptLevel(level);
  if (!isSupportedJlptLevel(normalized)) {
    throw new Error('Hệ thống tư vấn 1-1 chỉ hỗ trợ trình độ JLPT N5, N4, N3 và N2 (không hỗ trợ N1).');
  }
  return normalized;
}

export function formatVnd(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatMinutesVi(totalMinutes) {
  const num = Number(totalMinutes);
  if (!Number.isFinite(num) || num <= 0) return '0 phút';
  const hours = Math.floor(num / 60);
  const mins = Math.round(num % 60);
  if (hours <= 0) return `${mins} phút`;
  if (mins === 0) return `${hours} giờ`;
  return `${hours}g ${mins}p`;
}

export function formatTurnaroundVi(minutes) {
  if (minutes === null || minutes === undefined) return 'Chưa đủ dữ liệu';
  const num = Number(minutes);
  if (!Number.isFinite(num) || num < 0) return 'Chưa đủ dữ liệu';
  if (num < 60) return `${Math.round(num)} phút`;
  const hours = Math.round((num / 60) * 10) / 10;
  return `${hours} giờ (${Math.round(num)} phút)`;
}

export function formatCompletionRatio(completed, assigned) {
  const total = Number(assigned) || 0;
  const done = Number(completed) || 0;
  if (total <= 0) return '0%';
  return `${Math.round((done / total) * 100)}%`;
}

// —— Learner Consultation Package Plans (N5–N2 booking tickets) ——

export const getAdminMentorPlans = async () =>
  unwrapApiList(await api.get('/admin/mentor-plans'));

export const createAdminMentorPlan = async (body) => {
  const jlptLevel = body?.jlptLevel ? assertSupportedJlptLevel(body.jlptLevel) : undefined;
  return unwrapApiResult(
    await api.post('/admin/mentor-plans', {
      ...body,
      ...(jlptLevel ? { jlptLevel } : {}),
    }),
  );
};

export const updateAdminMentorPlan = async (id, body) => {
  const jlptLevel = body?.jlptLevel ? assertSupportedJlptLevel(body.jlptLevel) : undefined;
  return unwrapApiResult(
    await api.put(`/admin/mentor-plans/${id}`, {
      ...body,
      ...(jlptLevel ? { jlptLevel } : {}),
    }),
  );
};

// —— Mentor JLPT Teaching Qualifications (retained for Booking level matching) ——

export const getAdminMentorQualifications = async (mentorUserId) =>
  unwrapApiList(
    await api.get('/admin/mentor-compensation/qualifications', {
      params: mentorUserId ? { mentorUserId } : undefined,
    }),
  );

export const grantAdminMentorQualification = async (body) => {
  const jlptLevel = assertSupportedJlptLevel(body?.jlptLevel);
  return unwrapApiResult(
    await api.post('/admin/mentor-compensation/qualifications/grant', {
      ...body,
      jlptLevel,
    }),
  );
};

export const revokeAdminMentorQualification = async (body) => {
  const jlptLevel = assertSupportedJlptLevel(body?.jlptLevel);
  return unwrapApiResult(
    await api.post('/admin/mentor-compensation/qualifications/revoke', {
      ...body,
      jlptLevel,
    }),
  );
};

export const getMentorQualifications = async () =>
  unwrapApiList(await api.get('/mentor/compensation/qualifications'));

// —— Non-financial Mentor Attendance & KPI Endpoints ——

export const getMentorKpiSummary = async (params) =>
  unwrapApiResult(await api.get('/mentor/kpi/summary', { params }));

export const getAdminMentorKpiList = async (params) =>
  unwrapApiList(await api.get('/admin/mentors/kpi', { params }));

export const getAdminMentorKpiByMentor = async (mentorId, params) =>
  unwrapApiResult(await api.get(`/admin/mentors/${mentorId}/kpi`, { params }));

export const getAdminBookingAttendanceDetail = async (bookingId) =>
  unwrapApiResult(await api.get(`/admin/bookings/${bookingId}/attendance`));

export const getBookingAttendance = async (bookingId) =>
  unwrapApiList(await api.get(`/mentor-meetings/bookings/${bookingId}/attendance`));
