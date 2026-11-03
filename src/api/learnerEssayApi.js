import { api } from './client.js';

function result(response) {
  return response?.result ?? response;
}

function asImage(form) {
  return api.post(form.url, form.body, {
    transformRequest: [(payload, headers) => {
      delete headers['Content-Type'];
      return payload;
    }],
  });
}

export async function scanLearnerEssay(file) {
  const form = new FormData();
  form.append('image', file);
  return result(await asImage({ url: '/learner-essays/scan', body: form }));
}

export async function getLearnerEssays() {
  return result(await api.get('/learner-essays'));
}

export async function getLearnerEssay(id) {
  return result(await api.get(`/learner-essays/${id}`));
}

export async function updateLearnerEssay(id, contentText) {
  return result(await api.put(`/learner-essays/${id}`, { contentText }));
}

export async function rescanLearnerEssay(id, file) {
  const form = new FormData();
  form.append('image', file);
  return result(await asImage({ url: `/learner-essays/${id}/rescan`, body: form }));
}

export async function deleteLearnerEssay(id) {
  await api.delete(`/learner-essays/${id}`);
}
