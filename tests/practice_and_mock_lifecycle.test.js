import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SKILL_FILTER_OPTIONS,
  classifyPracticeBandFallback,
  formatDurationSeconds,
  formatRemainingShort,
  formatScaleScore,
  formatScorePercent,
  groupPracticeSetsBySkill,
  isPracticeKind,
  resolveMockResultDisplay,
  resolvePracticeResultDisplay,
  resolveQuestionTypeLabel,
  resolveSkillLabel,
  resolveStatusMeta,
} from '@/features/mock-test/utils/practiceStatusHelpers.js';
import { errorMessage } from '@/api/apiErrors.js';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '..');
const readWeb = (rel) => fs.readFileSync(path.join(WEB_ROOT, rel), 'utf8');
const readRepo = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const identityTr = (s) => s;
const trf = (tpl, params) => tpl.replace(/\{(\d+)\}/g, (_, k) => String(params[k] ?? ''));

describe('Practice Sets, Mock Tests & Attempt Lifecycle — Contracts & Helpers', () => {
  it('1. Distinguishes Practice kinds from FullMockTest and formats status, skill & duration accurately', () => {
    assert.equal(isPracticeKind('PracticeSet'), true);
    assert.equal(isPracticeKind('MixedPractice'), true);
    assert.equal(isPracticeKind('FullMockTest'), false);

    assert.equal(resolveStatusMeta('IN_PROGRESS', identityTr).tone, 'warning');
    assert.equal(resolveStatusMeta('COMPLETED', identityTr).tone, 'success');
    assert.equal(resolveStatusMeta('EXPIRED', identityTr).label, 'Hết thời gian');
    assert.equal(resolveStatusMeta('ABANDONED', identityTr).label, 'Đã hủy');
    assert.equal(resolveStatusMeta('UNAVAILABLE', identityTr).tone, 'danger');
    assert.equal(resolveStatusMeta('NOT_STARTED', identityTr).label, 'Chưa làm');

    assert.equal(resolveSkillLabel('Vocabulary', identityTr), 'Từ vựng');
    assert.equal(resolveSkillLabel('Kanji', identityTr), 'Kanji');
    assert.equal(resolveSkillLabel('Listening', identityTr), 'Nghe hiểu');
    assert.ok(SKILL_FILTER_OPTIONS.every((opt) => !/\((Vocabulary|Kanji|Grammar|Reading|Listening)\)/i.test(opt.label)));
    const grouped = groupPracticeSetsBySkill([
      { mockTestId: 1, includedSkills: ['Vocabulary', 'Kanji'], examKind: 'PracticeSet' },
      { mockTestId: 2, includedSkills: ['Grammar'], examKind: 'PracticeSet' },
      { mockTestId: 3, includedSkills: ['Vocabulary', 'Grammar', 'Listening'], examKind: 'MixedPractice' },
    ]);
    assert.deepEqual(grouped.map((g) => g.label), ['Từ vựng & Kanji', 'Ngữ pháp', 'Tổng hợp nhiều kỹ năng']);
    assert.equal(resolveQuestionTypeLabel('Ordering', identityTr), 'Sắp xếp câu');
    assert.match(formatScorePercent(87.55), /^87[.,]55$/);
    assert.equal(formatDurationSeconds(95, trf), '1 phút 35 giây');
    assert.equal(formatRemainingShort(3660, trf), 'Còn 1g 1p');
  });

  it('2. Maps all new Practice & Mock Test error codes in Vietnamese', () => {
    assert.match(errorMessage({ data: { errorCode: 'MOCK_TEST_PREVIEW_FORBIDDEN' } }), /không cho phép xem trước/);
    assert.match(errorMessage({ data: { errorCode: 'MOCK_TEST_CANNOT_RESTART_ACTIVE' } }), /thi thử JLPT chưa hoàn thành/);
    assert.match(errorMessage({ data: { errorCode: 'MOCK_TEST_PDF_REQUIRES_ATTEMPT' } }), /hoàn thành ít nhất một lượt thi thử/);
    assert.match(errorMessage({ data: { errorCode: 'MOCK_TEST_ABANDONED' } }), /bắt đầu lượt mới/);
  });

  it('3. PracticeSetInfoModal previews structure without answers, explanations, or fox mascot', () => {
    const modal = readWeb('src/features/mock-test/components/PracticeSetInfoModal.jsx');
    assert.doesNotMatch(modal, /HaruMascot|HaruAchievement/);
    assert.doesNotMatch(modal, /isCorrect|answerKey|explanation|audioTranscript/i);
    assert.match(modal, /getPracticeSetPreview/);
    assert.match(modal, /Tải đề PDF/);
  });

  it('4. PracticeSetsPage uses UnifiedToolbar via ExamFilterToolbar without sort/kind clutter or section dividers', () => {
    const page = readWeb('src/pages/learner/PracticeSetsPage.jsx');
    const card = readWeb('src/features/mock-test/components/ExamCatalogCard.jsx');
    const toolbar = readWeb('src/features/mock-test/components/ExamFilterToolbar.jsx');
    const resume = readWeb('src/features/mock-test/components/ResumeOrRestartModal.jsx');
    assert.match(page, /<ExamFilterToolbar/);
    assert.match(page, /<ExamCatalogCard/);
    assert.match(page, /<PracticeSetInfoModal/);
    assert.match(page, /<ResumeOrRestartModal/);
    assert.match(card, /resolvePracticeSkillGroup/);
    assert.match(card, /Làm tiếp/);
    assert.doesNotMatch(page, /Xem & làm bài/);
    assert.doesNotMatch(page, /groupPracticeSetsBySkill|practice-group-/);
    assert.doesNotMatch(page, /Mọi dạng bộ đề|SORT_FILTER_OPTIONS|KIND_FILTER_OPTIONS|sortBy/);
    assert.doesNotMatch(page, /Luyện tập kỹ năng<\/Badge>|Hỗn hợp nhiều kỹ năng<\/Badge>/);
    assert.match(toolbar, /<UnifiedToolbar/);
    assert.match(resume, /Tiếp tục bài luyện tập của bạn\?/);
    assert.match(resume, /Bắt đầu lượt luyện tập mới\?/);
    assert.match(resume, /Giữ bài hiện tại/);
  });

  it('5. MockTestPage enforces regulations modal without question preview, multi-tab warning, exit flows & submit summary', () => {
    const mockPage = readWeb('src/pages/learner/MockTestPage.jsx');
    const regs = readWeb('src/features/mock-test/components/MockExamRegulationsModal.jsx');
    const exitModal = readWeb('src/features/mock-test/components/PracticeExitModal.jsx');

    assert.match(mockPage, /<MockExamRegulationsModal/);
    assert.match(mockPage, /<PracticeExitModal/);
    assert.doesNotMatch(mockPage, /getPracticeSetPreview/);
    assert.doesNotMatch(mockPage, /MOCK_SORT_OPTIONS|Đề mô phỏng v\{0\}|sortBy/);
    assert.match(mockPage, /BroadcastChannel/);
    assert.match(mockPage, /Bạn có chắc chắn muốn nộp bài\?/);
    assert.match(regs, /Bạn đã sẵn sàng bắt đầu thi thử JLPT\?/);
    assert.match(regs, /Nghe âm thanh mẫu/);
    assert.match(exitModal, /Bạn muốn tạm dừng bài luyện tập\?/);
    assert.match(exitModal, /Thoát và lưu/);
  });

  it('6. Backend enforces Practice vs Mock separation, preview security, PDF gating, forceNew atomic transition & sequence guard', () => {
    const svc = readRepo('RikiPath.Backend/RikiPath.Application/Services/MockTestService.cs');
    const exp = readRepo('RikiPath.Backend/RikiPath.Application/Services/ContentAuthoring/ContentExportService.cs');
    const ctrl = readRepo('RikiPath.Backend/RikiPath.WebApi/Controllers/MockTestController.cs');

    assert.match(svc, /MOCK_TEST_PREVIEW_FORBIDDEN/);
    assert.match(svc, /MOCK_TEST_CANNOT_RESTART_ACTIVE/);
    assert.match(svc, /MOCK_TEST_ABANDONED/);
    assert.match(svc, /ClientSequence/);
    assert.match(svc, /PauseAttemptAsync/);
    assert.match(svc, /AutoFinalizeExpiredMockAttemptsInternalAsync/);
    assert.match(exp, /MOCK_TEST_PDF_REQUIRES_ATTEMPT/);
    assert.match(exp, /FeatureCodes\.MockTests/);
    assert.match(ctrl, /preview/);
    assert.match(ctrl, /pause/);
    assert.match(ctrl, /forceNew/);
  });

  it('7. Practice Sets use 10-point scale & 4 performance bands without pass/fail labels', () => {
    assert.equal(classifyPracticeBandFallback(0).band, 'NEEDS_IMPROVEMENT');
    assert.equal(classifyPracticeBandFallback(1.25).tone, 'danger');
    assert.equal(classifyPracticeBandFallback(5).band, 'AVERAGE');
    assert.equal(classifyPracticeBandFallback(5).tone, 'warning');
    assert.equal(classifyPracticeBandFallback(7.5).band, 'GOOD');
    assert.equal(classifyPracticeBandFallback(7.5).tone, 'info');
    assert.equal(classifyPracticeBandFallback(8.5).band, 'EXCELLENT');
    assert.equal(classifyPracticeBandFallback(10).tone, 'success');

    const disp = resolvePracticeResultDisplay(
      {
        scoring: {
          scoreType: 'PRACTICE_SCALE_10',
          normalizedScore: 1.25,
          accuracyPercent: 12.5,
          performanceBand: 'NEEDS_IMPROVEMENT',
          performanceLabel: 'Cần cải thiện',
          performanceTone: 'danger',
          isScoringValid: true,
        },
        latestCorrectCount: 1,
        latestTotalQuestions: 8,
      },
      identityTr,
    );
    assert.equal(disp.score10, 1.25);
    assert.equal(disp.accuracyPct, 12.5);
    assert.equal(disp.tone, 'danger');
    assert.equal(disp.bandLabel, 'Cần cải thiện');
    assert.match(formatScaleScore(1.25), /1[.,]25/);
  });

  it('8. Mock Tests expose JLPT 180 simulation & section pass thresholds consistently across Backend & Web', () => {
    const policy = readRepo('RikiPath.Backend/RikiPath.Application/Services/MockTestScoringPolicy.cs');
    const practicePage = readWeb('src/pages/learner/PracticeSetsPage.jsx');
    const mockPage = readWeb('src/pages/learner/MockTestPage.jsx');
    const examCard = readWeb('src/features/mock-test/components/ExamCatalogCard.jsx');
    const helpers = readWeb('src/features/mock-test/utils/practiceStatusHelpers.js');
    const historyPage = readWeb('src/pages/learner/ExamResult.jsx');
    const analytics = readWeb('src/features/learner-ui/LearningAnalytics.jsx');

    // Official JLPT N5-N2 section thresholds in Backend single source of truth
    assert.match(policy, /\["N5"\][\s\S]*180,\s*80[\s\S]*"KNOWLEDGE_READING"[\s\S]*120,\s*38[\s\S]*"LISTENING"[\s\S]*60,\s*19/);
    assert.match(policy, /\["N4"\][\s\S]*180,\s*90[\s\S]*"KNOWLEDGE_READING"[\s\S]*120,\s*38[\s\S]*"LISTENING"[\s\S]*60,\s*19/);
    assert.match(policy, /\["N3"\][\s\S]*180,\s*95[\s\S]*"LANGUAGE_KNOWLEDGE"[\s\S]*60,\s*19[\s\S]*"READING"[\s\S]*60,\s*19[\s\S]*"LISTENING"[\s\S]*60,\s*19/);
    assert.match(policy, /\["N2"\][\s\S]*180,\s*90[\s\S]*"LANGUAGE_KNOWLEDGE"[\s\S]*60,\s*19[\s\S]*"READING"[\s\S]*60,\s*19[\s\S]*"LISTENING"[\s\S]*60,\s*19/);
    assert.match(policy, /ResolveQuestionWeight/);
    assert.match(policy, /INCOMPLETE_STRUCTURE/);
    assert.match(policy, /JLPT_SECTION_NEAREST_INT_SUM/);

    // Web UI displays /10 for Practice & /180 via shared ExamCatalogCard without claiming official pass ("Đỗ JLPT chính thức")
    assert.match(practicePage, /<ExamCatalogCard/);
    assert.match(mockPage, /<ExamCatalogCard/);
    assert.match(examCard, /resolveCompactCardMetric/);
    assert.match(helpers, /\/10 điểm/);
    assert.match(helpers, /\/\{1\} điểm/);
    assert.doesNotMatch(mockPage, /Đỗ JLPT chính thức/);
    assert.match(historyPage, /resolvePracticeResultDisplay/);
    assert.match(historyPage, /resolveMockResultDisplay/);
    assert.match(analytics, /PRACTICE_SCALE_10[\s\S]*JLPT_MOCK_180/);

    const failedSectionMock = resolveMockResultDisplay(
      {
        scoring: {
          scoreType: 'JLPT_MOCK_180',
          normalizedScore: 120,
          normalizedMaxScore: 180,
          passingScore: 80,
          accuracyPercent: 66.7,
          isPassStatusApplicable: true,
          simulatedPassed: false,
          passStatusCode: 'SIMULATED_FAILED',
          passStatusLabel: 'Chưa đạt',
          isScoringValid: true,
          failureReasons: ['Phần Nghe hiểu đạt 0/60 điểm (dưới điểm tối thiểu 19/60).'],
        },
      },
      identityTr,
    );
    assert.equal(failedSectionMock.isValid, true);
    assert.equal(failedSectionMock.simulatedPassed, false);
    assert.equal(failedSectionMock.tone, 'danger');
    assert.equal(failedSectionMock.failureReasons.length, 1);

    const incompleteMock = resolveMockResultDisplay(
      {
        scoring: {
          scoreType: 'JLPT_MOCK_180',
          isScoringValid: false,
          isPassStatusApplicable: false,
          simulatedPassed: null,
          passStatusCode: 'INCOMPLETE_STRUCTURE',
          passStatusLabel: 'Chưa đủ dữ liệu đánh giá ngưỡng JLPT',
          accuracyPercent: 50,
        },
      },
      identityTr,
    );
    assert.equal(incompleteMock.isValid, false);
    assert.equal(incompleteMock.simulatedPassed, null);
  });
});
