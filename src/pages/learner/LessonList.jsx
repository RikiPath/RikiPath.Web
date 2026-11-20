import LessonContent from './LessonContent.jsx';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '@/layouts';
import { Check, ChevronDown, Headphones, Lock } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, FeatureIcon, PageContainer, ProgressBar, RefreshingIndicator, SakuraLoader, Tabs, cx } from '@/components/ui';
import { useAuth } from '@/app/auth/authContext.js';
import { getCertificateTypes, getLevelsByCertificate } from '@/features/learning-path/api/certificateApi.js';
import { getLessonCatalog } from '@/features/learning-path/api/learningPathApi.js';
import { useLocale } from '@/locales/locale.js';

const DEFAULT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
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

function Catalog({ section, userId, requestedLevel }) {
  const { tr, trf } = useLocale();
  const { title, skill } = sections[section];
  const queryClient = useQueryClient();
  const preferenceKey = ['rikipath', 'study-level', userId ?? 'guest', section].join(':');
  const levelQuery = useQuery({
    queryKey: ['self-study-jlpt-levels'],
    queryFn: loadJlptLevels,
    retry: false,
  });
  const availableLevels = (() => {
    const codes = (levelQuery.data || [])
      .map((l) => (l.code || l.name || '').trim().toUpperCase())
      .filter((code) => DEFAULT_LEVELS.includes(code));
    return codes.length > 0 ? codes : DEFAULT_LEVELS;
  })();

  const [level, setLevel] = useState(() => {
    if (DEFAULT_LEVELS.includes(requestedLevel)) return requestedLevel;
    try {
      const saved = localStorage.getItem(preferenceKey);
      return DEFAULT_LEVELS.includes(saved) ? saved : 'N5';
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

  const doneCount = lessons.filter((lesson) => lesson.practicePassed || (lesson.isCompleted && !lesson.hasPracticeExercise)).length;
  const feature = section === 'listening' ? 'listening' : section === 'reading' ? 'reading' : 'lesson';

  return <PageContainer width="default" density="comfortable" className="space-y-[var(--rp-space-section)]">
    <header className="rounded-rp-card-lg border border-rp-line bg-rp-surface p-[var(--rp-space-card-pad)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <FeatureIcon feature={feature} size="lg" />
          <div className="min-w-0">
            <p className="rp-type-caption font-semibold uppercase tracking-[0.12em] text-rp-brand">{trf('Tự học · JLPT {0}', { 0: level })}</p>
            <h1 className="rp-type-page-title text-rp-text">{tr(title)}</h1>
            <p className="rp-type-body mt-1 text-rp-text-2">{tr('Học theo thứ tự: hoàn thành bài luyện của bài trước để mở bài tiếp theo.')}</p>
          </div>
        </div>
        {catalog.isSuccess && lessons.length > 0 && (
          <div className="min-w-0 basis-[180px]">
            <p className="text-xs font-medium text-rp-text-muted">{trf('Tiến độ {0}', { 0: level })}</p>
            <p className="text-lg font-bold tabular-nums text-rp-text">{trf('{0}/{1} bài', { 0: doneCount, 1: lessons.length })}</p>
            <ProgressBar value={doneCount} max={lessons.length} label={trf('Tiến độ {0}', { 0: level })} className="mt-1" />
          </div>
        )}
      </div>
      <Tabs
        className="mt-5"
        variant="pill"
        label={tr('Cấp độ ôn luyện')}
        value={level}
        onChange={chooseLevel}
        tabs={availableLevels.map((code) => ({ value: code, label: `JLPT ${code}` }))}
      />
    </header>

    {(levelQuery.isPending || (levelId && catalog.isPending)) && (
      <SakuraLoader variant="section" context="lesson" label={trf('Đang tải bài học {0}', { 0: level })} delay={160} />
    )}
    <RefreshingIndicator active={!catalog.isPending && catalog.isFetching} />
    {levelQuery.isError && <Card><ErrorState error={levelQuery.error} title={tr('Chưa tải được cấp độ JLPT')} onRetry={() => levelQuery.refetch()} retrying={levelQuery.isFetching} compact /></Card>}
    {catalog.isError && <Card><ErrorState error={catalog.error} title={tr('Chưa tải được danh sách bài học')} onRetry={() => catalog.refetch()} retrying={catalog.isFetching} compact /></Card>}
    {((levelQuery.isSuccess && !levelId) || (catalog.isSuccess && lessons.length === 0)) && (
      <Card><EmptyState art="empty" title={trf('Chưa có bài học {0} trong mục này', { 0: level })} description={tr('Nội dung sẽ xuất hiện khi bài học được duyệt và công bố. Bạn có thể chọn cấp độ khác.')} compact /></Card>
    )}

    <ol className="space-y-3">
      {lessons.map((lesson, index) => {
        const locked = firstIncomplete >= 0 && index > firstIncomplete && !lesson.practicePassed;
        const done = lesson.practicePassed || (lesson.isCompleted && !lesson.hasPracticeExercise);
        const current = index === firstIncomplete;
        const open = !locked && openLessonId === lesson.lessonId;
        return <li key={lesson.lessonId} className={cx('rounded-rp-card border bg-rp-surface transition-shadow', current ? 'border-rp-brand-border shadow-rp-card' : 'border-rp-line', locked && 'bg-rp-bg-2')}>
          <button type="button" aria-expanded={open} disabled={locked} onClick={() => setOpenLessonId(open ? null : lesson.lessonId)}
            className="rp-focus flex w-full items-center gap-4 rounded-rp-card p-4 text-left enabled:hover:bg-rp-bg-2 disabled:cursor-not-allowed sm:p-5">
            <span aria-hidden="true" className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold', done ? 'bg-rp-success-bg text-rp-success' : locked ? 'bg-rp-muted text-rp-text-disabled' : 'bg-rp-brand-tint text-rp-brand-strong')}>
              {done ? <Check className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4" /> : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-rp-text-muted">{skillLabels[lesson.languageSkillName] ? tr(skillLabels[lesson.languageSkillName]) : lesson.languageSkillName}</span>
                {lesson.hasAudio && <Badge size="sm" tone="info" icon={Headphones}>{tr('Có audio')}</Badge>}
              </span>
              <span className="rp-jp mt-0.5 block font-semibold text-rp-text">{tr(lesson.title)}</span>
              {locked && <span className="mt-0.5 block text-xs text-rp-text-muted">{tr('Hoàn thành bài trước để mở bài này')}</span>}
            </span>
            <span className="shrink-0">
              {done ? <Badge tone="success">{tr('Đã hoàn thành')}</Badge>
                : locked ? <Badge tone="neutral" icon={Lock}>{tr('Đang khóa')}</Badge>
                  : current ? <Badge tone="brand" icon={false}>{tr('Bài tiếp theo')}</Badge> : null}
            </span>
            {!locked && <ChevronDown aria-hidden="true" className={cx('h-4 w-4 shrink-0 text-rp-text-muted transition-transform', open && 'rotate-180')} />}
          </button>
          {open && <div className="rp-anim-fade space-y-4 border-t border-rp-line p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <Link to={`/lesson-player/?lessonId=${lesson.lessonId}`}>
                <Button variant="secondary" size="sm">{tr('Mở trình học thẻ & Video')}</Button>
              </Link>
              {lesson.hasPracticeExercise && (
                <Link to={`/lesson-practice/?lessonId=${lesson.lessonId}`}>
                  <Button variant="soft" size="sm">{tr('Mở trang bài tập')}</Button>
                </Link>
              )}
            </div>
            <LessonContent lesson={lesson} userId={userId} skill={skill} refresh={refresh} />
          </div>}
        </li>;
      })}
    </ol>
  </PageContainer>;
}

export default function LessonList({ section = 'lessons' }) {
  const { tr } = useLocale();
  const { search } = useLocation();
  const requestedLevel = new URLSearchParams(search).get('level');
  const { user } = useAuth();
  const userId = user?.userId;
  return <LearnerShell breadcrumb={tr(sections[section].title)}>
    <Catalog key={JSON.stringify([section, userId, requestedLevel])} section={section} userId={userId} requestedLevel={requestedLevel} />
  </LearnerShell>;
}
