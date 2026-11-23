import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeLearningFlowState,
  hasActiveLearningPath,
  isAiRoadmapRoute,
  ROADMAP_LOCK_REASON,
} from '../src/features/learning-path/learningPathFlow.js';
import { buildCompactSkillCards } from '../src/features/mock-test/utils/examSkillScores.js';
import { errorMessage } from '../src/api/apiErrors.js';
import { RIKI_MASCOT_ASSETS, RIKI_POSE_MAP } from '../src/components/ui/mascotAssets.js';

describe('RikiPath Sakura Learning Experience V2', () => {
  describe('Step-by-step AI Learning Path lock/unlock flow', () => {
    it('treats /roadmap variants consistently as AI roadmap route', () => {
      assert.equal(isAiRoadmapRoute('/roadmap'), true);
      assert.equal(isAiRoadmapRoute('/roadmap/'), true);
      assert.equal(isAiRoadmapRoute('/roadmap/?generateAi=1'), true);
      assert.equal(isAiRoadmapRoute('/lessons/'), false);
    });

    it('keeps Standard /roadmap open across onboarding steps while tracking AI path readiness', () => {
      assert.equal(hasActiveLearningPath(null), false);
      assert.equal(hasActiveLearningPath({ status: 'DRAFT' }), false);
      assert.equal(hasActiveLearningPath({ status: 'SUPERSEDED' }), false);
      assert.equal(hasActiveLearningPath({ status: 'ACTIVE', pathId: 7 }), true);

      const flowNoGoal = computeLearningFlowState({
        profile: null,
        placementStatus: null,
        latestPath: null,
      });
      assert.equal(flowNoGoal.step, 'goal');
      assert.equal(flowNoGoal.lockState, 'open');

      const flowNeedsPlacement = computeLearningFlowState({
        profile: { targetJlptLevelId: 4, targetJlptLevelName: 'N4' },
        placementStatus: { hasCompletedPlacementTest: false },
        latestPath: null,
      });
      assert.equal(flowNeedsPlacement.step, 'placement');
      assert.equal(flowNeedsPlacement.lockState, 'open');

      const flowReadyForAi = computeLearningFlowState({
        profile: { targetJlptLevelId: 4, targetJlptLevelName: 'N4' },
        placementStatus: { hasCompletedPlacementTest: true, latestCompletedAttemptId: 42 },
        latestPath: null,
      });
      assert.equal(flowReadyForAi.step, 'generate-ai');
      assert.equal(flowReadyForAi.hasPlacementCompleted, true);
      assert.equal(flowReadyForAi.hasActiveAiPath, false);
      assert.equal(flowReadyForAi.lockState, 'open');
    });

    it('unlocks /roadmap strictly when backend confirms ACTIVE path', () => {
      const flowActive = computeLearningFlowState({
        profile: { targetJlptLevelId: 4, targetJlptLevelName: 'N4' },
        placementStatus: { hasCompletedPlacementTest: true },
        latestPath: { pathId: 12, status: 'active' },
      });
      assert.equal(flowActive.step, 'ready');
      assert.equal(flowActive.hasActiveAiPath, true);
      assert.equal(flowActive.lockState, 'open');
      assert.ok(ROADMAP_LOCK_REASON.length > 0);
    });

    it('returns unknown lockState while latest query is loading or failing without cached path', () => {
      assert.equal(computeLearningFlowState({ isPending: true }).lockState, 'unknown');
      assert.equal(computeLearningFlowState({ isError: true }).lockState, 'unknown');
    });
  });

  describe('Compact 4-column assessment result cards', () => {
    it('normalizes 8 N5+N4 sections cleanly and marks audio-less Listening as unevaluated', () => {
      const result = {
        sections: [
          { mockTestSectionId: 1, jlptLevelName: 'N5', languageSkillName: 'Vocabulary', correctCount: 4, totalQuestions: 5, hasAudioEvidence: true },
          { mockTestSectionId: 2, jlptLevelName: 'N5', languageSkillName: 'Grammar', correctCount: 3, totalQuestions: 5, hasAudioEvidence: true },
          { mockTestSectionId: 3, jlptLevelName: 'N5', languageSkillName: 'Reading', correctCount: 5, totalQuestions: 5, hasAudioEvidence: true },
          { mockTestSectionId: 4, jlptLevelName: 'N5', languageSkillName: 'Listening', correctCount: 0, totalQuestions: 5, hasAudioEvidence: false },
          { mockTestSectionId: 5, jlptLevelName: 'N4', languageSkillName: 'Vocabulary', correctCount: 3, totalQuestions: 5, hasAudioEvidence: true },
          { mockTestSectionId: 6, jlptLevelName: 'N4', languageSkillName: 'Grammar', correctCount: 4, totalQuestions: 5, hasAudioEvidence: true },
          { mockTestSectionId: 7, jlptLevelName: 'N4', languageSkillName: 'Reading', correctCount: 2, totalQuestions: 5, hasAudioEvidence: true },
          { mockTestSectionId: 8, jlptLevelName: 'N4', languageSkillName: 'Listening', correctCount: 3, totalQuestions: 5, hasAudioEvidence: true },
        ],
      };

      const cards = buildCompactSkillCards(result);
      assert.equal(cards.length, 8);
      assert.equal(cards[0].levelName, 'N5');
      assert.equal(cards[0].scorePercent, 80);
      assert.equal(cards[0].hasData, true);

      assert.equal(cards[3].levelName, 'N5');
      assert.equal(cards[3].hasData, false);
      assert.equal(cards[3].unverifiedAudio, true);
      assert.equal(cards[3].scorePercent, null);

      assert.equal(cards[7].levelName, 'N4');
      assert.equal(cards[7].hasData, true);
      assert.equal(cards[7].scorePercent, 60);
    });
  });

  describe('Safe API error string formatting (prevents React child object crashes)', () => {
    it('always returns a plain string even with custom fallback', () => {
      assert.equal(typeof errorMessage(null, 'Custom fallback'), 'string');
      assert.equal(errorMessage(null, 'Custom fallback'), 'Custom fallback');
      const quotaErr = {
        status: 403,
        data: { errorCode: 'AI_CREDIT_REQUIRED', errorMessage: 'Hết lượt AI.' },
      };
      const out = errorMessage(quotaErr, 'Fallback');
      assert.equal(typeof out, 'string');
      assert.ok(out.length > 0);
    });
  });

  describe('3D Chibi Riki Mascot coverage', () => {
    it('provides all 8 requested mascot states plus backwards-compatible pose aliases', () => {
      for (const pose of ['welcome', 'studying', 'thinking', 'celebrating', 'achievement', 'encouraging', 'resting', 'confused']) {
        assert.ok(RIKI_MASCOT_ASSETS[pose], `Missing mascot asset for ${pose}`);
        assert.equal(RIKI_POSE_MAP[pose], pose);
      }
      for (const alias of ['greeting', 'guiding', 'listening', 'writing', 'sad']) {
        assert.ok(RIKI_MASCOT_ASSETS[RIKI_POSE_MAP[alias]], `Missing asset for alias ${alias}`);
      }
    });
  });
});
