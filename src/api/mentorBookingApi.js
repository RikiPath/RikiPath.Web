import { api } from './client.js';

export const getBookingMentors = async () => (await api.get('/mentor-meetings/mentors')).result;
export const getMentorSlots = async (mentorId, from, to) => (await api.get('/mentor-meetings/availability', {
  params: { mentorId, from, to },
})).result;
export const getMeetingPlans = async () => (await api.get('/mentor-meetings/plans')).result || [];
export const purchaseMeeting = async body => (await api.post('/mentor-meetings/purchase', body)).result;
export const syncMeetingPurchase = async id => (await api.post(`/mentor-meetings/purchases/${id}/sync`)).result;
export const getLearnerBookings = async () => (await api.get('/mentor-meetings/bookings')).result || [];

export const getMentorPurchases = async () => (await api.get('/mentor-meetings/purchases')).result || [];
export const bookMentorWithCredit = async body => (await api.post('/mentor-meetings/bookings', body)).result;
