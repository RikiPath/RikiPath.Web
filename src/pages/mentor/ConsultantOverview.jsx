import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/auth/authContext.js';
import { getSession } from '@/app/auth/session.js';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Radio,
  School,
  Star,
  UsersRound,
  Video,
} from 'lucide-react';
import { AdminShell, MentorShell } from '@/layouts';
import { courseGet, getCohorts, getCohortHomework } from '@/features/cohorts/api/cohortApi.js';
import {
  formatCompletionRatio,
  formatMinutesVi,
  getMentorKpiSummary,
} from '@/features/mentor/api/mentorGovernanceApi.js';
import { formatVnDateTime, parseUtcDate } from '@/utils/vnDateTime.js';
import { toVnDateKey } from '@/features/scheduling/utils/calendarGeometry.js';
import { useNow } from '@/hooks/useNow.js';
import { Badge, Banner, Button, Card, CardHeader, EmptyState, ErrorState, FeatureIcon, ProgressBar, RefreshingIndicator, SakuraLoader, StaleDataBar } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

// Teaching workspace. All metrics strictly reflect live Backend API responses (zero mocked/hardcoded numbers).
const QUICK_ACTIONS = [
  { to: '/mentor-study-courses/', label: 'Quản lý lớp nhóm', note: 'Lớp phụ trách, buổi học, điểm danh', feature: 'mentor' },
  { to: '/mentor-homework/', label: 'Bài tập & chấm điểm', note: 'Giao bài, xem bài nộp, chấm điểm', feature: 'writing' },
  { to: '/mentor-grading/', label: 'Chấm bài luyện tập', note: 'Đánh giá nhanh bài viết & nói JLPT', feature: 'mock' },
  { to: '/work-schedule/', label: 'Lịch làm việc', note: 'Buổi dạy sắp diễn ra & đã hoàn thành', feature: 'calendar' },
  { to: '/mentor-shift-schedule/', label: 'Đăng ký lịch dạy', note: 'Đăng ký khung giờ & theo dõi duyệt', feature: 'calendar' },
  { to: '/mentor-attendance-kpi/', label: 'Điểm danh & KPI', note: 'Chỉ số giảng dạy thực tế', feature: 'reading' },
  { to: '/mentor-reviews/', label: 'Đánh giá học viên', note: 'Phản hồi từ học viên lớp nhóm', feature: 'grammar' },
  { to: '/mentor-disputes/', label: 'Khiếu nại & hỗ trợ', note: 'Theo dõi và phản hồi yêu cầu từ học viên', feature: 'neutral' },
  { to: '/mentor-profile/', label: 'Hồ sơ chuyên môn', note: 'Giới thiệu, chứng chỉ & trạng thái duyệt', feature: 'neutral' },
];

const DAY_MS = 24 * 3600 * 1000;

function extractRoomId(meetingUrl) {
  const m = String(meetingUrl || '').match(/\/meeting-room\/([0-9a-f-]+)/i);
  return m ? m[1] : null;
}

/** Collects upcoming/live sessions & overdue scheduled sessions waiting for attendance confirmation. */
function analyzeSessions(courses, nowMs, cohortNameMap) {
  const seenUpcoming = new Map();
  const pendingAttendance = [];

  for (const course of courses) {
    if (course.status === 'Cancelled') continue;
    const durationMin = Number(course.sessionMinutes) || 90;
    const cohortTitle = (course.cohortId && cohortNameMap.get(course.cohortId)) || course.cohortName || course.name;
    for (const session of course.sessions || []) {
      if (session.status !== 'Scheduled' || !session.scheduledAt) continue;
      const at = parseUtcDate(session.scheduledAt)?.getTime();
      if (!Number.isFinite(at)) continue;
      const endAt = at + durationMin * 60000;

      if ((course.status === 'Active' || course.status === 'Transferred') && endAt <= nowMs) {
        pendingAttendance.push({
          key: `${course.id}-${session.id}`,
          courseId: course.id,
          cohortId: course.cohortId,
          cohortName: cohortTitle,
          learnerName: course.learnerName,
          number: session.number,
          at,
        });
      }

      if (nowMs <= endAt + 15 * 60000) {
        const key = `${course.cohortId ?? `c${course.id}`}-${session.number}`;
        const existing = seenUpcoming.get(key);
        const roomId = extractRoomId(session.meetingUrl);
        const isLive = nowMs >= at - 15 * 60000 && nowMs <= endAt + 30 * 60000;
        const entry = existing || {
          key,
          at,
          endAt,
          cohortId: course.cohortId,
          name: cohortTitle,
          level: course.level,
          number: session.number,
          durationMin,
          roomId,
          isLive,
          learners: [],
        };
        if (course.learnerName && !entry.learners.includes(course.learnerName)) {
          entry.learners.push(course.learnerName);
        }
        seenUpcoming.set(key, entry);
      }
    }
  }

  return {
    upcoming: [...seenUpcoming.values()].sort((a, b) => a.at - b.at),
    pendingAttendance: pendingAttendance.sort((a, b) => a.at - b.at),
  };
}

function summarizeCohorts(courses, cohortNameMap) {
  const byCohort = new Map();
  for (const course of courses) {
    if (course.status === 'Cancelled' || !course.cohortId) continue;
    const cur = byCohort.get(course.cohortId) || {
      cohortId: course.cohortId,
      name: cohortNameMap.get(course.cohortId) || course.cohortName || course.name,
      level: course.level,
      activeLearners: 0,
      presentSessions: 0,
      totalCourseSessions: 0,
    };
    if (course.status === 'Active' || course.status === 'Ready') cur.activeLearners += 1;
    const sess = course.sessions || [];
    cur.presentSessions += sess.filter((s) => s.status === 'Present').length;
    cur.totalCourseSessions += sess.length;
    byCohort.set(course.cohortId, cur);
  }
  return [...byCohort.values()];
}

export default function ConsultantOverview() {
  const { tr, trf } = useLocale();
  const { user } = useAuth();
  const isAdminViewer = String(user?.role || '').toLowerCase() === 'admin';
  const nowMs = useNow(60000);
  const session = getSession();
  const uid = session?.userId ?? 'anon';
  const live = !session?.isPreview && !isAdminViewer;

  const query = useQuery({
    queryKey: ['mentor-overview-courses', uid, live ? 'live' : 'preview'],
    queryFn: () => (live ? courseGet() : []),
    enabled: !isAdminViewer,
  });

  const cohortsListQuery = useQuery({
    queryKey: ['mentor-overview-cohorts', uid],
    queryFn: () => (live ? getCohorts() : []),
    enabled: !isAdminViewer,
  });

  const cohortNameMap = useMemo(() => {
    const map = new Map();
    (cohortsListQuery.data || []).forEach((ch) => {
      if (ch?.id && ch?.name) map.set(ch.id, ch.name);
    });
    return map;
  }, [cohortsListQuery.data]);

  const homeworkQuery = useQuery({
    queryKey: ['mentor-overview-homework', uid],
    queryFn: () => (live ? getCohortHomework() : []),
    enabled: !isAdminViewer,
  });

  const kpiQuery = useQuery({
    queryKey: ['mentor-overview-kpi', uid],
    queryFn: () => (live ? getMentorKpiSummary() : null),
    enabled: !isAdminViewer,
  });

  const courses = useMemo(() => (Array.isArray(query.data) ? query.data : []), [query.data]);
  const homeworkList = useMemo(() => (Array.isArray(homeworkQuery.data) ? homeworkQuery.data : []), [homeworkQuery.data]);
  const pendingGrading = useMemo(
    () => homeworkList.filter((h) => String(h.status || '').toLowerCase() === 'submitted'),
    [homeworkList],
  );
  const kpi = kpiQuery.data;

  const active = courses.filter((c) => c.status === 'Active' || c.status === 'Ready');
  const cohortSummary = useMemo(() => summarizeCohorts(courses, cohortNameMap), [courses, cohortNameMap]);
  const { upcoming, pendingAttendance } = useMemo(() => analyzeSessions(courses, nowMs, cohortNameMap), [courses, nowMs, cohortNameMap]);
  const todayKey = toVnDateKey(new Date(nowMs));
  const todaySessions = upcoming.filter((s) => toVnDateKey(new Date(s.at)) === todayKey);
  const thisWeekCount = upcoming.filter((s) => s.at < nowMs + 7 * DAY_MS).length;
  const [next, ...later] = upcoming;

  const stats = [
    { label: 'Lớp nhóm phụ trách', value: cohortSummary.length, icon: School, tone: 'bg-tone-mentor-bg text-tone-mentor' },
    { label: 'Học viên đang học', value: active.length, icon: UsersRound, tone: 'bg-tone-reading-bg text-tone-reading' },
    { label: 'Buổi dạy 7 ngày tới', value: thisWeekCount, icon: CalendarClock, tone: 'bg-tone-calendar-bg text-tone-calendar' },
    { label: 'Bài tập chờ chấm điểm', value: homeworkQuery.isError ? '—' : pendingGrading.length, icon: ClipboardCheck, tone: 'bg-tone-writing-bg text-tone-writing' },
  ];

  const completionPct = kpi && kpi.totalAssignedSessions > 0
    ? Math.min(100, Math.round((kpi.completedValidSessions / kpi.totalAssignedSessions) * 100))
    : 0;
  const hwTotal = kpi?.homeworkSubmittedCount || 0;
  const hwGradedPct = hwTotal > 0 ? Math.min(100, Math.round(((kpi?.homeworkGradedCount || 0) / hwTotal) * 100)) : 0;

  if (isAdminViewer) {
    return (
      <AdminShell breadcrumb={tr('Bảng điều khiển Giáo viên')}>
        <div className="rp-container py-6">
          <Banner
            tone="info"
            title={tr('Trang này hiển thị không gian giảng dạy cá nhân của Giáo viên')}
            actions={(
              <Button as={Link} to="/admin/dashboard/" variant="primary" size="sm">
                {tr('Về Bảng điều khiển Quản trị')}
              </Button>
            )}
          >
            {tr('Vui lòng sử dụng khu vực Quản trị để điều phối đội ngũ Giáo viên và lớp học nhóm.')}
          </Banner>
        </div>
      </AdminShell>
    );
  }

  return (
    <MentorShell breadcrumb={tr('Bảng điều khiển')}>
      <div data-page="ConsultantOverview" className="rp-container rp-cq space-y-[var(--rp-space-section)] py-[var(--rp-space-page-y)]">
        <h1 className="sr-only">{tr('Không gian giảng dạy')}</h1>
        {query.isFetching && !query.isPending && (
          <div className="flex justify-end">
            <RefreshingIndicator active />
          </div>
        )}

        {query.isPending ? (
          <SakuraLoader variant="section" context="dashboard" label={tr('Đang tải không gian giảng dạy')} delay={160} />
        ) : query.isError && !query.data ? (
          <Card><ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} /></Card>
        ) : (
          <>
            {query.isError && query.data && (
              <StaleDataBar onRetry={() => query.refetch()} retrying={query.isFetching} />
            )}

            <dl style={{ '--rp-grid-min': '13rem' }} className="rp-fluid-grid-fill">
              {stats.map((s) => (
                <div key={s.label} className="rp-card-hover flex min-w-0 items-center gap-3 rounded-rp-card border border-rp-line bg-rp-surface p-[var(--rp-space-card-pad)] shadow-xs">
                  <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.tone}`}>
                    <s.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <dt className="rp-type-caption font-medium text-rp-text-muted">{tr(s.label)}</dt>
                    <dd className="rp-type-kpi text-rp-text">{s.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <div className="rp-cq-two-col">
              <div className="min-w-0 space-y-[var(--rp-space-section)]">
                {/* Today & Next Live / Upcoming Session */}
                <Card>
                  <CardHeader
                    title={todaySessions.length ? trf('Lịch dạy hôm nay ({0} buổi)', { 0: todaySessions.length }) : tr('Buổi dạy gần nhất')}
                    icon={<FeatureIcon feature="calendar" size="sm" />}
                  />
                  {!next ? (
                    <EmptyState
                      variant="compact"
                      illustration="calendar"
                      title={tr('Chưa có buổi dạy sắp tới')}
                      description={tr('Buổi học xuất hiện khi lớp nhóm của bạn được công bố và có học viên ghi danh.')}
                      action={<Link to="/mentor-shift-schedule/" className="rp-focus rp-link text-sm font-semibold">{tr('Đăng ký lịch dạy')}</Link>}
                    />
                  ) : (
                    <div className="rounded-rp-input border border-rp-line bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {next.level && <Badge tone="brand" icon={false}>{next.level}</Badge>}
                        <Badge tone="info">{trf('Buổi {0}', { 0: next.number })}</Badge>
                        {next.isLive && (
                          <Badge tone="success" icon={Radio}>
                            {tr('Đang mở phòng học')}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-lg font-bold text-rp-text">{next.name}</p>
                      <p className="mt-1 text-sm text-rp-text-2">{trf('{0} · {1} phút', { 0: formatVnDateTime(new Date(next.at).toISOString()), 1: next.durationMin })}</p>
                      {next.learners.length > 0 && <p className="mt-1 text-sm text-rp-text-muted">{trf('Học viên: {0}', { 0: next.learners.join(', ') })}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {next.isLive && next.roomId && (
                          <Link
                            to={`/meeting-room/${next.roomId}`}
                            className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-rp-input bg-emerald-600 px-3.5 text-[13px] font-semibold text-white hover:bg-emerald-700 rp-press"
                          >
                            <Video className="h-4 w-4" />{' '}{tr('Vào phòng học chung')}
                          </Link>
                        )}
                        <Link
                          to={next.cohortId ? `/mentor-study-courses/${next.cohortId}/` : '/mentor-study-courses/'}
                          className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-rp-input bg-rp-brand-pressed px-3.5 text-[13px] font-semibold text-white hover:bg-rp-brand-strong rp-press"
                        >
                          {tr('Mở lớp phụ trách')}{' '}<ArrowRight aria-hidden="true" className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {later.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-rp-text-muted">{tr('Các buổi tiếp theo')}</p>
                      <ol className="divide-y divide-rp-line">
                        {later.slice(0, 6).map((s) => (
                          <li key={s.key} className="flex flex-wrap items-center gap-2 py-2.5 sm:flex-nowrap sm:gap-3">
                            <span className="w-full shrink-0 text-[13px] font-semibold tabular-nums text-rp-text sm:w-36">{formatVnDateTime(new Date(s.at).toISOString())}</span>
                            <span className="min-w-0 flex-1 truncate text-sm text-rp-text-2">{s.name}</span>
                            <Badge size="sm" tone="neutral">{trf('Buổi {0}', { 0: s.number })}</Badge>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </Card>

                {/* Pending Attendance & Homework Backlog */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader title={tr('Chốt điểm danh chờ xử lý')} description={trf('{0} buổi đã kết thúc', { 0: pendingAttendance.length })} />
                    {pendingAttendance.length === 0 ? (
                      <EmptyState
                        variant="inline"
                        size="sm"
                        illustration="done"
                        title={tr('Không có buổi học nào trễ chốt điểm danh.')}
                      />
                    ) : (
                      <ul className="space-y-2">
                        {pendingAttendance.slice(0, 4).map((p) => (
                          <li key={p.key} className="flex items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-bg-2/70 px-3 py-2 text-[12.5px]">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-rp-text">{trf('{0} · Buổi {1}', { 0: p.cohortName, 1: p.number })}</p>
                              <p className="truncate text-[11.5px] text-rp-text-muted">{p.learnerName} · {formatVnDateTime(new Date(p.at).toISOString())}</p>
                            </div>
                            <Link to={p.cohortId ? `/mentor-study-courses/${p.cohortId}/?section=attendance` : '/mentor-study-courses/'} className="rp-link shrink-0 font-semibold">
                              {tr('Chốt ngay')}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>

                  <Card>
                    <CardHeader title={tr('Bài tập chờ chấm điểm')} description={trf('{0} bài đã nộp', { 0: pendingGrading.length })} />
                    {homeworkQuery.isPending ? (
                      <SakuraLoader variant="inline" size={16} context="homework" />
                    ) : homeworkQuery.isError ? (
                      <p className="text-xs text-rp-text-muted">{tr('Không tải được danh sách bài tập chờ chấm.')}</p>
                    ) : pendingGrading.length === 0 ? (
                      <EmptyState
                        variant="inline"
                        size="sm"
                        illustration="done"
                        title={tr('Đã chấm hết bài tập học viên đã nộp.')}
                      />
                    ) : (
                      <ul className="space-y-2">
                        {pendingGrading.slice(0, 4).map((hw) => (
                          <li key={hw.id} className="flex items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-bg-2/70 px-3 py-2 text-[12.5px]">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-rp-text">{tr(hw.title)}</p>
                              <p className="truncate text-[11.5px] text-rp-text-muted">{hw.learnerName || tr('Học viên lớp nhóm')}</p>
                            </div>
                            <Link to="/mentor-homework/" className="rp-link shrink-0 font-semibold">
                              {tr('Chấm bài')}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </div>

                {/* Active Cohorts Breakdown */}
                {cohortSummary.length > 0 && (
                  <Card>
                    <CardHeader title={tr('Lớp nhóm đang phụ trách')} description={tr('Dữ liệu ghi danh & tiến độ thực tế')} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      {cohortSummary.map((ch) => (
                        <Link
                          key={ch.cohortId}
                          to={`/mentor-study-courses/${ch.cohortId}/`}
                          className="rp-card-hover block rounded-xl border border-rp-line bg-white p-3.5 transition hover:border-rp-brand-border"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge size="sm" tone="brand" icon={false}>{ch.level || 'JLPT'}</Badge>
                            <span className="text-[11.5px] font-medium text-rp-text-muted">{trf('{0} học viên', { 0: ch.activeLearners })}</span>
                          </div>
                          <p className="mt-2 truncate text-[14px] font-bold text-rp-text">{ch.name}</p>
                          <p className="mt-0.5 text-[12px] text-rp-text-muted">
                            {tr('Đã xác nhận hoàn thành')}{' '}{ch.presentSessions}/{ch.totalCourseSessions || 0}{' '}{tr('lượt buổi')}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              <div className="min-w-0 space-y-[var(--rp-space-section)]">
                {/* Real Teaching KPI Card */}
                {kpiQuery.isError ? (
                  <Card>
                    <ErrorState
                      variant="inline"
                      compact
                      error={kpiQuery.error}
                      title={tr('Chưa tải được chỉ số giảng dạy')}
                      onRetry={() => kpiQuery.refetch()}
                      retrying={kpiQuery.isFetching}
                    />
                  </Card>
                ) : kpi && (
                  <Card>
                    <CardHeader title={tr('Hiệu suất giảng dạy kỳ này')} description={tr('Thống kê từ điểm danh & bài tập thật')} />
                    <div className="space-y-3.5 text-[13px]">
                      <div>
                        <div className="mb-1 flex justify-between text-[12px]">
                          <span className="text-rp-text-2">{tr('Hoàn thành buổi học hợp lệ')}</span>
                          <span className="font-bold text-rp-success">
                            {kpi.completedValidSessions}/{kpi.totalAssignedSessions} ({formatCompletionRatio(kpi.completedValidSessions, kpi.totalAssignedSessions)})
                          </span>
                        </div>
                        <ProgressBar value={completionPct} tone="success" size="md" label={tr('Hoàn thành buổi học hợp lệ')} />
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between text-[12px]">
                          <span className="text-rp-text-2">{tr('Chấm bài tập về nhà đã nộp')}</span>
                          <span className="font-bold text-rp-brand-strong">
                            {kpi.homeworkGradedCount}/{kpi.homeworkSubmittedCount} ({hwGradedPct}%)
                          </span>
                        </div>
                        <ProgressBar value={hwGradedPct} tone="brand" size="md" label={tr('Chấm bài tập về nhà đã nộp')} />
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-rp-bg-2 px-3 py-2.5 text-[12px]">
                        <span className="text-rp-text-2">{tr('Thời lượng xác nhận')}</span>
                        <strong className="text-rp-text">{formatMinutesVi(kpi.confirmedTeachingMinutes)}</strong>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-rp-bg-2 px-3 py-2.5 text-[12px]">
                        <span className="inline-flex items-center gap-1 text-rp-text-2">
                          <Star className="h-3.5 w-3.5 text-amber-500" />{' '}{tr('Đánh giá trung bình')}
                        </span>
                        <strong className="text-rp-text">
                          {kpi.averageRating != null ? `${kpi.averageRating} ★ (${kpi.totalReviewsCount})` : tr('Chưa có đánh giá')}
                        </strong>
                      </div>
                    </div>
                  </Card>
                )}

                <Card as="nav" aria-label={tr('Thao tác nhanh')}>
                  <CardHeader title={tr('Thao tác nhanh')} icon={<FeatureIcon feature="mentor" size="sm" icon={ClipboardList} />} />
                  <ul className="space-y-1">
                    {QUICK_ACTIONS.map((a) => (
                      <li key={a.to}>
                        <Link to={a.to} className="rp-focus rp-interactive group flex items-center gap-3 rounded-rp-input p-2 transition-colors hover:bg-rp-brand-tint/40">
                          <span className="rp-icon-tilt"><FeatureIcon feature={a.feature} size="sm" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-rp-text">{tr(a.label)}</span>
                            <span className="block truncate text-xs text-rp-text-muted">{tr(a.note)}</span>
                          </span>
                          <ArrowRight aria-hidden="true" className="h-4 w-4 text-rp-text-muted transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </MentorShell>
  );
}
