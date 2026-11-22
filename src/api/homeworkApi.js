import { api } from './client.js';

const unwrap = value => value?.result ?? value;
const get = (url, config) => api.get(url, config).then(unwrap);
const post = (url, body, config) => api.post(url, body, config).then(unwrap);

export const getHomework = () => get('/homework');
export const getHomeworkCatalog = params => get('/homework/catalog', { params });
export const getHomeworkLearners = params => get('/homework/learners', { params });
export const getHomeworkReport = params => get('/homework/report', { params });
export const getHomeworkBookings = params => get('/mentor/bookings', { params });
export const getHomeworkLesson = (assignmentId, lessonId) => get(`/homework/${assignmentId}/lessons/${lessonId}`);
export const startHomeworkExercise = (assignmentId, exerciseId) => post(`/homework/${assignmentId}/exercises/${exerciseId}/start`);
export const submitHomeworkExercise = (assignmentId, attemptId, answers) => post(`/homework/${assignmentId}/exercise-attempts/${attemptId}/submit`, { answers });
export const createHomework = payload => post('/homework', payload);
export const createGroupHomework = payload => post('/homework', payload);
export const submitHomework = (assignmentId, payload) => post(`/homework/${assignmentId}/submit`, payload);
export const submitHomeworkAudio = (assignmentId, file) => {
  const form = new FormData();
  form.append('file', file, file.name);
  return post(`/homework/${assignmentId}/audio`, form, { transformRequest: [(data, headers) => { delete headers['Content-Type']; return data; }] });
};
export const submitHomeworkScan = (assignmentId, form) => post(`/homework/${assignmentId}/submit-scan`, form, { transformRequest: [(data, headers) => { delete headers['Content-Type']; return data; }] });
export const getHomeworkDisputes = params => get('/homework/disputes', { params });
export const createHomeworkDispute = payload => post('/homework/disputes', payload);
export const answerHomeworkDispute = (id, payload) => post(`/homework/disputes/${id}/answer`, payload);
export const closeHomeworkDispute = id => post(`/homework/disputes/${id}/close`);
export const draftHomeworkGrades = payload => post('/homework/ai-drafts', payload);
export const publishHomeworkGrade = (id, payload) => post(`/homework/${id}/grade`, payload);
export const evaluateHomeworkBooking = (id, payload) => post(`/mentor/bookings/${id}/evaluate`, payload);
export const getMentorPracticeProgress = params => get('/mentor/practice-progress', { params });
export const recordMentorPractice = payload => post('/mentor/practice-progress', payload);
export const saveMentorReviewPlan = payload => post('/mentor/review-plans', payload);
export const loadHomeworkAudio = id => get(`/homework/${id}/audio`);
export const loadHomeworkScan = id => get(`/homework/${id}/scan`);
