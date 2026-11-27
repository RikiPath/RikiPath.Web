import { useLocale } from '@/locales/locale.js';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LockKeyhole } from 'lucide-react';

import { LearnerShell } from '@/layouts';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import { LearningPathUnlockGuide } from '@/features/learning-path/components/LearningPathUnlockGuide.jsx';
import { LockedAiRoadmapCard, RoadmapSetupState } from '@/features/learning-path/components/RoadmapSetupState.jsx';
import { proposeLearningPath } from '@/features/learning-path/api/learningPathApi.js';
import { setRoadmapMode } from '@/features/profile/api/profileApi.js';
import { normalizeRoadmapMode } from '@/features/learning-path/adaptiveRoadmapModel.js';
import { buildAiRoadmapTree } from '@/features/learning-path/roadmapTreeModel.js';
import { invalidateLearnerSetupQueries, useLearningPathAccess } from '@/features/learning-path/useLearningPathAccess.js';
import { useLearnerProfile } from '@/features/dashboard/hooks/useLearnerHome.js';
import { IllustratedPageHeader } from '@/features/learner-ui';
import { toAiJourneyStageView } from '@/features/learning-journey/journeyModel.js';
import JourneyMap from '@/features/learning-journey/components/JourneyMap.jsx';
import AiLearningPathPanel from './AiLearningPathPanel.jsx';
import StandardAssessmentRoadmap from './StandardAssessmentRoadmap.jsx';
import { Badge, Card, ContextualErrorState, SakuraLoader, StaleDataBar, Tabs, notify } from '@/components/ui';
import Icon from '@/components/ui/Icon.jsx';

function scrollToAiBranch(branchId) {
  const target = (branchId && document.querySelector(`[data-branch-id="${branchId}"]`))
    || document.getElementById('ai-roadmap-panel');
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** AI personalised path shown on the same Journey Map; day-by-day actions stay in the AI panel below. */
function AiJourney({ latestPath, targetLevel }) {
  const { tr, trf } = useLocale();
  const tree = buildAiRoadmapTree(latestPath, { targetLevelLabel: targetLevel });
  if (tree.branches.length === 0) return null;
  return (
    <section aria-labelledby="ai-journey-map-title" className="mb-5 rounded-rp-card border border-rp-line bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFBFC_100%)] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="ai-journey-map-title" className="text-[16px] font-bold text-rp-text">{tr('Hành trình JLPT')}</h2>
          <p className="mt-0.5 text-[12.5px] text-rp-text-muted">{tr('Chọn một chặng để xem lịch học theo ngày bên dưới.')}</p>
        </div>
        {tree.stats.totalDays > 0 && (
          <Badge tone="brand" size="sm" icon={false}>
            {trf('{0}/{1} ngày hoàn thành', { 0: tree.stats.completedDays, 1: tree.stats.totalDays })}
          </Badge>
        )}
      </div>
      <JourneyMap
        stages={tree.branches.map((branch) => toAiJourneyStageView(branch, {
          levelCode: targetLevel,
          onSelect: () => scrollToAiBranch(branch.id),
        }))}
        currentKey={tree.activeBranchId}
        goalLabel={targetLevel ? trf('Mục tiêu JLPT {0}', { 0: targetLevel }) : null}
        goalReached={tree.goal.isCompleted}
      />
    </section>
  );
}

export default function RoadmapJLPT() {
  const { trf, tr } = useLocale();
  const location = useLocation();
  const { pathname } = location;
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: profile, isError: profileError, isFetching: profileFetching, refetch: retryProfile } = useLearnerProfile();
  const roadmapAccess = useLearningPathAccess();
  const studyAccess = useStudyAccess();
  const preferredLevel = profile?.targetJlptLevelName || roadmapAccess.setupState?.targetJlptLevelName || null;
  const [selectedMode, setSelectedMode] = useState(null);
  const autoTriggeredRef = useRef(false);
  const triggerGenerate = searchParams.get('generateAi') === '1';

  const setupPending = roadmapAccess.enabled && roadmapAccess.isPending && !profile;
  const setupError = roadmapAccess.enabled && roadmapAccess.isError && !profile;
  const hasConfirmedGoal = roadmapAccess.hasConfirmedGoal;
  const standardEligible = roadmapAccess.standardRoadmapEligible;
  const aiEligible = roadmapAccess.aiRoadmapEligible;
  const setupIncomplete = !hasConfirmedGoal || !standardEligible || !roadmapAccess.hasInitializedRoadmap;

  const defaultMode = aiEligible
    ? (triggerGenerate ? 'AI_PERSONALIZED' : normalizeRoadmapMode(profile?.learningMode))
    : 'STANDARD';
  const activeMode = selectedMode ?? defaultMode;

  const modeMutation = useMutation({
    mutationFn: (nextMode) => setRoadmapMode(nextMode),
    onSuccess: async (updatedProfile, nextMode) => {
      setSelectedMode(nextMode);
      if (updatedProfile) {
        notify.success(
          nextMode === 'AI_PERSONALIZED'
            ? tr('Đã chuyển sang Lộ trình cá nhân hóa AI')
            : tr('Đã chuyển sang Lộ trình hệ thống đề xuất'),
          '',
          { key: 'roadmap-mode-switch', replace: true },
        );
      }
      await Promise.allSettled([invalidateLearnerSetupQueries(queryClient)]);
    },
    onError: (err) => {
      setSelectedMode(null);
      notify.apiError(err, tr('Không thể chuyển chế độ lộ trình'), { key: 'roadmap-mode-switch' });
    },
  });

  function handleModeChange(nextMode) {
    const normalized = normalizeRoadmapMode(nextMode);
    if (normalized === 'AI_PERSONALIZED' && !aiEligible) {
      // State C: allow viewing the locked AI explanation tab without mutating server mode or generating AI.
      setSelectedMode('AI_PERSONALIZED');
      return;
    }
    setSelectedMode(normalized);
    if (profile && !modeMutation.isPending) {
      modeMutation.mutate(normalized);
    }
  }

  async function handleActivateStandard() {
    try {
      await roadmapAccess.activateStandardRoadmap();
      setSelectedMode('STANDARD');
      notify.success(
        tr('Lộ trình tiêu chuẩn đã sẵn sàng!'),
        '',
        { key: 'roadmap-activate-standard' },
      );
    } catch (err) {
      notify.apiError(err, tr('Chưa tạo được lộ trình. Vui lòng thử lại.'), { key: 'roadmap-activate-standard' });
    }
  }

  const generateMutation = useMutation({
    mutationFn: () => proposeLearningPath({}),
    onSuccess: async (res) => {
      const nextActive = res?.active || res?.preview;
      if (nextActive) {
        roadmapAccess.setLatestPath(nextActive);
      }
      setSelectedMode('AI_PERSONALIZED');
      notify.success(tr('Lộ trình cá nhân hóa AI đã sẵn sàng!'), '', { key: 'ai-path-propose', replace: true });
      await Promise.allSettled([
        invalidateLearnerSetupQueries(queryClient),
        queryClient.invalidateQueries({ queryKey: ['study-subscription'] }),
      ]);
    },
    onError: (err) => {
      notify.apiError(err, tr('Chưa tạo được lộ trình học AI'), { key: 'ai-path-propose' });
    },
  });

  useEffect(() => {
    if (
      !triggerGenerate ||
      !roadmapAccess.enabled ||
      roadmapAccess.isPending ||
      autoTriggeredRef.current ||
      generateMutation.isPending
    ) {
      return;
    }
    // Always strip the query param so reloads don't re-trigger; only call AI generation when eligible.
    autoTriggeredRef.current = true;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('generateAi');
    setSearchParams(nextParams, { replace: true });

    if (aiEligible && !roadmapAccess.hasActiveAiPath) {
      generateMutation.mutate();
    }
  }, [
    triggerGenerate,
    roadmapAccess.enabled,
    roadmapAccess.isPending,
    roadmapAccess.hasActiveAiPath,
    aiEligible,
    searchParams,
    setSearchParams,
    generateMutation,
  ]);

  useEffect(() => {
    if (!roadmapAccess.hasActiveAiPath) return;
    if (location.hash === '#self-study-roadmap-title' || location.hash === '#ai-roadmap-title' || location.hash === '#ai-roadmap-panel') {
      document.getElementById('ai-roadmap-panel')?.scrollIntoView({ block: 'start' });
    }
  }, [location.hash, roadmapAccess.hasActiveAiPath]);

  const aiUsesRemaining = studyAccess?.data?.learningPathUsesRemaining;

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Lộ trình của tôi')}>
      <main
        data-page="RoadmapJLPT"
        data-setup-stage={roadmapAccess.setupStage}
        className="rp-container rp-cq py-[var(--rp-space-page-y)] text-rp-text"
      >
        {setupPending ? (
          <Card className="p-6">
            <SakuraLoader variant="section" context="roadmap" label={tr('Đang kiểm tra trạng thái lộ trình của bạn')} delay={120} />
          </Card>
        ) : setupError ? (
          <Card className="p-6">
            <ContextualErrorState
              compact
              error={roadmapAccess.error}
              title={tr('Chưa kiểm tra được trạng thái lộ trình')}
              onRetry={() => roadmapAccess.refetch()}
              retrying={roadmapAccess.isFetching}
            />
          </Card>
        ) : setupIncomplete ? (
          <>
            <IllustratedPageHeader
              icon="roadmap"
              tone="sakura"
              compact
              className="mb-4"
              eyebrow={tr('Lộ trình JLPT')}
              title={tr('Lộ trình học của tôi')}
              description={
                hasConfirmedGoal
                  ? tr('Hoàn tất đánh giá năng lực hoặc chọn lộ trình tiêu chuẩn để bắt đầu học.')
                  : tr('Đặt mục tiêu và đánh giá năng lực để nhận lộ trình học phù hợp với bạn.')
              }
              badges={
                hasConfirmedGoal && preferredLevel ? (
                  <Badge tone="brand" size="sm" icon={false}>
                    {trf('Mục tiêu JLPT {0}', { 0: preferredLevel })}
                  </Badge>
                ) : null
              }
              actions={
                hasConfirmedGoal ? (
                  <Link
                    to="/onboarding"
                    className="rp-focus rp-press inline-flex h-10 items-center gap-2 rounded-xl border border-rp-line bg-white px-4 text-sm font-semibold text-rp-brand-strong shadow-rp-xs hover:border-rp-brand-border hover:bg-rp-brand-tint"
                  >
                    <Icon name="flag" className="text-[18px]" />
                    {tr('Đổi mục tiêu')}
                  </Link>
                ) : null
              }
            />

            <RoadmapSetupState
              variant="page"
              flow={roadmapAccess}
              targetLevelName={preferredLevel}
              onActivateStandard={standardEligible ? handleActivateStandard : undefined}
              activatingStandard={roadmapAccess.activatingStandardRoadmap}
              activateStandardError={roadmapAccess.activateStandardError}
              onGenerateAi={aiEligible ? () => generateMutation.mutate() : undefined}
              generatingAi={generateMutation.isPending}
            />
          </>
        ) : (
          <>
            <IllustratedPageHeader
              icon="roadmap"
              tone="sakura"
              compact
              className="mb-4"
              eyebrow={tr('Lộ trình JLPT')}
              title={tr('Lộ trình học của tôi')}
              description={tr('Biết mình đang ở chặng nào, đã hoàn thành bao nhiêu và nên học gì tiếp theo.')}
              badges={
                <>
                  {preferredLevel && (
                    <Badge tone="brand" size="sm" icon={false}>
                      {trf('Mục tiêu JLPT {0}', { 0: preferredLevel })}
                    </Badge>
                  )}
                  <Badge tone="neutral" size="sm" icon={false}>
                    {activeMode === 'AI_PERSONALIZED' ? tr('Lộ trình cá nhân hóa AI') : tr('Lộ trình hệ thống đề xuất')}
                  </Badge>
                  {aiEligible && activeMode === 'AI_PERSONALIZED' && Number.isFinite(Number(aiUsesRemaining)) && (
                    <Badge tone={aiUsesRemaining > 0 ? 'success' : 'warning'} size="sm" icon={false}>
                      {trf('Lượt tạo lộ trình AI: {0}', { 0: aiUsesRemaining })}
                    </Badge>
                  )}
                </>
              }
              actions={
                <Link
                  to="/onboarding"
                  className="rp-focus rp-press inline-flex h-10 items-center gap-2 rounded-xl border border-rp-line bg-white px-4 text-sm font-semibold text-rp-brand-strong shadow-rp-xs hover:border-rp-brand-border hover:bg-rp-brand-tint"
                >
                  <Icon name="flag" className="text-[18px]" />
                  {tr('Đổi mục tiêu')}
                </Link>
              }
            />

            {profileError && (
              <StaleDataBar
                className="mb-4"
                label={tr('Chưa tải được mục tiêu JLPT cá nhân — đang hiển thị lộ trình tham khảo.')}
                onRetry={() => retryProfile()}
                retrying={profileFetching}
              />
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Tabs
                variant="pill"
                size="md"
                label={tr('Chế độ lộ trình')}
                value={activeMode}
                onChange={handleModeChange}
                tabs={[
                  { value: 'STANDARD', label: tr('Lộ trình hệ thống đề xuất') },
                  {
                    value: 'AI_PERSONALIZED',
                    label: tr('Lộ trình cá nhân hóa AI'),
                    icon: !aiEligible ? LockKeyhole : undefined,
                  },
                ]}
              />
              {modeMutation.isPending && (
                <span className="text-xs text-rp-text-muted">{tr('Đang lưu chế độ lộ trình…')}</span>
              )}
            </div>

            {activeMode === 'AI_PERSONALIZED' ? (
              !aiEligible ? (
                <LockedAiRoadmapCard
                  targetLevelName={preferredLevel}
                  onBackToStandard={() => setSelectedMode('STANDARD')}
                />
              ) : roadmapAccess.isPending && !generateMutation.isPending ? (
                <Card className="mb-5">
                  <SakuraLoader variant="section" context="roadmap" label={tr('Đang kiểm tra lộ trình AI của bạn')} delay={120} />
                </Card>
              ) : roadmapAccess.isError && !roadmapAccess.latestPath ? (
                <Card className="mb-5">
                  <ContextualErrorState
                    compact
                    error={roadmapAccess.error}
                    title={tr('Chưa kiểm tra được trạng thái lộ trình')}
                    onRetry={() => roadmapAccess.refetch()}
                    retrying={roadmapAccess.isFetching}
                  />
                </Card>
              ) : !roadmapAccess.hasActiveAiPath && !roadmapAccess.hasDraftAiPreview ? (
                <Card className="mb-5 p-5 sm:p-7" data-gate="ai-learning-path-required">
                  <LearningPathUnlockGuide
                    flow={roadmapAccess}
                    targetLevelName={preferredLevel}
                    latestAttemptId={roadmapAccess.placementStatus?.latestCompletedAttemptId}
                    generating={generateMutation.isPending}
                    generateError={generateMutation.error}
                    onGenerateAi={() => generateMutation.mutate()}
                    headingAs="h2"
                  />
                </Card>
              ) : (
                <>
                  {roadmapAccess.hasActiveAiPath && (
                    <AiJourney latestPath={roadmapAccess.latestPath} targetLevel={preferredLevel} />
                  )}
                  <AiLearningPathPanel targetLevelLabel={preferredLevel} />
                </>
              )
            ) : (
              <StandardAssessmentRoadmap />
            )}
          </>
        )}
      </main>
    </LearnerShell>
  );
}
