import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import { api } from '@/api/client.js';
import {
  unwrapApiResult,
  unwrapApiList,
  getAdminMentorVerifications,
  getAdminMentorVerificationDocument,
  verifyAdminMentor,
  getCurrentMentorGroupPolicy,
  getMentorGroupPolicyHistory,
  createMentorGroupPolicyVersion,
} from '@/features/admin/api/adminApi.js';
import * as mentorScheduleApi from '@/features/scheduling/api/mentorScheduleApi.js';
import {
  searchMentors,
  getPublicMentorProfile,
  checkRoomAccess,
  getRoomPresence,
  getRoomAttendance,
} from '@/features/mentor/api/mentorProfileApi.js';
import { formatVnDateTime, parseUtcDate, sessionStatusLabel } from '@/utils/vnDateTime.js';

describe('Web Admin & DTO unwrapping contracts', () => {
  it('unwrapApiResult unwraps nested .result or fallback correctly', () => {
    assert.deepEqual(unwrapApiResult({ result: { id: 1 } }), { id: 1 });
    assert.deepEqual(unwrapApiResult({ data: { result: { id: 2 } } }), { id: 2 });
    assert.deepEqual(unwrapApiResult({ data: [1, 2] }), [1, 2]);
    assert.deepEqual(unwrapApiResult('plain'), 'plain');
  });

  it('unwrapApiList unwraps direct arrays and multiple container property keys', () => {
    assert.deepEqual(unwrapApiList({ result: [1, 2, 3] }), [1, 2, 3]);
    assert.deepEqual(unwrapApiList({ result: { items: [{ id: 10 }] } }), [{ id: 10 }]);
    assert.deepEqual(unwrapApiList({ result: { disputes: [{ disputeId: 5 }] } }), [{ disputeId: 5 }]);
    assert.deepEqual(unwrapApiList({ result: { reviews: [{ reviewId: 8 }] } }), [{ reviewId: 8 }]);
    assert.deepEqual(unwrapApiList({ result: { verifications: [{ mentorId: 3 }] } }), [{ mentorId: 3 }]);
    assert.deepEqual(unwrapApiList({ result: { metrics: [{ mentorId: 4 }] } }), [{ mentorId: 4 }]);
    assert.deepEqual(unwrapApiList({ result: { emptyObj: true } }), []);
    assert.deepEqual(unwrapApiList(null), []);
  });
});

describe('Canonical Mentor Discovery, Profile & Meeting Room API contracts', () => {
  let lastRequest = null;
  const origGet = api.get;
  const origPost = api.post;

  before(() => {
    api.get = async (url, config) => {
      lastRequest = { method: 'get', url, params: config?.params, responseType: config?.responseType };
      return { isSuccess: true, result: { success: true, url } };
    };

    api.post = async (url, data, config) => {
      lastRequest = { method: 'post', url, data, params: config?.params };
      return { isSuccess: true, result: { success: true, url } };
    };
  });

  after(() => {
    api.get = origGet;
    api.post = origPost;
  });

  it('searchMentors queries the canonical mentor discovery route', async () => {
    await searchMentors({ jlptLevel: 'N3', keyword: 'Tanaka' });
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/mentors');
    assert.deepEqual(lastRequest.params, { jlptLevel: 'N3', keyword: 'Tanaka' });
  });

  it('getPublicMentorProfile queries the canonical mentor profile route', async () => {
    await getPublicMentorProfile(15);
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/mentors/15/profile');
  });

  it('queries canonical room access, presence and attendance endpoints', async () => {
    await checkRoomAccess('room-1');
    assert.equal(lastRequest.url, '/mentor-meetings/rooms/room-1/access');

    await getRoomPresence('room-1');
    assert.equal(lastRequest.url, '/mentor-meetings/rooms/room-1/presence');

    await getRoomAttendance('room-1');
    assert.equal(lastRequest.url, '/mentor-meetings/rooms/room-1/attendance');
  });
});

describe('Legacy 1-1 booking, chat & individual homework modules are removed', () => {
  it('removed obsolete 1-1 API and page files from the workspace', () => {
    for (const rel of [
      '../src/api/mentorBookingApi.js',
      '../src/api/mentorChatApi.js',
      '../src/services/mentorChatHub.js',
      '../src/api/homeworkApi.js',
      '../src/pages/mentor/MentorPrivateChat.jsx',
      '../src/pages/learner/MentorHomeworkPanel.jsx',
      '../src/utils/mentorBooking.js',
    ]) {
      assert.equal(existsSync(new URL(rel, import.meta.url)), false, `${rel} should be deleted`);
    }
  });
});

describe('Web Admin Operations API contract endpoints', () => {
  let lastRequest = null;
  const origGet = api.get;
  const origPost = api.post;

  before(() => {
    api.get = async (url, config) => {
      lastRequest = { method: 'get', url, params: config?.params, responseType: config?.responseType };
      return { isSuccess: true, result: { success: true, url } };
    };

    api.post = async (url, data, config) => {
      lastRequest = { method: 'post', url, data, params: config?.params };
      return { isSuccess: true, result: { success: true, url } };
    };
  });

  after(() => {
    api.get = origGet;
    api.post = origPost;
  });

  it('getAdminMentorVerifications queries /admin/mentors/verifications', async () => {
    await getAdminMentorVerifications({ status: 'Pending' });
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/admin/mentors/verifications');
    assert.deepEqual(lastRequest.params, { status: 'Pending' });
  });

  it('getAdminMentorVerificationDocument requests authenticated private content', async () => {
    await getAdminMentorVerificationDocument(12);
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/admin/mentors/12/verification-document/content');
    assert.equal(lastRequest.responseType, 'blob');
  });

  it('verifyAdminMentor posts to /admin/mentors/:id/verify', async () => {
    const payload = { decision: 'Approve', reviewNotes: 'Đầy đủ bằng cấp JLPT N1' };
    await verifyAdminMentor(12, payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/admin/mentors/12/verify');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('calls canonical Admin Group Policy endpoints and omits retired 50-minute weekly write APIs', async () => {
    await getCurrentMentorGroupPolicy();
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/admin/mentor-group-policies/current');

    await getMentorGroupPolicyHistory();
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/admin/mentor-group-policies');

    const payload = { expectedCurrentVersion: 1, maxLearners: 4, sessionMinutes: 90, restMinutes: 15 };
    await createMentorGroupPolicyVersion(payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/admin/mentor-group-policies');
    assert.deepEqual(lastRequest.data, payload);

    assert.equal(mentorScheduleApi.saveWeeklyAvailability, undefined);
    assert.equal(mentorScheduleApi.assignWeeklySlots, undefined);
    assert.equal(mentorScheduleApi.publishWeeklySchedule, undefined);
    assert.equal(typeof mentorScheduleApi.getWeeklyAvailability, 'function');
  });
});

describe('VN DateTime & Session formatting helpers', () => {
  it('sessionStatusLabel maps session and cohort states cleanly', () => {
    assert.equal(sessionStatusLabel({ status: 'Assigned' }), 'Đã xác nhận');
    assert.equal(sessionStatusLabel({ status: 'Scheduled' }), 'Đã lên lịch');
    assert.equal(sessionStatusLabel({ status: 'Cancelled' }), 'Đã hủy');
    assert.equal(sessionStatusLabel({ status: 'Completed' }), 'Đã hoàn thành');
    assert.equal(sessionStatusLabel({ status: 'AwaitingPayment' }), 'Chờ thanh toán');
    assert.equal(sessionStatusLabel({ status: 'UnexpectedInternalState' }), 'Trạng thái đang cập nhật');
  });

  it('parseUtcDate and formatVnDateTime format ISO timestamps cleanly', () => {
    assert.ok(parseUtcDate('2026-11-15T14:30:00Z') instanceof Date);
    const formatted = formatVnDateTime('2026-11-15T14:30:00Z');
    assert.ok(typeof formatted === 'string');
    assert.ok(formatted.length > 0);
  });
});
