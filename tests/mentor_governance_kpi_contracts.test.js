import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { api } from '@/api/client.js';
import * as governanceApi from '@/features/mentor/api/mentorGovernanceApi.js';
import {
  SUPPORTED_JLPT_LEVELS,
  assertSupportedJlptLevel,
  formatCompletionRatio,
  formatMinutesVi,
  formatTurnaroundVi,
  getAdminMentorKpiByMentor,
  getAdminMentorKpiList,
  getMentorKpiSummary,
  getRoomAttendance,
  isSupportedJlptLevel,
  normalizeJlptLevel,
} from '@/features/mentor/api/mentorGovernanceApi.js';

describe('Mentor Governance & JLPT N5-N2 Policy', () => {
  it('supports JLPT N5-N1 and rejects unsupported levels', () => {
    assert.deepEqual(SUPPORTED_JLPT_LEVELS, ['N5', 'N4', 'N3', 'N2', 'N1']);
    assert.equal(normalizeJlptLevel(' n3 '), 'N3');
    assert.equal(isSupportedJlptLevel('N5'), true);
    assert.equal(isSupportedJlptLevel('n1'), true);
    assert.equal(isSupportedJlptLevel('N6'), false);
    assert.throws(() => assertSupportedJlptLevel('N6'), /N5, N4, N3, N2 và N1/i);
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

  it('retires legacy 1-1 booking, compensation, payroll, payout and booking-attendance clients', () => {
    const retired = [
      'getAdminMentorPlans',
      'createAdminMentorPlan',
      'updateAdminMentorPlan',
      'getAdminBookingAttendanceDetail',
      'getBookingAttendance',
    ];
    for (const name of retired) {
      assert.equal(name in governanceApi, false, `${name} should be removed`);
    }
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

    await getRoomAttendance('room-guid-88');
    assert.equal(lastRequest.url, '/mentor-meetings/rooms/room-guid-88/attendance');
  });
});
