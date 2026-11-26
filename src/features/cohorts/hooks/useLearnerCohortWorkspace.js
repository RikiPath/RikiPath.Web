import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { describeApiError } from '@/api/apiErrors.js';
import { getSession } from '@/app/auth/session.js';
import { notify } from '@/components/ui';
import {
  courseGet,
  getCohortHomework,
  getCohorts,
  getMyEntitlements,
} from '@/features/cohorts/api/cohortApi';

const NO_RETRY = new Set([401, 403, 404]);

/**
 * Shared state + mutation runner for the Learner Group Learning workspace pages
 * (/group-learning, /cohorts, /my-courses, /my-courses/:courseId, /group-learning/progress).
 */
export function useLearnerCohortWorkspace({
  includeCohorts = false,
  includeEntitlements = false,
  includeHomework = false,
} = {}) {
  const queryClient = useQueryClient();
  const session = getSession();
  const uid = session?.userId ?? 'anon';
  const enabled = Boolean(session?.accessToken && !session?.isPreview);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  const coursesQuery = useQuery({
    queryKey: ['learner-cohort-workspace', 'courses', uid],
    queryFn: () => courseGet(),
    enabled,
    staleTime: 30_000,
    retry: (count, err) => !NO_RETRY.has(err?.status) && count < 1,
  });

  const cohortsQuery = useQuery({
    queryKey: ['learner-cohort-workspace', 'cohorts', uid],
    queryFn: () => getCohorts(),
    enabled: enabled && includeCohorts,
    staleTime: 60_000,
    retry: (count, err) => !NO_RETRY.has(err?.status) && count < 1,
  });

  const entitlementsQuery = useQuery({
    queryKey: ['learner-cohort-workspace', 'entitlements', uid],
    queryFn: () => getMyEntitlements(),
    enabled: enabled && includeEntitlements,
    staleTime: 60_000,
    retry: (count, err) => !NO_RETRY.has(err?.status) && count < 1,
  });

  const homeworksQuery = useQuery({
    queryKey: ['learner-cohort-workspace', 'homeworks', uid],
    queryFn: () => getCohortHomework(),
    enabled: enabled && includeHomework,
    staleTime: 30_000,
    retry: (count, err) => !NO_RETRY.has(err?.status) && count < 1,
  });

  const courses = useMemo(() => (Array.isArray(coursesQuery.data) ? coursesQuery.data : []), [coursesQuery.data]);
  const cohorts = useMemo(() => (Array.isArray(cohortsQuery.data) ? cohortsQuery.data : []), [cohortsQuery.data]);
  const entitlements = useMemo(() => (Array.isArray(entitlementsQuery.data) ? entitlementsQuery.data : []), [entitlementsQuery.data]);
  const homeworks = useMemo(() => (Array.isArray(homeworksQuery.data) ? homeworksQuery.data : []), [homeworksQuery.data]);

  const invalidateAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['learner-cohort-workspace'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace-calendar'] }),
      queryClient.invalidateQueries({ queryKey: ['homework-hub'] }),
      queryClient.invalidateQueries({ queryKey: ['learner-courses-summary'] }),
    ]);
  }, [queryClient]);

  const runAction = useCallback(
    async (fn, message = 'Đã lưu thay đổi.', options = {}) => {
      if (busy) return null;
      setBusy(true);
      setActionError('');
      setActionNotice('');
      const key = options.key || 'group-workspace-action';
      const toastId = options.silentLoading
        ? null
        : notify.loading(options.loading || 'Đang xử lý…', '', { key });
      try {
        const result = await fn();
        const resolved = typeof message === 'function' ? message(result) : message;
        if (resolved) {
          const tone = typeof options.tone === 'function' ? options.tone(result) : options.tone || 'success';
          setActionNotice(resolved);
          notify[tone](resolved, '', { id: toastId || undefined, key, replace: true });
        } else if (toastId) {
          notify.dismiss(toastId);
        }
        try {
          await invalidateAll();
        } catch {
          // Keep confirmed success feedback if background refresh fails transiently.
        }
        return result;
      } catch (err) {
        const info = describeApiError(err);
        setActionError(info.message);
        notify.apiError(err, options.errorTitle || 'Chưa thực hiện được', {
          id: toastId || undefined,
          key,
          replace: true,
        });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [busy, invalidateAll],
  );

  return {
    uid,
    courses,
    cohorts,
    entitlements,
    homeworks,
    coursesQuery,
    cohortsQuery,
    entitlementsQuery,
    homeworksQuery,
    busy,
    actionError,
    actionNotice,
    setActionError,
    setActionNotice,
    invalidateAll,
    runAction,
  };
}
