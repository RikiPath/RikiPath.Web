import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/auth/authContext.js';
import { getSession } from '@/app/auth/session.js';
import { useLearnerProfile } from '@/features/dashboard/hooks/useLearnerHome.js';
import { getPlacementStatus, skipStandardPlacement } from '@/features/placement/api/placementApi.js';
import { activateStandardRoadmap, getLatestLearningPath } from './api/learningPathApi.js';
import { computeLearningFlowState } from './learningPathFlow.js';

export function aiLearningPathQueryKey(userId) {
  return ['ai-learning-path', userId ?? 'anon'];
}

export function placementStatusQueryKey(userId) {
  return ['learner', 'placement-status', userId ?? 'anon'];
}

/**
 * Invalidates every learner setup, placement, completion, learning moment, and roadmap cache atomically
 * after a goal change, placement submission, explicit placement skip, or roadmap mutation.
 */
export async function invalidateLearnerSetupQueries(queryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['learner'] }),
    queryClient.invalidateQueries({ queryKey: ['assessment-roadmap'] }),
    queryClient.invalidateQueries({ queryKey: ['ai-learning-path'] }),
    queryClient.invalidateQueries({ queryKey: ['placement-assessment'] }),
    queryClient.invalidateQueries({ queryKey: ['placement-status'] }),
    queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
    queryClient.invalidateQueries({ queryKey: ['learning-moments'] }),
    queryClient.invalidateQueries({ queryKey: ['study-subscription'] }),
  ]);
}

/**
 * Shared Backend source of truth for step-by-step Goal -> Placement -> Standard/AI Roadmap readiness.
 * Never unlocks `/roadmap` via local state; derives strictly from Backend responses.
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
    staleTime: 30_000,
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
    staleTime: 30_000,
    retry: (count, err) => err?.status !== 401 && err?.status !== 404 && count < 1,
  });

  const authoritativelyPending = enabled && (profileQuery.isPending || placementQuery.isPending || latestQuery.isPending);
  const authoritativelyErrored = enabled && profileQuery.isError && !profileQuery.data;

  const flow = useMemo(
    () =>
      computeLearningFlowState({
        profile: profileQuery.data,
        placementStatus: placementQuery.data,
        latestPath: latestQuery.data,
        setupState: profileQuery.data?.setupState ?? null,
        isPending: authoritativelyPending,
        isError: authoritativelyErrored || (enabled && latestQuery.isError),
      }),
    [
      enabled,
      profileQuery.data,
      placementQuery.data,
      latestQuery.data,
      authoritativelyPending,
      authoritativelyErrored,
      latestQuery.isError,
    ],
  );

  const skipPlacementMutation = useMutation({
    mutationFn: () => skipStandardPlacement(),
    onSuccess: async () => {
      await invalidateLearnerSetupQueries(queryClient);
    },
  });

  const activateStandardMutation = useMutation({
    mutationFn: () => activateStandardRoadmap(),
    onSuccess: async () => {
      await invalidateLearnerSetupQueries(queryClient);
    },
  });

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
    setupState: profileQuery.data?.setupState ?? null,
    placementStatusData: placementQuery.data ?? null,
    placementStatus: placementQuery.data ?? null,
    placementState: flow.placementStatus,
    latestPath: latestQuery.data ?? null,
    isPending: authoritativelyPending,
    isFetching: enabled && (latestQuery.isFetching || profileQuery.isFetching || placementQuery.isFetching),
    isError: authoritativelyErrored || (enabled && latestQuery.isError && !profileQuery.data?.setupState),
    error: profileQuery.error ?? latestQuery.error ?? null,
    setLatestPath,
    refetch: refetchAll,
    latestQuery,
    skipPlacement: skipPlacementMutation.mutateAsync,
    skippingPlacement: skipPlacementMutation.isPending,
    skipPlacementError: skipPlacementMutation.error ?? null,
    activateStandardRoadmap: activateStandardMutation.mutateAsync,
    activatingStandardRoadmap: activateStandardMutation.isPending,
    activateStandardError: activateStandardMutation.error ?? null,
  };
}
