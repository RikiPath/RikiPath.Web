import { useCallback, useEffect, useState } from 'react';

/**
 * Lightweight TanStack-Query-compatible hook for imperative API panels
 * so they integrate cleanly with `SmartDataBoundary` without duplicating loading/error/retry state.
 */
export function useAsyncResource(fetcher, deps = [], { enabled = true, initialData } = {}) {
  const [state, setState] = useState(() => ({
    data: initialData,
    error: null,
    isPending: Boolean(enabled),
    isFetching: Boolean(enabled),
  }));
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    if (!enabled) {
      Promise.resolve().then(() => {
        if (!alive) return;
        setState((prev) => ({ ...prev, isPending: false, isFetching: false }));
      });
      return () => {
        alive = false;
      };
    }
    Promise.resolve()
      .then(() => {
        if (!alive) return undefined;
        setState((prev) => ({
          ...prev,
          error: null,
          isPending: prev.data === undefined,
          isFetching: true,
        }));
        return fetcher();
      })
      .then((data) => {
        if (!alive) return;
        setState({ data, error: null, isPending: false, isFetching: false });
      })
      .catch((error) => {
        if (!alive) return;
        setState((prev) => ({ ...prev, error, isPending: false, isFetching: false }));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick, ...deps]);

  return {
    data: state.data,
    error: state.error,
    isError: Boolean(state.error),
    isPending: state.isPending,
    isLoading: state.isPending,
    isFetching: state.isFetching,
    isSuccess: !state.isPending && !state.error && state.data !== undefined,
    fetchStatus: state.isFetching ? 'fetching' : 'idle',
    refetch,
  };
}
