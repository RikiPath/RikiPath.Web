import { useCallback, useMemo, useRef, useState } from 'react';
import { enrollCohort, getCohorts } from '@/features/cohorts/api/cohortApi';
import { cohortDiscoveryStatusOf } from '@/features/cohorts/utils/cohortCardModel';
import { parseBusinessDate } from '@/utils/dateTimeFormat.js';
import { notify } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/**
 * Shared cohort detail modal, schedule conflict detection, live eligibility verification,
 * idempotent enrollment, and checkout flow used by both Discovery and Mentor Profile pages.
 */
export function useCohortEnrollmentFlow({
  cohorts = [],
  baseRows = null,
  enrolledCourses = [],
  initialDetailCohortId = null,
  nowMs = null,
  onRefresh,
  onRun,
  onEnrolled,
}) {
  const { tr } = useLocale();
  const [fallbackNowMs] = useState(() => Date.now());
  const effectiveNowMs = nowMs ?? fallbackNowMs;
  const effectiveRows = baseRows ?? cohorts;

  const [detailCohortId, setDetailCohortId] = useState(
    initialDetailCohortId ? Number(initialDetailCohortId) : null,
  );
  const [detailCohortSnapshot, setDetailCohortSnapshot] = useState(null);
  const [confirmCohort, setConfirmCohort] = useState(null);
  const [checkingCohortId, setCheckingCohortId] = useState(null);

  const idempotencyKeys = useRef({});
  const inFlight = useRef(false);

  const activeEnrolledWindows = useMemo(() => {
    const out = [];
    const fallbackName = tr('Lớp hiện tại');
    for (const c of enrolledCourses || []) {
      if (!c || c.status === 'Cancelled' || c.status === 'TransferredOut') continue;
      if (c.paymentStatus !== 'Paid' && c.paymentState !== 'AwaitingPayment' && c.paymentStatus !== 'Pending') continue;
      const mins = Number(c.sessionMinutes) || 0;
      for (const s of c.sessions || []) {
        if (s.status && s.status !== 'Scheduled' && s.status !== 'Confirmed' && s.status !== 'Assigned') continue;
        const start = parseBusinessDate(s.scheduledAt || s.startTime);
        if (!start) continue;
        const end = parseBusinessDate(s.endTime) || (mins > 0 ? new Date(start.getTime() + mins * 60000) : null);
        if (!end) continue;
        out.push({ cohortId: c.cohortId, name: c.cohortName || c.name || fallbackName, startMs: start.getTime(), endMs: end.getTime() });
      }
    }
    return out;
  }, [enrolledCourses, tr]);

  const scheduleConflictByCohortId = useMemo(() => {
    const map = new Map();
    if (!activeEnrolledWindows.length) return map;
    const sources = new Map();
    cohorts.forEach((c) => sources.set(Number(c.id), c));
    effectiveRows.forEach((c) => sources.set(Number(c.id), c));
    const fallbackName = tr('lớp học hiện tại');
    for (const cohort of sources.values()) {
      if (!cohort?.sessions?.length || cohort.myEnrollmentCourseId) continue;
      const mins = Number(cohort.sessionMinutes) || 0;
      const conflict = cohort.sessions.find((s) => {
        const sStart = parseBusinessDate(s.startTime || s.scheduledAt)?.getTime();
        const sEnd = parseBusinessDate(s.endTime)?.getTime() || (sStart && mins > 0 ? sStart + mins * 60000 : 0);
        if (!sStart || !sEnd) return false;
        return activeEnrolledWindows.some((w) => w.cohortId !== cohort.id && w.startMs < sEnd && sStart < w.endMs);
      });
      if (conflict) {
        const sStart = parseBusinessDate(conflict.startTime || conflict.scheduledAt)?.getTime() || 0;
        const sEnd = parseBusinessDate(conflict.endTime)?.getTime() || (mins > 0 ? sStart + mins * 60000 : sStart);
        const hit = activeEnrolledWindows.find((w) => w.cohortId !== cohort.id && w.startMs < sEnd && sStart < w.endMs);
        map.set(cohort.id, hit?.name || fallbackName);
      }
    }
    return map;
  }, [cohorts, effectiveRows, activeEnrolledWindows, tr]);

  const statusByCohortId = useMemo(() => {
    const map = new Map();
    const sources = new Map();
    cohorts.forEach((c) => sources.set(Number(c.id), c));
    effectiveRows.forEach((c) => sources.set(Number(c.id), c));
    for (const cohort of sources.values()) {
      map.set(
        Number(cohort.id),
        cohortDiscoveryStatusOf(cohort, {
          conflictCourseName: scheduleConflictByCohortId.get(cohort.id) || '',
          nowMs: effectiveNowMs,
        }),
      );
    }
    return map;
  }, [cohorts, effectiveRows, scheduleConflictByCohortId, effectiveNowMs]);

  const detailCohort = useMemo(() => {
    if (!detailCohortId) return null;
    const liveMatch = effectiveRows.find((c) => Number(c.id) === Number(detailCohortId))
      || cohorts.find((c) => Number(c.id) === Number(detailCohortId));
    if (liveMatch) return liveMatch;
    if (detailCohortSnapshot && Number(detailCohortSnapshot.id) === Number(detailCohortId)) {
      return {
        ...detailCohortSnapshot,
        isEnrollmentWindowOpen: false,
        enrollmentOpen: false,
      };
    }
    return null;
  }, [detailCohortId, effectiveRows, cohorts, detailCohortSnapshot]);

  const detailStatusInfo = detailCohort
    ? (statusByCohortId.get(Number(detailCohort.id))
      || cohortDiscoveryStatusOf(detailCohort, {
        conflictCourseName: scheduleConflictByCohortId.get(detailCohort.id) || '',
        nowMs: effectiveNowMs,
      }))
    : null;

  const handleOpenDetail = useCallback((cohort) => {
    if (!cohort) return;
    setDetailCohortId(cohort.id);
    setDetailCohortSnapshot(cohort);
    Promise.resolve(onRefresh?.()).catch(() => {});
  }, [onRefresh]);

  const handleCloseDetail = useCallback(() => {
    setDetailCohortId(null);
    setDetailCohortSnapshot(null);
  }, []);

  const handleRequestEnroll = useCallback(async (cohort) => {
    if (!cohort || inFlight.current || checkingCohortId) return;
    setCheckingCohortId(cohort.id);
    try {
      const latestList = await getCohorts();
      const freshCohort = (latestList || []).find((x) => Number(x.id) === Number(cohort.id));
      if (!freshCohort) {
        await onRefresh?.();
        notify.warning(tr('Lớp không còn mở đăng ký'), tr('Lớp học này vừa đóng tuyển sinh hoặc đã kết thúc thời hạn đăng ký.'));
        return;
      }
      const conflictCourseName = scheduleConflictByCohortId.get(freshCohort.id) || '';
      const freshStatus = cohortDiscoveryStatusOf(freshCohort, { conflictCourseName });
      if (freshStatus.actionKind === 'view_course' || freshStatus.actionKind === 'resume_payment') {
        onEnrolled?.(freshCohort.myEnrollmentCourseId, freshStatus.actionKind);
        return;
      }
      if (!freshStatus.canEnroll) {
        await onRefresh?.();
        notify.warning(tr('Chưa thể đăng ký lớp'), tr(freshStatus.disabledReason || 'Lớp đã đủ sĩ số hoặc trạng thái vừa thay đổi.'));
        return;
      }
      handleCloseDetail();
      setConfirmCohort(freshCohort);
    } catch (err) {
      notify.apiError(err, tr('Không kiểm tra được trạng thái lớp'));
    } finally {
      setCheckingCohortId(null);
    }
  }, [checkingCohortId, handleCloseDetail, onEnrolled, onRefresh, scheduleConflictByCohortId, tr]);

  const handleConfirmEnroll = useCallback(() => {
    if (!confirmCohort || inFlight.current) return;
    const cohort = confirmCohort;
    inFlight.current = true;
    const key = (idempotencyKeys.current[cohort.id] ||= crypto.randomUUID());
    const body = { idempotencyKey: key };
    if (cohort.hasApprovedEntitlement && cohort.entitlementReference) {
      body.entitlementReference = cohort.entitlementReference;
    }
    const executor = () => onRun(
      async () => {
        let res;
        try {
          res = await enrollCohort(cohort.id, body);
        } catch (err) {
          const status = err?.status ?? err?.response?.status;
          if (err?.errorCode || err?.response?.data?.errorCode || (status >= 400 && status < 500)) {
            delete idempotencyKeys.current[cohort.id];
          }
          if (['COHORT_FULL', 'COHORT_ENROLLMENT_CLOSED', 'COHORT_SCHEDULE_CONFLICT'].includes(err?.errorCode)) {
            setConfirmCohort(null);
          }
          throw err;
        }
        setConfirmCohort(null);
        delete idempotencyKeys.current[cohort.id];
        if (res?.paymentState === 'Confirmed' || res?.paymentStatus === 'Paid') {
          if (onEnrolled) onEnrolled(res.id, 'view_course');
        } else if (typeof res?.checkoutUrl === 'string' && res.checkoutUrl.startsWith('https://')) {
          window.location.assign(res.checkoutUrl);
        } else if (onEnrolled) {
          onEnrolled(res?.id, 'resume_payment');
        }
        return res;
      },
      (res) =>
        res?.paymentState === 'Confirmed' || res?.paymentStatus === 'Paid'
          ? 'Ghi danh lớp học nhóm thành công!'
          : 'Đã giữ chỗ và chuyển đến trang thanh toán. Ghi danh chỉ hoàn tất khi hệ thống xác nhận thanh toán.',
    );

    Promise.resolve(executor()).finally(() => {
      inFlight.current = false;
      onRefresh?.();
    });
  }, [confirmCohort, onEnrolled, onRefresh, onRun]);

  return {
    statusByCohortId,
    detailCohortId,
    setDetailCohortId,
    detailCohort,
    detailStatusInfo,
    confirmCohort,
    setConfirmCohort,
    checkingCohortId,
    handleOpenDetail,
    handleCloseDetail,
    handleRequestEnroll,
    handleConfirmEnroll,
  };
}
