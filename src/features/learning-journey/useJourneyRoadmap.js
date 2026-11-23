import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/auth/authContext.js';
import { getAdaptiveRoadmap } from '@/features/learning-path/api/learningPathApi.js';
import { getMySubscription } from '@/features/checkout/api/subscriptionApi.js';
import { journeyOverview } from './journeyModel.js';

/** Query key prefix shared by every screen of the Standard (system) roadmap. */
export const ROADMAP_QUERY_KEY = 'assessment-roadmap';

/**
 * Single source for Standard Roadmap data used by the Journey Map, Stage Detail and Lesson Player.
 * Data comes from `GET /StandardRoadmap/adaptive` (Adaptive Roadmap V2) — never recomputed here.
 */
export function useJourneyRoadmap({ enabled: enabledProp = true } = {}) {
  const { isAuthenticated, isLearner, session, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.userId;
  const isPreview = Boolean(session?.isPreview);
  const enabled = enabledProp && isAuthenticated && isLearner && !isPreview;

  const roadmapQuery = useQuery({
    queryKey: [ROADMAP_QUERY_KEY, userId, 'live'],
    queryFn: getAdaptiveRoadmap,
    enabled,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const subscriptionQuery = useQuery({
    queryKey: ['study-subscription', session?.userId ?? userId],
    queryFn: getMySubscription,
    enabled,
    retry: false,
    staleTime: 0,
  });

  const roadmap = roadmapQuery.data ?? null;
  const overview = journeyOverview(roadmap);
  const canOpenLessons = subscriptionQuery.data?.active === true;
  const requiresPlan = subscriptionQuery.isSuccess && !canOpenLessons;

  const refresh = useCallback(async () => {
    const [res] = await Promise.all([
      queryClient.invalidateQueries({ queryKey: [ROADMAP_QUERY_KEY] }).then(() => roadmapQuery.refetch()),
      queryClient.invalidateQueries({ queryKey: ['self-study-catalog'] }),
      queryClient.invalidateQueries({ queryKey: ['learner', 'study-streak'] }),
      queryClient.invalidateQueries({ queryKey: ['learner', 'completion-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['learner', 'notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['learner', 'skill-breakdown'] }),
    ]);
    return res?.data ?? null;
  }, [queryClient, roadmapQuery]);

  return {
    enabled,
    isPreview,
    userId,
    roadmapQuery,
    roadmap,
    overview,
    subscriptionQuery,
    canOpenLessons,
    requiresPlan,
    errorCode: roadmapQuery.error?.data?.errorCode ?? null,
    refresh,
  };
}
