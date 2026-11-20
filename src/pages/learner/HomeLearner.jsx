import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flame,
  RefreshCw,
  Route,
  School,
  Target,
  UsersRound,
  Video,
} from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { FeatureLink } from '@/features/entitlements/components/StudyUnlock.jsx';
import { useLocale } from '@/locales/locale.js';
import { useWorkspaceCalendar } from '@/features/calendar/hooks/useWorkspaceCalendar.js';
import { displayCourseTitle, homeworkStatusMeta } from '@/features/calendar/utils/calendarEventsModel.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { getSession } from '@/app/auth/session.js';
import { splitSrsQueue, weekBloomStates } from '@/features/dashboard/hooks/useLearnerHome.js';
import { JapanScene, sceneForHour } from '@/assets/illustrations';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  FeatureIcon,
  HaruMascot,
  OptionalDashboardWidget,
  ProgressBar,
  RefreshingIndicator,
  SakuraLoader,
  SrsLoopIcon,
  cx,
} from '@/components/ui';

const PRACTICE = [
  { feature: 'vocabulary', to: '/vocabulary', title: 'Từ vựng', note: 'Sổ từ theo chủ đề' },
  { feature: 'grammar', to: '/grammar', title: 'Ngữ pháp', note: 'Mẫu câu & ví dụ' },
  { feature: 'kanji', to: '/kanji-writing?type=kanji', title: 'Hán tự', note: 'Luyện viết nét' },
  { feature: 'kana', to: '/kanji-writing?type=hiragana', title: 'Kana', note: 'Bảng chữ & âm ghép' },
  { feature: 'listening', to: '/riki/listening', title: 'Nghe hiểu', note: 'Bài nghe có audio' },
  { feature: 'reading', to: '/riki/reading', title: 'Đọc hiểu', note: 'Đoạn văn JLPT' },
  { feature: 'writing', to: '/riki/essay', title: 'Luyện viết', note: 'Chấm bởi Haru AI' },
  { feature: 'speaking', to: '/speech', title: 'Luyện nói', note: 'Phát âm & phản xạ' },
];

const BASE_SKILLS = [
  { key: 'vocabulary', label: 'Từ vựng', feature: 'vocabulary' },
  { key: 'grammar', label: 'Ngữ pháp', feature: 'grammar' },
  { key: 'reading', label: 'Đọc hiểu', feature: 'reading' },
  { key: 'listening', label: 'Nghe hiểu', feature: 'listening' },
];

const EXTENDED_SKILLS = [
  ...BASE_SKILLS,
  { key: 'writing', label: 'Luyện viết', feature: 'writing' },
  { key: 'speaking', label: 'Luyện nói', feature: 'speaking' },
];

const WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const COURSE_STATUS = {
  Active: { tone: 'success', label: 'Đang học' },
  Ready: { tone: 'info', label: 'Sắp khai giảng' },
  PendingPayment: { tone: 'warning', label: 'Chờ thanh toán' },
  Completed: { tone: 'neutral', label: 'Đã hoàn thành' },
  Transferred: { tone: 'neutral', label: 'Đã chuyển lớp' },
};

const SCENE_COPY = {
  dawn: { hello: 'Chào buổi sáng', jp: 'おはようございます' },
  day: { hello: 'Chúc một ngày học tốt', jp: 'こんにちは' },
  dusk: { hello: 'Chào buổi chiều tối', jp: 'こんばんは' },
  night: { hello: 'Học nhẹ nhàng tối nay', jp: 'こんばんは' },
};

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function StatTile({ icon: Icon, tone, label, value, unit, loading, error, onRetry, tr, children }) {
  const hasValue = value !== undefined && value !== null;
  const hardError = Boolean(error) && !hasValue;
  return (
    <Card className="rp-card-hover rp-interactive group flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className={cx('rp-icon-tilt flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/[0.04]', tone)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium leading-snug text-rp-text-muted">{tr(label)}</p>
          {loading ? (
            <div className="mt-1 flex min-h-[2rem] items-center">
              <SakuraLoader variant="inline" size={18} context="data" delay={160} />
            </div>
          ) : hardError ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-rp-text-muted">{tr('Tạm chưa cập nhật được')}</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rp-focus inline-flex items-center gap-1 rounded text-xs font-semibold rp-link"
                >
                  <RefreshCw aria-hidden="true" className="h-3 w-3" /> {tr('Thử lại')}
                </button>
              )}
            </div>
          ) : (
            <p className="text-2xl font-bold tabular-nums leading-tight text-rp-text">
              {value ?? '—'}
              {value != null && unit && <span className="ml-1 text-xs font-semibold text-rp-text-muted">{tr(unit)}</span>}
            </p>
          )}
        </div>
      </div>
      {!error && !loading && children}
      {error && hasValue && children}
    </Card>
  );
}

function StreakWeek({ days, activeToday }) {
  const { tr } = useLocale();
  const states = weekBloomStates(days || 0, activeToday);
  return (
    <ol aria-label={tr('Chuỗi ngày học tuần này')} className="grid grid-cols-7 gap-1">
      {states.map((state, i) => (
        <li key={WEEK_LABELS[i]} className="flex min-w-0 flex-col items-center gap-1">
          <span
            className={cx(
              'flex h-5 w-5 items-center justify-center rounded-full text-[10px] transition-transform sm:h-6 sm:w-6',
              state === 'done' || state === 'today' ? 'bg-rp-streak text-white shadow-rp-xs' : state === 'pending' ? 'border-2 border-dashed border-rp-streak/50' : 'bg-rp-muted',
            )}
          >
            {(state === 'done' || state === 'today') && <Flame aria-hidden="true" className="h-3 w-3" />}
            <span className="sr-only">{state === 'done' || state === 'today' ? tr('Đã học') : state === 'pending' ? tr('Hôm nay chưa học') : state === 'future' ? tr('Chưa tới') : tr('Chưa học')}</span>
          </span>
          <span className="text-[10px] font-medium text-rp-text-muted">{tr(WEEK_LABELS[i])}</span>
        </li>
      ))}
    </ol>
  );
}

function GroupLearningWidget() {
  const { tr, trf } = useLocale();
  const session = getSession();
  const calendar = useWorkspaceCalendar({ roleKey: 'Learner', includeSrs: false });

  if (session?.isPreview) {
    return (
      <Card>
        <CardHeader
          icon={<FeatureIcon feature="group" size="sm" />}
          title={tr('Học nhóm cùng Giáo viên')}
          description={tr('Lịch buổi học nhóm, bài tập và tương tác cùng Giáo viên')}
        />
        <ContextualEmptyState compact icon={School} title={tr('Chế độ xem trước')} description={tr('Lớp học nhóm chỉ hiển thị với dữ liệu thật.')} />
      </Card>
    );
  }

  const courses = calendar.courses.filter((c) => c.cohortId && c.status !== 'Cancelled' && c.status !== 'Transferred');
  const { liveSessions, upcomingSessions, upcoming7DaysSessions, pendingHomeworks } = calendar.summary;
  const nextSession = liveSessions[0] || upcomingSessions[0] || null;
  const hwTotal = calendar.homeworks.length;
  const showHomeworkCard =
    !calendar.homeworksQuery.isPending &&
    !calendar.homeworksQuery.isError &&
    !calendar.coursesQuery.isError &&
    (courses.length > 0 || hwTotal > 0);

  const syntheticQuery = {
    isPending: calendar.coursesQuery.isPending,
    isFetching: calendar.coursesQuery.isFetching,
    isError: calendar.coursesQuery.isError,
    error: calendar.coursesQuery.error || null,
    refetch: calendar.refetchAll,
    data: calendar.coursesQuery.data,
  };

  return (
    <div className="space-y-4">
      <OptionalDashboardWidget
        name="HomeLearner.GroupLearningWidget"
        query={syntheticQuery}
        isAuthenticated={Boolean(session?.accessToken)}
        isEmpty={(rows) =>
          (Array.isArray(rows) ? rows : []).filter((c) => c.cohortId && c.status !== 'Cancelled' && c.status !== 'Transferred').length === 0
        }
        emptyPolicy="cta"
        errorPolicy="hide"
        loadingContext="cohort"
        empty={
          <ContextualEmptyState
            compact
            context="groupLearning"
            art="calendar"
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link to="/cohorts" className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-rp-input bg-rp-brand-pressed px-3.5 text-[13px] font-semibold text-white hover:bg-rp-brand-strong rp-press">
                  <School aria-hidden="true" className="h-4 w-4" /> {tr('Khám phá lớp')}
                </Link>
                <Link to="/mentors/" className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-rp-input border border-rp-line bg-rp-surface px-3 text-[13px] font-semibold text-rp-text hover:bg-rp-muted">
                  <UsersRound aria-hidden="true" className="h-4 w-4" /> {tr('Tìm Giáo viên')}
                </Link>
              </div>
            }
          />
        }
        wrap={(content) => (
          <Card>
            <CardHeader
              icon={<FeatureIcon feature="group" size="sm" />}
              title={tr('Học nhóm cùng Giáo viên')}
              description={tr('Lịch buổi học nhóm, bài tập và tương tác cùng Giáo viên')}
              actions={
                <div className="flex items-center gap-2">
                  <RefreshingIndicator active={calendar.isFetching && !calendar.isLoading} />
                  <Link to="/calendar" className="rp-focus rounded text-[13px] font-semibold rp-link">{tr('Lịch học')}</Link>
                  {courses.length > 0 && <Link to="/my-courses/" className="rp-focus rounded text-[13px] font-semibold rp-link">{tr('Tất cả')}</Link>}
                </div>
              }
            />
            {content}
          </Card>
        )}
      >
        {() => (
          <div className="space-y-3">
            {nextSession && (
              <div className={cx(
                'rounded-rp-input border p-3',
                nextSession.canJoin ? 'border-rp-success-line bg-rp-success-bg' : 'border-rp-brand-border/60 bg-rp-brand-tint/35',
              )}>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className={cx('font-bold uppercase tracking-wide', nextSession.canJoin ? 'text-rp-success' : 'text-rp-brand-strong')}>
                    {nextSession.canJoin ? tr('Phòng đang mở') : tr('Buổi sắp tới')}
                  </span>
                  <span className="flex items-center gap-1 text-rp-text-muted">
                    <Clock className="h-3 w-3" /> {formatVnDateTime(nextSession.scheduledAt)}
                  </span>
                </div>
                <p className="mt-1 truncate text-[13px] font-bold text-rp-text">{nextSession.title}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-rp-text-muted">{nextSession.mentorName}</span>
                  {nextSession.canJoin ? (
                    <Link to={nextSession.roomHref}>
                      <Button variant="primary" size="sm" icon={Video}>{tr('Vào phòng')}</Button>
                    </Link>
                  ) : (
                    <Link
                      to={nextSession.secondaryHref || '/my-courses'}
                      className="shrink-0 text-xs font-semibold rp-link"
                    >
                      {tr('Mở lớp')}
                    </Link>
                  )}
                </div>
              </div>
            )}

            <ul className="space-y-2">
              {courses.slice(0, 3).map((c) => {
                const s = COURSE_STATUS[c.status] || { tone: 'neutral', label: c.status };
                const total = Array.isArray(c.sessions) ? c.sessions.length : 0;
                const present = Array.isArray(c.sessions) ? c.sessions.filter((x) => x.status === 'Present').length : 0;
                return (
                  <li key={c.id}>
                    <Link to={`/my-courses/${c.id}`} className="rp-focus rp-card-hover flex items-center gap-3 rounded-rp-input border border-rp-line px-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-rp-text">{displayCourseTitle(c, tr('Lớp học nhóm'))}</span>
                        <span className="block text-xs text-rp-text-muted">
                          {c.level || 'JLPT'}{c.mentorName ? ` · ${c.mentorName}` : ''}{total > 0 ? ` · ${present}/${total}` : ''}
                        </span>
                      </span>
                      <Badge tone={s.tone} size="sm">{tr(s.label)}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between border-t border-rp-line/80 pt-2.5 text-xs">
              <Link to="/group-learning/progress" className="font-semibold rp-link">{tr('Tiến độ học nhóm')}</Link>
              <Link to="/group-learning" className="font-semibold text-rp-text-muted hover:text-rp-brand-strong">{tr('Tổng quan nhóm')}</Link>
            </div>
          </div>
        )}
      </OptionalDashboardWidget>

      {showHomeworkCard && (
        <Card>
          <CardHeader
            icon={<FeatureIcon feature="writing" icon={BookCheck} size="sm" />}
            title={tr('Bài tập & Lịch học tuần')}
            description={
              pendingHomeworks.length > 0
                ? trf('{0} bài chưa nộp · {1} buổi trong 7 ngày tới', { 0: pendingHomeworks.length, 1: upcoming7DaysSessions.length })
                : tr('Theo dõi hạn nộp bài tập và lịch buổi học')
            }
            actions={<Link to="/homework" className="rp-focus rounded text-[13px] font-semibold rp-link">{tr('Bài tập')}</Link>}
          />
          {pendingHomeworks.length === 0 ? (
            <div className="flex items-center justify-between gap-2 rounded-rp-input border border-rp-line bg-rp-bg-2/50 px-3 py-2.5 text-xs">
              <span className="text-rp-text-muted">{tr('Bạn không có bài tập tồn đọng lúc này.')}</span>
              <Link to="/calendar" className="inline-flex shrink-0 items-center gap-1 font-semibold rp-link">
                <CalendarDays className="h-3.5 w-3.5" /> {tr('Xem lịch')}
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {pendingHomeworks.slice(0, 2).map((hw) => {
                const meta = homeworkStatusMeta(hw, calendar.nowMs);
                return (
                  <li key={hw.id}>
                    <Link
                      to={hw.cohortId ? `/homework/?cohortId=${hw.cohortId}` : '/homework'}
                      className="rp-focus rp-card-hover flex items-center justify-between gap-2.5 rounded-rp-input border border-rp-line px-3 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-rp-text">{hw.title}</span>
                        <span className="block truncate text-[11px] text-rp-text-muted">
                          {hw.dueAt ? formatVnDateTime(hw.dueAt) : tr('Chưa đặt hạn nộp')}
                        </span>
                      </span>
                      <Badge tone={meta.tone} size="sm">{tr(meta.label)}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

export default function HomeLearner({ data = null }) {
  const { locale, tr, trf } = useLocale();
  const scene = useMemo(() => sceneForHour(), []);
  const copy = SCENE_COPY[scene];
  const lightText = scene === 'dusk' || scene === 'night';

  const targetLevel = ['N5', 'N4', 'N3', 'N2', 'N1'].includes(data?.targetLevel) ? data.targetLevel : null;
  const dueCards = isNum(data?.dueCards) ? Math.max(0, data.dueCards) : null;
  const streak = isNum(data?.streakDays) ? data.streakDays : null;
  const completed = isNum(data?.completedExercises) ? data.completedExercises : null;
  const skillScores = data?.skillScores ?? {};
  const visibleSkills = isNum(skillScores.writing) || isNum(skillScores.speaking) ? EXTENDED_SKILLS : BASE_SKILLS;
  const hasSkillData = visibleSkills.some(({ key }) => isNum(skillScores[key]));
  const srsItems = Array.isArray(data?.srsItems) ? data.srsItems : [];
  const srsBreakdown = splitSrsQueue(srsItems);
  const loading = data?.loading ?? {};
  const errors = data?.errors ?? {};
  const queries = data?.queries ?? {};
  const fetching = data?.fetching ?? {};
  const onRetry = data?.onRetry ?? {};
  const name = data?.displayName;

  const skillsWidgetQuery = queries.skills || {
    data: hasSkillData ? skillScores : errors.skills ? undefined : [],
    isPending: Boolean(loading.skills),
    isLoading: Boolean(loading.skills),
    isFetching: Boolean(fetching.skills),
    isError: Boolean(errors.skills),
    error: errors.skills,
    refetch: onRetry.skills,
  };
  const srsWidgetQuery = queries.srs || {
    data: dueCards != null ? { dueCards, items: srsItems } : undefined,
    isPending: Boolean(loading.srs),
    isLoading: Boolean(loading.srs),
    isFetching: Boolean(fetching.srs),
    isError: Boolean(errors.srs),
    error: errors.srs,
    refetch: onRetry.srs,
  };

  return (
    <LearnerShell breadcrumb={tr('Bảng học tập')}>
      <div data-page="HomeLearner" className="rp-container rp-cq py-[var(--rp-space-page-y)]">
        {/* Welcome banner — landscape art + real HTML text */}
        <section aria-labelledby="welcome-title" className="relative isolate overflow-hidden rounded-rp-card-lg border border-rp-line shadow-rp-xs">
          <JapanScene time={scene} className="absolute inset-0 -z-10 h-full w-full" />
          <div
            aria-hidden="true"
            className={cx('absolute inset-0 -z-10', lightText ? 'bg-gradient-to-r from-[rgba(30,20,40,0.62)] via-[rgba(30,20,40,0.3)] to-transparent' : 'bg-gradient-to-r from-white/88 via-white/60 to-transparent')}
          />
          <div className="flex min-h-[clamp(180px,22vw,224px)] items-center justify-between gap-6 p-[clamp(1.25rem,2.6vw,2.5rem)]">
            <div className="min-w-0 max-w-2xl">
              <p lang="ja" className={cx('rp-type-secondary font-medium', lightText ? 'text-white/80' : 'text-rp-brand-strong')}>{copy.jp}</p>
              <h1 id="welcome-title" className={cx('mt-1 rp-type-page-title', lightText ? 'text-white' : 'text-rp-text')}>
                {name ? (locale === 'ja' ? `${name}さん、${copy.jp}` : `${tr(copy.hello)}, ${name}!`) : tr(copy.hello)}
              </h1>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                {loading.profile ? (
                  <SakuraLoader variant="inline" context="dashboard" label={tr('Đang tải bảng học tập')} tone={lightText ? 'light' : 'brand'} />
                ) : (
                  <p className={cx('text-sm leading-6', lightText ? 'text-white/90' : 'text-rp-text-2')}>
                    {targetLevel
                      ? trf('Mục tiêu của bạn: JLPT {0}. Mỗi buổi học ngắn đều đưa bạn gần hơn tới kỳ thi.', { 0: targetLevel })
                      : tr('Đặt mục tiêu JLPT để RikiPath gợi ý lộ trình và bài luyện phù hợp với trình độ.')}
                  </p>
                )}
                <RefreshingIndicator active={Boolean(data?.refreshing)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {loading.profile ? null : !targetLevel ? (
                  <>
                    <Link to="/onboarding/" className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand transition-transform hover:-translate-y-0.5 hover:bg-rp-brand-strong rp-press">
                      <Target aria-hidden="true" className="h-4 w-4" /> {tr('Đặt mục tiêu JLPT')}
                    </Link>
                    <Link
                      to="/placement/"
                      className={cx('rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input border px-4 text-sm font-semibold backdrop-blur', lightText ? 'border-white/40 bg-white/15 text-white hover:bg-white/25' : 'border-rp-line bg-white/85 text-rp-text hover:border-rp-brand-border')}
                    >
                      <ClipboardCheck aria-hidden="true" className="h-4 w-4" /> {tr('Đánh giá năng lực')}
                    </Link>
                  </>
                ) : completed > 0 ? (
                  <FeatureLink to="/lessons/" label="Bài học" showLock={false} className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand transition-transform hover:-translate-y-0.5 hover:bg-rp-brand-strong rp-press">
                    {tr('Tiếp tục học')} <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </FeatureLink>
                ) : (
                  <Link to="/roadmap/" className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand transition-transform hover:-translate-y-0.5 hover:bg-rp-brand-strong rp-press">
                    <Route aria-hidden="true" className="h-4 w-4" /> {tr('Bắt đầu lộ trình')} <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                )}
                <Link
                  to="/daily-srs/"
                  className={cx('rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input border px-4 text-sm font-semibold backdrop-blur transition-colors', lightText ? 'border-white/40 bg-white/15 text-white hover:bg-white/25' : 'border-rp-line bg-white/85 text-rp-text hover:border-rp-brand-border')}
                >
                  <SrsLoopIcon className="h-4 w-4" />
                  {dueCards ? trf('Ôn {0} thẻ đến hạn', { 0: dueCards }) : tr('Ôn tập SRS')}
                </Link>
              </div>
            </div>
            <HaruMascot pose="studying" size={148} className="rp-float hidden shrink-0 drop-shadow-sm lg:block" />
          </div>
        </section>

        {/* Stats — real values only, explicit error + retry if a tile query fails */}
        <div className="mt-[var(--rp-space-section)] rp-cq-kpis">
          <StatTile
            icon={Flame}
            tone="bg-rp-streak-bg text-rp-streak"
            label={tr('Chuỗi ngày học')}
            value={streak}
            unit={tr('ngày')}
            loading={loading.streak}
            error={errors.streak}
            onRetry={onRetry.streak}
            tr={tr}
          >
            <StreakWeek days={streak} activeToday={data?.activeToday} />
          </StatTile>
          <StatTile
            icon={CheckCircle2}
            tone="bg-rp-success-bg text-rp-success"
            label={tr('Bài đã hoàn thành')}
            value={completed}
            unit={tr('bài')}
            loading={loading.completion}
            error={errors.completion}
            onRetry={onRetry.completion}
            tr={tr}
          />
          <StatTile
            icon={SrsLoopIcon}
            tone="bg-tone-vocab-bg text-tone-vocab"
            label={tr('Thẻ cần ôn hôm nay')}
            value={dueCards}
            unit={tr('thẻ')}
            loading={loading.srs}
            error={errors.srs}
            onRetry={onRetry.srs}
            tr={tr}
          />
          <StatTile
            icon={Target}
            tone="bg-rp-brand-tint text-rp-brand-strong"
            label={tr('Mục tiêu JLPT')}
            value={targetLevel ? `JLPT ${targetLevel}` : null}
            loading={loading.profile}
            error={errors.profile}
            onRetry={onRetry.profile}
            tr={tr}
          />
        </div>

        <div className="mt-[var(--rp-space-section)] rp-cq-two-col">
          <div className="min-w-0 space-y-[var(--rp-space-section)]">
            <Card>
              <CardHeader
                title={tr('Luyện tập nhanh')}
                description={tr('Chọn kỹ năng bạn muốn ôn ngay hôm nay')}
                actions={<Link to="/mock-tests/" className="rp-focus rounded text-[13px] font-semibold rp-link">{tr('Thi thử JLPT')}</Link>}
              />
              <ul className="rp-cq-practice">
                {PRACTICE.map((p) => (
                  <li key={p.feature}>
                    <FeatureLink to={p.to} label={p.title} className="rp-focus rp-card-hover rp-interactive group flex h-full w-full flex-col gap-2 rounded-rp-input border border-rp-line p-3.5">
                      <FeatureIcon feature={p.feature} />
                      <span className="text-[13.5px] font-semibold text-rp-text transition-colors group-hover:text-rp-brand-strong">{tr(p.title)}</span>
                      <span className="text-xs leading-5 text-rp-text-muted">{tr(p.note)}</span>
                    </FeatureLink>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader
                title={tr('Năng lực theo kỹ năng')}
                description={tr('Điểm trung bình từ các bài bạn đã làm')}
                actions={hasSkillData ? <Link to="/exam-result/" className="rp-focus rounded text-[13px] font-semibold rp-link">{tr('Lịch sử & kết quả')}</Link> : null}
              />
              <OptionalDashboardWidget
                name="HomeLearner.SkillMastery"
                query={skillsWidgetQuery}
                isEmpty={() => !hasSkillData}
                emptyPolicy="cta"
                errorPolicy="compact"
                loading={<SakuraLoader variant="section" context="dashboard" label={tr('Đang tải năng lực theo kỹ năng')} className="min-h-[120px] py-4" />}
                empty={
                  <ContextualEmptyState
                    compact
                    mascot="thinking"
                    title={tr('Chưa có dữ liệu kỹ năng')}
                    description={tr('Làm bài đánh giá năng lực để biết điểm mạnh, điểm cần cải thiện và nhận lộ trình gợi ý.')}
                    action={<Link to="/placement/" className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-rp-input bg-rp-brand-pressed px-3.5 text-[13px] font-semibold text-white hover:bg-rp-brand-strong rp-press"><ClipboardCheck aria-hidden="true" className="h-4 w-4" /> {tr('Làm bài đánh giá')}</Link>}
                  />
                }
                errorFallback={(err, retry, q) => (
                  <ContextualErrorState
                    variant="inline"
                    error={err}
                    title={tr('Tạm chưa tải được năng lực theo kỹ năng')}
                    onRetry={retry}
                    retrying={Boolean(q?.isFetching)}
                  />
                )}
              >
                {() => (
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {visibleSkills.map(({ key, label, feature }) => {
                      const v = skillScores[key];
                      return (
                        <li key={key} className="rounded-rp-input border border-rp-line/70 bg-rp-bg-2/50 p-3.5">
                          <div className="mb-2 flex items-center justify-between gap-2 text-[13px]">
                            <span className="flex items-center gap-2 font-semibold text-rp-text">
                              <FeatureIcon feature={feature} size="sm" interactive={false} />
                              {tr(label)}
                            </span>
                            <span className="tabular-nums font-semibold text-rp-text-2">{isNum(v) ? `${Math.round(v)}/100` : tr('Chưa có dữ liệu')}</span>
                          </div>
                          <ProgressBar value={isNum(v) ? v : 0} label={tr(label)} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </OptionalDashboardWidget>
            </Card>
          </div>

          <aside className="space-y-5" aria-label={tr('Học nhóm và trợ lý')}>
            <GroupLearningWidget />

            <Card>
              <CardHeader
                icon={<FeatureIcon feature="srs" size="sm" />}
                title={tr('Hàng đợi ôn tập SRS')}
                description={tr('Nhắc lại ngắt quãng theo lịch ghi nhớ')}
                actions={<Link to="/daily-srs/" className="rp-focus rounded text-[13px] font-semibold rp-link">{tr('Mở SRS')}</Link>}
              />
              <OptionalDashboardWidget
                name="HomeLearner.SrsSummary"
                query={srsWidgetQuery}
                isEmpty={() => !dueCards}
                emptyPolicy="cta"
                errorPolicy="compact"
                loadingContext="srs"
                empty={
                  <ContextualEmptyState
                    compact
                    context="srs"
                    icon={SrsLoopIcon}
                    action={<FeatureLink to="/vocabulary/" label="Từ vựng" showLock={false} className="rp-focus rp-link rounded text-[13px] font-semibold">{tr('Mở sổ từ vựng')}</FeatureLink>}
                  />
                }
                errorFallback={(err, retry, q) => (
                  <ContextualErrorState
                    variant="inline"
                    error={err}
                    title={tr('Tạm chưa cập nhật được hàng đợi SRS')}
                    onRetry={retry}
                    retrying={Boolean(q?.isFetching)}
                  />
                )}
              >
                {() => (
                  <dl className="grid grid-cols-1 gap-2 text-center min-[340px]:grid-cols-3">
                    <div className="rounded-rp-input border border-rp-line bg-rp-brand-tint/50 p-2.5">
                      <dt className="text-[11px] font-medium text-rp-text-muted">{tr('Ôn gấp')}</dt>
                      <dd className="mt-0.5 text-lg font-bold tabular-nums text-rp-brand-strong">{srsBreakdown.urgent}</dd>
                    </div>
                    <div className="rounded-rp-input border border-rp-line bg-rp-bg-2 p-2.5">
                      <dt className="text-[11px] font-medium text-rp-text-muted">{tr('Đang nhớ')}</dt>
                      <dd className="mt-0.5 text-lg font-bold tabular-nums text-rp-text">{srsBreakdown.due}</dd>
                    </div>
                    <div className="rounded-rp-input border border-rp-line bg-rp-bg-2 p-2.5">
                      <dt className="text-[11px] font-medium text-rp-text-muted">{tr('Dài hạn')}</dt>
                      <dd className="mt-0.5 text-lg font-bold tabular-nums text-rp-success">{srsBreakdown.longTerm}</dd>
                    </div>
                  </dl>
                )}
              </OptionalDashboardWidget>
            </Card>
          </aside>
        </div>
      </div>
    </LearnerShell>
  );
}
