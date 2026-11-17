import { api } from './client.js';

const result = (data) => data?.result ?? data;

export function submitPracticeWriting({ textContent, certificateLevelId, topic }) {
  return api.post('/PracticeSubmission/submit', {
    type: 'Writing',
    textContent,
    certificateLevelId,
    ...(topic ? { topic } : {}),
  }).then(result);
}

export function getPracticeHistory() {
  return api.get('/PracticeSubmission/my-history').then(result);
}

export function getPracticeSubmission(submissionId) {
  return api.get(`/PracticeSubmission/${submissionId}`).then(result);
}

export function regradePracticeSubmission(submissionId) {
  return api.post(`/PracticeSubmission/${submissionId}/regrade`).then(result);
}
