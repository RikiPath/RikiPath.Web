import { api } from '@/api/client.js';

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

export const createMyAvailabilitySlots = async ({ startTime, endTime, repeatUntil = null, weekdays = null, idempotencyKey = null }) =>
  (await api.post('/mentor/availability', {
    startTime,
    endTime,
    repeatUntil: repeatUntil || null,
    weekdays: weekdays && weekdays.length ? weekdays : null,
    idempotencyKey: idempotencyKey || null,
  })).result || [];

export const createMyAvailabilityBatch = async ({ slots = [], idempotencyKey = null }) =>
  (await api.post('/mentor/availability/batch', {
    slots: slots.map((s) => ({
      startTime: s.startTime || s.startUtcIso,
      endTime: s.endTime || s.endUtcIso,
    })),
    idempotencyKey: idempotencyKey || null,
  })).result || [];

export const deleteMyAvailabilitySlot = async (slotId) =>
  (await api.delete(`/mentor/availability/${slotId}`)).result;

export const requestCancelAvailabilitySlots = async (ids, reason) =>
  (await api.post('/mentor/availability/request-cancel', { ids, reason: reason || null })).result;

export const requestChangeAvailabilitySlot = async (slotId, reason) =>
  (await api.post(`/mentor-schedule/slots/${slotId}/change`, { reason })).result;

export const getMentorCalendarStatus = async () =>
  (await api.get('/mentor/calendar')).result;

/**
 * Moves a pending (unapproved, unbooked) availability slot safely using the Backend contract.
 * Creates first when disjoint (zero data-loss risk); when overlapping the previous slot window,
 * removes old -> creates new with automatic rollback-restore if the create fails.
 */
export async function movePendingAvailabilitySlot({ slot, targetStartUtcIso, targetEndUtcIso, restMinutes = 15 }) {
  const padMs = Math.max(0, restMinutes) * 60000;
  const oldStartIso = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(slot.startTime) ? slot.startTime : `${slot.startTime}Z`).toISOString();
  const oldEndIso = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(slot.endTime) ? slot.endTime : `${slot.endTime}Z`).toISOString();
  const oldStartMs = new Date(oldStartIso).getTime();
  const oldEndMs = new Date(oldEndIso).getTime();
  const newStartMs = new Date(targetStartUtcIso).getTime();
  const newEndMs = new Date(targetEndUtcIso).getTime();

  const touchesOldWindow = oldStartMs - padMs < newEndMs && newStartMs - padMs < oldEndMs;
  if (!touchesOldWindow) {
    const created = await createMyAvailabilitySlots({ startTime: targetStartUtcIso, endTime: targetEndUtcIso });
    await deleteMyAvailabilitySlot(slot.id);
    return created;
  }

  await deleteMyAvailabilitySlot(slot.id);
  try {
    return await createMyAvailabilitySlots({ startTime: targetStartUtcIso, endTime: targetEndUtcIso });
  } catch (err) {
    try {
      await createMyAvailabilitySlots({ startTime: oldStartIso, endTime: oldEndIso });
    } catch {
      // Original slot restoration best-effort if server rejected move.
    }
    throw err;
  }
}
