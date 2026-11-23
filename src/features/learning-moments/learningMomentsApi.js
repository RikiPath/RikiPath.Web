import { api } from '@/api/client.js';

function unwrap(data) {
  return data?.result ?? data?.data ?? data;
}

/** Recent, not-yet-shown moments derived by the server from verified learning data. */
export async function getPendingLearningMoments() {
  const data = await api.get('/LearningMoments/pending');
  const res = unwrap(data);
  return { items: Array.isArray(res?.items) ? res.items : [], serverUtcNow: res?.serverUtcNow || null };
}

/** Atomically claims a moment before showing it; only `claimed: true` may open the dialog. */
export async function claimLearningMoment(occurrenceKey) {
  const data = await api.post('/LearningMoments/claim', { occurrenceKey });
  return unwrap(data);
}

/** Achievements already earned plus the nearest next goals. */
export async function getLearnerAchievements() {
  const data = await api.get('/LearningMoments/achievements');
  const res = unwrap(data);
  return {
    achieved: Array.isArray(res?.achieved) ? res.achieved : [],
    next: Array.isArray(res?.next) ? res.next : [],
  };
}

/** React Query key for pending moments (invalidate after any verified completion). */
export const learningMomentsKey = ['learning-moments', 'pending'];
