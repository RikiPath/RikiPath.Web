import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookCheck, CalendarDays, CheckCircle2, Clock, Users } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import HoldCountdown from '@/features/checkout/components/HoldCountdown.jsx';
import { holdSecondsLeft } from '@/features/checkout/utils/hold.js';
import { recordDiagnostic } from '@/api/diagnostics.js';
import { paymentStateMessage } from '@/api/apiErrors.js';
import { reconcileCoursePayment } from '@/features/cohorts/api/cohortApi';
import { useLearnerCohortWorkspace } from '@/features/cohorts/hooks/useLearnerCohortWorkspace.js';
import { isConfirmedCourseAccess, isPendingPaymentCourse, isVisibleInMyCourses } from '@/features/cohorts/utils/completionHelpers';
import OccupancyProgressBar from '@/features/cohorts/components/OccupancyProgressBar.jsx';
import { displayCourseTitle, getSessionJoinState } from '@/features/calendar/utils/calendarEventsModel.js';
import { computeClassProgress, resolveCourseLifecycle } from '@/features/scheduling/utils/teachingLifecycleModel.js';
import { formatTuitionVnd } from '@/features/scheduling/utils/proposalValidation.js';
import { formatDate } from '@/utils/dateTimeFormat.js';
import { formatVnDateTime, parseUtcDate } from '@/utils/vnDateTime.js';
import { useNow } from '@/hooks/useNow.js';
import { useLocale } from '@/locales/locale.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  Modal,
  PageContainer,
  ProgressBar,
  RefreshingIndicator,
  SakuraLoader,
  UserAvatar,
  cx,
  notify,
} from '@/components/ui';
import { StatusBadge } from '@/features/admin/components/AdminPrimitives.jsx';
import { IllustratedPageHeader } from '@/features/learner-ui';

const PAYOS_RETURN_KEYS = ['code', 'id', 'cancel', 'status', 'orderCode', 'paymentReturn', 'paymentCancel'];
const COHORT_ORDER_PREFIX = 700_000_000;
const CANCELLED_SESSION_STATUSES = new Set(['Cancelled', 'CancelledByMentor', 'CancelledByLearner', 'TransferredOut']);

function parseReturnedCohortCourseId(params) {
  const raw = params?.get('orderCode') ?? '';
  if (/^[0-9]+$/.test(raw)) {
    const orderCode = Number(raw);
    if (Number.isSafeInteger(orderCode) && orderCode > COHORT_ORDER_PREFIX) {
      return orderCode - COHORT_ORDER_PREFIX;
    }
  }
  const direct = Number(params?.get('courseId') ?? 0);
  return Number.isSafeInteger(direct) && direct > 0 ? direct : 0;
}

function PendingPaymentAction({ checkoutUrl, expiresAt, label }) {
  const now = useNow(1000);
  const left = holdSecondsLeft(expiresAt, now);
  const expired = left !== null && left <= 0;

  if (expired || !checkoutUrl) {
    return null;
  }

  return (
    <a
      href={checkoutUrl}
      className="rp-focus inline-flex h-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 px-4 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-200/80"
    >
      {label}
    </a>
  );
}

export default function LearnerMyCoursesPage() {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const nowMs = useNow(1000);

  const tabParam = searchParams.get('tab');
  const mentorIdParam = searchParams.get('mentorId');
  const legacyCourseIdParam = Number(searchParams.get('courseId'));
  const legacyCohortIdParam = Number(searchParams.get('cohortId'));
  const hasPayOsCallback = PAYOS_RETURN_KEYS.some((key) => searchParams.has(key));
  const returnedCourseId = parseReturnedCohortCourseId(searchParams);

  const [confirmedEnrollment, setConfirmedEnrollment] = useState(null);
  const reconcileRanRef = useRef(false);
  const autoReconcileInFlightRef = useRef(false);
  const lastAutoSyncAtRef = useRef(0);
  const expiredReconciledIdsRef = useRef(new Set());

  const workspace = useLearnerCohortWorkspace({ includeHomework: true });
  const {
    courses,
    homeworks,
    coursesQuery,
    actionError,
    actionNotice,
    setActionError,
    setActionNotice,
    invalidateAll,
  } = workspace;

  const visibleCourses = useMemo(
    () => courses.filter((c) => isVisibleInMyCourses(c, nowMs)),
    [courses, nowMs],
  );

  // Khi đồng hồ giữ chỗ vừa về 0, tự động đối soát với Backend để giải phóng chỗ & cập nhật toàn bộ workspace không cần reload.
  useEffect(() => {
    if (hasPayOsCallback || coursesQuery.isPending) return;
    const justExpiredIds = courses
      .filter((c) => {
        if (c.paymentStatus !== 'Pending' || !c.paymentExpiresAt) return false;
        const left = holdSecondsLeft(c.paymentExpiresAt, nowMs);
        return left !== null && left <= 0 && !expiredReconciledIdsRef.current.has(c.id);
      })
      .map((c) => c.id);
    if (justExpiredIds.length === 0) return;

    justExpiredIds.forEach((id) => expiredReconciledIdsRef.current.add(id));
    Promise.all(justExpiredIds.map((id) => reconcileCoursePayment(id).catch(() => null)))
      .finally(() => {
        invalidateAll();
      });
  }, [courses, nowMs, hasPayOsCallback, coursesQuery.isPending, invalidateAll]);

  // Bounded backoff reconciliation when returning from PayOS checkout (never infinite polling).
  useEffect(() => {
    if (!hasPayOsCallback || reconcileRanRef.current || coursesQuery.isPending) return;
    const pendingIds = courses.filter((c) => c.paymentStatus === 'Pending').map((c) => c.id);
    const targetIds = returnedCourseId > 0 ? new Set([returnedCourseId, ...pendingIds]) : new Set(pendingIds);
    reconcileRanRef.current = true;
    if (targetIds.size === 0) return;

    let cancelled = false;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function reconcileOnce(id) {
      return reconcileCoursePayment(id).catch((err) => {
        recordDiagnostic({
          scope: 'payment-reconcile',
          component: 'LearnerMyCoursesPage',
          endpoint: `/study-courses/${id}/payment/reconcile`,
          status: err?.status ?? null,
          code: err?.errorCode ?? null,
          technicalDetail: err?.message,
        });
        return null;
      });
    }

    (async () => {
      const delays = [0, 2000, 4000];
      let latestReturned = null;
      for (const delay of delays) {
        if (cancelled) return;
        if (delay > 0) await sleep(delay);
        const results = await Promise.all([...targetIds].map((id) => reconcileOnce(id)));
        latestReturned = returnedCourseId > 0
          ? results.find((r) => r?.id === returnedCourseId) || results[0]
          : results[0];
        if (!latestReturned) break;
        const settled = latestReturned.paymentState === 'Confirmed'
          || latestReturned.paymentStatus === 'Paid'
          || latestReturned.paymentState === 'Expired'
          || latestReturned.paymentState === 'Failed'
          || latestReturned.paymentState === 'Cancelled'
          || latestReturned.paymentState === 'PaidUnderReview';
        if (settled) break;
      }

      if (cancelled) return;
      await invalidateAll();

      if (latestReturned?.paymentState === 'Confirmed' || latestReturned?.paymentStatus === 'Paid') {
        const matched = courses.find((c) => Number(c.id) === Number(latestReturned.id || returnedCourseId)) || latestReturned;
        setConfirmedEnrollment({
          id: latestReturned.id || matched?.id || returnedCourseId,
          name: displayCourseTitle(matched || latestReturned, tr('Lớp học nhóm')),
          level: matched?.level || latestReturned.level || '',
          mentorName: matched?.mentorName || latestReturned.mentorName || '',
          startsAt: matched?.startsAt || latestReturned.startsAt || null,
          amount: matched?.amount ?? latestReturned.amount ?? 0,
          totalSessions: matched?.totalSessions ?? latestReturned.totalSessions ?? 0,
        });
        const msg = tr('Bạn đã đăng ký lớp học thành công!');
        setActionNotice(msg);
        notify.success(msg, '', { key: 'cohort-payos-return' });
      } else if (latestReturned?.paymentState && paymentStateMessage(latestReturned.paymentState)) {
        const msg = paymentStateMessage(latestReturned.paymentState);
        setActionNotice(msg);
        notify.info(msg, '', { key: 'cohort-payos-return' });
      }

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          PAYOS_RETURN_KEYS.forEach((k) => next.delete(k));
          if (latestReturned?.paymentState === 'Confirmed' || latestReturned?.paymentStatus === 'Paid') {
            next.delete('courseId');
          }
          return next;
        },
        { replace: true },
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [hasPayOsCallback, courses, coursesQuery.isPending, returnedCourseId, invalidateAll, navigate, setActionNotice, setSearchParams, tr]);

  const pendingCourseIdsKey = useMemo(
    () => courses.filter((c) => isPendingPaymentCourse(c, nowMs)).map((c) => c.id).join(','),
    [courses, nowMs],
  );

  const syncPendingCourses = useCallback(async () => {
    const ids = pendingCourseIdsKey ? pendingCourseIdsKey.split(',').map(Number).filter(Boolean) : [];
    if (ids.length === 0 || autoReconcileInFlightRef.current) return;
    const now = Date.now();
    if (now - lastAutoSyncAtRef.current < 2000) return;

    autoReconcileInFlightRef.current = true;
    lastAutoSyncAtRef.current = now;
    try {
      const results = await Promise.all(
        ids.map((id) => reconcileCoursePayment(id).catch(() => null)),
      );
      const validResults = results.filter(Boolean);
      const settled = validResults.some(
        (res) =>
          res.paymentState === 'Confirmed'
          || res.paymentStatus === 'Paid'
          || (res.paymentStatus && res.paymentStatus !== 'Pending'),
      );
      if (settled) {
        await invalidateAll();
        const confirmed = validResults.find((res) => res.paymentState === 'Confirmed' || res.paymentStatus === 'Paid');
        if (confirmed) {
          const msg = tr('Bạn đã đăng ký lớp học thành công!');
          setActionNotice(msg);
          notify.success(msg, '', { key: 'cohort-auto-reconcile' });
        }
      }
    } finally {
      autoReconcileInFlightRef.current = false;
    }
  }, [pendingCourseIdsKey, invalidateAll, setActionNotice, tr]);

  // Auto-sync pending payment holds on window return / focus and bounded interval while holds exist.
  useEffect(() => {
    if (!pendingCourseIdsKey || hasPayOsCallback || coursesQuery.isPending) return undefined;

    let cancelled = false;
    let ticks = 0;
    const MAX_TICKS = 120;

    const triggerSync = () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      syncPendingCourses();
    };

    window.addEventListener('focus', triggerSync);
    document.addEventListener('visibilitychange', triggerSync);
    const timerId = window.setInterval(() => {
      if (cancelled || document.visibilityState === 'hidden') return;
      ticks += 1;
      if (ticks > MAX_TICKS) {
        window.clearInterval(timerId);
        return;
      }
      syncPendingCourses();
    }, 5000);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', triggerSync);
      document.removeEventListener('visibilitychange', triggerSync);
      window.clearInterval(timerId);
    };
  }, [pendingCourseIdsKey, hasPayOsCallback, coursesQuery.isPending, syncPendingCourses]);

  const pendingHomeworkByCohort = useMemo(() => {
    const map = new Map();
    homeworks.forEach((hw) => {
      if (!hw.cohortId || hw.status === 'Graded' || hw.submission) return;
      map.set(hw.cohortId, (map.get(hw.cohortId) || 0) + 1);
    });
    return map;
  }, [homeworks]);

  // Preserve deep-link compatibility for legacy /my-courses?tab=cohorts, ?mentorId=X, ?courseId=X, or ?cohortId=X.
  if ((tabParam === 'cohorts' || Boolean(mentorIdParam)) && !hasPayOsCallback) {
    return <Navigate to={mentorIdParam ? `/cohorts?mentorId=${encodeURIComponent(mentorIdParam)}` : '/cohorts'} replace />;
  }
  if (legacyCourseIdParam > 0 && !hasPayOsCallback && !coursesQuery.isLoading) {
    const matched = courses.find((c) => Number(c.id) === legacyCourseIdParam);
    if (matched && isConfirmedCourseAccess(matched)) {
      return <Navigate to={`/my-courses/${legacyCourseIdParam}`} replace />;
    }
  }
  if (legacyCohortIdParam > 0 && !coursesQuery.isLoading && !hasPayOsCallback) {
    const matched = courses.find((c) => Number(c.cohortId) === legacyCohortIdParam);
    if (matched && isConfirmedCourseAccess(matched)) return <Navigate to={`/my-courses/${matched.id}`} replace />;
    if (!matched) return <Navigate to="/cohorts" replace />;
  }

  return (
    <LearnerShell breadcrumb={tr('Lớp của tôi')}>
      <PageContainer width="default" className="space-y-6">
        <IllustratedPageHeader
          icon="group"
          tone="sky"
          eyebrow={tr('Học nhóm')}
          title={tr('Lớp học của tôi')}
          description={tr('Mỗi lớp có không gian riêng với lịch học, bài tập, điểm danh và hỗ trợ theo đúng ngữ cảnh.')}
        />

        {coursesQuery.isFetching && !coursesQuery.isPending && (
          <div className="pointer-events-none sticky top-2 z-20 h-0 overflow-visible">
            <div className="flex justify-end">
              <div className="pointer-events-auto">
                <RefreshingIndicator active delay={60} />
              </div>
            </div>
          </div>
        )}

        {actionError && (
          <Banner tone="danger" title={tr('Chưa thực hiện được')} onDismiss={() => setActionError('')}>
            {actionError}
          </Banner>
        )}
        {actionNotice && (
          <Banner tone="success" title={tr('Thông báo')} onDismiss={() => setActionNotice('')}>
            {actionNotice}
          </Banner>
        )}

        {coursesQuery.isPending ? (
          <Card className="p-8">
            <SakuraLoader context="cohort" label={tr('Đang tải danh sách lớp của bạn...')} />
          </Card>
        ) : coursesQuery.isError ? (
          <Card className="p-6">
            <ContextualErrorState
              error={coursesQuery.error}
              title={tr('Chưa tải được lớp của bạn')}
              onRetry={() => coursesQuery.refetch()}
              retrying={coursesQuery.isFetching}
            />
          </Card>
        ) : visibleCourses.length === 0 ? (
          <Card className="p-6">
            <ContextualEmptyState
              context="groupLearning"
              illustration="classroom"
              title={tr('Bạn chưa có lớp học nào')}
              description={tr('Khám phá các lớp JLPT theo cấp độ phù hợp để học trực tiếp cùng Giáo viên.')}
              action={
                <Link
                  to="/cohorts"
                  className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-4 text-sm font-semibold text-white hover:bg-rp-brand-strong"
                >
                  {tr('Khám phá lớp học')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {visibleCourses.map((course) => {
              const title = displayCourseTitle(course, tr('Lớp học nhóm'));
              const confirmed = isConfirmedCourseAccess(course);
              const pendingPayment = isPendingPaymentCourse(course, nowMs);
              const lifecycle = confirmed
                ? resolveCourseLifecycle(course, nowMs)
                : { id: 'PendingPayment', label: 'Chờ thanh toán', tone: 'warning' };
              const sessions = confirmed && Array.isArray(course.sessions) ? course.sessions : [];
              const sessionMinutes = course.sessionMinutes || 90;
              const validSessions = sessions
                .filter((s) => s && !CANCELLED_SESSION_STATUSES.has(s.status))
                .sort((a, b) => (parseUtcDate(a.scheduledAt)?.getTime() ?? 0) - (parseUtcDate(b.scheduledAt)?.getTime() ?? 0));
              const firstValidSession = validSessions[0] || null;
              const nextSession = validSessions.find((s) => {
                if (s.status !== 'Scheduled') return false;
                const startMs = parseUtcDate(s.scheduledAt)?.getTime() ?? 0;
                return startMs + sessionMinutes * 60_000 >= nowMs - 30 * 60_000;
              }) || null;

              const progress = computeClassProgress(sessions, course.totalSessions || validSessions.length);
              const totalSessionsCount = progress.totalSessions || course.totalSessions || validSessions.length || 0;
              const weeksCount = course.cohortCourseDurationWeeks
                || (totalSessionsCount > 0 && course.sessionsPerWeek > 0
                  ? Math.max(1, Math.ceil(totalSessionsCount / course.sessionsPerWeek))
                  : null);
              const capacity = Number(course.cohortCapacity ?? course.capacitySnapshot ?? 0) || 0;
              const confirmedCount = Math.max(
                confirmed ? 1 : 0,
                Number(course.cohortConfirmedEnrolledCount ?? 0) || 0,
              );
              const joinState = confirmed && nextSession
                ? getSessionJoinState(nextSession, course, nowMs, { lifecycleId: lifecycle.id })
                : null;
              const hwPending = confirmed && course.cohortId ? pendingHomeworkByCohort.get(course.cohortId) || 0 : 0;

              return (
                <Card
                  key={course.id}
                  className={cx(
                    'flex flex-col justify-between gap-4 p-5',
                    confirmed && 'rp-card-hover',
                  )}
                >
                  <div className="space-y-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge tone={lifecycle.tone} label={lifecycle.label} />
                          {course.level && (
                            <Badge tone="brand" size="sm" icon={false}>
                              JLPT {course.level}
                            </Badge>
                          )}
                          {confirmed && lifecycle.id === 'Teaching' && joinState?.isLive && (
                            <StatusBadge tone="success" label="Phòng đang mở" />
                          )}
                        </div>
                        <h2 className="mt-2 text-lg font-bold text-rp-text">{title}</h2>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-rp-text-muted">
                          <UserAvatar
                            src={course.mentorAvatarUrl}
                            name={course.mentorName || tr('Giáo viên')}
                            size="xs"
                          />
                          <span>
                            {tr('Giáo viên:')}{' '}
                            <span className="font-semibold text-rp-text">{course.mentorName || tr('Chưa phân công')}</span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {trf('{0} buổi', { 0: totalSessionsCount })}
                            {weeksCount ? ` · ${trf('{0} tuần', { 0: weeksCount })}` : ''}
                            {` · ${trf('{0} phút/buổi', { 0: sessionMinutes })}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!confirmed ? (
                      <>
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3.5 py-2.5 text-xs">
                          <span className="text-rp-text-muted">{tr('Học phí trọn khóa')}</span>
                          <span className="text-sm font-bold tabular-nums text-rp-brand-strong">
                            {Number(course.amount) > 0 ? formatTuitionVnd(course.amount) : tr('Miễn phí')}
                          </span>
                        </div>

                        {pendingPayment && course.paymentExpiresAt && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2">
                            <HoldCountdown expiresAt={course.paymentExpiresAt} className="text-xs" />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Standardized 3-milestone timeline: 1. Hạn tuyển sinh -> 2. Ngày bắt đầu -> 3. Ngày kết thúc */}
                        <div className="space-y-2 rounded-xl border border-rp-line/80 bg-rp-bg-2/40 p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-rp-text-muted">
                              <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
                              {tr('Hạn tuyển sinh')}
                            </span>
                            <span className="font-semibold tabular-nums text-rp-text">
                              {course.cohortEnrollmentClosesAtUtc ? formatVnDateTime(course.cohortEnrollmentClosesAtUtc) : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-rp-text-muted">
                              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
                              {tr('Ngày bắt đầu')}
                            </span>
                            <span className="font-semibold tabular-nums text-rp-text">
                              {course.startsAt ? formatDate(course.startsAt, '—') : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-rp-text-muted">
                              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
                              {tr('Ngày kết thúc')}
                            </span>
                            <span className="font-semibold tabular-nums text-rp-text">
                              {course.endsAt ? formatDate(course.endsAt, '—') : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Seat occupancy + course teaching progress separated visually */}
                        <div className="space-y-3">
                          {capacity > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="flex items-center gap-1.5 text-rp-text-muted">
                                  <Users aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
                                  {tr('Sĩ số lớp học')}
                                </span>
                                <span className="font-semibold tabular-nums text-rp-text">
                                  {trf('{0}/{1} học viên', { 0: confirmedCount, 1: capacity })}
                                </span>
                              </div>
                              <OccupancyProgressBar
                                enrolledCount={confirmedCount}
                                capacity={capacity}
                                size="sm"
                                label={trf('Sĩ số lớp học {0}/{1} học viên', { 0: confirmedCount, 1: capacity })}
                              />
                            </div>
                          )}

                          {totalSessionsCount > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-rp-text-muted">{tr('Tiến trình khóa học')}</span>
                                <span className="font-semibold tabular-nums text-rp-text">
                                  {trf('{0}/{1} buổi', { 0: progress.completedSessions, 1: totalSessionsCount })} ({progress.percent}%)
                                </span>
                              </div>
                              <ProgressBar
                                value={progress.completedSessions}
                                max={totalSessionsCount}
                                tone="success"
                                size="sm"
                                label={trf('Tiến trình khóa học {0}/{1} buổi', { 0: progress.completedSessions, 1: totalSessionsCount })}
                              />
                            </div>
                          )}
                        </div>

                        {/* Stage-appropriate summary */}
                        <div className="grid gap-2 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 p-3 text-xs">
                          {(lifecycle.id === 'Recruiting' || lifecycle.id === 'Upcoming') && (
                            <>
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-rp-text-muted">
                                  <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                                  {lifecycle.id === 'Recruiting' ? tr('Buổi đầu tiên dự kiến') : tr('Buổi học đầu tiên')}
                                </span>
                                <span className="font-semibold tabular-nums text-rp-text">
                                  {firstValidSession
                                    ? formatVnDateTime(firstValidSession.scheduledAt)
                                    : course.cohortFirstSessionStartUtc
                                      ? formatVnDateTime(course.cohortFirstSessionStartUtc)
                                      : tr('Chưa xếp lịch')}
                                </span>
                              </div>
                              {lifecycle.id === 'Recruiting' && (
                                <p className="m-0 text-[11.5px] text-rp-text-muted">
                                  {tr('Lớp đang tuyển sinh; lịch học dự kiến đã được thiết lập.')}
                                </p>
                              )}
                            </>
                          )}

                          {lifecycle.id === 'Teaching' && (
                            <>
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-rp-text-muted">
                                  <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                                  {tr('Buổi tiếp theo')}
                                </span>
                                <span className="font-semibold tabular-nums text-rp-text">
                                  {nextSession ? formatVnDateTime(nextSession.scheduledAt) : tr('Đã hoàn tất lịch học')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-rp-text-muted">
                                  <BookCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                                  {tr('Bài tập chưa nộp')}
                                </span>
                                <span className={cx('font-semibold tabular-nums', hwPending > 0 ? 'text-rp-brand-strong' : 'text-rp-text-muted')}>
                                  {hwPending > 0 ? trf('{0} bài', { 0: hwPending }) : tr('Không có')}
                                </span>
                              </div>
                            </>
                          )}

                          {lifecycle.id === 'Completed' && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 text-rp-text-muted">
                                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-success" />
                                {tr('Trạng thái hoàn thành')}
                              </span>
                              <span className="font-semibold tabular-nums text-rp-success">
                                {trf('{0}/{1} buổi đã hoàn thành', { 0: progress.completedSessions, 1: totalSessionsCount })}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rp-line pt-3">
                    {!confirmed ? (
                      pendingPayment ? (
                        <PendingPaymentAction
                          checkoutUrl={course.checkoutUrl}
                          expiresAt={course.paymentExpiresAt}
                          label={tr('Tiếp tục thanh toán')}
                        />
                      ) : null
                    ) : (
                      <>
                        {lifecycle.id === 'Teaching' && joinState?.canJoin ? (
                          <Link
                            to={joinState.roomHref}
                            className="rp-focus inline-flex h-9 items-center gap-1 rounded-xl bg-rp-success px-3.5 text-xs font-semibold text-white hover:opacity-95"
                          >
                            {tr('Vào phòng học')}
                          </Link>
                        ) : (
                          <span />
                        )}

                        <Link
                          to={`/my-courses/${course.id}`}
                          className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-4 text-xs font-semibold text-white transition-colors hover:bg-rp-brand-strong"
                        >
                          {lifecycle.id === 'Completed' ? tr('Xem lại lớp học') : tr('Mở không gian lớp')}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </PageContainer>

      <Modal
        open={Boolean(confirmedEnrollment)}
        onClose={() => setConfirmedEnrollment(null)}
        title={tr('Bạn đã đăng ký lớp học thành công')}
        size="md"
        footer={confirmedEnrollment ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={CalendarDays}
              onClick={() => {
                const targetId = confirmedEnrollment.id;
                setConfirmedEnrollment(null);
                navigate(`/my-courses/${targetId}/?section=schedule`);
              }}
            >
              {tr('Xem lịch học')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={ArrowRight}
              onClick={() => {
                const targetId = confirmedEnrollment.id;
                setConfirmedEnrollment(null);
                navigate(`/my-courses/${targetId}`);
              }}
            >
              {tr('Xem lớp học của tôi')}
            </Button>
          </div>
        ) : undefined}
      >
        {confirmedEnrollment && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <div className="min-w-0 text-sm text-emerald-950">
                <p className="font-semibold">{tr('Thanh toán trọn khóa đã được xác nhận')}</p>
                <p className="mt-0.5 text-xs text-emerald-900/90">
                  {tr('Suất học của bạn đã được kích hoạt chính thức. Bạn có thể xem lịch học chi tiết và chuẩn bị cho buổi học đầu tiên.')}
                </p>
              </div>
            </div>
            <dl className="grid gap-2.5 rounded-xl border border-rp-line bg-rp-bg-2/60 p-4 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs text-rp-text-muted">{tr('Lớp học')}</dt>
                <dd className="mt-0.5 font-bold text-rp-text">
                  {confirmedEnrollment.name}
                  {confirmedEnrollment.level ? ` (JLPT ${confirmedEnrollment.level})` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-rp-text-muted">{tr('Giáo viên phụ trách')}</dt>
                <dd className="mt-0.5 font-medium text-rp-text">{confirmedEnrollment.mentorName || tr('Giáo viên lớp nhóm')}</dd>
              </div>
              <div>
                <dt className="text-xs text-rp-text-muted">{tr('Ngày bắt đầu')}</dt>
                <dd className="mt-0.5 font-medium text-rp-text">
                  {confirmedEnrollment.startsAt ? formatVnDateTime(confirmedEnrollment.startsAt) : '—'}
                </dd>
              </div>
              {Number(confirmedEnrollment.amount) > 0 && (
                <div>
                  <dt className="text-xs text-rp-text-muted">{tr('Học phí đã thanh toán')}</dt>
                  <dd className="mt-0.5 font-bold tabular-nums text-rp-brand-strong">
                    {formatTuitionVnd(confirmedEnrollment.amount)}
                  </dd>
                </div>
              )}
              {Number(confirmedEnrollment.totalSessions) > 0 && (
                <div>
                  <dt className="text-xs text-rp-text-muted">{tr('Thời lượng')}</dt>
                  <dd className="mt-0.5 font-medium text-rp-text">
                    {trf('{0} buổi học', { 0: confirmedEnrollment.totalSessions })}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </Modal>
    </LearnerShell>
  );
}
