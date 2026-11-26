import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLACEMENT_GOAL_REASON,
  ROADMAP_SETUP_GOAL_REASON,
  ROADMAP_SETUP_PLACEMENT_REASON,
  SETUP_STEP_COPY,
  computeLearningFlowState,
  resolveFeatureLock,
  resolveSetupStep,
  setupIndicatorForRoute,
  setupStepIndex,
} from '../src/features/learning-path/learningPathFlow.js';
import { resolveDashboardPrimaryFlow } from '../src/features/learner-ui/learnerTokens.js';

const ss = (over) => ({
  hasConfirmedGoal: false,
  hasValidCompletedPlacement: false,
  isPlacementExplicitlySkipped: false,
  standardRoadmapEligible: false,
  aiRoadmapEligible: false,
  hasInitializedRoadmap: false,
  ...over,
});
const flowOf = (over) => computeLearningFlowState({ setupState: ss(over) });

test('sequential steps: Goal → Assessment → Roadmap', () => {
  assert.equal(resolveSetupStep(flowOf({})), 'goal');
  assert.equal(resolveSetupStep(flowOf({ hasConfirmedGoal: true })), 'placement');
  assert.equal(resolveSetupStep(flowOf({ hasConfirmedGoal: true, hasValidCompletedPlacement: true, standardRoadmapEligible: true, aiRoadmapEligible: true })), 'ready');
  assert.equal(resolveSetupStep(flowOf({ hasConfirmedGoal: true, hasValidCompletedPlacement: true, standardRoadmapEligible: true, hasInitializedRoadmap: true })), 'active');
  assert.deepEqual(['goal', 'placement', 'ready'].map(setupStepIndex), [0, 1, 2]);
  assert.equal(SETUP_STEP_COPY.goal.title, 'Đặt mục tiêu học tập');
  assert.equal(SETUP_STEP_COPY.goal.description, 'Hãy chọn mục tiêu JLPT để RikiPath chuẩn bị bài đánh giá phù hợp với bạn.');
});

test('a skipped assessment does not open a new roadmap; an incompatible one asks for assessment', () => {
  assert.equal(resolveSetupStep(flowOf({ hasConfirmedGoal: true, isPlacementExplicitlySkipped: true })), 'placement');
  assert.equal(resolveSetupStep(flowOf({ hasConfirmedGoal: true, placementCompatibilityStatus: 'INSUFFICIENT_FOR_TARGET' })), 'placement');
  // Fallback derivation (no server setupState): an assessment without a goal never counts.
  const fallback = computeLearningFlowState({ profile: {}, placementStatus: { hasCompletedPlacementTest: true } });
  assert.equal(fallback.hasPlacementCompleted, false);
  assert.equal(fallback.standardRoadmapEligible, false);
});

test('one setup state locks the assessment without a goal and the roadmap without an assessment', () => {
  const noGoal = flowOf({});
  assert.deepEqual(
    { gate: setupIndicatorForRoute(noGoal, '/placement').gate, reason: setupIndicatorForRoute(noGoal, '/placement').reason },
    { gate: 'goal', reason: PLACEMENT_GOAL_REASON },
  );
  assert.equal(setupIndicatorForRoute(noGoal, '/app/placement-test/').gate, 'goal');
  assert.equal(setupIndicatorForRoute(noGoal, '/roadmap').reason, ROADMAP_SETUP_GOAL_REASON);
  const goalOnly = flowOf({ hasConfirmedGoal: true });
  assert.equal(setupIndicatorForRoute(goalOnly, '/placement'), null);
  assert.equal(setupIndicatorForRoute(goalOnly, '/roadmap').reason, ROADMAP_SETUP_PLACEMENT_REASON);
  const ready = flowOf({ hasConfirmedGoal: true, hasValidCompletedPlacement: true, standardRoadmapEligible: true });
  assert.equal(setupIndicatorForRoute(ready, '/roadmap'), null);
  assert.equal(setupIndicatorForRoute(ready, '/lessons'), null);
  // Unknown state (loading / error) never shows a false lock.
  assert.equal(setupIndicatorForRoute({ ...noGoal, isPending: true }, '/placement'), null);
  assert.equal(PLACEMENT_GOAL_REASON, 'Đặt mục tiêu JLPT để mở khóa bài đánh giá.');
});

test('dashboard hero shows only the current step, never a skip or a parallel choice', () => {
  const noGoal = resolveDashboardPrimaryFlow({ roadmapAccess: flowOf({}) });
  assert.equal(noGoal.to, '/onboarding/');
  assert.equal(noGoal.secondaryTo, undefined);
  const goal = resolveDashboardPrimaryFlow({ roadmapAccess: flowOf({ hasConfirmedGoal: true }) });
  assert.equal(goal.to, '/app/placement-test/');
  assert.equal(goal.canSkipPlacement, undefined);
});

test('contextual lock: assessment and roadmap tell different stories in the same state', () => {
  const noGoal = flowOf({});
  const assess = resolveFeatureLock(noGoal, 'placement');
  const road = resolveFeatureLock(noGoal, 'roadmap');
  assert.equal(assess.title, 'Bắt đầu từ mục tiêu của bạn');
  assert.equal(assess.category, 'ĐÁNH GIÁ NĂNG LỰC');
  assert.deepEqual(assess.steps.map((x) => x.status), ['current', 'locked']);
  assert.equal(road.title, 'Hành trình JLPT đang chờ bạn!');
  assert.equal(road.category, 'LỘ TRÌNH HỌC JLPT');
  assert.deepEqual(road.steps.map((x) => x.status), ['current', 'locked', 'locked']);
  assert.equal(assess.primary.to, '/onboarding/');
  assert.equal(road.primary.to, '/onboarding/');
  assert.notEqual(assess.tooltip, road.tooltip);
});

test('contextual lock: roadmap guide follows the real assessment situation', () => {
  const goal = resolveFeatureLock(flowOf({ hasConfirmedGoal: true }), 'roadmap');
  assert.equal(goal.title, 'Còn một bước trước khi tạo lộ trình!');
  assert.equal(goal.primary.label, 'Bắt đầu đánh giá');
  assert.equal(goal.primary.to, '/app/placement-test/');
  assert.deepEqual(goal.steps.map((x) => x.status), ['done', 'current', 'locked']);
  assert.equal(goal.tooltip, 'Hoàn thành đánh giá năng lực để tạo lộ trình.');

  const inProgress = resolveFeatureLock(flowOf({ hasConfirmedGoal: true, hasActivePlacementAttempt: true }), 'roadmap');
  assert.equal(inProgress.primary.label, 'Tiếp tục đánh giá');
  assert.equal(inProgress.tooltip, 'Hoàn thành bài đánh giá đang làm dở.');

  const grading = resolveFeatureLock({ ...flowOf({ hasConfirmedGoal: true }), placementState: 'GRADING' }, 'roadmap');
  assert.equal(grading.title, 'Kết quả của bạn đang được xử lý');
  assert.equal(grading.primary, null);
  assert.equal(grading.tooltip, 'Vui lòng chờ kết quả đánh giá.');

  const quota = resolveFeatureLock(flowOf({ hasConfirmedGoal: true, placementCanStart: false, placementCannotStartReason: 'PLACEMENT_ATTEMPT_LIMIT_REACHED' }), 'roadmap');
  assert.equal(quota.state, 'quota');
  assert.notEqual(quota.primary.label, 'Bắt đầu đánh giá');

  const insufficient = resolveFeatureLock(flowOf({ hasConfirmedGoal: true, placementCompatibilityStatus: 'INSUFFICIENT_FOR_TARGET' }), 'roadmap');
  assert.equal(insufficient.state, 'insufficient');

  // Goal + valid assessment: no lock, the roadmap page opens directly. Goal set: assessment is open.
  assert.equal(resolveFeatureLock(flowOf({ hasConfirmedGoal: true, hasValidCompletedPlacement: true, standardRoadmapEligible: true }), 'roadmap'), null);
  assert.equal(resolveFeatureLock(flowOf({ hasConfirmedGoal: true }), 'placement'), null);
  // Unknown state never locks.
  assert.equal(resolveFeatureLock({ isPending: true }, 'roadmap'), null);
});
