import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import PracticeQuestionFields from '../../components/PracticeQuestionFields.jsx';
import LessonStudyMaterial from '../../components/LessonStudyMaterial.jsx';
import {
  completeLesson, getLessonDetail, getLessonPracticeExercises,
  startPracticeExercise, submitPracticeExerciseAttempt,
  completeAssessmentRoadmapLesson, getAssessmentRoadmapLesson, getAssessmentRoadmapExercises,
  startAssessmentRoadmapPractice, submitAssessmentRoadmapPractice,
} from '../../api/learningPathApi.js';

function LessonLoadError({ message, retry }) {
  return <div role="alert" className="rounded-xl border border-rose-200 bg-white p-4 text-sm">
    <p>{message}</p>
    <button type="button" onClick={retry} className="mt-2 font-semibold text-primary underline">
      Thử lại
    </button>
  </div>;
}

function LessonPractice({ lesson, studied, skill, userId, onStudied, refresh, fromAssessmentRoadmap }) {
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const exercises = useQuery({
    queryKey: ['catalog-practice', userId, lesson.lessonId, fromAssessmentRoadmap],
    queryFn: () => fromAssessmentRoadmap
      ? getAssessmentRoadmapExercises(lesson.lessonId)
      : getLessonPracticeExercises(lesson.lessonId),
    enabled: studied && lesson.hasPracticeExercise,
  });
  const mark = useMutation({
    mutationFn: () => fromAssessmentRoadmap
      ? completeAssessmentRoadmapLesson(lesson.lessonId)
      : completeLesson(lesson.lessonId),
    onSuccess: onStudied,
  });
  const start = useMutation({
    mutationFn: id => fromAssessmentRoadmap
      ? startAssessmentRoadmapPractice(id)
      : startPracticeExercise(id, { fromCatalog: true, skill }),
    onSuccess: value => {
      setAttempt(value);
      setAnswers({});
      setResult(null);
    },
  });
  const submit = useMutation({
    mutationFn: () => {
      const submitAttempt = fromAssessmentRoadmap ? submitAssessmentRoadmapPractice : submitPracticeExerciseAttempt;
      return submitAttempt(attempt.attemptId, attempt.questions.map(question => ({
        questionId: question.questionId, selectedOptionId: answers[question.questionId],
      })));
    },
    onSuccess: async value => {
      setResult(value);
      setAttempt(null);
      await Promise.all([refresh(), exercises.refetch()]);
    },
  });
  const availableExercises = exercises.data ?? [];
  const chosenExercise = availableExercises.find(exercise => exercise.passed) ?? availableExercises[0];
  const visibleExercises = fromAssessmentRoadmap
    ? (chosenExercise ? [chosenExercise] : [])
    : availableExercises;
  const error = mark.error || start.error || submit.error || exercises.error;
  const busy = mark.isPending || start.isPending || submit.isPending;
  const button = 'rounded-lg border border-card-border px-3 py-2 font-semibold text-primary disabled:opacity-50';

  return <section className="mt-5 space-y-3 border-t border-card-border pt-4 text-sm">
    {!studied && <button type="button" className={button} disabled={busy} onClick={() => mark.mutate()}>
      {mark.isPending ? 'Đang lưu…' : 'Đã học xong'}
    </button>}
    {studied && !lesson.hasPracticeExercise && <p>
      {fromAssessmentRoadmap
        ? 'Bài này chưa có bài luyện tập hợp lệ. Bài kế tiếp sẽ mở khi bạn đạt bài luyện tập.'
        : 'Đã học xong. Bài này chưa có bài luyện tập.'}
    </p>}
    {studied && lesson.hasPracticeExercise && <h3 className="font-semibold">Bài luyện tập của bài học</h3>}
    {studied && lesson.hasPracticeExercise && exercises.isPending && <p role="status">Đang tải bài luyện tập…</p>}
    {studied && lesson.hasPracticeExercise && exercises.isSuccess && !visibleExercises.length &&
      <p role="status">Chưa có bài luyện tập khả dụng.</p>}
    {studied && !attempt && visibleExercises.map(exercise => {
      const isRetry = exercise.passed || result?.practiceExerciseId === exercise.practiceExerciseId;
      const label = isRetry ? 'Làm lại bài luyện tập' : 'Bắt đầu làm bài';
      return <div key={exercise.practiceExerciseId}
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-card-border p-3">
        <div>
          <p className="font-semibold">{exercise.title}</p>
          <p className="mt-1 text-xs text-[#765E6B]">
            {exercise.passed ? 'Đã đạt' : 'Điểm đạt ' + exercise.minimumPassingScorePercent + '%'}
          </p>
        </div>
        <button type="button" className={button} disabled={busy}
          aria-label={label + ' – ' + exercise.title}
          onClick={() => start.mutate(exercise.practiceExerciseId)}>
          {label}
        </button>
      </div>;
    })}
    {attempt && <div className="space-y-3">
      <h4 className="font-semibold">{attempt.exerciseTitle}</h4>
      <PracticeQuestionFields name={'catalog-practice-' + attempt.attemptId} questions={attempt.questions}
        answers={answers} disabled={busy}
        onAnswer={(questionId, optionId) => setAnswers(previous => ({ ...previous, [questionId]: optionId }))} />
      <button type="button" className={button} onClick={() => submit.mutate()}
        disabled={busy || attempt.questions.some(question => !answers[question.questionId])}>
        {submit.isPending ? 'Đang chấm…' : 'Nộp bài luyện tập'}
      </button>
    </div>}
    {result && <p role="status">{result.scorePercent}% · {result.correctCount}/{result.totalQuestions} câu đúng · {result.passed
      ? 'Đã đạt bài luyện tập.'
      : 'Chưa đạt. Bạn có thể làm lại.'}</p>}
    {error && <p role="alert" className="text-rose-700">{error.message}</p>}
    {exercises.isError && <button type="button" className={button} onClick={() => exercises.refetch()}>Tải lại bài luyện tập</button>}
  </section>;
}

export default function LessonContent({ lesson, userId, skill, refresh, fromAssessmentRoadmap = false, onAccessDenied }) {
  const { lessonId } = lesson;
  const queryClient = useQueryClient();
  const detailKey = ['self-study-lesson', userId, lessonId, fromAssessmentRoadmap];
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: () => fromAssessmentRoadmap ? getAssessmentRoadmapLesson(lessonId) : getLessonDetail(lessonId),
    retry: false,
    refetchOnMount: fromAssessmentRoadmap ? 'always' : true,
  });
  const requiresPlan = detail.error?.data?.errorCode === 'SELF_STUDY_PACKAGE_REQUIRED';
  useEffect(() => {
    if (requiresPlan) void onAccessDenied?.();
  }, [requiresPlan, onAccessDenied]);

  if (detail.isPending) return <p role="status">Đang tải nội dung…</p>;
  if (requiresPlan) {
    return <div role="alert" className="text-sm">
      {detail.error.message}{' '}
      <Link to="/plans" className="font-semibold text-primary underline">Xem gói tự học</Link>
    </div>;
  }
  if (detail.isError) return <LessonLoadError
    message={detail.error?.message || 'Chưa tải được nội dung bài học.'} retry={detail.refetch} />;

  const studied = detail.data.isCompleted || lesson.practicePassed;
  return <div className="space-y-4 text-sm leading-relaxed">
    <LessonStudyMaterial detail={detail.data} />
    <LessonPractice lesson={lesson} userId={userId} studied={studied} skill={skill} refresh={refresh}
      fromAssessmentRoadmap={fromAssessmentRoadmap}
      onStudied={async updated => {
        queryClient.setQueriesData({ queryKey: ['self-study-lesson', userId, lessonId] }, updated);
        await refresh();
      }} />
  </div>;
}

