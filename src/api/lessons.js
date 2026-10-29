import { api } from './client.js';

export async function getJlptLevels() {
  const data = await api.get('/CertificateLevel/jlpt');
  return data?.result ?? data ?? [];
}

export async function getLearningLessons(certificateLevelId) {
  const data = await api.get('/LessonProgress/lessons', {
    params: { certificateLevelId },
  });
  return data?.result ?? data;
}

export async function getLessonDetail(lessonId) {
  const data = await api.get(`/LessonProgress/lessons/${lessonId}`);
  return data?.result ?? data;
}

export async function completeLesson(lessonId) {
  const data = await api.post(`/LessonProgress/lessons/${lessonId}/complete`);
  return data?.result ?? data;
}
