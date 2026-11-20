import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import PracticeQuestionFields from '@/features/practice/components/PracticeQuestionFields.jsx';
import LessonStudyMaterial from '@/features/practice/components/LessonStudyMaterial.jsx';
import {
  completeLesson, getLessonDetail, getLessonPracticeExercises,
  startPracticeExercise, submitPracticeExerciseAttempt,
  completeAssessmentRoadmapLesson, getAssessmentRoadmapLesson, getAssessmentRoadmapExercises,
  startAssessmentRoadmapPractice, submitAssessmentRoadmapPractice,
} from '@/features/learning-path/api/learningPathApi.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { Badge, Banner, Button, SakuraLoader } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

function LessonLoadError({ message, retry }) {
  const { tr } = useLocale();
  return <Banner tone="danger" actions={<Button variant="secondary" size="sm" onClick={retry}>{tr('Thử lại')}</Button>}>
    {tr(message)}
  </Banner>;
}

function LessonPractice({ lesson, studied, skill, userId, onStudied, refresh, fromAssessmentRoadmap }) {
  const { tr } = useLocale();
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
    onSuccess: (res) => {
      notify.success('Đã đánh dấu hoàn thành bài học!', '', { key: `lesson-studied-${lesson.lessonId}` });
      onStudied?.(res);
    },
    onError: (err) => notify.apiError(err, 'Chưa lưu tiến độ bài học', { key: `lesson-studied-err-${lesson.lessonId}` }),
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
    onError: (err) => notify.apiError(err, 'Không mở được bài luyện tập', { key: 'lesson-practice-start-err' }),
  });
  const submit = useMutation({
    mutationFn: () => {
      const submitAttempt = fromAssessmentRoadmap ? submitAssessmentRoadmapPractice : submitPracticeExerciseAttempt;
      notify.loading('Đang nộp bài luyện tập…', '', { key: 'lesson-practice-submit', maxWaitMs: 30000 });
      return submitAttempt(attempt.attemptId, attempt.questions.map(question => ({
        questionId: question.questionId, selectedOptionId: answers[question.questionId],
      })));
    },
    onSuccess: async value => {
      if (value?.passed === false) {
        notify.info('Đã chấm bài luyện tập', 'Bạn có thể xem lại đáp án và làm lại để đạt điểm yêu cầu.', { key: 'lesson-practice-submit', replace: true });
      } else {
        notify.success('Đã hoàn thành bài luyện tập!', '', { key: 'lesson-practice-submit', replace: true });
      }
      setResult(value);
      setAttempt(null);
      await Promise.all([refresh(), exercises.refetch()]);
    },
    onError: (err) => notify.apiError(err, 'Chưa nộp được bài luyện tập', { key: 'lesson-practice-submit', replace: true }),
  });
  const availableExercises = exercises.data ?? [];
  const chosenExercise = availableExercises.find(exercise => exercise.passed) ?? availableExercises[0];
  const visibleExercises = fromAssessmentRoadmap
    ? (chosenExercise ? [chosenExercise] : [])
    : availableExercises;
  const error = mark.error || start.error || submit.error || exercises.error;
  const busy = mark.isPending || start.isPending || submit.isPending;

  return <section className="mt-5 space-y-3 border-t border-rp-line pt-4 text-sm">
    {!studied && (
      <Button variant="primary" size="sm" loading={mark.isPending} disabled={busy} onClick={() => mark.mutate()}>
        {tr('Đã học xong')}
      </Button>
    )}
    {studied && !lesson.hasPracticeExercise && <p>
      {fromAssessmentRoadmap
        ? tr('Bài này chưa có bài luyện tập hợp lệ. Bài kế tiếp sẽ mở khi bạn đạt bài luyện tập.')
        : tr('Đã học xong. Bài này chưa có bài luyện tập.')}
    </p>}
    {studied && lesson.hasPracticeExercise && <h3 className="font-semibold">{tr('Bài luyện tập của bài học')}</h3>}
    {studied && lesson.hasPracticeExercise && exercises.isPending && (
      <SakuraLoader variant="section" context="homework" delay={160} />
    )}
    {studied && lesson.hasPracticeExercise && exercises.isSuccess && !visibleExercises.length &&
      <p role="status">{tr('Chưa có bài luyện tập khả dụng.')}</p>}
    {studied && !attempt && visibleExercises.map(exercise => {
      const isRetry = exercise.passed || result?.practiceExerciseId === exercise.practiceExerciseId;
      const label = isRetry ? 'Làm lại bài luyện tập' : 'Bắt đầu làm bài';
      return <div key={exercise.practiceExerciseId}
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-surface p-3">
        <div>
          <p className="font-semibold text-rp-text">{tr(exercise.title)}</p>
          <p className="mt-1 text-xs text-rp-text-2">
            {exercise.passed ? <Badge tone="success" size="sm">{tr('Đã đạt')}</Badge> : `${tr('Điểm đạt')} ${exercise.minimumPassingScorePercent}%`}
          </p>
        </div>
        <Button variant="soft" size="sm" disabled={busy}
          aria-label={`${label} – ${exercise.title}`}
          onClick={() => start.mutate(exercise.practiceExerciseId)}>
          {tr(label)}
        </Button>
      </div>;
    })}
    {attempt && <div className="space-y-3">
      <h4 className="font-semibold text-rp-text">{attempt.exerciseTitle}</h4>
      <PracticeQuestionFields name={`catalog-practice-${attempt.attemptId}`} questions={attempt.questions}
        answers={answers} disabled={busy}
        onAnswer={(questionId, optionId) => setAnswers(previous => ({ ...previous, [questionId]: optionId }))} />
      <Button variant="primary" size="sm" loading={submit.isPending} onClick={() => submit.mutate()}
        disabled={busy || attempt.questions.some(question => !answers[question.questionId])}>
        {tr('Nộp bài luyện tập')}
      </Button>
    </div>}
    {result && <Banner tone={result.passed ? 'success' : 'warning'} role="status">
      {result.scorePercent}% · {result.correctCount}/{result.totalQuestions} {tr('câu đúng ·')} {result.passed
        ? tr('Đã đạt bài luyện tập.')
        : tr('Chưa đạt. Bạn có thể làm lại.')}
    </Banner>}
    {error && <Banner tone="danger">{tr(error.message)}</Banner>}
    {exercises.isError && <Button variant="secondary" size="sm" onClick={() => exercises.refetch()}>{tr('Tải lại bài luyện tập')}</Button>}
  </section>;
}

export default function LessonContent({ lesson, userId, skill, refresh, fromAssessmentRoadmap = false, onAccessDenied }) {
  const { tr } = useLocale();
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

  if (detail.isPending) return <SakuraLoader variant="section" context="lesson" delay={160} />;
  if (requiresPlan) {
    return <div role="alert" className="text-sm">
      {tr(detail.error.message)}{' '}
      <Link to="/plans" className="font-semibold text-primary underline">{tr('Xem gói tự học')}</Link>
    </div>;
  }
  if (detail.isError) return <LessonLoadError
    message={detail.error?.message || tr('Chưa tải được nội dung bài học.')} retry={detail.refetch} />;

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

