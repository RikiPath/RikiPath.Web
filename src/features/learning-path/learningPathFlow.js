/**
 * Pure step-by-step learner journey and AI Learning Path gate helpers.
 * Derived strictly from Backend responses (no local-only unlocking).
 */

export const ROADMAP_LOCK_REASON = 'Hoàn thành đánh giá năng lực và tạo lộ trình AI để mở khóa.';

export function hasActiveLearningPath(path) {
  if (!path || typeof path !== 'object') return false;
  return String(path.status || '').trim().toUpperCase() === 'ACTIVE';
}

export function normalizeRoutePath(to) {
  const path = String(to || '').split('?')[0].split('#')[0].replace(/\/+$/, '');
  return path || '/';
}

export function isAiRoadmapRoute(to) {
  return normalizeRoutePath(to) === '/roadmap';
}

/**
 * Classifies the learner's real step-by-step progress across Goal -> Placement -> AI Path.
 * @returns {{
 *   step: 'goal' | 'placement' | 'generate-ai' | 'ready',
 *   hasGoal: boolean,
 *   hasPlacementCompleted: boolean,
 *   hasActiveAiPath: boolean,
 *   lockState: 'unknown' | 'locked' | 'open',
 * }}
 */
export function computeLearningFlowState({
  profile,
  placementStatus,
  latestPath,
  isPending = false,
  isError = false,
} = {}) {
  const hasGoal = Boolean(profile?.targetJlptLevelId || profile?.targetJlptLevelName);
  const hasPlacementCompleted = Boolean(
    placementStatus?.hasCompletedPlacementTest || placementStatus?.latestCompletedAttemptId,
  );
  const hasActiveAiPath = hasActiveLearningPath(latestPath);

  let lockState = 'open';
  if (isPending && !latestPath) {
    lockState = 'unknown';
  } else if (isError && !latestPath) {
    lockState = 'unknown';
  }

  let step;
  if (hasActiveAiPath) {
    step = 'ready';
  } else if (!hasGoal) {
    step = 'goal';
  } else if (!hasPlacementCompleted) {
    step = 'placement';
  } else {
    step = 'generate-ai';
  }

  return {
    step,
    hasGoal,
    hasPlacementCompleted,
    hasActiveAiPath,
    lockState,
  };
}
