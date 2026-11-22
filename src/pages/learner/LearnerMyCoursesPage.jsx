import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookCheck, CalendarDays, Clock, Compass, RefreshCw } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { recordDiagnostic } from '@/api/diagnostics.js';
import { paymentStateMessage } from '@/api/apiErrors.js';
import { reconcileCoursePayment } from '@/features/cohorts/api/cohortApi';
import { useLearnerCohortWorkspace } from '@/features/cohorts/hooks/useLearnerCohortWorkspace.js';
import { displayCourseTitle, getSessionJoinState } from '@/features/calendar/utils/calendarEventsModel.js';
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
  PageContainer,
  PageHeader,
  ProgressBar,
  SakuraLoader,
  Tabs,
  cx,
  notify,
} from '@/components/ui';

const PAYOS_RETURN_KEYS = ['code', 'id', 'cancel', 'status', 'orderCode'];
const COHORT_ORDER_PREFIX = 700_000_000;

function parseReturnedCohortCourseId(params) {
  const raw = params?.get('orderCode') ?? '';
  if (!/^[0-9]+$/.test(raw)) return 0;
  const orderCode = Number(raw);
  return Number.isSafeInteger(orderCode) && orderCode > COHORT_ORDER_PREFIX ? orderCode - COHORT_ORDER_PREFIX : 0;
}

const STATUS_META = {
  PendingPayment: { tone: 'warning', label: 'Chờ thanh toán' },
  Ready: { tone: 'info', label: 'Sắp khai giảng' },
  Active: { tone: 'success', label: 'Đang học' },
  Completed: { tone: 'neutral', label: 'Đã hoàn thành' },
  Transferred: { tone: 'neutral', label: 'Đã chuyển lớp' },
  Cancelled: { tone: 'neutral', label: 'Đã hủy' },
};

export default function LearnerMyCoursesPage() {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const nowMs = useNow(60_000);

  const tabParam = searchParams.get('tab');
  const mentorIdParam = searchParams.get('mentorId');
  const legacyCourseIdParam = Number(searchParams.get('courseId'));
  const legacyCohortIdParam = Number(searchParams.get('cohortId'));
  const hasPayOsCallback = PAYOS_RETURN_KEYS.some((key) => searchParams.has(key));
  const returnedCourseId = parseReturnedCohortCourseId(searchParams);

  const [filter, setFilter] = useState('ALL');
  const reconcileRanRef = useRef(false);

  const workspace = useLearnerCohortWorkspace({ includeHomework: true });
  const {
    courses,
    homeworks,
    coursesQuery,
    busy,
    actionError,
    actionNotice,
    setActionError,
    setActionNotice,
    invalidateAll,
    runAction,
  } = workspace;

  // Backward-compatible PayOS callback auto-reconciliation.
  useEffect(() => {
    if (!hasPayOsCallback || reconcileRanRef.current || coursesQuery.isPending) return;
    const pendingIds = courses.filter((c) => c.paymentStatus === 'Pending').map((c) => c.id);
    const targetIds = returnedCourseId > 0 ? new Set([returnedCourseId, ...pendingIds]) : new Set(pendingIds);
    reconcileRanRef.current = true;
    if (targetIds.size === 0) return;

    Promise.all(
      [...targetIds].map((id) =>
        reconcileCoursePayment(id).catch((err) => {
          recordDiagnostic({
            scope: 'payment-reconcile',
            component: 'LearnerMyCoursesPage',
            endpoint: `/study-courses/${id}/payment/reconcile`,
            status: err?.status ?? null,
            code: err?.errorCode ?? null,
            technicalDetail: err?.message,
          });
          return null;
        }),
      ),
    ).then(async (results) => {
      const returned = returnedCourseId > 0
        ? results.find((r) => r?.id === returnedCourseId) || results[0]
        : results[0];
      if (returned?.paymentState === 'Confirmed' || returned?.paymentStatus === 'Paid') {
        const msg = 'Thanh toán đã được xác nhận. Bạn đã ghi danh thành công!';
        setActionNotice(msg);
        notify.success(msg, '', { key: 'cohort-payos-return' });
      } else if (returned?.paymentState && paymentStateMessage(returned.paymentState)) {
        const msg = paymentStateMessage(returned.paymentState);
        setActionNotice(msg);
        notify.info(msg, '', { key: 'cohort-payos-return' });
      }
      await invalidateAll();
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          PAYOS_RETURN_KEYS.forEach((k) => next.delete(k));
          return next;
        },
        { replace: true },
      );
      if (returnedCourseId > 0) {
        navigate(`/my-courses/${returnedCourseId}`, { replace: true });
      }
    });
  }, [hasPayOsCallback, courses, coursesQuery.isPending, returnedCourseId, invalidateAll, navigate, setActionNotice, setSearchParams]);

  const pendingHomeworkByCohort = useMemo(() => {
    const map = new Map();
    homeworks.forEach((hw) => {
      if (!hw.cohortId || hw.status === 'Graded' || hw.submission) return;
      map.set(hw.cohortId, (map.get(hw.cohortId) || 0) + 1);
    });
    return map;
  }, [homeworks]);

  const filteredCourses = useMemo(() => {
    if (filter === 'ALL') return courses;
    if (filter === 'ACTIVE') return courses.filter((c) => c.status === 'Active' || c.status === 'Ready');
    if (filter === 'PENDING') return courses.filter((c) => c.status === 'PendingPayment' || c.paymentStatus === 'Pending');
    if (filter === 'COMPLETED') {
      return courses.filter((c) => c.status === 'Completed' || c.status === 'Transferred' || c.status === 'Cancelled');
    }
    return courses;
  }, [courses, filter]);

  // Preserve deep-link compatibility for legacy /my-courses?tab=cohorts, ?mentorId=X, ?courseId=X, or ?cohortId=X.
  if ((tabParam === 'cohorts' || Boolean(mentorIdParam)) && !hasPayOsCallback) {
    return <Navigate to={mentorIdParam ? `/cohorts?mentorId=${encodeURIComponent(mentorIdParam)}` : '/cohorts'} replace />;
  }
  if (legacyCourseIdParam > 0 && !hasPayOsCallback) {
    return <Navigate to={`/my-courses/${legacyCourseIdParam}`} replace />;
  }
  if (legacyCohortIdParam > 0 && !coursesQuery.isLoading && !hasPayOsCallback) {
    const matched = courses.find((c) => Number(c.cohortId) === legacyCohortIdParam);
    if (matched) return <Navigate to={`/my-courses/${matched.id}`} replace />;
    return <Navigate to="/cohorts" replace />;
  }

  return (
    <LearnerShell breadcrumb={tr('Lớp của tôi')}>
      <PageContainer width="default" className="space-y-6">
        <PageHeader
          eyebrow={tr('Học nhóm')}
          title={tr('Lớp học của tôi')}
          description={tr('Mỗi lớp có không gian riêng với lịch học, bài tập, điểm danh và hỗ trợ theo đúng ngữ cảnh.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button as={Link} to="/calendar" variant="secondary" size="sm" icon={CalendarDays}>
                {tr('Lịch học')}
              </Button>
              <Button as={Link} to="/cohorts" variant="primary" size="sm" icon={Compass}>
                {tr('Khám phá thêm lớp')}
              </Button>
            </div>
          }
        />

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

        {courses.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              variant="pill"
              value={filter}
              onChange={setFilter}
              tabs={[
                { value: 'ALL', label: tr('Tất cả') },
                { value: 'ACTIVE', label: tr('Đang học & Sắp khai giảng') },
                { value: 'PENDING', label: tr('Chờ thanh toán') },
                { value: 'COMPLETED', label: tr('Đã hoàn thành / Đã hủy') },
              ]}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => coursesQuery.refetch()}
              disabled={coursesQuery.isFetching}
              loading={coursesQuery.isFetching}
              icon={RefreshCw}
            >
              {tr('Làm mới')}
            </Button>
          </div>
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
        ) : filteredCourses.length === 0 ? (
          <Card className="p-6">
            <ContextualEmptyState
              context="cohort"
              title={courses.length === 0 ? tr('Bạn chưa tham gia lớp nhóm nào') : tr('Không có lớp nào trong bộ lọc này')}
              description={
                courses.length === 0
                  ? tr('Khám phá các lớp JLPT theo cấp độ phù hợp để học trực tiếp cùng Giáo viên.')
                  : tr('Chọn bộ lọc Tất cả để xem toàn bộ lịch sử đăng ký lớp của bạn.')
              }
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
            {filteredCourses.map((course) => {
              const title = displayCourseTitle(course, tr('Lớp học nhóm'));
              const status = STATUS_META[course.status] || { tone: 'neutral', label: course.status };
              const sessions = Array.isArray(course.sessions) ? course.sessions : [];
              const attended = sessions.filter((s) => s.status === 'Present').length;
              const pct = sessions.length > 0 ? Math.round((attended / sessions.length) * 100) : 0;
              const nextSession = sessions.find((s) => {
                if (s.status !== 'Scheduled') return false;
                const startMs = parseUtcDate(s.scheduledAt)?.getTime() ?? 0;
                return startMs + (course.sessionMinutes || 90) * 60_000 >= nowMs - 30 * 60_000;
              });
              const joinState = nextSession ? getSessionJoinState(nextSession, course, nowMs) : null;
              const hwPending = course.cohortId ? pendingHomeworkByCohort.get(course.cohortId) || 0 : 0;

              return (
                <Card key={course.id} className="rp-card-hover flex flex-col justify-between gap-4 p-5">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={status.tone} size="sm">
                            {tr(status.label)}
                          </Badge>
                          {course.level && (
                            <Badge tone="brand" size="sm">
                              JLPT {course.level}
                            </Badge>
                          )}
                          {joinState?.isLive && (
                            <Badge tone="success" size="sm">
                              {tr('Phòng đang mở')}
                            </Badge>
                          )}
                        </div>
                        <h2 className="mt-2 text-lg font-bold text-rp-text">{title}</h2>
                        <p className="mt-0.5 text-xs text-rp-text-muted">
                          {tr('Giáo viên:')} {course.mentorName || tr('Chưa phân công')} ·{' '}
                          {trf('{0} buổi · {1} phút/buổi', {
                            0: sessions.length || course.totalSessions || 0,
                            1: course.sessionMinutes || 90,
                          })}
                        </p>
                      </div>
                    </div>

                    {sessions.length > 0 && (
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-rp-text-muted">
                          <span>{tr('Chuyên cần đã ghi nhận')}</span>
                          <span className="font-semibold tabular-nums text-rp-text">
                            {attended}/{sessions.length} ({pct}%)
                          </span>
                        </div>
                        <ProgressBar value={pct} max={100} size="sm" />
                      </div>
                    )}

                    <div className="grid gap-2 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-rp-text-muted">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {tr('Buổi tiếp theo')}
                        </span>
                        <span className="font-semibold text-rp-text">
                          {nextSession ? formatVnDateTime(nextSession.scheduledAt) : tr('Chưa có lịch sắp tới')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-rp-text-muted">
                          <BookCheck className="h-3.5 w-3.5 shrink-0" />
                          {tr('Bài tập chưa nộp')}
                        </span>
                        <span className={cx('font-semibold tabular-nums', hwPending > 0 ? 'text-rp-brand-strong' : 'text-rp-text-muted')}>
                          {hwPending > 0 ? trf('{0} bài', { 0: hwPending }) : tr('Không có')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rp-line pt-3">
                    {course.paymentStatus === 'Pending' && course.checkoutUrl ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={course.checkoutUrl}
                          className="rp-focus inline-flex h-9 items-center rounded-xl bg-rp-warning px-3.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                          {tr('Tiếp tục thanh toán')}
                        </a>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            runAction(
                              () => reconcileCoursePayment(course.id),
                              (res) =>
                                res?.paymentState === 'Confirmed' || res?.paymentStatus === 'Paid'
                                  ? 'Thanh toán đã được xác nhận!'
                                  : paymentStateMessage(res?.paymentState) || 'Đang chờ xác nhận thanh toán.',
                            )
                          }
                        >
                          {tr('Kiểm tra thanh toán')}
                        </Button>
                      </div>
                    ) : joinState?.canJoin ? (
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
                      {tr('Mở không gian lớp')}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
