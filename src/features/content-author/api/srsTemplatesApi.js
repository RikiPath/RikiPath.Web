import { api } from '@/api/client.js';

function unwrap(data) {
  return data?.result ?? data?.data ?? data;
}

export async function getMySrsTemplates({ status = '', cardType = '', search = '' } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (cardType) params.set('cardType', cardType);
  if (search) params.set('search', search);
  const qs = params.toString();
  const data = await api.get(`/srs-templates/mine${qs ? `?${qs}` : ''}`);
  const res = unwrap(data);
  return Array.isArray(res) ? res : [];
}

export async function createSrsTemplate(payload) {
  const data = await api.post('/srs-templates', payload);
  return unwrap(data);
}

export async function updateSrsTemplate(templateId, payload) {
  const data = await api.put(`/srs-templates/${templateId}`, payload);
  return unwrap(data);
}

export async function submitSrsTemplate(templateId) {
  const data = await api.post(`/srs-templates/${templateId}/submit`);
  return unwrap(data);
}

export async function deleteSrsTemplate(templateId) {
  const data = await api.delete(`/srs-templates/${templateId}`);
  return unwrap(data);
}

export async function getAdminSrsTemplates({ status = '', jlptLevel = '', cardType = '', search = '' } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (jlptLevel) params.set('jlptLevel', jlptLevel);
  if (cardType) params.set('cardType', cardType);
  if (search) params.set('search', search);
  const qs = params.toString();
  const data = await api.get(`/srs-templates/admin${qs ? `?${qs}` : ''}`);
  const res = unwrap(data);
  return Array.isArray(res) ? res : [];
}

export async function reviewSrsTemplate(templateId, { approve, reviewNote = '' }) {
  const data = await api.post(`/srs-templates/${templateId}/review`, { approve, reviewNote });
  return unwrap(data);
}

export async function toggleSrsTemplatePublish(templateId, { publish, reason = '' }) {
  const data = await api.post(`/srs-templates/${templateId}/toggle-publish`, {
    entityType: 'SrsCardTemplate',
    entityId: templateId,
    publish,
    reason,
  });
  return unwrap(data);
}

export async function getAdminPublishCatalog({ entityType = 'Vocabulary', status = '', jlptLevel = '', search = '' } = {}) {
  const params = new URLSearchParams();
  if (entityType) params.set('entityType', entityType);
  if (status) params.set('status', status);
  if (jlptLevel) params.set('jlptLevel', jlptLevel);
  if (search) params.set('search', search);
  const qs = params.toString();
  const data = await api.get(`/admin/content-publish/catalog${qs ? `?${qs}` : ''}`);
  const res = unwrap(data);
  return Array.isArray(res) ? res : [];
}

export async function toggleAdminPublishContent({ entityType, entityId, publish, reason = '' }) {
  const data = await api.post('/admin/content-publish/toggle', {
    entityType,
    entityId,
    publish,
    reason,
  });
  return unwrap(data);
}
