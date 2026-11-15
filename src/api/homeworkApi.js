import { api } from './client.js';

export async function getHomework(learnerId) {
  return (await api.get('/homework', { params: { learnerId } })).result;
}

export async function getHomeworkLearners() {
  return (await api.get('/homework/learners')).result;
}

export async function getHomeworkCatalog(params) {
  return (await api.get('/homework/catalog', { params })).result;
}

export async function createHomework(payload) {
  return (await api.post('/homework', payload)).result;
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

export async function getHomeworkReport(params) {
  return (await api.get('/homework/report', { params })).result;
}
