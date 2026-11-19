import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

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
import { notify } from '@/components/ui/feedbackStore.js';
import { describeApiError } from '@/api/apiErrors.js';
import { ContextualEmptyState, ContextualErrorState, SakuraLoader } from '@/components/ui';
import HighlightableText from '@/features/notebook/components/HighlightableText.jsx';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';

export default function LessonPractice() {
  const { tr } = useLocale();
  const session = getSession();
  const uid = session?.userId ?? 'anon';
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

  const submit = useMutation({
    mutationFn: () => {
      const answers = (attempt.questions || []).map((question) => ({
        questionId: question.id,
        selectedOptionId: picks[question.id] ?? null,
        ...(texts[question.id] ? { textAnswer: texts[question.id] } : {}),
      }));
      notify.loading(tr('Đang nộp bài tập…'), '', { key: 'lesson-ex-submit', maxWaitMs: 30000 });
      return source === 'quiz'
        ? submitQuizExercise(attempt.attemptId, answers)
        : submitLessonExercise(attempt.attemptId, answers);
    },
    onSuccess: (value) => {
      notify.success(tr('Đã nộp bài tập!'), '', { key: 'lesson-ex-submit', replace: true });
      setResult(value);
    },
    onError: (err) => notify.apiError(err, tr('Chưa nộp được bài tập'), { key: 'lesson-ex-submit', replace: true }),
  });

  const primary = Array.isArray(listQuery.data) ? listQuery.data : [];
  const quizzes = Array.isArray(quizQuery.data) ? quizQuery.data : [];
  const exercises = primary.length ? primary.map((item) => ({ ...item, kind: 'lesson' })) : quizzes.map((item) => ({ ...item, kind: 'quiz' }));
  const loadError = listQuery.isError ? listQuery.error : quizQuery.isError ? quizQuery.error : null;
  const actionError = start.error || submit.error;

  return (
    <LearnerShell pathname="/lesson-practice" breadcrumb={tr('Bài tập')}>
      <main className="rp-container-reading py-6 text-rp-text lg:py-8">
        <Link to={lessonId ? `/lesson-player/?lessonId=${lessonId}` : '/lessons/'} className={`text-[13px] font-medium rp-link ${focus}`}>
          {tr('Về bài học')}
        </Link>
        <header className="mt-3">
          <p className="text-[11px] font-medium tracking-[0.14em] text-rp-brand-strong">{tr('BÀI TẬP CỦA BÀI HỌC')}</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{tr('Làm bài rồi xem đáp án')}</h1>
        </header>

        {actionError && (
          <p role="alert" className="mt-4 rounded-xl bg-rp-brand-tint px-4 py-3 text-[13px] text-rp-brand-strong">
            {tr(describeApiError(actionError).message)}
          </p>
        )}
        {loadError && (
          <ContextualErrorState
            variant="inline"
            className="mt-4"
            error={loadError}
            title={tr('Chưa tải được bài tập của bài học')}
            onRetry={() => (listQuery.isError ? listQuery.refetch() : quizQuery.refetch())}
            retrying={listQuery.isFetching || quizQuery.isFetching}
          />
        )}
        {!lessonId && <p className="mt-4 text-[13px] text-rp-text-muted">{tr('Mở bài tập từ một bài học.')}</p>}
        {(listQuery.isLoading || quizQuery.isLoading) && lessonId > 0 && (
          <SakuraLoader variant="section" context="homework" label={tr('Đang tải bài tập…')} delay={160} className="mt-4" />
        )}

        {!attempt && exercises.length === 0 && listQuery.isSuccess && !quizQuery.isLoading && !quizQuery.isError && (
          <ContextualEmptyState
            className="mt-4 rounded-2xl border border-rp-line bg-white px-5"
            compact
            title={tr('Bài học này chưa có bài tập.')}
            description={tr('Bạn có thể quay lại bài học để tiếp tục phần nội dung khác.')}
          />
        )}

        {!attempt && exercises.length > 0 && (
          <ul className="mt-4 space-y-3">
            {exercises.map((exercise) => (
              <li key={exercise.id} className="rounded-2xl border border-rp-line bg-white px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-rp-brand-strong">{exercise.languageSkillName || tr('Luyện tập')}</p>
                    <h2 className="mt-1 text-[16px] font-semibold">{tr(exercise.title)}</h2>
                    {exercise.description && <p className="mt-1 text-[13px] leading-6 text-rp-text-muted">{tr(exercise.description)}</p>}
                    <p className="mt-2 text-[12px] text-rp-text-muted">
                      {exercise.questionCount} {tr('câu')}
                      {typeof exercise.bestScorePercent === 'number' ? ` · ${tr('Điểm cao nhất')} ${Math.round(exercise.bestScorePercent)}%` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={start.isPending}
                    onClick={() => start.mutate({ id: exercise.id, kind: exercise.kind })}
                    className={`h-9 rounded-lg bg-rp-brand-strong px-3 text-[12px] font-medium text-white hover:bg-rp-brand-deep disabled:opacity-50 ${focus}`}
                  >
                    {exercise.latestAttempt && !exercise.latestAttempt.isCompleted ? tr('Làm tiếp') : tr('Bắt đầu')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {attempt && !result && (
          <section data-notebook-ignore="true" className="mt-4 rounded-2xl border border-rp-line bg-white px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-semibold">{tr(attempt.title)}</h2>
              <button type="button" onClick={() => setAttempt(null)} className={`text-[12px] text-rp-text-muted ${focus}`}>{tr('Danh sách')}</button>
            </div>
            <ol className="mt-4 space-y-5">
              {(attempt.questions || []).map((question, index) => (
                <li key={question.id}>
                  <p className="text-[14px] font-medium">{index + 1}. {question.questionText}</p>
                  {question.options?.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {question.options.map((option) => (
                        <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-rp-line px-3 py-2 text-[13px] hover:bg-rp-brand-tint">
                          <input
                            type="radio"
                            name={`q-${question.id}`}
                            checked={picks[question.id] === option.id}
                            onChange={() => setPicks((prev) => ({ ...prev, [question.id]: option.id }))}
                          />
                          <span>{option.optionText}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={texts[question.id] || ''}
                      onChange={(event) => setTexts((prev) => ({ ...prev, [question.id]: event.target.value }))}
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-rp-line px-3 py-2 text-[13px] outline-none focus:border-rp-brand-strong"
                    />
                  )}
                </li>
              ))}
            </ol>
            <button
              type="button"
              disabled={submit.isPending}
              onClick={() => submit.mutate()}
              className={`mt-5 h-10 rounded-xl bg-rp-brand-strong px-4 text-[13px] font-medium text-white hover:bg-rp-brand-deep disabled:opacity-50 ${focus}`}
            >
              {submit.isPending ? tr('Đang chấm…') : tr('Nộp bài')}
            </button>
          </section>
        )}

        {result && (
          <section className="mt-4 rounded-2xl border border-rp-line bg-white px-5 py-5">
            <p className="text-[11px] font-medium tracking-[0.14em] text-rp-brand-strong">{tr('KẾT QUẢ')}</p>
            <p className="mt-2 text-[32px] font-semibold text-rp-brand-strong">{Math.round(result.scorePercent)}%</p>
            <p className="text-[13px] text-rp-text-muted">
              {result.correctCount}/{result.gradedQuestions || result.totalQuestions} {tr('câu đúng')}
            </p>
            <ul className="mt-4 space-y-3">
              {(result.results || []).map((item) => (
                <li key={item.questionId} className="rounded-xl bg-rp-brand-tint px-3 py-3 text-[13px]">
                  <p className={item.isCorrect ? 'text-rp-success' : 'text-rp-brand-strong'}>
                    {item.isCorrect == null ? tr('Câu tự luận đã lưu') : item.isCorrect ? tr('Đúng') : tr('Chưa đúng')}
                  </p>
                  {item.explanation && (
                    <p className="mt-1 leading-6 text-rp-text-2">
                      <HighlightableText
                        text={item.explanation}
                        contentId={`practice-exp-${item.questionId}`}
                        sourceTitle={tr('Giải thích bài tập')}
                      />
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => { setAttempt(null); setResult(null); listQuery.refetch(); quizQuery.refetch(); }}
              className={`mt-4 h-9 rounded-lg border border-rp-line px-3 text-[12px] ${focus}`}
            >
              {tr('Chọn bài khác')}
            </button>
          </section>
        )}
      </main>
    </LearnerShell>
  );
}
