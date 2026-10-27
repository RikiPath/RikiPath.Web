import { api } from './client.js';

export const getMentorBookings = async () => (await api.get('/mentor/meetings')).result || [];

export const getMentorBooking = async (id) => {
  const booking = (await getMentorBookings()).find((item) => item.id === Number(id));
  if (!booking) throw new Error('Không tìm thấy buổi này trong lịch của bạn.');
  return booking;
};
