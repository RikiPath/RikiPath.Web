import { api } from '@/api/client.js';

const endpoint = '/PlacementTest';

export const placementAssessmentKey = (session, attemptId) =>
  ['placement-assessment', session?.userId ?? session?.email, attemptId];

async function get(path) {
  const response = await api.get(endpoint + path);
  return response.result;
}

export const getPlacementStatus = () => get('/status');
function withLocalDeadline(attempt) {
  if (!attempt) return attempt;
  const remaining = Date.parse(attempt.expiresAt) - Date.parse(attempt.serverNow);
  const duration = Math.max(0, Number.isFinite(remaining) ? remaining : 0);
  return { ...attempt, localDeadline: Date.now() + duration, monotonicDeadline: performance.now() + duration };
}

export const getActivePlacementAttempt = async () => withLocalDeadline(await get('/attempts/active'));
export const getPlacementResult = (attemptId) => get(`/attempts/${attemptId}`);

export async function startPlacementAttempt({ retakeTargetAssessment = false } = {}) {
  const response = await api.post(`${endpoint}/start`, retakeTargetAssessment ? { retakeTargetAssessment: true } : {});
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

export async function loadAssessment(requestedId) {
  const [status, active] = await Promise.all([getPlacementStatus(), getActivePlacementAttempt()]);
  if (active && (!requestedId || requestedId === active.attemptId)) {
    return { status, attempt: active };
  }

  const pendingId = status.attemptAllowance?.pendingSubmissionAttemptId;
  const resultId = requestedId || pendingId || status.latestCompletedAttemptId;
  if (!resultId) return { status };
  try {
    const result = await getPlacementResult(resultId);
    if (!requestedId && (result.followUpUnavailableReason === 'CURRENT_TARGET_MISMATCH'
      || (result.assessmentTargetLevelId && result.assessmentTargetLevelId !== status.targetJlptLevelId))) {
      return { status };
    }
    return { status, result, active };
  } catch (error) {
    if (error.data?.errorCode === 'PLACEMENT_ATTEMPT_EXPIRED') {
      const result = await submitPlacementAttempt(resultId, []);
      const updatedStatus = await getPlacementStatus().catch(() => status);
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
  const matchesTarget = !result?.assessmentTargetLevelId
    || result.assessmentTargetLevelId === status?.targetJlptLevelId;
  const isDifferentGoal = Boolean(status?.targetJlptLevelId && !matchesTarget)
    || result?.followUpUnavailableReason === 'CURRENT_TARGET_MISMATCH';
  const isCurrentResult = isLatest && !isDifferentGoal && !result.isMiniAssessment;
  const canRetake = isCurrentResult && status?.canStartNewAttempt !== false
    && result.nextActions?.includes('RETAKE_TARGET_ASSESSMENT') === true;
  const canPlan = isCurrentResult && status?.isReadyForLearningPath === true;
  const canStartUpdatedAssessment = isCurrentResult && !status.attemptAllowance && ['N1', 'N2', 'N3', 'N4', 'N5'].includes(status.targetJlptLevelName)
    && (result.isComprehensiveAssessment || !result.assessmentTargetLevelId
      || (status.targetJlptLevelName !== 'N5' && result.levelBreakdowns?.length === 1));
  return { isLatest, matchesTarget, isDifferentGoal, canPlan, canStartUpdatedAssessment, canRetake };
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
