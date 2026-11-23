import { useQuery } from '@tanstack/react-query';
import { getMonthlySkillAnalytics } from '@/features/progress/api/analyticsApi.js';
import { getMockTestHistory } from '@/features/mock-test/api/mockTestApi.js';
import { getPracticeHistory } from '@/features/practice/api/practiceSubmissionApi.js';
import { getCohortHomework } from '@/features/cohorts/api/cohortApi.js';

async function safeGet(fn, fallback) {
  try {
    const res = await fn();
    return res ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Fetches timestamped real Learner history for V5 Calendar Activity Matrix & Recent Timeline.
 * Fails gracefully per stream so restricted roles/states never crash the Dashboard.
 */
export function useLearnerAnalyticsFeed(enabled = false) {
  const isBrowser = typeof window !== 'undefined';
  const active = Boolean(enabled && isBrowser);

  const mockHistoryQuery = useQuery({
    queryKey: ['learner', 'analytics-feed', 'mock-history'],
    queryFn: () => safeGet(getMockTestHistory, []),
    enabled: active,
    retry: false,
    staleTime: 60_000,
  });

  const practiceHistoryQuery = useQuery({
    queryKey: ['learner', 'analytics-feed', 'practice-history'],
    queryFn: () => safeGet(getPracticeHistory, []),
    enabled: active,
    retry: false,
    staleTime: 60_000,
  });

  const skillMonthlyQuery = useQuery({
    queryKey: ['learner', 'analytics-feed', 'skill-monthly'],
    queryFn: () => safeGet(() => getMonthlySkillAnalytics(6), null),
    enabled: active,
    retry: false,
    staleTime: 60_000,
  });

  const homeworkQuery = useQuery({
    queryKey: ['learner', 'analytics-feed', 'homework'],
    queryFn: () => safeGet(() => getCohortHomework(), []),
    enabled: active,
    retry: false,
    staleTime: 60_000,
  });

  return {
    mockHistory: Array.isArray(mockHistoryQuery.data) ? mockHistoryQuery.data : [],
    practiceHistory: Array.isArray(practiceHistoryQuery.data) ? practiceHistoryQuery.data : [],
    skillMonthly: skillMonthlyQuery.data || null,
    homeworkList: Array.isArray(homeworkQuery.data) ? homeworkQuery.data : [],
  };
}
