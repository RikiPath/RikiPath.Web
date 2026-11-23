import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Coordinates safe scoped data refresh for a page or panel without touching unrelated caches,
 * losing user input, resetting filters/pagination, or allowing late stale responses to win.
 */
export function useSmartRefresh({
  queries = [],
  queryKeys = [],
  refetchers = [],
  includeInitialLoading = false,
  onError,
} = {}) {
  const queryClient = useQueryClient();
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const seqRef = useRef(0);
  const inFlightPromiseRef = useRef(null);
  const mountedRef = useRef(true);

  const validQueries = queries.filter(Boolean);
  const latestRef = useRef({ validQueries, queryKeys, refetchers, onError });
  useEffect(() => {
    latestRef.current = { validQueries, queryKeys, refetchers, onError };
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const queryFetching = validQueries.some((q) =>
    Boolean(q.isFetching) && (includeInitialLoading || !q.isPending),
  );
  const isInitialLoading = validQueries.length > 0 && validQueries.every((q) => Boolean(q.isPending));
  const isRefreshing = Boolean(manualRefreshing || queryFetching);

  const refresh = useCallback(async () => {
    if (inFlightPromiseRef.current) {
      return inFlightPromiseRef.current;
    }

    const seq = ++seqRef.current;
    setManualRefreshing(true);
    setRefreshError(null);

    const run = async () => {
      const {
        validQueries: curQueries,
        queryKeys: curKeys,
        refetchers: curRefetchers,
        onError: curOnError,
      } = latestRef.current;

      const tasks = [];
      const seenQueries = new Set();

      for (const q of curQueries) {
        if (typeof q?.refetch === 'function' && !seenQueries.has(q)) {
          seenQueries.add(q);
          tasks.push(
            Promise.resolve(q.refetch({ cancelRefetch: true })).then((res) => {
              if (res?.isError && res.error) throw res.error;
              return res;
            }),
          );
        }
      }

      if (queryClient && Array.isArray(curKeys) && curKeys.length > 0) {
        for (const queryKey of curKeys) {
          if (!queryKey) continue;
          tasks.push(
            queryClient.invalidateQueries(
              { queryKey, refetchType: 'active' },
              { cancelRefetch: true },
            ),
          );
        }
      }

      if (Array.isArray(curRefetchers)) {
        for (const fn of curRefetchers) {
          if (typeof fn === 'function') {
            tasks.push(Promise.resolve(fn()));
          }
        }
      }

      try {
        const results = await Promise.allSettled(tasks);
        const firstRejected = results.find((r) => r.status === 'rejected');
        if (firstRejected && mountedRef.current && seq === seqRef.current) {
          setRefreshError(firstRejected.reason);
          curOnError?.(firstRejected.reason);
        }
        return results;
      } finally {
        inFlightPromiseRef.current = null;
        if (mountedRef.current && seq === seqRef.current) {
          setManualRefreshing(false);
        }
      }
    };

    const promise = run();
    inFlightPromiseRef.current = promise;
    return promise;
  }, [queryClient]);

  return {
    refresh,
    isRefreshing,
    isInitialLoading,
    refreshError,
    queryError: validQueries.find((q) => q?.isError)?.error || refreshError || null,
  };
}

export default useSmartRefresh;
