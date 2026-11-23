import { api } from '@/api/client.js';

function unwrap(data) {
  return data?.result ?? data?.data ?? data;
}

export async function getHighlights({ targetType = '', targetId = '', targetKey = '' } = {}) {
  const params = new URLSearchParams();
  if (targetType) params.set('targetType', targetType);
  if (targetId) params.set('targetId', String(targetId));
  if (targetKey) params.set('targetKey', targetKey);
  const qs = params.toString();
  const data = await api.get(`/Highlights${qs ? `?${qs}` : ''}`);
  const res = unwrap(data);
  return Array.isArray(res) ? res : [];
}

export async function createHighlight(payload) {
  const data = await api.post('/Highlights', payload);
  return unwrap(data);
}

export async function updateHighlight(highlightId, payload) {
  const data = await api.put(`/Highlights/${highlightId}`, payload);
  return unwrap(data);
}

export async function deleteHighlight(highlightId) {
  const data = await api.delete(`/Highlights/${highlightId}`);
  return unwrap(data);
}

export async function promoteHighlightToSrs(highlightId, payload = {}) {
  const data = await api.post(`/Highlights/${highlightId}/to-srs`, payload);
  return unwrap(data);
}
