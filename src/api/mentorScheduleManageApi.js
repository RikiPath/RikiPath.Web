import { api } from './client.js';

export const getMyMentorSchedule = async () => (await api.get('/mentors/me/schedule')).result;

export const updateMyMentorSchedule = async (body) => (await api.put('/mentors/me/schedule', body)).result;

export const previewMentorSlots = async (body) =>
  (await api.post('/mentors/me/schedule/preview-slots', body)).result;

export const publishMentorSlots = async (body) =>
  (await api.post('/mentors/me/schedule/publish-slots', body)).result;

/** Kiểm tra xung đột lịch dạy (lớp nhóm, booking cũ, khóa 1-1, nghỉ giữa buổi, giới hạn ngày/tuần). */
export const previewTeachingConflicts = async (intervals = [], excludeCohortId) => {
  const body = {
    intervals: intervals.map(({ startUtc, endUtc }) => ({ startUtc, endUtc })),
  };
  if (excludeCohortId) body.excludeCohortId = Number(excludeCohortId);
  return (await api.post('/mentors/me/schedule/conflict-preview', body)).result;
};

export const getMyAvailabilitySlots = async () =>
  (await api.get('/mentor/availability')).result || [];

export const deleteMyAvailabilitySlot = async (slotId) =>
  (await api.delete(`/mentor/availability/${slotId}`)).result;

export const requestCancelAvailabilitySlots = async (ids, reason) =>
  (await api.post('/mentor/availability/request-cancel', { ids, reason: reason || null })).result;
