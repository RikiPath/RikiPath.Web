import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookCheck,
  Clock,
  RefreshCw,
  Sparkles,
  Video,
} from 'lucide-react';
import { LearnerShell } from '@/layouts';
import SakuraCalendar from '@/features/scheduling/components/SakuraCalendar.jsx';
import { toVnDateKey } from '@/features/scheduling/utils/calendarGeometry.js';
import { useWorkspaceCalendar } from '@/features/calendar/hooks/useWorkspaceCalendar.js';
import { displayCourseTitle, homeworkStatusMeta } from '@/features/calendar/utils/calendarEventsModel.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';
import {
  Badge,
  Card,
  ContextualErrorState,
  FeatureIcon,
  PageHeader,
  RefreshingIndicator,
  SakuraLoader,
  cx,
} from '@/components/ui';

export default function LearnerCalendarPage() {
  const { tr, trf } = useLocale();
  const calendar = useWorkspaceCalendar({ roleKey: 'Learner' });
  const {
    nowMs,
    events,
    courses,
    summary,
    srsDueCount,
    partialErrors,
    hardError,
    isLoading,
    isFetching,
    refetchAll,
  } = calendar;

  const [anchorKey, setAnchorKey] = useState(() => toVnDateKey(new Date()));
  const [selectedCohortFilter, setSelectedCohortFilter] = useState('ALL');

  const cohortOptions = useMemo(() => {
    const active = courses.filter((c) => c && c.status !== 'Cancelled' && c.status !== 'Transferred');
    const nameCounts = new Map();
    active.forEach((c) => {
      const base = displayCourseTitle(c, tr('Lớp học nhóm'));
      nameCounts.set(base, (nameCounts.get(base) || 0) + 1);
    });
    const map = new Map();
    active.forEach((c) => {
      const key = c.cohortId ? `cohort-${c.cohortId}` : `course-${c.id}`;
      if (!map.has(key)) {
        const base = displayCourseTitle(c, tr('Lớp học nhóm'));
        const duplicateName = (nameCounts.get(base) || 0) > 1 && c.mentorName;
        map.set(key, {
          key,
          cohortId: c.cohortId,
          courseId: c.id,
          label: duplicateName ? `${base} (${c.mentorName})` : base,
        });
      }
    });
    return [...map.values()];
  }, [courses, tr]);

  const filteredEvents = useMemo(() => {
    if (selectedCohortFilter === 'ALL') return events;
    return events.filter((ev) => {
      if (ev.eventType === 'srs') return true;
      const evKey = ev.cohortId ? `cohort-${ev.cohortId}` : ev.courseId ? `course-${ev.courseId}` : null;
      return evKey === selectedCohortFilter;
    });
  }, [events, selectedCohortFilter]);

  const { liveSessions, upcomingSessions, upcoming7DaysSessions, pendingHomeworks } = summary;
  const nextSession = liveSessions[0] || upcomingSessions[0] || null;

  return (
    <LearnerShell breadcrumb={tr('Lịch học')}>
      <div className="rp-container space-y-6 py-6 lg:py-8">
        <PageHeader
          eyebrow={tr('Học nhóm')}
          title={tr('Lịch học tập trung')}
          description={tr('Theo dõi toàn bộ buổi học lớp nhóm, hạn nộp bài tập và ôn tập SRS theo giờ Việt Nam (GMT+7).')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {isFetching && !isLoading && <RefreshingIndicator active label={tr('Đang đồng bộ')} />}
              <button
                type="button"
                onClick={refetchAll}
                disabled={isFetching}
                className="rp-focus inline-flex h-10 items-center gap-2 rounded-xl border border-rp-line bg-rp-surface px-3.5 text-sm font-semibold text-rp-text transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/40"
              >
                <RefreshCw className={cx('h-4 w-4 text-rp-brand-strong', isFetching && 'animate-spin')} />
                {tr('Làm mới lịch')}
              </button>
              <Link
                to="/homework"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-xl border border-rp-line bg-rp-surface px-3.5 text-sm font-semibold text-rp-text hover:bg-rp-muted"
              >
                <BookCheck className="h-4 w-4 text-[#4F46E5]" />
                {tr('Bài tập về nhà')}
              </Link>
            </div>
          }
        />

        {/* Summary KPI Strip */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <FeatureIcon feature="calendar" size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-rp-text-muted">{tr('Buổi học 7 ngày tới')}</p>
                {isLoading ? (
                  <SakuraLoader variant="inline" size={18} context="data" delay={120} />
                ) : (
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-rp-text">
                    {upcoming7DaysSessions.length}
                  </p>
                )}
              </div>
            </div>
            {nextSession && (
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-rp-line/70 pt-2.5 text-xs">
                <span className="truncate text-rp-text-muted">{formatVnDateTime(nextSession.scheduledAt)}</span>
                {nextSession.canJoin ? (
                  <Link
                    to={nextSession.roomHref}
                    className="shrink-0 font-bold text-[#0F766E] rp-underline"
                  >
                    {tr('Vào phòng')}
                  </Link>
                ) : (
                  <Link
                    to={nextSession.secondaryHref || '/my-courses'}
                    className="shrink-0 font-semibold rp-link"
                  >
                    {tr('Chi tiết')}
                  </Link>
                )}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
                <BookCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-rp-text-muted">{tr('Bài tập cần làm')}</p>
                {isLoading ? (
                  <SakuraLoader variant="inline" size={18} context="data" delay={120} />
                ) : (
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-rp-text">
                    {pendingHomeworks.length}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 border-t border-rp-line/70 pt-2.5 text-xs">
              <Link to="/homework" className="inline-flex items-center gap-1 font-semibold rp-link">
                {tr('Xem tất cả bài tập')} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <FeatureIcon feature="srs" size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-rp-text-muted">{tr('Thẻ SRS hôm nay')}</p>
                {isLoading ? (
                  <SakuraLoader variant="inline" size={18} context="data" delay={120} />
                ) : (
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-rp-text">
                    {srsDueCount}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 border-t border-rp-line/70 pt-2.5 text-xs">
              <Link to="/daily-srs" className="inline-flex items-center gap-1 font-semibold rp-link">
                {srsDueCount > 0 ? tr('Ôn tập ngay') : tr('Mở ôn tập SRS')} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <FeatureIcon feature="group" size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-rp-text-muted">{tr('Lớp học tham gia')}</p>
                {isLoading ? (
                  <SakuraLoader variant="inline" size={18} context="data" delay={120} />
                ) : (
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-rp-text">
                    {cohortOptions.length}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 border-t border-rp-line/70 pt-2.5 text-xs">
              <Link to="/my-courses" className="inline-flex items-center gap-1 font-semibold rp-link">
                {tr('Quản lý lớp của tôi')} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        </section>

        {/* Partial Error Banner */}
        {partialErrors.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-warning/35 bg-rp-warning-bg/50 px-4 py-3 text-sm">
            <p className="font-medium text-rp-text">
              {trf('Chưa tải được phần dữ liệu: {0}. Các lịch khác vẫn hiển thị bình thường.', {
                0: partialErrors.map((e) => e.label).join(', '),
              })}
            </p>
            <button
              type="button"
              onClick={() => partialErrors.forEach((p) => p.retry())}
              className="rp-focus rounded-xl bg-rp-surface px-3 py-1.5 text-xs font-semibold text-rp-brand-strong shadow-rp-xs hover:bg-rp-brand-tint"
            >
              {tr('Tải lại phần lỗi')}
            </button>
          </div>
        )}

        {/* Class Filter Pills */}
        {cohortOptions.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-rp-text-muted">{tr('Lọc theo lớp:')}</span>
            <button
              type="button"
              onClick={() => setSelectedCohortFilter('ALL')}
              className={cx(
                'rp-focus rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                selectedCohortFilter === 'ALL'
                  ? 'bg-rp-brand-pressed text-white'
                  : 'border border-rp-line bg-rp-surface text-rp-text-2 hover:border-rp-brand-border',
              )}
            >
              {tr('Tất cả lớp')}
            </button>
            {cohortOptions.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setSelectedCohortFilter(c.key)}
                className={cx(
                  'rp-focus rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  selectedCohortFilter === c.key
                    ? 'bg-rp-brand-pressed text-white'
                    : 'border border-rp-line bg-rp-surface text-rp-text-2 hover:border-rp-brand-border',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Main Workspace Grid */}
        {isLoading ? (
          <Card className="p-8">
            <SakuraLoader context="data" label={tr('Đang tải lịch học thông minh...')} />
          </Card>
        ) : hardError ? (
          <Card className="p-6">
            <ContextualErrorState
              title={tr('Không thể tải lịch học lúc này')}
              description={tr('Kết nối tạm gián đoạn. Vui lòng thử tải lại dữ liệu lịch học.')}
              onRetry={refetchAll}
            />
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-2.5">
              {selectedCohortFilter !== 'ALL' && filteredEvents.length === 0 && (
                <div
                  data-testid="learner-calendar-empty-filter-hint"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line bg-[#FCFAFB] px-3.5 py-2 text-[12px]"
                >
                  <span className="font-medium text-rp-text-2">
                    {tr('Không có lịch học khớp với bộ lọc đang chọn.')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCohortFilter('ALL');
                    }}
                    className="rp-underline font-semibold text-rp-brand-strong"
                  >
                    {tr('Xóa bộ lọc')}
                  </button>
                </div>
              )}
              <SakuraCalendar
                events={filteredEvents}
                audience="learner"
                anchorKey={anchorKey}
                onAnchorChange={setAnchorKey}
                defaultView="month"
                emptyTitle={tr('Không có sự kiện nào trong khoảng thời gian này.')}
                emptyDescription={tr('Chọn tuần hoặc tháng khác, hoặc khám phá các lớp ôn luyện JLPT để bắt đầu lịch học của bạn.')}
              />
            </div>

            {/* Right Rail: Upcoming Action Queue */}
            <aside className="space-y-4">
              {liveSessions.length > 0 && (
                <Card className="border-[#99F6E4] bg-[#F0FDFA] p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#0F766E]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#0F766E]" />
                    {tr('Phòng học đang mở')}
                  </div>
                  <p className="mt-1.5 font-bold text-[#115E59]">{liveSessions[0].title}</p>
                  <p className="mt-0.5 text-xs text-[#0F766E]/90">{liveSessions[0].detail}</p>
                  <Link
                    to={liveSessions[0].roomHref}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#115E59]"
                  >
                    <Video className="h-4 w-4" />
                    {tr('Vào phòng học ngay')}
                  </Link>
                </Card>
              )}

              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-rp-text">{tr('Buổi học sắp diễn ra')}</h2>
                  <Badge tone="neutral" size="sm">GMT+7</Badge>
                </div>
                {upcomingSessions.length === 0 ? (
                  <p className="text-xs text-rp-text-muted">{tr('Không có buổi học nào trong 7 ngày tới.')}</p>
                ) : (
                  <ul className="space-y-2.5">
                    {upcomingSessions.slice(0, 5).map((ev) => (
                      <li key={ev.id} className="rounded-xl border border-rp-line/85 bg-rp-bg-2/50 p-2.5">
                        <Link
                          to={ev.secondaryHref || '/my-courses'}
                          className="block truncate text-[13px] font-semibold text-rp-text hover:text-rp-brand-strong"
                        >
                          {ev.title}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-rp-text-muted">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatVnDateTime(ev.scheduledAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-rp-text">{tr('Bài tập chưa nộp')}</h2>
                  <Link to="/homework" className="text-xs font-semibold rp-link">
                    {tr('Tất cả')}
                  </Link>
                </div>
                {pendingHomeworks.length === 0 ? (
                  <p className="text-xs text-rp-text-muted">{tr('Bạn đã hoàn thành toàn bộ bài tập hiện có.')}</p>
                ) : (
                  <ul className="space-y-2">
                    {pendingHomeworks.slice(0, 4).map((hw) => {
                      const meta = homeworkStatusMeta(hw, nowMs);
                      return (
                        <li key={hw.id}>
                          <Link
                            to={hw.cohortId ? `/homework/?cohortId=${hw.cohortId}` : '/homework'}
                            className="block rounded-xl border border-rp-line/85 bg-rp-bg-2/50 p-2.5 transition-colors hover:border-rp-brand-border"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] font-semibold text-rp-text">{hw.title}</span>
                              <Badge tone={meta.tone} size="sm">{tr(meta.label)}</Badge>
                            </div>
                            <p className="mt-0.5 text-[11.5px] text-rp-text-muted">
                              {hw.dueAt ? formatVnDateTime(hw.dueAt) : tr('Chưa đặt hạn')}
                            </p>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              <Card className="border-dashed bg-rp-bg-2/60 p-4 text-xs text-rp-text-muted">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-rp-brand-strong" />
                  <p className="leading-5">
                    {tr('Lịch cá nhân tự động tổng hợp buổi học nhóm, bài tập theo lớp và hàng đợi ôn tập SRS hôm nay.')}
                  </p>
                </div>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </LearnerShell>
  );
}
