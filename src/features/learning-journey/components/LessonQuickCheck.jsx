import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Lock } from 'lucide-react';
import { Badge, Banner, Button, ContextualErrorState, EmptyState, SakuraLoader, notify } from '@/components/ui';
import { describeApiError } from '@/api/apiErrors.js';
import { useLocale } from '@/locales/locale.js';
import {
  getAssessmentRoadmapExercises,
  getLessonPracticeExercises,
  startAssessmentRoadmapPractice,
  startPracticeExercise,
  submitAssessmentRoadmapPractice,
  submitPracticeExerciseAttempt,
} from '@/features/learning-path/api/learningPathApi.js';
import QuizStepper from './QuizStepper.jsx';

/**
 * Practice API per navigation source — the Backend applies the matching unlock rule:
 *  roadmap → assessment-roadmap endpoints (SELF_STUDY_LESSON_LOCKED)
 *  catalog → catalog attempt (`fromCatalog`, CATALOG_LESSON_LOCKED)
 *  ai      → plain attempt, checked against the active AI learning-path day (LEARNING_PATH_LESSON_LOCKED)
 */
function practiceApi(mode, skill) {
  if (mode === 'roadmap') {
    return {
      list: getAssessmentRoadmapExercises,
      start: (id) => startAssessmentRoadmapPractice(id),
      submit: submitAssessmentRoadmapPractice,
    };
  }
  return {
    list: getLessonPracticeExercises,
    start: (id) => startPracticeExercise(id, mode === 'catalog' ? { fromCatalog: true, skill } : undefined),
    submit: submitPracticeExerciseAttempt,
  };
}

export default function LessonQuickCheck({
  lessonId,
  lessonTitle,
  userId,
  mode,
  skill,
  studied,
  studyPending,
  onMarkStudied,
  practiceLock,
  onResult,
  onAttemptActiveChange,
}) {
  const { tr, trf } = useLocale();
  const api = practiceApi(mode, skill);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});

  const exercises = useQuery({
    queryKey: ['lesson-quickcheck', userId, lessonId, mode],
    queryFn: () => api.list(lessonId),
    enabled: Boolean(lessonId) && studied,
    retry: false,
  });

  const hasAnswers = Boolean(attempt) && Object.keys(answers).length > 0;
  useEffect(() => {
    onAttemptActiveChange?.(Boolean(attempt));
  }, [attempt, onAttemptActiveChange]);
  useEffect(() => {
    if (!hasAnswers) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasAnswers]);

  const start = useMutation({
    mutationFn: (exerciseId) => api.start(exerciseId),
    onSuccess: (value) => {
      setAttempt(value);
      const saved = Array.isArray(value?.savedAnswers) ? value.savedAnswers : [];
      setAnswers(Object.fromEntries(saved.filter((item) => item?.selectedOptionId).map((item) => [item.questionId, item.selectedOptionId])));
    },
    onError: (err) => notify.apiError(err, tr('Không mở được bài kiểm tra nhanh'), { key: 'lesson-quickcheck-start' }),
  });

  const submit = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang nộp bài kiểm tra…'), '', { key: 'lesson-quickcheck-submit', maxWaitMs: 30000 });
      return api.submit(attempt.attemptId, attempt.questions.map((question) => ({
        questionId: question.questionId,
        selectedOptionId: answers[question.questionId] ?? null,
      })));
    },
    onSuccess: async (value) => {
      if (value?.passed === false) {
        notify.info(tr('Đã chấm bài kiểm tra.'), '', { key: 'lesson-quickcheck-submit', replace: true });
      } else {
        notify.success(tr('Đã hoàn thành bài kiểm tra nhanh!'), '', { key: 'lesson-quickcheck-submit', replace: true });
      }
      setAttempt(null);
      setAnswers({});
      void exercises.refetch();
      await onResult?.(value);
    },
    onError: (err) => notify.apiError(err, tr('Chưa nộp được bài kiểm tra'), { key: 'lesson-quickcheck-submit', replace: true }),
  });

  if (!studied) {
    return (
      <div className="rounded-rp-card border border-rp-line bg-white p-5 text-center">
        <ClipboardCheck className="mx-auto h-8 w-8 text-rp-brand-strong" aria-hidden="true" />
        <p className="mt-2 text-[15px] font-semibold text-rp-text">{tr('Học xong nội dung để mở bài kiểm tra nhanh')}</p>
        <p className="mt-1 text-[13px] text-rp-text-muted">{tr('Bài kiểm tra mở sau khi bạn đánh dấu đã học xong bài này.')}</p>
        <Button variant="primary" size="md" className="mt-4" loading={studyPending} onClick={onMarkStudied}>
          {tr('Đã học xong')}
        </Button>
      </div>
    );
  }

  if (attempt) {
    return (
      <div data-exam-attempt-active="true" data-notebook-ignore="true" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-bold text-rp-text">{attempt.exerciseTitle ? tr(attempt.exerciseTitle) : tr('Kiểm tra nhanh')}</h3>
          {attempt.passingScorePercent != null && (
            <Badge tone="neutral" size="sm" icon={false}>{trf('Điểm đạt {0}%', { 0: attempt.passingScorePercent })}</Badge>
          )}
        </div>
        <QuizStepper
          name={`quickcheck-${attempt.attemptId}`}
          questions={attempt.questions ?? []}
          answers={answers}
          submitting={submit.isPending}
          submitLabel="Nộp bài kiểm tra"
          onAnswer={(questionId, optionId) => setAnswers((previous) => ({ ...previous, [questionId]: optionId }))}
          onSubmit={() => submit.mutate()}
        />
      </div>
    );
  }

  if (exercises.isPending) {
    return <SakuraLoader variant="section" context="homework" label={tr('Đang tải bài kiểm tra nhanh')} delay={160} />;
  }
  if (exercises.isError) {
    return (
      <ContextualErrorState
        compact
        error={exercises.error}
        title={tr('Chưa tải được bài kiểm tra nhanh')}
        onRetry={() => exercises.refetch()}
        retrying={exercises.isFetching}
      />
    );
  }

  const all = Array.isArray(exercises.data) ? exercises.data : [];
  // Roadmap lessons have exactly one QuickCheck (the passed one, or the first available).
  const visible = mode === 'roadmap'
    ? [all.find((exercise) => exercise.passed) ?? all[0]].filter(Boolean)
    : all;

  if (visible.length === 0) {
    return (
      <EmptyState
        variant="compact"
        illustration="homework"
        title={tr('Bài này chưa có bài kiểm tra nhanh')}
        description={mode === 'roadmap'
          ? tr('Bài kế tiếp sẽ mở theo quy tắc của lộ trình khi bài luyện tập được bổ sung.')
          : tr('Bạn đã học xong nội dung. Hãy tiếp tục với bài học khác.')}
      />
    );
  }

  const startError = start.error ? describeApiError(start.error).message : null;

  return (
    <div className="space-y-3">
      <div className="text-center">
        <p className="text-[17px] font-bold text-rp-text">{tr('Sẵn sàng ôn lại kiến thức?')}</p>
        <p className="mt-0.5 text-[13px] text-rp-text-muted">{tr(lessonTitle)}</p>
      </div>
      {practiceLock?.locked && (
        <Banner tone="info">
          {tr('Hoàn thành bài kiểm tra nhanh của các bài trước trong danh sách để mở bài kiểm tra này.')}
        </Banner>
      )}
      {startError && <Banner tone="warning">{tr(startError)}</Banner>}
      <ul className="space-y-2">
        {visible.map((exercise) => {
          const id = exercise.practiceExerciseId ?? exercise.id;
          const resume = exercise.latestAttempt && exercise.latestAttempt.isCompleted === false;
          return (
            <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-rp-card border border-rp-line bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold text-rp-text">{tr(exercise.title)}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-rp-text-muted">
                  {exercise.questionCount > 0 && <span>{trf('{0} câu hỏi', { 0: exercise.questionCount })}</span>}
                  {exercise.minimumPassingScorePercent != null && <span>{trf('Điểm đạt {0}%', { 0: exercise.minimumPassingScorePercent })}</span>}
                  {exercise.bestScorePercent != null && <span>{trf('Điểm cao nhất: {0}%', { 0: Math.round(exercise.bestScorePercent) })}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {exercise.passed && <Badge tone="success" size="sm">{tr('Đã đạt')}</Badge>}
                <Button
                  variant={exercise.passed ? 'secondary' : 'primary'}
                  size="md"
                  icon={practiceLock?.locked ? Lock : undefined}
                  disabled={start.isPending || practiceLock?.locked}
                  loading={start.isPending && start.variables === id}
                  onClick={() => start.mutate(id)}
                >
                  {exercise.passed ? tr('Làm lại bài kiểm tra') : resume ? tr('Làm tiếp') : tr('Bắt đầu kiểm tra')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
