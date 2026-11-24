import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, Headphones, Layers, ListChecks, Lock, PlayCircle, Sparkles,
} from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { useAuth } from '@/app/auth/authContext.js';
import { completeLesson, getLessonDetail, updatePlaybackPosition } from '@/features/lessons/api/lessonApi.js';
import {
  completeAssessmentRoadmapLesson,
  getAssessmentRoadmapLesson,
  getLessonCatalog,
} from '@/features/learning-path/api/learningPathApi.js';
import { recordLessonInteraction } from '@/features/srs/api/reviewApi.js';
import { invalidateSrsAndCalendarCaches } from '@/features/srs/utils/srsCacheSync.js';
import LessonSrsSuggestionsModal from '@/features/srs/components/LessonSrsSuggestionsModal.jsx';
import { getCompletionStats, getStudyStreak } from '@/features/progress/api/analyticsApi.js';
import { bookmarkGrammar } from '@/features/notebook/api/notebookApi.js';
import PracticeResultReview from '@/features/practice/components/PracticeResultReview.jsx';
import {
  AlertDialog, Badge, Banner, Button, CelebrationScene, CompletionSummary, ContextualErrorState, EmptyState,
  ProgressBar, SakuraLoader, Tabs, cx, notify,
  SegmentedControl,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { useJourneyRoadmap } from '@/features/learning-journey/useJourneyRoadmap.js';
import {
  catalogPracticeLocks,
  findNextLessonInStage,
  findStageByKey,
  findStageOfLesson,
  isCatalogLessonCleared,
  skillNameLabel,
  stageKey,
} from '@/features/learning-journey/journeyModel.js';
import {
  backendCatalogLockScope,
  filterLessonsByCategory,
} from '@/features/learning-journey/lessonCatalogModel.js';
import {
  lessonBackTarget,
  lessonPlayerPath,
  readLessonContext,
} from '@/features/learning-journey/lessonNavigation.js';
import {
  LEARN_PARTS,
  buildLearnPages,
  knowledgeSummary,
  readLearnPosition,
  writeLearnPosition,
} from '@/features/learning-journey/lessonContentModel.js';
import LessonKnowledgeSections from '@/features/learning-journey/components/LessonKnowledgeSections.jsx';
import LessonFlashcards from '@/features/learning-journey/components/LessonFlashcards.jsx';
import LessonQuickCheck from '@/features/learning-journey/components/LessonQuickCheck.jsx';

const CATALOG_SKILL = { listening: 'Listening', reading: 'Reading' };

function OverviewRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rp-brand-tint text-rp-brand-strong">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-rp-text-muted">{label}</p>
        <div className="mt-0.5 text-[14px] leading-6 text-rp-text">{children}</div>
      </div>
    </div>
  );
}

export default function LessonPlayer() {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { user } = useAuth();
  const userId = user?.userId;
  const routeParams = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const lessonId = Number(routeParams.lessonId ?? searchParams.get('lessonId')) || null;
  const context = readLessonContext(searchParams);
  const mode = context.from;
  const catalogSkill = CATALOG_SKILL[context.section];

  // ── Data ──────────────────────────────────────────────────────────────────────────────────────
  const detailKey = ['lesson-detail', lessonId, mode === 'roadmap' ? 'roadmap' : 'lesson'];
  const detailQuery = useQuery({
    queryKey: detailKey,
    queryFn: () => (mode === 'roadmap' ? getAssessmentRoadmapLesson(lessonId) : getLessonDetail(lessonId)),
    enabled: Boolean(lessonId),
    retry: false,
  });
  const detail = detailQuery.data ?? null;

  const journey = useJourneyRoadmap({ enabled: mode === 'roadmap' && Boolean(lessonId) });
  const stages = journey.overview.stages;
  const keyedStage = mode === 'roadmap' ? findStageByKey(stages, context.stageId) : null;
  // A stale `stage` param (roadmap regenerated) falls back to the stage that really holds the lesson.
  const stage = mode === 'roadmap'
    ? (keyedStage && (keyedStage.lessons ?? []).some((item) => Number(item.lessonId) === lessonId)
      ? keyedStage
      : findStageOfLesson(stages, lessonId))
    : null;
  const stageLessons = stage?.lessons ?? [];
  // Back target: the real stage of the lesson; a direct catalog URL returns to the lesson's own JLPT level.
  const back = lessonBackTarget({
    ...context,
    stageId: stage ? stageKey(stage) : context.stageId,
    level: context.level ?? detail?.levelCode ?? null,
  });
  const roadmapLesson = stageLessons.find((item) => Number(item.lessonId) === lessonId) ?? null;

  const catalogQuery = useQuery({
    queryKey: ['self-study-catalog', userId, detail?.certificateLevelId],
    queryFn: () => getLessonCatalog(detail.certificateLevelId),
    enabled: mode === 'catalog' && Boolean(detail?.certificateLevelId),
    retry: false,
  });
  const catalogRawLessons = catalogQuery.data?.lessons ?? [];
  const catalogLessons = filterLessonsByCategory(
    catalogSkill ? catalogRawLessons.filter((item) => item.languageSkillName === catalogSkill) : catalogRawLessons,
    context.category,
  );
  const catalogLesson = catalogLessons.find((item) => Number(item.lessonId) === lessonId)
    ?? catalogRawLessons.find((item) => Number(item.lessonId) === lessonId)
    ?? null;
  const catalogLocks = catalogPracticeLocks(backendCatalogLockScope(catalogRawLessons, context.category));

  const streakQuery = useQuery({ queryKey: ['learner', 'study-streak'], queryFn: getStudyStreak, enabled: Boolean(lessonId), retry: false });
  const statsQuery = useQuery({ queryKey: ['learner', 'completion-stats'], queryFn: getCompletionStats, enabled: Boolean(lessonId), retry: false });

  const hasPractice = roadmapLesson?.hasPracticeExercise ?? catalogLesson?.hasPracticeExercise ?? null;
  const practicePassed = Boolean(roadmapLesson?.practicePassed || catalogLesson?.practicePassed);
  const studied = Boolean(detail?.isCompleted || roadmapLesson?.isStudied || practicePassed);
  const lessonCleared = mode === 'roadmap'
    ? Boolean(roadmapLesson?.isCompleted)
    : catalogLesson ? isCatalogLessonCleared(catalogLesson) : Boolean(detail?.isCompleted && hasPractice === false);
  const positionList = mode === 'roadmap' ? stageLessons : mode === 'catalog' ? catalogLessons : [];
  const positionIndex = positionList.findIndex((item) => Number(item.lessonId) === lessonId);
  const skillName = detail?.languageSkillName || roadmapLesson?.languageSkillName || catalogLesson?.languageSkillName;
  const objective = roadmapLesson?.learningObjectives || roadmapLesson?.description || catalogLesson?.description || null;
  const minutes = Number(roadmapLesson?.estimatedMinutes) || 0;

  // ── Learn pages & step state ────────────────────────────────────────────────────────────────────
  const pages = buildLearnPages(detail);
  const [step, setStepState] = useState(context.step && context.step !== 'result' ? context.step : 'overview');
  const [learnIndex, setLearnIndex] = useState(() => (lessonId ? readLearnPosition(userId, lessonId) : 0));
  const [view, setView] = useState('list');
  const [lastResult, setLastResult] = useState(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [attemptActive, setAttemptActive] = useState(false);
  const [pendingLeave, setPendingLeave] = useState(null);
  const [srsModalOpen, setSrsModalOpen] = useState(false);
  const [completionPayload, setCompletionPayload] = useState(null);
  const [bookmarkStates, setBookmarkStates] = useState({});
  const interactionLoggedRef = useRef(0);
  const lastSent = useRef(-1);

  // Lesson switch (e.g. "Bài tiếp theo") resets the player — state adjusted during render, not in an effect.
  const [activeLessonId, setActiveLessonId] = useState(lessonId);
  if (activeLessonId !== lessonId) {
    setActiveLessonId(lessonId);
    setStepState(context.step && context.step !== 'result' ? context.step : 'overview');
    setLearnIndex(lessonId ? readLearnPosition(userId, lessonId) : 0);
    setView('list');
    setLastResult(null);
    setJustCompleted(false);
    setBookmarkStates({});
    setCompletionPayload(null);
  }

  const safeLearnIndex = Math.min(learnIndex, Math.max(pages.length - 1, 0));
  const page = pages[safeLearnIndex];

  const setStep = useCallback((next) => {
    setStepState(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'overview') params.delete('step'); else params.set('step', next);
    setSearchParams(params, { replace: true });
    document.getElementById('lesson-player-top')?.scrollIntoView({ block: 'start' });
  }, [searchParams, setSearchParams]);

  const goLearnPage = (index) => {
    setLearnIndex(index);
    if (lessonId) writeLearnPosition(userId, lessonId, index);
    document.getElementById('lesson-player-top')?.scrollIntoView({ block: 'start' });
  };

  const markInteracted = useCallback(() => {
    if (!lessonId || interactionLoggedRef.current === lessonId) return;
    interactionLoggedRef.current = lessonId;
    void recordLessonInteraction(lessonId).catch(() => {
      interactionLoggedRef.current = 0;
    });
  }, [lessonId]);

  useEffect(() => {
    if (step === 'learn') markInteracted();
  }, [step, markInteracted]);

  // ── Progress sync ─────────────────────────────────────────────────────────────────────────────────
  const syncProgress = useCallback(async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['assessment-roadmap'] }),
      client.invalidateQueries({ queryKey: ['self-study-catalog'] }),
      client.invalidateQueries({ queryKey: ['learning-lessons'] }),
      client.invalidateQueries({ queryKey: ['learner', 'study-streak'] }),
      client.invalidateQueries({ queryKey: ['learner', 'completion-stats'] }),
      client.invalidateQueries({ queryKey: ['learner', 'notifications'] }),
      client.invalidateQueries({ queryKey: ['learner', 'skill-breakdown'] }),
      client.invalidateQueries({ queryKey: ['ai-learning-path'] }),
    ]);
    void invalidateSrsAndCalendarCaches(client);
  }, [client]);

  const applyCompletion = (data) => {
    if (data) client.setQueryData(detailKey, data);
    setCompletionPayload(data);
    void syncProgress();
    if (data?.autoEnrolledSrsCount > 0) {
      notify.success(
        tr('Đã đánh dấu hoàn thành bài học!'),
        trf('Đã tự động thêm {0} thẻ gợi ý vào SRS theo cài đặt của bạn.', { 0: data.autoEnrolledSrsCount }),
        { key: `lesson-complete-${lessonId}` },
      );
    } else {
      notify.success(tr('Đã đánh dấu hoàn thành bài học!'), '', { key: `lesson-complete-${lessonId}` });
    }
  };

  const complete = useMutation({
    mutationFn: () => (mode === 'roadmap' ? completeAssessmentRoadmapLesson(lessonId) : completeLesson(lessonId)),
    onSuccess: (data) => {
      applyCompletion(data);
      if (hasPractice === false) {
        setJustCompleted(true);
        setStep('result');
      } else {
        setStep('practice');
      }
      if (data?.suggestedSrsCards?.length && !(data?.autoEnrolledSrsCount > 0)) setSrsModalOpen(true);
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu tiến độ bài học'), { key: `lesson-complete-err-${lessonId}` }),
  });

  const playback = useMutation({
    mutationFn: (body) => updatePlaybackPosition(lessonId, body),
    onSuccess: (data) => {
      if (!data?.isCompleted || detail?.isCompleted) return;
      applyCompletion(data);
    },
  });

  const saveGrammar = useMutation({
    mutationFn: ({ id }) => bookmarkGrammar(id),
    onMutate: ({ key }) => setBookmarkStates((cur) => ({ ...cur, [key]: 'saving' })),
    onSuccess: (res, { key }) => {
      setBookmarkStates((cur) => ({ ...cur, [key]: 'saved' }));
      void invalidateSrsAndCalendarCaches(client);
      if (res?.alreadyExists || res?.isExisting) {
        notify.info(tr('Mẫu ngữ pháp đã có trong sổ tay.'), '', { key: 'lesson-grammar-bm-dup' });
      } else {
        notify.success(tr('Đã lưu mẫu ngữ pháp vào sổ tay.'), '', { key: 'lesson-grammar-bm' });
      }
    },
    onError: (err, { key }) => {
      setBookmarkStates((cur) => ({ ...cur, [key]: 'error' }));
      notify.apiError(err, tr('Chưa lưu được mẫu ngữ pháp'), { key: 'lesson-grammar-bm-err' });
    },
  });

  const rememberVideo = (video) => {
    const duration = Math.floor(video.duration || 0);
    const position = Math.floor(video.currentTime || 0);
    if (duration <= 0 || position < 1) return;
    if (lastSent.current >= 0 && position - lastSent.current < 8) return;
    lastSent.current = position;
    playback.mutate({ positionSeconds: position, durationSeconds: duration });
  };
  const videoProps = {
    onLoadedMetadata: (event) => {
      const resume = detail?.resumePositionSeconds || 0;
      if (resume > 0) event.currentTarget.currentTime = resume;
    },
    onTimeUpdate: (event) => rememberVideo(event.currentTarget),
    onPause: (event) => {
      lastSent.current = -1;
      rememberVideo(event.currentTarget);
    },
  };

  const handleResult = async (result) => {
    setLastResult(result);
    setStep('result');
    await syncProgress();
    if (mode === 'roadmap') await journey.roadmapQuery.refetch();
  };

  // ── Navigation guards ─────────────────────────────────────────────────────────────────────────────
  const requestLeave = (to) => {
    if (attemptActive) setPendingLeave(to);
    else navigate(to);
  };
  const changeStep = (next) => {
    if (attemptActive && next !== 'practice') {
      notify.info(tr('Bạn đang làm bài kiểm tra'), tr('Hãy nộp bài trước khi chuyển sang phần khác.'), { key: 'lesson-attempt-active' });
      return;
    }
    if (next === 'learn' && pages.length === 0) return;
    setStep(next);
  };

  // Next lesson after the result (Backend unlock state after refetch).
  const nextRoadmapLesson = mode === 'roadmap' ? findNextLessonInStage(stage, lessonId) : null;
  const nextCatalogLesson = mode === 'catalog' && positionIndex >= 0 ? catalogLessons[positionIndex + 1] ?? null : null;
  const nextLesson = nextRoadmapLesson ?? nextCatalogLesson;
  const nextLessonHref = nextLesson
    ? lessonPlayerPath(nextLesson.lessonId, {
      ...context,
      step: null,
      stageId: mode === 'roadmap' && stage ? stageKey(stage) : context.stageId,
    })
    : null;
  const nextLessonLocked = Boolean(nextRoadmapLesson?.isLocked);

  // ── Render ───────────────────────────────────────────────────────────────────────────────────────
  const errorCode = detailQuery.error?.data?.errorCode;
  let content;
  if (!lessonId) {
    content = (
      <EmptyState
        variant="card"
        illustration="book"
        title={tr('Chọn một bài từ danh sách')}
        description={tr('Mở bài học từ lộ trình hoặc thư viện bài học để bắt đầu.')}
        action={<Button as={Link} to="/lessons/" variant="primary" size="sm">{tr('Khám phá bài học')}</Button>}
      />
    );
  } else if (detailQuery.isPending) {
    content = <SakuraLoader variant="section" context="lesson" label={tr('Đang mở bài học')} delay={160} />;
  } else if (errorCode === 'SELF_STUDY_LESSON_LOCKED') {
    content = (
      <EmptyState
        variant="card"
        illustration="book"
        title={tr('Bài học này đang khóa')}
        description={tr(detailQuery.error?.message || 'Hãy hoàn thành bài tiên quyết trước khi mở bài học này.')}
        action={<Button as={Link} to={back.to} variant="primary" size="sm" icon={Lock}>{tr(back.label)}</Button>}
      />
    );
  } else if (errorCode === 'SELF_STUDY_PACKAGE_REQUIRED') {
    content = (
      <EmptyState
        variant="card"
        illustration="book"
        title={tr('Cần gói tự học để mở bài này')}
        description={tr(detailQuery.error?.message || 'Bạn cần gói tự học đang hiệu lực để mở bài và làm bài luyện tập.')}
        action={<Button as={Link} to="/plans/" variant="primary" size="sm">{tr('Mua gói ngay')}</Button>}
      />
    );
  } else if (detailQuery.isError || !detail) {
    content = (
      <ContextualErrorState
        className="rounded-rp-card border border-rp-line bg-white px-5"
        compact
        error={detailQuery.error}
        title={tr('Chưa tải được nội dung bài học')}
        onRetry={() => detailQuery.refetch()}
        retrying={detailQuery.isFetching}
      />
    );
  } else {
    const knowledge = knowledgeSummary(detail);
    const partsPresent = [...new Set(pages.map((item) => item.part))];
    const practiceAvailable = hasPractice !== false;
    const resultAvailable = Boolean(lastResult) || lessonCleared || justCompleted;
    // A step that is not available for this lesson (stale deep link) falls back to the overview.
    const viewStep = (step === 'learn' && pages.length === 0)
      || (step === 'practice' && !practiceAvailable)
      || (step === 'result' && !resultAvailable)
      ? 'overview'
      : step;
    const stepTabs = [
      { value: 'overview', label: tr('Tổng quan') },
      { value: 'learn', label: tr('Học'), disabled: pages.length === 0 },
      { value: 'practice', label: tr('Luyện tập'), disabled: !practiceAvailable },
      { value: 'result', label: tr('Kết quả'), disabled: !resultAvailable },
    ];
    const learnProgress = pages.length > 0 ? Math.round(((safeLearnIndex + 1) / pages.length) * 100) : 0;
    const finishLearnLabel = !studied ? 'Hoàn thành phần học' : practiceAvailable ? 'Sang phần luyện tập' : 'Xem kết quả';
    const finishLearn = () => {
      if (!studied) complete.mutate();
      else changeStep(practiceAvailable ? 'practice' : 'result');
    };

    content = (
      <>
        <header className="rounded-rp-card border border-rp-line bg-white px-4 pb-0 pt-4 sm:px-5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-rp-brand-strong">
            {detail.levelCode && <span>JLPT {detail.levelCode}</span>}
            {stage && <span className="text-rp-text-muted">· {tr(stage.title)}</span>}
            {skillName && <span className="text-rp-text-muted">· {tr(skillNameLabel(skillName))}</span>}
          </p>
          <h1 className="mt-1 text-[22px] font-bold leading-tight text-rp-text sm:text-[24px]">{tr(detail.title)}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {lessonCleared ? (
              <Badge tone="success" size="sm">{tr('Đã hoàn thành')}</Badge>
            ) : studied && practiceAvailable ? (
              <Badge tone="brand" size="sm" icon={false}>{tr('Chờ kiểm tra nhanh')}</Badge>
            ) : null}
            {roadmapLesson?.bestPracticeScore != null && (
              <Badge tone="neutral" size="sm" icon={false}>{trf('Điểm kiểm tra nhanh cao nhất: {0}%', { 0: Math.round(roadmapLesson.bestPracticeScore) })}</Badge>
            )}
          </div>
          <div className="mt-3 -mx-1 overflow-x-auto">
            <Tabs label={tr('Các bước của bài học')} value={viewStep} onChange={changeStep} tabs={stepTabs} />
          </div>
        </header>

        {viewStep === 'overview' && (
          <section className="rp-anim-fade rounded-rp-card border border-rp-line bg-white p-4 sm:p-5" aria-label={tr('Tổng quan')}>
            <div className="divide-y divide-rp-line">
              {objective && (
                <OverviewRow icon={Sparkles} label={tr('Mục tiêu của bài')}>{tr(objective)}</OverviewRow>
              )}
              <OverviewRow icon={Layers} label={tr('Kiến thức trong bài')}>
                <div className="flex flex-wrap gap-1.5">
                  {knowledge.map((entry) => (
                    <Badge key={entry.part} tone="brand" size="sm" icon={false}>{trf('{0} · {1} mục', { 0: tr(entry.label), 1: entry.count })}</Badge>
                  ))}
                  {detail.content?.trim() && <Badge tone="neutral" size="sm" icon={false}>{skillName === 'Listening' ? tr('Nội dung bài nghe') : tr('Bài đọc / giải thích')}</Badge>}
                  {detail.audioUrl && <Badge tone="info" size="sm" icon={Headphones}>{tr('Có audio')}</Badge>}
                  {detail.videoUrl && <Badge tone="info" size="sm" icon={PlayCircle}>{tr('Có video')}</Badge>}
                  {knowledge.length === 0 && !detail.content?.trim() && !detail.audioUrl && !detail.videoUrl && (
                    <span className="text-rp-text-muted">{tr('Bài này chưa có nội dung tự học.')}</span>
                  )}
                </div>
              </OverviewRow>
              {minutes > 0 && (
                <OverviewRow icon={Clock} label={tr('Thời lượng dự kiến')}>{trf('{0} phút', { 0: minutes })}</OverviewRow>
              )}
              <OverviewRow icon={ListChecks} label={tr('Điều kiện hoàn thành')}>
                {practiceAvailable
                  ? (roadmapLesson?.quickCheckQuestionCount > 0
                    ? trf('Học xong nội dung, sau đó đạt bài kiểm tra nhanh ({0} câu hỏi).', { 0: roadmapLesson.quickCheckQuestionCount })
                    : tr('Học xong nội dung, sau đó đạt bài kiểm tra nhanh.'))
                  : tr('Học xong nội dung và đánh dấu đã học.')}
              </OverviewRow>
              <OverviewRow icon={BookOpen} label={tr('Hoạt động liên quan')}>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="soft" size="sm" onClick={() => { markInteracted(); setSrsModalOpen(true); }}>
                    {detail.suggestedSrsCards?.length
                      ? trf('Chọn thẻ ôn SRS ({0})', { 0: detail.suggestedSrsCards.length })
                      : tr('Chọn thẻ ôn SRS')}
                  </Button>
                  {practiceAvailable && <span className="text-[12.5px] text-rp-text-muted">{tr('Kiểm tra nhanh ở bước Luyện tập')}</span>}
                </div>
              </OverviewRow>
            </div>
          </section>
        )}

        {viewStep === 'learn' && page && (
          <section className="rp-anim-fade space-y-3" aria-label={tr('Học kiến thức')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div role="group" aria-label={tr('Phần kiến thức')} className="flex flex-wrap gap-1.5">
                {partsPresent.map((part) => {
                  const first = pages.findIndex((item) => item.part === part);
                  const count = part === 'content' ? null : (detail[LEARN_PARTS[part].key] ?? []).length;
                  const active = page.part === part;
                  return (
                    <button
                      key={part}
                      type="button"
                      aria-pressed={active}
                      onClick={() => goLearnPage(first)}
                      className={cx(
                        'rp-focus h-8 rounded-lg px-3 text-[12.5px] font-semibold',
                        active ? 'bg-rp-brand-pressed text-white' : 'border border-rp-line bg-white text-rp-text-2 hover:bg-rp-brand-tint',
                      )}
                    >
                      {count != null ? trf('{0} ({1})', { 0: tr(LEARN_PARTS[part].label), 1: count }) : tr(LEARN_PARTS[part].label)}
                    </button>
                  );
                })}
              </div>
              {page.part !== 'content' && (
                <SegmentedControl
                  size="md"
                  label={tr('Kiểu hiển thị')}
                  value={view}
                  onChange={setView}
                  options={[{ value: 'list', label: 'Danh sách' }, { value: 'cards', label: 'Thẻ ghi nhớ' }]}
                />
              )}
            </div>

            {page.part !== 'content' && view === 'list' && page.chunkCount > 1 && (
              <p className="text-[12.5px] font-medium text-rp-text-muted">
                {trf('Nhóm {0}/{1}', { 0: page.chunk + 1, 1: page.chunkCount })}
              </p>
            )}

            {page.part !== 'content' && view === 'cards' ? (
              <LessonFlashcards
                key={`${lessonId}-${page.part}`}
                part={page.part}
                items={detail[LEARN_PARTS[page.part].key] ?? []}
                onInteract={markInteracted}
              />
            ) : (
              <LessonKnowledgeSections
                page={page}
                detail={detail}
                skillName={skillName}
                bookmarkStates={bookmarkStates}
                onBookmarkGrammar={(id, key) => saveGrammar.mutate({ id, key })}
                videoProps={videoProps}
              />
            )}
          </section>
        )}

        <section hidden={viewStep !== 'practice'} className="rounded-rp-card border border-rp-line bg-rp-bg-2/60 p-4 sm:p-5" aria-label={tr('Luyện tập')}>
          {practiceAvailable && (
            <LessonQuickCheck
              lessonId={lessonId}
              lessonTitle={detail.title}
              userId={userId}
              mode={mode}
              skill={catalogSkill}
              studied={studied}
              studyPending={complete.isPending}
              onMarkStudied={() => complete.mutate()}
              practiceLock={mode === 'catalog' ? { locked: Boolean(catalogLocks.get(lessonId)) } : null}
              onResult={handleResult}
              onAttemptActiveChange={setAttemptActive}
            />
          )}
        </section>

        {viewStep === 'result' && (
          <section className="rp-anim-fade space-y-3" aria-label={tr('Kết quả')}>
            {(lastResult?.passed || justCompleted) && (
              <CelebrationScene
                variant="inline"
                tier="lesson"
                onceKey={lastResult?.attemptId ? `lesson-quickcheck-${lastResult.attemptId}` : `lesson-complete-${lessonId}`}
                badge={tr('Hoàn thành bài học')}
                title={tr('Bạn làm tốt lắm! Thêm một bước tiến rồi!')}
                description={trf('Bạn đã hoàn thành nội dung bài “{0}”.', { 0: tr(detail.title) })}
              >
                <CompletionSummary
                  completedCount={statsQuery.data?.completedLessons}
                  totalCount={statsQuery.data?.totalLessons}
                  streakDays={Number(streakQuery.data?.currentStreakDays) || 0}
                  levelLabel={detail.levelCode ? `JLPT ${detail.levelCode}` : undefined}
                />
              </CelebrationScene>
            )}
            {lastResult ? (
              <div className="rounded-rp-card border border-rp-line bg-white p-4 sm:p-5">
                <PracticeResultReview result={lastResult} sourceTitle={detail.title} contentPrefix={`lesson-${lessonId}`} />
              </div>
            ) : (
              <div className="rounded-rp-card border border-rp-success-line bg-white p-4 sm:p-5">
                <p className="inline-flex items-center gap-2 text-[15px] font-semibold text-rp-success">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  {tr('Bạn đã hoàn thành bài học này.')}
                </p>
                {(roadmapLesson?.bestPracticeScore != null) && (
                  <p className="mt-1 text-[13px] text-rp-text-2">
                    {trf('Điểm kiểm tra nhanh cao nhất: {0}%', { 0: Math.round(roadmapLesson.bestPracticeScore) })}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 rounded-rp-card border border-rp-line bg-white p-3">
              {lastResult && lastResult.passed === false && practiceAvailable && (
                <Button variant="primary" size="md" onClick={() => changeStep('practice')}>{tr('Làm lại bài kiểm tra')}</Button>
              )}
              {nextLessonHref && (lastResult?.passed || lessonCleared || justCompleted) && (
                nextLessonLocked ? (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] text-rp-text-muted">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    {trf('Bài tiếp theo “{0}” chưa mở khóa.', { 0: tr(nextLesson.title) })}
                  </span>
                ) : (
                  <Button as={Link} to={nextLessonHref} variant="primary" size="md" iconRight={ArrowRight}>
                    {tr('Bài tiếp theo')}
                  </Button>
                )
              )}
              <Button variant="secondary" size="md" onClick={() => requestLeave(back.to)}>{tr(back.label)}</Button>
              <Button variant="ghost" size="md" onClick={() => setSrsModalOpen(true)}>{tr('Chọn thẻ ôn SRS')}</Button>
            </div>
          </section>
        )}

        {(viewStep === 'overview' || viewStep === 'learn' || (viewStep === 'practice' && !attemptActive)) && (
          <nav
            aria-label={tr('Điều hướng bài học')}
            className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-2 rounded-rp-card border border-rp-line bg-white/95 px-3 py-2.5 shadow-rp-xs backdrop-blur"
          >
            {viewStep === 'overview' ? (
              <span />
            ) : (
              <Button
                variant="secondary"
                size="md"
                icon={ArrowLeft}
                onClick={() => {
                  if (viewStep === 'learn' && safeLearnIndex > 0) goLearnPage(safeLearnIndex - 1);
                  else if (viewStep === 'practice' && pages.length > 0) setStep('learn');
                  else setStep('overview');
                }}
              >
                {tr('Trước')}
              </Button>
            )}
            {viewStep === 'learn' && pages.length > 0 && (
              <div className="hidden min-w-0 flex-1 px-2 sm:block">
                <ProgressBar value={learnProgress} max={100} size="sm" label={tr('Tiến độ trong bài')} />
              </div>
            )}
            {viewStep === 'overview' && (
              <Button
                variant="primary"
                size="md"
                iconRight={ArrowRight}
                onClick={() => (pages.length > 0 ? setStep('learn') : finishLearn())}
                loading={complete.isPending}
              >
                {lessonCleared ? tr('Xem lại bài học') : safeLearnIndex > 0 ? tr('Tiếp tục học') : tr('Bắt đầu học')}
              </Button>
            )}
            {viewStep === 'learn' && (
              safeLearnIndex < pages.length - 1 ? (
                <Button variant="primary" size="md" iconRight={ArrowRight} onClick={() => goLearnPage(safeLearnIndex + 1)}>
                  {tr('Tiếp tục')}
                </Button>
              ) : (
                <Button variant="primary" size="md" iconRight={ArrowRight} loading={complete.isPending} onClick={finishLearn}>
                  {tr(finishLearnLabel)}
                </Button>
              )
            )}
            {viewStep === 'practice' && resultAvailable && (
              <Button variant="soft" size="md" iconRight={ArrowRight} onClick={() => setStep('result')}>{tr('Xem kết quả')}</Button>
            )}
          </nav>
        )}
        {complete.isError && <Banner tone="danger">{tr('Chưa lưu tiến độ bài học')}</Banner>}
      </>
    );
  }

  return (
    <LearnerShell breadcrumb={tr('Bài học')}>
      <main id="lesson-player-top" data-page="LessonPlayer" className="mx-auto w-full max-w-[880px] scroll-mt-4 space-y-3 px-4 py-[var(--rp-space-page-y)] text-rp-text sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => requestLeave(back.to)} className="rp-link inline-flex items-center gap-1 text-[13px] font-medium">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {tr(back.label)}
          </button>
          {positionIndex >= 0 && positionList.length > 0 && (
            <span className="text-[12.5px] font-semibold tabular-nums text-rp-text-muted">
              {trf('Bài {0} / {1}', { 0: positionIndex + 1, 1: positionList.length })}
            </span>
          )}
        </div>
        {content}
      </main>

      <AlertDialog
        open={Boolean(pendingLeave)}
        tone="warning"
        title="Rời bài kiểm tra?"
        description="Các câu trả lời chưa nộp sẽ không được lưu."
        confirmLabel="Rời bài"
        cancelLabel="Tiếp tục làm bài"
        onConfirm={() => {
          const to = pendingLeave;
          setPendingLeave(null);
          setAttemptActive(false);
          navigate(to);
        }}
        onCancel={() => setPendingLeave(null)}
        onClose={() => setPendingLeave(null)}
      />

      <LessonSrsSuggestionsModal
        open={srsModalOpen}
        onClose={() => setSrsModalOpen(false)}
        lessonId={lessonId}
        initialSuggestions={completionPayload?.suggestedSrsCards || detail?.suggestedSrsCards}
        lessonTitle={detail?.title}
      />
    </LearnerShell>
  );
}
