import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  classifyExamSkill,
  computeSkillInsights,
  extractUnevaluatedSkillNotes,
  getEvaluatedSkills,
  groupSkillCardsByLevel,
  resolveSkillFeedbackSummary,
  splitPlacementScores,
  summarizeSkills,
  translateBackendAssessmentMessage,
  translateBackendSkillComment,
} from '../src/features/mock-test/utils/examSkillScores.js';

describe('Phase 1 — Placement & Exam Skill Accuracy', () => {
  it('classifies tested JLPT skills and refuses Speaking/Writing inference from MCQs', () => {
    assert.equal(classifyExamSkill('Vocabulary'), 'vocabulary');
    assert.equal(classifyExamSkill('Ngữ pháp'), 'grammar');
    assert.equal(classifyExamSkill('Đọc hiểu'), 'reading');
    assert.equal(classifyExamSkill('Listening'), 'listening');
    assert.equal(classifyExamSkill('Speaking'), null);
    assert.equal(classifyExamSkill('Writing'), null);
    assert.equal(classifyExamSkill('Luyện nói'), null);
    assert.equal(classifyExamSkill('Luyện viết'), null);
  });

  it('excludes Listening scores when hasAudioEvidence is false and marks missing_audio note', () => {
    const sections = [
      { languageSkillName: 'Vocabulary', correctCount: 4, totalCount: 5, jlptLevelName: 'N5' },
      { languageSkillName: 'Grammar', correctCount: 3, totalCount: 5, jlptLevelName: 'N5' },
      { languageSkillName: 'Reading', correctCount: 2, totalCount: 5, jlptLevelName: 'N5' },
      { languageSkillName: 'Listening', correctCount: 0, totalCount: 5, hasAudioEvidence: false, jlptLevelName: 'N5' },
    ];

    const summary = summarizeSkills(sections);
    assert.ok(summary.vocabulary);
    assert.ok(summary.grammar);
    assert.ok(summary.reading);
    assert.equal(summary.listening, undefined);

    const notes = extractUnevaluatedSkillNotes(sections);
    assert.deepEqual(notes.listening, { reason: 'missing_audio' });
    assert.equal(getEvaluatedSkills([{ scores: summary }]).map((s) => s.code).join(','), 'vocabulary,grammar,reading');
  });

  it('includes Listening only when hasAudioEvidence is true (or absent with hasData: true)', () => {
    const sections = [
      { languageSkillName: 'Vocabulary', correctCount: 4, totalCount: 5, jlptLevelName: 'N5' },
      { languageSkillName: 'Listening', correctCount: 3, totalCount: 5, hasAudioEvidence: true, jlptLevelName: 'N5' },
    ];
    const summary = summarizeSkills(sections);
    assert.equal(summary.listening.correct, 3n);
    assert.equal(summary.listening.count, 5n);
    assert.equal(getEvaluatedSkills([{ scores: summary }]).length, 2);
  });

  it('respects backend skillAssessments hasData: false when splitting placement scores', () => {
    const result = {
      screeningLevelName: 'N5',
      sections: [
        { languageSkillName: 'Vocabulary', correctCount: 5, totalCount: 5, jlptLevelName: 'N5' },
        { languageSkillName: 'Listening', correctCount: 4, totalCount: 5, jlptLevelName: 'N5' },
      ],
      skillAssessments: [
        { skillCode: 'vocabulary', skill: 'Từ vựng', hasData: true, scorePercent: 100, priority: 'maintenance' },
        { skillCode: 'listening', skill: 'Nghe hiểu', hasData: false, scorePercent: 0, priority: 'needs_assessment' },
      ],
    };

    const byLevel = splitPlacementScores(result);
    assert.ok(byLevel.N5.vocabulary);
    assert.equal(byLevel.N5.listening, undefined);

    const insights = computeSkillInsights(result);
    assert.equal(insights.strengths.length, 1);
    assert.equal(insights.strengths[0].skillCode, 'vocabulary');
    assert.equal(insights.improvements.length, 0);
    assert.equal(insights.unevaluated.length, 1);
    assert.equal(insights.unevaluated[0].skillCode, 'listening');
  });

  it('groups N5/N4 breakdown cleanly, excludes Speaking/Writing MCQ, and keeps audio-less Listening unevaluated', () => {
    const result = {
      levelBreakdowns: [
        { jlptLevelId: 1, jlptLevelName: 'N5' },
        { jlptLevelId: 2, jlptLevelName: 'N4' },
      ],
      sections: [
        { mockTestSectionId: 1, jlptLevelId: 1, languageSkillName: 'Vocabulary', correctCount: 4, totalQuestions: 5, hasAudioEvidence: true },
        { mockTestSectionId: 2, jlptLevelId: 1, languageSkillName: 'Grammar', correctCount: 1, totalQuestions: 5, hasAudioEvidence: true },
        { mockTestSectionId: 3, jlptLevelId: 1, languageSkillName: 'Reading', correctCount: 2, totalQuestions: 5, hasAudioEvidence: true },
        { mockTestSectionId: 4, jlptLevelId: 1, languageSkillName: 'Listening', correctCount: 0, totalQuestions: 5, hasAudioEvidence: false },
        { mockTestSectionId: 5, jlptLevelId: 2, languageSkillName: 'Vocabulary', correctCount: 4, totalQuestions: 5, hasAudioEvidence: true },
        { mockTestSectionId: 6, jlptLevelId: 2, languageSkillName: 'Writing', correctCount: 5, totalQuestions: 5 },
      ],
    };

    const groups = groupSkillCardsByLevel(result);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].levelName, 'N5');
    assert.equal(groups[0].evaluatedCorrect, 7);
    assert.equal(groups[0].evaluatedTotal, 15);
    assert.equal(groups[0].scorePercent, 47);

    const listeningRow = groups[0].items.find((item) => item.skillCode === 'listening');
    assert.equal(listeningRow.hasData, false);
    assert.equal(listeningRow.scorePercent, null);
    assert.equal(listeningRow.unverifiedAudio, true);

    assert.equal(groups[1].levelName, 'N4');
    assert.equal(groups[1].items.length, 1);
    assert.equal(groups[1].items[0].skillCode, 'vocabulary');
  });

  it('derives honest Hàng 3 feedback for relative (<80%), zero (0%), and strong (>=80%) profiles', () => {
    const relative = resolveSkillFeedbackSummary({
      sections: [
        { languageSkillName: 'Vocabulary', correctCount: 3, totalQuestions: 5 },
        { languageSkillName: 'Grammar', correctCount: 1, totalQuestions: 5 },
        { languageSkillName: 'Reading', correctCount: 0, totalQuestions: 5 },
        { languageSkillName: 'Listening', correctCount: 0, totalQuestions: 5, hasAudioEvidence: false },
      ],
    });
    assert.equal(relative.hasEvaluated, true);
    assert.equal(relative.strengthMode, 'relative');
    assert.equal(relative.topSkills[0].skillCode, 'vocabulary');
    assert.equal(relative.topSkills[0].scorePercent, 60);
    assert.equal(relative.focusMode, 'needs_work');
    assert.equal(relative.focusSkills[0].skillCode, 'reading');
    assert.equal(relative.unevaluated.length, 1);
    assert.equal(relative.unevaluated[0].skillCode, 'listening');

    const allZero = resolveSkillFeedbackSummary({
      sections: [
        { languageSkillName: 'Vocabulary', correctCount: 0, totalQuestions: 5 },
        { languageSkillName: 'Grammar', correctCount: 0, totalQuestions: 5 },
      ],
    });
    assert.equal(allZero.strengthMode, 'zero');
    assert.equal(allZero.focusMode, 'needs_work');

    const allStrong = resolveSkillFeedbackSummary({
      sections: [
        { languageSkillName: 'Vocabulary', correctCount: 5, totalQuestions: 5 },
        { languageSkillName: 'Grammar', correctCount: 4, totalQuestions: 5 },
      ],
    });
    assert.equal(allStrong.strengthMode, 'strong');
    assert.equal(allStrong.topSkills[0].skillCode, 'vocabulary');
    assert.equal(allStrong.focusMode, 'maintain');
    assert.equal(allStrong.focusSkills[0].skillCode, 'grammar');
  });

  it('enforces V3 5-row horizontal analytics structure without collapsed charts or detached 8-card grid', () => {
    const dashboardSrc = fs.readFileSync(
      new URL('../src/features/mock-test/components/AssessmentResultDashboard.jsx', import.meta.url),
      'utf8',
    );
    const radarSrc = fs.readFileSync(
      new URL('../src/features/mock-test/components/ExamSkillRadar.jsx', import.meta.url),
      'utf8',
    );
    const examSrc = fs.readFileSync(
      new URL('../src/pages/learner/ExamN3.jsx', import.meta.url),
      'utf8',
    );
    const resultPageSrc = fs.readFileSync(
      new URL('../src/pages/learner/PlacementResult.jsx', import.meta.url),
      'utf8',
    );

    assert.equal(dashboardSrc.includes('detailsOpen'), false);
    assert.equal(dashboardSrc.includes('Xem chi tiết'), false);
    assert.equal(dashboardSrc.includes('lg:grid-cols-4'), false);
    assert.ok(dashboardSrc.includes('resolveSkillFeedbackSummary'));
    assert.ok(dashboardSrc.includes('groupSkillCardsByLevel'));
    assert.ok(dashboardSrc.includes('SkillAssessmentChart'));

    assert.ok(radarSrc.includes('lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'));
    assert.ok(radarSrc.includes('whitespace-nowrap px-4 py-3 text-left font-semibold'));
    assert.ok(radarSrc.includes("tr('Trạng thái')"));
    assert.ok(radarSrc.includes('var(--color-rp-surface'));
    assert.ok(radarSrc.includes('evaluatedSkills.length >= 3'));

    const chartSrc = fs.readFileSync(
      new URL('../src/features/mock-test/components/SkillAssessmentChart.jsx', import.meta.url),
      'utf8',
    );
    assert.equal(chartSrc.includes('wrap-anywhere'), false);
    assert.ok(chartSrc.includes('className="flex-wrap"'));

    assert.ok(examSrc.includes("width={result ? 'wide' : 'default'}"));
    assert.ok(examSrc.includes("to=\"/roadmap/\""));
    assert.ok(resultPageSrc.includes('width="wide"'));
    assert.ok(resultPageSrc.includes('to="/roadmap/"'));
  });

  it('maps backend assessment messages and skill comments cleanly through tr/trf', () => {
    const tr = (s) => (s === 'Đọc hiểu' ? '読解' : `JA:${s}`);
    const trf = (tpl, args) => tpl.replace(/\{(\d+)\}/g, (_, k) => args[k]);

    const msg = translateBackendAssessmentMessage(
      'Lộ trình ôn N4 sẽ ưu tiên củng cố những kỹ năng còn yếu trước khi luyện đề.',
      tr,
      trf,
    );
    assert.equal(msg, 'Lộ trình ôn N4 sẽ ưu tiên củng cố những kỹ năng còn yếu trước khi luyện đề.');

    const comment = translateBackendSkillComment(
      'Đọc hiểu: đạt ngưỡng ở N5 và đang tiến gần N4.',
      tr,
      trf,
    );
    assert.equal(comment, '読解: đạt ngưỡng ở N5 và đang tiến gần N4.');
  });
});
