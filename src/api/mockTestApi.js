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

export async function getMockTestAttempt(attemptId) {
  const data = await api.get(endpoint + '/attempts/' + attemptId);
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
