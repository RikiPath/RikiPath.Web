import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import {
  Badge, Banner, Button, Card, ContextualErrorState, EmptyState, ProgressBar, SakuraLoader,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import RoadmapCheckpointModal from '@/features/learning-path/components/RoadmapCheckpointModal.jsx';
import { useJourneyRoadmap } from '@/features/learning-journey/useJourneyRoadmap.js';
import {
  STAGE_STATE_META,
  checkpointId,
  findNextLesson,
  findStageByKey,
  resolveStageState,
  stageCheckpoints,
  stageKey,
  stageMinutes,
  stageProgress,
} from '@/features/learning-journey/journeyModel.js';
import { lessonPlayerPath, stageDetailPath } from '@/features/learning-journey/lessonNavigation.js';
import LessonTimeline from '@/features/learning-journey/components/LessonTimeline.jsx';
import { ToriiGlyph } from '@/features/learning-journey/components/JourneyArt.jsx';

/** Tier 2 — one stage of the Standard roadmap: lessons in Backend order, then its checkpoint. */
export default function RoadmapStageDetail() {
  const { tr, trf } = useLocale();
  const { stageId: rawStageId } = useParams();
  const stageId = decodeURIComponent(rawStageId ?? '');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const journey = useJourneyRoadmap();
  const { roadmapQuery, roadmap, overview, requiresPlan, subscriptionQuery, refresh, errorCode, isPreview } = journey;
  const [activeCheckpoint, setActiveCheckpoint] = useState(null);

  const stages = overview.stages;
  const stage = findStageByKey(stages, stageId);
  const stageIndex = stage ? stages.indexOf(stage) : -1;
  const prevStage = stageIndex > 0 ? stages[stageIndex - 1] : null;
  const nextStage = stageIndex >= 0 && stageIndex < stages.length - 1 ? stages[stageIndex + 1] : null;
  const checkpoints = stageCheckpoints(stage);
  const requestedCheckpoint = searchParams.get('checkpoint');

  // Deep link from "Tiếp tục học" (?checkpoint=ID) opens the recommended checkpoint when the Backend reports it unlocked.
  const [dismissedDeepLink, setDismissedDeepLink] = useState(null);
  const deepLinked = requestedCheckpoint && requestedCheckpoint !== dismissedDeepLink && !requiresPlan
    ? checkpoints.find((cp) => String(checkpointId(cp)) === requestedCheckpoint && cp.isUnlocked !== false) ?? null
    : null;
  const shownCheckpoint = activeCheckpoint ?? deepLinked;
  const closeCheckpoint = () => {
    setActiveCheckpoint(null);
    if (requestedCheckpoint) {
      setDismissedDeepLink(requestedCheckpoint);
      const next = new URLSearchParams(searchParams);
      next.delete('checkpoint');
      setSearchParams(next, { replace: true });
    }
  };

  const breadcrumb = tr('Chi tiết chặng');
  const backLink = (
    <Link to="/roadmap/" className="rp-link inline-flex items-center gap-1 text-[13px] font-medium">
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      {tr('Về lộ trình của tôi')}
    </Link>
  );

  let body;
  if (isPreview) {
    body = <Card><p className="text-sm text-rp-text-muted">{tr('Lộ trình thích ứng theo năng lực hiển thị khi đăng nhập bằng tài khoản học viên.')}</p></Card>;
  } else if (roadmapQuery.isPending && journey.enabled) {
    body = <Card><SakuraLoader variant="section" context="roadmap" label={tr('Đang tải chặng học')} delay={160} /></Card>;
  } else if (roadmapQuery.isError) {
    body = (
      <Card>
        <ContextualErrorState
          compact
          error={roadmapQuery.error}
          title={errorCode === 'STANDARD_ROADMAP_PLACEMENT_REQUIRED' || errorCode === 'STUDY_LEVEL_REQUIRED'
            ? tr('Lộ trình chưa sẵn sàng')
            : tr('Chưa tải được chặng học')}
          onRetry={() => roadmapQuery.refetch()}
          retrying={roadmapQuery.isFetching}
        />
      </Card>
    );
  } else if (!stage) {
    body = (
      <Card>
        <EmptyState
          variant="compact"
          illustration="book"
          title={tr('Không tìm thấy chặng học này')}
          description={tr('Chặng có thể đã thay đổi sau khi bạn đổi mục tiêu hoặc lộ trình được cập nhật.')}
          action={<Button as={Link} to="/roadmap/" variant="primary" size="sm">{tr('Về lộ trình của tôi')}</Button>}
        />
      </Card>
    );
  } else {
    const lessons = stage.lessons ?? [];
    const progress = stageProgress(stage);
    const state = resolveStageState(stage);
    const meta = STAGE_STATE_META[state];
    const minutes = stageMinutes(stage);
    const nextLesson = findNextLesson([stage]);
    const key = stageKey(stage);
    const lockedCheckpoint = checkpoints.find((cp) => cp.isUnlocked === false);
    const buildLessonHref = (lesson, step) => lessonPlayerPath(lesson.lessonId, { from: 'roadmap', stageId: key, step });

    body = (
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <header className="rounded-rp-card border border-rp-line bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={stage.isBridgeStage ? 'warning' : 'brand'} size="sm" icon={false}>
                {stage.isBridgeStage ? trf('Chặng bổ trợ nền tảng {0}', { 0: stage.levelCode }) : `JLPT ${stage.levelCode}`}
              </Badge>
              <Badge tone={meta.tone} size="sm" icon={false}>{tr(meta.label)}</Badge>
            </div>
            <h1 className="mt-2 text-[22px] font-bold leading-tight text-rp-text">
              {trf('Chặng {0} — {1}', { 0: stageIndex + 1, 1: tr(stage.title) })}
            </h1>
            {(stage.learningObjectives || stage.description) && (
              <p className="mt-1.5 max-w-3xl text-[13px] leading-6 text-rp-text-2">{tr(stage.learningObjectives || stage.description)}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-rp-text-muted">
              <span className="font-semibold text-rp-text-2">{trf('{0}/{1} bài hoàn thành', { 0: progress.completed, 1: progress.total })}</span>
              {minutes > 0 && (
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{trf('~{0} phút', { 0: minutes })}</span>
              )}
            </div>
            <ProgressBar value={progress.completed} max={progress.total || 1} className="mt-2 max-w-md" label={tr('Tiến độ chặng')} />
            {lockedCheckpoint && (
              <p className="mt-2 text-[12.5px] text-rp-text-2">{tr('Hoàn thành các bài cần thiết để mở bài kiểm tra cuối chặng.')}</p>
            )}
          </header>

          {requiresPlan && (
            <Banner
              tone="warning"
              actions={(
                <>
                  <Button as={Link} to="/plans/" variant="primary" size="sm">{tr('Xem gói tự học')}</Button>
                  <Button variant="secondary" size="sm" loading={subscriptionQuery.isFetching} onClick={() => subscriptionQuery.refetch()}>
                    {tr('Kiểm tra lại quyền')}
                  </Button>
                </>
              )}
            >
              {tr('Bạn cần gói tự học đang hiệu lực để mở bài và làm bài luyện tập.')}
            </Banner>
          )}

          <section aria-labelledby="stage-lessons-title" className="rounded-rp-card border border-rp-line bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFBFC_100%)] p-4 sm:p-5">
            <h2 id="stage-lessons-title" className="mb-3 text-[15px] font-bold text-rp-text">{tr('Sơ đồ bài học')}</h2>
            {lessons.length === 0 ? (
              <EmptyState
                variant="compact"
                illustration="book"
                title={tr('Chặng này chưa có bài học được công bố')}
                description={tr('Nội dung sẽ xuất hiện khi bài học được duyệt và công bố.')}
              />
            ) : (
              <LessonTimeline
                lessons={lessons}
                checkpoints={checkpoints}
                currentLessonId={nextLesson?.lessonId}
                stages={stages}
                requiresPlan={requiresPlan}
                buildLessonHref={buildLessonHref}
                onOpenCheckpoint={setActiveCheckpoint}
              />
            )}
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4">
          <section className="rounded-rp-card border border-rp-brand-border/80 bg-white p-4" aria-labelledby="stage-next-title">
            <p id="stage-next-title" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rp-brand-strong">{tr('Bước học tiếp theo')}</p>
            {nextLesson ? (
              <>
                <p className="mt-1.5 text-[14px] font-semibold leading-snug text-rp-text">{tr(nextLesson.title)}</p>
                {!requiresPlan && (
                  <Button as={Link} to={buildLessonHref(nextLesson, null)} variant="primary" size="md" className="mt-3 w-full" iconRight={ArrowRight}>
                    {nextLesson.isStudied || progress.completed > 0 ? tr('Tiếp tục học') : tr('Bắt đầu học')}
                  </Button>
                )}
              </>
            ) : checkpoints.some((cp) => cp.isUnlocked !== false && !cp.isPassed) ? (
              <>
                <p className="mt-1.5 text-[13px] text-rp-text-2">{tr('Bạn đã học xong các bài của chặng. Hãy làm bài kiểm tra cuối chặng.')}</p>
                {!requiresPlan && (
                  <Button
                    variant="primary"
                    size="md"
                    className="mt-3 w-full"
                    onClick={() => setActiveCheckpoint(checkpoints.find((cp) => cp.isUnlocked !== false && !cp.isPassed))}
                  >
                    {tr('Làm bài kiểm tra')}
                  </Button>
                )}
              </>
            ) : (
              <p className="mt-1.5 text-[13px] text-rp-text-2">
                {state === 'completed' ? tr('Bạn đã hoàn thành chặng này.') : tr('Chưa có bài nào đang mở trong chặng này.')}
              </p>
            )}
          </section>

          <nav aria-label={tr('Chuyển chặng')} className="flex items-stretch gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="min-w-0 flex-1"
              disabled={!prevStage}
              icon={ChevronLeft}
              onClick={() => prevStage && navigate(stageDetailPath(stageKey(prevStage)))}
            >
              {tr('Chặng trước')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="min-w-0 flex-1"
              disabled={!nextStage}
              iconRight={ChevronRight}
              onClick={() => nextStage && navigate(stageDetailPath(stageKey(nextStage)))}
            >
              {tr('Chặng sau')}
            </Button>
          </nav>

          {roadmap?.targetJlptLevelName && (
            <div className="flex items-center gap-2 rounded-rp-card border border-rp-line bg-white px-3 py-2.5 text-[12.5px] text-rp-text-2">
              <ToriiGlyph className="h-5 w-5 text-rp-brand-strong" />
              {trf('Chặng {0}/{1} trên hành trình tới JLPT {2}', { 0: stageIndex + 1, 1: stages.length, 2: roadmap.targetJlptLevelName })}
            </div>
          )}
        </aside>
      </div>
    );
  }

  return (
    <LearnerShell breadcrumb={breadcrumb}>
      <main data-page="RoadmapStageDetail" className="rp-container rp-cq space-y-3 py-[var(--rp-space-page-y)] text-rp-text">
        {backLink}
        {body}
      </main>
      <RoadmapCheckpointModal
        open={Boolean(shownCheckpoint)}
        checkpoint={shownCheckpoint}
        onClose={closeCheckpoint}
        onCompleted={async () => {
          await refresh();
        }}
      />
    </LearnerShell>
  );
}
