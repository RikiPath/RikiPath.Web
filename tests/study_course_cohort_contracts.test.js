import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { api } from '@/api/client.js';
import * as scheduleManageApi from '@/features/scheduling/api/mentorScheduleManageApi.js';
import * as cohortApi from '@/features/cohorts/api/cohortApi.js';
import {
  cancelCohortEnrollment,
  createCohortHomework,
  enrollCohort,
  generateHomeworkAiDraft,
  getCohortHomework,
  getCohorts,
  getMentorLearnerSkillProfile,
  getMyEntitlements,
  gradeHomeworkAssignment,
  saveRetakeSupportPlan,
  submitHomeworkScan,
} from '@/features/cohorts/api/cohortApi.js';

describe('Web Cohort Group Learning & Schedule Contract Tests', () => {
  const originalGet = api.get;
  const originalPost = api.post;
  const originalDelete = api.delete;
  let lastRequest = null;

  before(() => {
    api.get = async (url, config) => {
      lastRequest = { method: 'GET', url, config };
      return { isSuccess: true, result: [] };
    };
    api.post = async (url, body, config) => {
      lastRequest = { method: 'POST', url, body, config };
      return { isSuccess: true, result: {} };
    };
    api.delete = async (url, config) => {
      lastRequest = { method: 'DELETE', url, config };
      return { isSuccess: true, result: true };
    };
  });

  after(() => {
    api.get = originalGet;
    api.post = originalPost;
    api.delete = originalDelete;
  });

  it('removes dead disableMentorSlot action and wires valid availability lifecycle', async () => {
    assert.equal('disableMentorSlot' in scheduleManageApi, false);

    await scheduleManageApi.getMyAvailabilitySlots();
    assert.equal(lastRequest.method, 'GET');
    assert.equal(lastRequest.url, '/mentor/availability');

    await scheduleManageApi.deleteMyAvailabilitySlot(41);
    assert.equal(lastRequest.method, 'DELETE');
    assert.equal(lastRequest.url, '/mentor/availability/41');

    await scheduleManageApi.requestCancelAvailabilitySlots([41], 'Bận công tác');
    assert.equal(lastRequest.method, 'POST');
    assert.equal(lastRequest.url, '/mentor/availability/request-cancel');
    assert.deepEqual(lastRequest.body, { ids: [41], reason: 'Bận công tác' });
  });

  it('calls canonical cohort discovery, learner entitlement ledger, enrollment and cancellation endpoints', async () => {
    await getCohorts();
    assert.equal(lastRequest.url, '/study-courses/cohorts');

    await getMyEntitlements();
    assert.equal(lastRequest.url, '/study-courses/my-entitlements');

    assert.equal('grantCohortEntitlement' in cohortApi, false, 'Legacy manual grantCohortEntitlement must be removed');
    assert.equal('revokeCohortEntitlement' in cohortApi, false, 'Legacy revokeCohortEntitlement must be removed');
    assert.equal('getCohortEntitlements' in cohortApi, false, 'Legacy getCohortEntitlements must be removed');

    await enrollCohort(12, { idempotencyKey: 'abc', entitlementReference: 'ENT-1' });
    assert.equal(lastRequest.url, '/study-courses/cohorts/12/enroll');

    await cancelCohortEnrollment(99, 'Rút lui trước giờ');
    assert.equal(lastRequest.url, '/study-courses/99/cancel-enrollment');
  });

  it('calls cohort homework, scan submission, AI draft, skill profile and remediation support endpoints', async () => {
    await getCohortHomework(12);
    assert.equal(lastRequest.url, '/homework');
    assert.deepEqual(lastRequest.config, { params: { cohortId: 12 } });

    await createCohortHomework(12, { title: 'Kanji', targetLearnerIds: [8, 9] });
    assert.equal(lastRequest.url, '/homework/cohorts/12');

    const fakeForm = new FormData();
    fakeForm.append('textContent', 'Bai tap');
    await submitHomeworkScan(55, fakeForm);
    assert.equal(lastRequest.url, '/homework/55/submit-scan');

    await generateHomeworkAiDraft(55);
    assert.equal(lastRequest.url, '/homework/55/ai-draft');

    await gradeHomeworkAssignment(55, { passed: true, score: 92, feedback: 'Tốt' });
    assert.equal(lastRequest.url, '/homework/55/grade');

    await getMentorLearnerSkillProfile(9, 12);
    assert.equal(lastRequest.url, '/mentor/learners/9/skill-profile');
    assert.deepEqual(lastRequest.config, { params: { cohortId: 12 } });

    await saveRetakeSupportPlan(88, 5, 'Ôn đọc hiểu 2 tuần');
    assert.equal(lastRequest.url, '/study-courses/88/retake/5/support-plan');
    assert.deepEqual(lastRequest.body, { supportPlan: 'Ôn đọc hiểu 2 tuần' });
  });
});
