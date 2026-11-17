import { api } from './client.js';

const endpoint = '/MockTest';

function withDeadline(attempt) {
  const remaining = attempt.expiresAt ? Date.parse(attempt.expiresAt) - Date.parse(attempt.serverNow) : NaN;
  return { ...attempt, localDeadline: Number.isFinite(remaining) ? Date.now() + Math.max(0, remaining) : null };
}

export async function getMockTestLevels() {
  const { result } = await api.get('/CertificateLevel/jlpt');
  return (result ?? []).filter(level => ['N5', 'N4', 'N3', 'N2'].includes(level.code));
}

export async function getMockTestsByLevel(levelId) {
  const { result } = await api.get(endpoint + '/by-level/' + levelId);
  return result ?? [];
}

export async function startMockTest(mockTestId) {
  const data = await api.post(endpoint + '/' + mockTestId + '/start');
  return withDeadline(data.result ?? data);
}

export async function getMockTestQuestions(attemptId) {
  const { result } = await api.get(endpoint + '/attempts/' + attemptId + '/questions');
  return withDeadline(result);
}

export async function saveMockTestAnswers(attemptId, answers) {
  await api.put(endpoint + '/attempts/' + attemptId + '/answers', { answers });
}

export async function submitMockTestAttempt(attemptId, answers) {
  const data = await api.post(endpoint + '/attempts/' + attemptId + '/submit', { answers });
  return data.result ?? data;
}

export async function getMockTestAttempt(attemptId, config) {
  const data = await api.get(endpoint + '/attempts/' + attemptId, config);
  return data.result ?? data;
}

export async function getMockTestReview(attemptId) {
  const { result } = await api.get(endpoint + '/attempts/' + attemptId + '/review');
  return result;
}

export async function getMockTestHistory() {
  const { result } = await api.get(endpoint + '/history');
  return result ?? [];
}

export { getMockTestAttempt as getMockAttempt, submitMockTestAttempt as submitMockTest };

const result = (data) => data?.result ?? null;

export function getDetailedMockAttempt(attemptId) {
  return api.get(`/MockTest/attempts/${attemptId}/detailed`).then(result);
}

export function getWrongQuestions(practiceTestId) {
  const params = practiceTestId ? { practiceTestId } : {};
  return api.get('/MockTest/wrong-questions', { params }).then((data) => result(data) ?? []);
}
