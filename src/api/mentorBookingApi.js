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

export const getBookingMentors = async () => {
  const from = new Date();
  const to = new Date(from.getTime() + 89 * 86400000);
  const slots = await getMentorSlots(null, from.toISOString(), to.toISOString());
  const mentors = new Map();
  slots.forEach((slot) => {
    if (!slot.mentorId || mentors.has(slot.mentorId)) return;
    mentors.set(slot.mentorId, {
      id: slot.mentorId,
      name: slot.mentorName || `Mentor #${slot.mentorId}`,
    });
  });
  return [...mentors.values()];
};

export const purchaseMeeting = ({ subscriptionPlanId, mentorAvailabilityId }) =>
  api.post('/mentor-meetings/purchase', { subscriptionPlanId, mentorAvailabilityId }).then((data) => data.result);

export const getPurchaseStatus = async (id) => (await api.get(`/mentor-meetings/purchases/${id}`)).result;

export const getLearnerBookings = async () => list(await api.get('/mentor-meetings/bookings'));

export const getMentorPurchases = async () => {
  const bookings = await getLearnerBookings();
  const ids = [...new Set(bookings.map((item) => item.userSubscriptionId).filter(Boolean))];
  const purchases = await Promise.all(ids.map((id) => getPurchaseStatus(id).catch(() => null)));
  return purchases.filter(Boolean);
};

export const bookMentorWithCredit = ({ subscriptionId, mentorAvailabilityId }) =>
  api.post(`/mentor-meetings/subscriptions/${subscriptionId}/bookings`, { mentorAvailabilityId }).then((data) => data.result);
