/**
 * Pure runtime helpers for the RikiPath Sakura Celebration System.
 * Kept separate from JSX components for Fast Refresh compatibility and clean unit testing.
 */

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function hasCelebratedOnce(key) {
  if (!key || typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(`rp_celebrated_${key}`) === '1';
  } catch {
    return false;
  }
}

export function markCelebratedOnce(key) {
  if (!key || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`rp_celebrated_${key}`, '1');
  } catch {
    // Ignore storage quota or private-mode restrictions.
  }
}

export function shouldPlayCelebration(onceKey) {
  if (!onceKey) return !prefersReducedMotion();
  return !prefersReducedMotion() && !hasCelebratedOnce(onceKey);
}

/**
 * Classifies completion celebration level from real progress state:
 * - 'milestone': completed entire roadmap / all scheduled lessons
 * - 'stage': completed the last remaining lesson in the selected level/phase
 * - 'lesson': single lesson / exercise completed
 */
export function resolveLessonCelebrationTier({
  completedLessons = 0,
  totalLessons = 0,
  stageCompleted = false,
} = {}) {
  if (totalLessons > 0 && completedLessons >= totalLessons) {
    return 'milestone';
  }
  if (stageCompleted) {
    return 'stage';
  }
  return 'lesson';
}
