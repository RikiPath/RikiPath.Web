import { api } from './client.js';

export async function getDailyReviewQueue() {
  const data = await api.get('/Review/daily-queue');
  const result = data?.result ?? data?.data ?? data;
  return {
    totalDue: Number(result?.totalDue ?? result?.items?.length ?? 0),
    items: Array.isArray(result?.items) ? result.items : [],
  };
}

export async function submitReviewResult(reviewCardId, quality) {
  const data = await api.post('/Review/submit-result', {
    reviewCardId,
    quality,
  });
  return data?.result ?? data?.data ?? data;
}
