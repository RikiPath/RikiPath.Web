import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Info, Lock } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import {
  Badge,
  Button,
  Card,
  CustomSelect,
  EmptyState,
  ErrorState,
  PageContainer,
  ProgressBar,
  RefreshingIndicator,
  SakuraLoader,
  SearchInput,
  cx,
} from '@/components/ui';
import { IllustratedPageHeader, LevelTabs, SUPPORTED_JLPT_LEVELS } from '@/features/learner-ui';
import { useAuth } from '@/app/auth/authContext.js';
import { getCertificateTypes, getLevelsByCertificate } from '@/features/learning-path/api/certificateApi.js';
import { getLessonCatalog } from '@/features/learning-path/api/learningPathApi.js';
import {
  catalogPracticeLocks,
  isCatalogLessonCleared,
} from '@/features/learning-journey/journeyModel.js';
import {
  LESSON_CATEGORIES,
  backendCatalogLockScope,
  catalogBackendSectionForCategory,
  filterLessonsByCategory,
  getLessonCategoryMeta,
  resolveCatalogCardView,
  resolveLessonCategory,
} from '@/features/learning-journey/lessonCatalogModel.js';
import { catalogPath, lessonPlayerPath } from '@/features/learning-journey/lessonNavigation.js';
import { useLocale } from '@/locales/locale.js';

const DEFAULT_LEVELS = SUPPORTED_JLPT_LEVELS;
const PAGE_SIZE = 12;

async function loadJlptLevels() {
  const types = await getCertificateTypes();
  const jlpt = types.find((type) => type.name?.trim().toUpperCase() === 'JLPT');
  return jlpt ? getLevelsByCertificate(jlpt.id) : [];
}

function normalize(text) {
  return String(text ?? '').toLocaleLowerCase('vi-VN').normalize('NFC');
}

function LessonCard({ lesson, practiceLocked, href }) {
  const { tr, trf } = useLocale();
  const view = resolveCatalogCardView(lesson, practiceLocked);

  return (
    <li>
      <Link
        to={href}
        className={cx(
          'group rp-focus flex h-full flex-col rounded-rp-card border border-rp-line bg-white p-4 shadow-rp-xs',
          'transition-[transform,box-shadow,border-color,background-color] duration-[var(--rp-dur-standard)] hover:-translate-y-0.5 hover:border-rp-brand-border hover:bg-rp-brand-tint/20 hover:shadow-rp-card motion-reduce:hover:translate-y-0',
        )}
      >
        <div className="flex items-center">
          <Badge tone={view.tone} size="sm" icon={view.showCheckIcon ? Check : false}>
            {tr(view.label)}
          </Badge>
        </div>

        <h3 className="rp-jp mt-2.5 text-[15px] font-bold leading-snug text-rp-text transition-colors group-hover:text-rp-brand-strong">
          {tr(lesson.title)}
        </h3>

        {lesson.description && (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-5 text-rp-text-2" title={lesson.description}>
            {tr(lesson.description)}
          </p>
        )}

        {view.progressPercent != null && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[11.5px] font-semibold text-rp-text-muted">
              <span>{tr('Tiến độ bài học')}</span>
              <span className="tabular-nums text-rp-text-2">{view.progressPercent}%</span>
            </div>
            <ProgressBar
              value={view.progressPercent}
              max={100}
              size="sm"
              label={trf('Tiến độ bài học {0}%', { 0: view.progressPercent })}
            />
          </div>
        )}

        {view.note && (
          <p className="mt-2.5 inline-flex items-start gap-1.5 text-[12px] leading-4 text-rp-text-muted">
            {view.noteLocked ? (
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-warning" aria-hidden="true" />
            )}
            <span>{tr(view.note)}</span>
          </p>
        )}

        <span className="mt-auto inline-flex items-center gap-1 pt-3.5 text-[13px] font-semibold text-rp-brand-strong">
          {tr(view.ctaLabel)}
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-[var(--rp-dur-standard)] group-hover:translate-x-0.5 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </span>
      </Link>
    </li>
  );
}

function Catalog({ section, userId }) {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = resolveLessonCategory({
    categoryParam: searchParams.get('category'),
    skillParam: searchParams.get('skill'),
    section,
  });
  const categoryMeta = getLessonCategoryMeta(activeCategory);
  const preferenceKey = ['rikipath', 'study-level', userId ?? 'guest', 'catalog'].join(':');

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
  const [storedLevel, setStoredLevel] = useState(() => {
    try {
      const saved = localStorage.getItem(preferenceKey);
      return DEFAULT_LEVELS.includes(saved) ? saved : 'N5';
    } catch {
      return 'N5';
    }
  });
  const level = DEFAULT_LEVELS.includes(requestedLevel) ? requestedLevel : storedLevel;
  const query = searchParams.get('q') ?? '';
  const filterSignature = `${activeCategory}|${level}|${query}`;
  const [paginationState, setPaginationState] = useState({ sig: filterSignature, count: PAGE_SIZE });
  const visibleCount = paginationState.sig === filterSignature ? paginationState.count : PAGE_SIZE;

  function updateParams(patch) {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
    setPaginationState({ sig: filterSignature, count: PAGE_SIZE });
  }

  function chooseLevel(nextLevel) {
    setStoredLevel(nextLevel);
    updateParams({ level: nextLevel });
    try {
      localStorage.setItem(preferenceKey, nextLevel);
    } catch {
      // Selection still works when browser storage is unavailable.
    }
  }

  function chooseCategory(nextCategory) {
    const target = catalogPath({
      category: nextCategory,
      level,
      q: query,
    });
    navigate(target);
  }

  const levelId = levelQuery.data?.find((item) => item.code?.trim().toUpperCase() === level)?.id;
  const catalog = useQuery({
    queryKey: ['self-study-catalog', userId, levelId],
    queryFn: () => getLessonCatalog(levelId),
    enabled: Boolean(levelId),
    retry: false,
  });

  const allLevelLessons = catalog.data?.lessons ?? [];
  const categoryLessons = filterLessonsByCategory(allLevelLessons, activeCategory);
  const practiceLocks = catalogPracticeLocks(backendCatalogLockScope(allLevelLessons, activeCategory));
  const needle = normalize(query.trim());
  const filtered = categoryLessons.filter(
    (lesson) => !needle || normalize(lesson.title).includes(needle) || normalize(lesson.description).includes(needle),
  );
  const visible = filtered.slice(0, visibleCount);
  const doneCount = categoryLessons.filter(isCatalogLessonCleared).length;
  const backendSection = catalogBackendSectionForCategory(activeCategory);

  return (
    <PageContainer width="default" density="comfortable" className="space-y-4">
      <IllustratedPageHeader
        icon={categoryMeta.icon}
        iconSize="md"
        tone={categoryMeta.tone}
        compact
        className="min-h-[104px]"
        eyebrow={trf('Khám phá bài học · JLPT {0}', { 0: level })}
        title={tr(categoryMeta.title)}
        description={tr(categoryMeta.description)}
        actions={
          catalog.isSuccess && categoryLessons.length > 0 ? (
            <div className="flex h-11 min-w-[152px] flex-col justify-center rounded-xl border border-rp-line bg-white px-3 shadow-rp-xs">
              <div className="flex items-center justify-between gap-2 text-[11.5px]">
                <span className="font-semibold text-rp-text-muted">{trf('Tiến độ {0}', { 0: level })}</span>
                <span className="font-extrabold tabular-nums text-rp-navy">
                  {trf('{0}/{1} bài', { 0: doneCount, 1: categoryLessons.length })}
                </span>
              </div>
              <ProgressBar value={doneCount} max={categoryLessons.length} label={trf('Tiến độ {0}', { 0: level })} className="mt-1" />
            </div>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2.5 rounded-rp-card border border-rp-line bg-white px-3 py-2.5">
        <SearchInput
          value={query}
          onChange={(event) => updateParams({ q: event.target.value })}
          placeholder="Tìm bài học…"
          className="w-full sm:w-64 lg:w-72"
          aria-label={tr('Tìm bài học')}
        />
        <div className="w-full sm:w-44 lg:hidden">
          <CustomSelect
            size="md"
            value={activeCategory}
            onChange={chooseCategory}
            aria-label={tr('Danh mục bài học')}
            options={LESSON_CATEGORIES.map((category) => ({
              value: category.id,
              label: tr(category.navLabel),
            }))}
          />
        </div>
        <LevelTabs
          className="w-full overflow-x-auto sm:ml-auto sm:w-auto"
          label={tr('Cấp độ JLPT')}
          value={level}
          onChange={chooseLevel}
          levels={availableLevels}
        />
      </div>

      {(levelQuery.isPending || (levelId && catalog.isPending)) && (
        <SakuraLoader variant="section" context="lesson" label={trf('Đang tải bài học {0}', { 0: level })} delay={160} />
      )}
      <RefreshingIndicator active={!catalog.isPending && catalog.isFetching} />
      {levelQuery.isError && (
        <Card>
          <ErrorState
            error={levelQuery.error}
            title={tr('Chưa tải được cấp độ JLPT')}
            onRetry={() => levelQuery.refetch()}
            retrying={levelQuery.isFetching}
            compact
          />
        </Card>
      )}
      {catalog.isError && (
        <Card>
          <ErrorState
            error={catalog.error}
            title={tr('Chưa tải được danh sách bài học')}
            onRetry={() => catalog.refetch()}
            retrying={catalog.isFetching}
            compact
          />
        </Card>
      )}
      {((levelQuery.isSuccess && !levelId) || (catalog.isSuccess && categoryLessons.length === 0)) && (
        <Card>
          <EmptyState
            variant="compact"
            illustration="book"
            title={trf('Chưa có bài học {0} trong mục này', { 0: level })}
            description={tr('Nội dung sẽ xuất hiện khi bài học được duyệt và công bố. Bạn có thể chọn cấp độ khác.')}
          />
        </Card>
      )}
      {catalog.isSuccess && categoryLessons.length > 0 && filtered.length === 0 && (
        <Card>
          <EmptyState
            variant="compact"
            illustration="book"
            title={tr('Không tìm thấy bài học phù hợp')}
            description={tr('Thử từ khóa khác hoặc bỏ bớt bộ lọc.')}
            action={(
              <Button variant="secondary" size="sm" onClick={() => updateParams({ q: null })}>
                {tr('Xóa tìm kiếm')}
              </Button>
            )}
          />
        </Card>
      )}

      {visible.length > 0 && (
        <>
          <p className="text-[12.5px] text-rp-text-muted" role="status">
            {trf('Hiển thị {0}/{1} bài học', { 0: visible.length, 1: filtered.length })}
          </p>
          <ul className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((lesson) => (
              <LessonCard
                key={lesson.lessonId}
                lesson={lesson}
                practiceLocked={Boolean(practiceLocks.get(Number(lesson.lessonId)))}
                href={lessonPlayerPath(lesson.lessonId, {
                  from: 'catalog',
                  level,
                  category: activeCategory,
                  section: backendSection,
                  q: query,
                })}
              />
            ))}
          </ul>
          {filtered.length > visible.length && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setPaginationState({ sig: filterSignature, count: visibleCount + PAGE_SIZE })}
              >
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
  const [searchParams] = useSearchParams();
  const activeCategory = resolveLessonCategory({
    categoryParam: searchParams.get('category'),
    skillParam: searchParams.get('skill'),
    section,
  });
  const categoryMeta = getLessonCategoryMeta(activeCategory);
  const userId = user?.userId;

  return (
    <LearnerShell breadcrumb={tr(categoryMeta.navLabel)}>
      <Catalog key={userId ?? 'guest'} section={section} userId={userId} />
    </LearnerShell>
  );
}
