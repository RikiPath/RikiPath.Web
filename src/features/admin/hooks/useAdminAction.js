import { useCallback, useState } from 'react';
import { describeApiError } from '@/api/apiErrors.js';
import { queryClient } from '@/api/queryClient.js';
import { notify } from '@/components/ui';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';

/**
 * Shared mutation runner for Admin Console V2 panels and pages.
 * Handles busy gating, loading/success/API error toasts, and optional data refresh.
 */
export function useAdminAction({ toastKey = 'admin-action', defaultErrorTitle = 'Chưa thực hiện được', onAfterSuccess } = {}) {
  const [busy, setBusy] = useState(false);

  const runAction = useCallback(async (fn, message = 'Đã lưu thay đổi.', opts = {}) => {
    if (busy) return null;
    setBusy(true);
    const key = opts.key || toastKey;
    const toastId = opts.silentLoading ? null : notify.loading(opts.loading || 'Đang xử lý…', '', { key });
    try {
      const result = await fn();
      const resolved = typeof message === 'function' ? message(result) : message;
      if (resolved) {
        notify.success(resolved, '', { id: toastId || undefined, key, replace: true });
      } else if (toastId) {
        notify.dismiss(toastId);
      }
      invalidateSidebarCounters(queryClient);
      if (onAfterSuccess) {
        try {
          await onAfterSuccess(result);
        } catch {
          // Keep the confirmed success state if a follow-up background refresh fails transiently.
        }
      }
      return result;
    } catch (e) {
      const info = describeApiError(e);
      notify.apiError(e, opts.errorTitle || defaultErrorTitle, { id: toastId || undefined, key, replace: true });
      if (
        (info.code === 'CONCURRENCY_CONFLICT'
          || info.code === 'COHORT_SCHEDULE_REVISION_CONFLICT'
          || info.code === 'COHORT_FULL')
        && opts.onConflict
      ) {
        await opts.onConflict();
      }
      return null;
    } finally {
      setBusy(false);
    }
  }, [busy, defaultErrorTitle, onAfterSuccess, toastKey]);

  return { busy, runAction };
}
