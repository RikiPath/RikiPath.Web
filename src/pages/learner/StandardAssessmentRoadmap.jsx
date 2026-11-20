import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '@/app/auth/authContext.js';
import { getStandardAssessmentRoadmap } from '@/features/learning-path/api/learningPathApi.js';
import { getMySubscription } from '@/features/checkout/api/subscriptionApi.js';
import { Badge, Banner, Button, Card, ProgressBar, SakuraLoader } from '@/components/ui';
import LessonContent from './LessonContent.jsx';
import { useLocale } from '@/locales/locale.js';

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
  const skillName = skillNames[lesson.languageSkillName] ? tr(skillNames[lesson.languageSkillName]) : lesson.languageSkillName;
  const material = [
    lesson.kanjiCount > 0 && trf('{0} Hán tự', { 0: lesson.kanjiCount }),
    lesson.vocabularyCount > 0 && trf('{0} từ vựng', { 0: lesson.vocabularyCount }),
    lesson.grammarCount > 0 && trf('{0} mẫu ngữ pháp', { 0: lesson.grammarCount }),
  ].filter(Boolean).join(' · ');

  const statusText = lesson.isLocked ? tr('Chờ đạt bài trước')
    : requiresPlan ? tr('Cần gói tự học')
      : lesson.isCompleted ? tr('Đã hoàn thành')
        : lesson.isStudied && !lesson.hasPracticeExercise ? tr('Chưa có bài luyện tập')
          : lesson.isStudied ? tr('Chờ làm bài luyện tập') : canOpen ? tr('Sẵn sàng') : null;

  const tone = lesson.isCompleted ? 'success' : lesson.isLocked ? 'neutral' : requiresPlan ? 'warning' : 'brand';

  return (
    <li id={`self-study-lesson-${lesson.lessonId}`} className="scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-rp-text">
              <span className="mr-2 text-rp-brand-strong">{index + 1}.</span>
              {tr(lesson.title)}
            </h3>
            {skillName && <Badge tone="brand" icon={false} size="sm">{skillName}</Badge>}
            {statusText && (
              <Badge tone={tone} icon={lesson.isLocked ? Lock : undefined} size="sm">
                {statusText}
              </Badge>
            )}
          </div>
          {material && <p className="mt-1 text-xs text-rp-text-muted">{material}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canOpen && !lesson.isLocked && (
            <>
              <Link to={`/lesson-player/?lessonId=${lesson.lessonId}`}>
                <Button variant="ghost" size="sm">{tr('Mở trang bài')}</Button>
              </Link>
              <Button variant={open ? 'secondary' : 'soft'} size="sm" onClick={toggle} aria-expanded={open}>
                {open ? tr('Thu gọn') : lesson.isCompleted ? tr('Xem lại') : lesson.isStudied && lesson.hasPracticeExercise ? tr('Làm bài luyện tập') : tr('Mở bài')}
              </Button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="mb-3 rounded-xl border border-rp-line bg-rp-bg-2 p-3 sm:p-4">
          <LessonContent
            lesson={lesson}
            userId={userId}
            refresh={refresh}
            fromAssessmentRoadmap
            onAccessDenied={recheckAccess}
          />
        </div>
      )}
    </li>
  );
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
      <Card aria-labelledby="self-study-roadmap-title" className="mb-5 scroll-mt-6">
        <h2 id="self-study-roadmap-title" className="text-[17px] font-semibold text-rp-text">{tr('Lộ trình tự học hệ thống đề xuất')}</h2>
        <p className="mt-2 text-sm text-rp-text-muted">{tr('Lộ trình cá nhân hóa theo bài đánh giá năng lực hiển thị khi đăng nhập bằng tài khoản học viên.')}</p>
      </Card>
    );
  }

  const canOpenLessons = subscriptionQuery.data?.active === true;
  const requiresPlan = subscriptionQuery.isSuccess && !canOpenLessons;

  const roadmap = roadmapQuery.data;
  const levels = [...new Set([roadmap?.targetJlptLevelName, roadmap?.currentStudyLevelName].filter(Boolean))];
  const selectedLevel = levels.includes(requestedLevel) ? requestedLevel : levels[0];
  const lessons = roadmap?.lessons ?? [];
  const visibleLessons = lessons.filter((lesson) => lesson.levelCode === selectedLevel);
  const completed = visibleLessons.filter((lesson) => lesson.isCompleted).length;
  const nextLesson = visibleLessons.find((lesson) => !lesson.isCompleted && !lesson.isLocked);
  const errorCode = roadmapQuery.error?.data?.errorCode;

  const refresh = () => Promise.all([
    roadmapQuery.refetch(),
    queryClient.invalidateQueries({ queryKey: ['self-study-catalog', userId] }),
  ]);

  return (
    <Card aria-labelledby="self-study-roadmap-title" className="mb-5 scroll-mt-6 border-rp-brand-border">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="self-study-roadmap-title" className="text-[17px] font-semibold text-rp-text">
          {tr('Lộ trình tự học hệ thống đề xuất')}
        </h2>
        {roadmap?.placementAttemptId && (
          <Link to={`/app/placement-test/?attemptId=${roadmap.placementAttemptId}`} className="rp-link text-xs font-semibold">
            {tr('Xem kết quả đánh giá')}
          </Link>
        )}
      </div>

      {!isAuthenticated && (
        <div className="mt-3">
          <Link to="/auth/"><Button variant="primary" size="sm">{tr('Đăng nhập để xem lộ trình tự học')}</Button></Link>
        </div>
      )}

      {isAuthenticated && roadmapQuery.isPending && (
        <SakuraLoader variant="section" context="roadmap" delay={160} className="mt-2" />
      )}

      {errorCode === 'STANDARD_ROADMAP_PLACEMENT_REQUIRED' && (
        <Banner
          tone="info"
          className="mt-3"
          actions={<Link to="/app/placement-test"><Button variant="primary" size="sm">{tr('Làm bài đánh giá năng lực')}</Button></Link>}
        >
          {tr('Hoàn thành bài đánh giá năng lực để hệ thống sắp xếp danh sách bài học phù hợp với trình độ hiện tại.')}
        </Banner>
      )}

      {errorCode === 'STUDY_LEVEL_REQUIRED' && (
        <Banner
          tone="info"
          className="mt-3"
          actions={<Link to="/onboarding"><Button variant="primary" size="sm">{tr('Chọn mục tiêu JLPT')}</Button></Link>}
        >
          {tr('Vui lòng chọn chứng chỉ và mục tiêu JLPT trước khi tạo lộ trình.')}
        </Banner>
      )}

      {roadmapQuery.isError && !['STANDARD_ROADMAP_PLACEMENT_REQUIRED', 'STUDY_LEVEL_REQUIRED'].includes(errorCode) && (
        <Banner
          tone="danger"
          className="mt-3"
          actions={<Button variant="secondary" size="sm" onClick={() => roadmapQuery.refetch()}>{tr('Thử lại')}</Button>}
        >
          {tr(roadmapQuery.error.message)}
        </Banner>
      )}

      {roadmap && (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-rp-text-2">
            JLPT {roadmap.currentStudyLevelName !== roadmap.targetJlptLevelName ? `${roadmap.currentStudyLevelName} → ` : ''}{roadmap.targetJlptLevelName}
          </p>

          <div role="group" aria-label={tr('Cấp độ bài học')} className="flex flex-wrap gap-2">
            {levels.map((level) => {
              const count = lessons.filter((lesson) => lesson.levelCode === level).length;
              const isTarget = level === roadmap.targetJlptLevelName;
              const active = level === selectedLevel;
              return (
                <Button
                  key={level}
                  variant={active ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={active}
                  onClick={() => {
                    setRequestedLevel(level);
                    setOpenLessonId(null);
                  }}
                >
                  {isTarget ? trf('Học {0}', { 0: level }) : trf('Ôn lại {0}', { 0: level })} · {trf('{0} bài', { 0: count })}
                </Button>
              );
            })}
          </div>

          {visibleLessons.length === 0 ? (
            <p role="status" className="text-sm text-rp-text-2">
              {trf('Kho học liệu chưa có bài học JLPT {0} khả dụng.', { 0: selectedLevel })}
            </p>
          ) : (
            <>
              {subscriptionQuery.isPending && !session?.isPreview && (
                <SakuraLoader
                  variant="section"
                  context="payment"
                  label={tr('Đang kiểm tra quyền tự học')}
                  delay={160}
                />
              )}
              {requiresPlan && (
                <Banner
                  tone="warning"
                  actions={(
                    <>
                      <Link to="/plans/"><Button variant="primary" size="sm">{tr('Xem gói tự học')}</Button></Link>
                      <Button variant="secondary" size="sm" loading={subscriptionQuery.isFetching} onClick={() => subscriptionQuery.refetch()}>
                        {tr('Kiểm tra lại quyền')}
                      </Button>
                    </>
                  )}
                >
                  {tr('Bạn cần gói tự học đang hiệu lực để mở bài và làm bài luyện tập.')}
                </Banner>
              )}
              {subscriptionQuery.isError && (
                <Banner
                  tone="danger"
                  actions={<Button variant="secondary" size="sm" loading={subscriptionQuery.isFetching} onClick={() => subscriptionQuery.refetch()}>{tr('Thử lại')}</Button>}
                >
                  {tr('Chưa kiểm tra được quyền tự học.')}
                </Banner>
              )}

              <div className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-rp-text">
                      {trf('{0}/{1} bài {2} hoàn thành', { 0: completed, 1: visibleLessons.length, 2: selectedLevel })}
                    </p>
                    <p className="mt-0.5 text-xs text-rp-text-muted">{tr('Học theo thứ tự. Đạt bài luyện tập để mở bài kế tiếp.')}</p>
                  </div>
                  {canOpenLessons && nextLesson && (
                    <a
                      href={`#self-study-lesson-${nextLesson.lessonId}`}
                      onClick={() => setOpenLessonId(nextLesson.lessonId)}
                    >
                      <Button variant="primary" size="sm">
                        {completed === 0 && !nextLesson.isStudied ? tr('Bắt đầu học') : tr('Tiếp tục học')}
                      </Button>
                    </a>
                  )}
                </div>
                <ProgressBar value={completed} max={visibleLessons.length || 1} label={selectedLevel} />
              </div>

              <ol className="divide-y divide-rp-line border-y border-rp-line">
                {visibleLessons.map((lesson, index) => (
                  <LessonRow
                    key={lesson.lessonId}
                    lesson={lesson}
                    index={index}
                    userId={userId}
                    refresh={refresh}
                    canOpen={canOpenLessons}
                    requiresPlan={requiresPlan}
                    recheckAccess={subscriptionQuery.refetch}
                    open={canOpenLessons && !lesson.isLocked && openLessonId === lesson.lessonId}
                    toggle={() => setOpenLessonId((id) => (id === lesson.lessonId ? null : lesson.lessonId))}
                  />
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
