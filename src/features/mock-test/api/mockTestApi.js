import { api } from '@/api/client.js';

const endpoint = '/MockTest';

function withDeadline(attempt) {
  if (!attempt || typeof attempt !== 'object') return attempt;
  const remaining = attempt.expiresAt ? Date.parse(attempt.expiresAt) - Date.parse(attempt.serverNow) : NaN;
  const duration = Number.isFinite(remaining) ? Math.max(0, remaining) : null;
  return {
    ...attempt,
    localDeadline: duration == null ? null : Date.now() + duration,
    monotonicDeadline: duration == null ? null : performance.now() + duration,
  };
}

export async function getMockTestLevels() {
  const { result } = await api.get('/CertificateLevel/jlpt');
  const supported = (result ?? []).filter((level) => ['N5', 'N4', 'N3', 'N2'].includes(level.code));
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

export async function getPracticeSets({ levelId, skill, examKind, keyword, status, sort } = {}) {
  const params = {};
  if (levelId) params.certificateLevelId = levelId;
  if (skill) params.languageSkillId = skill;
  if (examKind) params.examKind = examKind;
  if (keyword) params.keyword = keyword;
  if (status) params.status = status;
  if (sort) params.sort = sort;
  const { result } = await api.get(endpoint + '/practice-sets', { params });
  return result ?? [];
}

export async function getFullMockTests({ levelId, keyword, status, sort } = {}) {
  const params = {};
  if (levelId) params.certificateLevelId = levelId;
  if (keyword) params.keyword = keyword;
  if (status) params.status = status;
  if (sort) params.sort = sort;
  const { result } = await api.get(endpoint + '/mock-exams', { params });
  return result ?? [];
}

export async function getMockTestInfo(mockTestId) {
  const { result } = await api.get(`${endpoint}/${mockTestId}/info`);
  return result;
}

export async function getPracticeSetPreview(mockTestId) {
  const { result } = await api.get(`${endpoint}/${mockTestId}/preview`);
  return result;
}

export async function getActiveMockAttempt(mockTestId) {
  const { result } = await api.get(`${endpoint}/${mockTestId}/active`);
  return result ? withDeadline(result) : null;
}

export async function startMockTest(mockTestId, options = {}) {
  const forceNew = Boolean(options?.forceNew);
  const data = await api.post(
    `${endpoint}/${mockTestId}/start${forceNew ? '?forceNew=true' : ''}`,
    forceNew ? { forceNew: true } : undefined,
  );
  return withDeadline(data.result ?? data);
}

export async function getMockTestQuestions(attemptId) {
  const { result } = await api.get(endpoint + '/attempts/' + attemptId + '/questions');
  return withDeadline(result);
}

export async function saveMockTestAnswers(attemptId, answers, meta = {}) {
  const body = { answers };
  if (meta.clientSequence != null) body.clientSequence = meta.clientSequence;
  if (meta.activeElapsedSeconds != null) body.activeElapsedSeconds = meta.activeElapsedSeconds;
  const data = await api.put(endpoint + '/attempts/' + attemptId + '/answers', body);
  return data?.result ?? data;
}

export async function pauseMockTestAttempt(attemptId, meta = {}) {
  const body = {
    answers: Array.isArray(meta.answers) ? meta.answers : [],
  };
  if (meta.clientSequence != null) body.clientSequence = meta.clientSequence;
  if (meta.activeElapsedSeconds != null) body.activeElapsedSeconds = meta.activeElapsedSeconds;
  const data = await api.post(`${endpoint}/attempts/${attemptId}/pause`, body);
  return data?.result ?? data;
}

export async function submitMockTestAttempt(attemptId, answers, meta = {}) {
  const body = { answers };
  if (meta.clientSequence != null) body.clientSequence = meta.clientSequence;
  if (meta.activeElapsedSeconds != null) body.activeElapsedSeconds = meta.activeElapsedSeconds;
  const data = await api.post(endpoint + '/attempts/' + attemptId + '/submit', body);
  return data.result ?? data;
}

export async function finalizeExpiredMockTestAttempt(attemptId) {
  const data = await api.post(`${endpoint}/attempts/${attemptId}/finalize`);
  return data?.result ?? data;
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

export async function getMockTestHistory({ kind, status } = {}) {
  const params = {};
  if (kind) params.kind = kind;
  if (status) params.status = status;
  const { result } = await api.get(endpoint + '/history', { params });
  return result ?? [];
}

export async function getMockTestPagedHistory({ kind, status, level, days, search, page = 1, pageSize = 10 } = {}) {
  const params = { page, pageSize };
  if (kind && kind !== 'ALL') params.kind = kind;
  if (status && status !== 'ALL') params.status = status;
  if (level && level !== 'ALL') params.level = level;
  if (days && Number(days) > 0) params.days = Number(days);
  if (search && String(search).trim()) params.search = String(search).trim();
  const { result } = await api.get(`${endpoint}/history/paged`, { params });
  return result ?? { items: [], total: 0, page, pageSize, hasMore: false, stats: null };
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
