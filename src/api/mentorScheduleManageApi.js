import { api } from './client.js';

export const getMyMentorSchedule = async () => (await api.get('/mentors/me/schedule')).result;

export const updateMyMentorSchedule = async (body) => (await api.put('/mentors/me/schedule', body)).result;

export const previewMentorSlots = async (body) =>
  (await api.post('/mentors/me/schedule/preview-slots', body)).result;

export const publishMentorSlots = async (body) =>
  (await api.post('/mentors/me/schedule/publish-slots', body)).result;

export const disableMentorSlot = async (slotId, body) =>
  (await api.patch(`/mentors/me/schedule/slots/${slotId}/disable`, body)).result;
