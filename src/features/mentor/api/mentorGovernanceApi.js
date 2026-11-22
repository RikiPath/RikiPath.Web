import { api } from '@/api/client.js';
import { unwrapApiList, unwrapApiResult } from '@/features/admin/api/adminApi.js';
import { translateTemplate, translateText, currentIntlTag } from '@/locales/locale.js';

export const SUPPORTED_JLPT_LEVELS = Object.freeze(['N5', 'N4', 'N3', 'N2', 'N1']);

export function normalizeJlptLevel(level) {
  return String(level ?? '').trim().toUpperCase();
}

export function isSupportedJlptLevel(level) {
  return SUPPORTED_JLPT_LEVELS.includes(normalizeJlptLevel(level));
}

export function assertSupportedJlptLevel(level) {
  const normalized = normalizeJlptLevel(level);
  if (!isSupportedJlptLevel(normalized)) {
    throw new Error('Hệ thống hỗ trợ trình độ JLPT N5, N4, N3, N2 và N1.');
  }
  return normalized;
}

export function formatVnd(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '0 ₫';
  return new Intl.NumberFormat(currentIntlTag(), {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatMinutesVi(totalMinutes) {
  const num = Number(totalMinutes);
  if (!Number.isFinite(num) || num <= 0) return translateTemplate('{0} phút', { 0: 0 });
  const hours = Math.floor(num / 60);
  const mins = Math.round(num % 60);
  if (hours <= 0) return translateTemplate('{0} phút', { 0: mins });
  if (mins === 0) return translateTemplate('{0} giờ', { 0: hours });
  return translateTemplate('{0}g {1}p', { 0: hours, 1: mins });
}

export function formatTurnaroundVi(minutes) {
  if (minutes === null || minutes === undefined) return translateText('Chưa đủ dữ liệu');
  const num = Number(minutes);
  if (!Number.isFinite(num) || num < 0) return translateText('Chưa đủ dữ liệu');
  if (num < 60) return translateTemplate('{0} phút', { 0: Math.round(num) });
  const hours = Math.round((num / 60) * 10) / 10;
  return translateTemplate('{0} giờ ({1} phút)', { 0: hours, 1: Math.round(num) });
}

export function formatCompletionRatio(completed, assigned) {
  const total = Number(assigned) || 0;
  const done = Number(completed) || 0;
  if (total <= 0) return '0%';
  return `${Math.round((done / total) * 100)}%`;
}

// —— Non-financial Mentor Attendance & KPI Endpoints ——

export const getMentorKpiSummary = async (params) =>
  unwrapApiResult(await api.get('/mentor/kpi/summary', { params }));

export const getAdminMentorKpiList = async (params) =>
  unwrapApiList(await api.get('/admin/mentors/kpi', { params }));

export const getAdminMentorKpiByMentor = async (mentorId, params) =>
  unwrapApiResult(await api.get(`/admin/mentors/${mentorId}/kpi`, { params }));

export const getRoomAttendance = async (roomId) =>
  unwrapApiList(await api.get(`/mentor-meetings/rooms/${roomId}/attendance`));

// —— Admin JLPT Teaching Qualification Governance ——

export const getAdminMentorQualifications = async () =>
  unwrapApiResult(await api.get('/admin/mentors/qualifications'));

export const grantAdminMentorQualification = async (mentorId, payload) =>
  unwrapApiResult(await api.post(`/admin/mentors/${mentorId}/qualifications`, payload));

export const revokeAdminMentorQualification = async (mentorId, certificateLevelId, payload) =>
  unwrapApiResult(await api.post(`/admin/mentors/${mentorId}/qualifications/${certificateLevelId}/revoke`, payload));
