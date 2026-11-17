import { api } from './client.js';

export async function getHomework(learnerId, bookingId) {
  return (await api.get('/homework', { params: { learnerId, bookingId } })).result;
}

export const getHomeworkBookings = async () => (await api.get('/homework/bookings')).result;
export const getMentorPracticeProgress = async id => (await api.get(`/homework/bookings/${id}/progress`)).result;

export async function submitHomeworkScan(id, file) {
  const data = new FormData();
  data.append('file', file);
  return (await api.post(`/homework/${id}/scan`, data, { headers: { 'Content-Type': undefined } })).result;
}

export const loadHomeworkScan = id => api.get(`/homework/${id}/scan`, { responseType: 'blob' });
export const loadHomeworkAudio = id => api.get(`/homework/${id}/audio`, { responseType: 'blob' });
export const draftHomeworkGrades = async payload => (await api.post('/homework/ai-drafts', payload)).result;
export const publishHomeworkGrade = async (id, payload) => (await api.put(`/homework/${id}/grade`, payload)).result;
export const evaluateHomeworkBooking = async (id, payload) => (await api.put(`/homework/bookings/${id}/evaluation`, payload)).result;
export const recordMentorPractice = async (id, attemptId) => (await api.post(`/homework/bookings/${id}/progress`, { attemptId })).result;
export const saveMentorReviewPlan = async (id, payload) => (await api.put(`/homework/bookings/${id}/review-plan`, payload)).result;

export async function saveHomeworkMentorReview(booking, payload) {
  return booking.review
    ? (await api.put(`/mentor-reviews/${booking.review.id}`, payload)).result
    : (await api.post('/mentor-reviews', { ...payload, mentorBookingId: booking.bookingId })).result;
}

export async function getHomeworkDisputes(role, bookingId) {
  const path = role === 'admin' ? '/admin/mentor-disputes/queue' : `/${role}/mentor-disputes`;
  return (await api.get(path, { params: { pageSize: 50, bookingId } })).result;
}
export const createHomeworkDispute = async (id, reason) => (await api.post('/mentor-disputes', { mentorBookingId: id, category: 4, reason })).result;
export const answerHomeworkDispute = async (id, responseText) => (await api.post(`/mentor-disputes/${id}/respond`, { responseText })).result;
export const closeHomeworkDispute = async (id, payload) => (await api.post(`/admin/mentor-disputes/${id}/resolve`, payload)).result;

export async function getHomeworkLearners() {
  return (await api.get('/homework/learners', { params: { includeAllBookings: true } })).result;
}

export async function getHomeworkCatalog(params) {
  return (await api.get('/homework/catalog', { params })).result;
}

export async function createHomework(payload) {
  return (await api.post('/homework', payload)).result;
}

export async function createGroupHomework(payload) {
  return (await api.post('/homework/group', payload)).result;
}

export async function getHomeworkLesson(assignmentId, lessonId) {
  return (await api.get('/homework/' + assignmentId + '/lessons/' + lessonId)).result;
}

export async function startHomeworkExercise(assignmentId, exerciseId) {
  return (await api.post('/homework/' + assignmentId + '/exercises/' + exerciseId + '/start')).result;
}

export async function submitHomeworkExercise(assignmentId, attemptId, answers) {
  return (await api.post('/homework/' + assignmentId + '/exercise-attempts/' + attemptId + '/submit', { answers })).result;
}

export async function submitHomework(assignmentId, payload) {
  return (await api.post('/homework/' + assignmentId + '/submit', payload)).result;
}

export async function submitHomeworkAudio(id, file) {
  const data = new FormData();
  data.append('file', file);
  return (await api.post(`/homework/${id}/audio`, data, { headers: { 'Content-Type': undefined } })).result;
}

export async function getHomeworkReport(params) {
  return (await api.get('/homework/report', { params })).result;
}
