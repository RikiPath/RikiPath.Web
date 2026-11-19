import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookCheck,
  CalendarDays,
  ChartNoAxesCombined,
  Compass,
  School,
  UsersRound,
  Video,
} from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { useLearnerCohortWorkspace } from '@/features/cohorts/hooks/useLearnerCohortWorkspace.js';
import { useWorkspaceCalendar } from '@/features/calendar/hooks/useWorkspaceCalendar.js';
import { displayCourseTitle, homeworkStatusMeta } from '@/features/calendar/utils/calendarEventsModel.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';
import {
  Badge,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  FeatureIcon,
  PageHeader,
  ProgressBar,
  SakuraLoader,
} from '@/components/ui';

const QUICK_LINKS = [
  { to: '/cohorts', label: 'Khám phá lớp học', note: 'Chọn lớp nhóm theo cấp độ JLPT', icon: Compass, tone: 'group' },
  { to: '/my-courses', label: 'Lớp của tôi', note: 'Quản lý lịch, điểm danh & hỗ trợ', icon: School, tone: 'group' },
  { to: '/calendar', label: 'Lịch học', note: 'Xem ngày, tuần, tháng theo GMT+7', icon: CalendarDays, tone: 'calendar' },
  { to: '/homework', label: 'Bài tập về nhà', note: 'Nộp bài & theo dõi nhận xét của Giáo viên', icon: BookCheck, tone: 'writing' },
  { to: '/mentors', label: 'Tìm Giáo viên', note: 'Xem hồ sơ & lớp phụ trách', icon: UsersRound, tone: 'mentor' },
  { to: '/group-learning/progress', label: 'Tiến độ học nhóm', note: 'Thống kê chuyên cần & bài tập', icon: ChartNoAxesCombined, tone: 'present' },
];

const STATUS_BADGE = {
  Active: { tone: 'success', label: 'Đang học' },
  Ready: { tone: 'info', label: 'Sắp khai giảng' },
  PendingPayment: { tone: 'warning', label: 'Chờ thanh toán' },
  Completed: { tone: 'neutral', label: 'Đã hoàn thành' },
  Transferred: { tone: 'neutral', label: 'Đã chuyển lớp' },
};

export default function GroupLearningOverviewPage() {
  const { tr, trf } = useLocale();
  const workspace = useLearnerCohortWorkspace();
  const calendar = useWorkspaceCalendar({ roleKey: 'Learner', includeSrs: false });

  const { courses, coursesQuery } = workspace;
  const { nowMs, summary, isLoading: calendarLoading } = calendar;
  const { liveSessions, upcomingSessions, pendingHomeworks } = summary;

  const activeCourses = useMemo(
    () => courses.filter((c) => c.status === 'Active' || c.status === 'Ready' || c.status === 'PendingPayment'),
    [courses],
  );
  const nextSession = liveSessions[0] || upcomingSessions[0] || null;

  return (
    <LearnerShell breadcrumb={tr('Học cùng Giáo viên')}>
      <div className="rp-container space-y-6 py-6 lg:py-8">
        <PageHeader
          eyebrow={tr('Học nhóm · 10 tuần · 90 phút/buổi · 1–4 học viên')}
          title={tr('Học cùng Giáo viên')}
          description={tr('Điểm điều phối trung tâm cho lớp học của bạn: buổi học sắp tới, bài tập cần nộp, lịch học và tiến độ chuyên cần.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/calendar"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-xl border border-rp-line bg-rp-surface px-4 text-sm font-semibold text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint/40"
              >
                <CalendarDays className="h-4 w-4 text-rp-brand-strong" />
                {tr('Lịch học')}
              </Link>
              <Link
                to="/cohorts"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-xl bg-rp-brand-strong px-4 text-sm font-semibold text-white hover:bg-rp-brand-deep"
              >
                {tr('Khám phá lớp học')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          }
        />

        {/* Quick Navigation Grid */}
        <section aria-label={tr('Truy cập nhanh học nhóm')} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="rp-focus rp-card-hover group flex items-center gap-3.5 rounded-rp-card border border-rp-line bg-rp-surface p-4 shadow-rp-xs"
              >
                <FeatureIcon feature={item.tone} icon={Icon} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-rp-text group-hover:text-rp-brand-strong">
                    {tr(item.label)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-rp-text-muted">{tr(item.note)}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-rp-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-rp-brand-strong" />
              </Link>
            );
          })}
        </section>

        {/* Overview Content */}
        {coursesQuery.isPending ? (
          <Card className="p-8">
            <SakuraLoader context="cohort" label={tr('Đang tải tổng quan học nhóm...')} />
          </Card>
        ) : coursesQuery.isError ? (
          <Card className="p-6">
            <ContextualErrorState
              error={coursesQuery.error}
              title={tr('Chưa tải được dữ liệu lớp học')}
              onRetry={() => coursesQuery.refetch()}
              retrying={coursesQuery.isFetching}
            />
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Next Session + Active Classes */}
            <Card className="flex flex-col gap-4 p-5">
              <CardHeader
                title={tr('Buổi học sắp tới & Lớp đang tham gia')}
                actions={
                  <Link to="/my-courses" className="text-xs font-semibold rp-link">
                    {tr('Tất cả lớp')} ({courses.length})
                  </Link>
                }
              />

              {calendarLoading ? (
                <SakuraLoader variant="inline" size={20} context="calendar" delay={140} />
              ) : nextSession ? (
                <div className="rounded-2xl border border-rp-brand-border/70 bg-rp-brand-tint/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={nextSession.canJoin ? 'success' : 'brand'} size="sm">
                      {nextSession.canJoin ? tr('Phòng đang mở') : tr('Buổi sắp tới')}
                    </Badge>
                    <span className="text-xs font-medium text-rp-text-muted">
                      {formatVnDateTime(nextSession.scheduledAt)}
                    </span>
                  </div>
                  <p className="mt-2 font-bold text-rp-text">{nextSession.title}</p>
                  <p className="mt-0.5 text-xs text-rp-text-muted">{nextSession.detail}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {nextSession.canJoin ? (
                      <Link
                        to={nextSession.roomHref}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0F766E] px-3.5 text-xs font-semibold text-white hover:bg-[#115E59]"
                      >
                        <Video className="h-3.5 w-3.5" />
                        {tr('Vào phòng học ngay')}
                      </Link>
                    ) : (
                      <span className="inline-flex h-9 items-center rounded-xl bg-rp-surface px-3 text-xs font-medium text-rp-text-muted">
                        {tr(nextSession.joinReason)}
                      </span>
                    )}
                    {nextSession.secondaryHref && (
                      <Link
                        to={nextSession.secondaryHref}
                        className="inline-flex h-9 items-center rounded-xl border border-rp-line bg-rp-surface px-3 text-xs font-semibold text-rp-text hover:bg-rp-muted"
                      >
                        {tr('Không gian lớp')}
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <ContextualEmptyState
                  compact
                  context="calendar"
                  title={tr('Bạn chưa có lịch học sắp tới.')}
                  description={tr('Đăng ký lớp phù hợp để học trực tiếp 2–3 buổi mỗi tuần cùng Giáo viên.')}
                />
              )}

              {activeCourses.length > 0 && (
                <div className="space-y-2.5 border-t border-rp-line pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
                    {tr('Lớp đang hoạt động')}
                  </p>
                  {activeCourses.slice(0, 3).map((course) => {
                    const sessions = Array.isArray(course.sessions) ? course.sessions : [];
                    const attended = sessions.filter((s) => s.status === 'Present').length;
                    const total = sessions.length;
                    const badge = STATUS_BADGE[course.status] || { tone: 'neutral', label: course.status };
                    return (
                      <Link
                        key={course.id}
                        to={`/my-courses/${course.id}`}
                        className="rp-focus block rounded-xl border border-rp-line bg-rp-bg-2/50 p-3 transition-colors hover:border-rp-brand-border hover:bg-rp-surface"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-rp-text">
                            {displayCourseTitle(course, tr('Lớp học nhóm'))}
                          </span>
                          <Badge tone={badge.tone} size="sm">{tr(badge.label)}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-rp-text-muted">
                          {tr('Giáo viên')}: {course.mentorName || tr('Chưa phân công')}
                          {course.level ? ` · JLPT ${course.level}` : ''}
                        </p>
                        {total > 0 && (
                          <div className="mt-2">
                            <div className="mb-1 flex justify-between text-[11px] text-rp-text-muted">
                              <span>{tr('Chuyên cần')}</span>
                              <span className="tabular-nums font-semibold text-rp-text">
                                {trf('{0}/{1} buổi', { 0: attended, 1: total })}
                              </span>
                            </div>
                            <ProgressBar value={Math.round((attended / total) * 100)} max={100} size="sm" />
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Homework Summary */}
            <Card className="flex flex-col gap-4 p-5">
              <CardHeader
                title={tr('Bài tập về nhà sắp tới')}
                actions={
                  <Link to="/homework" className="text-xs font-semibold rp-link">
                    {tr('Mở trang bài tập')}
                  </Link>
                }
              />
              {pendingHomeworks.length === 0 ? (
                <ContextualEmptyState
                  compact
                  context="homework"
                  title={tr('Không có bài tập tồn đọng')}
                  description={tr('Mọi bài tập đã giao đều được hoàn thành hoặc sẽ hiển thị ngay khi Giáo viên giao bài mới.')}
                  action={
                    <Link
                      to="/homework"
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-rp-line bg-rp-surface px-3.5 text-xs font-semibold text-rp-text hover:bg-rp-muted"
                    >
                      {tr('Xem lịch sử bài tập')}
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-2.5">
                  {pendingHomeworks.slice(0, 5).map((hw) => {
                    const meta = homeworkStatusMeta(hw, nowMs);
                    return (
                      <li key={hw.id}>
                        <Link
                          to={hw.cohortId ? `/homework/?cohortId=${hw.cohortId}` : '/homework'}
                          className="rp-focus flex items-center justify-between gap-3 rounded-xl border border-rp-line bg-rp-bg-2/50 p-3 transition-colors hover:border-rp-brand-border hover:bg-rp-surface"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-rp-text">{hw.title}</p>
                            <p className="mt-0.5 text-xs text-rp-text-muted">
                              {hw.dueAt ? trf('Hạn nộp: {0}', { 0: formatVnDateTime(hw.dueAt) }) : tr('Chưa đặt hạn nộp')}
                            </p>
                          </div>
                          <Badge tone={meta.tone} size="sm">{tr(meta.label)}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-rp-line pt-3 text-xs">
                <span className="text-rp-text-muted">
                  {tr('Theo dõi tỷ lệ chuyên cần và hoàn thành bài tập toàn khóa.')}
                </span>
                <Link to="/group-learning/progress" className="shrink-0 font-semibold rp-link">
                  {tr('Xem tiến độ')}
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>
    </LearnerShell>
  );
}
