import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it } from 'node:test';

import { renderRichQuestionText } from '../src/utils/richQuestionHtml.js';
import { buildBreadcrumbs } from '../src/layouts/appNav.js';
import {
  confirmActiveNavigationGuards,
  hasActiveNavigationGuards,
  isSafeInternalPath,
  registerNavigationGuard,
  resolveBackTarget,
} from '../src/utils/navigationContext.js';
import {
  formatAnswerKey,
  formatDurationSeconds,
  formatPercentage,
  formatRemainingShort,
  formatScaleScore,
  resolveAttemptKindKey,
  resolveAttemptTargetRoute,
  resolveMockResultDisplay,
  resolvePracticeResultDisplay,
} from '../src/features/mock-test/utils/practiceStatusHelpers.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const trIdentity = (s) => s;

describe('RichQuestionText Safe HTML & Japanese Markup Renderer', () => {
  it('renders allowed <u>, <b>, <br>, and <ruby>/<rt> tags cleanly without escaping tags into literal text', () => {
    const html = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        renderRichQuestionText('駅まで <u>電車</u>で 20ぷん <ruby>掛<rt>か</rt></ruby>かります。<br><b>重要</b>'),
      ),
    );

    assert.ok(html.includes('<u '), 'Renders real <u> tag for underlined question targets');
    assert.ok(html.includes('>電車</u>'), 'Underlined kanji appears inside <u>');
    assert.equal(html.includes('&lt;u&gt;'), false, 'Does not display raw escaped <u> tag');
    assert.ok(html.includes('<ruby>掛<rt '), 'Renders furigana <ruby>/<rt> markup');
    assert.ok(html.includes('<strong class="font-bold">重要</strong>'), 'Renders bold semantic markup');
    assert.ok(html.includes('<br/>'), 'Renders line break');
  });

  it('strips dangerous XSS subtrees and event attributes safely without dangerouslySetInnerHTML', () => {
    const richSrc = fs.readFileSync(path.join(ROOT, 'src/components/RichQuestionText.jsx'), 'utf8');
    const utilSrc = fs.readFileSync(path.join(ROOT, 'src/utils/richQuestionHtml.js'), 'utf8');
    assert.equal(/dangerouslySetInnerHTML\s*[:=]/.test(richSrc), false, 'Must never set dangerouslySetInnerHTML');
    assert.equal(/dangerouslySetInnerHTML\s*[:=]/.test(utilSrc), false, 'Must never set dangerouslySetInnerHTML');

    const html = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        renderRichQuestionText('<script>window.__xss=1</script><svg onload="alert(1)"><g/></svg><img src=x onerror="alert(1)"><u>電車</u> ok'),
      ),
    );

    assert.equal(html.includes('<script'), false);
    assert.equal(html.includes('<svg'), false);
    assert.equal(html.includes('onerror'), false);
    assert.equal(html.includes('onload'), false);
    assert.ok(html.includes('>電車</u>'));
    assert.ok(html.includes('ok'));
  });
});

describe('Global Navigation Context, Open-Redirect Safety & Header Breadcrumbs', () => {
  it('blocks external redirects, protocol schemes, and auth loops while validating safe internal paths', () => {
    assert.equal(isSafeInternalPath('/exam-result/?level=N5&page=2'), true);
    assert.equal(isSafeInternalPath('/practice-sets/result/30/'), true);

    assert.equal(isSafeInternalPath('https://evil.com/phish'), false);
    assert.equal(isSafeInternalPath('//evil.com'), false);
    assert.equal(isSafeInternalPath('javascript:alert(1)'), false);
    assert.equal(isSafeInternalPath('/login/'), false);
    assert.equal(isSafeInternalPath('/register'), false);
    assert.equal(isSafeInternalPath('relative/no-leading-slash'), false);
  });

  it('resolves priority explicitTo > navigationOrigin > returnTo > fallbackTo and prevents self-loops', () => {
    const fromHistory = resolveBackTarget(
      {
        pathname: '/practice-sets/result/30/',
        search: '?returnTo=/mock-tests/',
        state: {
          navigationOrigin: {
            to: '/exam-result/?level=N5&page=2',
            backLabel: 'Quay lại lịch sử',
          },
        },
      },
      { fallbackTo: '/practice-sets/', fallbackLabel: 'Quay lại bộ đề' },
    );
    assert.equal(fromHistory.to, '/exam-result/?level=N5&page=2');
    assert.equal(fromHistory.label, 'Quay lại lịch sử');

    const blockedExternal = resolveBackTarget(
      {
        pathname: '/practice-sets/result/30/',
        search: '?returnTo=https://evil.example',
        state: null,
      },
      { fallbackTo: '/practice-sets/', fallbackLabel: 'Quay lại bộ đề' },
    );
    assert.equal(blockedExternal.to, '/practice-sets/');
    assert.equal(blockedExternal.label, 'Quay lại bộ đề');

    const preventedSelfLoop = resolveBackTarget(
      {
        pathname: '/practice-sets/result/30/',
        search: '',
        state: { navigationOrigin: { to: '/practice-sets/result/30/', backLabel: 'Self' } },
      },
      { fallbackTo: '/practice-sets/', fallbackLabel: 'Quay lại bộ đề' },
    );
    assert.equal(preventedSelfLoop.to, '/practice-sets/');
  });

  it('tracks async unsaved/exam navigation guards deterministically', async () => {
    assert.equal(hasActiveNavigationGuards(), false);
    const unregisterBlock = registerNavigationGuard(async () => false);
    assert.equal(hasActiveNavigationGuards(), true);
    assert.equal(await confirmActiveNavigationGuards(), false);
    unregisterBlock();
    assert.equal(hasActiveNavigationGuards(), false);
    assert.equal(await confirmActiveNavigationGuards(), true);
  });

  it('separates Practice Set vs Mock Test vs History breadcrumbs cleanly and keeps query-alias parity', () => {
    const practiceResultCrumbs = buildBreadcrumbs('Learner', '/practice-sets/result/30/', '', 'Kết quả luyện tập');
    assert.deepEqual(
      practiceResultCrumbs.map((c) => c.label),
      ['Học viên', 'Luyện đề & Thi thử', 'Bộ đề luyện tập', 'Kết quả luyện tập'],
    );
    assert.equal(practiceResultCrumbs[2].to, '/practice-sets');

    const mockResultCrumbs = buildBreadcrumbs('Learner', '/mock-tests/result/35/', '', 'Kết quả thi thử');
    assert.deepEqual(
      mockResultCrumbs.map((c) => c.label),
      ['Học viên', 'Luyện đề & Thi thử', 'Thi thử JLPT', 'Kết quả thi thử'],
    );
    assert.equal(mockResultCrumbs[2].to, '/mock-tests');

    const mockQueryAliasCrumbs = buildBreadcrumbs('Learner', '/mock-tests/', '?attemptId=55', 'Thi thử');
    assert.deepEqual(
      mockQueryAliasCrumbs.map((c) => c.label),
      ['Học viên', 'Luyện đề & Thi thử', 'Thi thử JLPT'],
    );
  });
});

describe('Attempt Classification, Target Routing & Result Scoring Separation', () => {
  it('routes Practice, Mock Test, and Placement attempts to distinct dedicated routes', () => {
    assert.equal(resolveAttemptKindKey({ examKind: 'PracticeSet' }), 'PRACTICE');
    assert.equal(resolveAttemptKindKey({ examKind: 'Placement' }), 'PLACEMENT');
    assert.equal(resolveAttemptKindKey({ examKind: 'FullMockTest' }), 'MOCK');

    assert.equal(
      resolveAttemptTargetRoute({ attemptId: 30, examKind: 'PracticeSet', attemptStatus: 'completed' }),
      '/practice-sets/result/30/',
    );
    assert.equal(
      resolveAttemptTargetRoute({ attemptId: 31, examKind: 'PracticeSet', attemptStatus: 'in_progress' }),
      '/practice-sets/attempt/31/',
    );
    assert.equal(
      resolveAttemptTargetRoute({ attemptId: 35, examKind: 'FullMockTest', attemptStatus: 'completed' }),
      '/mock-tests/result/35/',
    );
    assert.equal(
      resolveAttemptTargetRoute({ attemptId: 8, examKind: 'Placement', attemptStatus: 'completed' }),
      '/placement/result/8/',
    );
  });

  it('displays 10-point Practice scale and 180-point JLPT Mock scale accurately without cross-mixing', () => {
    const practiceLow = resolvePracticeResultDisplay(
      {
        correctCount: 1,
        totalQuestions: 8,
        accuracyPercent: 12.5,
        scoring: {
          scoreType: 'PRACTICE_SCALE_10',
          normalizedScore: 1.25,
          normalizedMaxScore: 10,
          accuracyPercent: 12.5,
          isScoringValid: true,
          performanceBand: 'NEEDS_IMPROVEMENT',
          performanceLabel: 'Cần cải thiện',
          performanceTone: 'danger',
        },
      },
      trIdentity,
    );
    assert.equal(practiceLow.score10, 1.25);
    assert.equal(practiceLow.bandCode, 'NEEDS_IMPROVEMENT');

    const mockPass = resolveMockResultDisplay(
      {
        correctCount: 9,
        totalQuestions: 12,
        accuracyPercent: 75,
        scoring: {
          scoreType: 'JLPT_MOCK_180',
          normalizedScore: 132,
          normalizedMaxScore: 180,
          passingScore: 80,
          accuracyPercent: 75,
          isScoringValid: true,
          isPassStatusApplicable: true,
          simulatedPassed: true,
          passStatusCode: 'SIMULATED_PASSED',
          passStatusLabel: 'Đạt ngưỡng',
        },
      },
      trIdentity,
    );
    assert.equal(mockPass.score180, 132);
    assert.equal(mockPass.simulatedPassed, true);
    assert.equal(mockPass.tone, 'success');

    assert.equal(formatAnswerKey({ tokens: ['これ', 'は', 'ペン', 'です'] }), 'これ は ペン です');
    assert.equal(formatDurationSeconds(95), '1 phút 35 giây');
    assert.equal(formatRemainingShort(65), 'Còn 1 phút');
    assert.match(formatPercentage(12.5), /^12[.,]5%$/);
    assert.equal(formatPercentage(null), '—');
    assert.equal(formatScaleScore(112.4, 0), '112');
  });

  it('enforces shared UI architecture across Result, Review, History & Authoring surfaces', () => {
    const examResultSrc = fs.readFileSync(path.join(ROOT, 'src/pages/learner/ExamResult.jsx'), 'utf8');
    const skillChartSrc = fs.readFileSync(path.join(ROOT, 'src/features/mock-test/components/SkillAssessmentChart.jsx'), 'utf8');
    const mockPageSrc = fs.readFileSync(path.join(ROOT, 'src/pages/learner/MockTestPage.jsx'), 'utf8');
    const practicePageSrc = fs.readFileSync(path.join(ROOT, 'src/pages/learner/PracticeSetsPage.jsx'), 'utf8');
    const reviewSrc = fs.readFileSync(path.join(ROOT, 'src/features/mock-test/components/QuestionReviewWorkspace.jsx'), 'utf8');
    const dashboardSrc = fs.readFileSync(path.join(ROOT, 'src/features/mock-test/components/AttemptResultDashboard.jsx'), 'utf8');
    const summarySrc = fs.readFileSync(path.join(ROOT, 'src/features/mock-test/components/ResultScoreSummaryCard.jsx'), 'utf8');
    const assessmentSrc = fs.readFileSync(path.join(ROOT, 'src/features/mock-test/components/AssessmentResultDashboard.jsx'), 'utf8');

    assert.ok(skillChartSrc.includes("kind: 'MOCK'"), 'SkillAssessmentChart filters Mock Test history strictly');
    assert.ok(examResultSrc.includes('<DataTable'), 'ExamResult reuses shared DataTable');
    assert.ok(examResultSrc.includes('<Pagination'), 'ExamResult reuses shared Pagination');
    assert.ok(examResultSrc.includes('<UnifiedToolbar'), 'ExamResult reuses shared UnifiedToolbar');
    assert.ok(reviewSrc.includes('<RichQuestionText'), 'QuestionReviewWorkspace uses RichQuestionText');
    assert.ok(reviewSrc.includes('sidebarHeader'), 'QuestionReviewWorkspace hosts left-sidebar Score Summary slot');
    assert.ok(reviewSrc.includes('review-filter-'), 'QuestionReviewWorkspace integrates filter chips inside Question Navigator');
    assert.ok(dashboardSrc.includes('<QuestionReviewWorkspace'), 'AttemptResultDashboard delegates Q&A review to QuestionReviewWorkspace');
    assert.ok(dashboardSrc.includes('<ResultScoreSummaryCard'), 'AttemptResultDashboard reuses shared ResultScoreSummaryCard');
    assert.ok(dashboardSrc.includes('sidebarHeader={scoreSummaryCard}'), 'AttemptResultDashboard mounts Score Summary in left column');
    assert.ok(assessmentSrc.includes('<ResultScoreSummaryCard'), 'AssessmentResultDashboard reuses shared ResultScoreSummaryCard');
    assert.ok(summarySrc.includes('grid-cols-2'), 'ResultScoreSummaryCard enforces balanced 2x2 stat grid');
    assert.equal(mockPageSrc.includes('HaruMascot'), false, 'No fox mascot on MockTestPage');
    assert.equal(practicePageSrc.includes('HaruMascot'), false, 'No fox mascot on PracticeSetsPage');
    assert.equal(dashboardSrc.includes('HaruMascot'), false, 'No fox mascot on AttemptResultDashboard');
  });
});
