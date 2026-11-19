import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { api } from '@/api/client.js';
import {
  approveTransfer,
  getMentorAssignments,
  getTransferEligibility,
  getTransferRequest,
  getTransferRequests,
  previewMentorReplacement,
  rejectTransfer,
  replaceCohortMentor,
  requestCohortTransfer,
  withdrawTransfer,
} from '@/features/cohorts/api/cohortApi.js';
import * as studyCoursesApi from '@/features/cohorts/api/cohortApi.js';

describe('Cohort transfer & mentor replacement canonical contracts', () => {
  const originalGet = api.get;
  const originalPost = api.post;
  let last = null;

  before(() => {
    api.get = async (url, config) => { last = { method: 'GET', url, config }; return { isSuccess: true, result: [] }; };
    api.post = async (url, body, config) => { last = { method: 'POST', url, body, config }; return { isSuccess: true, result: {} }; };
  });
  after(() => { api.get = originalGet; api.post = originalPost; });

  it('learner submits a transfer REQUEST (multipart) instead of changing enrollment directly', async () => {
    await requestCohortTransfer(41, { targetCohortId: 7, reason: '  Đổi ca làm việc buổi tối  ', idempotencyKey: 'key-1' });
    assert.equal(last.method, 'POST');
    assert.equal(last.url, '/study-courses/41/transfer-requests');
    assert.ok(last.body instanceof FormData);
    assert.equal(last.body.get('idempotencyKey'), 'key-1');
    assert.equal(last.body.get('reason'), 'Đổi ca làm việc buổi tối');
    assert.equal(last.body.get('targetCohortId'), '7');
    const headers = { 'Content-Type': 'application/json' };
    last.config.transformRequest[0](last.body, headers);
    assert.equal('Content-Type' in headers, false);

    await requestCohortTransfer(41, { reason: 'Nhờ Admin chọn lớp phù hợp', idempotencyKey: 'key-2' });
    assert.equal(last.body.has('targetCohortId'), false);
  });

  it('exposes no direct enrollment-change or 1-1 booking mutation for transfers', () => {
    for (const name of ['changeCohort', 'changeMentor', 'moveEnrollment', 'createMentorBooking', 'bookOneOnOne']) {
      assert.equal(name in studyCoursesApi, false, name);
    }
  });

  it('wires admin queue, eligibility, approve/reject and learner withdraw routes', async () => {
    await getTransferRequests('Pending');
    assert.deepEqual([last.url, last.config.params], ['/study-courses/transfer-requests', { status: 'Pending' }]);
    await getTransferRequest(9);
    assert.equal(last.url, '/study-courses/transfer-requests/9');
    await getTransferEligibility(9, 12);
    assert.deepEqual([last.url, last.config.params], ['/study-courses/transfer-requests/9/eligibility', { targetCohortId: 12 }]);
    await approveTransfer(9, { targetCohortId: '12', note: 'OK', expectedRevision: 3 });
    assert.deepEqual([last.url, last.body], ['/study-courses/transfer-requests/9/approve', { targetCohortId: 12, note: 'OK', expectedRevision: 3 }]);
    await rejectTransfer(9, 'Lớp đã đủ chỗ', 3);
    assert.deepEqual([last.url, last.body], ['/study-courses/transfer-requests/9/reject', { reason: 'Lớp đã đủ chỗ', expectedRevision: 3 }]);
    await withdrawTransfer(9);
    assert.equal(last.url, '/study-courses/transfer-requests/9/withdraw');
  });

  it('wires mentor replacement preview, confirm and audit history', async () => {
    await previewMentorReplacement(5, 22);
    assert.deepEqual([last.url, last.config.params], ['/study-courses/cohorts/5/mentor-replacement/preview', { mentorId: 22 }]);
    await previewMentorReplacement(5, 22, 9);
    assert.deepEqual(last.config.params, { mentorId: 22, fromSessionNumber: 9 });
    const body = { mentorId: 22, reason: 'Cố vấn nghỉ dài hạn', idempotencyKey: 'k', expectedCohortRevision: 4, fromSessionNumber: null };
    await replaceCohortMentor(5, body);
    assert.deepEqual([last.url, last.body], ['/study-courses/cohorts/5/mentor-replacement', body]);
    await getMentorAssignments(5);
    assert.equal(last.url, '/study-courses/cohorts/5/mentor-assignments');
  });
});
