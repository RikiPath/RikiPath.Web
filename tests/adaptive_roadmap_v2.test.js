import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildStageProgress,
  formatCheckpointScopeLabel,
  formatLessonCompletionState,
  formatSkillProfileItem,
  normalizeRoadmapMode,
  resolvePrimaryStages,
} from '@/features/learning-path/adaptiveRoadmapModel.js';
import { describeMoment, describeAchievement } from '@/features/learning-moments/momentCatalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Adaptive Learning Roadmap V2 — Model & UI Guarantees', () => {
  it('classifies unassessed skills as NOT_YET_ASSESSED ("Chưa đủ dữ liệu") and never 0%', () => {
    const unassessed = formatSkillProfileItem({
      skillCode: 'LISTENING',
      skillLabel: 'Nghe hiểu',
      proficiencyStatus: 'NOT_YET_ASSESSED',
      proficiencyPercent: null,
      evidenceCount: 1,
    });
    assert.equal(unassessed.status, 'NOT_YET_ASSESSED');
    assert.equal(unassessed.statusLabel, 'Chưa đủ dữ liệu');
    assert.equal(unassessed.scoreLabel, null);

    const zeroButNotAssessed = formatSkillProfileItem({
      skillCode: 'KANJI',
      proficiencyStatus: 'NOT_YET_ASSESSED',
      proficiencyPercent: 0,
      evidenceCount: 0,
    });
    assert.equal(zeroButNotAssessed.scoreLabel, null);
    assert.equal(zeroButNotAssessed.statusLabel, 'Chưa đủ dữ liệu');

    const weakAssessed = formatSkillProfileItem({
      skillCode: 'GRAMMAR',
      proficiencyStatus: 'NEEDS_REVIEW',
      proficiencyPercent: 45.4,
      evidenceCount: 8,
      summary: 'Độ chính xác trung bình gần đây ở nhóm Ngữ pháp.',
    });
    assert.equal(weakAssessed.status, 'NEEDS_REVIEW');
    assert.equal(weakAssessed.statusLabel, 'Cần củng cố');
    assert.equal(weakAssessed.scoreLabel, '45%');
    assert.equal(weakAssessed.sourceSummary, 'Độ chính xác trung bình gần đây ở nhóm Ngữ pháp.');
  });

  it('normalizes roadmap mode between STANDARD and AI_PERSONALIZED', () => {
    assert.equal(normalizeRoadmapMode(undefined), 'STANDARD');
    assert.equal(normalizeRoadmapMode('STANDARD'), 'STANDARD');
    assert.equal(normalizeRoadmapMode('AI_PERSONALIZED'), 'AI_PERSONALIZED');
    assert.equal(normalizeRoadmapMode('AiPersonalized'), 'AI_PERSONALIZED');
  });

  it('maps lesson completion states including NeedsReview cleanly without deadlock copy', () => {
    assert.deepEqual(
      formatLessonCompletionState({ isCompleted: false, isLocked: false, completionState: 'NeedsReview' }),
      { code: 'NEEDS_REVIEW', label: 'Cần ôn lại', tone: 'warning' },
    );
    assert.deepEqual(
      formatLessonCompletionState({ isCompleted: true, isLocked: false }),
      { code: 'COMPLETED', label: 'Đã hoàn thành', tone: 'success' },
    );
    assert.deepEqual(
      formatLessonCompletionState({ isCompleted: false, isLocked: true }),
      { code: 'LOCKED', label: 'Chờ đạt bài trước', tone: 'neutral' },
    );
  });

  it('computes stage progress and checkpoint labels accurately', () => {
    const progress = buildStageProgress({
      lessons: [{ isCompleted: true }, { isCompleted: true }, { isCompleted: false }, { isCompleted: false }],
    });
    assert.equal(progress.completed, 2);
    assert.equal(progress.total, 4);
    assert.equal(progress.percent, 50);
    assert.equal(progress.isCompleted, false);

    assert.equal(formatCheckpointScopeLabel('GroupQuiz'), 'Kiểm tra cuối chặng');
    assert.equal(formatCheckpointScopeLabel('StageAssessment'), 'Đánh giá tổng kết cấp độ');
    assert.equal(formatCheckpointScopeLabel('LessonQuickCheck'), 'Kiểm tra nhanh bài học');
  });

  it('builds fallback stages cleanly if older API payloads lack stages[]', () => {
    const stages = resolvePrimaryStages({
      targetJlptLevelName: 'N3',
      lessons: [
        { lessonId: 1, levelCode: 'N4', topicTitle: 'Ôn nền tảng' },
        { lessonId: 2, levelCode: 'N3', topicTitle: 'Chặng 1' },
      ],
    });
    assert.equal(stages.length, 2);
    assert.equal(stages[0].isBridgeStage, true);
    assert.equal(stages[1].isBridgeStage, false);
  });

  it('includes GROUP_QUIZ_PASSED and STAGE_ASSESSMENT_PASSED in momentCatalog', () => {
    const id = (x) => x;
    const fmt = (tpl, args) => tpl.replace(/\{(\d+)\}/g, (_, k) => args[k] ?? '');
    const gq = describeMoment({ type: 'GROUP_QUIZ_PASSED', data: { topicTitle: 'N5 Chặng 1', score: '80' } }, id, fmt);
    const sa = describeMoment({ type: 'STAGE_ASSESSMENT_PASSED', data: { levelCode: 'N5', score: '85' } }, id, fmt);
    assert.equal(gq.title, 'Bạn đã hoàn thành chặng học!');
    assert.equal(sa.title, 'Chúc mừng bạn đã vượt qua cột mốc JLPT!');
    assert.equal(describeAchievement({ code: 'GROUP_QUIZ_PASSED' }, id, fmt).title, 'Kiểm tra cuối chặng');
    assert.equal(describeAchievement({ code: 'STAGE_ASSESSMENT_PASSED' }, id, fmt).title, 'Tổng kết cấp độ');
  });

  it('keeps checkpoint modal non-dismissible during active attempt and exposes skip placement on ExamN3', () => {
    const cpModal = readSrc('src/features/learning-path/components/RoadmapCheckpointModal.jsx');
    const examN3 = readSrc('src/pages/learner/ExamN3.jsx');
    const roadmapJlpt = readSrc('src/pages/learner/RoadmapJLPT.jsx');
    const adminReview = readSrc('src/pages/admin/AdminContentReview.jsx');

    assert.match(cpModal, /data-exam-attempt-active/);
    assert.match(examN3, /skipStandardPlacement/);
    assert.match(roadmapJlpt, /setRoadmapMode/);
    assert.match(adminReview, /question\.explanation \?\? question\.Explanation/);
  });
});
