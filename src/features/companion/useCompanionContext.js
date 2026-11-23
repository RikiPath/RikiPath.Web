import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/auth/authContext.js';
import { getSession } from '@/app/auth/session.js';
import { getCompletionStats, getSkillBreakdown, getStudyStreak } from '@/features/progress/api/analyticsApi.js';
import { getDailyReviewQueue } from '@/features/srs/api/reviewApi.js';
import { learnerKeys, learnerScopeKey, useLearnerProfile } from '@/features/dashboard/hooks/useLearnerHome.js';
import { useLearningPathAccess } from '@/features/learning-path/useLearningPathAccess.js';

/**
 * Aggregates real Backend learner metrics from shared React Query cache keys.
 * Zero mock data; stays lightweight when background tabs or inactive routes don't need fresh pulls.
 */
export function useCompanionContext({ active = false } = {}) {
  const { isAuthenticated, isLearner, session } = useAuth();
  const currentSession = session || getSession();
  const enabled = Boolean(active && isAuthenticated && isLearner && !currentSession?.isPreview);
  const scope = learnerScopeKey(currentSession);

  const profileQuery = useLearnerProfile();
  const roadmapAccess = useLearningPathAccess({ enabled });

  const streakQuery = useQuery({
    queryKey: [...learnerKeys.streak, ...scope],
    queryFn: getStudyStreak,
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  const completionQuery = useQuery({
    queryKey: [...learnerKeys.completion, ...scope],
    queryFn: getCompletionStats,
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  const srsQuery = useQuery({
    queryKey: [...learnerKeys.srs, ...scope],
    queryFn: getDailyReviewQueue,
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  const skillsQuery = useQuery({
    queryKey: [...learnerKeys.skills, ...scope],
    queryFn: getSkillBreakdown,
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  return useMemo(() => {
    const profile = profileQuery.data ?? null;
    const targetLevel = ['N5', 'N4', 'N3', 'N2', 'N1'].includes(profile?.targetJlptLevelName)
      ? profile.targetJlptLevelName
      : null;

    const streakRaw = streakQuery.data?.currentStreakDays;
    const streakDays = Number.isFinite(Number(streakRaw)) ? Number(streakRaw) : null;

    const completedRaw = completionQuery.data?.completedExercises ?? completionQuery.data?.completedLessons;
    const completedExercises = Number.isFinite(Number(completedRaw)) ? Number(completedRaw) : null;

    const dueRaw = srsQuery.data?.totalDue ?? srsQuery.data?.items?.length;
    const dueCards = Number.isFinite(Number(dueRaw)) ? Number(dueRaw) : null;
    const srsItems = Array.isArray(srsQuery.data?.items) ? srsQuery.data.items : [];

    return {
      targetLevel,
      targetJlptLevelId: profile?.targetJlptLevelId ?? null,
      displayName: profile?.fullName || currentSession?.fullName || null,
      streakDays,
      completedExercises,
      dueCards,
      srsItems,
      skillBreakdown: Array.isArray(skillsQuery.data) ? skillsQuery.data : [],
      hasPlacementCompleted: roadmapAccess.hasPlacementCompleted,
      hasActiveAiPath: roadmapAccess.hasActiveAiPath,
      dailySchedules: roadmapAccess.latestPath?.dailySchedules || [],
    };
  }, [
    profileQuery.data,
    currentSession?.fullName,
    streakQuery.data,
    completionQuery.data,
    srsQuery.data,
    skillsQuery.data,
    roadmapAccess.hasPlacementCompleted,
    roadmapAccess.hasActiveAiPath,
    roadmapAccess.latestPath?.dailySchedules,
  ]);
}
