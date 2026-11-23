import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCurrentWeekStrip,
  buildMonthCalendarMatrix,
  buildVerifiedActivityDateSet,
  computeStreakProgress,
  resolveDashboardPrimaryFlow,
} from '@/features/learner-ui/learnerTokens.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('RikiPath V5 Sakura Journey — Mobile Asset Removal & Vector Consistency', () => {
  it('removed V4 Mobile-copied banner and raster icon3d folders from src/assets', () => {
    assert.equal(exists('src/assets/banners'), false);
    assert.equal(exists('src/assets/icons3d'), false);
    assert.equal(exists('src/features/learner-ui/learnerAssets.js'), false);
  });

  it('uses vector WebClayIcon and IllustratedPageHeader across Learner Dashboard and Subpages', () => {
    const webClay = readSrc('src/features/learner-ui/WebClayIcon.jsx');
    const home = readSrc('src/pages/learner/HomeLearner.jsx');
    const kana = readSrc('src/pages/learner/KanjiWritingPracticePage.jsx');
    const srs = readSrc('src/pages/learner/DailySRS.jsx');
    const roadmap = readSrc('src/pages/learner/RoadmapJLPT.jsx');

    assert.match(webClay, /StudyIllustration/);
    assert.match(webClay, /streak/);
    assert.match(webClay, /achievement/);
    assert.match(home, /WeeklyStreakBar/);
    assert.match(home, /LearningJourneyMap/);
    assert.match(home, /TodayLearningPanel/);
    assert.match(home, /SkillExplorer/);
    assert.match(home, /LearningAnalytics/);
    assert.match(kana, /IllustratedPageHeader/);
    assert.match(srs, /IllustratedPageHeader/);
    assert.match(roadmap, /IllustratedPageHeader/);
    assert.match(roadmap, /JourneyMap/);
  });

  it('reads real targetExamDate and assessedJlptLevelName in LearningGoalsSection', () => {
    const goals = readSrc('src/features/profile/components/LearningGoalsSection.jsx');
    assert.match(goals, /targetExamDate/);
    assert.match(goals, /assessedJlptLevelName/);
  });

  it('enlarges standalone 3D WebClayIcons (44px-96px) without white frames and removes header/section gradient washes', () => {
    const webClay = readSrc('src/features/learner-ui/WebClayIcon.jsx');
    const header = readSrc('src/features/learner-ui/IllustratedPageHeader.jsx');
    const tokens = readSrc('src/features/learner-ui/learnerTokens.js');
    const home = readSrc('src/pages/learner/HomeLearner.jsx');

    assert.match(webClay, /md:\s*64/);
    assert.match(webClay, /lg:\s*78/);
    assert.match(webClay, /xl:\s*96/);
    assert.doesNotMatch(header, /bg-gradient-to-r/);
    assert.doesNotMatch(header, /bg-white\/95/);
    assert.doesNotMatch(header, /rp-learner-banner-dots/);
    assert.match(header, /data-learner-banner="warm-ivory"/);
    assert.match(header, /rp-learner-banner/);
    assert.doesNotMatch(tokens, /bg-gradient-to-br/);
    assert.match(home, /JapanScene/);

    const cssTokens = readSrc('src/styles/tokens.css');
    assert.match(cssTokens, /--rp-learner-banner-bg:\s*#FFFCF8/i);
    assert.match(cssTokens, /--rp-learner-banner-border:\s*#EAE3E4/i);
    assert.match(cssTokens, /--rp-learner-banner-title:\s*#172B4D/i);
    assert.match(cssTokens, /--rp-learner-banner-accent:\s*#CC4B6B/i);
  });
});

describe('RikiPath V5 Pure Activity Calendar & Streak Helpers', () => {
  it('computes verified consecutive dates backward from lastActivityDate in GMT+7 without fabricating empty days', () => {
    const set = buildVerifiedActivityDateSet({
      streak: {
        currentStreakDays: 3,
        lastActivityDate: '2026-11-21T10:00:00Z',
        isActiveToday: true,
      },
      mockHistory: [{ submittedAt: '2026-11-15T05:00:00Z' }],
      todayKey: '2026-11-21',
    });

    assert.equal(set.has('2026-11-21'), true);
    assert.equal(set.has('2026-11-20'), true);
    assert.equal(set.has('2026-11-19'), true);
    assert.equal(set.has('2026-11-18'), false);
    assert.equal(set.has('2026-11-15'), true);
  });

  it('builds a Mon..Sun week strip and full calendar month grid aligned to Mondays', () => {
    const dates = new Set(['2026-11-20', '2026-11-21']);
    const week = buildCurrentWeekStrip(dates, '2026-11-21');
    assert.equal(week.length, 7);
    assert.equal(week[0].label, 'T2');
    assert.equal(week[5].label, 'T7');
    assert.equal(week[5].isToday, true);
    assert.equal(week[5].active, true);
    assert.equal(week[0].active, false);

    const matrix = buildMonthCalendarMatrix(2026, 10, dates, '2026-11-21'); // Nov 2026
    assert.ok(matrix.length >= 5);
    assert.equal(matrix[0].days.length, 7);
  });

  it('resolves milestone progress and AI credit gate cleanly', () => {
    const milestone = computeStreakProgress(7, true);
    assert.equal(milestone.isMilestoneHit, true);
    assert.equal(milestone.nextMilestone, 14);

    const lockedFlow = resolveDashboardPrimaryFlow({
      targetLevel: 'N3',
      roadmapAccess: { hasActiveAiPath: false, isPending: false, hasPlacementCompleted: true },
      studyAccess: { learningPathUsesRemaining: 0 },
    });
    assert.equal(lockedFlow.stage, 'needs-ai-credit');
    assert.equal(lockedFlow.to, '/plans/');
  });
});
