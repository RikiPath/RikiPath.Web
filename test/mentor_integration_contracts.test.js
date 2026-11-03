import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { api } from '../src/api/client.js';
import {
  unwrapApiResult,
  unwrapApiList,
  getAdminMentorVerifications,
  getAdminMentorVerificationDocument,
  verifyAdminMentor,
  reviewAdminCancellationException,
  moderateAdminMentorReview,
  getAdminMentorDisputesQueue,
  resolveAdminMentorDispute,
  updateAdminMentorDisputeStatus,
  getAdminMentorQualityMetrics,
} from '../src/api/admin.js';

import {
  getCreditBalance,
  getCreditHistory,
  bookMeetingWithCredit,
  releaseBookingHold,
  getCancellationEligibility,
  cancelMentorBooking,
  rescheduleMentorBooking,
  createMentorReview,
  getMentorReviews,
  getMentorRatingSummary,
  replyMentorReview,
  createMentorDispute,
  getLearnerDisputes,
  getDisputeDetail,
  respondMentorDispute,
  searchMentors,
  getPublicMentorProfile,
  getMentorAvailableSlots,
  getMentorAvailableDates,
  getMentorBookings,
  getMentorBooking,
  getLearnerBookings,
} from '../src/api/mentorBookingApi.js';

import {
  bookingStatus,
  bookingExpired,
  bookingTime,
  paymentStatusLabel,
  bookingErrorMessage,
  BOOKING_HORIZON_DAYS,
} from '../src/utils/mentorBooking.js';

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

describe('Web Mentor Booking & Scheduling API contract endpoints', () => {
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

  it('getCreditBalance queries canonical learner credits route', async () => {
    await getCreditBalance();
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/learner/credits/balance');
  });

  it('loads Mentor booking list and detail through the canonical booking client', async () => {
    await getMentorBookings();
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/mentor-bookings');
    await getMentorBooking(55);
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/mentor-bookings/55');
    await getLearnerBookings();
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/learner/mentor-bookings');
  });

  it('getCreditHistory queries canonical learner credit history route', async () => {
    await getCreditHistory();
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/learner/credits/history');
  });

  it('bookMeetingWithCredit posts to canonical learner bookings route', async () => {
    const payload = { mentorAvailabilityId: 101, question: 'Dokkai JLPT N2' };
    await bookMeetingWithCredit(payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/learner/mentor-bookings');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('releaseBookingHold posts to canonical learner booking release route', async () => {
    const payload = { reason: 'Learner cancelled hold' };
    await releaseBookingHold(55, payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/learner/mentor-bookings/55/release');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('getCancellationEligibility queries the canonical cancellation route', async () => {
    await getCancellationEligibility(42);
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/mentor-bookings/42/cancellation-eligibility');
  });

  it('cancelMentorBooking posts to the canonical cancellation route', async () => {
    const payload = { reason: 'Bận đột xuất', requestLateException: false };
    await cancelMentorBooking(42, payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/mentor-bookings/42/cancel');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('rescheduleMentorBooking posts to the canonical rescheduling route', async () => {
    const payload = { newMentorAvailabilityId: 108, reason: 'Dời sang khung chiều' };
    await rescheduleMentorBooking(42, payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/mentor-bookings/42/reschedule');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('createMentorReview posts to the canonical reviews route', async () => {
    const payload = { mentorBookingId: 42, rating: 5, comment: 'Mentor tận tâm, giải thích dễ hiểu' };
    await createMentorReview(payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/mentor-reviews');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('getMentorReviews queries the canonical mentor reviews route', async () => {
    await getMentorReviews(7, { page: 1, pageSize: 10 });
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/mentors/7/reviews');
    assert.deepEqual(lastRequest.params, { page: 1, pageSize: 10 });
  });

  it('getMentorRatingSummary queries the canonical mentor rating route', async () => {
    await getMentorRatingSummary(7);
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/mentors/7/rating-summary');
  });

  it('replyMentorReview posts to the canonical review reply route', async () => {
    const payload = { reply: 'Cảm ơn bạn đã phản hồi tích cực!' };
    await replyMentorReview(12, payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/mentor-reviews/12/reply');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('createMentorDispute posts to the canonical disputes route', async () => {
    const payload = { mentorBookingId: 42, category: 'MentorAbsent', reason: 'Mentor không vào phòng' };
    await createMentorDispute(payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/mentor-disputes');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('getLearnerDisputes queries the canonical learner disputes route', async () => {
    await getLearnerDisputes({ page: 1 });
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/learner/mentor-disputes');
    assert.deepEqual(lastRequest.params, { page: 1 });
  });

  it('getDisputeDetail queries the canonical dispute detail route', async () => {
    await getDisputeDetail(99);
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/mentor-disputes/99');
  });

  it('respondMentorDispute posts to the canonical dispute response route', async () => {
    const payload = { mentorResponse: 'Có mặt đúng giờ nhưng learner mất kết nối' };
    await respondMentorDispute(99, payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/mentor-disputes/99/respond');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('searchMentors queries the canonical mentor discovery route', async () => {
    await searchMentors({ jlptLevel: 'N1', keyword: 'Tanaka' });
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/mentors');
    assert.deepEqual(lastRequest.params, { jlptLevel: 'N1', keyword: 'Tanaka' });
  });

  it('getPublicMentorProfile queries the canonical mentor profile route', async () => {
    await getPublicMentorProfile(15);
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/mentors/15/profile');
  });

  it('getMentorAvailableSlots queries the canonical mentor slots route', async () => {
    await getMentorAvailableSlots(15, '2026-11-01', '2026-11-07');
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/mentors/15/slots');
    assert.deepEqual(lastRequest.params, { from: '2026-11-01', to: '2026-11-07' });
  });

  it('getMentorAvailableDates queries the canonical mentor dates route', async () => {
    await getMentorAvailableDates(15, '2026-11-01', '2026-11-07');
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/mentors/15/available-dates');
    assert.deepEqual(lastRequest.params, { from: '2026-11-01', to: '2026-11-07' });
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

  it('reviewAdminCancellationException posts to /admin/mentor-bookings/:id/review-cancellation', async () => {
    const payload = { isApproved: true, decisionReason: 'Bất khả kháng y tế', overrideRefundRatio: 1.0 };
    await reviewAdminCancellationException(42, payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/admin/mentor-bookings/42/review-cancellation');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('moderateAdminMentorReview posts to /admin/mentor-reviews/:id/moderate', async () => {
    const payload = { action: 'Approve', moderationReason: 'Nội dung phù hợp quy chuẩn' };
    await moderateAdminMentorReview(8, payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/admin/mentor-reviews/8/moderate');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('getAdminMentorDisputesQueue queries /admin/mentor-disputes/queue', async () => {
    await getAdminMentorDisputesQueue({ page: 1, pageSize: 20 });
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/admin/mentor-disputes/queue');
    assert.deepEqual(lastRequest.params, { page: 1, pageSize: 20 });
  });

  it('resolveAdminMentorDispute posts to /admin/mentor-disputes/:id/resolve', async () => {
    const payload = { refundDecision: 'FullRefund', resolutionNotes: 'Xác nhận Mentor không tham dự' };
    await resolveAdminMentorDispute(31, payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/admin/mentor-disputes/31/resolve');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('updateAdminMentorDisputeStatus posts to /admin/mentor-disputes/:id/status', async () => {
    const payload = { status: 'UnderReview', note: 'Đang chờ giải trình từ mentor' };
    await updateAdminMentorDisputeStatus(31, payload);
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/admin/mentor-disputes/31/status');
    assert.deepEqual(lastRequest.data, payload);
  });

  it('getAdminMentorQualityMetrics queries /admin/mentor-quality/metrics', async () => {
    await getAdminMentorQualityMetrics({ page: 1 });
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/admin/mentor-quality/metrics');
    assert.deepEqual(lastRequest.params, { page: 1 });
  });
});

describe('Mentor Booking utility helpers', () => {
  it('uses the approved 30-day booking horizon', () => {
    assert.equal(BOOKING_HORIZON_DAYS, 30);
  });

  it('bookingStatus maps various states accurately', () => {
    assert.equal(bookingStatus({ status: 'Assigned' }), 'Đã xác nhận');
    assert.equal(bookingStatus({ status: 'Accepted' }), 'Đã xác nhận');
    assert.equal(bookingStatus({ status: 'Cancelled' }), 'Đã hủy');
    assert.equal(bookingStatus({ status: 'Completed' }), 'Đã hoàn tất');
    assert.equal(bookingStatus({ status: 'AwaitingPayment' }), 'Chờ thanh toán');
    assert.equal(bookingStatus({ status: 'UnexpectedInternalState' }), 'Trạng thái đang cập nhật');
  });

  it('paymentStatusLabel never displays a raw payment enum', () => {
    assert.equal(paymentStatusLabel('Paid'), 'Đã thanh toán');
    assert.equal(paymentStatusLabel('Pending'), 'Đang chờ thanh toán');
    assert.equal(paymentStatusLabel('Failed'), 'Thanh toán không thành công');
    assert.equal(paymentStatusLabel('Refunded'), 'Đã hoàn tiền');
    assert.equal(paymentStatusLabel('UnknownBackendValue'), 'Đang cập nhật');
  });

  it('bookingErrorMessage gives safe role and conflict feedback without raw HTTP errors', () => {
    assert.match(bookingErrorMessage({ response: { status: 409 }, message: 'Request failed with status code 409' }), /không còn khả dụng/);
    assert.match(bookingErrorMessage({ response: { status: 401 } }), /đăng nhập lại/);
    assert.match(bookingErrorMessage(new Error('Network Error')), /kiểm tra kết nối/);
    assert.doesNotMatch(bookingErrorMessage({ response: { status: 403 } }), /403|Forbidden/);
  });

  it('bookingExpired identifies past bookings', () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    const future = new Date(Date.now() + 3600000).toISOString();
    assert.equal(bookingExpired({ endsAt: past }), true);
    assert.equal(bookingExpired({ endsAt: future }), false);
  });

  it('bookingTime formats ISO timestamp cleanly', () => {
    const formatted = bookingTime('2026-11-15T14:30:00Z');
    assert.ok(typeof formatted === 'string');
    assert.ok(formatted.length > 0);
  });
});
