import { api } from './client.js';
export const getWeeklyAvailability = async weekStart => (await api.get('/mentor-schedule/weekly', { params: { weekStart } })).result;
export const saveWeeklyAvailability = async body => (await api.put('/mentor-schedule/weekly', body)).result;
export const assignWeeklySlots = async body => (await api.post('/mentor-schedule/slots', body)).result;
export const publishWeeklySchedule = async weekStart => (await api.post('/mentor-schedule/publish', null, { params: { weekStart } })).result;
export const requestSlotChange = async (id, reason) => (await api.post(`/mentor-schedule/slots/${id}/change`, { reason })).result;
export const resolveSlotChange = async (id, body) => (await api.post(`/mentor-schedule/slots/${id}/resolve`, body)).result;
export const cancelMentorBooking = async id => (await api.post(`/mentor-schedule/bookings/${id}/cancel`)).result;
