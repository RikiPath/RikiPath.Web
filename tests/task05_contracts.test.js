import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { api } from '@/api/client.js';
import * as cohortApiModule from '@/features/cohorts/api/cohortApi.js';
import {
  approveCohortScheduleRequest,
  cohortQueryParams,
  createCohortScheduleRequest,
  decideCohortComplaint,
  getAdminCohortScheduleRequests,
  getCohortComplaint,
  getCohortComplaints,
  getCohortMentorReviews,
  getCohorts,
  getCohortScheduleRequests,
  getCohortShiftPreview,
  getCourseCompletionSummary,
  getMentorCohortReviewSummary,
  rejectCohortScheduleRequest,
  respondCohortComplaint,
  submitCohortComplaint,
  submitCohortMentorReview,
  updateCohortMentorReview,
  withdrawCohortScheduleRequest,
} from '@/features/cohorts/api/cohortApi.js';
import { previewTeachingConflicts } from '@/features/scheduling/api/mentorScheduleManageApi.js';
import { courseHasStarted, reviewableMentors } from '@/features/cohorts/utils/completionHelpers.js';

describe('Task 05 API contracts', () => {
  const original = { get: api.get, post: api.post, put: api.put };
  let calls = [];
  const last = () => calls[calls.length - 1];

  before(() => {
    api.get = async (url, config) => { calls.push({ method: 'GET', url, config }); return { isSuccess: true, result: [] }; };
    api.post = async (url, body, config) => { calls.push({ method: 'POST', url, body, config }); return { isSuccess: true, result: { isValid: true, conflicts: [] } }; };
    api.put = async (url, body, config) => { calls.push({ method: 'PUT', url, body, config }); return { isSuccess: true, result: {} }; };
  });
  after(() => Object.assign(api, original));
  beforeEach(() => { calls = []; });

  it('previewTeachingConflicts posts UTC intervals to the mentor conflict-preview route', async () => {
    const intervals = [{ startUtc: '2026-11-20T12:00:00.000Z', endUtc: '2026-11-20T13:30:00.000Z', extra: 'ignored' }];
    const report = await previewTeachingConflicts(intervals);
    assert.equal(last().method, 'POST');
    assert.equal(last().url, '/mentors/me/schedule/conflict-preview');
    assert.deepEqual(last().body, { intervals: [{ startUtc: '2026-11-20T12:00:00.000Z', endUtc: '2026-11-20T13:30:00.000Z' }] });
    assert.equal(report.isValid, true);

    await previewTeachingConflicts(intervals, '42');
    assert.equal(last().body.excludeCohortId, 42);
  });

  it('removes legacy manual previewCohortSchedule export in favor of automatic proposal validation', () => {
    assert.equal('previewCohortSchedule' in cohortApiModule, false);
    assert.equal('saveCohort' in cohortApiModule, false);
  });

  it('getCohorts keeps the legacy no-arg call and sends only non-empty filters', async () => {
    await getCohorts();
    assert.equal(last().url, '/study-courses/cohorts');
    assert.equal(last().config, undefined);

    await getCohorts({ mentorId: '12', level: 'N3', intensity: 'Standard', weekday: '0', fromTime: '18:00', toTime: '21:00' });
    assert.deepEqual(last().config.params, {
      mentorId: 12,
      level: 'N3',
      intensity: 'Standard',
      weekday: 0,
      fromTime: '18:00',
      toTime: '21:00',
    });

    assert.deepEqual(cohortQueryParams({ mentorId: '', level: 'ALL', intensity: null, foo: 'bar' }), {});
  });

  it('schedule requests use the canonical routes and bodies', async () => {
    await createCohortScheduleRequest(5, { kind: 'ShiftWeeks', shiftWeeks: '2', reason: '  Chưa đủ học viên ', idempotencyKey: 'k-1' });
    assert.equal(last().url, '/study-courses/cohorts/5/schedule-requests');
    assert.deepEqual(last().body, { kind: 'ShiftWeeks', shiftWeeks: 2, reason: 'Chưa đủ học viên', idempotencyKey: 'k-1' });

    await createCohortScheduleRequest(5, { kind: 'CancelEmptyCohort', shiftWeeks: 3, reason: 'Lớp trống', idempotencyKey: 'k-2' });
    assert.equal(last().body.shiftWeeks, null);

    await getCohortScheduleRequests(5);
    assert.equal(last().url, '/study-courses/cohorts/5/schedule-requests');

    await getAdminCohortScheduleRequests('Pending');
    assert.equal(last().url, '/study-courses/cohort-schedule-requests');
    assert.deepEqual(last().config.params, { status: 'Pending' });

    await getCohortShiftPreview(5, 2);
    assert.equal(last().url, '/study-courses/cohorts/5/shift-preview');
    assert.deepEqual(last().config.params, { weeks: 2 });

    await approveCohortScheduleRequest(11, { note: 'OK', expectedRevision: 3 });
    assert.equal(last().url, '/study-courses/cohort-schedule-requests/11/approve');
    assert.deepEqual(last().body, { note: 'OK', expectedRevision: 3 });

    await rejectCohortScheduleRequest(11, 'Không phù hợp');
    assert.equal(last().url, '/study-courses/cohort-schedule-requests/11/reject');
    assert.deepEqual(last().body, { reason: 'Không phù hợp' });

    await withdrawCohortScheduleRequest(11);
    assert.equal(last().url, '/study-courses/cohort-schedule-requests/11/withdraw');
  });

  it('mentor reviews: create, update, list and public summary', async () => {
    await submitCohortMentorReview(20, { mentorId: '4', rating: '5', comment: ' Rất tận tâm ' });
    assert.equal(last().method, 'POST');
    assert.equal(last().url, '/study-courses/20/mentor-reviews');
    assert.deepEqual(last().body, { mentorId: 4, rating: 5, comment: 'Rất tận tâm' });

    await updateCohortMentorReview(20, 8, { rating: 4, comment: 'Tốt' });
    assert.equal(last().method, 'PUT');
    assert.equal(last().url, '/study-courses/20/mentor-reviews/8');
    assert.deepEqual(last().body, { rating: 4, comment: 'Tốt' });

    await getCohortMentorReviews(20);
    assert.equal(last().url, '/study-courses/20/mentor-reviews');

    await getMentorCohortReviewSummary(4);
    assert.equal(last().url, '/study-courses/mentors/4/cohort-review-summary');
  });

  it('complaints are submitted as multipart FormData with refund flag only for PaymentEnrollment', async () => {
    const evidence = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    await submitCohortComplaint(20, {
      category: 'PaymentEnrollment',
      message: ' Đã trả tiền nhưng chưa vào lớp ',
      mentorId: 4,
      refundReviewRequested: true,
      idempotencyKey: 'c-1',
      evidence,
    });
    const call = last();
    assert.equal(call.url, '/study-courses/20/complaints');
    assert.ok(call.body instanceof FormData);
    assert.equal(call.body.get('category'), 'PaymentEnrollment');
    assert.equal(call.body.get('message'), 'Đã trả tiền nhưng chưa vào lớp');
    assert.equal(call.body.get('mentorId'), '4');
    assert.equal(call.body.get('refundReviewRequested'), 'true');
    assert.equal(call.body.get('idempotencyKey'), 'c-1');
    assert.ok(call.body.get('evidence'));
    // multipart: Content-Type để trình duyệt tự đặt boundary
    const headers = { 'Content-Type': 'application/json' };
    call.config.transformRequest[0](call.body, headers);
    assert.equal('Content-Type' in headers, false);

    await submitCohortComplaint(20, { category: 'TeachingQuality', message: 'Chậm', refundReviewRequested: true, idempotencyKey: 'c-2' });
    assert.equal(last().body.has('refundReviewRequested'), false);
    assert.equal(last().body.has('mentorId'), false);
    assert.equal(last().body.has('evidence'), false);

    await getCohortComplaints('Open');
    assert.equal(last().url, '/study-courses/complaints');
    assert.deepEqual(last().config.params, { status: 'Open' });

    await getCohortComplaint(3);
    assert.equal(last().url, '/study-courses/complaints/3');

    await respondCohortComplaint(3, ' Xin lỗi, sẽ cải thiện ');
    assert.equal(last().url, '/study-courses/complaints/3/mentor-response');
    assert.deepEqual(last().body, { response: 'Xin lỗi, sẽ cải thiện' });

    await decideCohortComplaint(3, { status: 'Resolved', decision: 'Đã xử lý', expectedRevision: 2 });
    assert.equal(last().url, '/study-courses/complaints/3/decision');
    assert.deepEqual(last().body, { status: 'Resolved', decision: 'Đã xử lý', expectedRevision: 2 });
  });

  it('completion summary uses the canonical route', async () => {
    await getCourseCompletionSummary(20);
    assert.equal(last().method, 'GET');
    assert.equal(last().url, '/study-courses/20/completion-summary');
  });
});

describe('Task 05 completion helpers', () => {
  const summary = {
    sessions: { delivered: 2 },
    mentors: [
      { mentorId: 1, mentorName: 'A', sessionNumbers: [1, 2], isPrimary: true },
      { mentorId: 2, mentorName: 'B', sessionNumbers: [3], isPrimary: false },
      { mentorId: 3, mentorName: 'C', sessionNumbers: [], isPrimary: false },
    ],
    attendance: [
      { number: 1, status: 'Present' },
      { number: 2, status: 'Absent' },
      { number: 3, status: 'Scheduled' },
    ],
  };

  it('only mentors with delivered sessions are reviewable', () => {
    assert.deepEqual(reviewableMentors(summary).map((m) => m.mentorId), [1]);
    assert.deepEqual(reviewableMentors(null), []);
  });

  it('courseHasStarted uses delivered sessions or a provided clock (never reads the clock itself)', () => {
    assert.equal(courseHasStarted({ sessions: [{ status: 'Present' }] }, 0), true);
    assert.equal(courseHasStarted({ startsAt: '2026-01-01T00:00:00Z', sessions: [] }, 0), false);
    assert.equal(courseHasStarted({ startsAt: '2026-01-01T00:00:00Z', sessions: [] }, Date.parse('2026-02-01T00:00:00Z')), true);
    assert.equal(courseHasStarted({ startsAt: '2027-01-01T00:00:00Z', sessions: [] }, Date.parse('2026-02-01T00:00:00Z')), false);
  });
});
