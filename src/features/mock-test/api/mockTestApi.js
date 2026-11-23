import { api } from '@/api/client.js';

const endpoint = '/MockTest';

function withDeadline(attempt) {
  const remaining = attempt.expiresAt ? Date.parse(attempt.expiresAt) - Date.parse(attempt.serverNow) : NaN;
  const duration = Number.isFinite(remaining) ? Math.max(0, remaining) : null;
  return { ...attempt, localDeadline: duration == null ? null : Date.now() + duration,
    monotonicDeadline: duration == null ? null : performance.now() + duration };
}

export async function getMockTestLevels() {
  const { result } = await api.get('/CertificateLevel/jlpt');
  const supported = (result ?? []).filter(level => ['N5', 'N4', 'N3', 'N2'].includes(level.code));
  const available = await Promise.all(supported.map(async (level) => ({
    level,
    tests: await getMockTestsByLevel(level.id),
  })));
  return available.filter(({ tests }) => tests.length > 0).map(({ level }) => level);
}

export async function getMockTestsByLevel(levelId) {
  const { result } = await api.get(endpoint + '/by-level/' + levelId);
  return result ?? [];
}

export async function getPracticeSets(params = {}) {
  const { result } = await api.get(endpoint + '/practice-sets', { params });
  return result ?? [];
}

export async function getFullMockTests(params = {}) {
  const { result } = await api.get(endpoint + '/mock-exams', { params });
  return result ?? [];
}

export async function getMockTestInfo(mockTestId) {
  const { result } = await api.get(`${endpoint}/${mockTestId}/info`);
  return result;
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

export async function getMockQuestionExplanation(attemptId, questionId) {
  const { result } = await api.post(endpoint + '/attempts/' + attemptId + '/questions/' + questionId + '/ai-explanation');
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
