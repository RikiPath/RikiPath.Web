import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/app/auth/authContext.js';
import { getStandardAssessmentRoadmap } from '@/features/learning-path/api/learningPathApi.js';
import { getMySubscription } from '@/features/checkout/api/subscriptionApi.js';
import { SakuraLoader } from '@/components/ui';
import LessonContent from './LessonContent.jsx';
import { useLocale } from '@/locales/locale.js';

const action = 'rounded-lg px-3 py-2 text-sm font-semibold text-rp-brand-strong underline';
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
  const { trf, tr } = useLocale();
  const skillName = skillNames[lesson.languageSkillName] ?? lesson.languageSkillName;
  const material = [
    lesson.kanjiCount > 0 && trf('{0} Hán tự', { 0: lesson.kanjiCount }),
    lesson.vocabularyCount > 0 && trf('{0} từ vựng', { 0: lesson.vocabularyCount }),
    lesson.grammarCount > 0 && trf('{0} mẫu ngữ pháp', { 0: lesson.grammarCount }),
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
          <h3 className="text-sm font-semibold"><span className="mr-2 text-rp-brand-strong">{index + 1}.</span>{tr(lesson.title)}</h3>
          {skillName && <span className="rounded-md bg-rp-brand-tint px-2 py-1 text-xs text-rp-text-2">{skillName}</span>}
        </div>
        <p className="mt-1 text-xs text-rp-text-2">{[status, material].filter(Boolean).join(' · ')}</p>
      </div>
      {canOpen && !lesson.isLocked && <button type="button" onClick={toggle} aria-expanded={open}
        className="shrink-0 rounded-lg border border-rp-brand-border px-3 py-2 text-xs font-semibold text-rp-brand-strong">
        {open ? tr('Thu gọn') : lesson.isCompleted ? tr('Xem lại') : lesson.isStudied && lesson.hasPracticeExercise ? tr('Làm bài luyện tập') : tr('Mở bài')}
      </button>}
    </div>
    {open && <div className="mb-3 rounded-lg border border-rp-line p-3 sm:p-4">
      <LessonContent lesson={lesson} userId={userId} refresh={refresh} fromAssessmentRoadmap
        onAccessDenied={recheckAccess} />
    </div>}
  </li>;
}

export default function StandardAssessmentRoadmap({ targetLevelId }) {
  const { tr, trf } = useLocale();
  const { isAuthenticated, isLearner, session, user } = useAuth();
  const queryClient = useQueryClient();
  const [requestedLevel, setRequestedLevel] = useState(null);
  const [openLessonId, setOpenLessonId] = useState(null);
  const userId = user?.userId;
  const roadmapQuery = useQuery({
    queryKey: ['assessment-roadmap', userId, targetLevelId, session?.isPreview ? 'preview' : 'live'],
    queryFn: getStandardAssessmentRoadmap,
    enabled: isAuthenticated && isLearner && !session?.isPreview,
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
  if (session?.isPreview) {
    return (
      <section aria-labelledby="self-study-roadmap-title" className="mb-5 scroll-mt-6 rounded-xl border border-rp-brand-border bg-white p-4 sm:p-5">
        <h2 id="self-study-roadmap-title" className="text-[17px] font-semibold">{tr('Lộ trình tự học hệ thống đề xuất')}</h2>
        <p className="mt-2 text-sm text-rp-text-muted">{tr('Lộ trình cá nhân hóa theo bài đánh giá năng lực hiển thị khi đăng nhập bằng tài khoản học viên.')}</p>
      </section>
    );
  }

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
      className="mb-5 scroll-mt-6 rounded-xl border border-rp-brand-border bg-white p-4 sm:p-5">
      <h2 id="self-study-roadmap-title" className="text-[17px] font-semibold">{tr('Lộ trình tự học hệ thống đề xuất')}</h2>
      {!isAuthenticated && <Link className={action} to="/auth/">{tr('Đăng nhập để xem lộ trình tự học')}</Link>}
      {isAuthenticated && roadmapQuery.isPending && (
        <SakuraLoader variant="section" context="roadmap" delay={160} className="mt-2" />
      )}
      {errorCode === 'STANDARD_ROADMAP_PLACEMENT_REQUIRED' &&
        <Link className={action} to="/app/placement-test">{tr('Làm bài đánh giá năng lực')}</Link>}
      {errorCode === 'STUDY_LEVEL_REQUIRED' && <Link className={action} to="/onboarding">{tr('Chọn mục tiêu JLPT')}</Link>}
      {roadmapQuery.isError && !['STANDARD_ROADMAP_PLACEMENT_REQUIRED', 'STUDY_LEVEL_REQUIRED'].includes(errorCode) && (
        <div role="alert" className="mt-2 text-sm">
          {tr(roadmapQuery.error.message)}
          <button type="button" className={action} onClick={() => roadmapQuery.refetch()}>{tr('Thử lại')}</button>
        </div>
      )}
      {roadmap && <>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-rp-text-2">
          <span>JLPT {roadmap.currentStudyLevelName !== roadmap.targetJlptLevelName && roadmap.currentStudyLevelName + ' → '}{roadmap.targetJlptLevelName}</span>
          {roadmap.placementAttemptId && <Link className={action} to={'/app/placement-test/?attemptId=' + roadmap.placementAttemptId}>{tr('Xem kết quả đánh giá')}</Link>}
        </div>
        <div role="group" aria-label={tr('Cấp độ bài học')} className="mt-3 flex flex-wrap gap-2">
          {levels.map(level => <button key={level} type="button" aria-pressed={level === selectedLevel}
            onClick={() => {
              setRequestedLevel(level);
              setOpenLessonId(null);
            }}
            className={level === selectedLevel
              ? 'rounded-lg bg-rp-brand-strong px-3 py-2 text-sm font-semibold text-white'
              : 'rounded-lg border border-rp-brand-border px-3 py-2 text-sm font-semibold text-rp-brand-strong'}>
            {level === roadmap.targetJlptLevelName ? tr('Học ') : tr('Ôn lại ')}{level} · {lessons.filter(lesson => lesson.levelCode === level).length}{' '}{tr('bài')}
          </button>)}
        </div>
        {visibleLessons.length === 0
          ? <p role="status" className="mt-3 text-sm text-rp-text-2">{trf('Kho học liệu chưa có bài học JLPT {0} khả dụng.', { 0: selectedLevel })}</p>
          : <>
            {subscriptionQuery.isPending && !session?.isPreview && (
              <SakuraLoader
                variant="section"
                context="payment"
                label={tr('Đang kiểm tra quyền tự học')}
                delay={160}
                className="mt-3"
              />
            )}
            {requiresPlan && (
              <div className="mt-4 rounded-lg bg-rp-brand-tint px-3 py-2 text-sm text-rp-text-2">
                <p>{tr('Bạn cần gói tự học đang hiệu lực để mở bài và làm bài luyện tập.')}</p>
                <Link className={action + ' inline-block'} to="/plans/">{tr('Xem gói tự học')}</Link>
                <button type="button" onClick={() => subscriptionQuery.refetch()} className={action}
                  disabled={subscriptionQuery.isFetching}>{tr('Kiểm tra lại quyền')}</button>
              </div>
            )}
            {subscriptionQuery.isError && (
              <div role="alert" className="mt-3 text-sm">
                {tr('Chưa kiểm tra được quyền tự học.')}
                <button type="button" onClick={() => subscriptionQuery.refetch()} className={action}
                  disabled={subscriptionQuery.isFetching}>{tr('Thử lại')}</button>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{trf('{0}/{1} bài {2} hoàn thành', { 0: completed, 1: visibleLessons.length, 2: selectedLevel })}</p>
                <p className="mt-1 text-xs text-rp-text-2">{tr('Học theo thứ tự. Đạt bài luyện tập để mở bài kế tiếp.')}</p>
              </div>
              {canOpenLessons && nextLesson && <a href={'#self-study-lesson-' + nextLesson.lessonId}
                onClick={() => setOpenLessonId(nextLesson.lessonId)}
                className="text-sm font-semibold text-rp-brand-strong underline">
                {completed === 0 && !nextLesson.isStudied ? tr('Bắt đầu học') : tr('Tiếp tục học')}
              </a>}
            </div>
            <ol className="mt-3 divide-y divide-rp-line border-y border-rp-line">
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
