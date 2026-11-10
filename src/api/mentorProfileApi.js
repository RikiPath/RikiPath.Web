import { api } from './client.js';

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
