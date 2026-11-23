import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Headphones, Lock } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import {
  Badge, Button, Card, CustomSelect, EmptyState, ErrorState, PageContainer, ProgressBar, RefreshingIndicator, SakuraLoader,
  SearchInput, cx,
} from '@/components/ui';
import { IllustratedPageHeader, LevelTabs, SUPPORTED_JLPT_LEVELS } from '@/features/learner-ui';
import { useAuth } from '@/app/auth/authContext.js';
import { getCertificateTypes, getLevelsByCertificate } from '@/features/learning-path/api/certificateApi.js';
import { getLessonCatalog } from '@/features/learning-path/api/learningPathApi.js';
import {
  catalogLessonState,
  catalogPracticeLocks,
  isCatalogLessonCleared,
  skillNameLabel,
} from '@/features/learning-journey/journeyModel.js';
import { lessonPlayerPath } from '@/features/learning-journey/lessonNavigation.js';
import { useLocale } from '@/locales/locale.js';

const DEFAULT_LEVELS = SUPPORTED_JLPT_LEVELS;
const PAGE_SIZE = 12;
const SKILL_ORDER = ['Vocabulary', 'Kanji', 'Grammar', 'Reading', 'Listening'];
const sections = {
  lessons: {
    title: 'Khám phá bài học',
    description: 'Tìm kiếm bài học theo trình độ và chủ đề phù hợp với bạn.',
  },
  listening: { title: 'Nghe hiểu', skill: 'Listening', description: 'Các bài nghe theo cấp độ JLPT, kèm bài kiểm tra nhanh.' },
  reading: { title: 'Đọc hiểu', skill: 'Reading', description: 'Các bài đọc theo cấp độ JLPT, kèm bài kiểm tra nhanh.' },
};

async function loadJlptLevels() {
  const types = await getCertificateTypes();
  const jlpt = types.find((type) => type.name?.trim().toUpperCase() === 'JLPT');
  return jlpt ? getLevelsByCertificate(jlpt.id) : [];
}

function normalize(text) {
  return String(text ?? '').toLocaleLowerCase('vi-VN').normalize('NFC');
}

function LessonCard({ lesson, practiceLocked, href }) {
  const { tr } = useLocale();
  const state = catalogLessonState(lesson, practiceLocked);
  const cleared = isCatalogLessonCleared(lesson);
  const started = Number(lesson.progressPercent) > 0 || lesson.isCompleted;
  return (
    <li>
      <Link
        to={href}
        className={cx(
          'group rp-focus flex h-full flex-col rounded-rp-card border bg-white p-4 shadow-rp-xs',
          'transition-[transform,box-shadow,border-color] duration-[var(--rp-dur-standard)] hover:-translate-y-0.5 hover:border-rp-brand-border hover:shadow-rp-card motion-reduce:hover:translate-y-0',
          cleared ? 'border-rp-success-line/80' : 'border-rp-line',
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {lesson.languageSkillName && (
            <Badge tone="brand" size="sm" icon={false}>{tr(skillNameLabel(lesson.languageSkillName))}</Badge>
          )}
          {lesson.hasAudio && <Badge size="sm" tone="info" icon={Headphones}>{tr('Có audio')}</Badge>}
          <Badge tone={state.tone} size="sm" icon={cleared ? Check : false}>{tr(state.label)}</Badge>
        </div>
        <h3 className="rp-jp mt-2 text-[15px] font-bold leading-snug text-rp-text">{tr(lesson.title)}</h3>
        {lesson.description && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-rp-text-2" title={lesson.description}>{tr(lesson.description)}</p>
        )}
        {practiceLocked && !cleared && lesson.hasPracticeExercise && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-rp-text-muted">
            <Lock className="h-3 w-3" aria-hidden="true" />
            {tr('Kiểm tra nhanh mở sau khi hoàn thành các bài trước')}
          </p>
        )}
        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[13px] font-semibold text-rp-brand-strong">
          {cleared ? tr('Xem lại') : started ? tr('Tiếp tục học') : tr('Bắt đầu học')}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-[var(--rp-dur-standard)] group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

function Catalog({ section, userId }) {
  const { tr, trf } = useLocale();
  const { title, skill: sectionSkill, description } = sections[section];
  const [searchParams, setSearchParams] = useSearchParams();
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

  const requestedLevel = searchParams.get('level');
  const [storedLevel] = useState(() => {
    try {
      const saved = localStorage.getItem(preferenceKey);
      return DEFAULT_LEVELS.includes(saved) ? saved : 'N5';
    } catch {
      return 'N5';
    }
  });
  const level = DEFAULT_LEVELS.includes(requestedLevel) ? requestedLevel : storedLevel;
  const query = searchParams.get('q') ?? '';
  const skillFilter = sectionSkill ? null : (searchParams.get('skill') || null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function updateParams(patch) {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value); else next.delete(key);
    });
    setSearchParams(next, { replace: true });
    setVisibleCount(PAGE_SIZE);
  }

  function chooseLevel(nextLevel) {
    updateParams({ level: nextLevel, skill: null });
    try {
      localStorage.setItem(preferenceKey, nextLevel);
    } catch {
      // Selection still works when browser storage is unavailable.
    }
  }

  const levelId = levelQuery.data?.find((item) => item.code?.trim().toUpperCase() === level)?.id;
  const catalog = useQuery({
    queryKey: ['self-study-catalog', userId, levelId],
    queryFn: () => getLessonCatalog(levelId),
    enabled: Boolean(levelId),
    retry: false,
  });

  // Section scope first (matches the Backend's catalog unlock scope), then the learner's own filters.
  const scoped = (catalog.data?.lessons ?? []).filter((lesson) => !sectionSkill || lesson.languageSkillName === sectionSkill);
  const practiceLocks = catalogPracticeLocks(scoped);
  const skillsPresent = SKILL_ORDER.filter((name) => scoped.some((lesson) => lesson.languageSkillName === name));
  const needle = normalize(query.trim());
  const filtered = scoped.filter((lesson) => (!skillFilter || lesson.languageSkillName === skillFilter)
    && (!needle || normalize(lesson.title).includes(needle) || normalize(lesson.description).includes(needle)));
  const visible = filtered.slice(0, visibleCount);
  const doneCount = scoped.filter(isCatalogLessonCleared).length;
  const headerIcon = section === 'listening' ? 'listening' : section === 'reading' ? 'reading' : 'vocabulary';
  const headerTone = section === 'listening' ? 'sky' : section === 'reading' ? 'navy' : 'mint';

  return (
    <PageContainer width="default" density="comfortable" className="space-y-4">
      <IllustratedPageHeader
        icon={headerIcon}
        tone={headerTone}
        compact
        eyebrow={trf('Thư viện bài học · JLPT {0}', { 0: level })}
        title={tr(title)}
        description={tr(description)}
        actions={
          catalog.isSuccess && scoped.length > 0 ? (
            <div className="flex h-11 min-w-[148px] flex-col justify-center rounded-xl border border-rp-line bg-white px-3 shadow-rp-xs">
              <div className="flex items-center justify-between gap-2 text-[11.5px]">
                <span className="font-semibold text-rp-text-muted">{trf('Tiến độ {0}', { 0: level })}</span>
                <span className="font-extrabold tabular-nums text-rp-navy">{trf('{0}/{1} bài', { 0: doneCount, 1: scoped.length })}</span>
              </div>
              <ProgressBar value={doneCount} max={scoped.length} label={trf('Tiến độ {0}', { 0: level })} className="mt-1" />
            </div>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2.5 rounded-rp-card border border-rp-line bg-white px-3 py-2.5">
        <SearchInput
          value={query}
          onChange={(event) => updateParams({ q: event.target.value })}
          placeholder="Tìm bài học…"
          className="w-full sm:w-64"
          aria-label={tr('Tìm bài học')}
        />
        {skillsPresent.length > 1 && (
          <CustomSelect
            fitContent
            size="md"
            value={skillFilter ?? 'all'}
            onChange={(nextSkill) => updateParams({ skill: nextSkill === 'all' ? null : nextSkill })}
            aria-label={tr('Loại kiến thức')}
            options={[
              { value: 'all', label: tr('Tất cả') },
              ...skillsPresent.map((name) => ({ value: name, label: tr(skillNameLabel(name)) })),
            ]}
          />
        )}
        <LevelTabs className="ml-auto" label={tr('Cấp độ JLPT')} value={level} onChange={chooseLevel} levels={availableLevels} />
      </div>

      {(levelQuery.isPending || (levelId && catalog.isPending)) && (
        <SakuraLoader variant="section" context="lesson" label={trf('Đang tải bài học {0}', { 0: level })} delay={160} />
      )}
      <RefreshingIndicator active={!catalog.isPending && catalog.isFetching} />
      {levelQuery.isError && <Card><ErrorState error={levelQuery.error} title={tr('Chưa tải được cấp độ JLPT')} onRetry={() => levelQuery.refetch()} retrying={levelQuery.isFetching} compact /></Card>}
      {catalog.isError && <Card><ErrorState error={catalog.error} title={tr('Chưa tải được danh sách bài học')} onRetry={() => catalog.refetch()} retrying={catalog.isFetching} compact /></Card>}
      {((levelQuery.isSuccess && !levelId) || (catalog.isSuccess && scoped.length === 0)) && (
        <Card><EmptyState variant="compact" illustration="book" title={trf('Chưa có bài học {0} trong mục này', { 0: level })} description={tr('Nội dung sẽ xuất hiện khi bài học được duyệt và công bố. Bạn có thể chọn cấp độ khác.')} /></Card>
      )}
      {catalog.isSuccess && scoped.length > 0 && filtered.length === 0 && (
        <Card>
          <EmptyState
            variant="compact"
            illustration="book"
            title={tr('Không tìm thấy bài học phù hợp')}
            description={tr('Thử từ khóa khác hoặc bỏ bớt bộ lọc.')}
            action={<Button variant="secondary" size="sm" onClick={() => updateParams({ q: null, skill: null })}>{tr('Xóa bộ lọc')}</Button>}
          />
        </Card>
      )}

      {visible.length > 0 && (
        <>
          <p className="text-[12.5px] text-rp-text-muted" role="status">
            {trf('Hiển thị {0}/{1} bài học', { 0: visible.length, 1: filtered.length })}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((lesson) => (
              <LessonCard
                key={lesson.lessonId}
                lesson={lesson}
                practiceLocked={Boolean(practiceLocks.get(Number(lesson.lessonId)))}
                href={lessonPlayerPath(lesson.lessonId, { from: 'catalog', level, section, q: query, skill: skillFilter })}
              />
            ))}
          </ul>
          {filtered.length > visible.length && (
            <div className="flex justify-center">
              <Button variant="secondary" size="md" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                {trf('Xem thêm {0} bài', { 0: Math.min(PAGE_SIZE, filtered.length - visible.length) })}
              </Button>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}

export default function LessonList({ section = 'lessons' }) {
  const { tr } = useLocale();
  const { user } = useAuth();
  const userId = user?.userId;
  return (
    <LearnerShell breadcrumb={tr(sections[section].title)}>
      <Catalog key={JSON.stringify([section, userId])} section={section} userId={userId} />
    </LearnerShell>
  );
}
