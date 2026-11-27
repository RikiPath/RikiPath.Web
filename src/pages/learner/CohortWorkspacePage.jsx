import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  GraduationCap,
  LayoutGrid,
  LifeBuoy,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import { captureNavigationOrigin } from '@/utils/navigationContext.js';
import { LearnerShell } from '@/layouts';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import {
  courseGet,
  getCourseCompletionSummary,
  openRetakeEvidence,
  uploadRetakeEvidence,
} from '@/features/cohorts/api/cohortApi';
import { useLearnerCohortWorkspace } from '@/features/cohorts/hooks/useLearnerCohortWorkspace.js';
import { isConfirmedCourseAccess } from '@/features/cohorts/utils/completionHelpers';
import OccupancyProgressBar from '@/features/cohorts/components/OccupancyProgressBar.jsx';
import WeeklyScheduleDisplay from '@/features/scheduling/components/WeeklyScheduleDisplay.jsx';
import CohortSessionsCalendar from '@/features/scheduling/components/CohortSessionsCalendar.jsx';
import CohortHomeworkPanel from '@/features/homework/components/CohortHomeworkPanel';
import CohortCompletionSummary from '@/features/cohorts/components/CohortCompletionSummary';
import CohortMentorReviewSection from '@/features/cohorts/components/CohortMentorReviewSection.jsx';
import LearnerCohortTransferPanel from '@/features/cohorts/components/LearnerCohortTransferPanel';
import CohortComplaintPanel from '@/features/complaints/components/CohortComplaintPanel';
import { displayCourseTitle, getSessionJoinState } from '@/features/calendar/utils/calendarEventsModel.js';
import {
  computeClassProgress,
  computeLearnerAttendance,
  resolveCourseLifecycle,
} from '@/features/scheduling/utils/teachingLifecycleModel.js';
import { formatDate, formatTimeRange } from '@/utils/dateTimeFormat.js';
import { formatVnDateTime, parseUtcDate, sessionStatusLabel } from '@/utils/vnDateTime.js';
import { useNow } from '@/hooks/useNow.js';
import { useLocale } from '@/locales/locale.js';
import {
  Banner,
  Badge,
  Button,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  DataTable,
  DateInput,
  DetailPageHeader,
  Field,
  FileUpload,
  PageContainer,
  ProgressBar,
  SakuraLoader,
  Tabs,
  Textarea,
  UserAvatar,
  Collapsible,
  cx,
} from '@/components/ui';
import { StatusBadge } from '@/features/admin/components/AdminPrimitives.jsx';
import '@/pages/shared/studyCourses.css';

const SECTIONS = [
  { value: 'overview', label: 'Tổng quan', icon: LayoutGrid },
  { value: 'schedule', label: 'Lịch học', icon: CalendarDays },
  { value: 'homework', label: 'Bài tập', icon: BookCheck },
  { value: 'progress', label: 'Điểm danh & tiến độ', icon: TrendingUp },
  { value: 'support', label: 'Đánh giá & hỗ trợ', icon: LifeBuoy },
];

const CANCELLED_SESSION_STATUSES = new Set(['Cancelled', 'CancelledByMentor', 'CancelledByLearner', 'TransferredOut']);

const ATTENDANCE_STATUS_META = Object.freeze({
  Present: { tone: 'success', label: 'Có mặt' },
  Absent: { tone: 'danger', label: 'Vắng mặt' },
  ExcusedAbsent: { tone: 'warning', label: 'Vắng có phép' },
  PendingConfirmation: { tone: 'neutral', label: 'Chờ xác nhận' },
});

function toUtcIsoDate(val) {
  if (!val) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(val) ? new Date(`${val}T00:00:00Z`) : parseUtcDate(val);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
}

export default function CohortWorkspacePage() {
  const { tr, trf } = useLocale();
  const location = useLocation();
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const nowMs = useNow(60_000);

  const numericId = Number(courseId);
  const rawSection = searchParams.get('section') || 'overview';
  const activeSection = SECTIONS.some((s) => s.value === rawSection) ? rawSection : 'overview';

  const setSection = (nextSection) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextSection === 'overview') next.delete('section');
      else next.set('section', nextSection);
      return next;
    });
  };

  const [showComplaintBox, setShowComplaintBox] = useState(false);
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const [examDate, setExamDate] = useState('');
  const [resultPublishedAt, setResultPublishedAt] = useState('');
  const [retakeReason, setRetakeReason] = useState('');
  const [retakeFile, setRetakeFile] = useState(null);

  const workspace = useLearnerCohortWorkspace({ includeCohorts: true, includeHomework: true });
  const { uid, courses, cohorts, homeworks, coursesQuery, busy, actionError, actionNotice, setActionError, setActionNotice, runAction } = workspace;

  const matchedSummary = useMemo(
    () => courses.find((c) => Number(c.id) === numericId) || null,
    [courses, numericId],
  );
  const hasConfirmedAccess = isConfirmedCourseAccess(matchedSummary);

  const detailQuery = useQuery({
    queryKey: ['learner-cohort-workspace', 'detail', uid, numericId],
    queryFn: () => courseGet(`/${numericId}`),
    enabled: Boolean(numericId) && Number.isFinite(numericId) && (hasConfirmedAccess || (!coursesQuery.isPending && !matchedSummary)),
    staleTime: 30_000,
    retry: (count, err) => err?.status !== 403 && err?.status !== 404 && count < 1,
  });

  const current = useMemo(() => {
    const candidate = detailQuery.data || matchedSummary || null;
    return isConfirmedCourseAccess(candidate) ? candidate : null;
  }, [detailQuery.data, matchedSummary]);

  const currentCohort = useMemo(
    () => cohorts.find((c) => c.id === current?.cohortId) || null,
    [cohorts, current?.cohortId],
  );

  const title = current ? displayCourseTitle(current, tr('Không gian lớp học')) : tr('Không gian lớp học');
  const sessions = useMemo(() => (Array.isArray(current?.sessions) ? current.sessions : []), [current]);
  const sessionMinutes = current?.sessionMinutes || 90;

  const validSessions = useMemo(
    () =>
      sessions
        .filter((s) => s && !CANCELLED_SESSION_STATUSES.has(s.status))
        .sort((a, b) => (parseUtcDate(a.scheduledAt)?.getTime() ?? 0) - (parseUtcDate(b.scheduledAt)?.getTime() ?? 0)),
    [sessions],
  );
  const firstValidSession = validSessions[0] || null;

  const lifecycle = useMemo(
    () => resolveCourseLifecycle(current, nowMs, currentCohort),
    [current, nowMs, currentCohort],
  );
  const isStartedOrCompleted = lifecycle.id === 'Teaching' || lifecycle.id === 'Completed';

  const completionQuery = useQuery({
    queryKey: ['learner-cohort-workspace', 'completion', uid, numericId],
    queryFn: () => getCourseCompletionSummary(numericId),
    enabled: Boolean(hasConfirmedAccess && current?.cohortId && numericId && isStartedOrCompleted),
    staleTime: 60_000,
    retry: false,
  });

  const wrappedAction = async (fn, message, opts) => {
    const res = await runAction(fn, message, opts);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['learner-cohort-workspace', 'detail', uid, numericId] }),
      queryClient.invalidateQueries({ queryKey: ['learner-cohort-workspace', 'completion', uid, numericId] }),
    ]);
    return res;
  };

  const classHomeworks = useMemo(() => {
    if (!current) return [];
    return homeworks.filter(
      (hw) =>
        (current.cohortId && Number(hw.cohortId) === Number(current.cohortId)) ||
        (hw.studyCourseId && Number(hw.studyCourseId) === Number(current.id)),
    );
  }, [homeworks, current]);

  const progress = useMemo(
    () => computeClassProgress(sessions, current?.totalSessions || validSessions.length),
    [sessions, current?.totalSessions, validSessions.length],
  );
  const attendance = useMemo(() => computeLearnerAttendance(sessions), [sessions]);

  const attendanceHistoryRows = useMemo(() => {
    if (!isStartedOrCompleted) return [];
    const latestByNumber = new Map();
    for (const s of sessions) {
      if (!s || CANCELLED_SESSION_STATUSES.has(s.status)) continue;
      const num = Number(s.number ?? 0);
      const key = num > 0 ? `num:${num}` : `id:${s.id}`;
      const attempt = Number(s.attempt || 1);
      const prev = latestByNumber.get(key);
      if (!prev || attempt >= Number(prev.attempt || 1)) {
        latestByNumber.set(key, s);
      }
    }

    const rows = [];
    for (const s of latestByNumber.values()) {
      const startDate = parseUtcDate(s.scheduledAt);
      const startMs = startDate?.getTime() ?? NaN;
      const endDate = Number.isFinite(startMs) ? new Date(startMs + sessionMinutes * 60_000) : null;
      const endMs = endDate?.getTime() ?? NaN;
      const isMarked = s.status === 'Present' || s.status === 'Absent' || s.status === 'ExcusedAbsent';
      const isOccurredPending = s.status === 'Scheduled' && Number.isFinite(endMs) && endMs <= nowMs;
      if (!isMarked && !isOccurredPending) continue;

      rows.push({
        id: s.id ?? `s-${s.number}`,
        number: Number(s.number || 0),
        scheduledAt: s.scheduledAt,
        startDate,
        endDate,
        statusKey: isMarked ? s.status : 'PendingConfirmation',
      });
    }
    return rows.sort((a, b) => b.number - a.number);
  }, [sessions, sessionMinutes, nowMs, isStartedOrCompleted]);

  const homeworkSummaryStats = useMemo(() => {
    if (classHomeworks.length > 0) {
      const assigned = classHomeworks.length;
      const graded = classHomeworks.filter((h) => h.status === 'Graded' || Boolean(h.publishedGrade)).length;
      const submitted = classHomeworks.filter(
        (h) => Boolean(h.submission) || h.status === 'Submitted' || h.status === 'Graded',
      ).length;
      const outstanding = Math.max(0, assigned - submitted);
      return { assigned, submitted, graded, outstanding };
    }
    const serverHw = completionQuery.data?.homework;
    return {
      assigned: serverHw?.assigned ?? 0,
      submitted: serverHw?.submitted ?? 0,
      graded: serverHw?.graded ?? 0,
      outstanding: serverHw?.outstanding ?? 0,
    };
  }, [classHomeworks, completionQuery.data?.homework]);

  const publishedFeedbackList = useMemo(
    () => (Array.isArray(completionQuery.data?.mentorFeedback) ? completionQuery.data.mentorFeedback : []),
    [completionQuery.data?.mentorFeedback],
  );

  const attendanceColumns = useMemo(
    () => [
      {
        key: 'number',
        header: tr('Buổi học'),
        align: 'left',
        sortValue: (row) => row.number,
        render: (row) => (
          <span className="font-semibold tabular-nums text-rp-text">
            {trf('Buổi {0}', { 0: row.number })}
          </span>
        ),
      },
      {
        key: 'date',
        header: tr('Ngày học'),
        align: 'center',
        sortValue: (row) => row.startDate?.getTime() || 0,
        render: (row) => (
          <span className="whitespace-nowrap tabular-nums text-xs text-rp-text-2">
            {formatDate(row.scheduledAt, '—')}
          </span>
        ),
      },
      {
        key: 'time',
        header: tr('Thời gian'),
        align: 'center',
        sortable: false,
        render: (row) => (
          <span className="whitespace-nowrap tabular-nums text-xs font-medium text-rp-text">
            {formatTimeRange(row.startDate, row.endDate, '—')}
          </span>
        ),
      },
      {
        key: 'status',
        header: tr('Trạng thái điểm danh'),
        align: 'center',
        sortValue: (row) => row.statusKey,
        render: (row) => {
          const meta = ATTENDANCE_STATUS_META[row.statusKey] || ATTENDANCE_STATUS_META.PendingConfirmation;
          return <StatusBadge tone={meta.tone} label={tr(meta.label)} />;
        },
      },
    ],
    [tr, trf],
  );

  const totalSessionsCount = progress.totalSessions || current?.totalSessions || validSessions.length || 0;
  const weeksCount = current?.cohortCourseDurationWeeks
    || currentCohort?.courseDurationWeeks
    || (totalSessionsCount > 0 && current?.sessionsPerWeek > 0
      ? Math.max(1, Math.ceil(totalSessionsCount / current.sessionsPerWeek))
      : null);
  const capacity = Number(current?.cohortCapacity ?? currentCohort?.capacitySnapshot ?? currentCohort?.capacity ?? current?.capacitySnapshot ?? 0) || 0;
  const confirmedCount = Math.max(
    current && isConfirmedCourseAccess(current) ? 1 : 0,
    Number(currentCohort?.confirmedEnrolledCount ?? current?.cohortConfirmedEnrolledCount ?? 0) || 0,
  );
  const enrollmentClosesAt = current?.cohortEnrollmentClosesAtUtc ?? currentCohort?.enrollmentClosesAtUtc ?? null;

  const nextSession = useMemo(
    () =>
      validSessions.find((s) => {
        if (s.status !== 'Scheduled') return false;
        const startMs = parseUtcDate(s.scheduledAt)?.getTime() ?? 0;
        return startMs + sessionMinutes * 60_000 >= nowMs - 30 * 60_000;
      }) || null,
    [validSessions, sessionMinutes, nowMs],
  );
  const nextJoinState = nextSession && current
    ? getSessionJoinState(nextSession, current, nowMs, { lifecycleId: lifecycle.id })
    : null;
  const firstJoinState = firstValidSession && current
    ? getSessionJoinState(firstValidSession, current, nowMs, { lifecycleId: lifecycle.id })
    : null;

  const pendingHwCount = classHomeworks.filter((h) => h.status !== 'Graded' && !h.submission).length;
  const tabsWithCounts = useMemo(
    () =>
      SECTIONS.map((s) => ({
        ...s,
        label: tr(s.label),
        count: s.value === 'homework' && pendingHwCount > 0 ? pendingHwCount : undefined,
      })),
    [pendingHwCount, tr],
  );

  const cohortIdValue = current?.cohortId ?? null;
  const courseIdValue = current?.id ?? null;
  const cohortMap = useMemo(
    () => (cohortIdValue ? new Map([[cohortIdValue, { name: title, courseId: courseIdValue }]]) : null),
    [cohortIdValue, courseIdValue, title],
  );

  // Chặn truy cập trực tiếp qua URL /my-courses/:id/ khi chưa xác nhận thanh toán / ghi danh chưa có hiệu lực.
  if (!coursesQuery.isPending && matchedSummary && !isConfirmedCourseAccess(matchedSummary)) {
    return <Navigate to="/my-courses" replace />;
  }
  if (detailQuery.isError && detailQuery.error?.status === 403) {
    return <Navigate to="/my-courses" replace />;
  }

  return (
    <LearnerShell breadcrumb={title}>
      <PageContainer width="default" className="space-y-5">
        <DetailPageHeader
          backFallbackTo="/my-courses/"
          backLabel="Quay lại lớp của tôi"
          backOriginLabel="Quay lại"
          restoreListKey="/my-courses"
          icon={GraduationCap}
          eyebrow={current?.level ? `${formatJlptLevel(current.level)} · ${tr('Học nhóm')}` : tr('Không gian lớp học')}
          title={title}
          badges={
            current ? (
              <StatusBadge tone={lifecycle.tone} label={lifecycle.label} />
            ) : undefined
          }
          meta={
            current ? (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <UserAvatar
                    src={current.mentorAvatarUrl || currentCohort?.mentorAvatarUrl}
                    name={current.mentorName || tr('Giáo viên')}
                    size="xs"
                  />
                  <span>{tr('Giáo viên:')}</span>
                  {(current.mentorId || currentCohort?.mentorId) ? (
                    <Link
                      to={`/mentors/${current.mentorId || currentCohort?.mentorId}/`}
                      state={{
                        navigationOrigin: captureNavigationOrigin(location, {
                          backLabel: 'Quay lại lớp học',
                        }),
                      }}
                      className="rp-focus rp-link font-semibold text-rp-text hover:text-rp-brand-strong"
                    >
                      {current.mentorName || tr('Giáo viên')}
                    </Link>
                  ) : (
                    <span className="font-semibold text-rp-text">{current.mentorName || tr('Chưa phân công')}</span>
                  )}
                </span>
                <span className="tabular-nums">
                  {trf('{0} buổi', { 0: totalSessionsCount })}
                  {weeksCount ? ` · ${trf('{0} tuần', { 0: weeksCount })}` : ''}
                  {` · ${trf('{0} phút/buổi', { 0: sessionMinutes })}`}
                </span>
              </>
            ) : undefined
          }
          actions={
            current && lifecycle.id === 'Teaching' && nextJoinState?.canJoin ? (
              <Link
                to={nextJoinState.roomHref}
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-xl bg-rp-success px-4 text-sm font-semibold text-white hover:opacity-95"
              >
                <Video className="h-4 w-4" />
                {tr('Vào phòng học ngay')}
              </Link>
            ) : undefined
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

        {(coursesQuery.isPending || detailQuery.isLoading) && !current ? (
          <Card className="p-8">
            <SakuraLoader context="cohort" label={tr('Đang tải không gian lớp học...')} />
          </Card>
        ) : coursesQuery.isError && !current ? (
          <Card className="p-6">
            <ContextualErrorState
              error={coursesQuery.error}
              title={tr('Chưa tải được thông tin lớp học')}
              onRetry={() => coursesQuery.refetch()}
              retrying={coursesQuery.isFetching}
            />
          </Card>
        ) : !current ? (
          <Card className="p-6">
            <ContextualEmptyState
              illustration="classroom"
              title={tr('Không tìm thấy lớp học này')}
              description={tr('Lớp có thể đã bị hủy hoặc không thuộc tài khoản của bạn.')}
              action={
                <Button as={Link} to="/my-courses" variant="primary" size="md">
                  {tr('Về Lớp của tôi')}
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <Tabs
              tabs={tabsWithCounts}
              value={activeSection}
              onChange={setSection}
              label={tr('Điều hướng trong lớp học')}
              variant="pill"
            />

            {/* TAB 1: OVERVIEW */}
            {activeSection === 'overview' && (
              <div className="grid gap-5 lg:grid-cols-12">
                {/* LEFT COLUMN: Stage-adaptive session block + standardized Course Info */}
                <div className="space-y-5 lg:col-span-7">
                  <Card className="space-y-4 p-5">
                    {lifecycle.id === 'Recruiting' && (
                      <>
                        <CardHeader title={tr('Buổi đầu tiên dự kiến')} />
                        <div className="space-y-2.5 rounded-2xl border border-rp-info-line bg-rp-info-bg/40 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-rp-text">
                              {firstValidSession ? `${tr('Buổi')} ${firstValidSession.number}` : tr('Buổi khai giảng dự kiến')}
                            </span>
                            <StatusBadge tone="info" label="Đang tuyển sinh" />
                          </div>
                          <p className="text-sm font-semibold tabular-nums text-rp-brand-strong">
                            {firstValidSession
                              ? formatVnDateTime(firstValidSession.scheduledAt)
                              : current.cohortFirstSessionStartUtc
                                ? formatVnDateTime(current.cohortFirstSessionStartUtc)
                                : tr('Chưa xếp lịch')}
                          </p>
                          <p className="text-xs text-rp-text-muted">
                            {tr('Lớp đang tuyển sinh. Phòng học trực tuyến sẽ mở trước giờ bắt đầu 15 phút khi lớp chính thức khai giảng.')}
                          </p>
                          <div className="pt-1">
                            <Button type="button" variant="secondary" size="sm" onClick={() => setSection('schedule')}>
                              {tr('Xem toàn bộ lịch học')}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {lifecycle.id === 'Upcoming' && (
                      <>
                        <CardHeader title={tr('Buổi học đầu tiên')} />
                        {firstValidSession ? (
                          <div className="space-y-2.5 rounded-2xl border border-rp-line bg-rp-bg-2/60 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-rp-text">
                                {tr('Buổi')} {firstValidSession.number}
                              </span>
                              <StatusBadge tone="neutral" label="Sắp diễn ra" />
                            </div>
                            <p className="text-sm font-semibold tabular-nums text-rp-brand-strong">
                              {formatVnDateTime(firstValidSession.scheduledAt)}
                            </p>
                            <p className="text-xs text-rp-text-muted">{tr(firstJoinState?.reason || '')}</p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {firstJoinState?.canJoin ? (
                                <Link
                                  to={firstJoinState.roomHref}
                                  className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-success px-4 text-xs font-semibold text-white hover:opacity-95"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                  {tr('Vào phòng học chung')}
                                </Link>
                              ) : (
                                <Button type="button" variant="secondary" size="sm" disabled icon={Video}>
                                  {tr('Chưa tới giờ vào phòng')}
                                </Button>
                              )}
                              <Button type="button" variant="ghost" size="sm" onClick={() => setSection('schedule')}>
                                {tr('Xem toàn bộ lịch học')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <ContextualEmptyState
                            variant="compact"
                            illustration="calendar"
                            title={tr('Chưa có lịch buổi đầu tiên')}
                            description={tr('Thời gian buổi học đầu tiên sẽ hiển thị ngay khi lịch được xác lập.')}
                          />
                        )}
                      </>
                    )}

                    {lifecycle.id === 'Teaching' && (
                      <>
                        <CardHeader title={tr('Buổi học tiếp theo & Phòng học chung')} />
                        {nextSession ? (
                          <div className="space-y-2.5 rounded-2xl border border-rp-line bg-rp-bg-2/60 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-rp-text">
                                {tr('Buổi')} {nextSession.number}
                              </span>
                              <StatusBadge
                                tone={nextJoinState?.isLive ? 'success' : 'neutral'}
                                label={nextJoinState?.isLive ? 'Phòng đang mở' : sessionStatusLabel(nextSession)}
                              />
                            </div>
                            <p className="text-sm font-semibold tabular-nums text-rp-brand-strong">
                              {formatVnDateTime(nextSession.scheduledAt)}
                            </p>
                            <p className="text-xs text-rp-text-muted">{tr(nextJoinState?.reason || '')}</p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {nextJoinState?.canJoin ? (
                                <Link
                                  to={nextJoinState.roomHref}
                                  className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-success px-4 text-xs font-semibold text-white hover:opacity-95"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                  {tr('Vào phòng học chung')}
                                </Link>
                              ) : (
                                <Button type="button" variant="secondary" size="sm" disabled icon={Video}>
                                  {tr('Chưa tới giờ vào phòng')}
                                </Button>
                              )}
                              <Button type="button" variant="ghost" size="sm" onClick={() => setSection('schedule')}>
                                {tr('Xem toàn bộ lịch học')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 rounded-2xl border border-rp-line bg-rp-bg-2/60 p-4 text-xs">
                            <p className="font-semibold text-rp-text">{tr('Tất cả buổi học theo lịch đã diễn ra')}</p>
                            <p className="text-rp-text-muted">
                              {tr('Chờ Giáo viên hoàn tất điểm danh các buổi còn lại để chốt tổng kết khóa học.')}
                            </p>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setSection('schedule')}>
                              {tr('Xem toàn bộ lịch học')}
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    {lifecycle.id === 'Completed' && (
                      <>
                        <CardHeader title={tr('Lớp học đã hoàn thành')} />
                        <div className="space-y-2.5 rounded-2xl border border-rp-success-line bg-rp-success-bg/50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-rp-text">
                              {trf('{0}/{1} buổi đã hoàn thành', {
                                0: progress.completedSessions,
                                1: totalSessionsCount,
                              })}
                            </span>
                            <StatusBadge tone="success" label="Đã hoàn thành" />
                          </div>
                          <p className="text-xs text-rp-text-muted">
                            {tr('Khóa học đã hoàn tất đủ số buổi cam kết. Bạn có thể xem lại lịch sử buổi học, bài tập hoặc gửi yêu cầu hỗ trợ JLPT.')}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Button type="button" variant="secondary" size="sm" onClick={() => setSection('schedule')}>
                              {tr('Xem toàn bộ lịch học')}
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setSection('support')}>
                              {tr('Đánh giá & hỗ trợ')}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {lifecycle.id === 'Cancelled' && (
                      <>
                        <CardHeader title={tr('Lớp học đã bị hủy')} />
                        <div className="space-y-2 rounded-2xl border border-rp-danger-line bg-rp-danger-bg/40 p-4 text-xs">
                          <p className="font-semibold text-rp-danger">{tr('Lớp học này đã ngừng vận hành.')}</p>
                          {(current?.cancellationReason || currentCohort?.cancellationReason) && (
                            <p className="text-rp-danger">
                              <span className="font-semibold">{tr('Lý do hủy lớp')}: </span>
                              {current?.cancellationReason || currentCohort?.cancellationReason}
                            </p>
                          )}
                          <p className="text-rp-text-muted">
                            {tr('Phòng học trực tuyến đã đóng. Vui lòng kiểm tra mục Đánh giá & hỗ trợ nếu cần liên hệ Quản trị viên.')}
                          </p>
                        </div>
                      </>
                    )}
                  </Card>

                  <Card className="space-y-4 p-5">
                    <CardHeader title={tr('Thông tin khóa học')} />
                    <div className="space-y-2.5 rounded-2xl border border-rp-line/80 bg-rp-bg-2/40 p-4 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-rp-text-muted">
                          <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
                          {tr('Hạn tuyển sinh')}
                        </span>
                        <span className="font-semibold tabular-nums text-rp-text">
                          {enrollmentClosesAt ? formatVnDateTime(enrollmentClosesAt) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-rp-text-muted">
                          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
                          {tr('Ngày bắt đầu')}
                        </span>
                        <span className="font-semibold tabular-nums text-rp-text">
                          {current.startsAt ? formatDate(current.startsAt, '—') : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-rp-text-muted">
                          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
                          {tr('Ngày kết thúc')}
                        </span>
                        <span className="font-semibold tabular-nums text-rp-text">
                          {current.endsAt ? formatDate(current.endsAt, '—') : '—'}
                        </span>
                      </div>
                      <div className="border-t border-rp-line/60 pt-2.5 flex items-center justify-between gap-3">
                        <span className="text-rp-text-muted">{tr('Tần suất học')}</span>
                        <span className="font-semibold tabular-nums text-rp-text">
                          {current.sessionsPerWeek ? trf('{0} buổi/tuần', { 0: current.sessionsPerWeek }) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-rp-text-muted">{tr('Thời lượng khóa học')}</span>
                        <span className="font-semibold tabular-nums text-rp-text">
                          {weeksCount
                            ? `${trf('{0} tuần', { 0: weeksCount })} · ${trf('{0} buổi', { 0: totalSessionsCount })}`
                            : trf('{0} buổi', { 0: totalSessionsCount })}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="shrink-0 pt-0.5 text-rp-text-muted">{tr('Lịch học hằng tuần')}</span>
                        <div className="min-w-0 max-w-[260px] text-right">
                          <WeeklyScheduleDisplay
                            schedulePattern={currentCohort?.schedulePattern}
                            sessions={validSessions}
                            sessionDurationMinutes={sessionMinutes}
                            variant="compact"
                            className="items-end text-right"
                          />
                        </div>
                      </div>
                      <div className="border-t border-rp-line/60 pt-2.5 flex items-center justify-between gap-3">
                        <span className="text-rp-text-muted">{tr('Giáo viên phụ trách')}</span>
                        <span className="inline-flex items-center gap-2">
                          <UserAvatar
                            src={current.mentorAvatarUrl || currentCohort?.mentorAvatarUrl}
                            name={current.mentorName || tr('Giáo viên')}
                            size="xs"
                          />
                          <span className="font-semibold text-rp-text">
                            {current.mentorName || tr('Chưa phân công')}
                          </span>
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* RIGHT COLUMN: Class occupancy, course progress & attendance, homework */}
                <div className="space-y-5 lg:col-span-5">
                  {capacity > 0 && (
                    <Card className="space-y-3 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-bold text-rp-text">
                          <Users aria-hidden="true" className="h-4 w-4 text-rp-brand" />
                          {tr('Sĩ số lớp học')}
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-rp-text">
                          {trf('{0}/{1} học viên', { 0: confirmedCount, 1: capacity })}
                        </span>
                      </div>
                      <OccupancyProgressBar
                        enrolledCount={confirmedCount}
                        capacity={capacity}
                        size="md"
                        label={trf('Sĩ số lớp học {0}/{1} học viên', { 0: confirmedCount, 1: capacity })}
                      />
                    </Card>
                  )}

                  <Card className="space-y-4 p-5">
                    <CardHeader title={tr('Tiến trình & chuyên cần')} />
                    <div className="space-y-4 text-xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-rp-text-muted">{tr('Tiến trình khóa học')}</span>
                          <span className="font-semibold tabular-nums text-rp-text">
                            {trf('{0}/{1} buổi', { 0: progress.completedSessions, 1: totalSessionsCount })} ({progress.percent}%)
                          </span>
                        </div>
                        <ProgressBar
                          value={progress.completedSessions}
                          max={totalSessionsCount || 1}
                          tone="success"
                          size="sm"
                          label={trf('Tiến trình khóa học {0}/{1} buổi', { 0: progress.completedSessions, 1: totalSessionsCount })}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3.5 py-2.5">
                        <span className="font-medium text-rp-text-muted">{tr('Chuyên cần cá nhân')}</span>
                        <span className="font-semibold tabular-nums text-rp-text">
                          {attendance.markedCount === 0
                            ? tr('Chưa có điểm danh')
                            : `${attendance.presentCount}/${attendance.markedCount} ${tr('buổi')} (${attendance.percent}%)`}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {classHomeworks.length > 0 && (
                    <Card className="space-y-3 p-5">
                      <CardHeader
                        title={pendingHwCount > 0 ? tr('Bài tập chưa nộp') : tr('Bài tập gần đây')}
                        actions={
                          <Button type="button" variant="ghost" size="sm" onClick={() => setSection('homework')}>
                            {tr('Xem bài tập')}
                          </Button>
                        }
                      />
                      <ul className="space-y-2 text-xs">
                        {classHomeworks.slice(0, 3).map((hw) => (
                          <li key={hw.id} className="flex items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-bg-2/50 px-3 py-2">
                            <span className="truncate font-semibold text-rp-text">{hw.title}</span>
                            <Badge tone={hw.submission || hw.status === 'Graded' ? 'success' : 'warning'} size="sm">
                              {hw.status === 'Graded' ? tr('Đã chấm') : hw.submission ? tr('Đã nộp') : tr('Chưa nộp')}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SCHEDULE */}
            {activeSection === 'schedule' && (
              <div className="course-page" style={{ padding: 0 }}>
                <CohortSessionsCalendar course={current} cohort={currentCohort}>
                  {sessions.length === 0 ? (
                    <ContextualEmptyState
                      variant="inline"
                      size="sm"
                      illustration="calendar"
                      title={tr('Chưa có buổi học nào được xếp lịch.')}
                    />
                  ) : (
                    sessions.map((s) => {
                      const joinState = getSessionJoinState(s, current, nowMs, { lifecycleId: lifecycle.id });
                      return (
                        <article className="course-row" key={s.id}>
                          <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                            <div>
                              <strong>
                                {tr('Buổi')} {s.number}
                                {s.attempt > 1 ? trf(' (học bù {0})', { 0: s.attempt - 1 }) : ''}
                              </strong>{' '}
                              · {formatVnDateTime(s.scheduledAt)} · {sessionStatusLabel(s)}
                            </div>
                            {joinState.canJoin && (
                              <Link className="course-pill-link" to={joinState.roomHref}>
                                {tr('Vào phòng học chung')}
                              </Link>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </CohortSessionsCalendar>
              </div>
            )}

            {/* TAB 3: HOMEWORK */}
            {activeSection === 'homework' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-rp-text-muted">
                    {tr('Hiển thị bài tập thuộc lớp học này. Bạn cũng có thể xem tất cả bài tập của toàn bộ lớp.')}
                  </p>
                  <Link to="/homework" className="rp-link text-xs font-semibold">
                    {tr('Mở trang bài tập tổng hợp')}
                  </Link>
                </div>
                <div className="course-page" style={{ padding: 0 }}>
                  <CohortHomeworkPanel
                    cohortId={current.cohortId}
                    cohortName={title}
                    cohortMap={cohortMap}
                    coursesInCohort={[current]}
                    items={classHomeworks}
                    role="Learner"
                    busy={busy}
                    onRun={wrappedAction}
                  />
                </div>
              </div>
            )}

            {/* TAB 4: ATTENDANCE & PROGRESS */}
            {activeSection === 'progress' && (
              !isStartedOrCompleted ? (
                <Card className="p-6">
                  <ContextualEmptyState
                    variant="compact"
                    illustration={lifecycle.id === 'Cancelled' ? 'classroom' : 'calendar'}
                    title={
                      lifecycle.id === 'Cancelled'
                        ? tr('Lớp học đã bị hủy.')
                        : tr('Điểm danh và tiến độ sẽ khả dụng khi lớp học bắt đầu.')
                    }
                    description={
                      lifecycle.id !== 'Cancelled' && firstValidSession
                        ? trf('Buổi học đầu tiên dự kiến: {0}', { 0: formatVnDateTime(firstValidSession.scheduledAt) })
                        : undefined
                    }
                  />
                </Card>
              ) : (
                <div className="space-y-5">
                  {/* 1. Compact Dashboard + Course Progress */}
                  <Card className="space-y-4 p-5">
                    <CardHeader
                      title={tr('Tiến độ & chuyên cần lớp học')}
                      actions={
                        <Link to="/group-learning/progress" className="rp-link text-xs font-semibold">
                          {tr('Xem tổng hợp tất cả lớp')}
                        </Link>
                      }
                    />
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5">
                        <p className="text-xs text-rp-text-muted">{tr('Buổi đã hoàn thành')}</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-rp-text">
                          {progress.completedSessions}/{totalSessionsCount}
                        </p>
                      </div>
                      <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5">
                        <p className="text-xs text-rp-text-muted">{tr('Có mặt')}</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-rp-success">{attendance.presentCount}</p>
                      </div>
                      <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5">
                        <p className="text-xs text-rp-text-muted">{tr('Vắng mặt')}</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-rp-text">
                          {attendance.absentCount + attendance.excusedCount}
                        </p>
                      </div>
                      <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5">
                        <p className="text-xs text-rp-text-muted">{tr('Tỷ lệ chuyên cần')}</p>
                        <p className={cx('mt-1 font-bold tabular-nums', attendance.markedCount > 0 ? 'text-xl text-rp-brand-strong' : 'text-sm text-rp-text-muted')}>
                          {attendance.markedCount === 0
                            ? tr('Chưa có điểm danh')
                            : `${attendance.percent}%`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs text-rp-text-muted">
                        <span>{tr('Tiến trình khóa học')}</span>
                        <span className="font-semibold tabular-nums text-rp-text">
                          {trf('{0}/{1} buổi', { 0: progress.completedSessions, 1: totalSessionsCount })} ({progress.percent}%)
                        </span>
                      </div>
                      <ProgressBar value={progress.completedSessions} max={totalSessionsCount || 1} tone="success" />
                    </div>
                  </Card>

                  {/* 2. Attendance History Table (Shared DataTable, past/marked sessions only) */}
                  <Card className="space-y-4 p-5">
                    <CardHeader
                      title={tr('Lịch sử điểm danh')}
                      actions={
                        attendanceHistoryRows.length > 5 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllAttendance((v) => !v)}
                          >
                            {showAllAttendance
                              ? tr('Thu gọn')
                              : trf('Xem tất cả ({0})', { 0: attendanceHistoryRows.length })}
                          </Button>
                        )
                      }
                    />
                    {attendanceHistoryRows.length === 0 ? (
                      <ContextualEmptyState
                        variant="compact"
                        illustration="calendar"
                        title={tr('Chưa có dữ liệu điểm danh nào được ghi nhận.')}
                      />
                    ) : (
                      <DataTable
                        columns={attendanceColumns}
                        rows={showAllAttendance ? attendanceHistoryRows : attendanceHistoryRows.slice(0, 5)}
                        rowKey={(r) => r.id}
                        pageSize={showAllAttendance ? 15 : 5}
                        alwaysShowPagination={false}
                        itemLabel="buổi học"
                        minTableWidth="min-w-[440px]"
                      />
                    )}
                  </Card>

                  {/* 3. Homework Statistics (cohort-scoped, balanced 4 cards) */}
                  <Card className="space-y-4 p-5">
                    <CardHeader
                      title={tr('Thống kê bài tập')}
                      actions={
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSection('homework')}>
                          {tr('Xem chi tiết bài tập')}
                        </Button>
                      }
                    />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5 text-xs">
                        <p className="text-rp-text-muted">{tr('Được giao')}</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-rp-text">{homeworkSummaryStats.assigned}</p>
                      </div>
                      <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5 text-xs">
                        <p className="text-rp-text-muted">{tr('Đã nộp')}</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-rp-text">{homeworkSummaryStats.submitted}</p>
                      </div>
                      <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5 text-xs">
                        <p className="text-rp-text-muted">{tr('Đã chấm')}</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-rp-success">{homeworkSummaryStats.graded}</p>
                      </div>
                      <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5 text-xs">
                        <p className="text-rp-text-muted">{tr('Chưa nộp')}</p>
                        <p className={cx('mt-1 text-xl font-bold tabular-nums', homeworkSummaryStats.outstanding > 0 ? 'text-rp-brand-strong' : 'text-rp-text')}>
                          {homeworkSummaryStats.outstanding}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* 4. Published Mentor Feedback (shown alongside or inside Teaching/Completed) */}
                  {lifecycle.id !== 'Completed' && (
                    <Card className="space-y-4 p-5">
                      <CardHeader title={tr('Nhận xét của Giáo viên')} />
                      {completionQuery.isPending ? (
                        <SakuraLoader variant="inline" size={18} context="data" delay={140} />
                      ) : publishedFeedbackList.length === 0 ? (
                        <ContextualEmptyState
                          variant="inline"
                          size="sm"
                          illustration="review"
                          title={tr('Chưa có nhận xét nào được công bố.')}
                        />
                      ) : (
                        <div className="space-y-2.5 text-xs">
                          {publishedFeedbackList.map((f, idx) => (
                            <article key={`${f.publishedAtUtc}-${idx}`} className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <UserAvatar src={f.mentorAvatarUrl} name={f.mentorName || tr('Giáo viên')} size="xs" />
                                  <span className="font-semibold text-rp-text">{f.mentorName || tr('Giáo viên')}</span>
                                </div>
                                <span className="text-[12px] tabular-nums text-rp-text-muted">
                                  {formatVnDateTime(f.publishedAtUtc)}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {f.title && <span className="font-medium text-rp-text-2">{f.title}</span>}
                                {f.score != null && (
                                  <Badge tone="brand" icon={false} size="sm">
                                    {trf('Điểm {0}', { 0: f.score })}
                                  </Badge>
                                )}
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed text-rp-text-2">{f.feedback}</p>
                            </article>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* 5. Official End-of-Course Summary Report — Strictly ONLY when class is Completed */}
                  {current.cohortId && lifecycle.id === 'Completed' && (
                    <CohortCompletionSummary
                      summary={completionQuery.data || null}
                      error={completionQuery.error || null}
                      onRetry={() => completionQuery.refetch()}
                      retrying={completionQuery.isFetching}
                    />
                  )}
                </div>
              )
            )}

            {/* TAB 5: REVIEWS & SUPPORT */}
            {activeSection === 'support' && (
              <div className="space-y-5">
                {current.cohortId && (
                  <CohortMentorReviewSection
                    courseId={current.id}
                    summary={completionQuery.data || null}
                    busy={busy}
                    onRun={wrappedAction}
                  />
                )}

                {current.cohortId && current.status !== 'Completed' && (
                  <LearnerCohortTransferPanel course={current} cohorts={cohorts} busy={busy} onRun={wrappedAction} />
                )}

                {(current.status === 'Completed' || (current.requests || []).length > 0) && (
                  <Card className="space-y-4 p-5">
                    <CardHeader title={tr('Hỗ trợ ôn lại khi trượt JLPT chính thức')} />
                    <p className="text-xs text-rp-text-muted">
                      {tr('Quản trị viên duyệt minh chứng và điều kiện nộp bài tập. Sau khi Quản trị viên duyệt, Giáo viên lập kế hoạch hỗ trợ ôn lại (không tự cấp buổi học miễn phí).')}
                    </p>

                    {current.status === 'Completed' && !(current.requests || []).some((r) => r.status === 'Pending') && (
                      <form
                        className="space-y-3 rounded-xl border border-rp-line bg-rp-bg-2/60 p-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          wrappedAction(async () => {
                            const payload = new FormData();
                            const utcExam = toUtcIsoDate(examDate);
                            const utcPublished = toUtcIsoDate(resultPublishedAt);
                            if (utcExam) payload.append('examDate', utcExam);
                            if (utcPublished) payload.append('resultPublishedAt', utcPublished);
                            payload.append('reason', retakeReason.trim());
                            if (retakeFile) payload.append('evidence', retakeFile);
                            await uploadRetakeEvidence(current.id, payload);
                            setExamDate('');
                            setResultPublishedAt('');
                            setRetakeReason('');
                            setRetakeFile(null);
                          }, 'Đã gửi yêu cầu hỗ trợ JLPT lên Quản trị viên.');
                        }}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label={tr('Ngày thi JLPT')} required>
                            <DateInput value={examDate} onChange={(e) => setExamDate(e.target.value)} required disabled={busy} />
                          </Field>
                          <Field label={tr('Ngày công bố kết quả')} required>
                            <DateInput value={resultPublishedAt} onChange={(e) => setResultPublishedAt(e.target.value)} required disabled={busy} />
                          </Field>
                        </div>
                        <Field label={tr('Lý do / Tường trình kết quả thi')} required>
                          <Textarea
                            required
                            rows={3}
                            maxLength={1000}
                            disabled={busy}
                            value={retakeReason}
                            onChange={(e) => setRetakeReason(e.target.value)}
                            placeholder={tr('Trình bày kết quả kỳ thi JLPT vừa qua và phần kỹ năng cần ôn lại…')}
                          />
                        </Field>
                        <Field label={tr('Minh chứng chính thức (PDF/PNG/JPG ≤ 10 MB)')}>
                          <FileUpload
                            accept="application/pdf,image/png,image/jpeg"
                            maxSizeMb={10}
                            disabled={busy}
                            value={retakeFile}
                            onChange={(file) => setRetakeFile(file || null)}
                          />
                        </Field>
                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={busy || !examDate || !resultPublishedAt || !retakeReason.trim()}
                            loading={busy}
                          >
                            {tr('Gửi Quản trị viên xét duyệt')}
                          </Button>
                        </div>
                      </form>
                    )}

                    {(current.requests || []).map((r) => (
                      <article className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2/40 p-4 text-xs" key={r.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge
                            tone={r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {tr(
                              r.status === 'Approved'
                                ? 'Đã duyệt'
                                : r.status === 'Rejected'
                                  ? 'Từ chối'
                                  : r.status === 'Pending'
                                    ? 'Chờ duyệt'
                                    : r.status,
                            )}
                          </Badge>
                          {r.hasEvidence && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => wrappedAction(() => openRetakeEvidence(current.id, r.id), 'Đã tải minh chứng riêng tư.')}
                            >
                              {tr('Tải minh chứng riêng tư')}
                            </Button>
                          )}
                        </div>
                        {r.reason && <p className="whitespace-pre-wrap text-rp-text">{r.reason}</p>}
                        {r.decisionNote && (
                          <Banner tone={r.status === 'Rejected' ? 'danger' : 'info'}>
                            <strong>{tr('Ghi chú xét duyệt:')}</strong>{' '}{r.decisionNote}
                          </Banner>
                        )}
                        {r.mentorSupportPlan && (
                          <div className="space-y-1 rounded-xl border border-rp-brand-border bg-white p-3">
                            <p className="font-semibold text-rp-brand-strong">{tr('Kế hoạch hỗ trợ ôn lại từ Giáo viên')}</p>
                            <p className="whitespace-pre-wrap text-rp-text">{r.mentorSupportPlan}</p>
                            {r.mentorSupportPlanAtUtc && (
                              <p className="text-[12px] text-rp-text-muted">
                                {trf('Cập nhật lúc {0}', { 0: formatVnDateTime(r.mentorSupportPlanAtUtc) })}
                              </p>
                            )}
                          </div>
                        )}
                      </article>
                    ))}
                  </Card>
                )}

                <Card className="p-5">
                  <button
                    type="button"
                    onClick={() => setShowComplaintBox((v) => !v)}
                    aria-expanded={showComplaintBox}
                    aria-controls="cohort-complaint-panel"
                    className="rp-focus flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-rp-text">{tr('Khiếu nại & hỗ trợ lớp học')}</h3>
                      <p className="mt-0.5 text-xs text-rp-text-muted">
                        {tr('Mở mục này khi bạn cần báo cáo chất lượng buổi học, lịch dạy hoặc cần Quản trị viên hỗ trợ.')}
                      </p>
                    </div>
                    <ChevronDown aria-hidden="true" className="rp-disclosure-chevron h-4 w-4 shrink-0 text-rp-text-muted" />
                  </button>
                  <Collapsible open={showComplaintBox} id="cohort-complaint-panel">
                    <div className="course-page mt-4 border-t border-rp-line pt-4" style={{ padding: '16px 0 0' }}>
                      <CohortComplaintPanel
                        role="Learner"
                        course={current}
                        mentors={completionQuery.data?.mentors || []}
                        busy={busy}
                        onRun={wrappedAction}
                      />
                    </div>
                  </Collapsible>
                </Card>

                <div className="flex items-center gap-2 rounded-xl border border-rp-line bg-rp-bg-2/50 px-4 py-3 text-xs text-rp-text-muted">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-rp-brand-strong" />
                  <span>{tr('Các đánh giá và yêu cầu hỗ trợ được lưu riêng theo từng lớp học để dễ theo dõi trạng thái xử lý.')}</span>
                </div>
              </div>
            )}
          </>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
