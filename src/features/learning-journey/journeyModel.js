// Pure view-model helpers for the Learning Journey (Roadmap → Stage → Lesson Player).
// Every state here is DERIVED from Adaptive Roadmap V2 / LessonProgress data returned by the Backend.
// Nothing in this file unlocks content, grades answers or invents prerequisites: the Backend stays the
// source of truth (SELF_STUDY_LESSON_LOCKED, CATALOG_LESSON_LOCKED, CHECKPOINT_LOCKED are enforced there).

import { buildStageProgress, resolvePrimaryStages } from '@/features/learning-path/adaptiveRoadmapModel.js';
import { lessonPlayerPath, stageDetailPath } from './lessonNavigation.js';

export const STAGE_STATE = Object.freeze({
  LOCKED: 'locked',
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  NEEDS_REVIEW: 'needs_review',
  COMPLETED: 'completed',
});

export const STAGE_STATE_META = Object.freeze({
  [STAGE_STATE.LOCKED]: { label: 'Chưa mở', tone: 'neutral', cta: 'Xem chặng' },
  [STAGE_STATE.READY]: { label: 'Có thể bắt đầu', tone: 'brand', cta: 'Bắt đầu chặng' },
  [STAGE_STATE.IN_PROGRESS]: { label: 'Đang học', tone: 'brand', cta: 'Tiếp tục chặng' },
  [STAGE_STATE.NEEDS_REVIEW]: { label: 'Cần ôn tập', tone: 'warning', cta: 'Ôn lại chặng' },
  [STAGE_STATE.COMPLETED]: { label: 'Hoàn thành', tone: 'success', cta: 'Xem lại chặng' },
});

export const SKILL_NAME_LABELS = Object.freeze({
  Vocabulary: 'Từ vựng',
  Kanji: 'Kanji',
  Grammar: 'Ngữ pháp',
  Reading: 'Đọc hiểu',
  Listening: 'Nghe hiểu',
  Speaking: 'Luyện nói',
  Writing: 'Luyện viết',
});

export function skillNameLabel(name) {
  return SKILL_NAME_LABELS[name] || name || '';
}

/** Stable, URL-safe identifier of a stage (Backend StageId, or the synthetic key of the fallback grouping). */
export function stageKey(stage) {
  return String(stage?.stageId ?? stage?.title ?? '');
}

export function resolveStageState(stage) {
  const lessons = Array.isArray(stage?.lessons) ? stage.lessons : [];
  const status = String(stage?.status ?? '').trim();
  const progress = buildStageProgress(stage);
  if (status === 'Completed' || status === 'Mastered') return STAGE_STATE.COMPLETED;
  if (status === 'NeedsReview') return STAGE_STATE.NEEDS_REVIEW;
  if (lessons.length > 0 && lessons.every((lesson) => lesson.isLocked)) return STAGE_STATE.LOCKED;
  if (status === 'InProgress') return STAGE_STATE.IN_PROGRESS;
  if (!status && progress.isCompleted && (!stage?.groupQuiz || stage.groupQuiz.isPassed)) return STAGE_STATE.COMPLETED;
  if (!status && lessons.some((lesson) => lesson.isStudied || lesson.isCompleted)) return STAGE_STATE.IN_PROGRESS;
  return STAGE_STATE.READY;
}

export function stageProgress(stage) {
  const base = buildStageProgress(stage);
  const total = Number.isFinite(Number(stage?.totalLessons)) && Number(stage.totalLessons) > 0
    ? Number(stage.totalLessons)
    : base.total;
  const completed = Number.isFinite(Number(stage?.completedLessons))
    ? Math.min(Number(stage.completedLessons), total)
    : base.completed;
  return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

export function stageMinutes(stage) {
  const total = Number(stage?.estimatedMinutesTotal);
  if (Number.isFinite(total) && total > 0) return total;
  const sum = (stage?.lessons ?? []).reduce((acc, lesson) => acc + (Number(lesson?.estimatedMinutes) || 0), 0);
  return sum > 0 ? sum : null;
}

/** The lesson the Backend recommends next (or the first open, unfinished lesson as a display fallback). */
export function findNextLesson(stages) {
  const lessons = (stages ?? []).flatMap((stage) => stage.lessons ?? []);
  return lessons.find((lesson) => lesson.isRecommendedNext && !lesson.isLocked && !lesson.isCompleted)
    ?? lessons.find((lesson) => !lesson.isCompleted && !lesson.isLocked)
    ?? null;
}

export function findStageOfLesson(stages, lessonId) {
  const id = Number(lessonId);
  return (stages ?? []).find((stage) => (stage.lessons ?? []).some((lesson) => Number(lesson.lessonId) === id)) ?? null;
}

/** Stage the learner should focus on: the one holding the next lesson, else the first unfinished stage. */
export function findCurrentStage(stages) {
  const next = findNextLesson(stages);
  if (next) return findStageOfLesson(stages, next.lessonId);
  return (stages ?? []).find((stage) => resolveStageState(stage) !== STAGE_STATE.COMPLETED) ?? null;
}

export function findStageByKey(stages, key) {
  const wanted = String(key ?? '');
  return (stages ?? []).find((stage) => stageKey(stage) === wanted) ?? null;
}

export function stageCheckpoints(stage) {
  return [stage?.groupQuiz, stage?.stageAssessment].filter(Boolean);
}

export function checkpointId(checkpoint) {
  return checkpoint?.exerciseId ?? checkpoint?.practiceExerciseId ?? null;
}

/** Next open lesson after `lessonId` inside the same stage (ordered by Backend sort order). */
export function findNextLessonInStage(stage, lessonId) {
  const lessons = stage?.lessons ?? [];
  const index = lessons.findIndex((lesson) => Number(lesson.lessonId) === Number(lessonId));
  if (index < 0) return null;
  return lessons.slice(index + 1).find((lesson) => !lesson.isCompleted) ?? lessons[index + 1] ?? null;
}

/** Explanation for a locked lesson, naming the real prerequisite the Backend reported. */
export function lessonLockReason(stages, lesson) {
  if (!lesson?.isLocked) return null;
  const prerequisiteId = lesson.prerequisiteLessonId;
  const prerequisite = prerequisiteId
    ? (stages ?? []).flatMap((stage) => stage.lessons ?? []).find((item) => Number(item.lessonId) === Number(prerequisiteId))
    : null;
  return prerequisite
    ? { template: 'Hoàn thành bài “{0}” để mở bài này.', value: prerequisite.title }
    : { template: 'Hoàn thành bài luyện tập trước để mở bài này.', value: null };
}

export function journeyOverview(roadmap) {
  const stages = resolvePrimaryStages(roadmap);
  const lessons = stages.flatMap((stage) => stage.lessons ?? []);
  const total = Number(roadmap?.totalLessons) > 0 ? Number(roadmap.totalLessons) : lessons.length;
  const completed = Number.isFinite(Number(roadmap?.completedLessons))
    ? Number(roadmap.completedLessons)
    : lessons.filter((lesson) => lesson.isCompleted).length;
  return {
    stages,
    totalLessons: total,
    completedLessons: Math.min(completed, total),
    percent: total > 0 ? Math.round((Math.min(completed, total) / total) * 100) : 0,
    nextLesson: findNextLesson(stages),
    currentStage: findCurrentStage(stages),
  };
}

/**
 * The single next step for "Tiếp tục học": the Backend's checkpoint recommendation (nextActionType) first,
 * then the recommended lesson, then any unlocked checkpoint that is not passed yet.
 */
export function resolveNextStep(roadmap, overview) {
  const stages = overview?.stages ?? [];
  const type = String(roadmap?.nextActionType ?? '').toUpperCase();
  const checkpointStep = (stage, checkpoint) => ({
    kind: 'checkpoint',
    title: checkpoint.title,
    questionCount: checkpoint.questionCount,
    to: stageDetailPath(stageKey(stage), { checkpoint: checkpointId(checkpoint) }),
    ctaLabel: 'Làm bài kiểm tra',
    stage,
  });

  if ((type === 'GROUP_QUIZ' || type === 'STAGE_ASSESSMENT') && roadmap?.nextCheckpointExerciseId) {
    for (const stage of stages) {
      const match = stageCheckpoints(stage).find((cp) => Number(checkpointId(cp)) === Number(roadmap.nextCheckpointExerciseId));
      if (match && match.isUnlocked !== false) return checkpointStep(stage, match);
    }
  }

  const lesson = overview?.nextLesson;
  if (lesson) {
    const stage = findStageOfLesson(stages, lesson.lessonId);
    const started = lesson.isStudied || (stage?.lessons ?? []).some((item) => item.isCompleted || item.isStudied);
    return {
      kind: 'lesson',
      title: lesson.title,
      minutes: Number(lesson.estimatedMinutes) || 0,
      skillName: lesson.languageSkillName,
      to: lessonPlayerPath(lesson.lessonId, { from: 'roadmap', stageId: stage ? stageKey(stage) : null }),
      ctaLabel: started ? 'Tiếp tục học' : 'Bắt đầu học',
      stage,
    };
  }

  for (const stage of stages) {
    const open = stageCheckpoints(stage).find((cp) => cp.isUnlocked !== false && !cp.isPassed);
    if (open) return checkpointStep(stage, open);
  }
  return null;
}

// ── Discovery catalog (LessonProgress catalog) ────────────────────────────────────────────────────

/** A catalog lesson counts as cleared exactly like Backend `LessonPracticeProgress` (passed QuickCheck, or studied when no QuickCheck). */
export function isCatalogLessonCleared(lesson) {
  return Boolean(lesson?.practicePassed || (lesson?.isCompleted && !lesson?.hasPracticeExercise));
}

/**
 * Mirrors the Backend catalog rule (`CATALOG_LESSON_LOCKED`): the QuickCheck of a catalog lesson opens once
 * every preceding lesson of the same level (and same skill for the listening/reading sections) is cleared.
 * Content stays viewable; this is only a hint — the Backend rejects early attempts.
 * @returns {Map<number, boolean>} lessonId → practice locked
 */
export function catalogPracticeLocks(lessons) {
  const locks = new Map();
  let blocked = false;
  for (const lesson of lessons ?? []) {
    locks.set(Number(lesson.lessonId), blocked);
    if (!isCatalogLessonCleared(lesson)) blocked = true;
  }
  return locks;
}

export function catalogLessonState(lesson, practiceLocked) {
  if (isCatalogLessonCleared(lesson)) return { code: 'completed', label: 'Đã hoàn thành', tone: 'success' };
  if (lesson?.isCompleted && lesson?.hasPracticeExercise) {
    return practiceLocked
      ? { code: 'practice_locked', label: 'Đã học · chờ mở luyện tập', tone: 'neutral' }
      : { code: 'pending_quiz', label: 'Chờ kiểm tra nhanh', tone: 'brand' };
  }
  if (Number(lesson?.progressPercent) > 0) return { code: 'in_progress', label: 'Đang học', tone: 'brand' };
  return { code: 'new', label: 'Chưa học', tone: 'neutral' };
}

// ── Journey Map view models ────────────────────────────────────────────────────────────────────────

/** Standard roadmap stage → Journey Map node. */
export function toJourneyStageView(stage) {
  const progress = stageProgress(stage);
  const checkpoints = stageCheckpoints(stage);
  return {
    key: stageKey(stage),
    title: stage.title,
    levelCode: stage.levelCode,
    isBridge: Boolean(stage.isBridgeStage),
    objective: stage.learningObjectives || stage.description || null,
    completed: progress.completed,
    total: progress.total,
    unit: 'lesson',
    state: resolveStageState(stage),
    minutes: stageMinutes(stage),
    checkpoint: checkpoints.length > 0 ? { passed: checkpoints.every((cp) => cp.isPassed) } : null,
    to: stageDetailPath(stageKey(stage)),
  };
}

/** AI learning-path phase (from `buildAiRoadmapTree`) → Journey Map node. Days are the unit of progress. */
export function toAiJourneyStageView(branch, { levelCode, onSelect } = {}) {
  const state = branch.status === 'completed'
    ? STAGE_STATE.COMPLETED
    : branch.status === 'active'
      ? (branch.completedCount > 0 || branch.activeDay?.isStarted ? STAGE_STATE.IN_PROGRESS : STAGE_STATE.READY)
      : STAGE_STATE.LOCKED;
  return {
    key: branch.id,
    title: branch.title,
    levelCode: levelCode || null,
    isBridge: false,
    objective: branch.focus || null,
    completed: branch.completedCount,
    total: branch.totalCount,
    unit: 'day',
    state,
    minutes: null,
    checkpoint: null,
    ctaLabel: 'Xem lịch học của chặng',
    onSelect,
  };
}
