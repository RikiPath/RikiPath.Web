import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, CheckCircle2, ChevronDown, Play, RotateCcw, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '@/app/auth/authContext.js';
import { errorMessage as formatApiError } from '@/api/apiErrors.js';
import {
  cancelLearningPathPreview,
  completeLearningPathDay,
  confirmLearningPathPreview,
  getLatestLearningPath,
  proposeLearningPath,
  startLearningPathDay,
} from '@/features/learning-path/api/learningPathApi.js';
import HorizontalAiRoadmapTree from '@/features/learning-path/components/HorizontalAiRoadmapTree.jsx';
import { getStudyStreak } from '@/features/progress/api/analyticsApi.js';
import { WebClayIcon } from '@/features/learner-ui';
import {
  AchievementCard,
  Badge,
  Banner,
  Button,
  Card,
  CelebrationScene,
  CompletionSummary,
  HaruMascot,
  SakuraLoader,
  notify,
  resolveLessonCelebrationTier,
  shouldPlayCelebration,
  Collapsible,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

function isPlanOrQuotaError(error) {
  const code = error?.data?.errorCode || error?.errorCode || '';
  return (
    error?.status === 403 ||
    ['AI_CREDIT_REQUIRED', 'SELF_STUDY_PACKAGE_REQUIRED', 'LEARNING_PATH_PACKAGE_REQUIRED', 'SUBSCRIPTION_REQUIRED'].includes(code)
  );
}

function isPlacementRequiredError(error) {
  const code = error?.data?.errorCode || error?.errorCode || '';
  return ['PLACEMENT_REQUIRED', 'STANDARD_ROADMAP_PLACEMENT_REQUIRED', 'PLACEMENT_TEST_REQUIRED'].includes(code);
}

export default function AiLearningPathPanel({ targetLevelLabel }) {
  const { tr, trf } = useLocale();
  const { isAuthenticated, isLearner, session, user } = useAuth();
  const userId = user?.userId;
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [previewPath, setPreviewPath] = useState(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [dayCelebration, setDayCelebration] = useState(null);
  const autoTriggeredRef = useRef(false);

  const enabled = isAuthenticated && isLearner && !session?.isPreview;

  const latestQuery = useQuery({
    queryKey: ['ai-learning-path', userId],
    queryFn: async () => {
      try {
        return await getLatestLearningPath();
      } catch (err) {
        if (err?.status === 404) return null;
        throw err;
      }
    },
    enabled,
    retry: false,
  });

  const streakQuery = useQuery({
    queryKey: ['learner', 'study-streak'],
    queryFn: getStudyStreak,
    enabled,
    retry: false,
  });

  const proposeMutation = useMutation({
    mutationFn: () => proposeLearningPath({}),
    onSuccess: (res) => {
      if (res?.preview) {
        setPreviewPath(res.preview);
        notify.info(tr('Đã tạo bản xem trước lộ trình AI mới.'), tr('Bạn có thể xem chi tiết trước khi áp dụng.'), {
          key: 'ai-path-propose',
        });
      } else if (res?.active) {
        setPreviewPath(null);
        queryClient.setQueryData(['ai-learning-path', userId], res.active);
        notify.success(tr('Lộ trình cá nhân hóa AI đã sẵn sàng!'), '', { key: 'ai-path-propose' });
      }
      void queryClient.invalidateQueries({ queryKey: ['study-subscription'] });
    },
    onError: (err) => {
      notify.apiError(err, tr('Chưa tạo được lộ trình học AI'), { key: 'ai-path-propose' });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (pathId) => confirmLearningPathPreview(pathId),
    onSuccess: (confirmed) => {
      setPreviewPath(null);
      queryClient.setQueryData(['ai-learning-path', userId], confirmed);
      notify.success(tr('Đã áp dụng lộ trình học mới!'), '', { key: 'ai-path-confirm' });
    },
    onError: (err) => notify.apiError(err, tr('Chưa áp dụng được lộ trình mới'), { key: 'ai-path-confirm' }),
  });

  const cancelPreviewMutation = useMutation({
    mutationFn: (previewId) => cancelLearningPathPreview(previewId),
    onSuccess: () => {
      setPreviewPath(null);
      notify.info(tr('Đã giữ nguyên lộ trình hiện tại.'), '', { key: 'ai-path-cancel' });
    },
    onError: (err) => notify.apiError(err, tr('Không hủy được bản xem trước'), { key: 'ai-path-cancel' }),
  });

  const startDayMutation = useMutation({
    mutationFn: (day) => startLearningPathDay(day),
    onSuccess: (updated) => {
      if (updated?.pathId) {
        queryClient.setQueryData(['ai-learning-path', userId], updated);
      } else {
        void latestQuery.refetch();
      }
    },
    onError: (err) => notify.apiError(err, tr('Chưa bắt đầu được chặng học'), { key: 'ai-day-start' }),
  });

  const completeDayMutation = useMutation({
    mutationFn: (day) => completeLearningPathDay(day),
    onSuccess: (updated, day) => {
      const nextPath = updated?.pathId ? updated : latestQuery.data;
      if (updated?.pathId) {
        queryClient.setQueryData(['ai-learning-path', userId], updated);
      } else {
        void latestQuery.refetch();
      }
      void queryClient.invalidateQueries({ queryKey: ['learner', 'study-streak'] });

      const schedules = nextPath?.dailySchedules || [];
      const phases = nextPath?.phases || [];
      const completedCount = schedules.filter((d) => d.isCompleted).length || day;
      const totalCount = schedules.length || nextPath?.totalStudyDays || 0;
      const finishedPhase = phases.find((p) => Number(p.endDay) === Number(day));
      const tier = resolveLessonCelebrationTier({
        completedLessons: completedCount,
        totalLessons: totalCount,
        stageCompleted: Boolean(finishedPhase),
      });

      setDayCelebration({
        tier,
        day,
        phaseTitle: finishedPhase?.title || null,
        completedCount,
        totalCount,
      });
    },
    onError: (err) => notify.apiError(err, tr('Chưa ghi nhận hoàn thành ngày học'), { key: 'ai-day-complete' }),
  });

  const triggerGenerate = searchParams.get('generateAi') === '1';
  useEffect(() => {
    if (!enabled || !triggerGenerate || autoTriggeredRef.current || proposeMutation.isPending) return;
    autoTriggeredRef.current = true;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('generateAi');
    setSearchParams(nextParams, { replace: true });
    proposeMutation.mutate();
  }, [enabled, triggerGenerate, searchParams, setSearchParams, proposeMutation]);

  if (!enabled) return null;

  const activePath = latestQuery.data;
  const displayedPath = previewPath || (activePath?.status?.toUpperCase() === 'DRAFT' ? activePath : activePath);
  const isDraftPreview = Boolean(previewPath || displayedPath?.status?.toUpperCase() === 'DRAFT');
  const isGenerating = proposeMutation.isPending;

  if (latestQuery.isPending && !displayedPath && !isGenerating) {
    return (
      <Card id="ai-roadmap-panel" className="mb-5">
        <SakuraLoader variant="section" context="roadmap" label={tr('Đang kiểm tra lộ trình AI của bạn')} delay={160} />
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card id="ai-roadmap-panel" className="mb-5 border-rp-line bg-white">
        <div className="flex flex-col items-center gap-4 py-4 text-center sm:flex-row sm:text-left">
          <HaruMascot pose="studying" size={112} className="shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Badge tone="brand" icon={Sparkles} size="sm">
              {tr('Lộ trình cá nhân hóa AI')}
            </Badge>
            <h2 className="text-lg font-bold text-rp-text">
              {tr('RikiPath đang chuẩn bị lộ trình dành riêng cho bạn…')}
            </h2>
            <p className="text-sm leading-6 text-rp-text-2">
              {tr('Hệ thống đang phân tích kết quả đánh giá và sắp xếp chặng học theo mục tiêu và quỹ thời gian thực tế của bạn.')}
            </p>
            <SakuraLoader variant="inline" size={18} context="roadmap" className="pt-1" />
          </div>
        </div>
      </Card>
    );
  }

  const proposeError = proposeMutation.error;
  if (proposeError) {
    const quotaIssue = isPlanOrQuotaError(proposeError);
    const placementIssue = isPlacementRequiredError(proposeError);
    return (
      <Card id="ai-roadmap-panel" className="mb-5 space-y-4">
        <Banner
          tone="danger"
          title={tr('Chưa tạo được lộ trình học AI')}
          actions={(
            <div className="flex flex-wrap gap-2">
              {quotaIssue && (
                <Button as={Link} to="/plans/" variant="primary" size="sm">
                  {tr('Mua gói ngay')}
                </Button>
              )}
              {placementIssue && (
                <Button as={Link} to="/app/placement-test/" variant="primary" size="sm">
                  {tr('Làm bài đánh giá năng lực')}
                </Button>
              )}
              {!quotaIssue && !placementIssue && (
                <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => proposeMutation.mutate()}>
                  {tr('Thử lại')}
                </Button>
              )}
            </div>
          )}
        >
          {formatApiError(proposeError, tr('Vui lòng kiểm tra lại bài đánh giá hoặc thử lại sau ít phút.'))}
        </Banner>
      </Card>
    );
  }

  if (!displayedPath) {
    return (
      <Card id="ai-roadmap-panel" className="mb-5 border-rp-line bg-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <Badge tone="brand" icon={Sparkles} size="sm">
              {tr('Lộ trình cá nhân hóa AI')}
            </Badge>
            <h2 className="text-base font-bold text-rp-text">
              {tr('Xây dựng lộ trình học riêng từ kết quả đánh giá của bạn')}
            </h2>
            <p className="text-sm text-rp-text-2">
              {tr('Chia thành từng chặng học và lịch ôn theo ngày phù hợp với mục tiêu JLPT hiện tại.')}
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={Sparkles}
            iconRight={ArrowRight}
            onClick={() => proposeMutation.mutate()}
            className="rp-celebrate-cta-glow shrink-0"
          >
            {tr('Tạo lộ trình học của tôi với AI')}
          </Button>
        </div>
      </Card>
    );
  }

  const phases = Array.isArray(displayedPath.phases) ? displayedPath.phases : [];
  const schedules = Array.isArray(displayedPath.dailySchedules) ? displayedPath.dailySchedules : [];
  const completedDays = schedules.filter((d) => d.isCompleted).length;
  const totalDays = schedules.length || displayedPath.totalStudyDays || 0;
  const nextDay = schedules.find((d) => !d.isCompleted && (d.canStart || d.isStarted)) || schedules[0];
  const pathKey = displayedPath.pathId ? `ai-path-${displayedPath.pathId}` : undefined;
  const playPathReveal = pathKey ? shouldPlayCelebration(pathKey) : false;

  const handleStartFirstStage = () => {
    if (!nextDay) {
      document.getElementById('self-study-roadmap-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!nextDay.isStarted && !isDraftPreview) {
      startDayMutation.mutate(nextDay.day);
    }
    document.getElementById(`ai-day-${nextDay.day}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  return (
    <div id="ai-roadmap-panel" className="mb-5 space-y-4">
      {/* Compact supporting summary strip — keeps stats supportive so the horizontal branch tree leads */}
      <Card className="border-rp-brand-border/80 bg-rp-brand-tint/55 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <WebClayIcon name="roadmap" size="lg" tone="sakura" hover className="-my-1 hidden sm:inline-flex" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand" icon={Sparkles} size="sm">
                  {isDraftPreview ? tr('Đề xuất lộ trình AI mới') : tr('Lộ trình cá nhân hóa AI')}
                </Badge>
                {targetLevelLabel && (
                  <Badge tone="neutral" size="sm" icon={false}>
                    JLPT {targetLevelLabel}
                  </Badge>
                )}
                {displayedPath.dailyStudyMinutes > 0 && (
                  <Badge tone="neutral" icon={CalendarDays} size="sm">
                    {trf('{0} phút / ngày', { 0: displayedPath.dailyStudyMinutes })}
                  </Badge>
                )}
              </div>
              <h2 className="text-lg font-extrabold text-rp-navy sm:text-xl">
                {isDraftPreview
                  ? tr('Lộ trình đề xuất mới đã sẵn sàng để xem trước')
                  : tr('Lộ trình học của bạn đã sẵn sàng!')}
              </h2>
              <p className="max-w-3xl text-xs leading-5 text-rp-text-2 sm:text-sm sm:leading-6">
                {displayedPath.summary || tr('RikiPath đã sắp xếp các chặng học theo đúng năng lực và quỹ thời gian của bạn.')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDraftPreview ? (
              <>
                <Button
                  variant="primary"
                  size="md"
                  loading={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate(displayedPath.pathId)}
                >
                  {tr('Áp dụng lộ trình này')}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  loading={cancelPreviewMutation.isPending}
                  onClick={() => cancelPreviewMutation.mutate(displayedPath.pathId)}
                >
                  {tr('Giữ lộ trình hiện tại')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="md"
                  icon={Play}
                  iconRight={ArrowRight}
                  className={playPathReveal ? 'rp-celebrate-cta-glow' : ''}
                  loading={startDayMutation.isPending}
                  onClick={handleStartFirstStage}
                >
                  {tr('Bắt đầu học ngay')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Sparkles}
                  onClick={() => proposeMutation.mutate()}
                >
                  {tr('Cập nhật lộ trình AI')}
                </Button>
              </>
            )}
            <button
              type="button"
              aria-expanded={insightsOpen}
              aria-controls="ai-path-insights"
              onClick={() => setInsightsOpen((v) => !v)}
              className="rp-focus rp-press inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-rp-line bg-white px-3 text-xs font-semibold text-rp-text-2 hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong"
            >
              {insightsOpen ? tr('Ẩn phân tích AI') : tr('Xem phân tích AI')}
              <ChevronDown aria-hidden="true" className="rp-disclosure-chevron h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <Collapsible open={insightsOpen} id="ai-path-insights">
          <div className="mt-4 space-y-3 border-t border-rp-line pt-4">
            <CompletionSummary
              completedCount={completedDays}
              totalCount={totalDays}
              streakDays={Number(streakQuery.data?.currentStreakDays) || 0}
              levelLabel={targetLevelLabel ? `JLPT ${targetLevelLabel}` : undefined}
              summaryText={displayedPath.feasibility}
              className="bg-white"
            />

            {(displayedPath.strengths?.length > 0 || displayedPath.weaknesses?.length > 0) && (
              <div className="grid gap-3 md:grid-cols-2">
                {displayedPath.strengths?.length > 0 && (
                  <AchievementCard
                    tone="success"
                    icon={CheckCircle2}
                    label={tr('Điểm mạnh hiện tại')}
                    detail={displayedPath.strengths.join(' · ')}
                  />
                )}
                {displayedPath.weaknesses?.length > 0 && (
                  <AchievementCard
                    tone="brand"
                    icon={TrendingUp}
                    label={tr('Ưu tiên cải thiện')}
                    detail={displayedPath.weaknesses.join(' · ')}
                  />
                )}
              </div>
            )}
          </div>
        </Collapsible>
      </Card>

      {/* CENTRAL HORIZONTAL BRANCHING ROADMAP TREE */}
      {(phases.length > 0 || schedules.length > 0) && (
        <HorizontalAiRoadmapTree
          path={displayedPath}
          targetLevelLabel={targetLevelLabel}
          isDraftPreview={isDraftPreview}
          animate={playPathReveal}
          onStartDay={(day) => startDayMutation.mutate(day)}
          onCompleteDay={(day) => completeDayMutation.mutate(day)}
          startDayMutation={startDayMutation}
          completeDayMutation={completeDayMutation}
        />
      )}

      <CelebrationScene
        open={Boolean(dayCelebration)}
        variant={dayCelebration?.tier === 'milestone' ? 'fullscreen' : 'overlay'}
        tier={dayCelebration?.tier || 'lesson'}
        badge={
          dayCelebration?.tier === 'milestone'
            ? tr('Hoàn thành lộ trình')
            : dayCelebration?.tier === 'stage'
              ? tr('Hoàn thành chặng học')
              : tr('Hoàn thành ngày học')
        }
        title={
          dayCelebration?.tier === 'milestone'
            ? tr('Bạn đã hoàn thành toàn bộ lộ trình học!')
            : dayCelebration?.tier === 'stage'
              ? tr('Một chặng đường nữa đã hoàn thành!')
              : tr('Bạn làm tốt lắm! Thêm một bước tiến rồi!')
        }
        description={
          dayCelebration?.phaseTitle
            ? trf('Bạn đã khép lại chặng “{0}”. Sẵn sàng cho chặng tiếp theo!', { 0: dayCelebration.phaseTitle })
            : tr('Tiến độ của bạn đã được ghi nhận.')
        }
        onClose={() => setDayCelebration(null)}
        actions={(
          <Button variant="primary" size="md" onClick={() => setDayCelebration(null)}>
            {tr('Tiếp tục hành trình')}
          </Button>
        )}
      >
        {dayCelebration && (
          <CompletionSummary
            completedCount={dayCelebration.completedCount}
            totalCount={dayCelebration.totalCount}
            streakDays={Number(streakQuery.data?.currentStreakDays) || 0}
            levelLabel={targetLevelLabel ? `JLPT ${targetLevelLabel}` : undefined}
          />
        )}
      </CelebrationScene>
    </div>
  );
}
