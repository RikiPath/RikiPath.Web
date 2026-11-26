import { Link } from 'react-router-dom';
import { Banner, Button, Card, ContextualErrorState, EmptyState, ProgressBar, SakuraLoader } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { RoadmapSetupState } from '@/features/learning-path/components/RoadmapSetupState.jsx';
import { useLearningPathAccess } from '@/features/learning-path/useLearningPathAccess.js';
import { useJourneyRoadmap } from '@/features/learning-journey/useJourneyRoadmap.js';
import {
  resolveNextStep,
  stageKey,
  stageProgress,
  toJourneyStageView,
} from '@/features/learning-journey/journeyModel.js';
import JourneyMap from '@/features/learning-journey/components/JourneyMap.jsx';
import NextLearningCard from '@/features/learning-journey/components/NextLearningCard.jsx';
import SkillSummary from '@/features/learning-journey/components/SkillSummary.jsx';

/**
 * Standard (system) roadmap rendered as the Learning Journey Map — Tier 1 of the learning journey.
 * Stages, lessons, locks and recommendations all come from Adaptive Roadmap V2 (`/StandardRoadmap/adaptive`).
 */
export default function StandardAssessmentRoadmap() {
  const { tr, trf } = useLocale();
  const roadmapAccess = useLearningPathAccess();
  const journey = useJourneyRoadmap({ enabled: !roadmapAccess.isPending && roadmapAccess.standardRoadmapEligible });
  const { roadmapQuery, roadmap, overview, subscriptionQuery, requiresPlan, errorCode, isPreview } = journey;

  if (isPreview) {
    return (
      <Card aria-labelledby="self-study-roadmap-title" className="scroll-mt-6">
        <h2 id="self-study-roadmap-title" className="text-[17px] font-semibold text-rp-text">{tr('Lộ trình hệ thống đề xuất')}</h2>
        <p className="mt-2 text-sm text-rp-text-muted">{tr('Lộ trình thích ứng theo năng lực hiển thị khi đăng nhập bằng tài khoản học viên.')}</p>
      </Card>
    );
  }

  if ((roadmapAccess.isPending && roadmapAccess.enabled) || (roadmapQuery.isPending && journey.enabled)) {
    return (
      <Card>
        <SakuraLoader variant="section" context="roadmap" label={tr('Đang tải lộ trình học của bạn')} delay={160} />
      </Card>
    );
  }

  if (
    !roadmapAccess.standardRoadmapEligible ||
    errorCode === 'STANDARD_ROADMAP_PLACEMENT_REQUIRED' ||
    errorCode === 'PLACEMENT_IN_PROGRESS' ||
    errorCode === 'PLACEMENT_PENDING_SUBMISSION' ||
    errorCode === 'STUDY_LEVEL_REQUIRED'
  ) {
    return (
      <RoadmapSetupState
        variant="page"
        flow={roadmapAccess}
        targetLevelName={roadmapAccess.profile?.targetJlptLevelName}
      />
    );
  }

  if (roadmapQuery.isError) {
    return (
      <Card>
        <ContextualErrorState
          compact
          error={roadmapQuery.error}
          title={tr('Chưa tải được lộ trình học')}
          onRetry={() => roadmapQuery.refetch()}
          retrying={roadmapQuery.isFetching}
        />
      </Card>
    );
  }

  if (!roadmap) return null;

  const { stages, totalLessons, completedLessons, percent, currentStage } = overview;
  const nextStep = resolveNextStep(roadmap, overview);
  const focusStage = nextStep?.stage ?? currentStage;
  const levelPath = roadmap.currentStudyLevelName && roadmap.currentStudyLevelName !== roadmap.targetJlptLevelName
    ? `${roadmap.currentStudyLevelName} → ${roadmap.targetJlptLevelName}`
    : roadmap.targetJlptLevelName;

  return (
    <div id="self-study-roadmap-title" className="scroll-mt-6 space-y-4">
      {subscriptionQuery.isPending && (
        <SakuraLoader variant="inline" context="payment" label={tr('Đang kiểm tra quyền tự học')} delay={160} />
      )}
      {requiresPlan && (
        <Banner
          tone="warning"
          actions={(
            <>
              <Button as={Link} to="/plans/" variant="primary" size="sm">{tr('Mua gói ngay')}</Button>
              <Button variant="secondary" size="sm" loading={subscriptionQuery.isFetching} onClick={() => subscriptionQuery.refetch()}>
                {tr('Kiểm tra lại quyền')}
              </Button>
            </>
          )}
        >
          {tr('Bạn cần gói tự học đang hiệu lực để mở bài và làm bài luyện tập.')}
        </Banner>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <aside className="order-first space-y-3 lg:sticky lg:top-4 lg:order-none lg:col-start-2 lg:row-start-1">
          <section className="rounded-rp-card border border-rp-line bg-white p-4" aria-label={tr('Tiến độ tổng thể')}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[12px] font-semibold text-rp-text-muted">{tr('Tiến độ tổng thể')}</p>
              <p className="text-[20px] font-bold tabular-nums text-rp-text">{percent}%</p>
            </div>
            <ProgressBar value={completedLessons} max={totalLessons || 1} className="mt-2" label={tr('Tiến độ tổng thể')} />
            <p className="mt-2 text-[12px] text-rp-text-muted">
              {trf('{0}/{1} bài hoàn thành', { 0: completedLessons, 1: totalLessons })}
              {levelPath && ` · JLPT ${levelPath}`}
              {roadmap.dailyStudyMinutes > 0 && ` · ${trf('{0} phút/ngày', { 0: roadmap.dailyStudyMinutes })}`}
            </p>
            {roadmap.workloadAdvice && (
              <p className="mt-2 border-t border-rp-line pt-2 text-[12px] leading-5 text-rp-text-2">{tr(roadmap.workloadAdvice)}</p>
            )}
          </section>

          <NextLearningCard
            nextStep={nextStep}
            reason={roadmap.nextRecommendationReason}
            stageTitle={focusStage?.title}
            stageProgress={focusStage ? stageProgress(focusStage) : null}
            srsDueCount={roadmap.srsDueTodayCount}
            requiresPlan={requiresPlan}
          />
        </aside>

        <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
          <SkillSummary
            skillProfile={roadmap.skillProfile}
            hasPlacementEvidence={roadmap.hasPlacementEvidence}
            placementDecision={roadmap.placementDecision}
          />

          <section aria-labelledby="journey-map-title" className="rounded-rp-card border border-rp-line bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFBFC_100%)] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="journey-map-title" className="text-[16px] font-bold text-rp-text">{tr('Hành trình JLPT')}</h2>
                <p className="mt-0.5 text-[12.5px] text-rp-text-muted">
                  {tr('Chọn một chặng để xem các bài học và bài kiểm tra cuối chặng.')}
                </p>
              </div>
              {roadmap.placementAttemptId ? (
                <Link to={`/app/placement-test/?attemptId=${roadmap.placementAttemptId}`} className="rp-link text-[12px] font-semibold">
                  {tr('Xem kết quả đánh giá')}
                </Link>
              ) : (
                <Link to="/app/placement-test" className="rp-link text-[12px] font-semibold">
                  {tr('Làm bài đánh giá năng lực')}
                </Link>
              )}
            </div>

            {stages.length === 0 ? (
              <EmptyState
                variant="compact"
                illustration="book"
                title={trf('Kho học liệu chưa có bài học JLPT {0} khả dụng.', { 0: roadmap.targetJlptLevelName || '' })}
                description={tr('Nội dung sẽ xuất hiện khi bài học được duyệt và công bố.')}
              />
            ) : (
              <JourneyMap
                stages={stages.map(toJourneyStageView)}
                currentKey={focusStage ? stageKey(focusStage) : null}
                goalLabel={roadmap.targetJlptLevelName ? trf('Mục tiêu JLPT {0}', { 0: roadmap.targetJlptLevelName }) : null}
                goalReached={totalLessons > 0 && completedLessons >= totalLessons}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
