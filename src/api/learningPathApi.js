import { api } from './client.js';

const result = (data) => data?.result;

export function getStandardRoadmap() {
  return api.get('/StandardRoadmap').then(result);
}

export function getLatestLearningPath() {
  return api.get('/LearningPath/latest').then((data) => data?.result ?? null);
}

export function generateLearningPath({ targetExamDate } = {}) {
  return api.post('/LearningPath/generate', {
    ...(targetExamDate ? { targetExamDate } : {}),
  }).then(result);
}

export function previewLearningPath({
  startingJlptLevelId,
  targetJlptLevelId,
  targetExamDate,
}) {
  return api.post('/LearningPath/preview', {
    startingJlptLevelId,
    ...(targetJlptLevelId ? { targetJlptLevelId } : {}),
    ...(targetExamDate ? { targetExamDate } : {}),
  }).then(result);
}

export function getLearningPathHistory() {
  return api.get('/LearningPath/history').then(result);
}

export function startLearningPathDay(day) {
  return api.post(`/LearningPath/active/days/${day}/start`).then(result);
}

export function completeLearningPathDay(day) {
  return api.post(`/LearningPath/active/days/${day}/complete`).then(result);
}

export function confirmLearningPathPreview(previewId) {
  return api.post(`/LearningPath/previews/${previewId}/confirm`).then(result);
}

export function cancelLearningPathPreview(previewId) {
  return api.delete(`/LearningPath/previews/${previewId}`).then(result);
}
