import { api } from '@/api/client.js';

export const getMyMentorProfile = async () => (await api.get('/mentor/profile')).result;

export const updateMyMentorProfile = async (body) => (await api.put('/mentor/profile', body)).result;

export const submitMentorVerification = async (body) =>
  (await api.post('/mentor/profile/submit-verification', body)).result;

export const uploadVerificationDocument = async (file) => {
  const form = new FormData();
  form.append('file', file);
  const data = await api.post('/mentor/profile/verification-document', form, {
    transformRequest: [(payload, headers) => {
      delete headers['Content-Type'];
      return payload;
    }],
  });
  return data.result;
};

export const getMyVerificationDocument = async () =>
  api.get('/mentor/profile/verification-document/content', { responseType: 'blob' });

// Tìm kiếm cố vấn và xem hồ sơ công khai.
export const searchMentors = async (params) => (await api.get('/mentors', { params })).result;

export const getPublicMentorProfile = async (mentorId) =>
  (await api.get(`/mentors/${mentorId}/profile`)).result;

// Truy cập và điểm danh phòng họp trực tuyến.
export const checkRoomAccess = async (roomId) =>
  (await api.get(`/mentor-meetings/rooms/${roomId}/access`)).result;

export const getRoomPresence = async (roomId) =>
  (await api.get(`/mentor-meetings/rooms/${roomId}/presence`)).result;

export const getRoomAttendance = async (roomId) =>
  (await api.get(`/mentor-meetings/rooms/${roomId}/attendance`)).result || [];

