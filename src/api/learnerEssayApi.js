import { api } from './client.js';

function result(response) {
  return response?.result ?? response;
}

export async function scanLearnerEssay(file) {
  const form = new FormData();
  form.append('image', file);
  return result(await api.post('/learner-essays/scan', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }));
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
  return result(await api.post(`/learner-essays/${id}/rescan`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }));
}

export async function deleteLearnerEssay(id) {
  await api.delete(`/learner-essays/${id}`);
}
