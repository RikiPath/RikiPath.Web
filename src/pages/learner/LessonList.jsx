import LessonContent from './LessonContent.jsx';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getCertificateTypes, getLevelsByCertificate } from '../../api/certificateApi.js';
import { getLessonCatalog } from '../../api/learningPathApi.js';

const levels = ['N5', 'N4', 'N3', 'N2'];
const sections = {
  lessons: { title: 'Bài luyện tập' },
  listening: { title: 'Nghe hiểu', skill: 'Listening' },
  reading: { title: 'Đọc hiểu', skill: 'Reading' },
};
const skillLabels = {
  Vocabulary: 'Từ vựng', Grammar: 'Ngữ pháp', Kanji: 'Hán tự',
  Reading: 'Đọc hiểu', Listening: 'Nghe hiểu',
};

async function loadJlptLevels() {
  const types = await getCertificateTypes();
  const jlpt = types.find(type => type.name?.trim().toUpperCase() === 'JLPT');
  return jlpt ? getLevelsByCertificate(jlpt.id) : [];
}

function LoadError({ message, retry }) {
  return <div role="alert" className="rounded-xl border border-rose-200 bg-white p-4 text-sm">
    <p>{message}</p>
    <button type="button" onClick={retry} className="mt-2 font-semibold text-primary underline">
      Thử lại
    </button>
  </div>;
}

function Catalog({ section, userId, requestedLevel }) {
  const { title, skill } = sections[section];
  const queryClient = useQueryClient();
  const preferenceKey = ['rikipath', 'study-level', userId ?? 'guest', section].join(':');
  const [level, setLevel] = useState(() => {
    if (levels.includes(requestedLevel)) return requestedLevel;
    try {
      const saved = localStorage.getItem(preferenceKey);
      return levels.includes(saved) ? saved : 'N5';
    } catch {
      return 'N5';
    }
  });
  const [openLessonId, setOpenLessonId] = useState(null);

  function chooseLevel(nextLevel) {
    setLevel(nextLevel);
    setOpenLessonId(null);
    try {
      localStorage.setItem(preferenceKey, nextLevel);
    } catch {
      // Selection still works when browser storage is unavailable.
    }
  }

  const levelQuery = useQuery({
    queryKey: ['self-study-jlpt-levels'],
    queryFn: loadJlptLevels,
    retry: false,
  });
  const levelId = levelQuery.data?.find(item => item.code?.trim().toUpperCase() === level)?.id;
  const catalog = useQuery({
    queryKey: ['self-study-catalog', userId, levelId],
    queryFn: () => getLessonCatalog(levelId),
    enabled: Boolean(levelId),
    retry: false,
  });
  const lessons = (catalog.data?.lessons ?? []).filter(lesson => !skill || lesson.languageSkillName === skill);
  const firstIncomplete = lessons.findIndex(lesson => !lesson.practicePassed &&
    (lesson.hasPracticeExercise || !lesson.isCompleted));
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['self-study-catalog', userId] }),
    queryClient.invalidateQueries({ queryKey: ['assessment-roadmap', userId] }),
  ]);

  return <main className="mx-auto max-w-5xl space-y-5 px-5 py-6 text-text-main sm:px-8">
    <header className="rounded-2xl border border-card-border bg-white p-5 sm:p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div role="group" aria-label="Cấp độ ôn luyện" className="mt-4 flex flex-wrap gap-2">
        {levels.map(code => <button key={code} type="button" aria-pressed={level === code}
          onClick={() => chooseLevel(code)}
          className={level === code
            ? 'rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white'
            : 'rounded-xl border border-card-border px-5 py-2 text-sm font-semibold hover:bg-primary-light'}>
          {code}
        </button>)}
      </div>
    </header>

    {(levelQuery.isPending || (levelId && catalog.isPending)) && <p role="status">Đang tải bài học {level}…</p>}
    {levelQuery.isError && <LoadError message="Chưa tải được cấp độ JLPT." retry={levelQuery.refetch} />}
    {catalog.isError && <LoadError message={catalog.error?.message || 'Chưa tải được danh sách bài học.'} retry={catalog.refetch} />}
    {((levelQuery.isSuccess && !levelId) || (catalog.isSuccess && lessons.length === 0))
      && <p role="status">Chưa có bài học {level} trong mục này.</p>}

    <ul className="space-y-3">
      {lessons.map((lesson, index) => {
        const locked = firstIncomplete >= 0 && index > firstIncomplete && !lesson.practicePassed;
        const open = !locked && openLessonId === lesson.lessonId;
        return <li key={lesson.lessonId} className="rounded-2xl border border-card-border bg-white">
          <button type="button" aria-expanded={open} disabled={locked} onClick={() => setOpenLessonId(open ? null : lesson.lessonId)}
            className="flex w-full items-center justify-between gap-4 rounded-2xl p-5 text-left hover:bg-primary-light/30">
            <span>
              <span className="block text-xs font-semibold text-primary">{skillLabels[lesson.languageSkillName] ?? lesson.languageSkillName}</span>
              <span className="mt-1 block font-semibold">{lesson.title}</span>
              {lesson.hasAudio && <span className="block text-xs text-primary">Có audio</span>}
            </span>
            <span className="shrink-0 text-sm font-semibold text-primary">{locked ? 'Chờ hoàn thành bài trước' : open ? 'Thu gọn' : 'Mở bài'}</span>
          </button>
          {open && <div className="border-t border-card-border p-5">
            <LessonContent lesson={lesson} userId={userId} skill={skill} refresh={refresh} />
          </div>}
        </li>;
      })}
    </ul>
  </main>;
}

export default function LessonList({ section = 'lessons' }) {
  const { pathname, search } = useLocation();
  const requestedLevel = new URLSearchParams(search).get('level');
  const { user } = useAuth();
  const userId = user?.userId;
  return <LearnerShell pathname={pathname} breadcrumb={sections[section].title}>
    <Catalog key={JSON.stringify([section, userId, requestedLevel])} section={section} userId={userId} requestedLevel={requestedLevel} />
  </LearnerShell>;
}
