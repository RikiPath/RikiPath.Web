import { api } from './client.js';

const result = (data) => data?.result;

export function getPlacementStatus() {
  return api.get('/MockTest/placement/status').then(result);
}

export function skipPlacement() {
  return api.post('/MockTest/placement/skip').then(result);
}

export function getPlacementTest(certificateLevelId) {
  return api.get('/MockTest/placement/test', { params: { certificateLevelId } }).then(result);
}

export function getActivePlacement() {
  return api.get('/MockTest/placement/active').then(result);
}

export function startPlacement(mockTestId) {
  return api.post('/MockTest/placement/start', { mockTestId }).then(result);
}

export function savePlacementAnswer(attemptId, { questionId, selectedOptionId }) {
  return api.put(`/MockTest/placement/attempts/${attemptId}/answer`, {
    questionId,
    selectedOptionId: selectedOptionId ?? null,
  }).then(result);
}

export function submitPlacement(attemptId, answers) {
  return api.post(`/MockTest/placement/attempts/${attemptId}/submit`, {
    answers: answers.map((item) => ({
      questionId: item.questionId,
      selectedOptionId: item.selectedOptionId ?? null,
    })),
  }).then(result);
}

export function getPlacementResult(attemptId) {
  return api.get(`/MockTest/placement/attempts/${attemptId}/result`).then(result);
}
