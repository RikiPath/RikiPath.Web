// Navigation contract of the Learning Journey: Roadmap → Stage Detail → Lesson Player, and
// Discovery Catalog → Lesson Player. The return context travels in validated query parameters so a
// direct URL (bookmark, notification, notebook source link) still resolves to a sensible "back" target.

import { SUPPORTED_JLPT_LEVELS } from '@/features/learner-ui/learnerTokens.js';
import {
  catalogBackendSectionForCategory,
  resolveLessonCategory,
} from './lessonCatalogModel.js';

export const LESSON_SOURCES = Object.freeze(['roadmap', 'ai', 'catalog']);
const CATALOG_SECTIONS = Object.freeze(['lessons', 'listening', 'reading']);
const PLAYER_STEPS = Object.freeze(['overview', 'learn', 'practice', 'result']);

function clean(value, max = 80) {
  return String(value ?? '').trim().slice(0, max);
}

export function stageDetailPath(stageId, extra = {}) {
  const params = new URLSearchParams();
  if (extra.checkpoint) params.set('checkpoint', String(extra.checkpoint));
  const qs = params.toString();
  return `/roadmap/stages/${encodeURIComponent(String(stageId))}/${qs ? `?${qs}` : ''}`;
}

export function catalogPath({ category, section = 'lessons', level, q, skill } = {}) {
  const effectiveCategory = resolveLessonCategory({
    categoryParam: category,
    skillParam: skill,
    section,
  });
  const base = '/lessons/';
  const params = new URLSearchParams();
  if (effectiveCategory !== 'all') params.set('category', effectiveCategory);
  if (SUPPORTED_JLPT_LEVELS.includes(level)) params.set('level', level);
  if (clean(q)) params.set('q', clean(q));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Player URL carrying where the learner came from. */
export function lessonPlayerPath(lessonId, context = {}) {
  const params = new URLSearchParams();
  if (LESSON_SOURCES.includes(context.from)) params.set('from', context.from);
  if (context.stageId != null && context.stageId !== '') params.set('stage', String(context.stageId));
  if (SUPPORTED_JLPT_LEVELS.includes(context.level)) params.set('level', context.level);
  const resolvedCategory = resolveLessonCategory({
    categoryParam: context.category,
    skillParam: context.skill,
    section: context.section,
  });
  if (resolvedCategory !== 'all') params.set('category', resolvedCategory);
  const resolvedSection = CATALOG_SECTIONS.includes(context.section)
    ? context.section
    : catalogBackendSectionForCategory(resolvedCategory);
  if (resolvedSection !== 'lessons') params.set('section', resolvedSection);
  if (clean(context.q)) params.set('q', clean(context.q));
  if (clean(context.skill, 24) && resolvedCategory === 'all') params.set('skill', clean(context.skill, 24));
  if (PLAYER_STEPS.includes(context.step)) params.set('step', context.step);
  const qs = params.toString();
  return `/lesson-player/${encodeURIComponent(String(lessonId))}/${qs ? `?${qs}` : ''}`;
}

export function readLessonContext(searchParams) {
  const get = (key) => searchParams?.get?.(key) ?? null;
  const from = LESSON_SOURCES.includes(get('from')) ? get('from') : 'catalog';
  const section = CATALOG_SECTIONS.includes(get('section')) ? get('section') : 'lessons';
  const skill = clean(get('skill'), 24) || null;
  const category = resolveLessonCategory({
    categoryParam: get('category'),
    skillParam: skill,
    section,
  });
  const level = SUPPORTED_JLPT_LEVELS.includes(get('level')) ? get('level') : null;
  const step = PLAYER_STEPS.includes(get('step')) ? get('step') : null;
  return {
    from,
    stageId: clean(get('stage'), 120) || null,
    level,
    category,
    section,
    q: clean(get('q')) || null,
    skill,
    step,
  };
}

/** Where "back" leads from the Lesson Player, and its label (Vietnamese source text for `tr`). */
export function lessonBackTarget(context) {
  if (context?.from === 'roadmap') {
    return context.stageId
      ? { to: stageDetailPath(context.stageId), label: 'Quay lại chặng' }
      : { to: '/roadmap/', label: 'Quay lại lộ trình' };
  }
  if (context?.from === 'ai') return { to: '/roadmap/#ai-roadmap-panel', label: 'Quay lại lộ trình' };
  return { to: catalogPath(context ?? {}), label: 'Quay lại danh sách bài học' };
}
