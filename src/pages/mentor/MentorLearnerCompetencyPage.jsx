import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Compass,
  GraduationCap,
  Layers,
  Minus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { MentorShell } from '@/layouts';
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  DataTable,
  PageContainer,
  RefreshButton,
  SakuraLoader,
  Tabs,
  UserAvatar,
  cx,
} from '@/components/ui';
import { AdminStatusBadge } from '@/features/admin/components/AdminPrimitives.jsx';
import { getCohorts, getMentorLearnerSkillProfile } from '@/features/cohorts/api/cohortApi.js';
import CompetencyRadarChart from '@/features/cohorts/components/CompetencyRadarChart.jsx';
import CompetencyTrendChart from '@/features/cohorts/components/CompetencyTrendChart.jsx';
import {
  formatDataSourceLabel,
  formatPercent,
  formatPercentagePointDelta,
  formatSkillLabel,
  sortSkillsCanonical,
} from '@/features/cohorts/utils/skillLabels.js';
import { formatDate } from '@/utils/dateTimeFormat.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import { useLocale } from '@/locales/locale.js';

const fmtDateOnly = (v) => (v ? formatDate(v, '—') : '—');

const TAB_KEYS = ['baseline', 'in-class', 'progress'];

function resolveLearnerStatus(enrollmentStatus, cohortStatus) {
  if (enrollmentStatus === 'Completed') return { tone: 'success', label: 'Đã hoàn thành' };
  if (cohortStatus === 'Cancelled') return { tone: 'danger', label: 'Đã hủy' };
  if (enrollmentStatus === 'Ready') return { tone: 'info', label: 'Đã ghi danh' };
  return { tone: 'warning', label: 'Đang học' };
}

function resolveBaselineSkillStatusMeta(skill) {
  if (!skill || skill.status === 'Unassessed' || skill.scorePercent == null) {
    return { tone: 'neutral', label: 'Chưa đánh giá' };
  }
  if (skill.status === 'LowSample' || skill.priority === 'needs_assessment') {
    return { tone: 'neutral', label: 'Chưa đủ dữ liệu' };
  }
  if (skill.priority === 'maintenance') {
    return { tone: 'success', label: 'Đạt ngưỡng' };
  }
  return { tone: 'warning', label: 'Cần củng cố' };
}

function deltaPresentation(delta) {
  const num = Number(delta);
  if (!Number.isFinite(num)) {
    return { Icon: Minus, colorClass: 'text-rp-text-2', badgeTone: 'neutral' };
  }
  if (num >= 2) {
    return { Icon: TrendingUp, colorClass: 'text-emerald-600 dark:text-emerald-400', badgeTone: 'success' };
  }
  if (num <= -2) {
    return { Icon: TrendingDown, colorClass: 'text-rose-600 dark:text-rose-400', badgeTone: 'danger' };
  }
  return { Icon: Minus, colorClass: 'text-rp-text-2', badgeTone: 'neutral' };
}

function StatTile({ label, value, subtext, valueClassName }) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-between rounded-xl border border-rp-line bg-rp-surface px-3.5 py-3 shadow-rp-xs">
      <dt className="text-[12.5px] font-medium text-rp-text-muted">{label}</dt>
      <dd className={cx('mt-1.5 text-[19px] font-bold leading-7 tracking-[-0.015em] text-rp-text tabular-nums', valueClassName)}>
        {value}
      </dd>
      {subtext && <p className="mt-1 text-[12px] leading-snug text-rp-text-muted tabular-nums">{subtext}</p>}
    </div>
  );
}

export default function MentorLearnerCompetencyPage() {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const { cohortId, learnerId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const numericCohortId = Number(cohortId);
  const numericLearnerId = Number(learnerId);
  const validParams = Number.isInteger(numericCohortId) && numericCohortId > 0
    && Number.isInteger(numericLearnerId) && numericLearnerId > 0;

  const rawTabParam = searchParams.get('tab');
  const activeTab = TAB_KEYS.includes(rawTabParam) ? rawTabParam : 'baseline';

  const [profile, setProfile] = useState(null);
  const [cohortObj, setCohortObj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!validParams) {
      setLoading(false);
      setError({ message: tr('Đường dẫn hồ sơ năng lực không hợp lệ.') });
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [skillData, cohortsList] = await Promise.all([
        getMentorLearnerSkillProfile(numericLearnerId, numericCohortId),
        getCohorts().catch(() => []),
      ]);
      setProfile(skillData || null);
      const matched = Array.isArray(cohortsList)
        ? cohortsList.find((c) => Number(c.id) === numericCohortId) || null
        : null;
      setCohortObj(matched);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [validParams, numericLearnerId, numericCohortId, tr]);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (alive) void loadData(false);
    });
    return () => {
      alive = false;
    };
  }, [loadData]);

  function handleTabChange(nextTab) {
    const resolved = TAB_KEYS.includes(nextTab) ? nextTab : 'baseline';
    const nextParams = new URLSearchParams(searchParams);
    if (resolved === 'baseline') nextParams.delete('tab');
    else nextParams.set('tab', resolved);
    setSearchParams(nextParams, { replace: true });
  }

  const backToLearnersUrl = validParams
    ? `/mentor-study-courses/${numericCohortId}/?section=learners`
    : '/mentor-study-courses/';

  const cohortCtx = profile?.cohortContext || null;
  const baseline = profile?.baselinePlacement || null;
  const preCoursePractice = useMemo(
    () => sortSkillsCanonical(profile?.preCoursePracticeSkills || [], (x) => x.skillCode),
    [profile?.preCoursePracticeSkills],
  );
  const inClass = profile?.inClassCompetency || null;
  const comparison = profile?.comparison || null;
  const parallelStudy = useMemo(
    () => sortSkillsCanonical(profile?.parallelSelfStudySkills || [], (x) => x.skillCode),
    [profile?.parallelSelfStudySkills],
  );

  const cohortName = cohortCtx?.cohortName || cohortObj?.name || tr('Lớp học JLPT');
  const learnerName = profile?.learnerName || tr('Học viên');
  const targetLevelCode = cohortCtx?.targetLevelCode || cohortObj?.level || baseline?.targetLevelCode || null;
  const learnerStatus = resolveLearnerStatus(cohortCtx?.enrollmentStatus, cohortCtx?.cohortStatus);
  const breadcrumbText = profile ? `${cohortName} / ${learnerName}` : tr('Năng lực học viên');

  // --- Tab 1: Baseline Radar Series & Dynamic Axes ---
  const baselineSkillsSorted = useMemo(
    () => sortSkillsCanonical(baseline?.skills || [], (s) => s.skillCode),
    [baseline?.skills],
  );
  const baselineUnassessed = useMemo(
    () => baselineSkillsSorted.filter((s) => s.status === 'Unassessed' || s.scorePercent == null),
    [baselineSkillsSorted],
  );
  const baselineRadarConfig = useMemo(() => {
    const assessed = baselineSkillsSorted.filter((s) => s.status !== 'Unassessed' && s.scorePercent != null);
    const axes = assessed.map((s) => ({ code: s.skillCode, label: s.skillLabel || s.skillCode }));
    const values = {};
    for (const s of assessed) {
      values[s.skillCode] = {
        scorePercent: s.scorePercent,
        correctCount: s.correctCount,
        totalCount: s.totalCount,
        sourceLabel: tr('Đánh giá đầu vào'),
        dateLabel: fmtDateOnly(baseline?.assessedAtUtc),
      };
    }
    return {
      axes,
      series: [{ key: 'baseline', label: 'Đầu vào', color: '#2563EB', values }],
    };
  }, [baselineSkillsSorted, baseline?.assessedAtUtc, tr]);

  // --- Tab 2: In-Class Radar Series, Trend & Table Rows ---
  const inClassSkillsSorted = useMemo(
    () => sortSkillsCanonical(inClass?.skills || [], (s) => s.skillCode),
    [inClass?.skills],
  );
  const inClassRadarConfig = useMemo(() => {
    const axes = inClassSkillsSorted.map((s) => ({ code: s.skillCode, label: s.skillLabel || s.skillCode }));
    const values = {};
    for (const s of inClassSkillsSorted) {
      values[s.skillCode] = {
        scorePercent: s.averageScorePercent,
        sampleCount: s.sampleCount,
        sourceLabel: formatDataSourceLabel(s.dataSources, tr),
        dateLabel: fmtDateOnly(s.latestAtUtc),
      };
    }
    return {
      axes,
      series: [{ key: 'in-class', label: 'Hiện tại', color: '#10B981', values }],
    };
  }, [inClassSkillsSorted, tr]);

  const inClassAssessmentRows = useMemo(
    () =>
      (inClass?.assessments || []).map((ev) => ({
        ...ev,
        eventDate: ev.gradedAtUtc || ev.submittedAtUtc || ev.dueAtUtc || null,
        skillsText: (ev.skills || []).map((sk) => formatSkillLabel(sk, tr)).join(', '),
      })),
    [inClass?.assessments, tr],
  );

  const recentMentorFeedbacks = useMemo(
    () => (inClass?.assessments || []).filter((ev) => Boolean(ev.mentorFeedback)).slice(0, 3),
    [inClass?.assessments],
  );

  // --- Tab 3: Dual-Layer Comparison Radar & Unified Table ---
  const comparisonRadarConfig = useMemo(() => {
    const rows = sortSkillsCanonical(comparison?.skillComparisons || [], (c) => c.skillCode);
    const axes = rows.map((c) => ({ code: c.skillCode, label: c.skillLabel || c.skillCode }));
    const baseValues = {};
    const curValues = {};
    for (const row of rows) {
      baseValues[row.skillCode] = {
        scorePercent: row.baselineScorePercent,
        dateLabel: fmtDateOnly(comparison?.baselineAssessedAtUtc),
        sourceLabel: tr('Đầu vào'),
      };
      curValues[row.skillCode] = {
        scorePercent: row.currentScorePercent,
        dateLabel: fmtDateOnly(comparison?.currentAssessedAtUtc),
        sourceLabel: comparison?.assessmentScale || tr('Hiện tại'),
      };
    }
    return {
      rows,
      axes,
      series: [
        { key: 'baseline', label: 'Đầu vào', color: '#2563EB', values: baseValues },
        { key: 'current', label: 'Hiện tại', color: '#10B981', values: curValues },
      ],
    };
  }, [comparison, tr]);

  const tabItems = useMemo(
    () => [
      { value: 'baseline', id: 'baseline', label: 'Năng lực đầu vào', panelId: 'panel-baseline' },
      { value: 'in-class', id: 'in-class', label: 'Trong khóa học', panelId: 'panel-in-class' },
      { value: 'progress', id: 'progress', label: 'Mức tiến bộ', panelId: 'panel-progress' },
    ],
    [],
  );

  const preCourseColumns = useMemo(
    () => [
      {
        key: 'skillLabel',
        header: tr('Kỹ năng'),
        align: 'left',
        render: (row) => (
          <span className="font-semibold text-rp-text">{formatSkillLabel(row.skillLabel || row.skillCode, tr)}</span>
        ),
      },
      {
        key: 'averageScorePercent',
        header: tr('Kết quả luyện tập'),
        align: 'left',
        render: (row) => (
          <div className="flex min-w-[140px] items-center gap-2.5">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-rp-bg-2">
              <div
                className="h-full rounded-full bg-blue-500/80"
                style={{ width: `${Math.max(0, Math.min(100, Number(row.averageScorePercent || 0)))}%` }}
              />
            </div>
            <span className="w-12 text-right font-bold tabular-nums text-rp-text">
              {formatPercent(row.averageScorePercent)}
            </span>
          </div>
        ),
      },
      {
        key: 'sampleCount',
        header: tr('Số lượt'),
        align: 'center',
        compact: true,
        render: (row) => <span className="tabular-nums text-rp-text-2">{trf('{0} lượt', { 0: row.sampleCount })}</span>,
      },
      {
        key: 'dataSource',
        header: tr('Nguồn dữ liệu'),
        align: 'left',
        render: (row) => <span className="text-rp-text-2">{formatDataSourceLabel(row.dataSource, tr)}</span>,
      },
      {
        key: 'latestAtUtc',
        header: tr('Gần nhất'),
        align: 'right',
        compact: true,
        render: (row) => <span className="tabular-nums text-rp-text-muted">{fmtDateOnly(row.latestAtUtc)}</span>,
      },
    ],
    [tr, trf],
  );

  const assessmentHistoryColumns = useMemo(
    () => [
      {
        key: 'eventDate',
        header: tr('Ngày đánh giá'),
        align: 'left',
        compact: true,
        render: (row) => <span className="tabular-nums text-rp-text-2">{fmtDateOnly(row.eventDate)}</span>,
      },
      {
        key: 'title',
        header: tr('Nội dung đánh giá'),
        align: 'left',
        render: (row) => (
          <div className="min-w-[160px]">
            <p className="font-semibold text-rp-text">{row.title}</p>
            <p className="text-[11px] text-rp-text-muted">{tr(row.kind)}</p>
          </div>
        ),
      },
      {
        key: 'skillsText',
        header: tr('Kỹ năng'),
        align: 'left',
        sortable: false,
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            {(row.skills || []).length > 0 ? (
              row.skills.map((sk) => (
                <Badge key={sk} tone="neutral" icon={false} size="sm">
                  {formatSkillLabel(sk, tr)}
                </Badge>
              ))
            ) : (
              <span className="text-rp-text-muted">—</span>
            )}
          </div>
        ),
      },
      {
        key: 'scorePercent',
        header: tr('Kết quả'),
        align: 'center',
        compact: true,
        render: (row) => (
          <div className="inline-flex items-center gap-1.5">
            {row.scorePercent != null && (
              <span className="font-bold tabular-nums text-rp-text">{formatPercent(row.scorePercent)}</span>
            )}
            <AdminStatusBadge
              tone={row.passed === true ? 'success' : row.passed === false ? 'danger' : row.submittedAtUtc ? 'warning' : 'neutral'}
              label={
                row.passed === true
                  ? tr('Đạt')
                  : row.passed === false
                    ? tr('Chưa đạt')
                    : row.submittedAtUtc
                      ? tr('Chờ chấm')
                      : tr('Chưa nộp')
              }
            />
          </div>
        ),
      },
      {
        key: 'mentorFeedback',
        header: tr('Nhận xét của Giáo viên'),
        align: 'left',
        sortable: false,
        render: (row) => (
          <span className="block max-w-[260px] text-xs text-rp-text-2">
            {row.mentorFeedback || <span className="text-rp-text-muted">—</span>}
          </span>
        ),
      },
    ],
    [tr],
  );

  // Compute baseline level conclusion honestly using AssessedLevelStatus.
  const baselineAssessedLevelDisplay = useMemo(() => {
    if (!baseline) return tr('Chưa có dữ liệu');
    if (baseline.assessedLevelStatus === 'Assessed' && baseline.assessedJlptLevel) {
      return formatJlptLevel(baseline.assessedJlptLevel);
    }
    if (baseline.assessedLevelStatus === 'BelowTestedLevel') {
      return baseline.testedLevelScope
        ? trf('Chưa đạt ngưỡng {0}', { 0: baseline.testedLevelScope })
        : tr('Chưa đạt ngưỡng');
    }
    if (baseline.assessedLevelStatus === 'InsufficientData') {
      return tr('Chưa đủ dữ liệu');
    }
    return baseline.assessedJlptLevel ? formatJlptLevel(baseline.assessedJlptLevel) : tr('Chưa đủ dữ liệu');
  }, [baseline, tr, trf]);

  return (
    <MentorShell breadcrumb={breadcrumbText}>
      <PageContainer width="wide" density="comfortable" className="space-y-4 text-rp-text">
        {/* Top utility bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate(backToLearnersUrl)}
          >
            {tr('Quay lại danh sách học viên')}
          </Button>
          {validParams && (
            <RefreshButton onRefresh={() => loadData(true)} refreshing={refreshing} />
          )}
        </div>

        {loading ? (
          <Card className="p-8">
            <SakuraLoader variant="section" context="cohort" label={tr('Đang tải hồ sơ năng lực học viên...')} />
          </Card>
        ) : error ? (
          <Card>
            <ContextualErrorState
              error={error}
              title={tr('Không thể truy cập hồ sơ năng lực học viên')}
              onRetry={validParams ? () => loadData(false) : undefined}
              retrying={refreshing}
              action={
                <Button variant="secondary" size="sm" onClick={() => navigate('/mentor-study-courses/')}>
                  {tr('Về danh sách lớp')}
                </Button>
              }
            />
          </Card>
        ) : profile ? (
          <>
            {/* Compact Streamlined Learner Competency Header (Section 1) */}
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3.5">
                  <UserAvatar src={cohortCtx?.learnerAvatarUrl} name={learnerName} size={48} />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-[19px] font-bold leading-7 tracking-[-0.015em] text-rp-text sm:text-[21px]">{learnerName}</h1>
                      <AdminStatusBadge tone={learnerStatus.tone} label={tr(learnerStatus.label)} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-rp-text-muted">
                      <span className="font-semibold text-rp-text-2">{cohortName}</span>
                      {targetLevelCode && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-rp-text">
                            {formatJlptLevel(targetLevelCode)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {cohortCtx?.enrolledAtUtc && (
                  <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 px-3.5 py-2 text-xs">
                    <span className="text-rp-text-muted">{tr('Ngày ghi danh')}: </span>
                    <strong className="tabular-nums text-rp-text">{fmtDateOnly(cohortCtx.enrolledAtUtc)}</strong>
                  </div>
                )}
              </div>
            </Card>

            {/* Three Sliding Analytics Tabs (Section 2) */}
            <div className="flex items-center justify-between gap-3">
              <Tabs
                variant="pill"
                tone="segmented"
                size="md"
                value={activeTab}
                onChange={handleTabChange}
                tabs={tabItems}
                label={tr('Phân tích năng lực học viên')}
              />
            </div>

            {/* ================= TAB 1: BASELINE COMPETENCY ================= */}
            {activeTab === 'baseline' && (
              <section
                id="panel-baseline"
                role="tabpanel"
                aria-labelledby="tab-baseline"
                key="baseline"
                className="space-y-4 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
              >
                <Card className="space-y-4 p-4 sm:p-5">
                  <CardHeader
                    title={tr('Năng lực đầu vào chính thức')}
                    description={
                      inClass?.hasClassStarted && cohortCtx?.baselineCutoffUtc
                        ? trf('Mốc đầu vào được bảo toàn trước ngày khai giảng ({0}) để đối chiếu mức tiến bộ.', {
                            0: fmtDateOnly(cohortCtx.baselineCutoffUtc),
                          })
                        : tr('Phản ánh năng lực thực tế của học viên trước khi bắt đầu học tại lớp.')
                    }
                    icon={<Award className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
                  />

                  {!baseline ? (
                    <ContextualEmptyState
                      variant="compact"
                      illustration="assessment"
                      title={tr('Chưa có dữ liệu đánh giá đầu vào.')}
                      description={tr('Học viên chưa có bài đánh giá năng lực đầu vào chính thức trước thời điểm lớp bắt đầu.')}
                    />
                  ) : (
                    <div className="space-y-4">
                      {/* 5 Compact Overview KPIs */}
                      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        <StatTile
                          label={tr('Cấp độ mục tiêu')}
                          value={baseline.targetLevelCode ? formatJlptLevel(baseline.targetLevelCode) : tr('Chưa xác định')}
                          subtext={baseline.testedLevelScope ? trf('Phạm vi kiểm tra: {0}', { 0: baseline.testedLevelScope }) : undefined}
                        />
                        <StatTile
                          label={tr('Kết quả đánh giá trình độ')}
                          value={baselineAssessedLevelDisplay}
                          valueClassName={
                            baseline.assessedLevelStatus === 'Assessed'
                              ? 'text-blue-600 dark:text-blue-400'
                              : baseline.assessedLevelStatus === 'BelowTestedLevel'
                                ? 'text-amber-600 dark:text-amber-400 text-base'
                                : 'text-rp-text-muted text-base'
                          }
                          subtext={
                            baseline.recommendedTargetLevel && baseline.assessedLevelStatus === 'Assessed'
                              ? trf('Khuyến nghị ôn: JLPT {0}', { 0: baseline.recommendedTargetLevel })
                              : undefined
                          }
                        />
                        <StatTile
                          label={tr('Điểm đánh giá tổng hợp')}
                          value={formatPercent(baseline.overallScorePercent)}
                          subtext={[
                            baseline.totalQuestions > 0
                              ? trf('{0}/{1} câu hợp lệ', { 0: baseline.correctCount, 1: baseline.totalQuestions })
                              : tr('Chưa có câu hỏi hợp lệ'),
                            baseline.excludedInvalidQuestionCount > 0
                              ? trf('Loại {0} câu lỗi/thiếu audio', { 0: baseline.excludedInvalidQuestionCount })
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        />
                        <StatTile
                          label={tr('Số kỹ năng đã đánh giá')}
                          value={`${baseline.assessedSkillCount ?? baselineRadarConfig.axes.length}/${baseline.totalSkillCount ?? baselineSkillsSorted.length}`}
                          subtext={
                            baselineUnassessed.length > 0
                              ? trf('{0} kỹ năng chưa đủ dữ liệu', { 0: baselineUnassessed.length })
                              : tr('Đầy đủ kỹ năng cấu trúc đề')
                          }
                        />
                        <StatTile
                          label={tr('Ngày thực hiện đánh giá')}
                          value={fmtDateOnly(baseline.assessedAtUtc)}
                          valueClassName="text-base"
                        />
                      </dl>

                      {baseline.compatibilityNote && (
                        <Banner tone="warning" title={tr('Lưu ý độ tương thích đầu vào')}>
                          {baseline.compatibilityNote}
                        </Banner>
                      )}

                      {/* Desktop 2-Col Analytics: Radar Left | Detailed Skill Table Right */}
                      <div className="grid items-stretch gap-4 lg:grid-cols-12">
                        <div className="min-w-0 lg:col-span-5">
                          <CompetencyRadarChart
                            axes={baselineRadarConfig.axes}
                            series={baselineRadarConfig.series}
                            unassessedSkills={baselineUnassessed}
                            scopeNote={tr('Biểu đồ chỉ vẽ các kỹ năng có dữ liệu câu hỏi hợp lệ; trục thiếu dữ liệu không bị quy về 0%.')}
                            emptyTitle={tr('Chưa đủ kỹ năng hợp lệ để vẽ Radar đầu vào.')}
                            ariaLabel={tr('Biểu đồ Radar năng lực đầu vào')}
                          />
                        </div>

                        <div className="min-w-0 lg:col-span-7 flex flex-col justify-between gap-4">
                          <div className="overflow-x-auto rounded-rp-card border border-rp-line bg-rp-surface">
                            <table className="w-full min-w-[420px] border-collapse text-left text-xs sm:text-[13px]">
                              <thead className="bg-rp-bg-2/70 text-rp-text-2">
                                <tr className="border-b border-rp-line">
                                  <th className="px-3.5 py-2.5 font-semibold">{tr('Kỹ năng')}</th>
                                  <th className="px-3 py-2.5 text-right font-semibold">{tr('Điểm số')}</th>
                                  <th className="px-3 py-2.5 text-right font-semibold">{tr('Số câu đúng')}</th>
                                  <th className="px-3 py-2.5 text-center font-semibold">{tr('Mức độ')}</th>
                                  <th className="px-3.5 py-2.5 font-semibold">{tr('Nhận xét')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-rp-line/80">
                                {baselineSkillsSorted.map((sk) => {
                                  const meta = resolveBaselineSkillStatusMeta(sk);
                                  const hasScore = sk.status !== 'Unassessed' && sk.scorePercent != null;
                                  return (
                                    <tr key={sk.skillCode} className="hover:bg-rp-bg-2/35">
                                      <td className="whitespace-nowrap px-3.5 py-2.5 font-semibold text-rp-text">
                                        {formatSkillLabel(sk.skillLabel || sk.skillCode, tr)}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums text-rp-text">
                                        {hasScore ? formatPercent(sk.scorePercent) : '—'}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-rp-text-2">
                                        {hasScore ? `${sk.correctCount}/${sk.totalCount}` : '—'}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-2.5 text-center">
                                        <Badge tone={meta.tone} size="sm" icon={false}>
                                          {tr(meta.label)}
                                        </Badge>
                                      </td>
                                      <td className="px-3.5 py-2.5 text-xs text-rp-text-2">
                                        {sk.comment || tr('Chưa có dữ liệu nhận xét')}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Strengths & Priority Focus Areas strictly from rule evaluation */}
                          <div className="grid gap-3 text-xs sm:grid-cols-2">
                            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                              <p className="font-semibold text-emerald-700 dark:text-emerald-300">{tr('Điểm mạnh')}</p>
                              <p className="mt-1 leading-relaxed text-rp-text-2">
                                {baseline.strengths?.length > 0
                                  ? baseline.strengths.map((s) => formatSkillLabel(s, tr)).join(', ')
                                  : tr('Chưa ghi nhận kỹ năng đạt ngưỡng vững ở mục tiêu hiện tại.')}
                              </p>
                            </div>
                            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/30">
                              <p className="font-semibold text-amber-700 dark:text-amber-300">{tr('Kỹ năng cần củng cố')}</p>
                              <p className="mt-1 leading-relaxed text-rp-text-2">
                                {baseline.focusAreas?.length > 0
                                  ? baseline.focusAreas.map((s) => formatSkillLabel(s, tr)).join(', ')
                                  : tr('Chưa có kỹ năng nào ở mức ưu tiên củng cố cao.')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Pre-Course Independent Self-Study Reference Table (strictly segregated from baseline) */}
                {preCoursePractice.length > 0 && (
                  <Card className="space-y-3 p-4 sm:p-5">
                    <div>
                      <h2 className="text-sm font-bold text-rp-text">
                        {tr('Kết quả tự luyện trước khóa học (tham khảo)')}
                      </h2>
                      <p className="mt-0.5 text-xs text-rp-text-muted">
                        {tr('Tổng hợp tách biệt từ bài luyện tập và thi thử độc lập trước khi lớp bắt đầu; không thay thế kết quả đánh giá đầu vào chính thức.')}
                      </p>
                    </div>
                    <DataTable
                      columns={preCourseColumns}
                      rows={preCoursePractice}
                      rowKey={(row) => `${row.skillCode}-${row.dataSource}`}
                      density="compact"
                      pageSize={6}
                      itemLabel={tr('kỹ năng')}
                      paginationVariant="neutral"
                    />
                  </Card>
                )}
              </section>
            )}

            {/* ================= TAB 2: IN-CLASS COMPETENCY ================= */}
            {activeTab === 'in-class' && (
              <section
                id="panel-in-class"
                role="tabpanel"
                aria-labelledby="tab-in-class"
                key="in-class"
                className="space-y-4 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
              >
                {!inClass?.hasClassStarted || !inClass?.hasData ? (
                  <Card className="p-5">
                    <ContextualEmptyState
                      variant="compact"
                      illustration="homework"
                      title={tr('Chưa có dữ liệu học tập tại lớp.')}
                      description={
                        inClass?.hasClassStarted
                          ? tr('Học viên chưa có bài tập được giao, điểm đánh giá hoặc dữ liệu điểm danh tại lớp này.')
                          : tr('Dữ liệu học tập tại lớp sẽ bắt đầu được ghi nhận sau khi buổi học đầu tiên diễn ra.')
                      }
                    />
                  </Card>
                ) : (
                  <>
                    <Card className="space-y-4 p-4 sm:p-5">
                      <CardHeader
                        title={tr('Kết quả học tập trong khóa học')}
                        description={tr('Chỉ tổng hợp bài tập, chấm điểm và chuyên cần phát sinh tại lớp học đang xem.')}
                        icon={<GraduationCap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                      />

                      {/* 6 Compact Operational + Academic KPIs */}
                      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                        <StatTile
                          label={tr('Tiến trình khóa học')}
                          value={
                            inClass.totalScheduledSessionsCount > 0
                              ? `${inClass.completedSessionsCount}/${inClass.totalScheduledSessionsCount}`
                              : tr('Chưa có lịch')
                          }
                          subtext={inClass.totalScheduledSessionsCount > 0 ? tr('buổi học') : undefined}
                        />
                        <StatTile
                          label={tr('Chuyên cần cá nhân')}
                          value={
                            inClass.attendanceMarkedCount > 0 && inClass.attendanceRatePercent != null
                              ? formatPercent(inClass.attendanceRatePercent)
                              : tr('Chưa điểm danh')
                          }
                          subtext={
                            inClass.attendanceMarkedCount > 0
                              ? trf('{0}/{1} buổi có mặt', { 0: inClass.attendancePresentCount, 1: inClass.attendanceMarkedCount })
                              : undefined
                          }
                        />
                        <StatTile
                          label={tr('Hoàn thành bài tập')}
                          value={
                            (inClass.homeworkStats?.assignedCount ?? 0) > 0
                              ? formatPercent((inClass.homeworkStats.submittedCount * 100) / inClass.homeworkStats.assignedCount)
                              : tr('Chưa có bài')
                          }
                          subtext={
                            (inClass.homeworkStats?.assignedCount ?? 0) > 0
                              ? trf('{0}/{1} bài đã nộp', { 0: inClass.homeworkStats.submittedCount, 1: inClass.homeworkStats.assignedCount })
                              : undefined
                          }
                        />
                        <StatTile
                          label={tr('Nộp bài đúng hạn')}
                          value={
                            inClass.homeworkStats?.onTimePercent != null
                              ? formatPercent(inClass.homeworkStats.onTimePercent)
                              : tr('Chưa có dữ liệu')
                          }
                          subtext={
                            (inClass.homeworkStats?.assignedCount ?? 0) > 0
                              ? trf('{0}/{1} bài đúng hạn', { 0: inClass.homeworkStats.onTimeCount, 1: inClass.homeworkStats.assignedCount })
                              : undefined
                          }
                        />
                        <StatTile
                          label={tr('Kết quả bài tập đã chấm')}
                          value={
                            inClass.averageGradedHomeworkScorePercent != null
                              ? formatPercent(inClass.averageGradedHomeworkScorePercent)
                              : tr('Chưa chấm điểm')
                          }
                          valueClassName={inClass.averageGradedHomeworkScorePercent != null ? 'text-emerald-600 dark:text-emerald-400' : 'text-base text-rp-text-muted'}
                          subtext={inClass.gradedHomeworkCount > 0 ? trf('{0} bài đã chấm', { 0: inClass.gradedHomeworkCount }) : undefined}
                        />
                        <StatTile
                          label={tr('Lượt đánh giá kỹ năng')}
                          value={inClass.scoredAssessmentCount ?? 0}
                          subtext={trf('{0} kỹ năng được đo lường', { 0: inClassSkillsSorted.length })}
                        />
                      </dl>

                      {/* 2-Column In-Class Radar (Green) + Skill Breakdown & Highlights */}
                      <div className="grid items-stretch gap-4 lg:grid-cols-12">
                        <div className="min-w-0 lg:col-span-5">
                          <CompetencyRadarChart
                            axes={inClassRadarConfig.axes}
                            series={inClassRadarConfig.series}
                            scopeNote={tr('Biểu đồ chỉ phản ánh kết quả đánh giá năng lực tiếng Nhật tại lớp; không tính tỷ lệ chuyên cần hay số lần nộp bài.')}
                            emptyTitle={tr('Chưa có điểm kỹ năng được chấm trong lớp.')}
                            emptyDescription={tr('Biểu đồ năng lực sẽ hiển thị ngay khi bài tập hoặc bài kiểm tra theo kỹ năng được chấm điểm.')}
                            ariaLabel={tr('Biểu đồ Radar năng lực hiện tại trong khóa học')}
                          />
                        </div>

                        <div className="min-w-0 lg:col-span-7 flex flex-col justify-between gap-4">
                          {inClassSkillsSorted.length > 0 ? (
                            <div className="overflow-x-auto rounded-rp-card border border-rp-line bg-rp-surface">
                              <table className="w-full min-w-[380px] border-collapse text-left text-xs sm:text-[13px]">
                                <thead className="bg-rp-bg-2/70 text-rp-text-2">
                                  <tr className="border-b border-rp-line">
                                    <th className="px-3.5 py-2.5 font-semibold">{tr('Kỹ năng')}</th>
                                    <th className="px-3 py-2.5 text-right font-semibold">{tr('Điểm TB')}</th>
                                    <th className="px-3 py-2.5 text-center font-semibold">{tr('Số lượt')}</th>
                                    <th className="px-3 py-2.5 font-semibold">{tr('Nguồn')}</th>
                                    <th className="px-3.5 py-2.5 text-right font-semibold">{tr('Gần nhất')}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-rp-line/80">
                                  {inClassSkillsSorted.map((sk) => (
                                    <tr key={sk.skillCode} className="hover:bg-rp-bg-2/35">
                                      <td className="whitespace-nowrap px-3.5 py-2.5 font-semibold text-rp-text">
                                        {formatSkillLabel(sk.skillLabel || sk.skillCode, tr)}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                        {formatPercent(sk.averageScorePercent)}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-2.5 text-center tabular-nums text-rp-text-2">
                                        {sk.sampleCount}
                                      </td>
                                      <td className="px-3 py-2.5 text-rp-text-2">
                                        {formatDataSourceLabel(sk.dataSources, tr)}
                                      </td>
                                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums text-rp-text-muted">
                                        {fmtDateOnly(sk.latestAtUtc)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="flex flex-1 items-center justify-center rounded-rp-card border border-dashed border-rp-line bg-rp-bg-2/30 p-5 text-center text-xs text-rp-text-muted">
                              {tr('Chưa có dữ liệu điểm số theo từng kỹ năng trong lớp học này.')}
                            </div>
                          )}

                          <div className="grid gap-3 text-xs sm:grid-cols-2">
                            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                              <p className="font-semibold text-emerald-700 dark:text-emerald-300">{tr('Điểm mạnh tại lớp')}</p>
                              <p className="mt-1 leading-relaxed text-rp-text-2">
                                {inClass.strengths?.length > 0
                                  ? inClass.strengths.map((s) => formatSkillLabel(s, tr)).join(', ')
                                  : tr('Chưa ghi nhận kỹ năng đạt mức vững từ 80% trở lên.')}
                              </p>
                            </div>
                            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/30">
                              <p className="font-semibold text-amber-700 dark:text-amber-300">{tr('Kỹ năng cần củng cố')}</p>
                              <p className="mt-1 leading-relaxed text-rp-text-2">
                                {inClass.focusAreas?.length > 0
                                  ? inClass.focusAreas.map((s) => formatSkillLabel(s, tr)).join(', ')
                                  : tr('Chưa có kỹ năng nào dưới ngưỡng 60% trong khóa học.')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Chronological In-Class Trend Line Chart (never fabricated / never connects 1 point or mismatched scales) */}
                    <CompetencyTrendChart
                      points={inClass.trendPoints || []}
                      color="#10B981"
                      title={tr('Xu hướng kết quả đánh giá trong khóa học')}
                      subtitle={tr('Hiển thị diễn biến điểm số qua các bài kiểm tra cùng phương pháp chấm theo thời gian thực tế.')}
                      emptyText={tr('Cần ít nhất 2 bài tập hoặc bài kiểm tra có cùng thang chấm điểm để vẽ xu hướng học tập.')}
                    />

                    {/* Paginated Evaluation History Table */}
                    {inClassAssessmentRows.length > 0 && (
                      <Card className="space-y-3 p-4 sm:p-5">
                        <h2 className="text-sm font-bold text-rp-text">{tr('Lịch sử bài tập & đánh giá trong lớp')}</h2>
                        <DataTable
                          columns={assessmentHistoryColumns}
                          rows={inClassAssessmentRows}
                          rowKey={(row) => row.id}
                          density="compact"
                          pageSize={5}
                          itemLabel={tr('đánh giá')}
                          paginationVariant="neutral"
                        />
                      </Card>
                    )}

                    {/* Parallel Independent Self-Study Reference (strictly segregated) */}
                    {parallelStudy.length > 0 && (
                      <Card className="space-y-3 p-4 sm:p-5">
                        <div>
                          <h2 className="text-sm font-bold text-rp-text">
                            {tr('Hoạt động tự học song song (ngoài chương trình lớp)')}
                          </h2>
                          <p className="mt-0.5 text-xs text-rp-text-muted">
                            {tr('Tổng hợp tách biệt các bài tự luyện tập hoặc thi thử cá nhân sau ngày khai giảng; không trộn với kết quả tại lớp.')}
                          </p>
                        </div>
                        <DataTable
                          columns={preCourseColumns}
                          rows={parallelStudy}
                          rowKey={(row) => `parallel-${row.skillCode}-${row.dataSource}`}
                          density="compact"
                          pageSize={5}
                          itemLabel={tr('kỹ năng')}
                          paginationVariant="neutral"
                        />
                      </Card>
                    )}
                  </>
                )}
              </section>
            )}

            {/* ================= TAB 3: PROGRESS COMPARISON ================= */}
            {activeTab === 'progress' && (
              <section
                id="panel-progress"
                role="tabpanel"
                aria-labelledby="tab-progress"
                key="progress"
                className="space-y-4 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
              >
                {!comparison?.isComparable ? (
                  <Card className="p-5">
                    <ContextualEmptyState
                      variant="compact"
                      illustration="chart"
                      title={tr('Chưa đủ dữ liệu để đo lường mức tiến bộ.')}
                      description={
                        comparison?.reasonIfNotComparable
                        || tr('Chỉ đối chiếu khi học viên có bài đánh giá đầu vào và bài đánh giá cùng cấp độ JLPT sau khi lớp bắt đầu.')
                      }
                    />
                  </Card>
                ) : (
                  <>
                    <Card className="space-y-4 p-4 sm:p-5">
                      <CardHeader
                        title={tr('So sánh mức tiến bộ năng lực')}
                        description={`${comparison.assessmentScale || tr('Chuẩn JLPT')} · ${fmtDateOnly(comparison.baselineAssessedAtUtc)} → ${fmtDateOnly(comparison.currentAssessedAtUtc)}`}
                        icon={<Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                      />

                      {/* 4 Progress Summary KPIs */}
                      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {(() => {
                          const dm = deltaPresentation(comparison.overallDeltaPercent);
                          return (
                            <StatTile
                              label={tr('Mức thay đổi tổng hợp')}
                              value={
                                comparison.overallDeltaPercent != null
                                  ? formatPercentagePointDelta(comparison.overallDeltaPercent, tr)
                                  : '—'
                              }
                              valueClassName={dm.colorClass}
                              subtext={`${formatPercent(comparison.baselineOverallPercent)} → ${formatPercent(comparison.currentOverallPercent)}`}
                            />
                          );
                        })()}
                        <StatTile
                          label={tr('Số kỹ năng có tiến bộ')}
                          value={`${comparison.improvedSkills?.length ?? 0}/${comparisonRadarConfig.rows.length}`}
                          valueClassName="text-emerald-600 dark:text-emerald-400"
                          subtext={tr('Tính các kỹ năng tăng từ 2 điểm phần trăm')}
                        />
                        <StatTile
                          label={tr('Tiến bộ nhiều nhất')}
                          value={
                            comparison.mostImprovedSkill
                              ? formatSkillLabel(comparison.mostImprovedSkill, tr)
                              : tr('Chưa ghi nhận')
                          }
                          valueClassName="text-base text-emerald-600 dark:text-emerald-400"
                          subtext={
                            comparison.mostImprovedDeltaPercent != null
                              ? formatPercentagePointDelta(comparison.mostImprovedDeltaPercent, tr)
                              : undefined
                          }
                        />
                        <StatTile
                          label={tr('Kỹ năng cần ưu tiên củng cố')}
                          value={
                            comparison.priorityFocusSkill
                              ? formatSkillLabel(comparison.priorityFocusSkill, tr)
                              : tr('Đạt ngưỡng ổn định')
                          }
                          valueClassName={cx('text-base', comparison.priorityFocusSkill ? 'text-amber-600 dark:text-amber-400' : 'text-rp-text-2')}
                        />
                      </dl>

                      {/* Dual-Layer Overlay Radar Left | Detailed Comparison Table Right */}
                      <div className="grid items-stretch gap-4 lg:grid-cols-12">
                        <div className="min-w-0 lg:col-span-6">
                          <CompetencyRadarChart
                            axes={comparisonRadarConfig.axes}
                            series={comparisonRadarConfig.series}
                            interactiveLegend
                            scopeNote={tr('Nhấn vào chú giải Đầu vào hoặc Hiện tại để bật/tắt từng lớp dữ liệu đối chiếu.')}
                            ariaLabel={tr('Biểu đồ Radar so sánh năng lực đầu vào và hiện tại')}
                          />
                        </div>

                        <div className="min-w-0 lg:col-span-6 flex flex-col">
                          <div className="flex-1 overflow-x-auto rounded-rp-card border border-rp-line bg-rp-surface">
                            <table className="w-full min-w-[380px] border-collapse text-left text-xs sm:text-[13px]">
                              <thead className="bg-rp-bg-2/70 text-rp-text-2">
                                <tr className="border-b border-rp-line">
                                  <th className="px-3.5 py-2.5 font-semibold">{tr('Kỹ năng')}</th>
                                  <th className="px-3 py-2.5 text-right font-semibold">{tr('Đầu vào')}</th>
                                  <th className="px-3 py-2.5 text-right font-semibold">{tr('Hiện tại')}</th>
                                  <th className="px-3.5 py-2.5 text-right font-semibold">{tr('Chênh lệch')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-rp-line/80">
                                {comparisonRadarConfig.rows.map((row) => {
                                  const dm = deltaPresentation(row.deltaPercent);
                                  const DeltaIcon = dm.Icon;
                                  return (
                                    <tr key={row.skillCode} className="hover:bg-rp-bg-2/35">
                                      <td className="whitespace-nowrap px-3.5 py-2.5 font-semibold text-rp-text">
                                        {formatSkillLabel(row.skillLabel || row.skillCode, tr)}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums text-blue-600 dark:text-blue-400">
                                        {formatPercent(row.baselineScorePercent)}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                        {formatPercent(row.currentScorePercent)}
                                      </td>
                                      <td className={cx('whitespace-nowrap px-3.5 py-2.5 text-right font-bold tabular-nums', dm.colorClass)}>
                                        <span className="inline-flex items-center justify-end gap-1">
                                          <DeltaIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                          <span>{formatPercentagePointDelta(row.deltaPercent, tr)}</span>
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}

                                {(comparison.unmatchedSkills || []).map((gap) => (
                                  <tr key={`gap-${gap.skillCode}`} className="bg-rp-bg-2/25">
                                    <td className="whitespace-nowrap px-3.5 py-2.5 font-medium text-rp-text-2">
                                      {formatSkillLabel(gap.skillLabel || gap.skillCode, tr)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-rp-text-muted">
                                      {gap.baselineScorePercent != null ? formatPercent(gap.baselineScorePercent) : '—'}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-rp-text-muted">
                                      {gap.currentScorePercent != null ? formatPercent(gap.currentScorePercent) : '—'}
                                    </td>
                                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right">
                                      <Badge tone="neutral" size="sm" icon={false}>
                                        {tr(gap.reason || 'Chưa đủ dữ liệu')}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Longitudinal Multi-Assessment Evolution Line Chart */}
                    <CompetencyTrendChart
                      points={comparison.trendPoints || []}
                      color="#2563EB"
                      title={tr('Xu hướng phát triển qua các mốc đánh giá tương thích')}
                      subtitle={comparison.assessmentScale || tr('Theo dõi kết quả thực tế qua từng bài kiểm tra chuẩn JLPT cùng cấp độ.')}
                      emptyText={tr('Cần tối thiểu 2 lần đánh giá chuẩn JLPT cùng cấp độ để hiển thị biểu đồ xu hướng phát triển.')}
                    />

                    {/* Factual Insights & Teaching Guidance */}
                    <Card className="space-y-3 p-4 sm:p-5">
                      <h2 className="text-sm font-bold text-rp-text">{tr('Nhận xét và định hướng học tập')}</h2>
                      <div className="grid gap-3 text-xs md:grid-cols-2">
                        <div className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2/40 p-3.5">
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{tr('Điểm mạnh hiện tại')}</span>
                          </div>
                          <p className="text-rp-text-2">
                            {comparison.currentStrengths?.length > 0
                              ? comparison.currentStrengths.map((s) => formatSkillLabel(s, tr)).join(', ')
                              : tr('Chưa có kỹ năng đạt ngưỡng từ 80% ở lần đối chiếu hiện tại.')}
                          </p>
                          <div className="flex items-center gap-1.5 pt-1 font-semibold text-blue-700 dark:text-blue-300">
                            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{tr('Kỹ năng cải thiện rõ rệt')}</span>
                          </div>
                          <p className="text-rp-text-2">
                            {comparison.improvedSkills?.length > 0
                              ? comparison.improvedSkills.map((s) => formatSkillLabel(s, tr)).join(', ')
                              : tr('Chưa ghi nhận kỹ năng tăng rõ rệt ở lần đối chiếu này.')}
                          </p>
                        </div>

                        <div className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2/40 p-3.5">
                          <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                            <Target className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{tr('Kỹ năng cần ưu tiên')}</span>
                          </div>
                          <p className="text-rp-text-2">
                            {comparison.focusSkills?.length > 0
                              ? comparison.focusSkills.map((s) => formatSkillLabel(s, tr)).join(', ')
                              : tr('Các kỹ năng đã đánh giá đang duy trì ổn định.')}
                          </p>

                          {comparison.nextRecommendations?.length > 0 && (
                            <>
                              <div className="flex items-center gap-1.5 pt-1 font-semibold text-rp-text">
                                <Compass className="h-4 w-4 shrink-0 text-rp-brand-strong" aria-hidden="true" />
                                <span>{tr('Định hướng học tập tiếp theo')}</span>
                              </div>
                              <ul className="list-disc space-y-1 pl-4 text-rp-text-2">
                                {comparison.nextRecommendations.map((rec, i) => (
                                  <li key={i}>{tr(rec)}</li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      </div>

                      {recentMentorFeedbacks.length > 0 && (
                        <div className="space-y-2 border-t border-rp-line/70 pt-3">
                          <p className="text-xs font-semibold text-rp-text">{tr('Nhận xét của Giáo viên tại lớp')}</p>
                          <div className="grid gap-2 md:grid-cols-3">
                            {recentMentorFeedbacks.map((fb) => (
                              <div key={fb.id} className="rounded-xl border border-rp-line bg-rp-surface p-3 text-xs">
                                <p className="font-semibold text-rp-text">{fb.title}</p>
                                <p className="mt-1 line-clamp-3 text-rp-text-2">{fb.mentorFeedback}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  </>
                )}
              </section>
            )}
          </>
        ) : null}
      </PageContainer>
    </MentorShell>
  );
}
