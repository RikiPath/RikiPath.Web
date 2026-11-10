import { api } from './client.js';

const result = (data) => data?.result ?? null;

export function getMockTestsByLevel(jlptLevelId) {
  return api.get(`/MockTest/level/${jlptLevelId}/tests`).then((data) => result(data) ?? []);
}

export function startMockTest(mockTestId) {
  return api.post(`/MockTest/${mockTestId}/start`).then(result);
}

export function submitMockTest(attemptId, answers) {
  return api.post(`/MockTest/attempts/${attemptId}/submit`, {
    answers: answers.map((item) => ({
      questionId: item.questionId,
      selectedOptionId: item.selectedOptionId ?? null,
    })),
  }).then(result);
}

export function getMockAttempt(attemptId) {
  return api.get(`/MockTest/attempts/${attemptId}`).then(result);
}

export function getDetailedMockAttempt(attemptId) {
  return api.get(`/MockTest/attempts/${attemptId}/detailed`).then(result);
}

export function getWrongQuestions(practiceTestId) {
  const params = practiceTestId ? { practiceTestId } : {};
  return api.get('/MockTest/wrong-questions', { params }).then((data) => result(data) ?? []);
}
