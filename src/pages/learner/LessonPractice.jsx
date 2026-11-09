import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import {
  getLessonExercises,
  startLessonExercise,
  submitLessonExercise,
} from '../../api/practiceExerciseApi.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function LessonPractice() {
  const { tr } = useLocale();
  const [params] = useSearchParams();
  const lessonId = Number(params.get('lessonId')) || 0;
  const [attempt, setAttempt] = useState(null);
  const [picks, setPicks] = useState({});
  const [texts, setTexts] = useState({});
  const [result, setResult] = useState(null);

  const listQuery = useQuery({
    queryKey: ['lesson-exercises', lessonId],
    queryFn: () => getLessonExercises(lessonId),
    enabled: lessonId > 0,
  });

  const start = useMutation({
    mutationFn: startLessonExercise,
    onSuccess: (data) => {
      const saved = Object.fromEntries((data.savedAnswers || []).map((item) => [item.questionId, item]));
      setAttempt(data);
      setResult(null);
      setPicks(Object.fromEntries(Object.entries(saved).filter(([, item]) => item.selectedOptionId).map(([id, item]) => [id, item.selectedOptionId])));
      setTexts(Object.fromEntries(Object.entries(saved).filter(([, item]) => item.textAnswer).map(([id, item]) => [id, item.textAnswer])));
    },
  });

  const submit = useMutation({
    mutationFn: () => submitLessonExercise(attempt.attemptId, (attempt.questions || []).map((question) => ({
      questionId: question.id,
      selectedOptionId: picks[question.id] ?? null,
      ...(texts[question.id] ? { textAnswer: texts[question.id] } : {}),
    }))),
    onSuccess: setResult,
  });

  const exercises = Array.isArray(listQuery.data) ? listQuery.data : [];
  const error = listQuery.error || start.error || submit.error;

  return (
    <LearnerShell pathname="/lesson-practice" breadcrumb={tr('Bài tập')}>
      <main className="mx-auto max-w-[860px] px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:px-7">
        <Link to={lessonId ? `/lesson-player/?lessonId=${lessonId}` : '/lessons/'} className={`text-[13px] font-medium text-[#AD3155] hover:underline ${focus}`}>
          {tr('Về bài học')}
        </Link>
        <header className="mt-3">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">{tr('BÀI TẬP CỦA BÀI HỌC')}</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{tr('Làm bài rồi xem đáp án')}</h1>
        </header>

        {error && <p role="alert" className="mt-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{error.message}</p>}
        {!lessonId && <p className="mt-4 text-[13px] text-[#8C7782]">{tr('Mở bài tập từ một bài học.')}</p>}
        {listQuery.isPending && lessonId > 0 && <p className="mt-4 text-[13px] text-[#8C7782]">{tr('Đang tải bài tập…')}</p>}

        {!attempt && exercises.length === 0 && listQuery.isSuccess && (
          <p className="mt-4 rounded-2xl border border-[#EADFE5] bg-white px-5 py-8 text-[14px] text-[#8C7782]">{tr('Bài học này chưa có bài tập.')}</p>
        )}

        {!attempt && exercises.length > 0 && (
          <ul className="mt-4 space-y-3">
            {exercises.map((exercise) => (
              <li key={exercise.id} className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-[#AD3155]">{exercise.languageSkillName || tr('Luyện tập')}</p>
                    <h2 className="mt-1 text-[16px] font-semibold">{exercise.title}</h2>
                    {exercise.description && <p className="mt-1 text-[13px] leading-6 text-[#8C7782]">{exercise.description}</p>}
                    <p className="mt-2 text-[12px] text-[#8C7782]">
                      {exercise.questionCount} {tr('câu')}
                      {typeof exercise.bestScorePercent === 'number' ? ` · ${tr('Điểm cao nhất')} ${Math.round(exercise.bestScorePercent)}%` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={start.isPending}
                    onClick={() => start.mutate(exercise.id)}
                    className={`h-9 rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}
                  >
                    {exercise.latestAttempt && !exercise.latestAttempt.isCompleted ? tr('Làm tiếp') : tr('Bắt đầu')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {attempt && !result && (
          <section className="mt-4 rounded-2xl border border-[#EADFE5] bg-white px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-semibold">{attempt.title}</h2>
              <button type="button" onClick={() => setAttempt(null)} className={`text-[12px] text-[#8C7782] ${focus}`}>{tr('Danh sách')}</button>
            </div>
            <ol className="mt-4 space-y-5">
              {(attempt.questions || []).map((question, index) => (
                <li key={question.id}>
                  <p className="text-[14px] font-medium">{index + 1}. {question.questionText}</p>
                  {question.options?.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {question.options.map((option) => (
                        <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#F0E4E8] px-3 py-2 text-[13px] hover:bg-[#FDF6F8]">
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
                      className="mt-2 w-full rounded-xl border border-[#EADFE5] px-3 py-2 text-[13px] outline-none focus:border-[#AD3155]"
                    />
                  )}
                </li>
              ))}
            </ol>
            <button
              type="button"
              disabled={submit.isPending}
              onClick={() => submit.mutate()}
              className={`mt-5 h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}
            >
              {submit.isPending ? tr('Đang chấm…') : tr('Nộp bài')}
            </button>
          </section>
        )}

        {result && (
          <section className="mt-4 rounded-2xl border border-[#EADFE5] bg-white px-5 py-5">
            <p className="text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">{tr('KẾT QUẢ')}</p>
            <p className="mt-2 text-[32px] font-semibold text-[#AD3155]">{Math.round(result.scorePercent)}%</p>
            <p className="text-[13px] text-[#8C7782]">
              {result.correctCount}/{result.gradedQuestions || result.totalQuestions} {tr('câu đúng')}
            </p>
            <ul className="mt-4 space-y-3">
              {(result.results || []).map((item) => (
                <li key={item.questionId} className="rounded-xl bg-[#FCF7F9] px-3 py-3 text-[13px]">
                  <p className={item.isCorrect ? 'text-[#2F6B45]' : 'text-[#A33357]'}>
                    {item.isCorrect == null ? tr('Câu tự luận đã lưu') : item.isCorrect ? tr('Đúng') : tr('Chưa đúng')}
                  </p>
                  {item.explanation && <p className="mt-1 leading-6 text-[#6F5C66]">{item.explanation}</p>}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => { setAttempt(null); setResult(null); listQuery.refetch(); }}
              className={`mt-4 h-9 rounded-lg border border-[#E7DAE1] px-3 text-[12px] ${focus}`}
            >
              {tr('Chọn bài khác')}
            </button>
          </section>
        )}
      </main>
    </LearnerShell>
  );
}
