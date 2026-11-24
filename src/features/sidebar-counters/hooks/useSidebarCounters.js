import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/auth/authContext.js';
import { shouldRetryQuery } from '@/api/queryClient.js';
import {
  SIDEBAR_COUNTER_CHANNEL_NAME,
  SIDEBAR_COUNTER_STORAGE_KEY,
  clearSidebarCounterSnapshots,
  fetchSidebarCountersForScope,
  getCachedScopedCounters,
  getSidebarTabInstanceId,
  scheduleDebouncedSidebarCounterRefresh,
  sidebarCountersQueryKey,
} from '../api/sidebarCountersApi.js';
import { computeNextDueDelayMs } from '../sidebarCounterModel.js';

const POLL_INTERVAL_MS = 45_000;

/**
 * Single centralized sidebar counter hook mounted once at the top of AppShell.
 * Handles visibility-aware polling, SignalR/cross-tab sync, SRS due-time precision refresh,
 * out-of-order response protection, and stale data retention across offline/API failures.
 */
export function useSidebarCounters() {
  const { user, primaryRole, isAuthenticated, session } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.userId ?? null;
  const isPreview = Boolean(session?.isPreview);
  const enabled = Boolean(isAuthenticated && userId && !isPreview);

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  );
  const [isTabVisible, setIsTabVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  );

  useEffect(() => {
    if (!enabled) {
      clearSidebarCounterSnapshots();
    }
  }, [enabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onOnline = () => {
      setIsOnline(true);
      if (enabled) scheduleDebouncedSidebarCounterRefresh(queryClient, 150);
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [enabled, queryClient]);

  // Cross-tab synchronization scoped strictly to the same userId and ignoring self broadcasts.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    const selfTabId = getSidebarTabInstanceId();
    const currentUid = String(userId);
    const handleSyncPayload = (payload) => {
      if (!payload || payload.type !== 'invalidate') return;
      if (payload.tabId === selfTabId) return;
      if (String(payload.userId) !== currentUid) return;
      scheduleDebouncedSidebarCounterRefresh(queryClient, 200);
    };

    let channel = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(SIDEBAR_COUNTER_CHANNEL_NAME);
        channel.onmessage = (event) => handleSyncPayload(event?.data);
      } catch {
        channel = null;
      }
    }

    const onStorage = (event) => {
      if (event.key !== SIDEBAR_COUNTER_STORAGE_KEY || !event.newValue) return;
      try {
        handleSyncPayload(JSON.parse(event.newValue));
      } catch {
        // ignore malformed payload
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      if (channel) {
        try {
          channel.close();
        } catch {
          // ignore
        }
      }
    };
  }, [enabled, userId, queryClient]);

  const query = useQuery({
    queryKey: sidebarCountersQueryKey(userId, primaryRole),
    queryFn: () => fetchSidebarCountersForScope(userId, primaryRole),
    enabled,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => shouldRetryQuery(failureCount, error) && failureCount < 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return false;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
      return POLL_INTERVAL_MS;
    },
  });

  const cachedSameScope = enabled ? getCachedScopedCounters(userId, primaryRole) : null;
  const resolvedData = enabled ? (query.data || cachedSameScope) : null;

  // Pause badge attention animations when hidden and refetch as soon as tab regains visibility.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibility = () => {
      const visible = document.visibilityState === 'visible';
      setIsTabVisible(visible);
      if (enabled && visible && navigator.onLine !== false) {
        scheduleDebouncedSidebarCounterRefresh(queryClient, 250);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled, queryClient]);

  // Learner SRS time-due precision timer: updates due badge automatically when a scheduled card matures.
  const nextDueAtUtc = resolvedData?.nextDueAtUtc || null;
  useEffect(() => {
    if (!enabled || primaryRole !== 'Learner' || !nextDueAtUtc) return undefined;
    const delayMs = computeNextDueDelayMs(nextDueAtUtc);
    if (!delayMs) return undefined;
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: sidebarCountersQueryKey(userId, primaryRole) });
    }, delayMs);
    return () => clearTimeout(timer);
  }, [enabled, primaryRole, nextDueAtUtc, userId, queryClient]);

  return {
    role: resolvedData?.role || primaryRole,
    byKey: resolvedData?.byKey || {},
    updatedAtUtc: resolvedData?.updatedAtUtc || null,
    nextDueAtUtc,
    isTabVisible,
    isLoading: enabled && query.isPending && !resolvedData,
    isStale: Boolean(enabled && resolvedData && (query.isError || !isOnline)),
    isError: Boolean(query.isError),
    refetch: query.refetch,
  };
}
