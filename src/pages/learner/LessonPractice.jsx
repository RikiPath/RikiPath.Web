import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/app/auth/session.js';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import {
  getLessonExercises,
  getQuizExercises,
  startLessonExercise,
  startQuizExercise,
  submitLessonExercise,
  submitQuizExercise,
} from '@/features/practice/api/practiceExerciseApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import {
  AnimatedScoreReveal,
  Badge,
  Banner,
  Button,
  Card,
  CelebrationScene,
  ContextualEmptyState,
  ContextualErrorState,
  PageContainer,
  ProgressBar,
  Radio,
  SakuraLoader,
  Textarea,
  notify,
  shouldPlayCelebration,
} from '@/components/ui';
import HighlightableText from '@/features/notebook/components/HighlightableText.jsx';

export default function LessonPractice() {
  const { tr } = useLocale();
  const session = getSession();
  const uid = session?.userId ?? 'anon';
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const lessonId = Number(params.get('lessonId')) || 0;
  const [attempt, setAttempt] = useState(null);
  const [source, setSource] = useState('lesson');
  const [picks, setPicks] = useState({});
  const [texts, setTexts] = useState({});
  const [result, setResult] = useState(null);

  const listQuery = useQuery({
    queryKey: ['lesson-exercises', uid, lessonId],
    queryFn: () => getLessonExercises(lessonId),
    enabled: lessonId > 0,
  });
  const quizQuery = useQuery({
    queryKey: ['lesson-quizzes', uid, lessonId],
    queryFn: () => getQuizExercises(lessonId),
    enabled: lessonId > 0 && listQuery.isSuccess && !(Array.isArray(listQuery.data) ? listQuery.data : []).length,
  });

  const start = useMutation({
    mutationFn: ({ id, kind }) => (kind === 'quiz' ? startQuizExercise(id) : startLessonExercise(id)),
    onSuccess: (data, variables) => {
      const questions = (data.questions || []).map((question) => ({
        ...question,
        id: question.id ?? question.questionId,
        questionText: question.questionText,
        options: (question.options || []).map((option) => ({
          ...option,
          id: option.id ?? option.optionId,
          optionText: option.optionText,
        })),
      }));
      const saved = Object.fromEntries((data.savedAnswers || []).map((item) => [item.questionId, item]));
      setSource(variables.kind);
      setAttempt({ ...data, title: data.title || data.exerciseTitle, questions });
      setResult(null);
      setPicks(Object.fromEntries(Object.entries(saved).filter(([, item]) => item.selectedOptionId).map(([id, item]) => [id, item.selectedOptionId])));
      setTexts(Object.fromEntries(Object.entries(saved).filter(([, item]) => item.textAnswer).map(([id, item]) => [id, item.textAnswer])));
    },
    onError: (err) => notify.apiError(err, tr('Không mở được bài tập'), { key: 'lesson-ex-start-err' }),
  });

  const hasAllRequiredAnswers = useMemo(() => {
    const qs = attempt?.questions || [];
    if (qs.length === 0) return false;
    return qs.every((q) => (q.options?.length > 0 ? Boolean(picks[q.id]) : Boolean(texts[q.id]?.trim())));
  }, [attempt, picks, texts]);

  const submit = useMutation({
    mutationFn: () => {
      const answers = (attempt.questions || []).map((question) => ({
        questionId: question.id,
        selectedOptionId: picks[question.id] ?? null,
        ...(texts[question.id]?.trim() ? { textAnswer: texts[question.id].trim() } : {}),
      }));
      notify.loading(tr('Đang nộp bài tập…'), '', { key: 'lesson-ex-submit', maxWaitMs: 30000 });
      return source === 'quiz'
        ? submitQuizExercise(attempt.attemptId, answers)
        : submitLessonExercise(attempt.attemptId, answers);
    },
    onSuccess: (value) => {
      notify.success(tr('Đã nộp bài tập!'), '', { key: 'lesson-ex-submit', replace: true });
      setResult(value);
      void queryClient.invalidateQueries({ queryKey: ['assessment-roadmap'] });
      void queryClient.invalidateQueries({ queryKey: ['self-study-catalog'] });
      void queryClient.invalidateQueries({ queryKey: ['learner', 'study-streak'] });
      void queryClient.invalidateQueries({ queryKey: ['learner', 'completion-stats'] });
    },
    onError: (err) => notify.apiError(err, tr('Chưa nộp được bài tập'), { key: 'lesson-ex-submit', replace: true }),
  });

  const primary = Array.isArray(listQuery.data) ? listQuery.data : [];
  const quizzes = Array.isArray(quizQuery.data) ? quizQuery.data : [];
  const exercises = primary.length
    ? primary.map((item) => ({ ...item, kind: 'lesson' }))
    : quizzes.map((item) => ({ ...item, kind: 'quiz' }));
  const loadError = listQuery.isError ? listQuery.error : quizQuery.isError ? quizQuery.error : null;
  const actionError = start.error || submit.error;

  const questionLookup = useMemo(() => {
    const map = new Map();
    (attempt?.questions || []).forEach((q, idx) => map.set(q.id, { ...q, number: idx + 1 }));
    return map;
  }, [attempt]);

  return (
    <LearnerShell pathname="/lesson-practice" breadcrumb={tr('Bài tập')}>
      <PageContainer width="reading" density="comfortable" className="text-rp-text space-y-4">
        <div>
          <Link to={lessonId ? `/lesson-player/?lessonId=${lessonId}` : '/lessons/'} className="rp-link inline-flex items-center gap-1 text-[13px] font-medium">
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> {tr('Về bài học')}
          </Link>
          <header className="mt-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-rp-brand-strong">{tr('Bài tập của bài học')}</p>
            <h1 className="mt-1 rp-type-page-title text-rp-text">{tr('Làm bài rồi xem đáp án')}</h1>
          </header>
        </div>

        {actionError && <Banner tone="danger">{tr(describeApiError(actionError).message)}</Banner>}

        {loadError && (
          <ContextualErrorState
            variant="inline"
            error={loadError}
            title={tr('Chưa tải được bài tập của bài học')}
            onRetry={() => (listQuery.isError ? listQuery.refetch() : quizQuery.refetch())}
            retrying={listQuery.isFetching || quizQuery.isFetching}
          />
        )}

        {!lessonId && (
          <Card>
            <ContextualEmptyState
              variant="compact"
              illustration="book"
              title="Chưa chọn bài học"
              description="Vui lòng mở bài tập từ một bài học cụ thể."
              action={<Button as={Link} to="/lessons/" variant="primary" size="sm">{tr('Mở danh sách bài học')}</Button>}
            />
          </Card>
        )}

        {(listQuery.isLoading || quizQuery.isLoading) && lessonId > 0 && (
          <SakuraLoader variant="section" context="homework" label={tr('Đang tải bài tập…')} delay={160} />
        )}

        {!attempt && exercises.length === 0 && listQuery.isSuccess && !quizQuery.isLoading && !quizQuery.isError && (
          <Card>
            <ContextualEmptyState
              variant="compact"
              illustration="homework"
              title="Bài học này chưa có bài tập"
              description="Bạn có thể quay lại bài học để tiếp tục phần nội dung khác."
            />
          </Card>
        )}

        {!attempt && exercises.length > 0 && (
          <ul className="space-y-3">
            {exercises.map((exercise) => (
              <li key={exercise.id}>
                <Card density="compact" className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Badge tone="brand" icon={false} size="sm">{exercise.languageSkillName || tr('Luyện tập')}</Badge>
                    <h2 className="mt-2 text-base font-semibold text-rp-text">{tr(exercise.title)}</h2>
                    {exercise.description && <p className="mt-1 text-[13px] leading-6 text-rp-text-muted">{tr(exercise.description)}</p>}
                    <p className="mt-2 text-xs text-rp-text-muted">
                      {exercise.questionCount} {tr('câu')}
                      {typeof exercise.bestScorePercent === 'number' ? ` · ${tr('Điểm cao nhất')} ${Math.round(exercise.bestScorePercent)}%` : ''}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={start.isPending}
                    onClick={() => start.mutate({ id: exercise.id, kind: exercise.kind })}
                  >
                    {exercise.latestAttempt && !exercise.latestAttempt.isCompleted ? tr('Làm tiếp') : tr('Bắt đầu')}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {attempt && !result && (
          <Card data-notebook-ignore="true" className="space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-rp-line pb-3">
              <h2 className="text-lg font-semibold text-rp-text">{tr(attempt.title)}</h2>
              <Button variant="ghost" size="sm" onClick={() => setAttempt(null)}>{tr('Danh sách')}</Button>
            </div>
            <ol className="space-y-5">
              {(attempt.questions || []).map((question, index) => (
                <li key={question.id} className="space-y-2.5">
                  <p className="text-sm font-medium text-rp-text">{index + 1}. {question.questionText}</p>
                  {question.options?.length > 0 ? (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <div
                          key={option.id}
                          className={`rounded-xl border px-3 py-2 transition-colors ${
                            picks[question.id] === option.id
                              ? 'border-rp-brand bg-rp-brand-tint/60'
                              : 'border-rp-line hover:bg-rp-brand-tint/30'
                          }`}
                        >
                          <Radio
                            name={`q-${question.id}`}
                            checked={picks[question.id] === option.id}
                            onChange={() => setPicks((prev) => ({ ...prev, [question.id]: option.id }))}
                            label={option.optionText}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Textarea
                      value={texts[question.id] || ''}
                      onChange={(event) => setTexts((prev) => ({ ...prev, [question.id]: event.target.value }))}
                      rows={3}
                      placeholder={tr('Nhập câu trả lời của bạn…')}
                    />
                  )}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rp-line pt-4">
              {!hasAllRequiredAnswers && (
                <span className="text-xs text-rp-text-muted">{tr('Vui lòng hoàn thành tất cả câu hỏi trước khi nộp bài.')}</span>
              )}
              <Button
                variant="primary"
                loading={submit.isPending}
                disabled={submit.isPending || !hasAllRequiredAnswers}
                onClick={() => submit.mutate()}
              >
                {tr('Nộp bài')}
              </Button>
            </div>
          </Card>
        )}

        {result && (
          <div className="space-y-4">
            {(result.passed === true || (result.passed == null && Number(result.scorePercent) >= 70)) && (
              <CelebrationScene
                variant="inline"
                tier="lesson"
                onceKey={attempt?.attemptId ? `practice-${attempt.attemptId}` : undefined}
                badge={tr('Hoàn thành bài luyện tập')}
                title={tr('Bạn làm tốt lắm! Thêm một bước tiến rồi!')}
                description={tr('Kết quả luyện tập đã được ghi nhận vào tiến độ học tập của bạn.')}
                actions={(
                  <>
                    <Button as={Link} to="/roadmap/" variant="primary" size="sm">
                      {tr('Về lộ trình học')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setAttempt(null);
                        setResult(null);
                        listQuery.refetch();
                        quizQuery.refetch();
                      }}
                    >
                      {tr('Chọn bài khác')}
                    </Button>
                  </>
                )}
              />
            )}

            <Card className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-rp-brand">{tr('Kết quả')}</p>
                <p className="text-[32px] font-semibold tabular-nums text-rp-brand">
                  <AnimatedScoreReveal
                    key={attempt?.attemptId || 'practice-res'}
                    value={Math.round(Number(result.scorePercent) || 0)}
                    animate={
                      attempt?.attemptId
                        ? shouldPlayCelebration(`practice-score-${attempt.attemptId}`)
                        : true
                    }
                  />
                </p>
                <p className="text-xs text-rp-text-muted">
                  {result.correctCount}/{result.gradedQuestions || result.totalQuestions} {tr('câu đúng')}
                </p>
                <ProgressBar value={Number(result.scorePercent) || 0} max={100} label={tr('Kết quả bài tập')} />
              </div>
            <ul className="space-y-3">
              {(result.results || []).map((item) => {
                const q = questionLookup.get(item.questionId);
                const selectedOptText = q?.options?.find((o) => o.id === picks[item.questionId])?.optionText || texts[item.questionId];
                return (
                  <li key={item.questionId} className="rounded-xl border border-rp-line bg-rp-bg-2 px-4 py-3 text-[13px] space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {q && (
                        <p className="font-medium text-rp-text">
                          {q.number}. {q.questionText}
                        </p>
                      )}
                      <Badge tone={item.isCorrect == null ? 'info' : item.isCorrect ? 'success' : 'danger'} size="sm">
                        {item.isCorrect == null ? tr('Câu tự luận đã lưu') : item.isCorrect ? tr('Đúng') : tr('Chưa đúng')}
                      </Badge>
                    </div>
                    {selectedOptText && (
                      <p className="text-xs text-rp-text-2">
                        <span className="font-medium">{tr('Câu trả lời của bạn:')}</span> {selectedOptText}
                      </p>
                    )}
                    {item.explanation && (
                      <p className="leading-6 text-rp-text-2">
                        <HighlightableText
                          text={item.explanation}
                          contentId={`practice-exp-${item.questionId}`}
                          sourceTitle={tr('Giải thích bài tập')}
                        />
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <Button
              variant="secondary"
              onClick={() => {
                setAttempt(null);
                setResult(null);
                listQuery.refetch();
                quizQuery.refetch();
              }}
            >
              {tr('Chọn bài khác')}
            </Button>
          </Card>
          </div>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
