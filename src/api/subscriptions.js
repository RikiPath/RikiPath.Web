import { api } from './client.js';

export async function getStudyPlans() {
  const data = await api.get('/subscriptions/plans');
  return Array.isArray(data.result) ? data.result : [];
}

export async function getMySubscription() {
  const data = await api.get('/subscriptions/me');
  return data.result ?? { active: false };
}

export async function purchaseStudyPlan(subscriptionPlanId) {
  const data = await api.post('/subscriptions/purchase', { subscriptionPlanId });
  return data.result;
}
