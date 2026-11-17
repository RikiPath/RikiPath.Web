import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';
import { buildLearningGoal } from '../utils/learningGoal.js';

let server;
let api;
let placement;
let paths;
let profile;

before(async () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => null },
  });
  server = await createServer({ configFile: false, server: { middlewareMode: true, ws: false }, appType: 'custom' });
  ({ api } = await server.ssrLoadModule('/src/api/client.js'));
  placement = await server.ssrLoadModule('/src/api/placementApi.js');
  paths = await server.ssrLoadModule('/src/api/learningPathApi.js');
  profile = await server.ssrLoadModule('/src/api/profile.js');
});

after(async () => { await server?.close(); });

function mockRequests(requests) {
  api.defaults.adapter = async (config) => {
    const expected = requests.shift();
    assert.ok(expected, `Unexpected request ${config.method} ${config.url}`);
    assert.equal(config.method, expected.method || 'get');
    assert.equal(config.url, expected.url);
    if (expected.body) assert.deepEqual(JSON.parse(config.data), expected.body);
    if (expected.errorCode) {
      return { status: 409, config, data: { isSuccess: false, errorCode: expected.errorCode } };
    }
    return { status: 200, config, data: { result: expected.result, isSuccess: true } };
  };
  return () => assert.equal(requests.length, 0);
}

function snapshot(attemptId) {
  return {
    attemptId, timeLimitMinutes: 20,
    serverNow: '2026-11-10T02:00:00Z', expiresAt: '2026-11-10T02:09:00Z',
    questions: [{ questionId: 1, selectedOptionId: 5, jlptLevelName: 'N2' }],
  };
}

function result(attemptId, totalScore) {
  return {
    attemptId, totalScore, assessmentTargetLevelId: 2,
  };
}

function status(completed) {
  return {
    targetJlptLevelId: 2, targetJlptLevelName: 'N2',
    latestCompletedAttemptId: completed.attemptId,
    isReadyForLearningPath: true,
  };
}

test('N2 at 50% opens the latest result and enables a new AI plan', async () => {
  const completed = result(10, 50);
  const goal = { certificateTypeId: 1, targetCertificateLevelId: 2, dailyStudyMinutes: 45 };
  const verify = mockRequests([
    { url: '/PlacementTest/status', result: status(completed) },
    { url: '/PlacementTest/attempts/active', result: null },
    { url: '/PlacementTest/attempts/10', result: completed },
    { url: '/LearningPath/latest', result: null },
    { method: 'post', url: '/LearningPath/generate', body: goal, result: { pathId: 30 } },
  ]);
  const loaded = await placement.loadAssessment(null);
  assert.equal(placement.getPlacementResultActions(loaded.status, loaded.result).canPlan, true);
  assert.deepEqual(await paths.proposeLearningPath(goal), { active: { pathId: 30 } });
  verify();
});

test('a low N3 score can generate a plan or retake the target-level exam', async () => {
  const completed = {
    ...result(10, 22.5), assessmentTargetLevelId: 3, screeningLevelName: 'N3',
    nextActions: ['RETAKE_TARGET_ASSESSMENT'],
  };
  const current = { ...status(completed), targetJlptLevelId: 3, targetJlptLevelName: 'N3' };
  const verify = mockRequests([
    { url: '/PlacementTest/status', result: current },
    { url: '/PlacementTest/attempts/active', result: null },
    { url: '/PlacementTest/attempts/10', result: completed },
  ]);
  const loaded = await placement.loadAssessment(null);
  const actions = placement.getPlacementResultActions(loaded.status, loaded.result);
  assert.equal(actions.canRetake, true);
  assert.equal(actions.canPlan, true);
  verify();
});
test('retaking low N2 uses the returned attempt ID for autosave and submission and uses the new result', async () => {
  const completed = result(12, 58);
  const answers = [{ questionId: 1, selectedOptionId: 5 }];
  const verify = mockRequests([
    { method: 'post', url: '/PlacementTest/start', body: { retakeTargetAssessment: true }, result: snapshot(12) },
    { method: 'put', url: '/PlacementTest/attempts/12/answers', body: { answers }, result: {} },
    { method: 'post', url: '/PlacementTest/attempts/12/submit', body: { answers }, result: completed },
    { url: '/PlacementTest/status', result: status(completed) },
  ]);
  const attempt = await placement.startPlacementAttempt({ retakeTargetAssessment: true });
  await placement.savePlacementAnswers(attempt.attemptId, answers);
  const submitted = await placement.submitPlacementAttempt(attempt.attemptId, answers);
  assert.equal(placement.getPlacementResultActions(await placement.getPlacementStatus(), submitted).canPlan, true);
  verify();
});

test('reload restores the active attempt, saved choice and server-relative time', async () => {
  const attempt = snapshot(12);
  const verify = mockRequests([
    { url: '/PlacementTest/status', result: { targetJlptLevelId: 2 } },
    { url: '/PlacementTest/attempts/active', result: attempt },
  ]);
  const beforeLoad = Date.now();
  const loaded = await placement.loadAssessment(12);
  assert.equal(loaded.attempt.attemptId, 12);
  assert.equal(loaded.attempt.questions[0].selectedOptionId, 5);
  assert.ok(loaded.attempt.localDeadline >= beforeLoad + 9 * 60_000);
  verify();
});

test('changing the goal with an active path saves first, previews the new plan, then confirms by preview ID', async () => {
  const goal = buildLearningGoal({
    certificateTypeId: 1, levelId: 2, minMinutes: 30, maxMinutes: 60, examDate: '2027-07-04',
  }, '2026-11-10');
  const verify = mockRequests([
    { method: 'post', url: '/UserProfile/me/jlpt-goal', body: goal, result: { targetJlptLevelId: 2 } },
    { url: '/LearningPath/latest', result: { pathId: 30, status: 'ACTIVE' } },
    { method: 'post', url: '/LearningPath/preview', body: goal, result: { pathId: 31, status: 'DRAFT' } },
    { method: 'post', url: '/LearningPath/previews/31/confirm', result: { pathId: 31, status: 'ACTIVE' } },
  ]);
  await profile.setJlptGoal(goal);
  const { preview } = await paths.proposeLearningPath(goal);
  assert.equal(preview.status, 'DRAFT');
  assert.equal((await paths.confirmLearningPathPreview(preview.pathId)).status, 'ACTIVE');
  verify();
});

test('a legacy 50-question N2 result offers a new target-level assessment', async () => {
  const legacy = { attemptId: 9, totalScore: 34, totalQuestions: 50, requiresMiniAssessment: false };
  const actions = placement.getPlacementResultActions(status(legacy), legacy);
  assert.equal(actions.canStartUpdatedAssessment, true);
  const verify = mockRequests([
    { method: 'post', url: '/PlacementTest/start', body: {}, result: { ...snapshot(10), totalQuestions: 12 } },
  ]);
  assert.equal((await placement.startPlacementAttempt()).totalQuestions, 12);
  verify();
});

test('a historical mixed assessment can be replaced by the current target-level exam', () => {
  const historical = { ...result(10, 22.5), isComprehensiveAssessment: true };
  const actions = placement.getPlacementResultActions(status(historical), historical);
  assert.equal(actions.canStartUpdatedAssessment, true);
  assert.equal(actions.canPlan, true);
  assert.equal(actions.canRetake, false);
});

test('a retired mini result is read-only in history', () => {
  const historical = { ...result(10, 22.5), isMiniAssessment: true };
  const actions = placement.getPlacementResultActions(status(result(11, 30)), historical);
  assert.equal(actions.canPlan, false);
  assert.equal(actions.canRetake, false);
});
test('an old N3 result under an N2 goal hides both actions and returns without writing the goal', async () => {
  const oldN3 = {
    ...result(10, 22.5), assessmentTargetLevelId: 3,
    screeningLevelName: 'N3', followUpUnavailableReason: 'CURRENT_TARGET_MISMATCH', nextActions: [],
  };
  const currentN2 = { targetJlptLevelId: 2, targetJlptLevelName: 'N2', latestCompletedAttemptId: 10 };
  const verify = mockRequests([
    { url: '/PlacementTest/status', result: currentN2 },
    { url: '/PlacementTest/attempts/active', result: null },
    { url: '/PlacementTest/attempts/10', result: oldN3 },
    { url: '/PlacementTest/status', result: currentN2 },
    { url: '/PlacementTest/attempts/active', result: null },
    { url: '/PlacementTest/attempts/10', result: oldN3 },
  ]);
  const history = await placement.loadAssessment(10);
  const actions = placement.getPlacementResultActions(history.status, history.result);
  assert.equal(actions.canPlan, false);
  assert.equal(actions.canRetake, false);
  assert.deepEqual(await placement.loadAssessment(null), { status: currentN2 });
  verify();
});

test('returning from a result blocked by an active target assessment loads the active attempt', async () => {
  const active = snapshot(15);
  const completed = { ...result(10, 22.5), nextActions: [], followUpUnavailableReason: 'TARGET_ASSESSMENT_IN_PROGRESS' };
  const verify = mockRequests([
    { url: '/PlacementTest/status', result: status(completed) },
    { url: '/PlacementTest/attempts/active', result: active },
    { url: '/PlacementTest/attempts/10', result: completed },
    { url: '/PlacementTest/status', result: status(completed) },
    { url: '/PlacementTest/attempts/active', result: active },
  ]);
  const history = await placement.loadAssessment(10);
  assert.equal(placement.getPlacementResultActions(history.status, history.result).canRetake, false);
  assert.equal((await placement.loadAssessment(null)).attempt.attemptId, 15);
  verify();
});

test('reopening an expired attempt submits its saved answers and refreshes the result', async () => {
  const completed = result(19, 75);
  const verify = mockRequests([
    { url: '/PlacementTest/status', result: { targetJlptLevelId: 2 } },
    { url: '/PlacementTest/attempts/active', result: null },
    { url: '/PlacementTest/attempts/19', errorCode: 'PLACEMENT_ATTEMPT_EXPIRED' },
    { method: 'post', url: '/PlacementTest/attempts/19/submit', body: { answers: [] }, result: completed },
    { url: '/PlacementTest/status', result: status(completed) },
  ]);
  const page = await placement.loadAssessment(19);
  assert.equal(page.result, completed);
  assert.equal(page.status.latestCompletedAttemptId, 19);
  assert.match(page.notice, /tự động nộp/);
  verify();
});
