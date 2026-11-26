import { MutationCache, QueryClient } from '@tanstack/react-query';
import { classifyApiErrorState } from './apiErrors.js';
import { notify } from '@/components/ui/feedbackStore.js';

const NO_RETRY_STATUSES = new Set([400, 401, 403, 404, 409, 413, 415, 422]);

/**
 * Bounded query retry policy: retries transient network / 5xx failures at most once,
 * and never retries client/auth/permission/conflict/cancelled errors or loops endlessly.
 */
export function shouldRetryQuery(failureCount, error) {
  if (failureCount >= 1) return false;
  if (!error || error.isCancelled || error.code === 'ERR_CANCELED') return false;
  const status = Number(error.status ?? error.response?.status) || 0;
  if (status && NO_RETRY_STATUSES.has(status)) return false;
  const state = classifyApiErrorState(error);
  if (state === 'unauthenticated' || state === 'forbidden' || state === 'business-conflict') return false;
  return state === 'network-error' || status === 0 || status >= 500 || status === 408 || status === 429;
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Fall back to global error toast if a mutation did not define its own onError handler.
      if (mutation?.options?.onError) return;
      if (mutation?.meta?.silentError) return;
      if (!error || error.isCancelled || error.code === 'ERR_CANCELED') return;
      notify.apiError(error);
    },
  }),
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
