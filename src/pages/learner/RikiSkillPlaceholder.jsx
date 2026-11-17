import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { getJlptLevels, getLearningLessons } from '../../api/lessons.js';
import { useLearnerProfile } from '../../hooks/useLearnerHome.js';
import { useLocale } from '../../i18n/locale.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

const SKILLS = {
  listening: { label: 'Nghe', pattern: /nghe|listen|聴解|listening/i },
  speaking: { label: 'Nói', pattern: /nói|noi|speak|話|speaking/i },
  reading: { label: 'Đọc', pattern: /đọc|doc|read|読解|reading/i },
};

export default function RikiSkillPlaceholder({ skill }) {
  const { pathname } = useLocation();
  const { tr } = useLocale();
  const current = SKILLS[skill] || SKILLS.listening;
  const profile = useLearnerProfile();
  const [pickedLevelId, setPickedLevelId] = useState(null);
  const levelsQuery = useQuery({
    queryKey: ['jlpt-levels'],
    queryFn: getJlptLevels,
  });
  const levels = (Array.isArray(levelsQuery.data) ? levelsQuery.data : [])
    .filter((level) => String(level.code || '').toUpperCase() !== 'N1');
  const preferred = pickedLevelId || profile.data?.targetJlptLevelId;
  const levelId = levels.some((level) => level.id === preferred) ? preferred : levels[0]?.id;
  const lessonsQuery = useQuery({
    queryKey: ['learning-lessons', levelId],
    queryFn: () => getLearningLessons(levelId),
    enabled: Boolean(levelId),
  });
  const lessons = (lessonsQuery.data?.lessons || []).filter((lesson) => current.pattern.test(lesson.languageSkillName || ''));

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr(current.label)}>
      <main className="mx-auto max-w-[980px] px-4 py-6 text-[#49353F] sm:px-6">
        <header className="mb-5">
          <p className="text-[12px] font-medium tracking-[0.12em] text-[#AD3155]">RIKI</p>
          <h1 className="mt-1 text-[26px] font-semibold">{tr(`Luyện ${current.label.toLowerCase()}`)}</h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-[#927B88]">
            {tr('Những bài học có kỹ năng này trong cấp bạn đang chọn. Mở bài để học, hoặc làm bài tập của bài đó.')}
          </p>
        </header>
        <div className="mb-4 flex flex-wrap gap-2">
          {levels.map((level) => (
            <button
              key={level.id}
              type="button"
              aria-pressed={level.id === levelId}
              onClick={() => setPickedLevelId(level.id)}
              className={`h-8 rounded-full px-3 text-[12px] ${level.id === levelId ? 'bg-[#AD3155] text-white' : 'bg-white text-[#826773]'} ${focus}`}
            >
              {level.code}
            </button>
          ))}
        </div>
        {(levelsQuery.isError || lessonsQuery.isError) && (
          <p role="alert" className="mb-4 rounded-2xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">
            {(levelsQuery.error || lessonsQuery.error).message}
          </p>
        )}
        {lessonsQuery.isPending && <p className="text-[13px] text-[#AA8F9B]">{tr('Đang tải bài học…')}</p>}
        {!lessonsQuery.isPending && !lessons.length && (
          <div className="rounded-2xl border border-dashed border-[#E7C9D6] bg-white px-4 py-10 text-center">
            <p className="text-[14px] text-[#806371]">{tr('Cấp này chưa có bài thuộc kỹ năng này.')}</p>
            {skill === 'speaking' && (
              <Link to="/speech/" className={`mt-3 inline-flex text-[13px] font-medium text-[#AD3155] ${focus}`}>{tr('Mở luyện nói bằng giọng')}</Link>
            )}
          </div>
        )}
        <div className="grid gap-3">
          {lessons.map((lesson) => (
            <article key={lesson.lessonId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
              <div>
                <h2 className="text-[16px] font-semibold">{lesson.title}</h2>
                <p className="mt-1 text-[12px] text-[#967F8A]">{lesson.languageSkillName} · {lesson.progressPercent}%</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/lesson-player/?lessonId=${lesson.lessonId}`} className={`inline-flex h-9 items-center rounded-xl bg-[#AD3155] px-3 text-[12px] font-medium text-white ${focus}`}>{tr('Học')}</Link>
                <Link to={`/lesson-practice/?lessonId=${lesson.lessonId}`} className={`inline-flex h-9 items-center rounded-xl border border-[#E7DAE1] px-3 text-[12px] text-[#6F5660] ${focus}`}>{tr('Làm bài tập')}</Link>
              </div>
            </article>
          ))}
        </div>
      </main>
    </LearnerShell>
  );
}
