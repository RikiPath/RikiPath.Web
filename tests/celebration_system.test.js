import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  hasCelebratedOnce,
  markCelebratedOnce,
  resolveLessonCelebrationTier,
  shouldPlayCelebration,
} from '../src/components/ui/celebrationLogic.js';

describe('Phase 5 & 6 — Sakura Celebration Design System & Tiers', () => {
  it('resolves lesson, stage, and milestone tiers accurately from real counts', () => {
    assert.equal(resolveLessonCelebrationTier({ completedLessons: 2, totalLessons: 10, stageCompleted: false }), 'lesson');
    assert.equal(resolveLessonCelebrationTier({ completedLessons: 4, totalLessons: 10, stageCompleted: true }), 'stage');
    assert.equal(resolveLessonCelebrationTier({ completedLessons: 10, totalLessons: 10, stageCompleted: true }), 'milestone');
    assert.equal(resolveLessonCelebrationTier({ completedLessons: 0, totalLessons: 0, stageCompleted: false }), 'lesson');
  });

  it('tracks one-time celebration replay guard safely even without browser window', () => {
    assert.equal(hasCelebratedOnce('assessment-10'), false);
    markCelebratedOnce('assessment-10');
    assert.equal(shouldPlayCelebration('assessment-10'), true);
  });

  it('honors prefers-reduced-motion in celebration CSS tokens', () => {
    const tokens = fs.readFileSync(path.resolve('src/styles/tokens.css'), 'utf8');
    assert.match(tokens, /\.rp-celebrate-bloom/);
    assert.match(tokens, /\.rp-celebrate-petal/);
    assert.match(tokens, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.rp-celebrate-bloom/);
  });
});
