import { api } from './client.js';

export async function getStudyStreak() {
  const data = await api.get('/Analytics/study-streak');
  return data.result;
}

export async function getCompletionStats() {
  const data = await api.get('/Analytics/completion-stats');
  return data.result;
}

export async function getSkillBreakdown() {
  const data = await api.get('/Analytics/skill-breakdown');
  return data.result ?? [];
}
