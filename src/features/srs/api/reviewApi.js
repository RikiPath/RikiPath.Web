import { api } from '@/api/client.js';

function unwrap(data) {
  return data?.result ?? data?.data ?? data;
}

export async function getSrsSummary() {
  const data = await api.get('/Review/summary');
  return unwrap(data);
}

export async function getDailyReviewQueue({ mode = 'flip', cardType = '', jlptLevel = '', sourceType = '' } = {}) {
  const params = new URLSearchParams();
  if (mode) params.set('mode', mode);
  if (cardType) params.set('cardType', cardType);
  if (jlptLevel) params.set('jlptLevel', jlptLevel);
  if (sourceType) params.set('sourceType', sourceType);
  const qs = params.toString();
  const data = await api.get(`/Review/daily-queue${qs ? `?${qs}` : ''}`);
  const result = unwrap(data);
  const items = Array.isArray(result?.items) ? result.items : [];
  const totalDueCards = Number(result?.totalDueCards ?? result?.totalDue ?? items.length);
  const modeEligibleCount = Number(result?.modeEligibleCount ?? items.length);
  return {
    totalDue: totalDueCards,
    totalDueCards,
    modeEligibleCount,
    plannedSessionCount: Number(result?.plannedSessionCount ?? Math.min(modeEligibleCount, 25)),
    rawDueCount: Number(result?.rawDueCount ?? totalDueCards),
    newInQueue: Number(result?.newInQueue ?? 0),
    reviewInQueue: Number(result?.reviewInQueue ?? 0),
    relearningInQueue: Number(result?.relearningInQueue ?? 0),
    studyMode: result?.studyMode || mode,
    nextDueAtUtc: result?.nextDueAtUtc || null,
    emptyReason: result?.emptyReason || null,
    activeModesInQueue: Array.isArray(result?.activeModesInQueue) ? result.activeModesInQueue : [],
    items,
    excludedMcqCards: Array.isArray(result?.excludedMcqCards) ? result.excludedMcqCards : [],
    excludedTypingCards: Array.isArray(result?.excludedTypingCards) ? result.excludedTypingCards : [],
  };
}

export async function submitReviewResult(payload) {
  const data = await api.post('/Review/submit-result', payload);
  return unwrap(data);
}

export async function startSrsSession(payload = {}) {
  const data = await api.post('/Review/sessions/start', payload);
  return unwrap(data);
}

export async function getActiveSrsSession(sessionKind = 'Scheduled') {
  const qs = sessionKind ? `?sessionKind=${encodeURIComponent(sessionKind)}` : '';
  const data = await api.get(`/Review/sessions/active${qs}`);
  return unwrap(data);
}

export async function finishSrsSession(sessionKey) {
  const data = await api.post(`/Review/sessions/${sessionKey}/finish`);
  return unwrap(data);
}

export async function abandonSrsSession(sessionKey) {
  const data = await api.post(`/Review/sessions/${sessionKey}/abandon`);
  return unwrap(data);
}

export async function getSrsCalendar(year, month) {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  const data = await api.get(`/Review/calendar?${params.toString()}`);
  const res = unwrap(data);
  return Array.isArray(res) ? res : [];
}

export async function getSrsCards({
  status = '',
  learningState = '',
  cardType = '',
  jlptLevel = '',
  sourceType = '',
  search = '',
  page = 1,
  pageSize = 25,
} = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (learningState) params.set('learningState', learningState);
  if (cardType) params.set('cardType', cardType);
  if (jlptLevel) params.set('jlptLevel', jlptLevel);
  if (sourceType) params.set('sourceType', sourceType);
  if (search) params.set('search', search);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const data = await api.get(`/Review/cards?${params.toString()}`);
  const res = unwrap(data);
  return {
    totalCount: Number(res?.totalCount ?? 0),
    items: Array.isArray(res?.items) ? res.items : [],
  };
}

export async function getSrsCardById(cardId) {
  const data = await api.get(`/Review/cards/${cardId}`);
  return unwrap(data);
}

export async function getSrsCardHistory(cardId) {
  const data = await api.get(`/Review/cards/${cardId}/history`);
  const res = unwrap(data);
  return Array.isArray(res) ? res : [];
}

export async function previewEnrollSrsCard(payload) {
  const data = await api.post('/Review/preview-enroll', payload);
  return unwrap(data);
}

export async function enrollSrsCard(payload) {
  const data = await api.post('/Review/enroll', payload);
  return unwrap(data);
}

export async function batchEnrollSrsCards(cards) {
  const data = await api.post('/Review/enroll-batch', { cards });
  return unwrap(data);
}

export async function updateSrsCard(cardId, payload) {
  const data = await api.put(`/Review/cards/${cardId}`, payload);
  return unwrap(data);
}

export async function deleteSrsCard(cardId) {
  const data = await api.delete(`/Review/cards/${cardId}`);
  return unwrap(data);
}

export async function getSrsPreferences() {
  const data = await api.get('/Review/preferences');
  return unwrap(data);
}

export async function updateSrsPreferences(payload) {
  const data = await api.put('/Review/preferences', payload);
  return unwrap(data);
}

export async function getPublishedSrsTemplates({ jlptLevel = '', cardType = '', lessonId = '', search = '' } = {}) {
  const params = new URLSearchParams();
  if (jlptLevel) params.set('jlptLevel', jlptLevel);
  if (cardType) params.set('cardType', cardType);
  if (lessonId) params.set('lessonId', String(lessonId));
  if (search) params.set('search', search);
  const qs = params.toString();
  const data = await api.get(`/srs-templates/published${qs ? `?${qs}` : ''}`);
  const res = unwrap(data);
  return Array.isArray(res) ? res : [];
}

export async function getLessonSrsSuggestions(lessonId) {
  const data = await api.get(`/LessonProgress/lessons/${lessonId}/srs-suggestions`);
  const res = unwrap(data);
  return Array.isArray(res) ? res : [];
}

export async function recordLessonInteraction(lessonId) {
  const data = await api.post(`/LessonProgress/lessons/${lessonId}/interact`);
  return unwrap(data);
}
