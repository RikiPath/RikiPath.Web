import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
  LifeBuoy,
  TrendingUp,
  Video,
} from 'lucide-react';
import { LearnerShell } from '@/layouts';
import HoldCountdown from '@/features/checkout/components/HoldCountdown.jsx';
import {
  cancelCohortEnrollment,
  courseGet,
  getCourseCompletionSummary,
  openRetakeEvidence,
  reconcileCoursePayment,
  uploadRetakeEvidence,
} from '@/features/cohorts/api/cohortApi';
import { paymentStateMessage } from '@/api/apiErrors.js';
import { useLearnerCohortWorkspace } from '@/features/cohorts/hooks/useLearnerCohortWorkspace.js';
import { courseHasStarted } from '@/features/cohorts/utils/completionHelpers';
import CohortSessionsCalendar from '@/features/scheduling/components/CohortSessionsCalendar.jsx';
import CohortHomeworkPanel from '@/features/homework/components/CohortHomeworkPanel';
import CohortCompletionSummary from '@/features/cohorts/components/CohortCompletionSummary';
import LearnerCohortTransferPanel from '@/features/cohorts/components/LearnerCohortTransferPanel';
import CohortComplaintPanel from '@/features/complaints/components/CohortComplaintPanel';
import { displayCourseTitle, getSessionJoinState } from '@/features/calendar/utils/calendarEventsModel.js';
import { formatVnDateTime, parseUtcDate, sessionStatusLabel } from '@/utils/vnDateTime.js';
import { useNow } from '@/hooks/useNow.js';
import { useLocale } from '@/locales/locale.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  DateInput,
  Field,
  FileUpload,
  Input,
  PageContainer,
  ProgressBar,
  SakuraLoader,
  Tabs,
  Textarea,
  confirmAction,
  cx,
} from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';
import '@/pages/shared/studyCourses.css';

const SECTIONS = [
  { value: 'overview', label: 'Tổng quan', icon: LayoutGrid },
  { value: 'schedule', label: 'Lịch học', icon: CalendarDays },
  { value: 'homework', label: 'Bài tập', icon: BookCheck },
  { value: 'progress', label: 'Điểm danh & tiến độ', icon: TrendingUp },
  { value: 'support', label: 'Đánh giá & hỗ trợ', icon: LifeBuoy },
];

const STATUS_META = {
  PendingPayment: { tone: 'warning', label: 'Chờ thanh toán' },
  Ready: { tone: 'info', label: 'Sắp khai giảng' },
  Active: { tone: 'success', label: 'Đang học' },
  Completed: { tone: 'neutral', label: 'Đã hoàn thành' },
  Transferred: { tone: 'neutral', label: 'Đã chuyển lớp' },
  Cancelled: { tone: 'neutral', label: 'Đã hủy' },
};

function toUtcIsoDate(val) {
  if (!val) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(val) ? new Date(`${val}T00:00:00Z`) : parseUtcDate(val);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
}

export default function CohortWorkspacePage() {
  const { tr, trf } = useLocale();
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

  const [cancelReason, setCancelReason] = useState('');
  const [showComplaintBox, setShowComplaintBox] = useState(false);
  const [examDate, setExamDate] = useState('');
  const [resultPublishedAt, setResultPublishedAt] = useState('');
  const [retakeReason, setRetakeReason] = useState('');
  const [retakeFile, setRetakeFile] = useState(null);

  const workspace = useLearnerCohortWorkspace({ includeCohorts: true, includeHomework: true });
  const { uid, courses, cohorts, homeworks, coursesQuery, busy, actionError, actionNotice, setActionError, setActionNotice, runAction } = workspace;

  const detailQuery = useQuery({
    queryKey: ['learner-cohort-workspace', 'detail', uid, numericId],
    queryFn: () => courseGet(`/${numericId}`),
    enabled: Boolean(numericId) && Number.isFinite(numericId),
    staleTime: 30_000,
  });

  const current = useMemo(() => {
    const listed = courses.find((c) => Number(c.id) === numericId);
    return detailQuery.data || listed || null;
  }, [courses, detailQuery.data, numericId]);

  const currentCohort = useMemo(
    () => cohorts.find((c) => c.id === current?.cohortId) || null,
    [cohorts, current?.cohortId],
  );

  const completionQuery = useQuery({
    queryKey: ['learner-cohort-workspace', 'completion', uid, numericId],
    queryFn: () => getCourseCompletionSummary(numericId),
    enabled: Boolean(current?.cohortId && numericId),
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

  const title = current ? displayCourseTitle(current, tr('Không gian lớp học')) : tr('Không gian lớp học');
  const sessions = useMemo(() => (Array.isArray(current?.sessions) ? current.sessions : []), [current]);
  const attendedCount = sessions.filter((s) => s.status === 'Present').length;
  const absentCount = sessions.filter((s) => s.status === 'Absent' || s.status === 'ExcusedAbsent').length;
  const scheduledCount = sessions.filter((s) => s.status === 'Scheduled').length;
  const progressPct = sessions.length > 0 ? Math.round((attendedCount / sessions.length) * 100) : 0;

  const sessionMinutes = current?.sessionMinutes || 90;
  const nextSession = useMemo(
    () =>
      sessions.find((s) => {
        if (s.status !== 'Scheduled') return false;
        const startMs = parseUtcDate(s.scheduledAt)?.getTime() ?? 0;
        return startMs + sessionMinutes * 60_000 >= nowMs - 30 * 60_000;
      }) || null,
    [sessions, sessionMinutes, nowMs],
  );
  const nextJoinState = nextSession && current ? getSessionJoinState(nextSession, current, nowMs) : null;
  const started = courseHasStarted(current, nowMs);
  const canCancelBeforeStart = Boolean(
    current && current.cohortId && current.status !== 'Cancelled' && current.paymentStatus === 'Paid' && !started,
  );

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

  const statusMeta = STATUS_META[current?.status] || { tone: 'neutral', label: current?.status || '—' };

  return (
    <LearnerShell breadcrumb={title}>
      <PageContainer width="default" className="space-y-5">
        <div>
          <Link
            to="/my-courses"
            className="rp-focus mb-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-rp-text-muted hover:text-rp-brand-strong"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {tr('Quay lại Lớp của tôi')}
          </Link>

          <IllustratedPageHeader
            icon="group"
            tone="sky"
            eyebrow={current?.level ? `JLPT ${current.level} · ${tr('Học nhóm')}` : tr('Không gian lớp học')}
            title={title}
            description={
              current
                ? trf('Giáo viên: {0} · {1} buổi · {2} phút/buổi', {
                    0: current.mentorName || tr('Chưa phân công'),
                    1: sessions.length || current.totalSessions || 0,
                    2: current.sessionMinutes || 90,
                  })
                : undefined
            }
            actions={
              current && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusMeta.tone}>{tr(statusMeta.label)}</Badge>
                  {nextJoinState?.canJoin && (
                    <Link
                      to={nextJoinState.roomHref}
                      className="rp-focus inline-flex h-11 items-center gap-1.5 rounded-xl bg-rp-success px-4 text-sm font-semibold text-white hover:opacity-95"
                    >
                      <Video className="h-4 w-4" />
                      {tr('Vào phòng học ngay')}
                    </Link>
                  )}
                </div>
              )
            }
          />
        </div>

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

        {coursesQuery.isPending && !current ? (
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
              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="space-y-4 p-5">
                  <CardHeader title={tr('Buổi học tiếp theo & Phòng học chung')} />
                  {nextSession ? (
                    <div className="space-y-2.5 rounded-2xl border border-rp-line bg-rp-bg-2/60 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-rp-text">
                          {tr('Buổi')} {nextSession.number}
                        </span>
                        <Badge tone={nextJoinState?.isLive ? 'success' : 'brand'} size="sm">
                          {nextJoinState?.isLive ? tr('Phòng đang mở') : sessionStatusLabel(nextSession)}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-rp-brand-strong">
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
                    <ContextualEmptyState
                      variant="compact"
                      illustration="calendar"
                      title={tr('Không còn buổi học sắp tới')}
                      description={tr('Tất cả các buổi trong khóa này đã diễn ra hoặc chưa được xếp thêm.')}
                    />
                  )}

                  <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-rp-line/80 bg-rp-bg-2/40 p-3.5 text-xs">
                    <div>
                      <dt className="text-rp-text-muted">{tr('Khai giảng')}</dt>
                      <dd className="mt-0.5 font-semibold text-rp-text">
                        {current.startsAt ? formatVnDateTime(current.startsAt) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-rp-text-muted">{tr('Dự kiến kết thúc')}</dt>
                      <dd className="mt-0.5 font-semibold text-rp-text">
                        {current.endsAt ? formatVnDateTime(current.endsAt) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-rp-text-muted">{tr('Chuyên cần')}</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-rp-text">
                        {attendedCount}/{sessions.length} ({progressPct}%)
                      </dd>
                    </div>
                    <div>
                      <dt className="text-rp-text-muted">{tr('Bài tập chưa nộp')}</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-rp-text">{pendingHwCount}</dd>
                    </div>
                  </dl>
                </Card>

                <div className="space-y-4">
                  {current.paymentStatus === 'Pending' && (
                    <Card className="space-y-3 border-rp-warning-line bg-rp-warning-bg/70 p-5" role="status">
                      <p className="font-bold text-rp-warning">{paymentStateMessage('AwaitingPayment')}</p>
                      {current.paymentExpiresAt && <HoldCountdown expiresAt={current.paymentExpiresAt} className="flex" />}
                      <p className="text-xs text-rp-text-2">
                        {trf(
                          'Chỗ được giữ đến: {0}. Hệ thống chỉ xác nhận ghi danh sau khi máy chủ đối chiếu giao dịch với PayOS.',
                          { 0: current.paymentExpiresAt ? formatVnDateTime(current.paymentExpiresAt) : '—' },
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {typeof current.checkoutUrl === 'string' && current.checkoutUrl.startsWith('https://') && (
                          <a
                            href={current.checkoutUrl}
                            className="rp-focus inline-flex h-9 items-center rounded-xl bg-rp-warning px-4 text-xs font-semibold text-white hover:opacity-90"
                          >
                            {tr('Tiếp tục thanh toán')}
                          </a>
                        )}
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            wrappedAction(
                              () => reconcileCoursePayment(current.id),
                              (res) =>
                                res?.paymentState === 'Confirmed' || res?.paymentStatus === 'Paid'
                                  ? 'Thanh toán đã được xác nhận. Bạn đã ghi danh thành công!'
                                  : paymentStateMessage(res?.paymentState) || 'Đang chờ PayOS xác nhận.',
                            )
                          }
                        >
                          {tr('Kiểm tra trạng thái thanh toán')}
                        </Button>
                      </div>
                    </Card>
                  )}

                  {classHomeworks.length > 0 && (
                    <Card className="space-y-3 p-5">
                      <CardHeader
                        title={tr('Bài tập gần đây')}
                        actions={
                          <Button type="button" variant="ghost" size="sm" onClick={() => setSection('homework')}>
                            {tr('Mở mục Bài tập')}
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

                  {canCancelBeforeStart && (
                    <Card className="space-y-2.5 border-dashed p-4">
                      <p className="text-xs font-bold text-rp-text">{tr('Hủy ghi danh trước ngày khai giảng')}</p>
                      <p className="text-xs text-rp-text-muted">
                        {tr('Bạn chỉ có thể hủy ghi danh cá nhân khi lớp chưa bắt đầu buổi đầu tiên.')}
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="flex-1">
                          <Input
                            maxLength={300}
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder={tr('Lý do hủy ghi danh (không bắt buộc)...')}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={busy}
                          onClick={async () => {
                            const ok = await confirmAction({
                              title: tr('Xác nhận hủy ghi danh lớp?'),
                              description: tr('Chỗ của bạn trong lớp sẽ được giải phóng ngay. Bạn có chắc chắn muốn hủy?'),
                              confirmLabel: tr('Hủy ghi danh'),
                              tone: 'danger',
                            });
                            if (!ok) return;
                            await wrappedAction(
                              () => cancelCohortEnrollment(current.id, cancelReason),
                              'Đã hủy ghi danh cá nhân và giải phóng 1 chỗ trong lớp.',
                            );
                          }}
                        >
                          {tr('Hủy ghi danh')}
                        </Button>
                      </div>
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
                      const joinState = getSessionJoinState(s, current, nowMs);
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
              <div className="space-y-5">
                <Card className="space-y-4 p-5">
                  <CardHeader
                    title={tr('Tiến độ chuyên cần & điều kiện hoàn thành')}
                    actions={
                      <Link to="/group-learning/progress" className="rp-link text-xs font-semibold">
                        {tr('Xem tổng hợp tất cả lớp')}
                      </Link>
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5">
                      <p className="text-xs text-rp-text-muted">{tr('Buổi có mặt')}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-rp-success">{attendedCount}</p>
                    </div>
                    <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5">
                      <p className="text-xs text-rp-text-muted">{tr('Buổi vắng')}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-rp-text">{absentCount}</p>
                    </div>
                    <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3.5">
                      <p className="text-xs text-rp-text-muted">{tr('Buổi sắp tới')}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-rp-brand-strong">{scheduledCount}</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs text-rp-text-muted">
                      <span>{tr('Tỷ lệ tham gia toàn khóa')}</span>
                      <span className="font-semibold tabular-nums text-rp-text">{progressPct}%</span>
                    </div>
                    <ProgressBar value={progressPct} max={100} />
                  </div>
                </Card>

                {current.cohortId && (
                  <CohortCompletionSummary
                    courseId={current.id}
                    summary={completionQuery.data || null}
                    error={completionQuery.error || null}
                    onRetry={() => completionQuery.refetch()}
                    retrying={completionQuery.isFetching}
                    busy={busy}
                    onRun={wrappedAction}
                  />
                )}
              </div>
            )}

            {/* TAB 5: REVIEWS & SUPPORT */}
            {activeSection === 'support' && (
              <div className="space-y-5">
                {current.cohortId && current.status !== 'Completed' && (
                  <LearnerCohortTransferPanel course={current} cohorts={cohorts} busy={busy} onRun={wrappedAction} />
                )}

                {(current.status === 'Completed' || (current.requests || []).length > 0) && (
                  <Card className="space-y-4 p-5">
                    <CardHeader title={tr('Hỗ trợ ôn lại khi trượt JLPT chính thức')} />
                    <p className="text-xs text-rp-text-muted">
                      {tr('Admin duyệt minh chứng và điều kiện nộp bài tập. Sau khi Admin duyệt, Giáo viên lập kế hoạch hỗ trợ ôn lại (không tự cấp buổi học miễn phí).')}
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
                          }, 'Đã gửi yêu cầu hỗ trợ JLPT lên Admin.');
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
                            {tr('Gửi Admin xét duyệt')}
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
                              <p className="text-[11px] text-rp-text-muted">
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
                    className="rp-focus flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-rp-text">{tr('Khiếu nại & hỗ trợ lớp học')}</h3>
                      <p className="mt-0.5 text-xs text-rp-text-muted">
                        {tr('Mở mục này khi bạn cần báo cáo chất lượng buổi học, lịch dạy hoặc cần Admin hỗ trợ.')}
                      </p>
                    </div>
                    <ChevronDown className={cx('h-4 w-4 text-rp-text-muted transition-transform', showComplaintBox && 'rotate-180')} />
                  </button>
                  {showComplaintBox && (
                    <div className="course-page mt-4 border-t border-rp-line pt-4" style={{ padding: '16px 0 0' }}>
                      <CohortComplaintPanel
                        role="Learner"
                        course={current}
                        mentors={completionQuery.data?.mentors || []}
                        busy={busy}
                        onRun={wrappedAction}
                      />
                    </div>
                  )}
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
