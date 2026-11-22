import { api } from '@/api/client.js';
export const getWeeklyAvailability = async weekStart => (await api.get('/mentor-schedule/weekly', { params: { weekStart } })).result;
export const requestSlotChange = async (id, reason) => (await api.post(`/mentor-schedule/slots/${id}/change`, { reason })).result;
export const deleteMentorAvailability = async (id) => (await api.delete(`/mentor/availability/${id}`)).result;
export const resolveSlotChange = async (id, body) => (await api.post(`/mentor-schedule/slots/${id}/resolve`, body)).result;
