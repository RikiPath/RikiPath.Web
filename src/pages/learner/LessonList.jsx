import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LearnerShell } from '../../components/shells';
import { getJlptLevels, getLearningLessons } from '../../api/lessons.js';
import { useLearnerProfile } from '../../hooks/useLearnerHome.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'open', label: 'Chưa xong' },
  { id: 'done', label: 'Đã hoàn thành' },
];

function matches(lesson, filter) {
  if (filter === 'done') return lesson.isCompleted;
  if (filter === 'open') return !lesson.isCompleted;
  return true;
}

export default function LessonList() {
  const { pathname } = useLocation();
  const [filter, setFilter] = useState('all');
  const [pickedLevelId, setPickedLevelId] = useState(null);
  const profile = useLearnerProfile();
  const levelsQuery = useQuery({
    queryKey: ['jlpt-levels'],
    queryFn: getJlptLevels,
  });
  const levels = Array.isArray(levelsQuery.data) ? levelsQuery.data : [];
  const levelId = pickedLevelId || profile.data?.targetJlptLevelId || levels[0]?.id;
  const lessonsQuery = useQuery({
    queryKey: ['learning-lessons', levelId],
    queryFn: () => getLearningLessons(levelId),
    enabled: Boolean(levelId),
  });
  const catalog = lessonsQuery.data;
  const lessons = (catalog?.lessons || []).filter((lesson) => matches(lesson, filter));

  return (
    <LearnerShell pathname={pathname} breadcrumb="Bài luyện tập">
      <div className="min-h-screen bg-[#FAF8F7] font-['Nunito',sans-serif] text-[#3F3038]">
        <main className="mx-auto w-full max-w-[1120px] px-5 py-6 lg:px-7">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-medium leading-tight">Bài luyện tập</h1>
              <p className="mt-1 max-w-xl text-[13px] leading-6 text-[#95828C]">
                Mỗi bài đã được duyệt gồm từ vựng, Kanji và ngữ pháp của cùng một bài học.
              </p>
            </div>
            {catalog && (
              <div className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-3">
                <p className="text-[12px] text-[#95828C]">{catalog.levelCode || 'JLPT'}</p>
                <p className="mt-1 text-[15px] font-medium text-[#AD3155]">
                  {catalog.completedLessons}/{catalog.totalLessons} bài đã hoàn thành
                </p>
              </div>
            )}
          </header>

          {levelsQuery.isError && (
            <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{levelsQuery.error.message}</p>
          )}
          {levels.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {levels.map((level) => {
                const active = level.id === levelId;
                return (
                  <button
                    key={level.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPickedLevelId(level.id)}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${active ? 'bg-[#AD3155] text-white' : 'border border-[#EADFE5] bg-white text-[#826271] hover:bg-[#FCF3F7]'} ${focus}`}
                  >
                    {level.code}
                  </button>
                );
              })}
            </div>
          )}

          {profile.isPending && !levels.length && <p className="text-[13px] text-[#9A8390]">Đang tải cấp độ…</p>}
          {!levelsQuery.isPending && !levels.length && !levelId && (
            <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-8">
              <p className="text-[15px] font-medium text-[#806371]">Chưa có cấp độ JLPT</p>
              <Link to="/onboarding" className={`mt-4 inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] ${focus}`}>
                Chọn mục tiêu
              </Link>
            </div>
          )}
          {lessonsQuery.isError && (
            <p role="alert" className="rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{lessonsQuery.error.message}</p>
          )}
          {lessonsQuery.isPending && levelId && <p className="text-[13px] text-[#9A8390]">Đang tải bài học…</p>}

          {catalog && (
            <>
              <div className="mb-4 flex gap-2">
                {FILTERS.map((item) => {
                  const active = filter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(item.id)}
                      className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${active ? 'bg-[#AD3155] text-white' : 'border border-[#EADFE5] bg-white text-[#826271] hover:bg-[#FCF3F7]'} ${focus}`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {lessons.map((lesson) => (
                  <article key={lesson.lessonId} className={`flex flex-col rounded-2xl border bg-white p-5 ${!lesson.isCompleted && lesson.progressPercent > 0 ? 'border-[#AD3155]' : 'border-[#EADFE5]'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="rounded-md bg-[#FCFAFB] px-2 py-0.5 text-[#705261]">{catalog.levelCode}</span>
                        <span className="rounded-md bg-[#FCEEF3] px-2 py-0.5 text-[#AD3155]">Từ vựng · Kanji · Ngữ pháp</span>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${lesson.isCompleted ? 'bg-[#F3F8F4] text-[#2F6B45]' : 'bg-[#FCEEF3] text-[#AD3155]'}`}>
                        {lesson.isCompleted ? 'Đã hoàn thành' : lesson.progressPercent > 0 ? 'Đang học' : 'Chưa học'}
                      </span>
                    </div>
                    <h2 className="mt-3 text-[16px] font-medium leading-snug text-[#593B48]">{lesson.title}</h2>
                    {lesson.description && <p className="mt-1.5 line-clamp-2 text-[13px] leading-6 text-[#95828C]">{lesson.description}</p>}
                    <div className="mt-4 border-t border-[#F0E7EC] pt-4">
                      <div className="mb-3 flex justify-between text-[12px] text-[#95828C]">
                        <span>Tiến độ bài</span>
                        <span className="font-medium text-[#AD3155]">{lesson.progressPercent}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#F6EEF2]">
                        <div className="h-full rounded-full bg-[#AD3155]" style={{ width: `${Math.max(0, Math.min(100, lesson.progressPercent))}%` }} />
                      </div>
                      <Link
                        to={`/lesson-player/?lessonId=${lesson.lessonId}`}
                        className={`mt-3 flex h-9 w-full items-center justify-center rounded-lg text-[12px] font-medium ${lesson.isCompleted ? 'border border-[#E7DAE1] bg-white text-[#866777] hover:bg-[#FFF6FA]' : 'bg-[#AD3155] text-white hover:bg-[#982B4B]'} ${focus}`}
                      >
                        {lesson.isCompleted ? 'Xem lại bài' : lesson.progressPercent > 0 ? 'Tiếp tục bài' : 'Bắt đầu bài'}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
              {!lessons.length && !lessonsQuery.isPending && (
                <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-8">
                  <p className="text-[15px] font-medium text-[#806371]">
                    {catalog.totalLessons ? 'Không có bài trong nhóm này' : 'Chưa có bài đã duyệt cho cấp độ này'}
                  </p>
                  <p className="mt-1 text-[12px] leading-6 text-[#A18B97]">
                    Bài sẽ hiện sau khi admin duyệt bài gồm từ vựng, Kanji và ngữ pháp.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </LearnerShell>
  );
}
