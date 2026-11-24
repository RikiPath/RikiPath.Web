import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardCheck,
  Clock,
  RefreshCw,
  Route,
  Sparkles,
  Target,
  UsersRound,
  Video,
} from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { FeatureLink } from '@/features/entitlements/components/StudyUnlock.jsx';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import { useLocale } from '@/locales/locale.js';
import { useWorkspaceCalendar } from '@/features/calendar/hooks/useWorkspaceCalendar.js';
import { displayCourseTitle } from '@/features/calendar/utils/calendarEventsModel.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { getSession } from '@/app/auth/session.js';
import { useLearnerAnalyticsFeed } from '@/features/dashboard/hooks/useLearnerAnalyticsFeed.js';
import { useLearningPathAccess } from '@/features/learning-path/useLearningPathAccess.js';
import {
  LearningAnalytics,
  LearningJourneyMap,
  PackageSummaryCard,
  RingProgress,
  SkillExplorer,
  WebClayIcon,
  WeeklyStreakBar,
  buildVerifiedActivityDateSet,
  resolveDashboardPrimaryFlow,
  toVnDateKey,
} from '@/features/learner-ui';
import { sceneForHour } from '@/assets/illustrations';
import DynamicGroundBanner from '@/features/atmosphere/ground/DynamicGroundBanner.jsx';
import {
  Badge,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  HaruMascot,
  OptionalDashboardWidget,
  RefreshingIndicator,
  SakuraLoader,
  SrsLoopIcon,
  cx,
} from '@/components/ui';
import '@/features/learner-ui/dashboard.css';

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

/** One stat line inside "Tiến độ & Ôn tập": clay icon · label · value · trailing action (hidden while loading/error). */
function MetricRow({ icon, label, value, unit, loading, error, onRetry, tr, to, children }) {
  const hasValue = value !== undefined && value !== null;
  const hardError = Boolean(error) && !hasValue;
  const valueEl = (
    <p className="whitespace-nowrap text-[20px] font-extrabold leading-tight tracking-tight tabular-nums text-rp-navy">
      {value ?? '—'}
      {value != null && unit && <span className="ml-1 text-xs font-semibold text-rp-text-muted">{tr(unit)}</span>}
    </p>
  );

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <WebClayIcon name={icon} size="xs" className="-my-1 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-rp-text-2">{tr(label)}</p>
          {loading ? (
            <div className="mt-0.5 flex min-h-[26px] items-center">
              <SakuraLoader variant="inline" size={16} context="data" delay={160} />
            </div>
          ) : hardError ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-rp-text-muted">{tr('Tạm chưa tải được')}</span>
              {onRetry && (
                <button type="button" onClick={onRetry} className="rp-focus rp-link inline-flex items-center gap-1 rounded text-xs font-semibold">
                  <RefreshCw aria-hidden="true" className="h-3 w-3" /> {tr('Thử lại')}
                </button>
              )}
            </div>
          ) : to ? (
            <Link to={to} className="rp-focus rp-metric-link rounded">{valueEl}</Link>
          ) : (
            valueEl
          )}
        </div>
      </div>
      <div className="shrink-0">{!error && !loading && children}</div>
    </div>
  );
}

/** Completed lessons + today's SRS due cards in one card (real counts only; nothing is hard-coded). */
function ProgressReviewCard({ completedLessons, totalLessons, completionPct, dueCards, loading, errors, onRetry, srsWidgetQuery, className }) {
  const { tr } = useLocale();
  return (
    <section
      aria-label={tr('Tiến độ & Ôn tập')}
      data-section="ProgressReviewCard"
      className={cx('flex flex-col gap-3 rounded-2xl border border-rp-line bg-white p-4 shadow-rp-xs', className)}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-rp-text-muted">{tr('Tiến độ & Ôn tập')}</p>

      <div className="space-y-2">
        <MetricRow
          icon="lesson_done"
          label="Bài học đã hoàn thành"
          value={completedLessons}
          unit={totalLessons > 0 ? `/ ${totalLessons}` : 'bài'}
          loading={Boolean(loading.completion)}
          error={errors.completion}
          onRetry={onRetry.completion}
          to="/lessons/"
          tr={tr}
        >
          {totalLessons > 0 && <span className="text-[13px] font-extrabold tabular-nums text-rp-success">{completionPct}%</span>}
        </MetricRow>
        {totalLessons > 0 && completedLessons != null && (
          <span
            className="block h-1.5 overflow-hidden rounded-full bg-rp-mint-bg"
            role="progressbar"
            aria-label={tr('Tiến độ bài học')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionPct}
          >
            <span className="rp-grow-x block h-full origin-left rounded-full bg-rp-mint" style={{ transform: `scaleX(${Math.max(0.02, completionPct / 100)})` }} />
          </span>
        )}
      </div>

      <div className="border-t border-rp-line/70 pt-3">
        {srsWidgetQuery?.isError && dueCards == null ? (
          <ContextualErrorState
            variant="inline"
            error={srsWidgetQuery.error}
            title={tr('Tạm chưa cập nhật được hàng đợi SRS')}
            onRetry={() => srsWidgetQuery.refetch?.()}
            retrying={Boolean(srsWidgetQuery.isFetching)}
          />
        ) : (
          <MetricRow
            icon="srs"
            label="Thẻ SRS đến hạn hôm nay"
            value={dueCards}
            unit="thẻ"
            loading={Boolean(loading.srs)}
            error={errors.srs}
            onRetry={onRetry.srs}
            tr={tr}
          >
            {(dueCards ?? 0) > 0 ? (
              <Button as={Link} to="/daily-srs/" variant="soft" size="sm" iconRight={ArrowRight}>
                {tr('Ôn ngay')}
              </Button>
            ) : (
              <Link to="/daily-srs/" className="rp-focus rp-link rounded text-xs font-semibold">
                {tr('Mở SRS')}
              </Link>
            )}
          </MetricRow>
        )}
        {dueCards === 0 && !loading.srs && (
          <p className="mt-1.5 text-[11.5px] font-medium text-rp-success">{tr('Không còn thẻ đến hạn hôm nay. Giữ nhịp thật tốt!')}</p>
        )}
      </div>
    </section>
  );
}

function GroupLearningWidget({ className }) {
  const { tr, trf } = useLocale();
  const session = getSession();
  const calendar = useWorkspaceCalendar({ roleKey: 'Learner', includeSrs: false });

  if (session?.isPreview) {
    return (
      <Card className={cx('flex flex-col justify-between border-rp-line bg-white p-4 shadow-rp-sm', className)}>
        <div className="flex items-center gap-2.5">
          <WebClayIcon name="group" size="xs" tone="sky" hover className="-my-1" />
          <div>
            <h3 className="text-[15.5px] font-extrabold text-rp-navy">{tr('Học nhóm cùng Giáo viên')}</h3>
            <p className="text-[11.5px] text-rp-text-muted">{tr('Lịch buổi học nhóm và tương tác trực tiếp')}</p>
          </div>
        </div>
        <div className="mt-3">
          <ContextualEmptyState variant="compact" illustration="classroom" title={tr('Chế độ xem trước')} description={tr('Lớp học nhóm chỉ hiển thị với dữ liệu thật.')} />
        </div>
      </Card>
    );
  }

  const courses = calendar.courses.filter((c) => c.cohortId && c.status !== 'Cancelled' && c.status !== 'Transferred');
  const { liveSessions, upcomingSessions } = calendar.summary;
  const nextSession = liveSessions[0] || upcomingSessions[0] || null;

  const syntheticQuery = {
    isPending: calendar.coursesQuery.isPending,
    isFetching: calendar.coursesQuery.isFetching,
    isError: calendar.coursesQuery.isError,
    error: calendar.coursesQuery.error || null,
    refetch: calendar.refetchAll,
    data: calendar.coursesQuery.data,
  };

  return (
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
        // Same empty state as "Lớp của tôi": one classroom illustration, centred, no nested frame.
        <ContextualEmptyState
          framed={false}
          illustration="classroom"
          size={92}
          className="flex-1 !gap-2 !py-1"
          title={tr('Bạn chưa tham gia lớp nhóm nào')}
          description={tr('Khám phá các lớp JLPT theo cấp độ phù hợp để học trực tiếp cùng Giáo viên.')}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button as={Link} to="/cohorts" variant="primary" size="md" iconRight={ArrowRight}>
                {tr('Khám phá lớp học')}
              </Button>
              <Button as={Link} to="/mentors/" variant="secondary" size="md" icon={UsersRound}>
                {tr('Tìm Giáo viên')}
              </Button>
            </div>
          }
        />
      }
      wrap={(content) => (
        <Card className={cx('flex flex-col border-rp-line bg-white p-4 shadow-rp-sm sm:p-5', className)}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <WebClayIcon name="group" size="xs" hover className="-my-1" />
              <div className="min-w-0">
                <h3 className="truncate text-[16px] font-extrabold text-rp-navy">{tr('Học nhóm cùng Giáo viên')}</h3>
                <p className="truncate text-[11.5px] text-rp-text-muted">{tr('Lịch lớp, phòng họp & chuyên cần')}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <RefreshingIndicator active={calendar.isFetching && !calendar.isLoading} />
              <Link to="/calendar" className="rp-focus rp-link rounded text-xs font-semibold">{tr('Lịch học')}</Link>
            </div>
          </div>
          <div className="mt-3 flex flex-1 flex-col">{content}</div>
        </Card>
      )}
    >
      {() => (
        <div className="space-y-3">
          {nextSession && (
            <div
              className={cx(
                'rounded-2xl border p-3',
                nextSession.canJoin ? 'border-rp-success-line bg-rp-success-bg/50' : 'border-rp-sky-line bg-rp-sky-bg/45',
              )}
            >
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className={cx('font-bold uppercase tracking-wide', nextSession.canJoin ? 'text-rp-success' : 'text-rp-brand-strong')}>
                  {nextSession.canJoin ? tr('Phòng đang mở') : tr('Buổi sắp tới')}
                </span>
                <span className="flex items-center gap-1 font-medium text-rp-text-muted">
                  <Clock aria-hidden="true" className="h-3 w-3" /> {formatVnDateTime(nextSession.scheduledAt)}
                </span>
              </div>
              <p className="mt-1 truncate text-[13.5px] font-bold text-rp-navy">{nextSession.title}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-rp-text-2">{nextSession.mentorName}</span>
                {nextSession.canJoin ? (
                  <Button as={Link} to={nextSession.roomHref} variant="primary" size="sm" icon={Video}>
                    {tr('Vào phòng')}
                  </Button>
                ) : (
                  <Link to={nextSession.secondaryHref || '/my-courses'} className="rp-link shrink-0 text-xs font-semibold">
                    {tr('Mở lớp')}
                  </Link>
                )}
              </div>
            </div>
          )}

          <ul className="space-y-2">
            {courses.slice(0, 2).map((c) => {
              const s = COURSE_STATUS[c.status] || { tone: 'neutral', label: c.status };
              const total = Array.isArray(c.sessions) ? c.sessions.length : 0;
              const present = Array.isArray(c.sessions) ? c.sessions.filter((x) => x.status === 'Present').length : 0;
              return (
                <li key={c.id}>
                  <Link to={`/my-courses/${c.id}`} className="rp-focus rp-card-hover flex items-center gap-3 rounded-xl border border-rp-line bg-rp-bg-2/50 px-3 py-2.5">
                    {total > 0 && (
                      <RingProgress
                        value={present}
                        max={total}
                        size={36}
                        strokeWidth={4}
                        tone="sky"
                        label={trf('Chuyên cần {0}', { 0: displayCourseTitle(c, tr('Lớp học nhóm')) })}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-rp-navy">{displayCourseTitle(c, tr('Lớp học nhóm'))}</span>
                      <span className="block text-[11.5px] text-rp-text-muted">
                        {c.level || 'JLPT'}{c.mentorName ? ` · ${c.mentorName}` : ''}{total > 0 ? ` · ${present}/${total}` : ''}
                      </span>
                    </span>
                    <Badge tone={s.tone} size="sm">{tr(s.label)}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between border-t border-rp-line/70 pt-2 text-xs">
            <Link to="/my-courses/" className="rp-link font-semibold">{tr('Lớp của tôi')}</Link>
            <Link to="/group-learning/progress" className="rp-link font-semibold">{tr('Tiến độ học nhóm')}</Link>
          </div>
        </div>
      )}
    </OptionalDashboardWidget>
  );
}

export default function HomeLearner({ data = null }) {
  const { locale, tr, trf } = useLocale();
  // Fallback only outside the shell's shared atmosphere; inside it the greeting follows the sky's local time.
  const fallbackGreeting = useMemo(() => sceneForHour(), []);
  const session = getSession();
  const authenticated = Boolean(session?.accessToken && !session?.isPreview);

  const roadmapAccess = useLearningPathAccess({ enabled: authenticated });
  const studyAccess = useStudyAccess();
  const feed = useLearnerAnalyticsFeed(authenticated);

  const targetLevel = ['N5', 'N4', 'N3', 'N2'].includes(data?.targetLevel) ? data.targetLevel : null;
  const dueCards = isNum(data?.dueCards) ? Math.max(0, data.dueCards) : null;
  const streakDays = isNum(data?.streakDays) ? data.streakDays : null;
  const longestStreak = isNum(data?.longestStreakDays) ? data.longestStreakDays : null;
  const completedLessons = isNum(data?.completedExercises) ? data.completedExercises : null;
  const totalLessons = isNum(data?.totalLessons) ? data.totalLessons : 0;
  const activeToday = Boolean(data?.activeToday);
  const loading = data?.loading ?? {};
  const errors = data?.errors ?? {};
  const queries = data?.queries ?? {};
  const fetching = data?.fetching ?? {};
  const onRetry = data?.onRetry ?? {};
  const name = data?.displayName;

  const rawSkills = useMemo(() => {
    if (Array.isArray(data?.rawSkills) && data.rawSkills.length > 0) return data.rawSkills;
    const entries = Object.entries(data?.skillScores || {}).filter(([, v]) => isNum(v));
    return entries.map(([k, averageScore]) => ({
      languageSkillName: k,
      averageScore,
      attemptCount: 1,
    }));
  }, [data?.rawSkills, data?.skillScores]);

  const skillsWidgetQuery = queries.skills || {
    data: rawSkills.length > 0 ? rawSkills : errors.skills ? undefined : [],
    isPending: Boolean(loading.skills),
    isLoading: Boolean(loading.skills),
    isFetching: Boolean(fetching.skills),
    isError: Boolean(errors.skills),
    error: errors.skills,
    refetch: onRetry.skills,
  };
  const srsWidgetQuery = queries.srs || {
    data: dueCards != null ? { dueCards } : undefined,
    isPending: Boolean(loading.srs),
    isLoading: Boolean(loading.srs),
    isFetching: Boolean(fetching.srs),
    isError: Boolean(errors.srs),
    error: errors.srs,
    refetch: onRetry.srs,
  };

  const primaryFlow = resolveDashboardPrimaryFlow({
    targetLevel,
    completedLessons: completedLessons ?? 0,
    dueCards: dueCards ?? 0,
    roadmapAccess,
    studyAccess,
  });

  const streakObject = useMemo(
    () => ({
      currentStreakDays: streakDays ?? 0,
      longestStreakDays: longestStreak ?? 0,
      lastActivityDate: data?.lastActivityDate || null,
      isActiveToday: activeToday,
    }),
    [streakDays, longestStreak, data?.lastActivityDate, activeToday],
  );

  const todayKey = useMemo(() => toVnDateKey(new Date()), []);
  const verifiedDates = useMemo(
    () =>
      buildVerifiedActivityDateSet({
        streak: streakObject,
        mockHistory: feed.mockHistory,
        practiceHistory: feed.practiceHistory,
        homeworkList: feed.homeworkList,
        todayKey,
      }),
    [streakObject, feed.mockHistory, feed.practiceHistory, feed.homeworkList, todayKey],
  );

  const completionPct = totalLessons > 0 && completedLessons != null ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0;

  return (
    <LearnerShell breadcrumb={tr('Bảng học tập')}>
      <div data-page="HomeLearner" className="rp-container rp-cq space-y-5 py-[var(--rp-space-page-y)]">
        {/* Band 1: Personalized Welcome Hero — Dynamic Ground Banner (the ground under the shell's Dynamic Sky) */}
        <DynamicGroundBanner labelledBy="welcome-title" learning={{ completedLessons: completedLessons ?? 0, completionPct }}>
          {(ground) => {
            const lightText = ground.tone === 'dark';
            const copy = SCENE_COPY[ground.greeting || fallbackGreeting] || SCENE_COPY.day;
            return (
              <div className="relative z-[1] flex min-h-[clamp(184px,22vw,232px)] items-center justify-between gap-6 p-[clamp(1.25rem,2.6vw,2.5rem)]">
                <div className="min-w-0 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <p lang="ja" className={cx('rp-type-secondary font-semibold', lightText ? 'text-white/85' : 'text-rp-brand-strong')}>
                      {copy.jp}
                    </p>
                    {targetLevel && (
                      <Badge tone="brand" size="sm" icon={Target}>
                        {tr('Mục tiêu')} JLPT {targetLevel}
                      </Badge>
                    )}
                    {primaryFlow.stage === 'active-roadmap' && primaryFlow.nextDay?.day && (
                      <Badge tone="success" size="sm" icon={Route}>
                        {trf('Ngày {0}', { 0: primaryFlow.nextDay.day })}
                      </Badge>
                    )}
                  </div>

                  <h1 id="welcome-title" className={cx('mt-1.5 rp-type-page-title font-extrabold', lightText ? 'text-white' : 'text-rp-navy')}>
                    {name ? (locale === 'ja' ? `${name}さん、${copy.jp}` : `${tr(copy.hello)}, ${name}!`) : tr(copy.hello)}
                  </h1>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    {loading.profile ? (
                      <SakuraLoader variant="inline" context="dashboard" label={tr('Đang tải bảng học tập')} tone={lightText ? 'light' : 'brand'} />
                    ) : (
                      <p className={cx('text-sm leading-6', lightText ? 'text-white/90' : 'text-rp-text-2')}>
                        {tr(primaryFlow.hint)}
                      </p>
                    )}
                    <RefreshingIndicator active={Boolean(data?.refreshing)} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    {loading.profile ? null : primaryFlow.stage === 'active-roadmap' && !primaryFlow.nextDay?.lessons?.[0]?.lessonId ? (
                      <Link
                        to={primaryFlow.to}
                        className="rp-focus rp-press rp-btn-primary group inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong"
                      >
                        <Route aria-hidden="true" className="h-4 w-4" />
                        {tr(primaryFlow.ctaLabel)}
                        <ArrowRight aria-hidden="true" className="rp-btn-arrow h-4 w-4" />
                      </Link>
                    ) : primaryFlow.stage === 'continue-lessons' ? (
                      <FeatureLink
                        to={primaryFlow.to}
                        label="Bài học"
                        showLock={false}
                        className="rp-focus rp-press rp-btn-primary group inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong"
                      >
                        {tr(primaryFlow.ctaLabel)}
                        <ArrowRight aria-hidden="true" className="rp-btn-arrow h-4 w-4" />
                      </FeatureLink>
                    ) : (
                      <Link
                        to={primaryFlow.to}
                        className="rp-focus rp-press rp-btn-primary group inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong"
                      >
                        {primaryFlow.stage === 'ready-for-ai' ? (
                          <Sparkles aria-hidden="true" className="h-4 w-4" />
                        ) : primaryFlow.stage === 'needs-placement' ? (
                          <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
                        ) : (
                          <Target aria-hidden="true" className="h-4 w-4" />
                        )}
                        {tr(primaryFlow.ctaLabel)}
                        <ArrowRight aria-hidden="true" className="rp-btn-arrow h-4 w-4" />
                      </Link>
                    )}

                    {primaryFlow.secondaryTo && (
                      <Link
                        to={primaryFlow.secondaryTo}
                        className={cx(
                          'rp-focus rp-press rp-interactive inline-flex h-10 items-center gap-2 rounded-rp-input border px-4 text-sm font-semibold backdrop-blur',
                          lightText ? 'border-white/40 bg-white/15 text-white hover:bg-white/25' : 'border-rp-line bg-white/90 text-rp-text hover:border-rp-brand-border hover:text-rp-brand-strong',
                        )}
                      >
                        {tr(primaryFlow.secondaryLabel)}
                      </Link>
                    )}

                    <Link
                      to="/daily-srs/"
                      className={cx(
                        'rp-focus rp-press rp-interactive group inline-flex h-10 items-center gap-2 rounded-rp-input border px-4 text-sm font-semibold backdrop-blur',
                        lightText ? 'border-white/40 bg-white/15 text-white hover:bg-white/25' : 'border-rp-line bg-white/90 text-rp-text hover:border-rp-brand-border hover:bg-white hover:text-rp-brand-strong hover:shadow-rp-xs',
                      )}
                    >
                      <SrsLoopIcon className="rp-icon-tilt h-4 w-4" />
                      {dueCards ? trf('Ôn {0} thẻ đến hạn', { 0: dueCards }) : tr('Ôn tập SRS')}
                    </Link>
                  </div>
                </div>

                <div className="hidden shrink-0 lg:block">
                  <div className="relative">
                    <span aria-hidden="true" className="absolute bottom-1 left-1/2 h-4 w-28 -translate-x-1/2 rounded-[50%] bg-[rgba(24,30,50,0.22)] blur-[3px]" />
                    <HaruMascot
                      pose={activeToday ? 'celebrating' : 'studying'}
                      size={148}
                      halo={lightText}
                      className="rp-float relative shrink-0 drop-shadow-sm"
                    />
                  </div>
                </div>
              </div>
            );
          }}
        </DynamicGroundBanner>

        {/* Band 2: Learning overview — Streak · Progress & SRS · Learning package (equal height, weighted widths) */}
        <section aria-label={tr('Tổng quan học tập')} className="rp-cq-kpis rp-overview-row">
          <WeeklyStreakBar
            className="h-full"
            streak={streakObject}
            loading={Boolean(loading.streak && streakDays == null)}
            verifiedDates={verifiedDates}
            mockHistory={feed.mockHistory}
            practiceHistory={feed.practiceHistory}
            homeworkList={feed.homeworkList}
            dueCards={dueCards ?? 0}
          />
          <ProgressReviewCard
            className="h-full"
            completedLessons={completedLessons}
            totalLessons={totalLessons}
            completionPct={completionPct}
            dueCards={dueCards}
            loading={loading}
            errors={errors}
            onRetry={onRetry}
            srsWidgetQuery={srsWidgetQuery}
          />
          <PackageSummaryCard className="h-full" />
        </section>

        {/* Band 3: Interactive learning journey (scenes of real milestones, swipe / buttons / keys) */}
        <LearningJourneyMap
          targetLevel={targetLevel}
          roadmapAccess={roadmapAccess}
          hasAiCredit={Number(studyAccess?.learningPathUsesRemaining ?? 1) !== 0}
        />

        {/* Band 4: Discovery & practice (~60%) + Group learning with a Teacher (~40%) on one row */}
        <section aria-label={tr('Khám phá và học nhóm')} className="rp-cq-two-col rp-discovery-row">
          <SkillExplorer compact className="h-full" listClassName="rp-cq-practice" />
          <aside className="min-w-0">
            <GroupLearningWidget className="h-full" />
          </aside>
        </section>

        {/* Band 5: Learning analytics — interactive activity calendar, skill progress, recent activity */}
        <LearningAnalytics
          streak={streakObject}
          skills={rawSkills}
          skillsQuery={skillsWidgetQuery}
          skillMonthly={feed.skillMonthly}
          mockHistory={feed.mockHistory}
          practiceHistory={feed.practiceHistory}
          homeworkList={feed.homeworkList}
          feedLoading={Boolean(feed.isLoading)}
        />
      </div>
    </LearnerShell>
  );
}
