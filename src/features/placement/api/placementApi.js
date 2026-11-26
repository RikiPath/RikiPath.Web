import { api } from '@/api/client.js';

const endpoint = '/PlacementTest';

export const placementAssessmentKey = (session, attemptId) =>
  ['placement-assessment', session?.userId ?? session?.email, attemptId];

async function get(path, params) {
  const response = await api.get(endpoint + path, params ? { params } : undefined);
  return response.result;
}

export const getPlacementStatus = (params) => {
  const query = {};
  if (params?.assessmentLevelId) query.assessmentLevelId = params.assessmentLevelId;
  if (params?.assessmentMode) query.assessmentMode = params.assessmentMode;
  return get('/status', Object.keys(query).length ? query : undefined);
};
function withLocalDeadline(attempt) {
  if (!attempt) return attempt;
  const remaining = Date.parse(attempt.expiresAt) - Date.parse(attempt.serverNow);
  const duration = Math.max(0, Number.isFinite(remaining) ? remaining : 0);
  return { ...attempt, localDeadline: Date.now() + duration, monotonicDeadline: performance.now() + duration };
}

export const getActivePlacementAttempt = async () => withLocalDeadline(await get('/attempts/active'));
export const getPlacementResult = (attemptId) => get(`/attempts/${attemptId}`);

export async function startPlacementAttempt({
  retakeTargetAssessment = false,
  restartExisting = false,
  assessmentLevelId = null,
  assessmentMode = null,
} = {}) {
  const body = {};
  if (retakeTargetAssessment) body.retakeTargetAssessment = true;
  if (restartExisting) body.restartExisting = true;
  if (assessmentLevelId) body.assessmentLevelId = assessmentLevelId;
  if (assessmentMode) body.assessmentMode = assessmentMode;
  const response = await api.post(`${endpoint}/start`, body);
  return withLocalDeadline(response.result);
}

export async function savePlacementAnswers(attemptId, answers) {
  const response = await api.put(`${endpoint}/attempts/${attemptId}/answers`, { answers });
  return response.result;
}

export async function submitPlacementAttempt(attemptId, answers) {
  const response = await api.post(`${endpoint}/attempts/${attemptId}/submit`, { answers });
  return response.result;
}

export async function loadAssessment(requestedId, statusParams) {
  const [status, active] = await Promise.all([getPlacementStatus(statusParams), getActivePlacementAttempt()]);
  if (active && (!requestedId || requestedId === active.attemptId)) {
    return { status, attempt: active };
  }

  const pendingId = status.attemptAllowance?.pendingSubmissionAttemptId;
  const resultId = requestedId || pendingId || status.latestCompletedAttemptId;
  if (!resultId) return { status };
  try {
    const result = await getPlacementResult(resultId);
    return { status, result, active };
  } catch (error) {
    if (error.data?.errorCode === 'PLACEMENT_ATTEMPT_EXPIRED') {
      const result = await submitPlacementAttempt(resultId, []);
      const updatedStatus = await getPlacementStatus(statusParams).catch(() => status);
      return { status: updatedStatus, result, active, notice: 'Bài đánh giá đã được tự động nộp khi hết giờ.' };
    }
    if (error.status !== 404 && error.status !== 409) throw error;
    if (!requestedId || requestedId === status.latestCompletedAttemptId) throw error;
    return {
      status,
      attempt: active,
      result: !active && status.latestCompletedAttemptId
        ? await getPlacementResult(status.latestCompletedAttemptId)
        : null,
      notice: 'Lượt được mở đã kết thúc hoặc không còn khả dụng.',
    };
  }
}

export function getPlacementResultActions(status, result) {
  const latestCompletedId = status?.latestCompletedAttemptId ?? status?.latestAttemptId;
  const isLatest = Boolean(result && latestCompletedId && result.attemptId === latestCompletedId);
  const hasGoal = Boolean(status?.isGoalConfirmed && status?.targetJlptLevelId);
  const compatibility = String(status?.placementCompatibilityStatus || '').toUpperCase();
  const matchesTarget = !hasGoal
    || compatibility === 'COMPATIBLE'
    || (!result?.assessmentTargetLevelId && compatibility !== 'INSUFFICIENT_FOR_TARGET')
    || result?.assessmentTargetLevelId === status?.targetJlptLevelId;
  const isInsufficientForTarget = Boolean(hasGoal && compatibility === 'INSUFFICIENT_FOR_TARGET');
  const isDifferentGoal = Boolean(hasGoal && !matchesTarget) || isInsufficientForTarget;
  const isCurrentResult = isLatest && !result?.isMiniAssessment;
  const canRetake = Boolean(
    isCurrentResult &&
    status?.canStartNewAttempt === true &&
    result?.nextActions?.includes('RETAKE_TARGET_ASSESSMENT'),
  );
  const canPlan = Boolean(isCurrentResult && hasGoal && compatibility === 'COMPATIBLE');
  const canSetGoal = Boolean(isCurrentResult && !hasGoal);
  const canSupplement = Boolean(isCurrentResult && isInsufficientForTarget && status?.canStartNewAttempt === true);
  const canStartUpdatedAssessment = false;
  return {
    isLatest,
    hasGoal,
    matchesTarget,
    isDifferentGoal,
    isInsufficientForTarget,
    canPlan,
    canSetGoal,
    canSupplement,
    canStartUpdatedAssessment,
    canRetake,
  };
}

const result = (data) => data?.result;

export function skipPlacement() {
  return api.post('/MockTest/placement/skip').then(result);
}

export async function skipStandardPlacement() {
  const response = await api.post(`${endpoint}/skip`);
  return response.result;
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
