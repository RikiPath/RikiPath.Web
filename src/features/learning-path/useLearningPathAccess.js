import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/auth/authContext.js';
import { getSession } from '@/app/auth/session.js';
import { useLearnerProfile } from '@/features/dashboard/hooks/useLearnerHome.js';
import { getPlacementStatus } from '@/features/placement/api/placementApi.js';
import { getLatestLearningPath } from './api/learningPathApi.js';
import { computeLearningFlowState } from './learningPathFlow.js';

export function aiLearningPathQueryKey(userId) {
  return ['ai-learning-path', userId ?? 'anon'];
}

export function placementStatusQueryKey(userId) {
  return ['learner', 'placement-status', userId ?? 'anon'];
}

/**
 * Shared Backend source of truth for step-by-step Goal -> Placement -> AI Learning Path locking.
 * Never unlocks `/roadmap` via local state; only `status === 'ACTIVE'` from Backend opens it.
 */
export function useLearningPathAccess({ enabled: enabledOverride } = {}) {
  const { isAuthenticated, isLearner, session, user } = useAuth();
  const activeSession = session || getSession();
  const userId = user?.userId ?? activeSession?.userId;
  const queryClient = useQueryClient();

  const enabled = enabledOverride ?? Boolean(isAuthenticated && isLearner && !activeSession?.isPreview);

  const profileQuery = useLearnerProfile();

  const placementQuery = useQuery({
    queryKey: placementStatusQueryKey(userId),
    queryFn: getPlacementStatus,
    enabled,
    staleTime: 60_000,
    retry: (count, err) => err?.status !== 401 && count < 1,
  });

  const latestQuery = useQuery({
    queryKey: aiLearningPathQueryKey(userId),
    queryFn: async () => {
      try {
        return await getLatestLearningPath();
      } catch (err) {
        if (err?.status === 404) return null;
        throw err;
      }
    },
    enabled,
    staleTime: 60_000,
    retry: (count, err) => err?.status !== 401 && err?.status !== 404 && count < 1,
  });

  const flow = useMemo(
    () =>
      computeLearningFlowState({
        profile: profileQuery.data,
        placementStatus: placementQuery.data,
        latestPath: latestQuery.data,
        isPending: enabled && latestQuery.isPending,
        isError: enabled && latestQuery.isError,
      }),
    [
      enabled,
      profileQuery.data,
      placementQuery.data,
      latestQuery.data,
      latestQuery.isPending,
      latestQuery.isError,
    ],
  );

  const setLatestPath = useCallback(
    (nextPath) => {
      queryClient.setQueryData(aiLearningPathQueryKey(userId), nextPath ?? null);
    },
    [queryClient, userId],
  );

  const refetchAll = useCallback(async () => {
    await Promise.all([
      profileQuery.refetch(),
      placementQuery.refetch(),
      latestQuery.refetch(),
    ]);
  }, [profileQuery, placementQuery, latestQuery]);

  return {
    ...flow,
    enabled,
    profile: profileQuery.data ?? null,
    placementStatus: placementQuery.data ?? null,
    latestPath: latestQuery.data ?? null,
    isPending: enabled && (latestQuery.isPending || profileQuery.isPending || placementQuery.isPending),
    isFetching: enabled && (latestQuery.isFetching || profileQuery.isFetching || placementQuery.isFetching),
    isError: enabled && latestQuery.isError,
    error: latestQuery.error ?? null,
    setLatestPath,
    refetch: refetchAll,
    latestQuery,
  };
}
