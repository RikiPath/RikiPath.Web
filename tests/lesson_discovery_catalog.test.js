import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  LESSON_CATEGORIES,
  LESSON_CATEGORY_IDS,
  backendCatalogLockScope,
  catalogBackendSectionForCategory,
  filterLessonsByCategory,
  getLessonCategoryMeta,
  resolveCatalogCardView,
  resolveLessonCategory,
} from '@/features/learning-journey/lessonCatalogModel.js';
import {
  catalogPath,
  lessonBackTarget,
  lessonPlayerPath,
  readLessonContext,
} from '@/features/learning-journey/lessonNavigation.js';

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
}

describe('Unified Learner Lesson Discovery Catalog', () => {
  it('defines 6 distinct lesson categories with unique 3D icons and unified Kanji naming', () => {
    assert.deepEqual(LESSON_CATEGORY_IDS, ['all', 'vocabulary', 'grammar', 'kanji', 'listening', 'reading']);
    assert.equal(LESSON_CATEGORIES.length, 6);

    const iconSet = new Set(LESSON_CATEGORIES.map((c) => c.icon));
    assert.equal(iconSet.size, 6, 'Each lesson discovery category must have its own distinct 3D icon');

    const titleSet = new Set(LESSON_CATEGORIES.map((c) => c.title));
    assert.equal(titleSet.size, 6, 'Each category must have a distinct page title');

    const descSet = new Set(LESSON_CATEGORIES.map((c) => c.description));
    assert.equal(descSet.size, 6, 'Each category must have a distinct description');

    const kanjiMeta = getLessonCategoryMeta('kanji');
    assert.equal(kanjiMeta.navLabel, 'Kanji');
    assert.equal(kanjiMeta.title, 'Bài học Kanji');
    assert.equal(/Hán tự/.test(`${kanjiMeta.navLabel} ${kanjiMeta.title}`), false);
  });

  it('resolves categories from URL ?category, legacy ?skill, and legacy route sections without breaking defaults', () => {
    assert.equal(resolveLessonCategory({}), 'all');
    assert.equal(resolveLessonCategory({ categoryParam: 'vocabulary' }), 'vocabulary');
    assert.equal(resolveLessonCategory({ categoryParam: 'GRAMMAR' }), 'grammar');
    assert.equal(resolveLessonCategory({ categoryParam: 'kanji' }), 'kanji');
    assert.equal(resolveLessonCategory({ categoryParam: 'listening' }), 'listening');
    assert.equal(resolveLessonCategory({ categoryParam: 'reading' }), 'reading');
    assert.equal(resolveLessonCategory({ categoryParam: 'unknown' }), 'all');
    assert.equal(resolveLessonCategory({ skillParam: 'Kanji' }), 'kanji');
    assert.equal(resolveLessonCategory({ section: 'listening' }), 'listening');
    assert.equal(resolveLessonCategory({ section: 'reading' }), 'reading');
  });

  it('filters lessons by category accurately and preserves Backend CATALOG_LESSON_LOCKED scope parity', () => {
    const sample = [
      { lessonId: 1, languageSkillName: 'Vocabulary' },
      { lessonId: 2, languageSkillName: 'Grammar' },
      { lessonId: 3, languageSkillName: 'Kanji' },
      { lessonId: 4, languageSkillName: 'Listening' },
      { lessonId: 5, languageSkillName: 'Reading' },
    ];

    assert.equal(filterLessonsByCategory(sample, 'all').length, 5);
    assert.deepEqual(filterLessonsByCategory(sample, 'vocabulary').map((l) => l.lessonId), [1]);
    assert.deepEqual(filterLessonsByCategory(sample, 'grammar').map((l) => l.lessonId), [2]);
    assert.deepEqual(filterLessonsByCategory(sample, 'kanji').map((l) => l.lessonId), [3]);
    assert.deepEqual(filterLessonsByCategory(sample, 'listening').map((l) => l.lessonId), [4]);
    assert.deepEqual(filterLessonsByCategory(sample, 'reading').map((l) => l.lessonId), [5]);

    assert.equal(backendCatalogLockScope(sample, 'all').length, 5);
    assert.equal(backendCatalogLockScope(sample, 'vocabulary').length, 5);
    assert.deepEqual(backendCatalogLockScope(sample, 'listening').map((l) => l.lessonId), [4]);
    assert.deepEqual(backendCatalogLockScope(sample, 'reading').map((l) => l.lessonId), [5]);

    assert.equal(catalogBackendSectionForCategory('all'), 'lessons');
    assert.equal(catalogBackendSectionForCategory('vocabulary'), 'lessons');
    assert.equal(catalogBackendSectionForCategory('listening'), 'listening');
    assert.equal(catalogBackendSectionForCategory('reading'), 'reading');
  });

  it('maps real LessonProgress strictly to 3 learning statuses with no fake completion or progress bars', () => {
    // 1. Not started
    assert.deepEqual(
      resolveCatalogCardView({ lessonId: 1, progressPercent: 0, isCompleted: false, hasPracticeExercise: true, practicePassed: false }, false),
      {
        status: 'not_started',
        label: 'Chưa học',
        tone: 'neutral',
        showCheckIcon: false,
        ctaLabel: 'Bắt đầu học',
        progressPercent: null,
        note: null,
        noteLocked: false,
      },
    );

    // 2. Not started but locked prerequisite
    assert.deepEqual(
      resolveCatalogCardView({ lessonId: 2, progressPercent: 0, isCompleted: false, hasPracticeExercise: true, practicePassed: false }, true),
      {
        status: 'not_started',
        label: 'Chưa học',
        tone: 'neutral',
        showCheckIcon: false,
        ctaLabel: 'Bắt đầu học',
        progressPercent: null,
        note: 'Kiểm tra nhanh mở sau khi hoàn thành các bài trước',
        noteLocked: true,
      },
    );

    // 3. In progress with real playback progress
    assert.deepEqual(
      resolveCatalogCardView({ lessonId: 3, progressPercent: 45, isCompleted: false, hasPracticeExercise: true, practicePassed: false }, false),
      {
        status: 'in_progress',
        label: 'Đang học',
        tone: 'warning',
        showCheckIcon: false,
        ctaLabel: 'Tiếp tục học',
        progressPercent: 45,
        note: null,
        noteLocked: false,
      },
    );

    // 4. Content completed but required practice NOT passed -> never falsely marked completed!
    assert.deepEqual(
      resolveCatalogCardView({ lessonId: 4, progressPercent: 100, isCompleted: true, hasPracticeExercise: true, practicePassed: false }, false),
      {
        status: 'in_progress',
        label: 'Đang học',
        tone: 'warning',
        showCheckIcon: false,
        ctaLabel: 'Tiếp tục học',
        progressPercent: 100,
        note: 'Đã xem nội dung · cần hoàn thành bài kiểm tra nhanh',
        noteLocked: false,
      },
    );

    // 5. Completed with no practice exercise
    assert.deepEqual(
      resolveCatalogCardView({ lessonId: 5, progressPercent: 100, isCompleted: true, hasPracticeExercise: false, practicePassed: false }, false),
      {
        status: 'completed',
        label: 'Đã hoàn thành',
        tone: 'success',
        showCheckIcon: true,
        ctaLabel: 'Xem lại bài học',
        progressPercent: null,
        note: null,
        noteLocked: false,
      },
    );

    // 6. Completed with practice passed
    assert.deepEqual(
      resolveCatalogCardView({ lessonId: 6, progressPercent: 100, isCompleted: true, hasPracticeExercise: true, practicePassed: true }, false),
      {
        status: 'completed',
        label: 'Đã hoàn thành',
        tone: 'success',
        showCheckIcon: true,
        ctaLabel: 'Xem lại bài học',
        progressPercent: null,
        note: null,
        noteLocked: false,
      },
    );
  });

  it('round-trips category, JLPT level, search query, and legacy sections through lessonNavigation helpers', () => {
    const playerUrl = lessonPlayerPath(42, {
      from: 'catalog',
      level: 'N4',
      category: 'listening',
      section: 'listening',
      q: 'kaiwa',
    });
    assert.ok(playerUrl.includes('/lesson-player/42/?'));
    const qs = playerUrl.split('?')[1];
    const parsed = readLessonContext(new URLSearchParams(qs));
    assert.equal(parsed.from, 'catalog');
    assert.equal(parsed.level, 'N4');
    assert.equal(parsed.category, 'listening');
    assert.equal(parsed.section, 'listening');
    assert.equal(parsed.q, 'kaiwa');

    const back = lessonBackTarget(parsed);
    assert.equal(back.to, '/lessons/?category=listening&level=N4&q=kaiwa');
    assert.equal(catalogPath({ category: 'all', level: 'N3' }), '/lessons/?level=N3');
  });

  it('enforces single-badge LessonCards, no desktop category dropdown, and distinct catalog clay icon in WebClayIcon', () => {
    const lessonListSrc = readSrc('src/pages/learner/LessonList.jsx');
    const claySrc = readSrc('src/features/learner-ui/WebClayIcon.jsx');

    assert.equal(lessonListSrc.includes("skillNameLabel("), false, 'LessonList cards must not render skill category badges');
    assert.equal(lessonListSrc.includes("'Có audio'"), false, 'LessonList cards must not render secondary Có audio badges');
    assert.ok(lessonListSrc.includes('lg:hidden'), 'Mobile category switcher must be hidden on desktop');
    assert.ok(claySrc.includes("case 'lesson_catalog':"), 'WebClayIcon must define a distinct 3D icon for lesson_catalog');
  });
});
