import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAiRoadmapTree,
  deriveDayStatus,
  normalizeDayLessons,
  pickPreviewBranchDays,
} from '../src/features/learning-path/roadmapTreeModel.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Horizontal Learning Roadmap Tree model', () => {
  it('normalizes both backend parallel arrays (lessons strings + lessonIds) and object entries', () => {
    const parallelDay = {
      day: 1,
      lessonIds: [101, 102],
      lessons: ['Ngữ pháp N4 · Bài 1', 'Từ vựng N4 · Bài 2'],
    };
    assert.deepEqual(normalizeDayLessons(parallelDay), [
      { lessonId: 101, title: 'Ngữ pháp N4 · Bài 1' },
      { lessonId: 102, title: 'Từ vựng N4 · Bài 2' },
    ]);

    const objectDay = {
      day: 2,
      lessons: [{ lessonId: 201, title: 'Kanji N4 · Bài 1' }],
    };
    assert.deepEqual(normalizeDayLessons(objectDay), [
      { lessonId: 201, title: 'Kanji N4 · Bài 1' },
    ]);
  });

  it('derives accurate completion, active, ready, and locked states for day nodes', () => {
    assert.equal(deriveDayStatus({ isCompleted: true, isStarted: true, canStart: true }), 'completed');
    assert.equal(deriveDayStatus({ isCompleted: false, isStarted: true, canStart: true }), 'active');
    assert.equal(deriveDayStatus({ isCompleted: false, isStarted: false, canStart: true }), 'ready');
    assert.equal(deriveDayStatus({ isCompleted: false, isStarted: false, canStart: false }), 'locked');
  });

  it('groups daily schedules cleanly under phase branches from left to right without dropping orphans', () => {
    const tree = buildAiRoadmapTree({
      dailyStudyMinutes: 30,
      daysUntilExam: 90,
      totalStudyDays: 5,
      phases: [
        { title: 'Củng cố nền tảng', focus: 'Từ vựng & Ngữ pháp', startDay: 1, endDay: 2 },
        { title: 'Tăng tốc Đọc hiểu', focus: 'Đoạn văn N4', startDay: 3, endDay: 4 },
      ],
      dailySchedules: [
        { day: 1, title: 'Ngày nền tảng 1', isCompleted: true, canStart: true, lessons: ['Bài 1'], lessonIds: [11] },
        { day: 2, title: 'Ngày nền tảng 2', isCompleted: true, canStart: true, lessons: ['Bài 2'], lessonIds: [12] },
        { day: 3, title: 'Đọc đoạn ngắn', isCompleted: false, isStarted: true, canStart: true, lessons: ['Bài 3'], lessonIds: [13] },
        { day: 4, title: 'Tổng hợp đọc hiểu', isCompleted: false, isStarted: false, canStart: false, lessons: ['Bài 4'], lessonIds: [14] },
        { day: 5, title: 'Ôn checkpoint cuối', isCompleted: false, isStarted: false, canStart: false, lessons: ['Bài 5'], lessonIds: [15] },
      ],
    }, { targetLevelLabel: 'N4' });

    assert.equal(tree.root.levelCode, 'N4');
    assert.equal(tree.stats.completedDays, 2);
    assert.equal(tree.stats.totalDays, 5);
    assert.equal(tree.stats.progressPercent, 40);
    assert.equal(tree.branches.length, 2);

    assert.equal(tree.branches[0].status, 'completed');
    assert.equal(tree.branches[0].days.length, 2);
    assert.equal(tree.branches[0].days[0].normalizedLessons[0].lessonId, 11);

    assert.equal(tree.branches[1].status, 'active');
    assert.equal(tree.branches[1].days.length, 3); // Includes day 5 orphan safely in final branch
    assert.equal(tree.goal.isCompleted, false);
  });

  it('synthesizes clean 5-day phases when backend returns dailySchedules without explicit phases', () => {
    const tree = buildAiRoadmapTree({
      dailySchedules: Array.from({ length: 7 }, (_, i) => ({
        day: i + 1,
        title: `Day ${i + 1}`,
        isCompleted: i === 0,
        canStart: i <= 1,
      })),
    });

    assert.equal(tree.branches.length, 2);
    assert.equal(tree.branches[0].days.length, 5);
    assert.equal(tree.branches[1].days.length, 2);
  });

  it('centers preview window on the active/ready day for long branches', () => {
    const days = Array.from({ length: 8 }, (_, i) => ({
      day: i + 1,
      isCompleted: i < 4,
      isStarted: i === 4,
      canStart: i <= 4,
    }));
    const { visible, hiddenCount } = pickPreviewBranchDays(days, 3);
    assert.equal(hiddenCount, 5);
    assert.deepEqual(visible.map((d) => d.day), [4, 5, 6]);
  });

  it('keeps horizontal tree containers for the AI day tree and unlock guide; journey maps stay vertical', () => {
    const treeSrc = fs.readFileSync(path.join(ROOT, 'src/features/learning-path/components/HorizontalAiRoadmapTree.jsx'), 'utf8');
    const stdSrc = fs.readFileSync(path.join(ROOT, 'src/pages/learner/StandardAssessmentRoadmap.jsx'), 'utf8');
    const jlptSrc = fs.readFileSync(path.join(ROOT, 'src/pages/learner/RoadmapJLPT.jsx'), 'utf8');
    const guideSrc = fs.readFileSync(path.join(ROOT, 'src/features/learning-path/components/LearningPathUnlockGuide.jsx'), 'utf8');

    for (const src of [treeSrc, guideSrc]) {
      assert.match(src, /overflow-x-auto/);
    }
    // Learning Journey V3: the Standard and AI journey maps are vertical timelines (no forced horizontal scroll).
    for (const src of [stdSrc, jlptSrc]) {
      assert.match(src, /<JourneyMap/);
      assert.doesNotMatch(src, /overflow-x-auto/);
    }
  });
});
