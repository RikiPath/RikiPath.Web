import { api } from './client.js';

export async function getDailyReviewQueue() {
  const data = await api.get('/Review/daily-queue');
  return data.result ?? { totalDue: 0, items: [] };
}
