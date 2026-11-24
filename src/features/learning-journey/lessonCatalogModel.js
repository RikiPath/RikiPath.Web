// Pure view-model helpers for unified Learner Lesson Discovery across all 6 categories.
// Kept JSX-free so Node contract tests verify filtering, status mapping, and lock scope directly.

import { isCatalogLessonCleared } from './journeyModel.js';

export const LESSON_CATEGORY_IDS = Object.freeze([
  'all',
  'vocabulary',
  'grammar',
  'kanji',
  'listening',
  'reading',
]);

export const LESSON_CATEGORIES = Object.freeze([
  {
    id: 'all',
    skill: null,
    navLabel: 'Tất cả bài học',
    title: 'Khám phá bài học',
    description: 'Tìm kiếm và học tiếng Nhật theo trình độ, kỹ năng và mục tiêu của bạn.',
    icon: 'lesson_catalog',
    tone: 'sakura',
    to: '/lessons',
  },
  {
    id: 'vocabulary',
    skill: 'Vocabulary',
    navLabel: 'Từ vựng',
    title: 'Bài học Từ vựng',
    description: 'Mở rộng vốn từ tiếng Nhật theo chủ đề, cấp độ JLPT và tình huống giao tiếp.',
    icon: 'vocabulary',
    tone: 'mint',
    to: '/lessons?category=vocabulary',
  },
  {
    id: 'grammar',
    skill: 'Grammar',
    navLabel: 'Ngữ pháp',
    title: 'Bài học Ngữ pháp',
    description: 'Nắm vững cấu trúc câu, cách sử dụng và vận dụng ngữ pháp tiếng Nhật chính xác.',
    icon: 'grammar',
    tone: 'peach',
    to: '/lessons?category=grammar',
  },
  {
    id: 'kanji',
    skill: 'Kanji',
    navLabel: 'Kanji',
    title: 'Bài học Kanji',
    description: 'Làm quen, ghi nhớ và nhận diện Kanji qua cách đọc, ý nghĩa và ví dụ thực tế.',
    icon: 'kanji',
    tone: 'lavender',
    to: '/lessons?category=kanji',
  },
  {
    id: 'listening',
    skill: 'Listening',
    navLabel: 'Nghe hiểu',
    title: 'Bài học Nghe hiểu',
    description: 'Rèn luyện kỹ năng nghe tiếng Nhật qua hội thoại, tình huống và bài tập theo cấp độ JLPT.',
    icon: 'listening',
    tone: 'sky',
    to: '/lessons?category=listening',
  },
  {
    id: 'reading',
    skill: 'Reading',
    navLabel: 'Đọc hiểu',
    title: 'Bài học Đọc hiểu',
    description: 'Phát triển khả năng đọc, nắm bắt thông tin và hiểu nội dung văn bản tiếng Nhật.',
    icon: 'reading',
    tone: 'navy',
    to: '/lessons?category=reading',
  },
]);

export const LESSON_CATEGORY_MAP = Object.freeze(
  Object.fromEntries(LESSON_CATEGORIES.map((category) => [category.id, category])),
);

const SKILL_TO_CATEGORY = Object.freeze({
  vocabulary: 'vocabulary',
  grammar: 'grammar',
  kanji: 'kanji',
  listening: 'listening',
  reading: 'reading',
});

/** Resolves the active discovery category from `?category=...`, legacy `?skill=...`, or route `section`. */
export function resolveLessonCategory({ categoryParam, skillParam, section } = {}) {
  const normalizedSection = String(section ?? '').trim().toLowerCase();
  if (normalizedSection === 'listening') return 'listening';
  if (normalizedSection === 'reading') return 'reading';

  const normalizedCategory = String(categoryParam ?? '').trim().toLowerCase();
  if (LESSON_CATEGORY_IDS.includes(normalizedCategory)) return normalizedCategory;

  const normalizedSkill = String(skillParam ?? '').trim().toLowerCase();
  if (normalizedSkill && SKILL_TO_CATEGORY[normalizedSkill]) return SKILL_TO_CATEGORY[normalizedSkill];

  return 'all';
}

export function getLessonCategoryMeta(categoryId) {
  return LESSON_CATEGORY_MAP[categoryId] ?? LESSON_CATEGORY_MAP.all;
}

export function filterLessonsByCategory(lessons, categoryId) {
  const list = Array.isArray(lessons) ? lessons : [];
  const meta = getLessonCategoryMeta(categoryId);
  if (!meta.skill) return list;
  const targetSkill = meta.skill.toLowerCase();
  return list.filter((lesson) => String(lesson?.languageSkillName ?? '').trim().toLowerCase() === targetSkill);
}

/**
 * Matches Backend `PracticeQuizService.CATALOG_LESSON_LOCKED`: Listening/Reading check preceding lessons
 * within the same skill, while general catalog routes check across all lessons in the selected level.
 */
export function backendCatalogLockScope(lessons, categoryId) {
  const list = Array.isArray(lessons) ? lessons : [];
  if (categoryId === 'listening') {
    return list.filter((lesson) => String(lesson?.languageSkillName ?? '').trim().toLowerCase() === 'listening');
  }
  if (categoryId === 'reading') {
    return list.filter((lesson) => String(lesson?.languageSkillName ?? '').trim().toLowerCase() === 'reading');
  }
  return list;
}

export function catalogBackendSectionForCategory(categoryId) {
  if (categoryId === 'listening') return 'listening';
  if (categoryId === 'reading') return 'reading';
  return 'lessons';
}

/**
 * Maps real Backend `LessonProgress` + `practicePassed` fields strictly into the 3 standardized card statuses:
 * `not_started` (neutral) | `in_progress` (warning) | `completed` (success).
 * Never fabricates progress or marks a lesson with an unpassed required practice quiz as completed.
 */
export function resolveCatalogCardView(lesson, practiceLocked = false) {
  if (isCatalogLessonCleared(lesson)) {
    return {
      status: 'completed',
      label: 'Đã hoàn thành',
      tone: 'success',
      showCheckIcon: true,
      ctaLabel: 'Xem lại bài học',
      progressPercent: null,
      note: null,
      noteLocked: false,
    };
  }

  const rawPercent = Number(lesson?.progressPercent);
  const realPercent = Number.isFinite(rawPercent) && rawPercent > 0
    ? Math.min(100, Math.round(rawPercent))
    : null;
  const contentCompletedNeedsPractice = Boolean(
    lesson?.isCompleted && lesson?.hasPracticeExercise && !lesson?.practicePassed,
  );
  const started = Boolean(lesson?.isCompleted) || realPercent !== null;

  if (started) {
    let note = null;
    let noteLocked = false;
    if (contentCompletedNeedsPractice) {
      if (practiceLocked) {
        note = 'Đã xem nội dung · kiểm tra nhanh mở sau khi hoàn thành các bài trước';
        noteLocked = true;
      } else {
        note = 'Đã xem nội dung · cần hoàn thành bài kiểm tra nhanh';
      }
    } else if (practiceLocked && lesson?.hasPracticeExercise) {
      note = 'Kiểm tra nhanh mở sau khi hoàn thành các bài trước';
      noteLocked = true;
    }

    return {
      status: 'in_progress',
      label: 'Đang học',
      tone: 'warning',
      showCheckIcon: false,
      ctaLabel: 'Tiếp tục học',
      progressPercent: realPercent,
      note,
      noteLocked,
    };
  }

  const lockedNote = practiceLocked && lesson?.hasPracticeExercise
    ? 'Kiểm tra nhanh mở sau khi hoàn thành các bài trước'
    : null;

  return {
    status: 'not_started',
    label: 'Chưa học',
    tone: 'neutral',
    showCheckIcon: false,
    ctaLabel: 'Bắt đầu học',
    progressPercent: null,
    note: lockedNote,
    noteLocked: Boolean(lockedNote),
  };
}
