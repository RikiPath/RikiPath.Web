import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  formatExamCardTitle,
  formatScaleScore,
  resolveCompactCardMetric,
  resolveStatusMeta,
} from '../src/features/mock-test/utils/practiceStatusHelpers.js';
import { translateTemplate } from '../src/locales/locale.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const tr = (s) => s;

describe('Compact Exam Catalog Card Helpers & Layout Contracts', () => {
  it('formats long redundant Practice & Mock catalog prefixes cleanly while preserving short titles', () => {
    assert.equal(
      formatExamCardTitle('Bộ đề luyện tập Từ vựng & Kanji JLPT N5 – Đời sống hằng ngày', 'practice'),
      'Từ vựng & Kanji JLPT N5 – Đời sống hằng ngày',
    );
    assert.equal(
      formatExamCardTitle('Đề thi thử JLPT N5 – Bộ đề chuẩn số 01', 'mock'),
      'JLPT N5 – Bộ đề chuẩn số 01',
    );
    assert.equal(formatExamCardTitle('Bộ đề luyện tập N5', 'practice'), 'Bộ đề luyện tập N5');
  });

  it('computes inline Row 4 metrics cleanly across Not Started, In Progress (priority over old score), Grading, Practice & Mock', () => {
    // 1. Not started / abandoned -> nothing on Row 4 right side
    assert.equal(
      resolveCompactCardMetric({ userStatus: 'NOT_STARTED', questionCount: 8 }, 'practice', { tr, trf: translateTemplate }),
      null,
    );
    assert.equal(
      resolveCompactCardMetric({ userStatus: 'ABANDONED', questionCount: 13 }, 'mock', { tr, trf: translateTemplate }),
      null,
    );

    // 2. In-progress always overrides older completed score
    const inProgress = resolveCompactCardMetric(
      {
        userStatus: 'IN_PROGRESS',
        activeAttemptId: 54,
        activeAnsweredCount: 3,
        activeTotalQuestions: 8,
        latestScore: 75,
        latestScoring: { scaleScore: 7.5, maxScaleScore: 10 },
      },
      'practice',
      { tr, trf: translateTemplate },
    );
    assert.deepEqual(inProgress, {
      kind: 'progress',
      valueText: '3/8',
      unitText: 'câu',
      colorClass: 'text-amber-700',
      tooltip: 'Đang làm: 3/8 câu',
    });

    // 3. Grading -> never fabricate 0 score
    const grading = resolveCompactCardMetric(
      { userStatus: 'GRADING', questionCount: 10 },
      'mock',
      { tr, trf: translateTemplate },
    );
    assert.equal(grading.kind, 'grading');
    assert.equal(grading.valueText, 'Đang chấm');
    assert.equal(grading.unitText, null);

    // 4. Practice completed low score (1.25/10 -> red danger tone) & high score (8.75/10 -> green success tone)
    const lowPractice = resolveCompactCardMetric(
      {
        userStatus: 'COMPLETED',
        latestCompletedAttemptId: 49,
        latestScore: 12.5,
        latestCorrectCount: 1,
        latestTotalQuestions: 8,
        latestScoring: {
          scoreType: 'PRACTICE_SCALE_10',
          isScoringValid: true,
          normalizedScore: 1.25,
          normalizedMaxScore: 10,
          accuracyPercent: 12.5,
          performanceTone: 'danger',
          performanceBand: 'NEEDS_IMPROVEMENT',
          performanceLabel: 'Cần cải thiện',
        },
      },
      'practice',
      { tr, trf: translateTemplate },
    );
    assert.equal(lowPractice.kind, 'score');
    assert.equal(lowPractice.valueText, `${formatScaleScore(1.25)}/10`);
    assert.equal(lowPractice.unitText, 'điểm');
    assert.match(lowPractice.colorClass, /rose/);

    const highPractice = resolveCompactCardMetric(
      {
        userStatus: 'COMPLETED',
        latestCompletedAttemptId: 50,
        latestScore: 87.5,
        latestCorrectCount: 7,
        latestTotalQuestions: 8,
        latestScoring: {
          scoreType: 'PRACTICE_SCALE_10',
          isScoringValid: true,
          normalizedScore: 8.75,
          normalizedMaxScore: 10,
          accuracyPercent: 87.5,
          performanceTone: 'success',
          performanceBand: 'EXCELLENT',
          performanceLabel: 'Tốt',
        },
      },
      'practice',
      { tr, trf: translateTemplate },
    );
    assert.equal(highPractice.kind, 'score');
    assert.equal(highPractice.valueText, `${formatScaleScore(8.75)}/10`);
    assert.equal(highPractice.unitText, 'điểm');
    assert.match(highPractice.colorClass, /emerald/);

    // 5. Mock Test completed 180-pt simulation vs invalid mock scoring (no fake 0/180)
    const mockPass = resolveCompactCardMetric(
      {
        userStatus: 'COMPLETED',
        latestCompletedAttemptId: 52,
        latestScore: 76.92,
        latestCorrectCount: 10,
        latestTotalQuestions: 13,
        latestScoring: {
          scoreType: 'JLPT_MOCK_180',
          isScoringValid: true,
          normalizedScore: 120,
          normalizedMaxScore: 180,
          passingScore: 80,
          isPassStatusApplicable: true,
          simulatedPassed: true,
        },
      },
      'mock',
      { tr, trf: translateTemplate },
    );
    assert.equal(mockPass.kind, 'score');
    assert.equal(mockPass.valueText, '120/180');
    assert.equal(mockPass.unitText, 'điểm');
    assert.match(mockPass.colorClass, /emerald/);

    const mockInvalid = resolveCompactCardMetric(
      {
        userStatus: 'COMPLETED',
        latestCompletedAttemptId: 53,
        latestCorrectCount: 0,
        latestTotalQuestions: 0,
        latestScoring: {
          scoreType: 'LEGACY_PERCENT',
          isScoringValid: false,
          passStatusLabel: 'Chưa đủ dữ liệu đánh giá ngưỡng JLPT',
        },
      },
      'mock',
      { tr, trf: translateTemplate },
    );
    assert.equal(mockInvalid.kind, 'unavailable');
    assert.equal(mockInvalid.valueText, 'Chưa khả dụng');
    assert.equal(mockInvalid.valueText.includes('0/180'), false);
  });

  it('uses concise status labels matching compact badge widths', () => {
    assert.equal(resolveStatusMeta('COMPLETED', tr).label, 'Hoàn thành');
    assert.equal(resolveStatusMeta('IN_PROGRESS', tr).label, 'Đang làm');
    assert.equal(resolveStatusMeta('NOT_STARTED', tr).label, 'Chưa làm');
    assert.equal(resolveStatusMeta('GRADING', tr).label, 'Đang chấm');
    assert.equal(resolveStatusMeta('ABANDONED', tr).label, 'Đã hủy');
  });

  it('enforces shared 5-row ExamCatalogCard reuse in PracticeSetsPage and MockTestPage without Summary Box, ProgressBar, or Fox mascot', () => {
    const cardSrc = fs.readFileSync(path.join(ROOT, 'src/features/mock-test/components/ExamCatalogCard.jsx'), 'utf8');
    const practiceSrc = fs.readFileSync(path.join(ROOT, 'src/pages/learner/PracticeSetsPage.jsx'), 'utf8');
    const mockSrc = fs.readFileSync(path.join(ROOT, 'src/pages/learner/MockTestPage.jsx'), 'utf8');
    const toolbarSrc = fs.readFileSync(path.join(ROOT, 'src/features/mock-test/components/ExamFilterToolbar.jsx'), 'utf8');

    // ExamCatalogCard enforces equal heights, strict 2-line clamp, Row 4 inline metric, Row 5 uniform sm CTA footer, no ProgressBar or Fox mascot
    assert.ok(cardSrc.includes('flex h-full min-w-0 flex-col p-4'));
    assert.ok(cardSrc.includes('line-clamp-2 min-h-[2.625rem]'));
    assert.ok(cardSrc.includes('line-clamp-2 min-h-[2.5rem]'));
    assert.ok(cardSrc.includes('data-testid="exam-card-inline-metric"'));
    assert.ok(cardSrc.includes('size="sm"'));
    assert.equal(cardSrc.includes('ProgressBar'), false);
    assert.equal(cardSrc.includes('HaruMascot'), false);
    assert.equal(cardSrc.includes('latestSubmittedAt'), false);

    // PracticeSetsPage & MockTestPage both use ExamCatalogCard + ExamCatalogCardSkeleton & preserve their modals + back navigation
    assert.ok(practiceSrc.includes('<ExamCatalogCard'));
    assert.ok(practiceSrc.includes('<ExamCatalogCardSkeleton'));
    assert.ok(practiceSrc.includes('<PracticeSetInfoModal'));
    assert.ok(practiceSrc.includes('<ResumeOrRestartModal'));
    assert.ok(practiceSrc.includes("saveListViewState('/practice-sets'"));

    assert.ok(mockSrc.includes('<ExamCatalogCard'));
    assert.ok(mockSrc.includes('<ExamCatalogCardSkeleton'));
    assert.ok(mockSrc.includes('<MockExamRegulationsModal'));
    assert.ok(mockSrc.includes("saveListViewState('/mock-tests'"));
    assert.equal(mockSrc.includes('resolveMockResultDisplay'), false, 'Catalog grid delegates inline score resolution to ExamCatalogCard');

    // Toolbar uses consistent md control size across Tabs, SearchInput, CustomSelect, and Reset Button
    assert.ok(toolbarSrc.includes("size: 'md'"));
    assert.ok(toolbarSrc.includes('size="md"'));
  });
});
