// Lesson journey for the dashboard map — derived ONLY from Adaptive Roadmap V2 (`/StandardRoadmap/adaptive`):
// stages → lessons (+ the stage's group quiz and stage assessment). Kinds and states mirror Backend fields;
// nothing here unlocks content or invents steps.
import {
  checkpointId,
  lessonLockReason,
  stageKey,
  stageProgress,
} from '@/features/learning-journey/journeyModel.js';
import { lessonPlayerPath, stageDetailPath } from '@/features/learning-journey/lessonNavigation.js';

export const NODE_KIND = Object.freeze({
  LESSON: 'lesson',
  PRACTICE: 'practice',
  REVIEW: 'review',
  QUIZ: 'quiz',
  CHECKPOINT: 'checkpoint',
});

/** Vietnamese source labels (translated with tr()). */
export const NODE_KIND_LABEL = Object.freeze({
  lesson: 'Bài học',
  practice: 'Luyện tập',
  review: 'Ôn tập',
  quiz: 'Kiểm tra chặng',
  checkpoint: 'Đánh giá tổng kết',
});

/** Scene mood per dominant kind: lesson = light & academic, practice = lively, review = calm, quiz/checkpoint = accented. */
export const SCENE_THEME_OF_KIND = Object.freeze({
  lesson: 'lesson',
  practice: 'practice',
  review: 'review',
  quiz: 'quiz',
  checkpoint: 'quiz',
});

export const MAX_ITEMS_PER_SCENE = 6;

/**
 * Splits a stage's steps into balanced scenes of at most `max` items (7 → 4+3, 8 → 4+4, 10 → 5+5, 12 → 6+6),
 * so a scene never ends with a lonely step and node spacing stays even.
 */
export function chunkBalanced(items, max = MAX_ITEMS_PER_SCENE) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];
  const size = Math.max(1, Math.floor(max));
  const count = Math.ceil(list.length / size);
  const base = Math.floor(list.length / count);
  let extra = list.length % count;
  const out = [];
  let i = 0;
  for (let c = 0; c < count; c += 1) {
    const n = base + (extra > 0 ? 1 : 0);
    extra -= 1;
    out.push(list.slice(i, i + n));
    i += n;
  }
  return out;
}

/** A lesson's kind from its real completion state: needs review → review; studied but quick-check pending → practice. */
export function lessonKind(lesson) {
  const state = String(lesson?.completionState ?? '').trim();
  if (state === 'NeedsReview') return NODE_KIND.REVIEW;
  if (!lesson?.isCompleted && (state === 'StudiedPendingQuiz' || (lesson?.isStudied && lesson?.hasPracticeExercise))) return NODE_KIND.PRACTICE;
  return NODE_KIND.LESSON;
}

function sceneTheme(items) {
  if (items.some((i) => i.kind === NODE_KIND.QUIZ || i.kind === NODE_KIND.CHECKPOINT)) return 'quiz';
  const reviews = items.filter((i) => i.kind === NODE_KIND.REVIEW).length;
  if (reviews > 0 && reviews >= items.length / 2) return 'review';
  if (items.some((i) => i.kind === NODE_KIND.PRACTICE)) return 'practice';
  return 'lesson';
}

/**
 * @returns {null | { items: object[], scenes: { key, stageTitle, levelCode, theme, startIndex, items }[], currentIndex: number,
 *   completedLessons: number, totalLessons: number }}
 *   null when the roadmap has no stages (callers then show the onboarding steps).
 */
export function buildLessonJourney(roadmap, overview, { maxPerScene = MAX_ITEMS_PER_SCENE } = {}) {
  const stages = overview?.stages ?? [];
  if (!roadmap || stages.length === 0) return null;

  const items = [];
  const scenes = [];
  for (const stage of stages) {
    const key = stageKey(stage);
    const progress = stageProgress(stage);
    const stageItems = [];
    for (const lesson of stage.lessons ?? []) {
      const lock = lessonLockReason(stages, lesson);
      stageItems.push({
        id: `lesson-${lesson.lessonId}`,
        kind: lessonKind(lesson),
        title: lesson.title || '',
        stageKey: key,
        stageTitle: stage.title || '',
        levelCode: stage.levelCode || '',
        skillName: lesson.languageSkillName || '',
        minutes: Number(lesson.estimatedMinutes) || 0,
        status: lesson.isCompleted ? 'done' : 'pending',
        started: Boolean(lesson.isStudied || Number(lesson.progressPercent) > 0 || ['StudiedPendingQuiz', 'NeedsReview'].includes(String(lesson.completionState ?? ''))),
        serverLocked: Boolean(lesson.isLocked),
        lock,
        to: lessonPlayerPath(lesson.lessonId, { from: 'roadmap', stageId: key }),
        study: true,
        stageProgress: progress,
      });
    }
    const checkpoints = [
      stage.groupQuiz ? { cp: stage.groupQuiz, kind: NODE_KIND.QUIZ } : null,
      stage.stageAssessment ? { cp: stage.stageAssessment, kind: NODE_KIND.CHECKPOINT } : null,
    ].filter(Boolean);
    for (const { cp, kind } of checkpoints) {
      const to = stageDetailPath(key, { checkpoint: checkpointId(cp) });
      stageItems.push({
        id: `${kind}-${checkpointId(cp) ?? key}`,
        kind,
        title: cp.title || '',
        stageKey: key,
        stageTitle: stage.title || '',
        levelCode: stage.levelCode || '',
        questionCount: Number(cp.questionCount) || 0,
        status: cp.isPassed ? 'done' : 'pending',
        started: false,
        serverLocked: cp.isUnlocked === false,
        lock: cp.isUnlocked === false ? { template: 'Hoàn thành các bài học trong chặng để mở bài kiểm tra.', value: null } : null,
        to,
        study: false,
        stageProgress: progress,
      });
    }
    let offset = 0;
    for (const slice of chunkBalanced(stageItems, maxPerScene)) {
      scenes.push({ key: `${key}-${offset}`, stageTitle: stage.title || '', levelCode: stage.levelCode || '', theme: sceneTheme(slice), startIndex: items.length + offset, items: slice });
      offset += slice.length;
    }
    items.push(...stageItems);
  }

  // Recommended roadmap = strictly sequential: the FIRST unfinished step (in roadmap order) is where the learner is.
  // Every later step is gated — even one already started elsewhere (shown "in progress" but not continuable) —
  // so nobody can skip ahead. The Backend lock (prerequisite) is respected on top of this.
  const gate = items.findIndex((i) => i.status !== 'done');
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    if (it.status === 'done') continue;
    if (i === gate) {
      it.status = 'current';
      it.gated = false;
      continue;
    }
    it.gated = true;
    it.status = it.started ? 'in_progress' : 'locked';
    it.lock = { template: 'Hoàn thành “{0}” trước để mở bước này.', value: items[gate].title };
  }
  const currentIndex = gate >= 0 ? gate : Math.max(0, items.length - 1);
  return {
    items,
    scenes,
    currentIndex,
    completedLessons: overview.completedLessons ?? 0,
    totalLessons: overview.totalLessons ?? 0,
  };
}
