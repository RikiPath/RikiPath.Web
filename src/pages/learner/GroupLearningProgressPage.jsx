import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookCheck, CalendarCheck2, CheckCircle2 } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { getHomeworkReport } from '@/features/calendar/api/calendarApi.js';
import { toVnDateKey } from '@/features/scheduling/utils/calendarGeometry.js';
import { useLearnerCohortWorkspace } from '@/features/cohorts/hooks/useLearnerCohortWorkspace.js';
import { classifyHomeworkItem, displayCourseTitle } from '@/features/calendar/utils/calendarEventsModel.js';
import { useLocale } from '@/locales/locale.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  FeatureIcon,
  PageContainer,
  PageHeader,
  ProgressBar,
  SakuraLoader,
} from '@/components/ui';

function daysAgoVnKey(days) {
  return toVnDateKey(new Date(Date.now() - days * 86_400_000));
}

export default function GroupLearningProgressPage() {
  const { tr, trf } = useLocale();
  const workspace = useLearnerCohortWorkspace({ includeHomework: true });
  const { uid, courses, homeworks, coursesQuery, homeworksQuery } = workspace;

  const fromDate = useMemo(() => daysAgoVnKey(90), []);
  const toDate = useMemo(() => daysAgoVnKey(0), []);

  const reportQuery = useQuery({
    queryKey: ['learner-cohort-workspace', 'homework-report', uid, fromDate, toDate],
    queryFn: () => getHomeworkReport({ from: fromDate, to: toDate }),
    staleTime: 60_000,
    retry: (c, err) => err?.status !== 401 && err?.status !== 403 && c < 1,
  });

  const activeOrCompleted = useMemo(
    () => courses.filter((c) => c && c.status !== 'Cancelled'),
    [courses],
  );

  const hwStats = useMemo(() => {
    let graded = 0;
    let submitted = 0;
    let pending = 0;
    const scoreList = [];
    homeworks.forEach((hw) => {
      const kind = classifyHomeworkItem(hw);
      if (kind === 'graded') {
        graded += 1;
        if (typeof hw.publishedGrade?.score === 'number') scoreList.push(hw.publishedGrade.score);
      } else if (kind === 'submitted') {
        submitted += 1;
      } else {
        pending += 1;
      }
    });
    const avgScore = scoreList.length > 0
      ? Math.round(scoreList.reduce((acc, s) => acc + s, 0) / scoreList.length)
      : null;
    return { total: homeworks.length, graded, submitted, pending, avgScore };
  }, [homeworks]);

  const report = reportQuery.data || null;
  const isLoading = coursesQuery.isPending && homeworksQuery.isPending;

  return (
    <LearnerShell breadcrumb={tr('Tiến độ học nhóm')}>
      <PageContainer width="default" className="space-y-6">
        <PageHeader
          eyebrow={tr('Học nhóm')}
          title={tr('Tiến độ học nhóm & chuyên cần')}
          description={tr('Tổng hợp tỷ lệ tham gia buổi học, bài tập đã nộp và tiến độ hoàn thành theo từng lớp nhóm (trong 90 ngày gần nhất & toàn khóa).')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/homework">
                <Button variant="secondary" size="sm" icon={BookCheck}>
                  {tr('Bài tập về nhà')}
                </Button>
              </Link>
              <Link to="/my-courses">
                <Button variant="primary" size="sm" iconRight={ArrowRight}>
                  {tr('Lớp của tôi')}
                </Button>
              </Link>
            </div>
          }
        />

        {(reportQuery.isError || homeworksQuery.isError) && (
          <Banner
            tone="warning"
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (reportQuery.isError) void reportQuery.refetch();
                  if (homeworksQuery.isError) void homeworksQuery.refetch();
                }}
              >
                {tr('Thử lại')}
              </Button>
            }
          >
            {tr('Chưa tải được đầy đủ số liệu bài tập hoặc báo cáo 90 ngày. Một số chỉ số tạm hiển thị — cho đến khi tải lại thành công.')}
          </Banner>
        )}

        {/* KPI Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <FeatureIcon feature="calendar" icon={CalendarCheck2} size="md" />
              <div>
                <p className="text-xs font-medium text-rp-text-muted">{tr('Chuyên cần 90 ngày')}</p>
                {reportQuery.isPending ? (
                  <SakuraLoader variant="inline" size={18} context="data" delay={140} />
                ) : reportQuery.isError ? (
                  <p className="mt-1 text-base font-bold text-rp-text-muted">—</p>
                ) : (
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-rp-text">
                    {report?.attendancePercent != null ? `${Math.round(report.attendancePercent)}%` : '—'}
                  </p>
                )}
              </div>
            </div>
            {report && (
              <p className="mt-2.5 text-xs text-rp-text-muted">
                {trf('Có mặt {0}/{1} buổi đã diễn ra', { 0: report.attendedCount, 1: report.sessionCount })}
              </p>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <FeatureIcon feature="writing" icon={BookCheck} size="md" />
              <div>
                <p className="text-xs font-medium text-rp-text-muted">{tr('Nộp bài tập 90 ngày')}</p>
                {reportQuery.isPending ? (
                  <SakuraLoader variant="inline" size={18} context="data" delay={140} />
                ) : reportQuery.isError ? (
                  <p className="mt-1 text-base font-bold text-rp-text-muted">—</p>
                ) : (
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-rp-text">
                    {report?.homeworkPercent != null ? `${Math.round(report.homeworkPercent)}%` : '—'}
                  </p>
                )}
              </div>
            </div>
            {report && (
              <p className="mt-2.5 text-xs text-rp-text-muted">
                {trf('Đã nộp {0}/{1} bài trong kỳ', { 0: report.submittedCount, 1: report.assignedCount })}
              </p>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <FeatureIcon feature="present" icon={CheckCircle2} size="md" />
              <div>
                <p className="text-xs font-medium text-rp-text-muted">{tr('Bài đã chấm / Điểm TB')}</p>
                {homeworksQuery.isPending ? (
                  <SakuraLoader variant="inline" size={18} context="data" delay={140} />
                ) : homeworksQuery.isError ? (
                  <p className="mt-1 text-base font-bold text-rp-text-muted">—</p>
                ) : (
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-rp-text">
                    {hwStats.graded}
                    {hwStats.avgScore != null && (
                      <span className="ml-1.5 text-sm font-semibold text-rp-brand-strong">({hwStats.avgScore}/100)</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            {!homeworksQuery.isPending && !homeworksQuery.isError && (
              <p className="mt-2.5 text-xs text-rp-text-muted">
                {trf('Còn {0} bài chưa nộp · {1} bài chờ chấm', { 0: hwStats.pending, 1: hwStats.submitted })}
              </p>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <FeatureIcon feature="group" size="md" />
              <div>
                <p className="text-xs font-medium text-rp-text-muted">{tr('Lớp học đã tham gia')}</p>
                {coursesQuery.isPending ? (
                  <SakuraLoader variant="inline" size={18} context="data" delay={140} />
                ) : coursesQuery.isError ? (
                  <p className="mt-1 text-base font-bold text-rp-text-muted">—</p>
                ) : (
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-rp-text">{activeOrCompleted.length}</p>
                )}
              </div>
            </div>
            <p className="mt-2.5 text-xs text-rp-text-muted">{tr('Bao gồm lớp đang học và đã hoàn thành')}</p>
          </Card>
        </section>

        {/* Per-class Progress List */}
        {isLoading ? (
          <Card className="p-8">
            <SakuraLoader context="cohort" label={tr('Đang tải tiến độ từng lớp...')} />
          </Card>
        ) : coursesQuery.isError ? (
          <Card className="p-6">
            <ContextualErrorState
              error={coursesQuery.error}
              title={tr('Chưa tải được dữ liệu tiến độ')}
              onRetry={() => coursesQuery.refetch()}
              retrying={coursesQuery.isFetching}
            />
          </Card>
        ) : activeOrCompleted.length === 0 ? (
          <Card className="p-6">
            <ContextualEmptyState
              context="cohort"
              title={tr('Chưa có lớp nhóm để thống kê')}
              description={tr('Hãy đăng ký lớp nhóm đầu tiên để theo dõi chuyên cần và kết quả bài tập theo tuần.')}
              action={
                <Link
                  to="/cohorts"
                  className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-xl bg-rp-brand-strong px-4 text-sm font-semibold text-white"
                >
                  {tr('Khám phá lớp học')}
                </Link>
              }
            />
          </Card>
        ) : (
          <Card className="space-y-4 p-5">
            <CardHeader title={tr('Chi tiết tiến độ theo từng lớp')} />
            <div className="space-y-3">
              {activeOrCompleted.map((course) => {
                const sessions = Array.isArray(course.sessions) ? course.sessions : [];
                const present = sessions.filter((s) => s.status === 'Present').length;
                const total = sessions.length;
                const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                const courseHws = homeworks.filter(
                  (hw) =>
                    (course.cohortId && Number(hw.cohortId) === Number(course.cohortId)) ||
                    Number(hw.studyCourseId) === Number(course.id),
                );
                const submittedHws = courseHws.filter((h) => Boolean(h.submission) || h.status === 'Graded').length;
                return (
                  <div
                    key={course.id}
                    className="flex flex-col gap-3 rounded-2xl border border-rp-line bg-rp-bg-2/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/my-courses/${course.id}?section=progress`}
                          className="rp-focus truncate text-sm font-bold text-rp-text hover:text-rp-brand-strong"
                        >
                          {displayCourseTitle(course, tr('Lớp học nhóm'))}
                        </Link>
                        {course.level && (
                          <Badge tone="brand" size="sm">
                            JLPT {course.level}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-rp-text-muted">
                        {tr('Giáo viên:')} {course.mentorName || tr('Chưa phân công')} ·{' '}
                        {homeworksQuery.isError
                          ? tr('Bài tập: —')
                          : trf('Bài tập đã nộp: {0}/{1}', { 0: submittedHws, 1: courseHws.length })}
                      </p>
                      <div>
                        <div className="mb-1 flex justify-between text-[11px] text-rp-text-muted">
                          <span>{tr('Chuyên cần buổi học')}</span>
                          <span className="font-semibold tabular-nums text-rp-text">
                            {present}/{total} ({pct}%)
                          </span>
                        </div>
                        <ProgressBar value={pct} max={100} size="sm" />
                      </div>
                    </div>
                    <Link
                      to={`/my-courses/${course.id}?section=progress`}
                      className="rp-focus inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-rp-line bg-rp-surface px-3.5 text-xs font-semibold text-rp-text hover:border-rp-brand-border hover:text-rp-brand-strong"
                    >
                      {tr('Mở chi tiết')}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
