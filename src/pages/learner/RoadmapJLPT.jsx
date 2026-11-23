import { useLocale } from '@/locales/locale.js';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { LearnerShell } from '@/layouts';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import { LearningPathUnlockGuide } from '@/features/learning-path/components/LearningPathUnlockGuide.jsx';
import { proposeLearningPath } from '@/features/learning-path/api/learningPathApi.js';
import { setRoadmapMode } from '@/features/profile/api/profileApi.js';
import { normalizeRoadmapMode } from '@/features/learning-path/adaptiveRoadmapModel.js';
import { buildAiRoadmapTree } from '@/features/learning-path/roadmapTreeModel.js';
import { useLearningPathAccess } from '@/features/learning-path/useLearningPathAccess.js';
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
  const preferredLevel = profile?.targetJlptLevelName;
  const [selectedMode, setSelectedMode] = useState(null);
  const autoTriggeredRef = useRef(false);
  const triggerGenerate = searchParams.get('generateAi') === '1';
  const activeMode = selectedMode ?? (triggerGenerate
    ? 'AI_PERSONALIZED'
    : normalizeRoadmapMode(profile?.learningMode));

  const modeMutation = useMutation({
    mutationFn: (nextMode) => setRoadmapMode(nextMode),
    onSuccess: async (updatedProfile, nextMode) => {
      setSelectedMode(nextMode);
      await queryClient.invalidateQueries({ queryKey: ['learner'] });
      if (updatedProfile) {
        await queryClient.invalidateQueries({ queryKey: ['assessment-roadmap'] });
      }
      notify.success(
        nextMode === 'AI_PERSONALIZED'
          ? tr('Đã chuyển sang Lộ trình cá nhân hóa AI')
          : tr('Đã chuyển sang Lộ trình hệ thống đề xuất'),
        '',
        { key: 'roadmap-mode-switch' },
      );
    },
    onError: (err) => {
      setSelectedMode(null);
      notify.apiError(err, tr('Không thể chuyển chế độ lộ trình'), { key: 'roadmap-mode-switch' });
    },
  });

  function handleModeChange(nextMode) {
    const normalized = normalizeRoadmapMode(nextMode);
    setSelectedMode(normalized);
    if (profile && !modeMutation.isPending) {
      modeMutation.mutate(normalized);
    }
  }

  const generateMutation = useMutation({
    mutationFn: () => proposeLearningPath({}),
    onSuccess: (res) => {
      const nextActive = res?.active || res?.preview;
      if (nextActive) {
        roadmapAccess.setLatestPath(nextActive);
      } else {
        void roadmapAccess.refetch();
      }
      setSelectedMode('AI_PERSONALIZED');
      void queryClient.invalidateQueries({ queryKey: ['learner'] });
      void queryClient.invalidateQueries({ queryKey: ['study-subscription'] });
      notify.success(tr('Lộ trình cá nhân hóa AI đã sẵn sàng!'), '', { key: 'ai-path-propose' });
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
      roadmapAccess.hasActiveAiPath ||
      autoTriggeredRef.current ||
      generateMutation.isPending
    ) {
      return;
    }
    autoTriggeredRef.current = true;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('generateAi');
    setSearchParams(nextParams, { replace: true });
    generateMutation.mutate();
  }, [
    triggerGenerate,
    roadmapAccess.enabled,
    roadmapAccess.isPending,
    roadmapAccess.hasActiveAiPath,
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
        className="rp-container rp-cq py-[var(--rp-space-page-y)] text-rp-text"
      >
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
              {activeMode === 'AI_PERSONALIZED' && Number.isFinite(Number(aiUsesRemaining)) && (
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
              { value: 'AI_PERSONALIZED', label: tr('Lộ trình cá nhân hóa AI') },
            ]}
          />
          {modeMutation.isPending && (
            <span className="text-xs text-rp-text-muted">{tr('Đang lưu chế độ lộ trình…')}</span>
          )}
        </div>

        {activeMode === 'AI_PERSONALIZED' ? (
          roadmapAccess.isPending && !generateMutation.isPending ? (
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
          ) : !roadmapAccess.hasActiveAiPath ? (
            <Card className="mb-5 p-5 sm:p-7" data-gate="ai-learning-path-required">
              <LearningPathUnlockGuide
                flow={roadmapAccess}
                targetLevelName={profile?.targetJlptLevelName}
                latestAttemptId={roadmapAccess.placementStatus?.latestCompletedAttemptId}
                generating={generateMutation.isPending}
                generateError={generateMutation.error}
                onGenerateAi={() => generateMutation.mutate()}
                headingAs="h2"
              />
            </Card>
          ) : (
            <>
              <AiJourney latestPath={roadmapAccess.latestPath} targetLevel={profile?.targetJlptLevelName} />
              <AiLearningPathPanel targetLevelLabel={profile?.targetJlptLevelName} />
            </>
          )
        ) : (
          <StandardAssessmentRoadmap />
        )}

      </main>
    </LearnerShell>
  );
}
