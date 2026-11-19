import { api } from '@/api/client.js';

export async function getScheduleChangeRequests() {
  return (await api.get('/study-courses/change-requests')).result || [];
}

export async function getHomeworkReport({ from, to, learnerId } = {}) {
  const params = { from, to };
  if (learnerId) params.learnerId = learnerId;
  return (await api.get('/homework/report', { params })).result;
}

export async function getMentorCalendarStatus() {
  return (await api.get('/mentor/calendar')).result;
}

export async function connectMentorCalendar() {
  return (await api.post('/mentor/calendar/connect')).result;
}

export async function syncMentorCalendar() {
  return (await api.post('/mentor/calendar/sync')).result;
}

export async function disconnectMentorCalendar() {
  return (await api.delete('/mentor/calendar')).result;
}
