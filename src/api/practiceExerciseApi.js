import { api } from './client.js';

const result = (data) => data?.result ?? data;

export function getLessonExercises(lessonId) {
  return api.get(`/PracticeExercise/lesson/${lessonId}`).then(result);
}

export function startLessonExercise(practiceExerciseId) {
  return api.post(`/PracticeExercise/${practiceExerciseId}/start`).then(result);
}

export function submitLessonExercise(attemptId, answers) {
  return api.post(`/PracticeExercise/attempt/${attemptId}/submit`, { answers }).then(result);
}
