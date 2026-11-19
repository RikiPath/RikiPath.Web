import { api } from '@/api/client.js';

export async function getStandardAssessmentRoadmap() {
  const response = await api.get('/StandardRoadmap/assessment');
  return response.result;
}

export async function getAssessmentRoadmapLesson(lessonId) {
  const response = await api.get(`/StandardRoadmap/assessment/lessons/${lessonId}`);
  return response.result;
}

export async function completeAssessmentRoadmapLesson(lessonId) {
  const response = await api.post(`/StandardRoadmap/assessment/lessons/${lessonId}/complete`);
  return response.result;
}

export async function getAssessmentRoadmapExercises(lessonId) {
  const response = await api.get(`/practice-exercises/assessment-roadmap/lessons/${lessonId}`);
  return response.result;
}

export async function startAssessmentRoadmapPractice(exerciseId) {
  const response = await api.post(`/practice-exercises/${exerciseId}/assessment-roadmap/attempts`);
  return response.result;
}

export async function submitAssessmentRoadmapPractice(attemptId, answers) {
  const response = await api.post(`/practice-exercises/assessment-roadmap/attempts/${attemptId}/submit`, { answers });
  return response.result;
}

export async function getLatestLearningPath() {
  const response = await api.get('/LearningPath/latest');
  return response?.result ?? null;
}

export async function generateLearningPath(options = {}) {
  const response = await api.post('/LearningPath/generate', options);
  return response?.result ?? response;
}

export async function previewLearningPath(options) {
  const response = await api.post('/LearningPath/preview', options);
  return response?.result ?? response;
}

export async function proposeLearningPath(options) {
  const current = await getLatestLearningPath();
  if (current?.status?.toUpperCase() === 'ACTIVE') {
    return { preview: await previewLearningPath(options) };
  }
  return { active: await generateLearningPath(options) };
}

export async function confirmLearningPathPreview(pathId) {
  const response = await api.post(`/LearningPath/previews/${pathId}/confirm`);
  return response?.result ?? response;
}

export async function startLearningPathDay(day) {
  const response = await api.post(`/LearningPath/active/days/${day}/start`);
  return response?.result ?? response;
}

export async function completeLearningPathDay(day) {
  const response = await api.post(`/LearningPath/active/days/${day}/complete`);
  return response?.result ?? response;
}

export async function getLessonDetail(lessonId) {
  const response = await api.get(`/LessonProgress/lessons/${lessonId}`);
  return response?.result ?? response;
}

export async function completeLesson(lessonId) {
  const response = await api.post(`/LessonProgress/lessons/${lessonId}/complete`);
  return response?.result ?? response;
}

export async function getLessonPracticeExercises(lessonId) {
  const response = await api.get(`/practice-exercises/lessons/${lessonId}`);
  return response?.result ?? [];
}

export async function startPracticeExercise(exerciseId, params) {
  const response = await api.post(`/practice-exercises/${exerciseId}/attempts`, undefined, { params });
  return response?.result ?? response;
}

export async function submitPracticeExerciseAttempt(attemptId, answers) {
  const response = await api.post(`/practice-exercises/attempts/${attemptId}/submit`, { answers });
  return response?.result ?? response;
}

export async function getLessonCatalog(certificateLevelId) {
  const response = await api.get('/LessonProgress/lessons', { params: { certificateLevelId } });
  return response?.result ?? response;
}

export function getStandardRoadmap() {
  return api.get('/StandardRoadmap').then((data) => data?.result);
}

export function getActiveLearningPath() {
  return api.get('/LearningPath/active').then((data) => data?.result ?? null);
}

export function getLearningPathHistory() {
  return api.get('/LearningPath/history').then((data) => data?.result);
}

export function cancelLearningPathPreview(previewId) {
  return api.delete('/LearningPath/previews/' + previewId).then((data) => data?.result);
}
