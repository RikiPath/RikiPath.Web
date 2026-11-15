import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext.jsx';
import { getStandardAssessmentRoadmap } from '../../api/learningPathApi.js';
import { getMySubscription } from '../../api/subscriptions.js';
import LessonContent from './LessonContent.jsx';

const action = 'rounded-lg px-3 py-2 text-sm font-semibold text-[#AD3155] underline';
const skillNames = {
  Vocabulary: 'Từ vựng',
  Kanji: 'Hán tự',
  Grammar: 'Ngữ pháp',
  Reading: 'Đọc hiểu',
  Listening: 'Nghe hiểu',
  Speaking: 'Luyện nói',
  Writing: 'Luyện viết',
};

function LessonRow({ lesson, index, open, toggle, userId, refresh, canOpen, requiresPlan, recheckAccess }) {
  const skillName = skillNames[lesson.languageSkillName] ?? lesson.languageSkillName;
  const material = [
    lesson.kanjiCount > 0 && `${lesson.kanjiCount} Hán tự`,
    lesson.vocabularyCount > 0 && `${lesson.vocabularyCount} từ vựng`,
    lesson.grammarCount > 0 && `${lesson.grammarCount} mẫu ngữ pháp`,
  ].filter(Boolean).join(' · ');
  const status = lesson.isLocked ? 'Chờ đạt bài trước'
    : requiresPlan ? 'Cần gói tự học'
      : lesson.isCompleted ? 'Đã hoàn thành'
        : lesson.isStudied && !lesson.hasPracticeExercise ? 'Chưa có bài luyện tập'
          : lesson.isStudied ? 'Chờ làm bài luyện tập' : canOpen ? 'Sẵn sàng' : null;

  return <li id={'self-study-lesson-' + lesson.lessonId} className="scroll-mt-6">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="text-sm font-semibold"><span className="mr-2 text-[#AD3155]">{index + 1}.</span>{lesson.title}</h3>
          {skillName && <span className="rounded-md bg-[#FAF4F7] px-2 py-1 text-xs text-[#765E6B]">{skillName}</span>}
        </div>
        <p className="mt-1 text-xs text-[#765E6B]">{[status, material].filter(Boolean).join(' · ')}</p>
      </div>
      {canOpen && !lesson.isLocked && <button type="button" onClick={toggle} aria-expanded={open}
        className="shrink-0 rounded-lg border border-[#E4CBD6] px-3 py-2 text-xs font-semibold text-[#AD3155]">
        {open ? 'Thu gọn' : lesson.isCompleted ? 'Xem lại' : lesson.isStudied && lesson.hasPracticeExercise ? 'Làm bài luyện tập' : 'Mở bài'}
      </button>}
    </div>
    {open && <div className="mb-3 rounded-lg border border-[#EADFE5] p-3 sm:p-4">
      <LessonContent lesson={lesson} userId={userId} refresh={refresh} fromAssessmentRoadmap
        onAccessDenied={recheckAccess} />
    </div>}
  </li>;
}

export default function StandardAssessmentRoadmap({ targetLevelId }) {
  const { isAuthenticated, isLearner, session, user } = useAuth();
  const queryClient = useQueryClient();
  const [requestedLevel, setRequestedLevel] = useState(null);
  const [openLessonId, setOpenLessonId] = useState(null);
  const userId = user?.userId;
  const roadmapQuery = useQuery({
    queryKey: ['assessment-roadmap', userId, targetLevelId],
    queryFn: getStandardAssessmentRoadmap,
    enabled: isAuthenticated && isLearner,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const subscriptionQuery = useQuery({
    queryKey: ['study-subscription', session?.userId ?? userId],
    queryFn: getMySubscription,
    enabled: isAuthenticated && isLearner && !session?.isPreview,
    retry: false,
    staleTime: 0,
  });

  if (isAuthenticated && !isLearner) return null;

  const canOpenLessons = subscriptionQuery.data?.active === true;
  const requiresPlan = subscriptionQuery.isSuccess && !canOpenLessons;

  const roadmap = roadmapQuery.data;
  const levels = [...new Set([roadmap?.targetJlptLevelName, roadmap?.currentStudyLevelName].filter(Boolean))];
  const selectedLevel = levels.includes(requestedLevel) ? requestedLevel : levels[0];
  const lessons = roadmap?.lessons ?? [];
  const visibleLessons = lessons.filter(lesson => lesson.levelCode === selectedLevel);
  const completed = visibleLessons.filter(lesson => lesson.isCompleted).length;
  const nextLesson = visibleLessons.find(lesson => !lesson.isCompleted && !lesson.isLocked);
  const errorCode = roadmapQuery.error?.data?.errorCode;
  const refresh = () => Promise.all([
    roadmapQuery.refetch(),
    queryClient.invalidateQueries({ queryKey: ['self-study-catalog', userId] }),
  ]);

  return (
    <section aria-labelledby="self-study-roadmap-title"
      className="mb-5 scroll-mt-6 rounded-xl border border-[#E4CBD6] bg-white p-4 sm:p-5">
      <h2 id="self-study-roadmap-title" className="text-[17px] font-semibold">Lộ trình tự học hệ thống đề xuất</h2>
      {!isAuthenticated && <Link className={action} to="/auth/">Đăng nhập để xem lộ trình tự học</Link>}
      {isAuthenticated && roadmapQuery.isPending && <p className="mt-2 text-sm" role="status">Đang tải lộ trình tự học…</p>}
      {errorCode === 'STANDARD_ROADMAP_PLACEMENT_REQUIRED' &&
        <Link className={action} to="/app/placement-test">Làm bài đánh giá năng lực</Link>}
      {errorCode === 'STUDY_LEVEL_REQUIRED' && <Link className={action} to="/onboarding">Chọn mục tiêu JLPT</Link>}
      {roadmapQuery.isError && !['STANDARD_ROADMAP_PLACEMENT_REQUIRED', 'STUDY_LEVEL_REQUIRED'].includes(errorCode) && (
        <div role="alert" className="mt-2 text-sm">
          {roadmapQuery.error.message}
          <button type="button" className={action} onClick={() => roadmapQuery.refetch()}>Thử lại</button>
        </div>
      )}
      {roadmap && <>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#765E6B]">
          <span>JLPT {roadmap.currentStudyLevelName !== roadmap.targetJlptLevelName && roadmap.currentStudyLevelName + ' → '}{roadmap.targetJlptLevelName}</span>
          {roadmap.placementAttemptId && <Link className={action} to={'/app/placement-test/?attemptId=' + roadmap.placementAttemptId}>Xem kết quả đánh giá</Link>}
        </div>
        <div role="group" aria-label="Cấp độ bài học" className="mt-3 flex flex-wrap gap-2">
          {levels.map(level => <button key={level} type="button" aria-pressed={level === selectedLevel}
            onClick={() => {
              setRequestedLevel(level);
              setOpenLessonId(null);
            }}
            className={level === selectedLevel
              ? 'rounded-lg bg-[#AD3155] px-3 py-2 text-sm font-semibold text-white'
              : 'rounded-lg border border-[#E4CBD6] px-3 py-2 text-sm font-semibold text-[#AD3155]'}>
            {level === roadmap.targetJlptLevelName ? 'Học ' : 'Ôn lại '}{level} · {lessons.filter(lesson => lesson.levelCode === level).length} bài
          </button>)}
        </div>
        {visibleLessons.length === 0
          ? <p role="status" className="mt-3 text-sm text-[#765E6B]">Kho học liệu chưa có bài học JLPT {selectedLevel} khả dụng.</p>
          : <>
            {subscriptionQuery.isPending && !session?.isPreview && (
              <p role="status" className="mt-3 text-sm text-[#765E6B]">Đang kiểm tra quyền tự học…</p>
            )}
            {requiresPlan && (
              <div className="mt-4 rounded-lg bg-[#FAF4F7] px-3 py-2 text-sm text-[#765E6B]">
                <p>Bạn cần gói tự học đang hiệu lực để mở bài và làm bài luyện tập.</p>
                <Link className={action + ' inline-block'} to="/plans/">Xem gói tự học</Link>
                <button type="button" onClick={() => subscriptionQuery.refetch()} className={action}
                  disabled={subscriptionQuery.isFetching}>Kiểm tra lại quyền</button>
              </div>
            )}
            {subscriptionQuery.isError && (
              <div role="alert" className="mt-3 text-sm">
                Chưa kiểm tra được quyền tự học.
                <button type="button" onClick={() => subscriptionQuery.refetch()} className={action}
                  disabled={subscriptionQuery.isFetching}>Thử lại</button>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{completed}/{visibleLessons.length} bài {selectedLevel} hoàn thành</p>
                <p className="mt-1 text-xs text-[#765E6B]">Học theo thứ tự. Đạt bài luyện tập để mở bài kế tiếp.</p>
              </div>
              {canOpenLessons && nextLesson && <a href={'#self-study-lesson-' + nextLesson.lessonId}
                onClick={() => setOpenLessonId(nextLesson.lessonId)}
                className="text-sm font-semibold text-[#AD3155] underline">
                {completed === 0 && !nextLesson.isStudied ? 'Bắt đầu học' : 'Tiếp tục học'}
              </a>}
            </div>
            <ol className="mt-3 divide-y divide-[#EADFE5] border-y border-[#EADFE5]">
              {visibleLessons.map((lesson, index) => (
                <LessonRow key={lesson.lessonId} lesson={lesson} index={index}
                  userId={userId} refresh={refresh} canOpen={canOpenLessons} requiresPlan={requiresPlan}
                  recheckAccess={subscriptionQuery.refetch}
                  open={canOpenLessons && !lesson.isLocked && openLessonId === lesson.lessonId}
                  toggle={() => setOpenLessonId(id => id === lesson.lessonId ? null : lesson.lessonId)} />
              ))}
            </ol>
          </>}
      </>}
    </section>
  );
}
