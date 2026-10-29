import { api } from './client.js';

export const getMentorBookings = async () => (await api.get('/mentor/meetings')).result || [];

export const getMentorBooking = async (id) => (await api.get(`/mentor/meetings/${id}`)).result;

export const acceptMentorBooking = async (id) => (await api.post(`/mentor/meetings/${id}/accept`)).result;
