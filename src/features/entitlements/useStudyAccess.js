import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/auth/authContext.js';
import { getSession } from '@/app/auth/session.js';
import { getMySubscription } from '@/features/checkout/api/subscriptionApi.js';
import { LOCK_REASON } from './studyUnlock.js';
import { ACCESS, featureLockReason, featureLockState, studyAccessStatus } from './featureAccess.js';

/** Shared React Query key — every consumer (sidebar, search, dashboard, route gate, plans page) reads one cache entry. */
export function studyAccessQueryKey(userId) {
  return ['study-subscription', userId];
}

/**
 * One entitlement source for the whole Learner UI.
 * `freshness: 'strict'` (route gate) always revalidates on mount; navigation surfaces reuse a short cache so
 * opening pages does not refetch on every click. Focus refetch + `invalidateQueries(['study-subscription'])`
 * (payment receipt, AI credit use) update every lock as soon as the Backend confirms a change.
 */
export function useStudyAccess({ freshness = 'nav' } = {}) {
  const { isAuthenticated, isLearner } = useAuth();
  const session = getSession();
  const enabled = Boolean(isAuthenticated && isLearner && !session?.isPreview);

  const query = useQuery({
    queryKey: studyAccessQueryKey(session?.userId),
    queryFn: getMySubscription,
    enabled,
    retry: false,
    staleTime: freshness === 'strict' ? 0 : 30_000,
  });

  const status = studyAccessStatus({
    enabled,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    data: query.data,
  });

  const features = useMemo(
    () => (Array.isArray(query.data?.features) ? query.data.features : []),
    [query.data],
  );

  const featureByCode = useMemo(() => {
    const map = {};
    for (const item of features) {
      const code = String(item?.code || '').trim().toUpperCase();
      if (code) map[code] = item;
    }
    return map;
  }, [features]);

  const lockStateFor = useCallback(
    (to) => featureLockState(to, status, features),
    [status, features],
  );

  const lockReasonFor = useCallback(
    (to) => featureLockReason(to, features, LOCK_REASON),
    [features],
  );

  return {
    status,
    query,
    data: query.data,
    features,
    featureByCode,
    isActive: status === ACCESS.ACTIVE,
    lockStateFor,
    lockReasonFor,
    isLocked: (to) => lockStateFor(to) === 'locked',
    refetch: query.refetch,
  };
}
