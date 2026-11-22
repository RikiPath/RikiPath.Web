import { api } from './client.js';

const feedbackPath = (type, id) => '/learner/feedback/' + type + '/' + id;

export async function getMyFeedback(type, id) {
  return (await api.get(feedbackPath(type, id))).result ?? null;
}

export async function saveMyFeedback(type, id, payload) {
  return (await api.put(feedbackPath(type, id), payload)).result;
}

export async function listLearnerFeedback({ admin, type, page }) {
  return (await api.get(admin ? '/admin/learner-feedback' : '/learner/feedback', {
    params: type ? { page, type } : { page },
  })).result;
}
