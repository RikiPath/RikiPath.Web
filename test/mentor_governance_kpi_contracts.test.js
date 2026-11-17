import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { api } from '../src/api/client.js';
import {
  SUPPORTED_JLPT_LEVELS,
  assertSupportedJlptLevel,
  createAdminMentorPlan,
  formatCompletionRatio,
  formatMinutesVi,
  formatTurnaroundVi,
  getAdminBookingAttendanceDetail,
  getAdminMentorKpiByMentor,
  getAdminMentorKpiList,
  getAdminMentorPlans,
  getAdminMentorQualifications,
  getBookingAttendance,
  getMentorKpiSummary,
  getMentorQualifications,
  grantAdminMentorQualification,
  isSupportedJlptLevel,
  normalizeJlptLevel,
  revokeAdminMentorQualification,
  updateAdminMentorPlan,
} from '../src/api/mentorGovernanceApi.js';

describe('Mentor Governance & JLPT N5-N2 Policy', () => {
  it('supports only N5-N2 for 1-1 Mentor consultations and rejects N1', () => {
    assert.deepEqual(SUPPORTED_JLPT_LEVELS, ['N5', 'N4', 'N3', 'N2']);
    assert.equal(normalizeJlptLevel(' n3 '), 'N3');
    assert.equal(isSupportedJlptLevel('N5'), true);
    assert.equal(isSupportedJlptLevel('n2'), true);
    assert.equal(isSupportedJlptLevel('N1'), false);
    assert.throws(() => assertSupportedJlptLevel('N1'), /không hỗ trợ N1/i);
  });

  it('formats durations, completion ratio and null turnaround without faking 0', () => {
    assert.equal(formatMinutesVi(0), '0 phút');
    assert.equal(formatMinutesVi(75), '1g 15p');
    assert.equal(formatMinutesVi(120), '2 giờ');
    assert.equal(formatCompletionRatio(3, 4), '75%');
    assert.equal(formatCompletionRatio(0, 0), '0%');
    assert.equal(formatTurnaroundVi(null), 'Chưa đủ dữ liệu');
    assert.equal(formatTurnaroundVi(undefined), 'Chưa đủ dữ liệu');
    assert.equal(formatTurnaroundVi(45), '45 phút');
  });
});

describe('Admin & Mentor Governance + KPI API Contracts', () => {
  let lastRequest = null;
  const origGet = api.get;
  const origPost = api.post;
  const origPut = api.put;

  before(() => {
    api.get = async (url, config) => {
      lastRequest = { method: 'get', url, params: config?.params };
      return { isSuccess: true, result: [{ id: 1, url }] };
    };
    api.post = async (url, data, config) => {
      lastRequest = { method: 'post', url, data, params: config?.params };
      return { isSuccess: true, result: { id: 1, url, data } };
    };
    api.put = async (url, data, config) => {
      lastRequest = { method: 'put', url, data, params: config?.params };
      return { isSuccess: true, result: { id: 1, url, data } };
    };
  });

  after(() => {
    api.get = origGet;
    api.post = origPost;
    api.put = origPut;
  });

  it('keeps Learner JLPT N5-N2 consultation package plan endpoints intact', async () => {
    await getAdminMentorPlans();
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/admin/mentor-plans');

    await createAdminMentorPlan({
      name: 'Gói 3 buổi N2',
      jlptLevel: 'n2',
      meetingSessionCount: 3,
      price: 900000,
      isActive: true,
    });
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/admin/mentor-plans');
    assert.equal(lastRequest.data.jlptLevel, 'N2');

    await updateAdminMentorPlan(7, {
      name: 'Gói 1 buổi N3',
      jlptLevel: 'N3',
      meetingSessionCount: 1,
      price: 300000,
      isActive: true,
    });
    assert.equal(lastRequest.method, 'put');
    assert.equal(lastRequest.url, '/admin/mentor-plans/7');

    await assert.rejects(
      () => createAdminMentorPlan({ name: 'Gói N1', jlptLevel: 'N1', meetingSessionCount: 1, price: 500000 }),
      /không hỗ trợ N1/i,
    );
  });

  it('calls retained JLPT qualification endpoints without hourly rates or payrolls', async () => {
    await getAdminMentorQualifications(12);
    assert.equal(lastRequest.url, '/admin/mentor-compensation/qualifications');
    assert.deepEqual(lastRequest.params, { mentorUserId: 12 });

    await grantAdminMentorQualification({ mentorUserId: 12, jlptLevel: 'N3', notes: 'Verified' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/qualifications/grant');

    await revokeAdminMentorQualification({ mentorUserId: 12, jlptLevel: 'N3', reason: 'Expired' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/qualifications/revoke');

    await getMentorQualifications();
    assert.equal(lastRequest.url, '/mentor/compensation/qualifications');
  });

  it('calls canonical non-financial Mentor Attendance & KPI endpoints', async () => {
    await getMentorKpiSummary({ from: '2026-10-01', to: '2026-11-16' });
    assert.equal(lastRequest.url, '/mentor/kpi/summary');
    assert.deepEqual(lastRequest.params, { from: '2026-10-01', to: '2026-11-16' });

    await getAdminMentorKpiList({ mentorId: 12, page: 1, pageSize: 20 });
    assert.equal(lastRequest.url, '/admin/mentors/kpi');
    assert.deepEqual(lastRequest.params, { mentorId: 12, page: 1, pageSize: 20 });

    await getAdminMentorKpiByMentor(12, { from: '2026-10-01' });
    assert.equal(lastRequest.url, '/admin/mentors/12/kpi');

    await getAdminBookingAttendanceDetail(88);
    assert.equal(lastRequest.url, '/admin/bookings/88/attendance');

    await getBookingAttendance(88);
    assert.equal(lastRequest.url, '/mentor-meetings/bookings/88/attendance');
  });
});
