import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ROADMAP_SETUP_FLEXIBLE_REASON,
  ROADMAP_SETUP_GOAL_REASON,
  ROADMAP_SETUP_PLACEMENT_REASON,
  computeLearningFlowState,
  isRoadmapNavigationRoute,
} from '@/features/learning-path/learningPathFlow.js';
import { resolveDashboardPrimaryFlow } from '@/features/learner-ui/learnerTokens.js';
import { errorMessage } from '@/api/apiErrors.js';
import {
  computeStepValidity,
  validateStep2Level,
  validateStep4ExamDate,
} from '@/features/auth/components/onboardingWizardLogic.js';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '..');
const readWeb = (rel) => fs.readFileSync(path.join(WEB_ROOT, rel), 'utf8');
const readRepo = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

describe('Learner Onboarding, Placement & Roadmap State Validation (20-Scenario Suite)', () => {
  it('1 & 2. New Google OAuth and Email learners who skip onboarding have no goal, no roadmap, and no fabricated progress', () => {
    const newOAuthProfile = {
      userId: 101,
      authProviders: ['Google'],
      targetJlptLevelId: null,
      targetJlptLevelName: null,
      placementDecision: 'NOT_TAKEN',
      setupState: {
        onboardingCompleted: false,
        hasConfirmedGoal: false,
        placementStatus: 'NOT_STARTED',
        placementDecision: 'NOT_TAKEN',
        standardRoadmapEligible: false,
        aiRoadmapEligible: false,
        aiRoadmapState: 'NOT_ELIGIBLE',
        activeRoadmapType: 'NONE',
        hasAnyValidRoadmap: false,
        setupStage: 'GOAL_REQUIRED',
        nextAction: 'COMPLETE_ONBOARDING',
        blockingErrorCode: 'STUDY_LEVEL_REQUIRED',
        hasValidRoadmapProgress: false,
        roadmapCompletedLessons: null,
        roadmapTotalLessons: null,
        roadmapCompletionPercent: null,
      },
    };
    const newEmailProfile = { ...newOAuthProfile, userId: 102, authProviders: ['Password'] };

    for (const profile of [newOAuthProfile, newEmailProfile]) {
      const flow = computeLearningFlowState({ profile, placementStatus: null, latestPath: null });
      assert.equal(flow.onboardingCompleted, false);
      assert.equal(flow.hasConfirmedGoal, false);
      assert.equal(flow.standardRoadmapEligible, false);
      assert.equal(flow.aiRoadmapEligible, false);
      assert.equal(flow.hasAnyValidRoadmap, false);
      assert.equal(flow.activeRoadmapType, 'NONE');
      assert.equal(flow.setupStage, 'GOAL_REQUIRED');
      assert.equal(flow.nextAction, 'COMPLETE_ONBOARDING');
      assert.equal(flow.hasValidRoadmapProgress, false);
      assert.equal(flow.roadmapTotalLessons, null);
      assert.equal(flow.isRoadmapSetupIncomplete, true);
      assert.equal(flow.roadmapNavIndicator.reason, ROADMAP_SETUP_FLEXIBLE_REASON);

      const hero = resolveDashboardPrimaryFlow({ targetLevel: null, roadmapAccess: flow });
      assert.equal(hero.stage, 'needs-goal');
      assert.equal(hero.ctaLabel, 'Đặt mục tiêu JLPT');
      assert.equal(hero.to, '/onboarding/');
    }
  });

  it('3. Partially completed onboarding is not treated as a valid confirmed goal and preserves optional exam date rules', () => {
    const partial = computeStepValidity({
      activeCertId: 1,
      activeLevelId: null,
      timeMode: 'fixed',
      minutes: 30,
      examDate: '',
      today: '2026-11-25',
      isJlpt: true,
    });
    assert.equal(partial[1].valid, false);
    assert.equal(validateStep2Level({ activeCertId: 1, activeLevelId: null }).valid, false);
    assert.equal(validateStep4ExamDate({ examDate: '', today: '2026-11-25', isJlpt: true }).valid, true);

    const flow = computeLearningFlowState({
      profile: { targetJlptLevelId: null, dailyStudyMinutes: 30, learningGoalVersion: 0 },
      placementStatus: { placementDecision: 'NOT_TAKEN' },
      latestPath: null,
    });
    assert.equal(flow.hasConfirmedGoal, false);
    assert.equal(flow.setupStage, 'GOAL_REQUIRED');
  });

  it('4. Confirmed goal without placement decision blocks both Standard and AI roadmaps (never interprets missing result as skip)', () => {
    const flow = computeLearningFlowState({
      profile: {
        targetJlptLevelId: 2,
        targetJlptLevelName: 'N4',
        placementDecision: 'NOT_TAKEN',
        setupState: {
          onboardingCompleted: true,
          hasConfirmedGoal: true,
          targetJlptLevelId: 2,
          targetJlptLevelName: 'N4',
          placementStatus: 'NOT_STARTED',
          placementDecision: 'NOT_TAKEN',
          isPlacementExplicitlySkipped: false,
          hasValidCompletedPlacement: false,
          standardRoadmapEligible: false,
          aiRoadmapEligible: false,
          aiRoadmapState: 'NOT_ELIGIBLE',
          activeRoadmapType: 'NONE',
          hasAnyValidRoadmap: false,
          setupStage: 'PLACEMENT_REQUIRED',
          nextAction: 'CHOOSE_PLACEMENT_OR_SKIP',
          blockingErrorCode: 'STANDARD_ROADMAP_PLACEMENT_REQUIRED',
          hasValidRoadmapProgress: false,
        },
      },
      placementStatus: { hasCompletedPlacementTest: false, placementDecision: 'NOT_TAKEN' },
      latestPath: null,
    });

    assert.equal(flow.hasConfirmedGoal, true);
    assert.equal(flow.isPlacementExplicitlySkipped, false);
    assert.equal(flow.standardRoadmapEligible, false);
    assert.equal(flow.aiRoadmapEligible, false);
    assert.equal(flow.hasAnyValidRoadmap, false);
    assert.equal(flow.setupStage, 'PLACEMENT_REQUIRED');
    assert.equal(flow.isRoadmapSetupIncomplete, true);
    assert.equal(flow.roadmapNavIndicator.reason, ROADMAP_SETUP_PLACEMENT_REASON);

    const hero = resolveDashboardPrimaryFlow({ targetLevel: 'N4', roadmapAccess: flow });
    assert.equal(hero.stage, 'needs-placement');
    assert.equal(hero.ctaLabel, 'Đánh giá năng lực');
    // Sequential flow: a new roadmap needs a real assessment, so there is no skip action.
    assert.equal(hero.canSkipPlacement, undefined);
  });

  it('5. Placement started but not completed keeps roadmap setup incomplete (IN_PROGRESS and PENDING_SUBMISSION)', () => {
    const inProgress = computeLearningFlowState({
      profile: { targetJlptLevelId: 2, targetJlptLevelName: 'N4', placementDecision: 'NOT_TAKEN' },
      placementStatus: { hasActiveAttempt: true, activeAttemptId: 77, hasCompletedPlacementTest: false },
      latestPath: null,
    });
    assert.equal(inProgress.placementStatus, 'IN_PROGRESS');
    assert.equal(inProgress.isPlacementInProgress, true);
    assert.equal(inProgress.standardRoadmapEligible, false);
    assert.equal(inProgress.aiRoadmapEligible, false);
    assert.equal(inProgress.setupStage, 'PLACEMENT_IN_PROGRESS');
    assert.equal(inProgress.nextAction, 'RESUME_PLACEMENT');

    const heroInProgress = resolveDashboardPrimaryFlow({ targetLevel: 'N4', roadmapAccess: inProgress });
    assert.equal(heroInProgress.stage, 'placement-in-progress');
    assert.equal(heroInProgress.ctaLabel, 'Tiếp tục đánh giá năng lực');

    const pendingSubmit = computeLearningFlowState({
      profile: { targetJlptLevelId: 2, targetJlptLevelName: 'N4', placementDecision: 'NOT_TAKEN' },
      placementStatus: {
        hasActiveAttempt: false,
        hasCompletedPlacementTest: false,
        attemptAllowance: { pendingSubmissionAttemptId: 88 },
      },
      latestPath: null,
    });
    assert.equal(pendingSubmit.placementStatus, 'PENDING_SUBMISSION');
    assert.equal(pendingSubmit.hasPendingPlacementSubmission, true);
    assert.equal(pendingSubmit.standardRoadmapEligible, false);
    assert.equal(pendingSubmit.nextAction, 'SUBMIT_EXPIRED_PLACEMENT');
  });

  it('6, 7 & 8. Explicit placement skip unlocks Standard roadmap only and keeps AI roadmap locked', () => {
    const flow = computeLearningFlowState({
      profile: {
        targetJlptLevelId: 1,
        targetJlptLevelName: 'N5',
        placementDecision: 'SKIPPED',
        setupState: {
          onboardingCompleted: true,
          hasConfirmedGoal: true,
          placementStatus: 'EXPLICITLY_SKIPPED',
          placementDecision: 'SKIPPED',
          isPlacementExplicitlySkipped: true,
          hasValidCompletedPlacement: false,
          standardRoadmapEligible: true,
          aiRoadmapEligible: false,
          aiRoadmapState: 'NOT_ELIGIBLE',
          activeRoadmapType: 'STANDARD',
          hasAnyValidRoadmap: true,
          setupStage: 'STANDARD_READY',
          nextAction: 'OPEN_STANDARD_ROADMAP',
          hasValidRoadmapProgress: true,
          roadmapCompletedLessons: 0,
          roadmapTotalLessons: 12,
          roadmapCompletionPercent: 0,
        },
      },
      placementStatus: { placementDecision: 'SKIPPED', hasCompletedPlacementTest: false },
      latestPath: null,
    });

    assert.equal(flow.placementStatus, 'EXPLICITLY_SKIPPED');
    assert.equal(flow.standardRoadmapEligible, true);
    assert.equal(flow.aiRoadmapEligible, false);
    assert.equal(flow.aiRoadmapState, 'NOT_ELIGIBLE');
    assert.equal(flow.hasAnyValidRoadmap, true);
    assert.equal(flow.activeRoadmapType, 'STANDARD');
    assert.equal(flow.setupStage, 'STANDARD_READY');
    assert.equal(flow.isRoadmapSetupIncomplete, false);

    const hero = resolveDashboardPrimaryFlow({ targetLevel: 'N5', roadmapAccess: flow });
    assert.equal(hero.stage, 'standard-roadmap');
    assert.equal(hero.ctaLabel, 'Mở lộ trình tiêu chuẩn');
  });

  it('9 & 10. Valid completed placement unlocks both Standard and AI eligibility, separating AI eligibility from READY generation', () => {
    const beforeGen = computeLearningFlowState({
      profile: { targetJlptLevelId: 3, targetJlptLevelName: 'N3', placementDecision: 'COMPLETED' },
      placementStatus: { hasCompletedPlacementTest: true, latestCompletedAttemptId: 501 },
      latestPath: null,
    });
    assert.equal(beforeGen.standardRoadmapEligible, true);
    assert.equal(beforeGen.aiRoadmapEligible, true);
    assert.equal(beforeGen.aiRoadmapState, 'NOT_GENERATED');
    assert.equal(beforeGen.hasActiveAiPath, false);
    assert.equal(beforeGen.setupStage, 'AI_READY_TO_GENERATE');

    const afterGen = computeLearningFlowState({
      profile: {
        targetJlptLevelId: 3,
        targetJlptLevelName: 'N3',
        learningMode: 'AI_PERSONALIZED',
        placementDecision: 'COMPLETED',
      },
      placementStatus: { hasCompletedPlacementTest: true, latestCompletedAttemptId: 501 },
      latestPath: { pathId: 99, status: 'ACTIVE', dailySchedules: [{ day: 1, isCompleted: false }] },
    });
    assert.equal(afterGen.aiRoadmapEligible, true);
    assert.equal(afterGen.aiRoadmapState, 'READY');
    assert.equal(afterGen.hasActiveAiPath, true);
    assert.equal(afterGen.activeRoadmapType, 'AI_PERSONALIZED');
    assert.equal(afterGen.setupStage, 'ROADMAP_ACTIVE');
  });

  it('11, 12 & 17. Maps backend prerequisite error codes cleanly, guards duplicate AI generation, and blocks bypasses server-side', () => {
    for (const code of [
      'STUDY_LEVEL_REQUIRED',
      'STUDY_LEVEL_UNSUPPORTED',
      'LEARNING_GOAL_REQUIRED',
      'STANDARD_ROADMAP_PLACEMENT_REQUIRED',
      'PLACEMENT_IN_PROGRESS',
      'PLACEMENT_PENDING_SUBMISSION',
      'LEARNING_PATH_GOAL_REQUIRED',
      'LEARNING_PATH_PLACEMENT_REQUIRED',
      'PATH_PREVIEW_REQUIRED',
    ]) {
      const msg = errorMessage({ status: 409, data: { errorCode: code } });
      assert.ok(msg && msg.length > 10 && msg !== 'Không thể hoàn tất thao tác. Vui lòng thử lại.', `missing mapping for ${code}`);
    }

    const roadmapPage = readWeb('src/pages/learner/RoadmapJLPT.jsx');
    const aiPanel = readWeb('src/pages/learner/AiLearningPathPanel.jsx');
    const stageDetail = readWeb('src/pages/learner/RoadmapStageDetail.jsx');
    assert.match(roadmapPage, /if \(aiEligible && !roadmapAccess\.hasActiveAiPath\)/);
    assert.doesNotMatch(aiPanel, /const triggerGenerate = searchParams\.get\('generateAi'\)/);
    assert.match(stageDetail, /RoadmapSetupState/);

    const stdSvc = readRepo('RikiPath.Backend/RikiPath.Application/Services/StandardRoadmapService.cs');
    const lpCtrl = readRepo('RikiPath.Backend/RikiPath.WebApi/Controllers/LearningPathController.cs');
    const lpSvc = readRepo('RikiPath.Backend/RikiPath.Application/Services/LearningPathService.cs');
    const upSvc = readRepo('RikiPath.Backend/RikiPath.Application/Services/UserProfileService.cs');
    assert.match(stdSvc, /ValidateStandardEligibilityAsync/);
    assert.match(lpCtrl, /ValidateAiPrerequisiteAsync/);
    assert.match(lpCtrl, /InFlightGenerations/);
    assert.match(lpSvc, /UserGenerateLocks/);
    assert.match(upSvc, /STANDARD_ROADMAP_PLACEMENT_REQUIRED/);
    assert.match(upSvc, /LEARNING_PATH_PLACEMENT_REQUIRED/);
  });

  it('13, 14, 15, 16, 18 & 20. Dashboard, Roadmap, Sidebar, Search, and Progress stay consistent without flicker or fabricated 0/32', () => {
    const dashboard = readWeb('src/pages/learner/Dashboard.jsx');
    const home = readWeb('src/pages/learner/HomeLearner.jsx');
    const roadmap = readWeb('src/pages/learner/RoadmapJLPT.jsx');
    const setupCard = readWeb('src/features/learning-path/components/RoadmapSetupState.jsx');
    const appShell = readWeb('src/layouts/AppShell.jsx');
    const authMutations = readWeb('src/features/auth/hooks/useAuthMutations.js');
    const analyticsSvc = readRepo('RikiPath.Backend/RikiPath.Application/Services/AnalyticsService.cs');

    // 13. No forced bounce out of /app on refresh/re-login when skipping onboarding
    assert.doesNotMatch(dashboard, /Navigate to="\/onboarding"/);

    // 14 & 18. Dashboard shows "Chưa có lộ trình" when no valid roadmap, restores LearningJourneyMap once valid
    assert.match(home, /Chưa có lộ trình/);
    assert.match(home, /<RoadmapSetupState/);
    assert.match(home, /<LearningJourneyMap/);
    assert.match(analyticsSvc, /HasValidRoadmap = false/);

    // 15. Goal mutations invalidate learner setup, placement, roadmap, and AI caches
    assert.match(authMutations, /invalidateQueries\(\{ queryKey: \['learner'\] \}\)/);
    assert.match(authMutations, /invalidateQueries\(\{ queryKey: \['ai-learning-path'\] \}\)/);

    // 16 & Sidebar/Search consistency: /roadmap carries setup indicator and opens RoadmapSetupModal from Sidebar & QuickJump
    assert.equal(isRoadmapNavigationRoute('/roadmap'), true);
    assert.equal(isRoadmapNavigationRoute('/roadmap/stages/1'), true);
    assert.equal(isRoadmapNavigationRoute('/lessons'), false);
    assert.match(appShell, /setupIndicatorFor/);
    assert.match(appShell, /setupIndicatorOf/);
    assert.match(appShell, /<RoadmapSetupModal/);
    assert.match(setupCard, /export function RoadmapSetupModal/);

    // Roadmap State A/B/C/D guarantees (Flexible Learning Setup)
    assert.match(setupCard, /resolveSetupStep/);
    assert.match(setupCard, /Đặt mục tiêu JLPT/);
    assert.match(setupCard, /Đánh giá năng lực/);
    assert.match(setupCard, /Tạo lộ trình tiêu chuẩn/);
    assert.doesNotMatch(setupCard, /Bỏ qua đánh giá/);
    assert.match(setupCard, /SetupStepper/);
    assert.match(roadmap, /LockedAiRoadmapCard/);
    assert.match(roadmap, /hasConfirmedGoal \? \(/);

    // 20. Anti-flicker loading state before authoritative state resolves
    assert.match(home, /setupLoading \?/);
    assert.match(roadmap, /setupPending \?/);
  });

  it('19. Web and Mobile share identical onboarding & placement decision rules (Mobile does not silently skip placement)', () => {
    const mobileOnboarding = readRepo('RikiPath.Mobile/lib/features/onboarding/presentation/onboarding_screen.dart');
    const mobileRoadmap = readRepo('RikiPath.Mobile/lib/features/learning/presentation/learning_roadmap_screen.dart');
    const mobilePersonalized = readRepo('RikiPath.Mobile/lib/features/learning/presentation/widgets/personalized_roadmap_home.dart');

    assert.match(mobileOnboarding, /Never implicitly skip placement after goal confirmation/);
    assert.match(mobileOnboarding, /onboarding_skip_placement_button/);
    assert.match(mobileRoadmap, /STUDY_LEVEL_REQUIRED/);
    assert.match(mobileRoadmap, /STANDARD_ROADMAP_PLACEMENT_REQUIRED/);
    assert.match(mobilePersonalized, /Đặt mục tiêu JLPT/);
  });

  it('21. Supports Placement-before-Goal without overwriting goal and flags insufficient target coverage', () => {
    const placementFirstFlow = computeLearningFlowState({
      profile: {
        userId: 501,
        targetJlptLevelId: null,
        assessedJlptLevelId: 2,
        assessedJlptLevelName: 'N4',
        placementDecision: 'COMPLETED',
        setupState: {
          onboardingCompleted: false,
          hasConfirmedGoal: false,
          placementStatus: 'COMPLETED',
          placementDecision: 'COMPLETED',
          hasValidCompletedPlacement: true,
          assessedJlptLevelId: 2,
          assessedJlptLevelName: 'N4',
          placementCompatibilityStatus: 'GOAL_NOT_SET',
          standardRoadmapEligible: false,
          aiRoadmapEligible: false,
          activeRoadmapType: 'NONE',
          hasAnyValidRoadmap: false,
        },
      },
      placementStatus: null,
      latestPath: null,
    });
    assert.equal(placementFirstFlow.hasConfirmedGoal, false);
    assert.equal(placementFirstFlow.hasPlacementCompleted, true);
    assert.equal(placementFirstFlow.assessedJlptLevelName, 'N4');
    assert.equal(placementFirstFlow.standardRoadmapEligible, false);
    assert.equal(placementFirstFlow.roadmapNavIndicator.reason, ROADMAP_SETUP_GOAL_REASON);

    const insufficientFlow = computeLearningFlowState({
      profile: {
        userId: 502,
        targetJlptLevelId: 4,
        targetJlptLevelName: 'N2',
        assessedJlptLevelId: 1,
        assessedJlptLevelName: 'N5',
        placementDecision: 'COMPLETED',
        setupState: {
          onboardingCompleted: true,
          hasConfirmedGoal: true,
          placementStatus: 'COMPLETED',
          placementDecision: 'COMPLETED',
          hasValidCompletedPlacement: true,
          placementCompatibilityStatus: 'INSUFFICIENT_FOR_TARGET',
          placementCompatibilityReason: 'Cần đánh giá bổ sung từ N3/N2.',
          standardRoadmapEligible: false,
          aiRoadmapEligible: false,
        },
      },
      placementStatus: null,
      latestPath: null,
    });
    assert.equal(insufficientFlow.placementCompatibilityStatus, 'INSUFFICIENT_FOR_TARGET');
    assert.equal(insufficientFlow.aiRoadmapEligible, false);
  });
});
