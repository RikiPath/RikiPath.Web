import { api } from '@/api/client.js';

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

export async function getStudyPurchaseStatus(id) {
  const data = await api.get(`/subscriptions/purchases/${id}`);
  return data.result;
}

function parsePurchasedMs(value) {
  if (!value) return 0;
  const iso = /Z|[+-]\d\d:?\d\d$/.test(String(value)) ? String(value) : `${value}Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

export function filterHistoryFallback(purchases, { status = 'all', category = 'all', days = 0, page = 1, pageSize = 8 } = {}) {
  const all = Array.isArray(purchases) ? purchases : [];
  const availableCategories = [...new Set(all.map((p) => String(p?.kind || '').toLowerCase()).filter(Boolean))];
  const cutoffMs = days > 0 ? Date.now() - days * 86_400_000 : 0;

  let filtered = [...all].sort((a, b) => (parsePurchasedMs(b.purchasedAt) - parsePurchasedMs(a.purchasedAt)) || ((b.id || 0) - (a.id || 0)));
  if (cutoffMs > 0) {
    filtered = filtered.filter((p) => parsePurchasedMs(p.purchasedAt) >= cutoffMs);
  }
  if (category && category !== 'all') {
    const target = String(category).toLowerCase();
    filtered = filtered.filter((p) => String(p?.kind || '').toLowerCase() === target);
  }
  if (status && status !== 'all') {
    const targetStatus = String(status).toLowerCase();
    filtered = filtered.filter((p) => {
      const paymentStatus = String(p?.paymentStatus || 'Paid').toLowerCase();
      if (targetStatus === 'active') return paymentStatus === 'paid' && Boolean(p?.active);
      if (targetStatus === 'ended' || targetStatus === 'plan_expired') return paymentStatus === 'paid' && !p?.active;
      return paymentStatus === targetStatus;
    });
  }

  const safePageSize = Math.max(1, Number(pageSize) || 8);
  const safePage = Math.max(1, Number(page) || 1);
  const start = (safePage - 1) * safePageSize;
  const items = filtered.slice(start, start + safePageSize);
  return {
    items,
    total: filtered.length,
    page: safePage,
    pageSize: safePageSize,
    hasMore: safePage * safePageSize < filtered.length,
    availableCategories,
  };
}

export async function getStudyPurchaseHistory({ status = 'all', category = 'all', days = 0, page = 1, pageSize = 8 } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  if (category && category !== 'all') params.set('category', category);
  if (days && Number(days) > 0) params.set('days', String(days));
  params.set('page', String(Math.max(1, page)));
  params.set('pageSize', String(Math.max(1, pageSize)));

  try {
    const data = await api.get(`/subscriptions/history?${params.toString()}`);
    if (data?.result && Array.isArray(data.result.items)) return data.result;
  } catch (err) {
    if (err?.status !== 404) throw err;
  }

  const me = await getMySubscription();
  return filterHistoryFallback(me?.purchases, { status, category, days, page, pageSize });
}
