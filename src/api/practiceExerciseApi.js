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

export function getQuizExercises(lessonId) {
  return api.get(`/practice-exercises/lessons/${lessonId}`).then(result);
}

export function startQuizExercise(practiceExerciseId) {
  return api.post(`/practice-exercises/${practiceExerciseId}/attempts`).then(result);
}

export function submitQuizExercise(attemptId, answers) {
  return api.post(`/practice-exercises/attempts/${attemptId}/submit`, {
    answers: answers.map((item) => ({
      questionId: item.questionId,
      selectedOptionId: item.selectedOptionId ?? null,
    })),
  }).then(result);
}
