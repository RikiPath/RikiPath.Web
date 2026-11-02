import { api } from './client.js';

const CP1252 = {
  8364: 0x80, 8218: 0x82, 402: 0x83, 8222: 0x84, 8230: 0x85, 8224: 0x86, 8225: 0x87,
  710: 0x88, 8240: 0x89, 352: 0x8a, 8249: 0x8b, 338: 0x8c, 381: 0x8e, 8216: 0x91,
  8217: 0x92, 8220: 0x93, 8221: 0x94, 8226: 0x95, 8211: 0x96, 8212: 0x97, 732: 0x98,
  8482: 0x99, 353: 0x9a, 8250: 0x9b, 339: 0x9c, 382: 0x9e, 376: 0x9f,
};

function readText(value) {
  const text = String(value ?? '');
  if (!text.includes('Ã') && !text.includes('á»')) return text;
  const bytes = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code < 256) bytes.push(code);
    else if (CP1252[code] != null) bytes.push(CP1252[code]);
    else return text;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    return text;
  }
}

function list(data) {
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data)) return data;
  return [];
}

export const getMeetingPlans = async () => list(await api.get('/mentor-meetings/plans')).map((plan) => ({
  ...plan,
  name: readText(plan.name),
  description: readText(plan.description),
}));

export const getMentorSlots = async (mentorId, from, to) => {
  const params = { from, to };
  if (mentorId) params.mentorId = mentorId;
  return list(await api.get('/mentor-meetings/availability', { params }));
};

export const getBookingMentors = async () => list(await api.get('/mentor-meetings/mentors'));

export const purchaseMeeting = ({ subscriptionPlanId, frontendOrigin }) =>
  api.post('/mentor-meetings/purchase', { subscriptionPlanId, frontendOrigin }).then((data) => data.result);

export const getPurchaseStatus = async (id) => (await api.get(`/mentor-meetings/purchases/${id}`)).result;

export const syncMeetingPurchase = async (id) => (await api.post(`/mentor-meetings/purchases/${id}/sync`)).result;

export const confirmLocalPurchase = async (id) => (await api.post(`/mentor-meetings/purchases/${id}/local-confirm`)).result;

export const getLearnerBookings = async () => list(await api.get('/mentor-meetings/bookings'));

export const getMentorPurchases = async () => list(await api.get('/mentor-meetings/purchases'));

export const bookMentorWithCredit = ({ mentorAvailabilityId, question }) =>
  api.post('/mentor-meetings/bookings', {
    mentorAvailabilityId,
    question: question || null,
  }).then((data) => data.result);

// Số dư vé tư vấn và lịch sử giao dịch.
export const getCreditBalance = async () => (await api.get('/v1/mentor-credits/balance')).result;
export const getCreditHistory = async () => (await api.get('/v1/mentor-credits/history')).result || [];

// Đặt lịch tư vấn bằng vé và giải phóng giữ chỗ.
export const bookMeetingWithCredit = async body => (await api.post('/v1/learner/mentor-bookings', body)).result;
export const releaseBookingHold = async (bookingId, body) =>
  (await api.post(`/v1/learner/mentor-bookings/${bookingId}/release`, body)).result;

// Kiểm tra điều kiện hủy và đổi lịch.
export const getCancellationEligibility = async bookingId =>
  (await api.get(`/v1/mentor-bookings/${bookingId}/cancellation-eligibility`)).result;
export const cancelMentorBooking = async (bookingId, body) =>
  (await api.post(`/v1/mentor-bookings/${bookingId}/cancel`, body)).result;
export const rescheduleMentorBooking = async (bookingId, body) =>
  (await api.post(`/v1/mentor-bookings/${bookingId}/reschedule`, body)).result;

// Đánh giá và phản hồi chất lượng cố vấn.
export const createMentorReview = async body => (await api.post('/v1/mentor-reviews', body)).result;
export const getMentorReviews = async (mentorId, params) =>
  (await api.get(`/v1/mentors/${mentorId}/reviews`, { params })).result;
export const getMentorRatingSummary = async mentorId =>
  (await api.get(`/v1/mentors/${mentorId}/rating-summary`)).result;
export const replyMentorReview = async (reviewId, body) =>
  (await api.post(`/v1/mentor-reviews/${reviewId}/reply`, body)).result;

// Khiếu nại và xử lý tranh chấp buổi tư vấn.
export const createMentorDispute = async body => (await api.post('/v1/mentor-disputes', body)).result;
export const getLearnerDisputes = async params =>
  (await api.get('/v1/learner/mentor-disputes', { params })).result;
export const getDisputeDetail = async disputeId =>
  (await api.get(`/v1/mentor-disputes/${disputeId}`)).result;
export const respondMentorDispute = async (disputeId, body) =>
  (await api.post(`/v1/mentor-disputes/${disputeId}/respond`, body)).result;

// Tìm kiếm cố vấn và xem hồ sơ công khai.
export const searchMentors = async params => (await api.get('/v1/mentors', { params })).result;
export const getPublicMentorProfile = async mentorId =>
  (await api.get(`/v1/mentors/${mentorId}/profile`)).result;
export const getMentorAvailableSlots = async (mentorId, from, to) =>
  (await api.get(`/v1/mentors/${mentorId}/slots`, { params: { from, to } })).result;
export const getMentorAvailableDates = async (mentorId, from, to) =>
  (await api.get(`/v1/mentors/${mentorId}/available-dates`, { params: { from, to } })).result;
